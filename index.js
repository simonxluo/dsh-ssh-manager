/**
 * dsh-ssh-manager — Host half, native DeepSeek Harness 0.2.x rewrite.
 *
 * Manages SSH identity keys and per-host ssh config from the built-in plugin
 * configuration card (the row's `Config` schema drives it; no custom client
 * half and no removed `settingsScope` service), and materializes the value as
 * a real SSH setup an unattended agent can clone over:
 *
 *   hosts:
 *     github.com:
 *       url: github.com
 *       user: git
 *       privateKey: |
 *         -----BEGIN OPENSSH PRIVATE KEY-----
 *         ...
 *       args: |
 *         ServerAliveInterval 30
 *
 * $DSH_HOME/.ssh/                       (~/.dsh/.ssh when DSH_HOME is unset)
 *   config                     flat file, managed Include region (0600)
 *   config.d/<host>/config     the `Host` block for that entry (0600)
 *   config.d/<host>/<host>     the private key (0600)
 *   config.d/<host>/<host>.pub derived public key (0644, best-effort)
 *
 * With `autoInclude` (default on) the plugin also appends one
 * `Include $DSH_HOME/.ssh/config` line to the outer ~/.ssh/config so plain
 * ssh/git reads the managed Host blocks. Files the plugin does not recognize
 * (known_hosts, manually placed keys, unrelated config) are preserved.
 */
import { basename, dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { createConnection as tcpConnect } from 'node:net';
import Schema from '@deepseek-ai/schemastery';

const execFileAsync = promisify(execFile);

const MANAGED_BEGIN = '# --- dsh-ssh-manager (managed; do not edit) ---';
const MANAGED_END = '# --- dsh-ssh-manager (managed; end) ---';
const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,191}$/;
const PEM_HEADERS = [
	'-----BEGIN OPENSSH PRIVATE KEY-----',
	'-----BEGIN RSA PRIVATE KEY-----',
	'-----BEGIN EC PRIVATE KEY-----',
	'-----BEGIN DSA PRIVATE KEY-----',
	'-----BEGIN PRIVATE KEY-----',
	'-----BEGIN ENCRYPTED PRIVATE KEY-----',
];

/** One host entry; the map key is the ssh `Host` alias (also the on-disk names). */
const HostConfig = Schema.object({
	url: Schema.string().description('HostName — the real host to connect to'),
	user: Schema.string().default('git').description('the ssh user (git for GitHub/GitLab)'),
	privateKey: Schema.string().role('secret').description('PEM private-key literal (write-only)'),
	args: Schema.string().default('').description('extra ssh-config lines, one per line (e.g. ProxyJump, Port)'),
});

/**
 * The row config. `hosts` is a dict keyed by ssh `Host` alias so the card can
 * add, modify, and remove hosts without array semantics. All fields are
 * volatile: edits hot-apply without reloading the plugin fiber.
 */
export const Config = Schema.object({
	hosts: Schema.dict(HostConfig).default({}).volatile(),
	autoInclude: Schema.boolean().default(true).description('Append the Include line to ~/.ssh/config automatically').volatile(),
});

/** A live view that also accepts plain values from direct callers and tests. */
function liveConfig(config) {
	return new Proxy(config ?? {}, {
		get(target, key, receiver) {
			const value = Reflect.get(target, key, receiver);
			return value !== null && typeof value === 'object' && typeof value.get === 'function' ? value.get() : value;
		},
	});
}

// ---------------------------------------------------------------------------
// Connectivity probing (panel support).
// ---------------------------------------------------------------------------

const PANEL_ROUTE = '/_dsh/dsh-ssh-manager/panel';
const PROBE_TIMEOUT_MS = 8000;
/** alias -> { ok, latencyMs, at, error? }; written only by probeHost. */
const probeResults = new Map();
/** alias -> in-flight probe promise, so concurrent requests share one probe. */
const probeInflight = new Map();

function firstLine(text) {
	const line = String(text ?? '').split('\n', 1)[0].trim();
	return line.length > 160 ? line.slice(0, 160) + '…' : line;
}

/**
 * Probe one host with a real, non-interactive SSH handshake through the
 * materialized config: BatchMode forbids prompts, the askpass stub plus a hard
 * timeout keep the host thread free, and /dev/null known-hosts avoids writing
 * anything as a side effect of a status check.
 */
