// dsh-ssh-manager — Client half: the「SSH 管理」settings section.
//
// Apple-aesthetic redesign of the management page:
//   - iOS/macOS large title + toolbar, grouped inset lists with hairline
//     separators, tinted controls, stat tiles.
//   - Add/Edit runs in a sheet (in-page sub-window): scrim with backdrop
//     blur, focus trap, Escape to close, autofocus first field.
//   - Delete confirms through an alert dialog (replaces window.confirm).
// Theming rides exclusively on --dsw-alias-* tokens; semantic status colors
// come from state-* tokens via color-mix. Source of truth for the list is
// the Host plugin's row config (surfaced as metadata only); connectivity
// comes from POST {action:'probe'} on the panel route. React comes from the
// browser module table.
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
	"sec.keyhosts": "Key hosts",
	"sec.conns": "Password connections",
	"stat.hosts": "key hosts",
	"stat.conns": "password connections",
	"stat.reachable": "reachable",
	"status.unknown": "Not probed",
	"status.probing": "Probing…",
	"status.ok": "Reachable",
	"status.fail": "Unreachable",
	"action.probeAll": "Probe all",
	"action.refresh": "Refresh",
	"action.probeOne": "Probe",
	"empty": "No hosts configured yet — add one in the plugin configuration card.",
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
	"conn.empty": "No password connections yet.",
	"conn.tcp": "TCP",
	"key.yes": "managed key",
	"key.no": "no key",
	"ms": "ms",
	"sheet.add": "New connection",
	"sheet.edit": "Edit connection",
	"sheet.sub": "Password-authenticated entry; connectivity is probed over TCP.",
	"alert.deleteTitle": "Delete “%s”?",
	"alert.deleteMsg": "The stored password and workspace binding will be removed. This action cannot be undone.",
	"alert.delete": "Delete",
	"error.load": "Failed to load hosts: ",
	"error.probe": "Request failed: ",
};

const zh = {
	"nav.title": "SSH 管理",
	"title": "开发机管理",
	"subtitle": "当前 harness 中保存的 SSH 主机及其连通状态。",
	"sec.keyhosts": "密钥主机",
	"sec.conns": "密码连接",
	"stat.hosts": "密钥主机",
	"stat.conns": "密码连接",
	"stat.reachable": "可连接",
	"status.unknown": "未探测",
	"status.probing": "探测中…",
	"status.ok": "可连接",
	"status.fail": "不可连接",
	"action.probeAll": "全部探测",
	"action.refresh": "刷新",
	"action.probeOne": "探测",
	"empty": "尚未配置主机——在插件配置卡片中添加。",
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
	"conn.empty": "还没有密码连接。",
	"conn.tcp": "TCP",
	"key.yes": "已托管密钥",
	"key.no": "无密钥",
	"ms": "毫秒",
	"sheet.add": "新增连接",
	"sheet.edit": "编辑连接",
	"sheet.sub": "以密码认证的连接条目；连通性经 TCP 探测。",
	"alert.deleteTitle": "删除“%s”？",
	"alert.deleteMsg": "将移除已保存的密码与工作区绑定，此操作不可撤销。",
	"alert.delete": "删除",
	"error.load": "加载主机失败：",
	"error.probe": "请求失败：",
};

