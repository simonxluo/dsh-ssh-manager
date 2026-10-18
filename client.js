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
	"stat.hosts": "key hosts",
	"stat.conns": "password connections",
	"stat.reachable": "reachable",
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
	"stat.hosts": "密钥主机",
	"stat.conns": "密码连接",
	"stat.reachable": "可连接",
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
	"stat.hosts": "鍵ホスト",
	"stat.conns": "パスワード接続",
	"stat.reachable": "接続可能",
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
	"stat.hosts": "hosts con clave",
	"stat.conns": "conexiones con contraseña",
	"stat.reachable": "accesibles",
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

/** 设计系统样式：状态化按钮 / 药丸芯片 / 椭圆卡片矩阵（一次注入，类名 dshm-*）。 */
const STYLE_CSS = "@keyframes dsh-ssh-pulse{0%,100%{opacity:1}50%{opacity:.25}}@keyframes dsh-ssh-spin{to{transform:rotate(360deg)}}"
	+ ".dshm-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:6px 16px;font-size:13px;border-radius:999px;cursor:pointer;border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;transition:background .15s,border-color .15s,color .15s,transform .05s,opacity .15s;user-select:none;white-space:nowrap}"
	+ ".dshm-btn:hover:not(:disabled){background:rgba(127,127,127,.12);border-color:rgba(127,127,127,.55)}"
	+ ".dshm-btn:active:not(:disabled){transform:scale(.96)}"
	+ ".dshm-btn:focus-visible{outline:2px solid rgba(59,130,246,.6);outline-offset:1px}"
	+ ".dshm-btn:disabled{opacity:.45;cursor:not-allowed}"
	+ ".dshm-btn--sm{padding:3px 12px;font-size:12px}"
	+ ".dshm-btn--primary{background:#3b82f6;border-color:#3b82f6;color:#fff}"
	+ ".dshm-btn--primary:hover:not(:disabled){background:#2563eb;border-color:#2563eb}"
	+ ".dshm-btn--danger{color:#dc2626;border-color:rgba(220,38,38,.4)}"
	+ ".dshm-btn--danger:hover:not(:disabled){background:rgba(239,68,68,.12);border-color:#dc2626}"
	+ ".dshm-btn.is-done{border-color:#22c55e;color:#16a34a;background:rgba(34,197,94,.1)}"
	+ ".dshm-spin{width:11px;height:11px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:dsh-ssh-spin .7s linear infinite;flex:0 0 auto}"
	+ ".dshm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(310px,100%),1fr));gap:12px}"
	+ ".dshm-card{border:1px solid rgba(127,127,127,.22);border-radius:26px;padding:13px 17px 12px;display:flex;flex-direction:column;gap:9px;background:rgba(127,127,127,.045);transition:border-color .15s,background .15s,box-shadow .15s;min-width:0}"
	+ ".dshm-card:hover{border-color:rgba(127,127,127,.5);background:rgba(127,127,127,.08);box-shadow:0 1px 6px rgba(0,0,0,.05)}"
	+ ".dshm-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0}"
	+ ".dshm-card-title{font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"
	+ ".dshm-kv{display:flex;align-items:center;gap:7px;font-size:12.5px;min-width:0;flex-wrap:wrap;margin:0}"
	+ ".dshm-kv dt{opacity:.5;flex:0 0 auto;font-size:12px}"
	+ ".dshm-kv dd{margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums}"
	+ ".dshm-chip{display:inline-flex;align-items:center;gap:4px;padding:1px 10px;font-size:11.5px;border-radius:999px;border:1px solid transparent;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}"
	+ ".dshm-chip--ok{background:rgba(34,197,94,.12);color:#16a34a}"
	+ ".dshm-chip--warn{background:rgba(245,158,11,.14);color:#b45309}"
	+ ".dshm-chip--dim{background:rgba(127,127,127,.12);color:inherit;opacity:.85}"
	+ ".dshm-statbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}"
	+ ".dshm-pill{display:inline-flex;align-items:center;gap:6px;padding:2px 12px;border-radius:999px;font-size:12px;white-space:nowrap}"
	+ ".dshm-dot{width:8px;height:8px;border-radius:50%;flex:0 0 auto}"
	+ ".dshm-form{display:flex;flex-direction:column;gap:9px;padding:14px 17px;border-radius:26px;border:1px solid rgba(127,127,127,.25);background:rgba(127,127,127,.04)}"
	+ ".dshm-fieldrow{display:flex;flex-wrap:wrap;gap:9px}"
	+ ".dshm-field{display:flex;align-items:center;gap:8px;flex:1 1 230px;min-width:0}"
	+ ".dshm-field>span{flex:0 0 84px;font-size:12.5px;opacity:.65}"
	+ ".dshm-input{flex:1 1 auto;min-width:0;width:100%;box-sizing:border-box;padding:6px 14px;font-size:13px;border-radius:999px;border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;transition:border-color .15s,background .15s}"
	+ ".dshm-input:focus{outline:none;border-color:#3b82f6;background:rgba(59,130,246,.06)}"
	+ ".dshm-input:disabled{opacity:.55}"
	+ ".dshm-empty{border:1.5px dashed rgba(127,127,127,.35);border-radius:999px;padding:14px 22px;font-size:13px;opacity:.65;text-align:center}"
	+ ".dshm-actions{display:flex;flex-wrap:wrap;gap:7px;align-items:center}"
	+ ".dshm-sub{font-size:12.5px;opacity:.6}";