export async function probeHost(alias, logger) {
	const started = Date.now();
	try {
		await execFileAsync('ssh', [
			'-o', 'BatchMode=yes',
			'-o', 'ConnectTimeout=5',
			'-o', 'StrictHostKeyChecking=no',
			'-o', 'UserKnownHostsFile=/dev/null',
			'-o', 'LogLevel=ERROR',
			'-T', alias, 'true',
		], {
			timeout: PROBE_TIMEOUT_MS,
			env: { ...process.env, SSH_ASKPASS: '/bin/false', SSH_ASKPASS_REQUIRE: 'force' },
		});
		const result = { ok: true, latencyMs: Date.now() - started, at: Date.now() };
		probeResults.set(alias, result);
		return result;
	} catch (error) {
		const result = { ok: false, latencyMs: Date.now() - started, at: Date.now(), error: firstLine(error.stderr) || firstLine(error.message) };
		probeResults.set(alias, result);
		logger?.debug?.('dsh-ssh-manager: probe %s failed: %s', alias, result.error);
		return result;
	}
}

/** Probe one host, deduplicating concurrent calls on the same alias. */
export function probeHostOnce(alias, logger) {
	let promise = probeInflight.get(alias);
	if (promise === undefined) {
		promise = probeHost(alias, logger).finally(() => probeInflight.delete(alias));
		probeInflight.set(alias, promise);
	}
	return promise;
}

/** Host metadata for the panel; the private key never crosses this boundary. */
export function hostSummaries(hosts) {
	return Object.entries(hosts ?? {})
		.filter(([alias]) => safeHostName(alias) !== null)
		.map(([alias, cfg]) => ({
			alias,
			url: String(cfg?.url ?? ''),
			user: String(cfg?.user ?? ''),
			hasKey: String(cfg?.privateKey ?? '').length > 0,
		}));
}

// ---------------------------------------------------------------------------
// Password connections (email-style credential store).
//
// Connections bind {ip, user, password, workspace} to an alias (the ip when no
// alias is given). The password is write-only: it lives in a 0600 JSON file
// under the integrations directory (the same local-plaintext convention the
// email plugin uses for account passwords) and never crosses the panel API —
// reads return a `hasPassword` boolean, and a save that omits the field keeps
// the stored value so editing never needs to re-enter it.
// ---------------------------------------------------------------------------

function connectionsFile() {
	const home = process.env.DSH_HOME ?? join(homedir(), '.dsh');
	return join(home, 'integrations', 'dsh-ssh-manager', 'connections.json');
}

/** Load the connection map; absent or malformed storage starts empty. */
function loadConnections() {
	const file = connectionsFile();
	try {
		const doc = JSON.parse(readFileSync(file, 'utf8'));
		if (doc !== null && typeof doc === 'object' && doc.connections !== null && typeof doc.connections === 'object') {
			return doc.connections;
		}
	} catch {
		// Absent storage starts empty silently; a file that exists but cannot
		// be read or parsed is data loss in progress and gets one stderr line
		// (there is no logger in this scope).
		if (existsSync(file)) process.stderr.write('dsh-ssh-manager: connections.json unreadable, starting empty\n');
	}
	return {};
}

function saveConnections(connections) {
	const file = connectionsFile();
	mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
	// Atomic replace: write a sibling temp file, then rename over the target,
	// so a crash mid-write never leaves truncated JSON that the next load
	// would treat as "start empty" (and the next save would then wipe).
	const tmp = join(dirname(file), '.connections.json.tmp');
	writeFileMode(tmp, JSON.stringify({ version: 1, connections }, null, '\t') + '\n', 0o600);
	renameSync(tmp, file);
}

/** Validation the schema-less store cannot express; an error string or null. */
function connectionProblem(entry) {
	const ip = String(entry.ip ?? '').trim();
	if (ip.length === 0) return 'ip is required';
	if (/[\r\n]/.test(ip) || /\s/.test(ip)) return 'ip must be a single token';
	const user = String(entry.user ?? '').trim();
	if (user.length === 0) return 'user is required';
	if (/[\r\n]/.test(user) || /\s/.test(user)) return 'user must be a single token without whitespace';
	if (entry.port !== undefined && entry.port !== null && entry.port !== '') {
		const port = Number(entry.port);
		if (!Number.isInteger(port) || port < 1 || port > 65535) return 'port must be an integer between 1 and 65535';
	}
	if (entry.workspace !== undefined && entry.workspace !== null && /[\r\n]/.test(String(entry.workspace))) {
		return 'workspace must be a single line';
	}
	return null;
}