const ja = {
	"nav.title": "SSH 管理",
	"title": "開発機管理",
	"subtitle": "この harness に保存された SSH ホストとその接続状態。",
	"sec.keyhosts": "鍵ホスト",
	"sec.conns": "パスワード接続",
	"stat.hosts": "鍵ホスト",
	"stat.conns": "パスワード接続",
	"stat.reachable": "接続可能",
	"status.unknown": "未実行",
	"status.probing": "確認中…",
	"status.ok": "接続可能",
	"status.fail": "接続不可",
	"action.probeAll": "すべて確認",
	"action.refresh": "更新",
	"action.probeOne": "確認",
	"empty": "ホストが未設定です — プラグイン設定カードで追加してください。",
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
	"conn.empty": "パスワード接続はまだありません。",
	"conn.tcp": "TCP",
	"key.yes": "管理鍵あり",
	"key.no": "鍵なし",
	"ms": "ミリ秒",
	"sheet.add": "新規接続",
	"sheet.edit": "接続を編集",
	"sheet.sub": "パスワード認証の接続エントリ。TCP で到達性を確認します。",
	"alert.deleteTitle": "「%s」を削除しますか？",
	"alert.deleteMsg": "保存されたパスワードとワークスペース連携が削除されます。この操作は元に戻せません。",
	"alert.delete": "削除",
	"error.load": "ホストの読み込みに失敗：",
	"error.probe": "リクエストに失敗：",
};