/** 状态化按钮：变体 ghost | primary | danger；状态 hover/active/disabled/busy(旋转)/done(绿闪)。 */
function Btn(props) {
	const [done, setDone] = useState(false);
	const [busy, setBusy] = useState(false);
	const disabled = props.disabled === true || busy;
	const variant = props.variant || "ghost";
	let className = "dshm-btn" + (props.size === "sm" ? " dshm-btn--sm" : "");
	if (variant === "primary") className += " dshm-btn--primary";
	if (variant === "danger") className += " dshm-btn--danger";
	if (busy) className += " is-busy";
	if (done) className += " is-done";
	const onClick = async () => {
		if (disabled || typeof props.onClick !== "function") return;
		setBusy(true);
		let failed = false;
		try {
			const result = await props.onClick();
			failed = result === false;
		} catch { failed = true; }
		setBusy(false);
		if (!failed && props.flash === true) {
			setDone(true);
			setTimeout(() => setDone(false), 1100);
		}
	};
	return h("button", { className: className, onClick: onClick, disabled: disabled, title: props.title || "" },
		busy ? h("span", { className: "dshm-spin" }) : null,
		done ? "✓" : null,
		props.children);
}

/** 药丸芯片：tone = ok | warn | dim。 */
function Chip(props) {
	return h("span", { className: "dshm-chip dshm-chip--" + (props.tone || "dim"), title: props.title || "" }, props.children);
}

/** 状态徽标（药丸形）：unknown | probing | ok(含延迟) | fail(错误入 title)。 */
function StatusPill(props) {
	if (props.kind === "probing") {
		return h("span", { className: "dshm-pill", style: { opacity: 0.7 } },
			h("span", { className: "dshm-dot", style: { background: "#3b82f6", animation: "dsh-ssh-pulse 1s infinite" } }),
			props.t("status.probing"));
	}
	if (props.kind === "ok") {
		return h("span", { className: "dstm-pill dshm-pill", style: { background: "rgba(34,197,94,.12)", color: "#16a34a" } },
			h("span", { className: "dstm-dot dshm-dot", style: { background: "#22c55e" } }),
			props.t("status.ok"),
			typeof props.latencyMs === "number" ? h("span", { style: { opacity: 0.65 } }, props.latencyMs + " " + props.t("ms")) : null,
			props.tcp ? h("span", { style: { opacity: 0.6 } }, "· " + props.t("conn.tcp")) : null);
	}
	if (props.kind === "fail") {
		return h("span", { className: "dshm-pill", style: { background: "rgba(239,68,68,.1)", color: "#dc2626" }, title: props.error || "" },
			h("span", { className: "dshm-dot", style: { background: "#ef4444" } }),
			props.t("status.fail"));
	}
	return h("span", { className: "dshm-pill", style: { background: "rgba(120,120,120,.12)", color: "inherit", opacity: 0.75 } },
		h("span", { style: { width: "8px", height: "8px", borderRadius: "50%", background: "currentColor", opacity: 0.5, flex: "0 0 auto" } }),
		props.t("status.unknown"));
}

