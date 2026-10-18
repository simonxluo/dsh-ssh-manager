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
import { basename, join } from 'node:path';
import { homedir } from 'node:os';
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import Schema from '@deepseek-ai/schemastery';

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
	ctx.effect(() => {
		const timer = setInterval(() => sync('config change'), 3000);
		return () => clearInterval(timer);
	}, 'dsh-ssh-manager: config poll');
}