/** Connection metadata for the panel; the password never crosses this boundary. */
export function connectionSummaries(connections) {
	return Object.entries(connections ?? {})
		.filter(([alias]) => safeHostName(alias) !== null)
		.map(([alias, conn]) => ({
			alias,
			ip: String(conn?.ip ?? ''),
			port: conn?.port ?? 22,
			user: String(conn?.user ?? ''),
			workspace: String(conn?.workspace ?? ''),
			hasPassword: String(conn?.password ?? '').length > 0,
		}));
}

/**
 * TCP reachability probe for a password connection: macOS ships no sshpass, so
 * a non-interactive password handshake is not possible — an open TCP port (plus
 * the connect latency) is the honest answer the panel can give.
 */
export async function probeConnectionTcp(ip, port, timeoutMs = 6000) {
	const started = Date.now();
	await new Promise((resolve, reject) => {
		const socket = tcpConnect({ host: ip, port: Number(port) || 22 });
		const timer = setTimeout(() => {
			socket.destroy();
			reject(new Error('connect timed out'));
		}, timeoutMs);
		socket.once('connect', () => {
			clearTimeout(timer);
			socket.destroy();
			resolve();
		});
		socket.once('error', (error) => {
			clearTimeout(timer);
			reject(error);
		});
	});
	return { ok: true, latencyMs: Date.now() - started, at: Date.now(), tcp: true };
}

/** Probe one connection, deduplicating concurrent calls on the same alias. */
function probeConnectionOnce(alias, conn, logger) {
	const key = 'conn:' + alias;
	let promise = probeInflight.get(key);
	if (promise === undefined) {
		promise = probeConnectionTcp(conn.ip, conn.port)
			.catch((error) => ({ ok: false, latencyMs: 0, at: Date.now(), error: firstLine(error?.message ?? error) }))
			.then((result) => {
				probeResults.set(key, result);
				if (result.ok !== true) logger?.debug?.('dsh-ssh-manager: connection probe %s failed: %s', alias, result.error);
				return result;
			})
			.finally(() => probeInflight.delete(key));
		probeInflight.set(key, promise);
	}
	return promise;
}

/** Hostnames a browser may legitimately reach the panel through. */
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/**
 * Verdict on the `Host` header: `undefined` to proceed, otherwise the reason
 * to refuse.
 *
 * The localhost gate on `socket.remoteAddress` proves where the packets came
 * from, not which name the browser believes it is talking to. A page the user
 * visits can point a domain at 127.0.0.1 (DNS rebinding); that request looks
 * same-origin to the browser, carries no `Origin` on a GET, and would read
 * host metadata plus probe results. Requiring a localhost `Host` closes it.
 *
 * A request with no `Host` at all did not come from a browser (HTTP/1.0, curl,
 * the test harness), and the remote-address gate still applies to it.
 */
function hostVerdict(host) {
	if (typeof host !== 'string' || host.trim() === '') return undefined;
	const text = host.trim().toLowerCase();
	// An IPv6 literal arrives bracketed — `[::1]:3080` — where splitting on the
	// colon would leave「[」and refuse a legitimate way to reach the panel.
	const name = text.startsWith('[') ? text.slice(0, text.indexOf(']') + 1) : text.split(':')[0];
	return LOCAL_HOSTNAMES.has(name) ? undefined : `host "${host}" is not a localhost name`;
}

/**
 * Verdict on a state-changing POST (dsh-email semantics): `undefined` to
 * proceed, otherwise `{status, message}`.
 *
 * - `application/json` is not a simple-request content type, so a cross-origin
 *   caller is forced into a preflight, which this route never answers with
 *   `Access-Control-Allow-Origin`.
 * - `Origin`, when it names an http(s) page, must be a localhost origin. Other
 *   schemes are left to the next check: the desktop host loads its UI through
 *   a custom protocol (`dsh-app://app`), and a hostile page cannot produce one.
 * - `Sec-Fetch-Site`, when present, must be `same-origin` (or `none`). This is
 *   what catches an opaque `Origin: null` from a sandboxed iframe.
 *
 * Headers a non-browser client omits are not fabricatable by page script, so
 * their absence is allowed rather than treated as a rejection.
 */