const es = {
	"nav.title": "Gestión SSH",
	"title": "Gestión de máquinas de desarrollo",
	"subtitle": "Hosts SSH guardados en este harness y su conectividad.",
	"sec.keyhosts": "Hosts con clave",
	"sec.conns": "Conexiones con contraseña",
	"stat.hosts": "hosts con clave",
	"stat.conns": "conexiones con contraseña",
	"stat.reachable": "accesibles",
	"status.unknown": "Sin comprobar",
	"status.probing": "Comprobando…",
	"status.ok": "Accesible",
	"status.fail": "Inaccesible",
	"action.probeAll": "Comprobar todo",
	"action.refresh": "Actualizar",
	"action.probeOne": "Comprobar",
	"empty": "Aún no hay hosts configurados — añade uno en la tarjeta de configuración del plugin.",
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
	"conn.empty": "Aún no hay conexiones con contraseña.",
	"conn.tcp": "TCP",
	"key.yes": "con clave gestionada",
	"key.no": "sin clave",
	"ms": "ms",
	"sheet.add": "Nueva conexión",
	"sheet.edit": "Editar conexión",
	"sheet.sub": "Entrada autenticada por contraseña; conectividad comprobada por TCP.",
	"alert.deleteTitle": "¿Eliminar «%s»?",
	"alert.deleteMsg": "Se eliminarán la contraseña guardada y el espacio de trabajo asociado. Esta acción no se puede deshacer.",
	"alert.delete": "Eliminar",
	"error.load": "Error al cargar hosts: ",
	"error.probe": "Error en la solicitud: ",
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

/**
 * Apple 风格设计系统（类名 dshm-*，一次注入）。
 * 颜色一律走 --dsw-alias-* 主题 token（color-mix 派生 tint）；动画曲线
 * 取 macOS sheet 的 cubic-bezier(.32,.72,0,1)，并尊重 prefers-reduced-motion。
 */
const STYLE_CSS = `
@keyframes dsh-ssh-pulse{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes dsh-ssh-spin{to{transform:rotate(360deg)}}
@keyframes dsh-ssh-fade{from{opacity:0}}
@keyframes dsh-ssh-sheet-in{from{opacity:0;transform:scale(1.05) translateY(8px)}}
.dstm-root{display:flex;flex-direction:column;gap:18px;font-variant-numeric:tabular-nums}
.dstm-head{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;flex-wrap:wrap}
.dstm-title{font-size:22px;font-weight:700;letter-spacing:-.021em;line-height:1.2}
.dstm-subtitle{font-size:12.5px;color:var(--dsw-alias-label-tertiary);margin-top:3px;line-height:1.45}
.dstm-toolbar{display:flex;align-items:center;gap:8px}
.dstm-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:5px 13px;font-size:12.5px;font-weight:600;border-radius:8px;cursor:pointer;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-primary);transition:background .16s,color .16s,border-color .16s,transform .08s,opacity .16s;user-select:none;white-space:nowrap;line-height:1.4}
.dstm-btn:active:not(:disabled){transform:scale(.97);opacity:.8}
.dstm-btn:disabled{opacity:.4;cursor:default}
.dstm-btn:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-business-primary) 32%,transparent)}
.dstm-btn--sm{padding:3px 10px;font-size:12px;border-radius:7px}
.dstm-btn--icon{padding:4px 7px}
.dstm-btn--plain:hover:not(:disabled){background:rgba(120,120,128,.12);background:color-mix(in srgb,var(--dsw-alias-label-primary) 9%,transparent)}
.dstm-btn--tinted{background:rgba(120,120,128,.14);background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 13%,transparent);color:var(--dsw-alias-state-business-primary)}
.dstm-btn--tinted:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 20%,transparent)}
.dstm-btn--filled{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground,#fff)}
.dstm-btn--filled:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
.dstm-btn--danger{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 13%,transparent);color:var(--dsw-alias-state-error-primary)}
.dstm-btn--danger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 20%,transparent)}
.dstm-btn--destructive{background:var(--dsw-alias-state-error-primary);color:#fff}
.dstm-btn--destructive:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 85%,#000)}
.dstm-btn.is-done{color:var(--dsw-alias-state-success-primary)}
.dstm-btn--wide{min-width:76px}
.dstm-spin{width:11px;height:11px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:dsh-ssh-spin .7s linear infinite;flex:0 0 auto}
.dstm-ico{flex:0 0 auto;display:block}
.dstm-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
.dstm-stat{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:10px 14px 11px;display:flex;flex-direction:column;gap:3px;min-width:0}
.dstm-stat-num{font-size:19px;font-weight:600;letter-spacing:-.01em;line-height:1.15;display:flex;align-items:center;gap:6px}
.dstm-stat-label{font-size:11.5px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dstm-sec{display:flex;flex-direction:column;gap:8px}
.dstm-sec-head{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:26px}
.dstm-sec-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-tertiary);text-transform:uppercase;letter-spacing:.05em}
.dstm-group{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;overflow:hidden}
.dstm-row{position:relative;display:flex;align-items:center;gap:12px;padding:9px 14px;min-height:52px}
.dstm-row + .dstm-row::before{content:"";position:absolute;top:0;left:42px;right:0;height:1px;background:var(--dsw-alias-border-l2)}
.dstm-row:hover{background:rgba(120,120,128,.05);background:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent)}
.dstm-dot{width:9px;height:9px;border-radius:50%;flex:0 0 auto}
.dstm-dot--ok{background:var(--dsw-alias-state-success-primary)}
.dstm-dot--warn{background:var(--dsw-alias-state-warn-primary)}
.dstm-dot--fail{background:var(--dsw-alias-state-error-primary)}
.dstm-dot--unknown{background:color-mix(in srgb,var(--dsw-alias-label-primary) 30%,transparent)}
.dstm-dot--probing{background:var(--dsw-alias-state-business-primary);animation:dsh-ssh-pulse 1.1s ease-in-out infinite}
.dstm-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:1.5px}
.dstm-name{font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dstm-detail{font-size:12px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:6px;min-width:0}
.dstm-sep{opacity:.45;flex:0 0 auto}
.dstm-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px}
.dstm-side{display:flex;align-items:center;gap:6px;flex:0 0 auto}
.dstm-status{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.dstm-status--ok{color:var(--dsw-alias-state-success-primary)}
.dstm-status--fail{color:var(--dsw-alias-state-error-primary)}
.dstm-chip{display:inline-flex;align-items:center;padding:1.5px 9px;font-size:11px;font-weight:500;border-radius:999px;border:1px solid transparent;white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis}
.dstm-chip--ok{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 13%,transparent);color:var(--dsw-alias-state-success-primary)}
.dstm-chip--warn{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 15%,transparent);color:var(--dsw-alias-state-warn-primary)}
.dstm-chip--dim{background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);color:var(--dsw-alias-label-tertiary)}
.dstm-empty{padding:26px 18px;display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--dsw-alias-label-tertiary);font-size:12.5px;text-align:center}
.dstm-empty .dshm-ico{opacity:.45}
.dstm-error{display:flex;gap:9px;align-items:flex-start;padding:10px 13px;border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);color:var(--dsw-alias-state-error-primary);font-size:12.5px;line-height:1.5;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 22%,transparent)}
.dstm-error .dshm-ico{margin-top:1px}
.dstm-scrim{position:fixed;inset:0;z-index:2147483000;background:var(--dsw-alias-bg-mask-3,rgba(0,0,0,.32));backdrop-filter:blur(16px) saturate(170%);-webkit-backdrop-filter:blur(16px) saturate(170%);display:flex;align-items:center;justify-content:center;padding:22px;animation:dsh-ssh-fade .2s ease}
.dstm-sheet{width:min(440px,100%);max-height:min(86vh,640px);overflow:auto;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:14px;box-shadow:var(--dsw-elevation-prominent,0 20px 60px rgba(0,0,0,.35));animation:dsh-ssh-sheet-in .3s cubic-bezier(.32,.72,0,1);display:flex;flex-direction:column}
.dstm-sheet--small{width:min(330px,100%)}
.dstm-sheet-head{padding:18px 20px 4px;display:flex;flex-direction:column;gap:3px}
.dstm-sheet-title{font-size:15.5px;font-weight:700;letter-spacing:-.012em}
.dstm-sheet-sub{font-size:12px;color:var(--dsw-alias-label-tertiary);line-height:1.5}
.dstm-sheet-body{padding:14px 20px 16px;display:flex;flex-direction:column;gap:13px}
.dstm-sheet-foot{display:flex;justify-content:flex-end;gap:8px;padding:11px 14px;border-top:1px solid var(--dsw-alias-border-l2)}
.dstm-field{display:flex;flex-direction:column;gap:5px;min-width:0}
.dstm-field-label{font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-tertiary);letter-spacing:.01em}
.dstm-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.dstm-input{width:100%;box-sizing:border-box;padding:6px 11px;font-size:12.5px;border-radius:8px;border:1px solid transparent;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);transition:border-color .16s,box-shadow .16s;font-family:inherit}
.dstm-input::placeholder{color:var(--dsw-alias-label-tertiary);opacity:.7}
.dstm-input:focus{outline:none;border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-business-primary) 25%,transparent)}
.dstm-input:disabled{opacity:.5}
.dstm-alert-ico{width:40px;height:40px;border-radius:50%;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 13%,transparent);color:var(--dsw-alias-state-error-primary);display:flex;align-items:center;justify-content:center;margin:18px auto 11px}
.dstm-alert-title{font-size:13.5px;font-weight:700;padding:0 18px;letter-spacing:-.01em;text-align:center}
.dstm-alert-msg{font-size:12px;color:var(--dsw-alias-label-tertiary);line-height:1.55;padding:6px 20px 0;max-width:280px;margin:0 auto;text-align:center}
.dstm-alert-foot{display:flex;justify-content:center;gap:10px;padding:16px 16px 18px;width:100%;box-sizing:border-box}
@media (prefers-reduced-motion:reduce){.dshm-root *{animation:none!important;transition:none!important}}
`;

/** SF-Symbols 风格的极简线性图标（currentColor 描边，视为 artwork）。 */
function Ico(props) {
	const size = props.size || 13;
	const common = {
		width: size, height: size, viewBox: "0 0 16 16", fill: "none",
		stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round",
		strokeLinejoin: "round", className: "dshm-ico", "aria-hidden": "true",
	};
	switch (props.name) {
		case "refresh": return h("svg", common,
			h("path", { d: "M13.2 8a5.2 5.2 0 1 1-1.53-3.67" }),
			h("path", { d: "M13.3 2v2.7h-2.7" }));
		case "probe": return h("svg", common,
			h("circle", { cx: 4.5, cy: 11.5, r: 1.1, fill: "currentColor", stroke: "none" }),
			h("path", { d: "M6.7 9.3a3.1 3.1 0 0 1 0 4.4" }),
			h("path", { d: "M8.9 6.9a6.1 6.1 0 0 1 0 9" }));
		case "plus": return h("svg", common, h("path", { d: "M8 3.2v9.6M3.2 8h9.6" }));
		case "pencil": return h("svg", common, h("path", { d: "M3 13l.9-3.1L11.4 2.4a1.55 1.55 0 0 1 2.2 2.2L6.1 12.1 3 13z" }));
		case "trash": return h("svg", common,
			h("path", { d: "M3 4.6h10" }),
			h("path", { d: "M6.4 4.6V3.2a.9.9 0 0 1 .9-.9h1.4a.9.9 0 0 1 .9.9v1.4" }),
			h("path", { d: "M4.6 4.6l.6 8a1.1 1.1 0 0 0 1.1 1h3.4a1.1 1.1 0 0 0 1.1-1l.6-8" }));
		case "check": return h("svg", common, h("path", { d: "M3.5 8.6l3 3 6-7.2" }));
		case "warn": return h("svg", common,
			h("path", { d: "M8 2.6L14.4 13.4H1.6z" }),
			h("path", { d: "M8 6.6v3" }),
			h("path", { d: "M8 11.7v.01" }));
		case "tray": return h("svg", common,
			h("path", { d: "M2.6 8.6h2.9l1.1 1.8h2.8l1.1-1.8h2.9" }),
			h("path", { d: "M3.4 8.6l1.1-4a1 1 0 0 1 1-.7h5a1 1 0 0 1 1 .7l1.1 4v3a1 1 0 0 1-1 1H4.4a1 1 0 0 1-1-1v-3z" }));
		default: return null;
	}
}

/** 状态化按钮：plain | tinted | filled | danger | destructive；busy 旋转、done 绿闪。 */
function Btn(props) {
	const [done, setDone] = useState(false);
	const [busy, setBusy] = useState(false);
	const disabled = props.disabled === true || busy;
	const variant = props.variant || "plain";
	let className = "dshm-btn dshm-btn--" + variant;
	if (props.size === "sm") className += " dshm-btn--sm";
	if (props.iconOnly === true) className += " dshm-btn--icon";
	if (props.wide === true) className += " dshm-btn--wide";
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
	const label = props.ariaLabel || props.title || undefined;
	return h("button", { className: className, onClick: onClick, disabled: disabled, title: props.title || "", "aria-label": label },
		busy ? h("span", { className: "dshm-spin" }) : null,
		busy ? null : (props.icon || null),
		props.children === undefined ? null : props.children);
}

/** 药丸芯片：tone = ok | warn | dim。 */
function Chip(props) {
	return h("span", { className: "dshm-chip dshm-chip--" + (props.tone || "dim"), title: props.title || "" }, props.children);
}

/** 状态点：ok | warn | fail | probing | unknown。 */
function Dot(props) {
	return h("span", { className: "dshm-dot dshm-dot--" + (props.kind || "unknown"), "aria-hidden": "true" });
}

/** 状态文字（含延迟与 TCP 标记；失败原因进 title）。 */
function StatusText(props) {
	const s = props.s;
	const kind = s.kind;
	const cls = "dshm-status" + (kind === "ok" ? " dshm-status--ok" : kind === "fail" ? " dshm-status--fail" : "");
	const title = kind === "fail" ? (s.error || props.t("status.fail")) : "";
	const bits = [props.t("status." + (kind === "unknown" ? "unknown" : kind))];
	if (kind === "ok" && typeof s.latencyMs === "number") bits.push(s.latencyMs + " " + props.t("ms"));
	if (kind === "ok" && props.tcp === true) bits.push(props.t("conn.tcp"));
	return h("span", { className: cls, title: title }, bits.join(" · "));
}

/** 统计小卡：数值 + 标签，可选 ok/warn 色点。 */
function Stat(props) {
	return h("div", { className: "dshm-stat" },
		h("span", { className: "dshm-stat-num" },
			props.tone === "ok" ? h(Dot, { kind: "ok" }) : null,
			props.tone === "warn" ? h(Dot, { kind: "warn" }) : null,
			props.value),
		h("span", { className: "dshm-stat-label" }, props.label));
}

/** 空状态：图标 + 文案。 */
function EmptyCard(props) {
	return h("div", { className: "dshm-empty" },
		h(Ico, { name: props.icon || "tray", size: 22 }),
		h("span", null, props.text));
}

/**
 * 页内子窗口（sheet/alert）：scrim 磨砂背景 + 面板缩放入场。
 * Escape 关闭、Tab 焦点圈定、自动聚焦首个输入，符合 practices.md 的
 * Modal 焦点/Escape 约定；alert 模式不响应点击蒙层关闭。
 */
function Sheet(props) {
	const panelRef = useRef(null);
	useEffect(() => {
		const panel = panelRef.current;
		if (!panel) return;
		const raf = requestAnimationFrame(() => {
			const selector = props.alert === true ? "button" : "input, select, textarea";
			const target = panel.querySelector(selector);
			if (target) {
				try { target.focus({ preventScroll: true }); } catch { /* focus is best-effort */ }
			}
		});
		return () => cancelAnimationFrame(raf);
		// 挂载时聚焦一次即可；props.alert 在挂载周期内不变。
	}, []);
	const onKeyDown = (e) => {
		if (e.key === "Escape") {
			e.stopPropagation();
			if (props.onClose) props.onClose();
			return;
		}
		if (e.key !== "Tab") return;
		const panel = panelRef.current;
		if (!panel) return;
		const nodes = Array.from(panel.querySelectorAll(
			'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'));
		if (nodes.length === 0) return;
		const first = nodes[0];
		const last = nodes[nodes.length - 1];
		const active = document.activeElement;
		if (e.shiftKey && (active === first || active === panel)) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && active === last) {
			e.preventDefault();
			first.focus();
		}
	};
	const onMouseDown = (e) => {
		if (props.dismissOnScrim !== false && e.target === e.currentTarget && props.onClose) props.onClose();
	};
	return h("div", { className: "dshm-scrim", onKeyDown: onKeyDown, onMouseDown: onMouseDown, tabIndex: -1 },
		h("div", {
			ref: panelRef,
			className: "dshm-sheet" + (props.small === true ? " dshm-sheet--small" : ""),
			role: props.alert === true ? "alertdialog" : "dialog",
			"aria-modal": "true",
			"aria-label": typeof props.label === "string" ? props.label : undefined,
		}, props.children));
}