/** 标签-值数据行（省略号截断，悬停可见全文）。 */
function Kv(props) {
	return h("dl", { className: "dshm-kv" },
		h("dt", null, props.label),
		h("dd", { title: props.title || String(props.value || "") }, props.value === undefined || props.value === "" ? "—" : props.value));
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

	useEffect(() => { probeRef.current = probeAll; }, [probeAll]);
	useEffect(() => {
		(async () => { await load(); })();
		const timer = setInterval(() => { if (probeRef.current) probeRef.current(); }, RESCAN_MS);
		return () => clearInterval(timer);
	}, []);

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
	}, [form]);

	const deleteConnection = useCallback(async (alias) => {
		if (!window.confirm(t("conn.confirmDelete") + " " + alias + "?")) return;
		await api("conn-delete", { alias });
		if (!alive.current) return;
		await load();
	}, []);

	const statusOf = (key) => {
		const status = probed[key];
		if (status === "probing") return { kind: "probing" };
		if (status && typeof status === "object") {
			return status.ok === true
				? { kind: "ok", latencyMs: status.latencyMs }
				: { kind: "fail", error: String(status.error || "") };
		}
		return { kind: "unknown" };
	};

	const hostList = hosts || [];
	const okOf = (list, prefix) => list.reduce((n, item) => (statusOf((prefix || "") + item.alias).kind === "ok" ? n + 1 : n), 0);
	const total = hostList.length + connections.length;
	const okTotal = okOf(hostList, "") + okOf(connections, "conn:");
	const setField = (key) => (e) => setForm(Object.assign({}, form, { [key]: e.target.value }));

	return h("div", { style: { display: "flex", flexDirection: "column", gap: "14px" } },
		h("style", null, STYLE_CSS),
		h("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" } },
			h("div", null,
				h("div", { style: { fontSize: "17px", fontWeight: 650 } }, t("title")),
				h("div", { className: "dshm-sub", style: { marginTop: "2px" } }, t("subtitle"))),
			h("div", { className: "dshm-actions" },
				h(Btn, { onClick: () => load(), flash: true }, t("action.refresh")),
				h(Btn, { variant: "primary", onClick: () => probeAll(), disabled: probing }, probing ? t("status.probing") : t("action.probeAll")))),
		h("div", { className: "dshm-statbar" },
			h(Chip, { tone: "dim" }, hostList.length + " " + t("stat.hosts")),
			h(Chip, { tone: "dim" }, connections.length + " " + t("stat.conns")),
			total > 0 ? h(Chip, { tone: okTotal === total ? "ok" : "warn" }, okTotal + "/" + total + " " + t("stat.reachable")) : null),
		error ? h("div", { style: { color: "#dc2626", fontSize: "13px" } }, error) : null,

		hosts === null ? h("div", { className: "dshm-sub" }, "…") :
		hostList.length === 0 ? h("div", { className: "dshm-empty" }, t("empty")) :
		h("div", { className: "dshm-grid" }, hostList.map((item) => {
			const s = statusOf(item.alias);
			return h("div", { key: item.alias, className: "dshm-card" },
				h("div", { className: "dshm-card-head" },
					h("span", { className: "dstm-card-title dshm-card-title", title: item.alias }, item.alias),
					h(StatusPill, { kind: s.kind, latencyMs: s.latencyMs, error: s.error, t: t })),
				h(Kv, { label: t("col.url"), value: item.url }),
				h("div", { className: "dshm-kv", style: { gap: "10px" } },
					h(Kv, { label: t("col.user"), value: item.user }),
					item.hasKey ? h(Chip, { tone: "ok" }, t("key.yes")) : h(Chip, { tone: "warn" }, t("key.no"))),
				h("div", { className: "dshm-actions" },
					h(Btn, { size: "sm", onClick: () => probeOne(item.alias), disabled: s.kind === "probing" }, t("action.probeOne"))));
		})),

		h("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginTop: "4px" } },
			h("div", null,
				h("div", { style: { fontSize: "14.5px", fontWeight: 600 } }, t("conn.title")),
				h("div", { className: "dshm-sub" }, t("conn.subtitle"))),
			form === null ? h(Btn, { size: "sm", variant: "primary", onClick: () => setForm({ editing: null, alias: "", ip: "", port: "", user: "", password: "", workspace: "" }) }, "+ " + t("conn.add")) : null),

		form !== null ? h("div", { className: "dshm-form" },
			h("div", { className: "dshm-fieldrow" },
				h("div", { className: "dshm-field" },
					h("span", null, t("conn.alias")),
					h("input", { className: "dshm-input", value: form.alias, placeholder: t("conn.alias.ph"), disabled: form.editing !== null, onChange: setField("alias") })),
				h("div", { className: "dshm-field" },
					h("span", null, t("conn.ip")),
					h("input", { className: "dshm-input", value: form.ip, placeholder: "192.168.1.10", onChange: setField("ip") }))),
			h("div", { className: "dshm-fieldrow" },
				h("div", { className: "dstm-field dshm-field", style: { flex: "0 1 170px" } },
					h("span", null, t("conn.port")),
					h("input", { className: "dshm-input", value: form.port, placeholder: "22", onChange: setField("port") })),
				h("div", { className: "dshm-field" },
					h("span", null, t("conn.user")),
					h("input", { className: "dshm-input", value: form.user, placeholder: "root", onChange: setField("user") }))),
			h("div", { className: "dstm-fieldrow dshm-fieldrow" },
				h("div", { className: "dshm-field" },
					h("span", null, t("conn.password")),
					h("input", {
						className: "dshm-input",
						type: form.editing === null ? "text" : "password",
						value: form.password,
						placeholder: form.editing === null ? "••••••••" : t("conn.password.keep"),
						autoComplete: "new-password",
						onChange: setField("password"),
					}))),
			h("div", { className: "dstm-fieldrow dstm-field dstm-fieldrow dstm-fieldrow dshm-fieldrow" },
				h("div", { className: "dshm-field" },
					h("span", null, t("conn.workspace")),
					h("input", { className: "dshm-input", value: form.workspace, placeholder: "/Users/you/project", onChange: setField("workspace") }))),
			h("div", { className: "dshm-actions" },
				h(Btn, { variant: "primary", onClick: () => saveForm() }, t("conn.save")),
				h(Btn, { onClick: () => setForm(null) }, t("conn.cancel")))) : null,

		connections.length === 0 && form === null ? h("div", { className: "dshm-empty" }, t("conn.empty")) :
		h("div", { className: "dshm-grid" }, connections.map((item) => {
			const key = "conn:" + item.alias;
			const s = statusOf(key);
			return h("div", { key: key, className: "dshm-card" },
				h("div", { className: "dshm-card-head" },
					h("span", { className: "dshm-card-title", title: item.alias }, item.alias),
					h(StatusPill, { kind: s.kind, latencyMs: s.latencyMs, error: s.error, t: t, tcp: true })),
				h("div", { className: "dshm-kv", style: { gap: "10px" } },
					h("span", { style: { fontVariantNumeric: "tabular-nums" } }, item.ip + (item.port && item.port !== 22 ? ":" + item.port : "")),
					h("span", { style: { opacity: 0.5 } }, "@"),
					h("span", null, item.user || "—"),
					h(Chip, { tone: item.hasPassword ? "warn" : "dim", title: item.hasPassword ? t("conn.password") : "" }, item.hasPassword ? "••••••" : "—"),
					item.workspace ? h(Chip, { tone: "dim", title: item.workspace }, item.workspace.length > 26 ? "…" + item.workspace.slice(-25) : item.workspace) : null),
				h("div", { className: "dshm-actions" },
					h(Btn, { size: "sm", onClick: () => probeOne(key), disabled: s.kind === "probing" }, t("action.probeOne")),
					h(Btn, { size: "sm", onClick: () => setForm({ editing: item.alias, alias: item.alias, ip: item.ip, port: String(item.port === 22 ? "" : item.port), user: item.user, password: "", workspace: item.workspace }) }, t("conn.edit")),
					h(Btn, { size: "sm", variant: "danger", onClick: () => deleteConnection(item.alias) }, t("conn.del"))));
		})));
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