function postVerdict(headers) {
	const contentType = String(headers['content-type'] ?? '');
	if (!contentType.toLowerCase().includes('application/json')) {
		return { status: 415, message: 'dsh-ssh-manager panel accepts application/json only' };
	}
	const origin = headers.origin;
	if (typeof origin === 'string' && origin.trim() !== '') {
		let url;
		try {
			url = new URL(origin);
		} catch {
			url = undefined;
		}
		if (url !== undefined && (url.protocol === 'http:' || url.protocol === 'https:')
			&& !LOCAL_HOSTNAMES.has(url.hostname.toLowerCase())) {
			return { status: 403, message: `origin "${origin}" is not allowed to write dsh-ssh-manager settings` };
		}
	}
	const site = headers['sec-fetch-site'];
	if (typeof site === 'string' && site !== '' && site !== 'same-origin' && site !== 'none') {
		return { status: 403, message: `a ${site} request may not write dsh-ssh-manager settings` };
	}
	return undefined;
}

function sendPanelJson(response, status, value) {
	const payload = JSON.stringify(value);
	response.writeHead(status, {
		'content-type': 'application/json',
		'cache-control': 'no-store',
		'content-length': Buffer.byteLength(payload),
	});
	response.end(payload);
}

/**
 * Read and parse a small JSON request body. Failures carry a `kind` field
 * ('too-large' | 'bad-json') so the route can map them to distinct statuses;
 * oversize bodies are answered here with 413 before the socket is torn down.
 */
function readJsonBody(request, response) {
	return new Promise((resolve, reject) => {
		let size = 0;
		const chunks = [];
		const fail = (kind, message) => {
			const error = new Error(message);
			error.kind = kind;
			return error;
		};
		request.on('data', (chunk) => {
			size += chunk.length;
			if (size > 64 * 1024) {
				// Answer first, and only while the response can still take one.
				if (!response.writableEnded && !response.destroyed) {
					sendPanelJson(response, 413, { ok: false, error: { code: 'too-large', message: 'request body exceeds 64 KiB' } });
				}
				reject(fail('too-large', 'body too large'));
				request.destroy();
				return;
			}
			chunks.push(chunk);
		});
		request.on('end', () => {
			try {
				resolve(chunks.length === 0 ? {} : JSON.parse(Buffer.concat(chunks).toString('utf8')));
			} catch (error) {
				reject(fail('bad-json', `invalid JSON body: ${firstLine(error.message)}`));
			}
		});
		request.on('error', reject);
	});
}

/**
 * Mount the panel API: GET lists host metadata plus cached probe results;
 * POST {action:'probe', host?} runs a probe (all hosts when host is absent).
 */
