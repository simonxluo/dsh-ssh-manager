// dsh-ssh-manager — Client half: the「开发机管理」settings section.
// Source of truth for the list is the Host plugin's row config (surfaced as
// metadata only); connectivity comes from POST {action:'probe'} on the panel
// route. React comes from the browser module table.
window.__ModuleLoader__.load({ id: "dsh-ssh-manager", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";

const React = require("react");
const { useState, useEffect, useCallback, useRef } = React;
const h = React.createElement;

const ROUTE = "_dsh/dsh-ssh-manager/panel";
/** 自动探测的静默间隔：面板开着时周期刷新状态。 */
const RESCAN_MS = 60000;

const en = {
	"nav.title": "SSH Manager",
	"title": "Dev machines (SSH)",
	"subtitle": "Hosts saved in this harness and their connectivity.",
	"col.alias": "Alias",
	"col.url": "Address",
	"col.user": "User",
	"col.key": "Key",
	"col.status": "Status",
	"key.yes": "managed",
	"key.no": "—",
	"status.unknown": "Not probed",
	"status.probing": "Probing…",
	"status.ok": "Reachable",
	"status.fail": "Unreachable",
	"action.probeAll": "Probe all",
	"action.refresh": "Refresh",
	"empty": "No hosts configured yet — add one in the plugin configuration card.",
		"conn.title": "Password connections",
	"conn.subtitle": "ip / user / password entries with an optional alias and a workspace binding; probed over TCP.",
	"conn.add": "Add connection",
	"conn.edit": "Edit",
	"conn.del": "Delete",
	"conn.save": "Save",
	"conn.cancel": "Cancel",
	"conn.alias": "Alias",
	"conn.ip": "IP / host",
	"conn.port": "Port",
	"conn.user": "User",
	"conn.workspace": "Workspace",
	"conn.password": "Password",
	"conn.alias.ph": "optional — defaults to the IP",
	"conn.password.keep": "leave blank to keep the stored password",
	"conn.confirmDelete": "Delete connection",
	"conn.empty": "No password connections yet.",
	"conn.tcp": "TCP probe",
	"action.probeOne": "Probe",
	"error.load": "Failed to load hosts: ",
	"error.probe": "Probe failed: ",
	"key.has": "Has managed key",
	"key.none": "No managed key",
	"ms": "ms",
};

const zh = {
	"nav.title": "SSH 管理",
	"title": "开发机管理",
	"subtitle": "当前 harness 中保存的 SSH 主机及其连通状态。",
	"col.alias": "别名",
	"col.url": "地址",
	"col.user": "用户",
	"col.key": "密钥",
	"col.status": "状态",
	"key.yes": "已托管",
	"key.no": "—",
	"status.unknown": "未探测",
	"status.probing": "探测中…",
	"status.ok": "可连接",
	"status.fail": "不可连接",
	"action.probeAll": "全部探测",
	"action.refresh": "刷新",
	"empty": "尚未配置主机——在插件配置卡片中添加。",
		"conn.title": "密码连接",
	"conn.subtitle": "以 ip / 用户 / 密码创建的连接，可选别名与工作区绑定；以 TCP 探测连通性。",
	"conn.add": "添加连接",
	"conn.edit": "编辑",
	"conn.del": "删除",
	"conn.save": "保存",
	"conn.cancel": "取消",
	"conn.alias": "别名",
	"conn.ip": "IP / 主机",
	"conn.port": "端口",
	"conn.user": "用户",
	"conn.workspace": "工作区",
	"conn.password": "密码",
	"conn.alias.ph": "可选，缺省使用 IP",
	"conn.password.keep": "留空保持原密码",
	"conn.confirmDelete": "确认删除连接",
	"conn.empty": "还没有密码连接。",
	"conn.tcp": "TCP 探测",
	"action.probeOne": "探测",
	"error.load": "加载主机失败：",
	"error.probe": "探测失败：",
	"key.has": "含托管密钥",
	"key.none": "无托管密钥",
	"ms": "毫秒",
};

const ja = {
	"nav.title": "SSH 管理",
	"title": "開発機管理",
	"subtitle": "この harness に保存された SSH ホストとその接続状態。",
	"col.alias": "エイリアス",
	"col.url": "アドレス",
	"col.user": "ユーザー",
	"col.key": "鍵",
	"col.status": "状態",
	"key.yes": "管理対象",
	"key.no": "—",
	"status.unknown": "未実行",
	"status.probing": "確認中…",
	"status.ok": "接続可能",
	"status.fail": "接続不可",
	"action.probeAll": "すべて確認",
	"action.refresh": "更新",
	"empty": "ホストが未設定です — プラグイン設定カードで追加してください。",
		"conn.title": "パスワード接続",
	"conn.subtitle": "ip / ユーザー / パスワードで作成する接続。任意のエイリアスとワークスペース連携付き、TCP で到達性を確認。",
	"conn.add": "接続を追加",
	"conn.edit": "編集",
	"conn.del": "削除",
	"conn.save": "保存",
	"conn.cancel": "キャンセル",
	"conn.alias": "エイリアス",
	"conn.ip": "IP / ホスト",
	"conn.port": "ポート",
	"conn.user": "ユーザー",
	"conn.workspace": "ワークスペース",
	"conn.password": "パスワード",
	"conn.alias.ph": "任意 — 未入力なら IP を使用",
	"conn.password.keep": "空欄で既存のパスワードを保持",
	"conn.confirmDelete": "接続を削除",
	"conn.empty": "パスワード接続はまだありません。",
	"conn.tcp": "TCP 確認",
	"action.probeOne": "確認",
	"error.load": "ホストの読み込みに失敗：",
	"error.probe": "確認に失敗：",
	"key.has": "管理鍵あり",
	"key.none": "管理鍵なし",
	"ms": "ミリ秒",
};

const es = {
	"nav.title": "Gestión SSH",
	"title": "Gestión de máquinas de desarrollo",
	"subtitle": "Hosts SSH guardados en este harness y su conectividad.",
	"col.alias": "Alias",
	"col.url": "Dirección",
	"col.user": "Usuario",
	"col.key": "Clave",
	"col.status": "Estado",
	"key.yes": "gestionada",
	"key.no": "—",
	"status.unknown": "Sin comprobar",
	"status.probing": "Comprobando…",
	"status.ok": "Accesible",
	"status.fail": "Inaccesible",
	"action.probeAll": "Comprobar todo",
	"action.refresh": "Actualizar",
	"empty": "Aún no hay hosts configurados — añade uno en la tarjeta de configuración del plugin.",
		"conn.title": "Conexiones con contraseña",
	"conn.subtitle": "Entradas ip / usuario / contraseña con alias opcional y espacio de trabajo; comprobadas por TCP.",
	"conn.add": "Añadir conexión",
	"conn.edit": "Editar",
	"conn.del": "Eliminar",
	"conn.save": "Guardar",
	"conn.cancel": "Cancelar",
	"conn.alias": "Alias",
	"conn.ip": "IP / host",
	"conn.port": "Puerto",
	"conn.user": "Usuario",
	"conn.workspace": "Workspace",
	"conn.password": "Contraseña",
	"conn.alias.ph": "opcional — por defecto la IP",
	"conn.password.keep": "déjalo vacío para mantener la contraseña",
	"conn.confirmDelete": "Eliminar conexión",
	"conn.empty": "Aún no hay conexiones con contraseña.",
	"conn.tcp": "comprobación TCP",
	"action.probeOne": "Comprobar",
	"error.load": "Error al cargar hosts: ",
	"error.probe": "Error al comprobar: ",
	"key.has": "Con clave gestionada",
	"key.none": "Sin clave gestionada",
	"ms": "ms",
};

// ---- i18n: follow the harness locale service (pattern from dsh-email) ----
const UI = { en, zh, ja, es };
/** Current UI language. Module-level so plain functions (the nav label) read it live. */
var UI_LANG = "en";
/**
 * Language resolution: prefix match on the harness locale tag (zh-CN → zh,
 * en-US → en, ja-JP → ja, es-ES → es). Unknown, empty, or missing tags fall
 * back to English — the dictionary the keys are written against.
 */
function localeToLang(active) {
	const tag = String(active === undefined || active === null ? "" : active).toLowerCase();
	for (const lang of ["zh", "en", "ja", "es"]) {
		if (tag.indexOf(lang) === 0) return lang;
	}
	return "en";
}

/** Redraw hook set by the mounted section; language switches re-render through it. */
var relocalize = null;

/**
 * The locale service is optional: read it through ctx.get when available and
 * fall back to the direct property. An absent service is a normal path, never
 * an error — the panel then simply stays English.
 */
function localeServiceOf(ctx) {
	try {
		if (typeof ctx.get === "function") {
			const viaGet = ctx.get("locale");
			if (viaGet !== undefined && viaGet !== null) return viaGet;
		}
	} catch { /* fall through to the direct read */ }
	const direct = ctx.locale;
	return direct === undefined || direct === null ? null : direct;
}

/**
 * Read the current language once and subscribe to later switches. Every step
 * is existence-checked so any failure keeps the last language instead of
 * breaking the plugin mount. Returns an unsubscribe function.
 */
function subscribeLocale(ctx) {
	const service = localeServiceOf(ctx);
	if (service === null) return () => {};
	const apply = () => {
		try {
			if (typeof service.getSnapshot === "function") {
				UI_LANG = localeToLang(service.getSnapshot().active);
			}
		} catch { /* keep the last language */ }
		if (typeof relocalize === "function") {
			try { relocalize(); } catch { /* a failed redraw must not break the subscription chain */ }
		}
	};
	apply();
	try {
		if (typeof service.subscribe !== "function") return () => {};
		const off = service.subscribe(apply);
		return typeof off === "function" ? off : () => {};
	} catch {
		return () => {};
	}
}

/** One dictionary entry with a single-level English fallback; the key itself
 * surfaces when a translation is missing so gaps stay visible. */
function t(key) {
	const table = UI[UI_LANG];
	if (table !== undefined && Object.prototype.hasOwnProperty.call(table, key)) return table[key];
	const raw = en[key];
	return raw === undefined ? key : raw;
}

async function api(action, payload) {
	const init = action === undefined
		? { credentials: "same-origin" }
		: {
			credentials: "same-origin",
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(Object.assign({ action }, payload)),
		};
	const res = await fetch(ROUTE, init);
	const body = await res.json();
	if (!res.ok || !body.ok) {
		throw new Error((body && body.error && body.error.message) || ("request failed " + res.status));
	}
	return body.value;
}

function statusBadge(status, t, errorText) {
	const style = {
		display: "inline-flex",
		alignItems: "center",
		gap: "6px",
		padding: "2px 10px",
		borderRadius: "999px",
		fontSize: "12px",
		whiteSpace: "nowrap",
	};
	const dot = { width: "8px", height: "8px", borderRadius: "50%", flex: "0 0 auto" };
	if (status === "probing") {
		return h("span", { style: Object.assign({}, style, { opacity: 0.7 }) },
			h("span", { style: Object.assign({}, dot, { background: "var(--dsh-accent, #3b82f6)", animation: "dsh-ssh-pulse 1s infinite" }) }),
			t("status.probing"));
	}
	if (status === "ok") {
		return h("span", { style: Object.assign({}, style, { background: "rgba(34,197,94,.12)", color: "#16a34a" }) },
			h("span", { style: Object.assign({}, dot, { background: "#22c55e" }) }),
			t("status.ok"));
	}
	if (status === "fail") {
		return h("span", { style: Object.assign({}, style, { background: "rgba(239,68,68,.1)", color: "#dc2626" }), title: errorText || "" },
			h("span", { style: Object.assign({}, dot, { background: "#ef4444" }) }),
			t("status.fail"));
	}
	return h("span", { style: Object.assign({}, style, { background: "rgba(120,120,120,.12)", color: "inherit", opacity: 0.75 }) },
		h("span", { style: Object.assign({}, dot, { background: "currentColor", opacity: 0.5 }) }),
		t("status.unknown"));
}
function SshManagerSection(props, ctx) {
	const [, setLangTick] = useState(0);
	const [hosts, setHosts] = useState(null);
	const [connections, setConnections] = useState([]);
	const [probed, setProbed] = useState({});
	const [probing, setProbing] = useState(false);
	const [error, setError] = useState("");
	const [form, setForm] = useState(null);
	const alive = useRef(true);
	const probeRef = useRef(null);
	useEffect(() => () => { alive.current = false; }, []);
	// A harness language switch re-renders the section through this hook.
	useEffect(() => {
		relocalize = () => setLangTick((v) => v + 1);
		return () => { relocalize = null; };
	}, []);

	const load = useCallback(async () => {
		try {
			const value = await api(undefined);
			if (!alive.current) return;
			setHosts(value.hosts);
			setConnections(value.connections || []);
			setProbed(value.probed || {});
			setError("");
		} catch (err) {
			if (alive.current) setError(t("error.load") + String(err && err.message ? err.message : err));
		}
	}, []);

	const probeAll = useCallback(async () => {
		setProbing(true);
		// 乐观标记：密钥主机与密码连接全部进入 probing 视觉态。
		setProbed((prev) => {
			const next = Object.assign({}, prev);
			if (hosts) for (const item of hosts) next[item.alias] = "probing";
			for (const item of connections) next["conn:" + item.alias] = "probing";
			return next;
		});
		try {
			const value = await api("probe");
			if (!alive.current) return;
			setProbed((prev) => Object.assign({}, prev, value.results));
		} catch (err) {
			if (alive.current) setError(t("error.probe") + String(err && err.message ? err.message : err));
		} finally {
			if (alive.current) setProbing(false);
		}
	}, [hosts, connections]);

	// 周期巡检走 ref，始终调用最新闭包（避免 interval 持有挂载时的旧状态）。
	useEffect(() => { probeRef.current = probeAll; }, [probeAll]);

	useEffect(() => {
		(async () => {
			await load();
		})();
		const timer = setInterval(() => { if (probeRef.current) probeRef.current(); }, RESCAN_MS);
		return () => clearInterval(timer);
	}, []);

	/** 探测单个目标（密钥主机 alias 或密码连接 "conn:"+alias）。 */
	const probeOne = useCallback(async (target) => {
		setProbed((prev) => Object.assign({}, prev, { [target]: "probing" }));
		try {
			const value = await api("probe", { target });
			if (!alive.current) return;
			setProbed((prev) => Object.assign({}, prev, value.results));
		} catch (err) {
			if (alive.current) setError(t("error.probe") + String(err && err.message ? err.message : err));
		}
	}, []);

	const saveForm = useCallback(async () => {
		if (!form) return;
		try {
			const payload = {
				alias: form.editing === null ? form.alias : form.editing,
				ip: form.ip, port: form.port, user: form.user,
				password: form.password, workspace: form.workspace,
			};
			const value = await api("conn-save", payload);
			if (!alive.current) return;
			setForm(null);
			await load();
			if (value && value.connection) await probeOne("conn:" + value.connection.alias);
		} catch (err) {
			if (alive.current) setError(t("error.probe") + String(err && err.message ? err.message : err));
		}
	}, [form]);

	const deleteConnection = useCallback(async (alias) => {
		if (!window.confirm(t("conn.confirmDelete") + " " + alias + "?")) return;
		try {
			await api("conn-delete", { alias });
			if (!alive.current) return;
			await load();
		} catch (err) {
			if (alive.current) setError(t("error.probe") + String(err && err.message ? err.message : err));
		}
	}, []);

	const th = { textAlign: "left", padding: "8px 12px", fontWeight: 600, fontSize: "13px", opacity: 0.75 };
	const td = { padding: "8px 12px", fontSize: "13px" };
	const row = { borderTop: "1px solid var(--dsh-border, rgba(128,128,128,.2))" };
	const button = {
		padding: "6px 14px", fontSize: "13px", borderRadius: "8px", cursor: "pointer",
		border: "1px solid var(--dsh-border, rgba(128,128,128,.35))",
		background: "transparent", color: "inherit",
	};
	const mini = Object.assign({}, button, { padding: "2px 10px", fontSize: "12px" });
	const label = { display: "inline-block", width: "110px", fontSize: "13px", opacity: 0.75 };
	const input = {
		padding: "6px 10px", fontSize: "13px", borderRadius: "8px",
		border: "1px solid var(--dsh-border, rgba(128,128,128,.35))",
		background: "transparent", color: "inherit", width: "240px",
	};

	const statusOf = (key) => {
		const status = probed[key];
		if (status === "probing") return { kind: "probing", error: "" };
		if (status && typeof status === "object") {
			return status.ok === true ? { kind: "ok", error: "", latencyMs: status.latencyMs } : { kind: "fail", error: String(status.error || "") };
		}
		return { kind: "unknown", error: "" };
	};

	const renderStatusCell = (key, tcpNote) => {
		const s = statusOf(key);
		return h("td", { style: td },
			statusBadge(s.kind, t, s.error),
			s.kind === "ok" && typeof s.latencyMs === "number"
				? h("span", { style: { marginLeft: "8px", fontSize: "12px", opacity: 0.6 } },
					s.latencyMs + " " + t("ms"), tcpNote ? h("span", { style: { opacity: 0.7 } }, " · " + t("conn.tcp")) : null)
				: null);
	};

	return h("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } },
		h("style", null, "@keyframes dsh-ssh-pulse{0%,100%{opacity:1}50%{opacity:.25}}"),
		h("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" } },
			h("div", null,
				h("div", { style: { fontSize: "16px", fontWeight: 600 } }, t("title")),
				h("div", { style: { fontSize: "13px", opacity: 0.65 } }, t("subtitle"))),
			h("div", { style: { display: "flex", gap: "8px" } },
				h("button", { style: button, onClick: () => { load(); }, disabled: probing }, t("action.refresh")),
				h("button", {
					style: Object.assign({}, button, { opacity: probing ? 0.6 : 1 }),
					onClick: () => { probeAll(); },
					disabled: probing,
				}, probing ? t("status.probing") : t("action.probeAll")))),
		error ? h("div", { style: { color: "#dc2626", fontSize: "13px" } }, error) : null,

		// ---- 密钥主机（原有） ----
		hosts === null ? h("div", { style: { opacity: 0.6, fontSize: "13px" } }, "…") :
		hosts.length === 0 ? h("div", { style: { opacity: 0.65, fontSize: "13px", padding: "8px 0" } }, t("empty")) :
		h("table", { style: { width: "100%", borderCollapse: "collapse" } },
			h("thead", null, h("tr", null,
				h("th", { style: th }, t("col.alias")),
				h("th", { style: th }, t("col.url")),
				h("th", { style: th }, t("col.user")),
				h("th", { style: th }, t("col.key")),
				h("th", { style: th }, t("col.status")))),
			h("tbody", null, hosts.map((item) => h("tr", { key: item.alias, style: row },
				h("td", { style: Object.assign({}, td, { fontWeight: 600 }) }, item.alias),
				h("td", { style: td }, item.url || "—"),
				h("td", { style: td }, item.user || "—"),
				h("td", { style: td, title: item.hasKey ? t("key.has") : t("key.none") }, item.hasKey ? t("key.yes") : t("key.no")),
				renderStatusCell(item.alias, false))))),

		// ---- 密码连接（新增） ----
		h("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", marginTop: "8px" } },
			h("div", null,
				h("div", { style: { fontSize: "14px", fontWeight: 600 } }, t("conn.title")),
				h("div", { style: { fontSize: "12px", opacity: 0.6 } }, t("conn.subtitle"))),
			form === null ? h("button", { style: mini, onClick: () => setForm({
				editing: null, alias: "", ip: "", port: "", user: "", password: "", workspace: "",
			}) }, t("conn.add")) : null),
		form !== null ? h("div", { style: {
			display: "flex", flexDirection: "column", gap: "8px",
			padding: "12px", borderRadius: "10px",
			border: "1px solid var(--dsh-border, rgba(128,128,128,.25))",
		} },
			h("div", null, h("span", { style: label }, t("conn.alias")),
				h("input", { style: input, value: form.alias,
					placeholder: t("conn.alias.ph"),
					disabled: form.editing !== null,
					onChange: (e) => setForm(Object.assign({}, form, { alias: e.target.value })) })),
			h("div", null, h("span", { style: label }, t("conn.ip")),
				h("input", { style: input, value: form.ip, placeholder: "192.168.1.10",
					onChange: (e) => setForm(Object.assign({}, form, { ip: e.target.value })) })),
			h("div", null, h("span", { style: label }, t("conn.port")),
				h("input", { style: Object.assign({}, input, { width: "100px" }), value: form.port, placeholder: "22",
					onChange: (e) => setForm(Object.assign({}, form, { port: e.target.value })) })),
			h("div", null, h("span", { style: label }, t("conn.user")),
				h("input", { style: input, value: form.user, placeholder: "root",
					onChange: (e) => setForm(Object.assign({}, form, { user: e.target.value })) })),
			h("div", null, h("span", { style: label }, t("conn.password")),
				// 创建时输入可见（首次录入）；编辑时留空表示保持已存密码，且不可查看。
				h("input", {
					style: input,
					type: form.editing === null ? "text" : "password",
					value: form.password,
					placeholder: form.editing === null ? "••••••••" : t("conn.password.keep"),
					autoComplete: "new-password",
					onChange: (e) => setForm(Object.assign({}, form, { password: e.target.value })),
				})),
			h("div", null, h("span", { style: label }, t("conn.workspace")),
				h("input", { style: input, value: form.workspace, placeholder: "/Users/you/project",
					onChange: (e) => setForm(Object.assign({}, form, { workspace: e.target.value })) })),
			h("div", { style: { display: "flex", gap: "8px" } },
				h("button", { style: button, onClick: () => { saveForm(); } }, t("conn.save")),
				h("button", { style: button, onClick: () => { setForm(null); } }, t("conn.cancel")))) : null,
		connections.length === 0 && form === null ? h("div", { style: { opacity: 0.65, fontSize: "13px", padding: "8px 0" } }, t("conn.empty")) :
		h("table", { style: { width: "100%", borderCollapse: "collapse" } },
			h("thead", null, h("tr", null,
				h("th", { style: th }, t("conn.alias")),
				h("th", { style: th }, t("conn.ip")),
				h("th", { style: th }, t("conn.user")),
				h("th", { style: th }, t("conn.workspace")),
				h("th", { style: th }, t("col.status")),
				h("th", { style: th }, ""))),
			h("tbody", null, connections.map((item) => {
				const key = "conn:" + item.alias;
				return h("tr", { key: key, style: row },
					h("td", { style: Object.assign({}, td, { fontWeight: 600 }) }, item.alias),
					h("td", { style: td }, item.ip + (item.port && item.port !== 22 ? ":" + item.port : "")),
					h("td", { style: td }, item.user || "—"),
					h("td", { style: td, title: item.workspace }, item.workspace ? (item.workspace.length > 28 ? "…" + item.workspace.slice(-27) : item.workspace) : "—"),
					renderStatusCell(key, true),
					h("td", { style: td },
						h("span", { style: { display: "inline-flex", gap: "6px" } },
							h("button", { style: mini, onClick: () => { probeOne(key); } }, t("action.probeOne")),
							h("button", { style: mini, onClick: () => setForm({
								editing: item.alias, alias: item.alias, ip: item.ip, port: String(item.port === 22 ? "" : item.port),
								user: item.user, password: "", workspace: item.workspace,
							}) }, t("conn.edit")),
							h("button", { style: mini, onClick: () => { deleteConnection(item.alias); } }, t("conn.del")))));
			}))));
}


function apply(ctx) {
	// Keep UI_LANG in step with the harness language for the plugin's whole
	// lifetime; the section re-renders itself through the relocalize hook.
	ctx.effect(() => subscribeLocale(ctx));
	ctx.slots.inject("settings.section", () => ctx.slots.register({
		name: "settings.section",
		id: "dsh-ssh-manager",
		order: 46,
		label: () => t("nav.title"),
		inject: () => ({}),
	}, (props) => SshManagerSection(props, ctx)));
}

const inject = ["slots", "locale"];

exports.apply = apply;
exports.inject = inject;

return module.exports;
}});