function SshManagerSection(props, ctx) {
	const [, setLangTick] = useState(0);
	const [hosts, setHosts] = useState(null);
	const [connections, setConnections] = useState([]);
	const [probed, setProbed] = useState({});
	const [probing, setProbing] = useState(false);
	const [error, setError] = useState("");
	const [form, setForm] = useState(null);
	const [confirmAlias, setConfirmAlias] = useState(null);
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
			// 保持 sheet 打开让用户改数据；错误同时上浮到页面级横幅。
			if (alive.current) setError(t("error.probe") + String(err && err.message ? err.message : err));
		}
	}, [form]);

	const deleteConnection = useCallback(async (alias) => {
		try {
			await api("conn-delete", { alias });
			if (!alive.current) return;
			setConfirmAlias(null);
			await load();
		} catch (err) {
			if (alive.current) setError(t("error.probe") + String(err && err.message ? err.message : err));
		}
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

	const hostRow = (item) => {
		const s = statusOf(item.alias);
		return h("div", { key: item.alias, className: "dshm-row" },
			h(Dot, { kind: s.kind }),
			h("div", { className: "dshm-main" },
				h("span", { className: "dshm-name", title: item.alias }, item.alias),
				h("span", { className: "dshm-detail" },
					h("span", null, item.url),
					h("span", { className: "dshm-sep" }, "·"),
					h("span", null, item.user))),
			h("div", { className: "dshm-side" },
				h(StatusText, { s: s, t: t }),
				item.hasKey ? h(Chip, { tone: "ok" }, t("key.yes")) : h(Chip, { tone: "warn" }, t("key.no")),
				h(Btn, {
					size: "sm", variant: "tinted", iconOnly: true,
					onClick: () => probeOne(item.alias), disabled: s.kind === "probing",
					title: t("action.probeOne"), ariaLabel: t("action.probeOne"),
				}, h(Ico, { name: "probe", size: 11 }))));
	};

	const connRow = (item) => {
		const key = "conn:" + item.alias;
		const s = statusOf(key);
		return h("div", { key: key, className: "dshm-row" },
			h(Dot, { kind: s.kind }),
			h("div", { className: "dshm-main" },
				h("span", { className: "dshm-name", title: item.alias }, item.alias),
				h("span", { className: "dshm-detail" },
					h("span", { className: "dshm-mono" }, item.ip + (item.port && item.port !== 22 ? ":" + item.port : "")),
					h("span", { className: "dshm-sep" }, "@"),
					h("span", null, item.user || "—"),
					item.workspace
						? h(Chip, { tone: "dim", title: item.workspace }, item.workspace.length > 26 ? "…" + item.workspace.slice(-25) : item.workspace)
						: null,
					item.hasPassword ? h(Chip, { tone: "warn", title: t("conn.password") }, "••••••") : null)),
			h("div", { className: "dshm-side" },
				h(StatusText, { s: s, t: t, tcp: true }),
				h(Btn, {
					size: "sm", variant: "tinted", iconOnly: true,
					onClick: () => probeOne(key), disabled: s.kind === "probing",
					title: t("action.probeOne"), ariaLabel: t("action.probeOne"),
				}, h(Ico, { name: "probe", size: 11 })),
				h(Btn, {
					size: "sm", variant: "plain", iconOnly: true,
					onClick: () => setForm({
						editing: item.alias, alias: item.alias, ip: item.ip,
						port: String(item.port === 22 ? "" : item.port), user: item.user,
						password: "", workspace: item.workspace,
					}),
					title: t("conn.edit"), ariaLabel: t("conn.edit"),
				}, h(Ico, { name: "pencil", size: 12 })),
				h(Btn, {
					size: "sm", variant: "danger", iconOnly: true,
					onClick: () => setConfirmAlias(item.alias),
					title: t("conn.del"), ariaLabel: t("conn.del"),
				}, h(Ico, { name: "trash", size: 12 }))));
	};

	const formField = (key, labelKey, placeholder, extra) => h("div", { className: "dshm-field" },
		h("span", { className: "dshm-field-label" }, t(labelKey)),
		h("input", Object.assign({
			className: "dshm-input" + (key === "ip" || key === "port" ? " dshm-mono" : ""),
			value: form[key],
			placeholder: placeholder,
			onChange: setField(key),
		}, extra || {})));

	return h("div", { className: "dshm-root" },
		h("style", null, STYLE_CSS),
		h("div", { className: "dshm-head" },
			h("div", null,
				h("div", { className: "dshm-title" }, t("title")),
				h("div", { className: "dshm-subtitle" }, t("subtitle"))),
			h("div", { className: "dshm-toolbar" },
				h(Btn, {
					variant: "plain", iconOnly: true, flash: true,
					onClick: () => load(),
					title: t("action.refresh"), ariaLabel: t("action.refresh"),
				}, h(Ico, { name: "refresh" })),
				h(Btn, {
					variant: "tinted",
					onClick: () => probeAll(), disabled: probing,
					icon: probing ? undefined : h(Ico, { name: "probe", size: 12 }),
				}, probing ? t("status.probing") : t("action.probeAll")))),

		h("div", { className: "dshm-stats" },
			h(Stat, { value: String(hostList.length), label: t("stat.hosts") }),
			h(Stat, { value: String(connections.length), label: t("stat.conns") }),
			h(Stat, {
				value: total > 0 ? okTotal + "/" + total : "—",
				label: t("stat.reachable"),
				tone: total === 0 ? undefined : (okTotal === total ? "ok" : "warn"),
			})),

		error ? h("div", { className: "dshm-error", role: "alert" },
			h(Ico, { name: "warn", size: 14 }),
			h("span", null, error)) : null,

		h("div", { className: "dshm-sec" },
			h("div", { className: "dshm-sec-head" },
				h("span", { className: "dshm-sec-title" }, t("sec.keyhosts"))),
			hosts === null
				? h("div", { className: "dshm-group" }, h("div", { className: "dshm-empty" }, "…"))
				: hostList.length === 0
					? h("div", { className: "dshm-group" }, h(EmptyCard, { icon: "tray", text: t("empty") }))
					: h("div", { className: "dshm-group" }, hostList.map(hostRow))),

		h("div", { className: "dshm-sec" },
			h("div", { className: "dshm-sec-head" },
				h("span", { className: "dshm-sec-title" }, t("sec.conns")),
				form === null ? h(Btn, {
					size: "sm", variant: "tinted",
					onClick: () => setForm({ editing: null, alias: "", ip: "", port: "", user: "", password: "", workspace: "" }),
					icon: h(Ico, { name: "plus", size: 11 }),
				}, t("conn.add")) : null),
			connections.length === 0 && form === null
				? h("div", { className: "dshm-group" }, h(EmptyCard, { icon: "tray", text: t("conn.empty") }))
				: h("div", { className: "dshm-group" }, connections.map(connRow))),

		form !== null ? h(Sheet, {
			label: form.editing === null ? t("sheet.add") : t("sheet.edit"),
			onClose: () => setForm(null),
		},
			h("div", { className: "dshm-sheet-head" },
				h("div", { className: "dshm-sheet-title" }, form.editing === null ? t("sheet.add") : t("sheet.edit")),
				h("div", { className: "dshm-sheet-sub" }, t("sheet.sub"))),
			h("div", { className: "dshm-sheet-body" },
				h("div", { className: "dshm-field-grid" },
					formField("alias", "conn.alias", t("conn.alias.ph"), { disabled: form.editing !== null }),
					formField("ip", "conn.ip", "192.168.1.10")),
				h("div", { className: "dshm-field-grid" },
					formField("port", "conn.port", "22"),
					formField("user", "conn.user", "root")),
				formField("password", "conn.password", form.editing === null ? "••••••••" : t("conn.password.keep"), {
					type: form.editing === null ? "text" : "password",
					autoComplete: "new-password",
				}),
				formField("workspace", "conn.workspace", "/Users/you/project")),
			h("div", { className: "dshm-sheet-foot" },
				h(Btn, { onClick: () => setForm(null) }, t("conn.cancel")),
				h(Btn, { variant: "filled", wide: true, onClick: () => saveForm() }, t("conn.save")))) : null,

		confirmAlias !== null ? h(Sheet, {
			small: true, alert: true, dismissOnScrim: false,
			label: t("alert.deleteTitle").replace("%s", confirmAlias),
			onClose: () => setConfirmAlias(null),
		},
			h("div", { className: "dshm-alert-ico" }, h(Ico, { name: "trash", size: 18 })),
			h("div", { className: "dshm-alert-title" }, t("alert.deleteTitle").replace("%s", confirmAlias)),
			h("div", { className: "dshm-alert-msg" }, t("alert.deleteMsg")),
			h("div", { className: "dshm-alert-foot" },
				h(Btn, { wide: true, onClick: () => setConfirmAlias(null) }, t("conn.cancel")),
				h(Btn, { variant: "destructive", wide: true, onClick: () => deleteConnection(confirmAlias) }, t("alert.delete")))) : null);
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