function installPanelWeb(ctx, config) {
	ctx.inject(['webServer'], (webCtx) => {
		webCtx.effect(() => webCtx.webServer.register({
			kind: 'exact',
			path: PANEL_ROUTE,
			handler: async (request, response) => {
				try {
					// Localhost-only: host metadata and probe results must never
					// leak to the LAN when a deployment binds the webserver wide.
					const remote = String(request.socket?.remoteAddress ?? '');
					if (remote !== '127.0.0.1' && remote !== '::1' && remote !== '::ffff:127.0.0.1') {
						sendPanelJson(response, 403, { ok: false, error: { code: 'forbidden', message: 'dsh-ssh-manager panel is localhost-only' } });
						return;
					}
					// Localhost is where the packets came from, not which name the
					// browser thinks it reached; a rebound domain resolving to
					// 127.0.0.1 would otherwise read the panel on a same-origin GET.
					const host = hostVerdict(request.headers.host);
					if (host !== undefined) {
						sendPanelJson(response, 403, { ok: false, error: { code: 'forbidden', message: host } });
						return;
					}
					if (request.method === 'POST') {
						// A page the user visits can POST here cross-origin as a
						//「simple request」and drive probes; these checks are the
						// part of that a page script cannot forge away.
						const post = postVerdict(request.headers);
						if (post !== undefined) {
							sendPanelJson(response, post.status, { ok: false, error: { code: 'untrusted', message: post.message } });
							return;
						}
					}
					const hosts = config.hosts ?? {};
				if (request.method === 'GET') {
					const summaries = hostSummaries(hosts);
					const connections = loadConnections();
					const connSummaries = connectionSummaries(connections);
					const known = new Set(summaries.map(summary => summary.alias));
					for (const summary of connSummaries) known.add('conn:' + summary.alias);
					const probed = {};
					for (const [alias, result] of probeResults) {
						// Prune cache entries the current config no longer has.
						if (!known.has(alias)) {
							probeResults.delete(alias);
							continue;
						}
						probed[alias] = result;
					}
					sendPanelJson(response, 200, { ok: true, value: { hosts: summaries, connections: connSummaries, probed } });
					return;
				}
				if (request.method !== 'POST') {
					response.writeHead(405, { allow: 'GET, POST' });
					response.end();
					return;
				}
				const body = await readJsonBody(request, response);
				if (body?.action === 'conn-save') {
					const alias = safeHostName(String(body.alias ?? '').trim() || String(body.ip ?? '').trim());
					if (alias === null) {
						sendPanelJson(response, 400, { ok: false, error: { code: 'bad-alias', message: 'alias (or ip) must be a safe name: letters, digits, dot, dash, underscore' } });
						return;
					}
					const problem = connectionProblem(body);
					if (problem !== null) {
						sendPanelJson(response, 400, { ok: false, error: { code: 'bad-connection', message: problem } });
						return;
					}
					const connections = loadConnections();
					const prior = connections[alias] ?? {};
					// Write-only password: an omitted or empty field keeps the
					// stored value, so editing never re-enters the secret.
					const password = typeof body.password === 'string' && body.password.length > 0
						? body.password
						: String(prior.password ?? '');
					if (password.length === 0) {
						sendPanelJson(response, 400, { ok: false, error: { code: 'bad-connection', message: 'password is required for a new connection' } });
						return;
					}
					connections[alias] = {
						ip: String(body.ip).trim(),
						port: body.port === undefined || body.port === null || body.port === '' ? 22 : Number(body.port),
						user: String(body.user).trim(),
						password,
						workspace: String(body.workspace ?? '').trim(),
						createdAt: prior.createdAt ?? Date.now(),
					};
					saveConnections(connections);
					ctx.logger?.info?.('dsh-ssh-manager: connection %s saved (%s@%s)', alias, connections[alias].user, connections[alias].ip);
					probeResults.delete('conn:' + alias);
					const summary = connectionSummaries({ [alias]: connections[alias] })[0];
					sendPanelJson(response, 200, { ok: true, value: { connection: summary } });
					return;
				}
				if (body?.action === 'conn-delete') {
					const alias = safeHostName(String(body.alias ?? '').trim());
					if (alias === null) {
						sendPanelJson(response, 400, { ok: false, error: { code: 'bad-alias', message: 'alias is required' } });
						return;
					}
					const connections = loadConnections();
					if (Object.prototype.hasOwnProperty.call(connections, alias)) {
						delete connections[alias];
						saveConnections(connections);
						ctx.logger?.info?.('dsh-ssh-manager: connection %s deleted', alias);
					}
					probeResults.delete('conn:' + alias);
					sendPanelJson(response, 200, { ok: true, value: { deleted: alias } });
					return;
				}
				if (body?.action !== 'probe') {
					sendPanelJson(response, 400, { ok: false, error: { code: 'bad-action', message: 'unsupported action' } });
					return;
				}
				const connections = loadConnections();
				const known = new Set(hostSummaries(hosts).map(summary => summary.alias));
				for (const alias of Object.keys(connections)) known.add('conn:' + alias);
				const wanted = typeof body.target === 'string' && body.target.length > 0 ? [body.target] : [...known];
				const results = {};
				await Promise.all(wanted.map(async (target) => {
					if (target.startsWith('conn:')) {
						const alias = target.slice(5);
						const conn = connections[alias];
						if (conn === undefined) {
							results[target] = { ok: false, error: 'unknown connection' };
							return;
						}
						results[target] = await probeConnectionOnce(alias, conn, ctx.logger);
						return;
					}
					if (!known.has(target)) {
						results[target] = { ok: false, error: 'unknown host' };
						return;
					}
					results[target] = await probeHostOnce(target, ctx.logger);
				}));
				sendPanelJson(response, 200, { ok: true, value: { results } });
				} catch (error) {
					// readJsonBody already answered oversize bodies with 413, and a
					// destroyed or finished stream cannot take another write.
					if (response.writableEnded || response.destroyed) return;
					if (error?.kind === 'bad-json') {
						sendPanelJson(response, 400, { ok: false, error: { code: 'bad-json', message: 'request body is not valid JSON' } });
						return;
					}
					sendPanelJson(response, 500, { ok: false, error: { code: 'internal', message: String(error?.message ?? error) } });
				}
			},
		}), 'dsh-ssh-manager: panel route');
	});
}

/** The SSH directory this plugin owns: `$DSH_HOME/.ssh`, else `~/.dsh/.ssh`. */
export function sshDirOf() {
	const home = process.env.DSH_HOME ?? join(homedir(), '.dsh');
	return join(home, '.ssh');
}

/** The outer user config that must import the dsh SSH dir so ssh reads the hosts. */
export function userSshConfigPath() {
	return join(homedir(), '.ssh', 'config');
}

/** Validate one host alias as a safe directory/key/file name. */
export function safeHostName(name) {
	const value = String(name ?? '').trim();
	if (!NAME_PATTERN.test(value)) return null;
	if (value === '.' || value === '..') return null;
	return value;
}

/**
 * Per-host validation the schema cannot express. Returns an error message for
 * the log, or null when the entry is safe to materialize.
 */
function hostProblem(host, raw) {
	const safe = safeHostName(host);
	if (safe === null) return `invalid host alias ${JSON.stringify(host)}`;
	const cfg = raw ?? {};
	const url = String(cfg.url ?? '').trim();
	if (url.length === 0) return `host ${safe} needs a url (HostName)`;
	if (/[\r\n]/.test(url)) return `host ${safe}: url must be a single line`;
	// `user` lands in the Host block verbatim, so it must stay a single token;
	// whitespace (not just newlines) would allow extra ssh directives to be
	// injected. No aggressive charset allowlist — it would reject valid names
	// like DOMAIN\user.
	if (cfg.user !== undefined && cfg.user !== '') {
		const user = String(cfg.user);
		if (/[\r\n]/.test(user) || /\s/.test(user)) return `host ${safe}: user must be a single token without whitespace`;
	}
	const key = String(cfg.privateKey ?? '');
	if (key.trim().length > 0) {
		const first = key.trimStart().split('\n', 1)[0];
		if (!PEM_HEADERS.includes(first)) return `host ${safe}: private key does not look like a PEM key`;
	}
	return null;
}

/** Rewrite a config text, replacing complete managed regions; everything else
 * is kept. An orphan MANAGED_BEGIN without its END is preserved as ordinary
 * content instead of swallowing the rest of the file. */
export function withManagedRegion(content, managedLines) {
	const out = [];
	let buffer = [];
	let inside = false;
	for (const line of String(content).split('\n')) {
		const trimmed = line.trim();
		if (trimmed === MANAGED_BEGIN) {
			// A second BEGIN inside an unterminated region: keep the first
			// region's content as ordinary text before starting over.
			if (inside) out.push(MANAGED_BEGIN, ...buffer);
			inside = true;
			buffer = [];
			continue;
		}
		if (inside) {
			if (trimmed === MANAGED_END) {
				inside = false;
				buffer = [];
				continue;
			}
			buffer.push(line);
			continue;
		}
		out.push(line);
	}
	// Orphan BEGIN at EOF: its content is the user's, not ours to delete.
	if (inside) out.push(MANAGED_BEGIN, ...buffer);
	const head = out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '');
	const region = [MANAGED_BEGIN, ...managedLines, MANAGED_END].join('\n');
	// The region goes FIRST: ssh folds an Include that appears after an opened
	// Host block into that block's scope, where it silently stops working.
	return region + '\n' + (head.length > 0 ? '\n' + head + '\n' : '');
}

/**
 * Render one per-host `Host` block as ssh reads it, fenced with the managed
 * markers so the directory stays recognizable as this plugin's own.
 */
export function renderHostConfig(sshDir, host, cfg) {
	const lines = [MANAGED_BEGIN, `Host ${host}`];
	if (cfg.url) lines.push(`  HostName ${cfg.url}`);
	if (cfg.user) lines.push(`  User ${cfg.user}`);
	lines.push(`  IdentityFile ${join(sshDir, 'config.d', host, host)}`);
	lines.push('  IdentitiesOnly yes');
	if (cfg.args) {
		for (const line of String(cfg.args).split('\n')) {
			const trimmed = line.trim();
			if (trimmed.length > 0 && !trimmed.startsWith('#')) lines.push(`  ${trimmed}`);
		}
	}
	lines.push(MANAGED_END);
	return lines.join('\n') + '\n';
}

function writeFileMode(file, content, mode) {
	// {mode} closes the creation window on new files; chmodSync also tightens
	// pre-existing files, where the writeFileSync mode option has no effect.
	writeFileSync(file, content, mode === undefined ? undefined : { mode });
	if (mode !== undefined) chmodSync(file, mode);
}

/** Derive `<key>.pub` next to a key via `ssh-keygen -y`; best-effort. */
function derivePublicKey(keyFile, logger) {
	try {
		const pub = execFileSync('ssh-keygen', ['-y', '-f', keyFile], {
			encoding: 'utf8',
			// A passphrase-protected key must fail fast instead of prompting on
			// the controlling tty and blocking the host thread forever.
			timeout: 5000,
			env: { ...process.env, SSH_ASKPASS: '/bin/false', SSH_ASKPASS_REQUIRE: 'force' },
		}).trimEnd();
		writeFileMode(`${keyFile}.pub`, pub + '\n', 0o644);
	} catch {
		logger?.warn?.('dsh-ssh-manager: could not derive public key from %s (ssh-keygen unavailable or key protected)', keyFile);
	}
}

/** Whether a config.d child looks like one of ours (a host dir the plugin owns). */
function looksOwned(dir) {
	if (existsSync(join(dir, basename(dir)))) return true;
	const config = join(dir, 'config');
	if (existsSync(config)) {
		try {
			const text = readFileSync(config, 'utf8');
			if (text.includes(MANAGED_BEGIN)) return true;
		} catch { /* unreadable config is not proof of ownership */ }
	}
	return false;
}

/**
 * Materialize a `hosts` doc under `$DSH_HOME/.ssh`. Idempotent: unchanged keys
 * are not rewritten (mtimes survive), removed hosts are cleaned up, invalid
 * entries are skipped with a warning, and foreign files are preserved.
 * Returns the number of hosts materialized.
 */
export function reconcileKeys(hosts, logger) {
	const sshDir = sshDirOf();
	mkdirSync(sshDir, { recursive: true, mode: 0o700 });
	const configD = join(sshDir, 'config.d');
	mkdirSync(configD, { recursive: true, mode: 0o700 });
	const wanted = new Map();
	for (const [host, raw] of Object.entries(hosts ?? {})) {
		const problem = hostProblem(host, raw);
		if (problem !== null) {
			logger?.warn?.('dsh-ssh-manager: skipping entry — %s', problem);
			continue;
		}
		wanted.set(safeHostName(host), raw ?? {});
	}
	for (const child of readdirSync(configD)) {
		if (wanted.has(child)) continue;
		const dir = join(configD, child);
		if (looksOwned(dir)) rmSync(dir, { recursive: true, force: true });
	}
	for (const [host, cfg] of wanted) {
		const dir = join(configD, host);
		mkdirSync(dir, { recursive: true, mode: 0o700 });
		const key = String(cfg.privateKey ?? '');
		const keyFile = join(dir, host);
		if (key.length > 0) {
			const wantedKey = key.endsWith('\n') ? key : key + '\n';
			const prior = existsSync(keyFile) ? readFileSync(keyFile, 'utf8') : undefined;
			if (prior !== wantedKey) {
				writeFileMode(keyFile, wantedKey, 0o600);
				derivePublicKey(keyFile, logger);
			} else if ((statSync(keyFile).mode & 0o777) !== 0o600) {
				// Unchanged content but a loose pre-existing file (for example
				// written by v1.0.0 before the mode option): tighten it anyway.
				chmodSync(keyFile, 0o600);
			}
		}
		// Read before writing so unchanged Host blocks keep their mtimes.
		const cfgFile = join(dir, 'config');
		const nextCfg = renderHostConfig(sshDir, host, cfg);
		const priorCfg = existsSync(cfgFile) ? readFileSync(cfgFile, 'utf8') : '';
		if (priorCfg !== nextCfg) writeFileMode(cfgFile, nextCfg, 0o600);
	}
	const flat = join(sshDir, 'config');
	const prior = existsSync(flat) ? readFileSync(flat, 'utf8') : '';
	// Explicit per-host Include lines instead of a glob: some ssh builds fail
	// to glob through symlinked path prefixes (for example /tmp on macOS), and
	// the wanted set is already known here.
	const next = withManagedRegion(prior, [
		'',
		'# Per-host blocks managed by the SSH manager card.',
		...[...wanted.keys()].map(host => `Include ${join(configD, host, 'config')}`),
		'',
	]);
	if (prior !== next) writeFileMode(flat, next, 0o600);
	return wanted.size;
}

/**
 * Whether `~/.ssh/config` already imports the dsh SSH dir. The managed dir
 * lives under the DSH home — always separate from the user's own `~/.ssh` —
 * so the outer file must carry an `Include` pointing at it; otherwise
 * git-over-ssh never sees the Host blocks. The only case where nothing needs
 * importing is a deployment that made the managed dir the user's own `~/.ssh`.
 */
export function sshImportPresent() {
	const sshDir = sshDirOf();
	const outer = userSshConfigPath();
	if (sshDir === join(homedir(), '.ssh')) {
		return { ok: true, sameDir: true, managedSshDir: sshDir, includePath: null, userConfigPath: outer };
	}
	const targetFile = join(sshDir, 'config');
	const includePath = `Include ${targetFile}`;
	let found = null;
	try {
		for (const raw of readFileSync(outer, 'utf8').split('\n')) {
			const match = /^Include\s+(.+)$/i.exec(raw.trim());
			if (match === null) continue;
			const patterns = match[1].trim().split(/\s+/);
			if (patterns.includes(targetFile) || patterns.includes(sshDir)) {
				found = raw.trim();
				break;
			}
		}
	} catch { /* absent outer config simply means not imported yet */ }
	return { ok: found !== null, sameDir: false, managedSshDir: sshDir, includePath, userConfigPath: outer, found };
}

/**
 * Append `Include <dsh ssh dir>/config` to `~/.ssh/config` so ssh picks the
 * managed hosts up. Read-modify-write preserves the existing file verbatim
 * (creating it with 0600 when absent) and re-checks before writing so a
 * concurrent writer never leaves a duplicated Include behind.
 */
export function ensureSshImport() {
	const present = sshImportPresent();
	if (present.ok) return { ...present, changed: false };
	const sshDir = sshDirOf();
	const flat = join(sshDir, 'config');
	if (!existsSync(flat)) {
		try {
			mkdirSync(join(sshDir, 'config.d'), { recursive: true, mode: 0o700 });
			// Empty region: the per-host Include lines are written by reconcileKeys,
			// which knows the wanted host set.
			writeFileMode(flat, withManagedRegion('', [
				'# Per-host blocks managed by the SSH manager card.',
			]), 0o600);
		} catch (error) {
			return { ...present, changed: false, error: String(error?.message ?? error) };
		}
	}
	const outer = present.userConfigPath;
	let prior = '';
	try {
		if (existsSync(outer)) prior = readFileSync(outer, 'utf8');
	} catch (error) {
		return { ...present, changed: false, error: String(error?.message ?? error) };
	}
	// Insert before the first Host/Match block, never at the tail: ssh folds an
	// Include that follows an opened Host block into that block's scope, where
	// it silently stops working. Global options above the insertion point keep
	// their earlier first-match priority.
	const lines = prior.length > 0 ? prior.replace(/\n+$/, '').split('\n') : [];
	let insertAt = lines.length;
	for (let i = 0; i < lines.length; i++) {
		if (/^(Host|Match)\s/i.test(lines[i].trim())) {
			insertAt = i;
			break;
		}
	}
	lines.splice(insertAt, 0, ...(insertAt > 0 ? ['', present.includePath] : [present.includePath]));
	const next = lines.join('\n') + '\n';
	try {
		mkdirSync(join(homedir(), '.ssh'), { recursive: true, mode: 0o700 });
		const recheck = sshImportPresent();
		if (recheck.ok) return { ...recheck, changed: false };
		let mode = 0o600;
		try {
			if (existsSync(outer)) mode = statSync(outer).mode & 0o777;
		} catch { /* fall back to 0600 */ }
		writeFileMode(outer, next, mode);
	} catch (error) {
		return { ...present, changed: false, error: String(error?.message ?? error) };
	}
	return { ...present, changed: true };
}

/**
 * Cordis plugin entry. Reconciles on activation and whenever the volatile
 * config fingerprint changes (polled; the card saves straight into the row
 * config, and this keeps file state in step without a reload).
 */
export function apply(ctx, rowConfig) {
	const config = liveConfig(rowConfig);
	const logger = ctx?.logger;
	let fingerprint;
	const sync = (reason) => {
		const hosts = config.hosts ?? {};
		const autoInclude = config.autoInclude !== false;
		let fp;
		try {
			fp = JSON.stringify({ hosts, autoInclude });
		} catch {
			fp = undefined;
		}
		if (fp !== undefined && fp === fingerprint) return;
		fingerprint = fp;
		try {
			const count = reconcileKeys(hosts, logger);
			if (autoInclude && count > 0) {
				const result = ensureSshImport();
				if (result.changed) logger?.info?.('dsh-ssh-manager: added `%s` to %s', result.includePath, result.userConfigPath);
			}
			logger?.info?.('dsh-ssh-manager: %s — %d host(s) materialized under %s', reason, count, sshDirOf());
		} catch (error) {
			logger?.warn?.('dsh-ssh-manager: reconcile failed: %o', error);
		}
	};
	sync('activation');
	installPanelWeb(ctx, config);
	ctx.effect(() => {
		const timer = setInterval(() => sync('config change'), 3000);
		return () => clearInterval(timer);
	}, 'dsh-ssh-manager: config poll');
}
