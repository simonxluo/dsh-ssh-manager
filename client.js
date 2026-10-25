// dsh-ssh-manager — Client half: the「SSH 管理」settings section.
//
// Three seats share one data plane (panel GET + probe/stats POST):
//   - settings.section: the management page (Apple-style inset lists).
//   - sidebar.panellist icon + main keyed slot: the embedded main panel.
//   - sidebar.right.pane.tab / .title + a sidebarRightTabs type: a compact
//    「SSH」tab in the right sidebar, opened from the Start guide card,
//     with inline per-host machine info (dshm-s-* styles).
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
	"action.info": "Machine info",
	"info.title": "Machine info",
	"info.sub": "Live usage snapshot collected over SSH.",
	"info.loading": "Collecting machine info…",
	"info.refresh": "Refresh",
	"info.close": "Close",
	"info.cpu": "CPU",
	"info.mem": "Memory",
	"info.disk": "Disk (/)",
	"info.swap": "Swap",
	"info.os": "Operating system",
	"info.kernel": "Kernel",
	"info.hostname": "Hostname",
	"info.cores": "CPU cores",
	"info.load": "Load (1/5/15 min)",
	"info.uptime": "Uptime",
	"info.collected": "Collected",
	"info.error": "Could not collect machine info: ",
	"info.na": "unavailable",
	"fmt.day": "d",
	"fmt.hour": "h",
	"fmt.min": "m",
	"side.title": "SSH",
	"side.guide.title": "SSH hosts",
	"side.guide.sub": "Live status of your saved SSH hosts, right beside the conversation.",
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
	"action.info": "机器信息",
	"info.title": "机器信息",
	"info.sub": "经 SSH 实时采集的资源快照。",
	"info.loading": "正在采集机器信息…",
	"info.refresh": "刷新",
	"info.close": "关闭",
	"info.cpu": "CPU",
	"info.mem": "内存",
	"info.disk": "磁盘 (/)",
	"info.swap": "交换分区",
	"info.os": "操作系统",
	"info.kernel": "内核",
	"info.hostname": "主机名",
	"info.cores": "CPU 核心数",
	"info.load": "负载（1/5/15 分钟）",
	"info.uptime": "已运行",
	"info.collected": "采集时间",
	"info.error": "机器信息采集失败：",
	"info.na": "暂不可用",
	"fmt.day": " 天",
	"fmt.hour": " 小时",
	"fmt.min": " 分钟",
	"side.title": "SSH",
	"side.guide.title": "SSH 主机",
	"side.guide.sub": "在对话旁边实时查看已保存主机的连通与负载。",
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
	"action.info": "マシン情報",
	"info.title": "マシン情報",
	"info.sub": "SSH 経由で収集したリアルタイムスナップショット。",
	"info.loading": "マシン情報を収集中…",
	"info.refresh": "更新",
	"info.close": "閉じる",
	"info.cpu": "CPU",
	"info.mem": "メモリ",
	"info.disk": "ディスク (/)",
	"info.swap": "スワップ",
	"info.os": "OS",
	"info.kernel": "カーネル",
	"info.hostname": "ホスト名",
	"info.cores": "CPU コア数",
	"info.load": "負荷（1/5/15 分）",
	"info.uptime": "稼働時間",
	"info.collected": "取得時刻",
	"info.error": "マシン情報の収集に失敗：",
	"info.na": "利用不可",
	"fmt.day": "日",
	"fmt.hour": "時間",
	"fmt.min": "分",
	"side.title": "SSH",
	"side.guide.title": "SSH ホスト",
	"side.guide.sub": "会話の横で保存済みホストの状態と負荷をリアルタイム確認。",
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
	"action.info": "Info de la máquina",
	"info.title": "Info de la máquina",
	"info.sub": "Instantánea de uso recopilada por SSH.",
	"info.loading": "Recopilando información…",
	"info.refresh": "Actualizar",
	"info.close": "Cerrar",
	"info.cpu": "CPU",
	"info.mem": "Memoria",
	"info.disk": "Disco (/)",
	"info.swap": "Intercambio",
	"info.os": "Sistema operativo",
	"info.kernel": "Kernel",
	"info.hostname": "Nombre de host",
	"info.cores": "Núcleos de CPU",
	"info.load": "Carga (1/5/15 min)",
	"info.uptime": "Tiempo activo",
	"info.collected": "Recopilado",
	"info.error": "No se pudo recopilar la información: ",
	"info.na": "no disponible",
	"fmt.day": " d",
	"fmt.hour": " h",
	"fmt.min": " min",
	"side.title": "SSH",
	"side.guide.title": "Hosts SSH",
	"side.guide.sub": "Estado en vivo de tus hosts SSH, junto a la conversación.",
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

/** Redraw hooks set by mounted sections; language switches re-render through
 * them. A Set (not one callback) because the settings section and the main
 * panel can be mounted at the same time. */
var relocalizeHooks = new Set();

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
		for (const redraw of relocalizeHooks) {
			try { redraw(); } catch { /* a failed redraw must not break the subscription chain */ }
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
.dshm-root{display:flex;flex-direction:column;gap:18px;font-variant-numeric:tabular-nums}
.dshm-head{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;flex-wrap:wrap}
.dshm-title{font-size:22px;font-weight:700;letter-spacing:-.021em;line-height:1.2}
.dshm-subtitle{font-size:12.5px;color:var(--dsw-alias-label-tertiary);margin-top:3px;line-height:1.45}
.dshm-toolbar{display:flex;align-items:center;gap:8px}
.dshm-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:5px 13px;font-size:12.5px;font-weight:600;border-radius:8px;cursor:pointer;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-primary);transition:background .16s,color .16s,border-color .16s,transform .08s,opacity .16s;user-select:none;white-space:nowrap;line-height:1.4}
.dshm-btn:active:not(:disabled){transform:scale(.97);opacity:.8}
.dshm-btn:disabled{opacity:.4;cursor:default}
.dshm-btn:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-business-primary) 32%,transparent)}
.dshm-btn--sm{padding:3px 10px;font-size:12px;border-radius:7px}
.dshm-btn--icon{padding:4px 7px}
.dshm-btn--plain:hover:not(:disabled){background:rgba(120,120,128,.12);background:color-mix(in srgb,var(--dsw-alias-label-primary) 9%,transparent)}
.dshm-btn--tinted{background:rgba(120,120,128,.14);background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 13%,transparent);color:var(--dsw-alias-state-business-primary)}
.dshm-btn--tinted:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 20%,transparent)}
.dshm-btn--filled{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground,#fff)}
.dshm-btn--filled:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
.dshm-btn--danger{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 13%,transparent);color:var(--dsw-alias-state-error-primary)}
.dshm-btn--danger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 20%,transparent)}
.dshm-btn--destructive{background:var(--dsw-alias-state-error-primary);color:#fff}
.dshm-btn--destructive:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 85%,#000)}
.dshm-btn.is-done{color:var(--dsw-alias-state-success-primary)}
.dshm-btn--wide{min-width:76px}
.dshm-spin{width:11px;height:11px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:dsh-ssh-spin .7s linear infinite;flex:0 0 auto}
.dshm-ico{flex:0 0 auto;display:block}
.dshm-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
.dshm-stat{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:10px 14px 11px;display:flex;flex-direction:column;gap:3px;min-width:0}
.dshm-stat-num{font-size:19px;font-weight:600;letter-spacing:-.01em;line-height:1.15;display:flex;align-items:center;gap:6px}
.dshm-stat-label{font-size:11.5px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dshm-sec{display:flex;flex-direction:column;gap:8px}
.dshm-sec-head{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:26px}
.dshm-sec-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-tertiary);text-transform:uppercase;letter-spacing:.05em}
.dshm-group{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;overflow:hidden}
.dshm-row{position:relative;display:flex;align-items:center;gap:12px;padding:9px 14px;min-height:52px}
.dshm-row + .dshm-row::before{content:"";position:absolute;top:0;left:42px;right:0;height:1px;background:var(--dsw-alias-border-l2)}
.dshm-row:hover{background:rgba(120,120,128,.05);background:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent)}
.dshm-dot{width:9px;height:9px;border-radius:50%;flex:0 0 auto}
.dshm-dot--ok{background:var(--dsw-alias-state-success-primary)}
.dshm-dot--warn{background:var(--dsw-alias-state-warn-primary)}
.dshm-dot--fail{background:var(--dsw-alias-state-error-primary)}
.dshm-dot--unknown{background:color-mix(in srgb,var(--dsw-alias-label-primary) 30%,transparent)}
.dshm-dot--probing{background:var(--dsw-alias-state-business-primary);animation:dsh-ssh-pulse 1.1s ease-in-out infinite}
.dshm-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:1.5px}
.dshm-name{font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshm-detail{font-size:12px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:6px;min-width:0}
.dshm-sep{opacity:.45;flex:0 0 auto}
.dshm-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px}
.dshm-side{display:flex;align-items:center;gap:6px;flex:0 0 auto}
.dshm-status{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.dshm-status--ok{color:var(--dsw-alias-state-success-primary)}
.dshm-status--fail{color:var(--dsw-alias-state-error-primary)}
.dshm-chip{display:inline-flex;align-items:center;padding:1.5px 9px;font-size:11px;font-weight:500;border-radius:999px;border:1px solid transparent;white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis}
.dshm-chip--ok{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 13%,transparent);color:var(--dsw-alias-state-success-primary)}
.dshm-chip--warn{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 15%,transparent);color:var(--dsw-alias-state-warn-primary)}
.dshm-chip--dim{background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);color:var(--dsw-alias-label-tertiary)}
.dshm-empty{padding:26px 18px;display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--dsw-alias-label-tertiary);font-size:12.5px;text-align:center}
.dshm-empty .dshm-ico{opacity:.45}
.dshm-error{display:flex;gap:9px;align-items:flex-start;padding:10px 13px;border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);color:var(--dsw-alias-state-error-primary);font-size:12.5px;line-height:1.5;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 22%,transparent)}
.dshm-error .dshm-ico{margin-top:1px}
.dshm-scrim{position:fixed;inset:0;z-index:2147483000;background:var(--dsw-alias-bg-mask-3,rgba(0,0,0,.32));backdrop-filter:blur(16px) saturate(170%);-webkit-backdrop-filter:blur(16px) saturate(170%);display:flex;align-items:center;justify-content:center;padding:22px;animation:dsh-ssh-fade .2s ease}
.dshm-sheet{width:min(440px,100%);max-height:min(86vh,640px);overflow:auto;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:14px;box-shadow:var(--dsw-elevation-prominent,0 20px 60px rgba(0,0,0,.35));animation:dsh-ssh-sheet-in .3s cubic-bezier(.32,.72,0,1);display:flex;flex-direction:column}
.dshm-sheet--small{width:min(330px,100%)}
.dshm-sheet-head{padding:18px 20px 4px;display:flex;flex-direction:column;gap:3px}
.dshm-sheet-title{font-size:15.5px;font-weight:700;letter-spacing:-.012em}
.dshm-sheet-sub{font-size:12px;color:var(--dsw-alias-label-tertiary);line-height:1.5}
.dshm-sheet-body{padding:14px 20px 16px;display:flex;flex-direction:column;gap:13px}
.dshm-sheet-foot{display:flex;justify-content:flex-end;gap:8px;padding:11px 14px;border-top:1px solid var(--dsw-alias-border-l2)}
.dshm-field{display:flex;flex-direction:column;gap:5px;min-width:0}
.dshm-field-label{font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-tertiary);letter-spacing:.01em}
.dshm-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.dshm-input{width:100%;box-sizing:border-box;padding:6px 11px;font-size:12.5px;border-radius:8px;border:1px solid transparent;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);transition:border-color .16s,box-shadow .16s;font-family:inherit}
.dshm-input::placeholder{color:var(--dsw-alias-label-tertiary);opacity:.7}
.dshm-input:focus{outline:none;border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-business-primary) 25%,transparent)}
.dshm-input:disabled{opacity:.5}
.dshm-alert-ico{width:40px;height:40px;border-radius:50%;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 13%,transparent);color:var(--dsw-alias-state-error-primary);display:flex;align-items:center;justify-content:center;margin:18px auto 11px}
.dshm-alert-title{font-size:13.5px;font-weight:700;padding:0 18px;letter-spacing:-.01em;text-align:center}
.dshm-alert-msg{font-size:12px;color:var(--dsw-alias-label-tertiary);line-height:1.55;padding:6px 20px 0;max-width:280px;margin:0 auto;text-align:center}
.dshm-alert-foot{display:flex;justify-content:center;gap:10px;padding:16px 16px 18px;width:100%;box-sizing:border-box}
.dshm-info-loading{display:flex;align-items:center;justify-content:center;gap:9px;padding:28px 0 24px;color:var(--dsw-alias-label-tertiary);font-size:12.5px}
.dshm-info-loading .dshm-spin{width:13px;height:13px;border-width:2px}
.dshm-meter-row{display:flex;flex-direction:column;gap:6px;min-width:0}
.dshm-meter-top{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.dshm-meter-name{font-size:12px;font-weight:600;white-space:nowrap}
.dshm-meter-val{font-size:11.5px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dshm-meter{height:6px;border-radius:3px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent);overflow:hidden;flex:0 0 auto}
.dshm-meter>i{display:block;height:100%;border-radius:inherit;background:var(--dsw-alias-state-business-primary);transition:width .5s cubic-bezier(.32,.72,0,1)}
.dshm-meter--warn>i{background:var(--dsw-alias-state-warn-primary)}
.dshm-meter--error>i{background:var(--dsw-alias-state-error-primary)}
.dshm-kv{display:flex;align-items:baseline;justify-content:space-between;gap:14px;padding:7.5px 14px;font-size:12px}
.dshm-kv+.dshm-kv{border-top:1px solid var(--dsw-alias-border-l2)}
.dshm-kv-k{color:var(--dsw-alias-label-tertiary);flex:0 0 auto}
.dshm-kv-v{font-weight:500;text-align:right;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* ---- 右侧栏紧凑视图（dshm-s-*）：容器 .tabBody 为 flex 列 + overflow:hidden，根节点自行滚动 ---- */
.dshm-s-root{flex:1 1 auto;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding:12px 12px 16px;font-variant-numeric:tabular-nums}
.dshm-s-head{display:flex;align-items:center;gap:7px;flex:0 0 auto}
.dshm-s-title{font-size:12.5px;font-weight:650;letter-spacing:-.01em;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshm-s-badge{font-size:11px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;font-variant-numeric:tabular-nums}
.dshm-s-seclabel{font-size:10px;font-weight:650;letter-spacing:.07em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary);padding:0 2px;flex:0 0 auto}
.dshm-s-group{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:11px;overflow:hidden}
.dshm-s-item + .dshm-s-item{border-top:1px solid var(--dsw-alias-border-l2)}
.dshm-s-row{display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;min-height:38px;box-sizing:border-box;cursor:pointer;background:transparent;border:none;text-align:inherit;color:inherit;font:inherit;transition:background .15s}
.dshm-s-row:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent)}
.dshm-s-row[aria-expanded="true"]{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 8%,transparent)}
.dshm-s-row:focus-visible{outline:none;box-shadow:inset 0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-business-primary) 32%,transparent)}
.dshm-s-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:1px}
.dshm-s-name{font-size:12.5px;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshm-s-sub{font-size:10.5px;color:var(--dsw-alias-label-tertiary);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshm-s-status{font-size:11px;white-space:nowrap;color:var(--dsw-alias-label-tertiary);flex:0 0 auto;font-variant-numeric:tabular-nums}
.dshm-s-status--ok{color:var(--dsw-alias-state-success-primary)}
.dshm-s-status--fail{color:var(--dsw-alias-state-error-primary)}
.dshm-s-info{padding:9px 11px 11px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 3.5%,transparent);display:flex;flex-direction:column;gap:9px;animation:dsh-ssh-fade .2s ease}
.dshm-s-info-head{display:flex;align-items:center;gap:8px;min-width:0}
.dshm-s-info-meta{font-size:10.5px;color:var(--dsw-alias-label-tertiary);line-height:1.55;overflow-wrap:anywhere}
.dshm-s-info .dshm-meter-name{font-size:11px}
.dshm-s-info .dshm-meter-val{font-size:10.5px}
.dshm-s-info .dshm-meter{height:5px}
.dshm-s-info .dshm-error{padding:7px 10px;font-size:11px;border-radius:8px}
.dshm-s-info .dshm-info-loading{padding:14px 0 10px;font-size:11.5px}
.dshm-s-empty{padding:20px 12px;display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--dsw-alias-label-tertiary);font-size:11.5px;text-align:center}
.dshm-s-empty .dshm-ico{opacity:.45}
.dshm-s-error{font-size:11.5px;padding:8px 11px;border-radius:9px}
.dshm-s-chip{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
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
		case "terminal": return h("svg", { ...common, strokeWidth: 1.5 },
			h("rect", { x: 2.2, y: 3.2, width: 11.6, height: 9.6, rx: 1.8 }),
			h("path", { d: "M5 6.6l1.9 1.9L5 10.4" }),
			h("path", { d: "M8.7 10.5h2.9" }));
		case "info": return h("svg", { ...common, strokeWidth: 1.4 },
			h("circle", { cx: 8, cy: 8, r: 6.3 }),
			h("path", { d: "M8 7.4v3.2" }),
			h("path", { d: "M8 5v.01" }));
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
			const selector = props.alert === true ? "button" : "input, select, textarea, button";
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

// ---- 机器信息 sheet（行右侧 ⓘ 按钮 → SSH 快照） ----

/** kB → 自适应二进制单位（KiB/MiB/GiB/TiB）。 */
function fmtKb(kb) {
	if (typeof kb !== "number" || !isFinite(kb) || kb < 0) return "—";
	const units = ["KiB", "MiB", "GiB", "TiB"];
	let v = kb;
	let u = 0;
	while (v >= 1024 && u < units.length - 1) { v /= 1024; u += 1; }
	const text = v >= 100 ? String(Math.round(v)) : v >= 10 ? String(Math.round(v * 10) / 10) : String(Math.round(v * 100) / 100);
	return text + " " + units[u];
}

/** 秒 → 「205 天 7 小时」样式；各语言单位来自 fmt.* 词条。 */
function fmtUptime(seconds) {
	if (typeof seconds !== "number" || !isFinite(seconds) || seconds < 0) return t("info.na");
	const d = Math.floor(seconds / 86400);
	const h = Math.floor((seconds % 86400) / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	if (d > 0) return d + t("fmt.day") + (h > 0 ? " " + h + t("fmt.hour") : "");
	if (h > 0) return h + t("fmt.hour") + (m > 0 ? " " + m + t("fmt.min") : "");
	return m + t("fmt.min");
}

/** 进度仪表条：60% 起 warn、85% 起 error，缺数据显示 0 宽度 + unavailable。 */
function Meter(props) {
	const pct = typeof props.pct === "number" && isFinite(props.pct) ? Math.max(0, Math.min(100, props.pct)) : null;
	const cls = "dshm-meter" + (pct === null ? "" : pct >= 85 ? " dshm-meter--error" : pct >= 60 ? " dshm-meter--warn" : "");
	return h("div", { className: "dshm-meter-row" },
		h("div", { className: "dshm-meter-top" },
			h("span", { className: "dshm-meter-name" }, props.label),
			h("span", { className: "dshm-meter-val" }, props.value)),
		h("div", { className: cls, role: "img", "aria-label": props.label + " " + (pct === null ? t("info.na") : pct + "%") },
			h("i", { style: { width: (pct === null ? 0 : pct) + "%" } })));
}

/** 分组列表里的 key-value 行。 */
function KV(key, value) {
	return h("div", { className: "dshm-kv" },
		h("span", { className: "dshm-kv-k" }, key),
		h("span", { className: "dshm-kv-v", title: String(value) }, value));
}

/**
 * 机器信息子窗口：挂载即采集一次，页脚可手动刷新；数据来自面板
 * {action:'stats'}（目标为别名或 conn:别名），失败展示原因并保留旧数据。
 */
function InfoSheet(props) {
	const [data, setData] = useState(undefined);
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const alive = useRef(true);
	useEffect(() => () => { alive.current = false; }, []);
	const run = useCallback(async () => {
		setBusy(true);
		setError("");
		try {
			const value = await api("stats", { target: props.target });
			if (!alive.current) return;
			if (value && value.ok === false) setError(String(value.error || "unknown error"));
			else setData(value);
		} catch (err) {
			if (alive.current) setError(String(err && err.message ? err.message : err));
		} finally {
			if (alive.current) setBusy(false);
		}
	}, [props.target]);
	useEffect(() => { run(); }, [run]);

	const na = t("info.na");
	const d = data;
	const usedText = (view) => view && typeof view.usedPct === "number"
		? view.usedPct + "% · " + fmtKb(view.usedKb) + " / " + fmtKb(view.totalKb)
		: na;
	const body = d === undefined ? null : h(React.Fragment, null,
		h("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } },
			h(Meter, { label: t("info.cpu"), pct: d.cpuPct, value: typeof d.cpuPct === "number" ? d.cpuPct + "%" : na }),
			h(Meter, { label: t("info.mem"), pct: d.mem ? d.mem.usedPct : null, value: usedText(d.mem) }),
			d.swap && d.swap.totalKb > 0
				? h(Meter, { label: t("info.swap"), pct: d.swap.usedPct, value: usedText(d.swap) })
				: null,
			h(Meter, { label: t("info.disk"), pct: d.disk ? d.disk.usedPct : null, value: usedText(d.disk) })),
		h("div", { className: "dshm-group" },
			KV(t("info.os"), d.os || na),
			KV(t("info.kernel"), d.kernel || na),
			KV(t("info.hostname"), d.hostname || na),
			KV(t("info.cores"), typeof d.cores === "number" ? String(d.cores) : na),
			KV(t("info.load"), d.load ? d.load.map(v => (typeof v === "number" ? v.toFixed(2) : "?")).join(" / ") : na),
			KV(t("info.uptime"), fmtUptime(d.uptimeS)),
			KV(t("info.collected"), new Date(d.at).toLocaleTimeString())));

	return h(Sheet, { label: t("info.title"), onClose: props.onClose },
		h("div", { className: "dshm-sheet-head" },
			h("div", { className: "dshm-sheet-title" }, props.alias),
			h("div", { className: "dshm-sheet-sub" }, props.endpoint + " · " + t("info.sub"))),
		h("div", { className: "dshm-sheet-body" },
			error !== "" ? h("div", { className: "dshm-error", role: "alert" },
				h(Ico, { name: "warn", size: 14 }),
				h("span", null, t("info.error") + error)) : null,
			d === undefined && error === ""
				? h("div", { className: "dshm-info-loading" }, h("span", { className: "dshm-spin" }), t("info.loading"))
				: null,
			body),
		h("div", { className: "dshm-sheet-foot" },
			h(Btn, { onClick: props.onClose }, t("info.close")),
			h(Btn, { variant: "filled", wide: true, onClick: () => run() }, t("info.refresh"))));
}

// ---- 右侧栏「SSH」标签页（sidebar.right.pane.tab / .title） ----

/** 右侧栏标签页身份：类型注册 id 同时是 body/title 两个 keyed 插槽的 key。 */
const SIDE_ID = "dsh-ssh-manager/sidebar";
/** 页类型 kind（openTab 的判别值，右侧栏按 sidebar://<kind> 记账）。 */
const SIDE_KIND = "ssh-manager";

/**
 * Guide（Start）卡片图标：宿主 EntryBox 以 `<Icon size className>` 调用，
 * 约定与官方 terminal 标签页一致；线性终端图形，currentColor 走主题。
 */
function SideGuideIcon(props) {
	const size = (props && props.size) || 22;
	return h("svg", {
		width: size, height: size, viewBox: "0 0 24 24", fill: "none",
		"aria-hidden": true, className: (props && props.className) || undefined,
	},
		h("rect", { x: 2.75, y: 4.25, width: 18.5, height: 15.5, rx: 2.75, stroke: "currentColor", strokeWidth: 1.6 }),
		h("path", { d: "M6.75 9.25l2.9 2.75-2.9 2.75", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" }),
		h("path", { d: "M12.25 14.75h4.9", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" }));
}

/** 标签 chip 标题：终端图标 + 「SSH」（语言切换时随 relocalize 重渲染）。 */
function SshSideTitle(props) {
	return h(React.Fragment, null,
		h(Ico, { name: "terminal", size: 13 }),
		h("span", { className: "dshm-s-chip" }, t("side.title")));
}

/**
 * 行内机器信息（展开区）：挂载即采集一次，可手动刷新；失败显示原因并
 * 保留旧数据。数据同 InfoSheet —— 面板 {action:'stats'}。
 */
function SideInfo(props) {
	const [data, setData] = useState(undefined);
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const alive = useRef(true);
	useEffect(() => () => { alive.current = false; }, []);
	const run = useCallback(async () => {
		setBusy(true);
		setError("");
		try {
			const value = await api("stats", { target: props.target });
			if (!alive.current) return;
			if (value && value.ok === false) setError(String(value.error || "unknown error"));
			else setData(value);
		} catch (err) {
			if (alive.current) setError(String(err && err.message ? err.message : err));
		} finally {
			if (alive.current) setBusy(false);
		}
	}, [props.target]);
	useEffect(() => { run(); }, [run]);

	const na = t("info.na");
	const d = data;
	const usedText = (view) => view && typeof view.usedPct === "number"
		? view.usedPct + "% · " + fmtKb(view.usedKb) + " / " + fmtKb(view.totalKb)
		: na;
	return h("div", { className: "dshm-s-info" },
		h("div", { className: "dshm-s-info-head" },
			h("span", { className: "dshm-s-sub", style: { flex: "1 1 auto", minWidth: 0 }, title: props.endpoint }, props.endpoint),
			h(Btn, {
				size: "sm", variant: "plain", iconOnly: true, onClick: () => run(), disabled: busy,
				title: t("info.refresh"), ariaLabel: t("info.refresh"),
			}, busy ? h("span", { className: "dshm-spin" }) : h(Ico, { name: "refresh", size: 12 }))),
		error !== "" ? h("div", { className: "dshm-error", role: "alert" },
			h(Ico, { name: "warn", size: 12 }),
			h("span", null, t("info.error") + error)) : null,
		d === undefined && error === ""
			? h("div", { className: "dshm-info-loading" }, h("span", { className: "dshm-spin" }), t("info.loading"))
			: null,
		d === undefined ? null : h(React.Fragment, null,
			h(Meter, { label: t("info.cpu"), pct: d.cpuPct, value: typeof d.cpuPct === "number" ? d.cpuPct + "%" : na }),
			h(Meter, { label: t("info.mem"), pct: d.mem ? d.mem.usedPct : null, value: usedText(d.mem) }),
			d.swap && d.swap.totalKb > 0
				? h(Meter, { label: t("info.swap"), pct: d.swap.usedPct, value: usedText(d.swap) })
				: null,
			h(Meter, { label: t("info.disk"), pct: d.disk ? d.disk.usedPct : null, value: usedText(d.disk) }),
			h("div", { className: "dshm-s-info-meta" },
				(d.os ? d.os + " · " : "") + fmtUptime(d.uptimeS) + " · " + t("info.collected") + " " + new Date(d.at).toLocaleTimeString())));
}

/**
 * 右侧栏标签页 body：紧凑主机列表（状态点 + 延迟），行点击展开行内机器
 * 信息；头部为可达数 + 刷新 + 全部探测。数据与主面板同源（面板 GET +
 * probe/stats POST），挂载加载一次，此后每 RESCAN_MS 自动探测。
 */
function SshSideTab(props) {
	const [, setLangTick] = useState(0);
	const [hosts, setHosts] = useState(null);
	const [connections, setConnections] = useState([]);
	const [probed, setProbed] = useState({});
	const [probing, setProbing] = useState(false);
	const [error, setError] = useState("");
	const [open, setOpen] = useState(null);
	const alive = useRef(true);
	const probeRef = useRef(null);
	useEffect(() => () => { alive.current = false; }, []);
	useEffect(() => {
		const redraw = () => setLangTick((v) => v + 1);
		relocalizeHooks.add(redraw);
		return () => { relocalizeHooks.delete(redraw); };
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
	const hostItems = hostList.map((item) => ({
		key: item.alias, alias: item.alias, target: item.alias,
		sub: item.user + "@" + item.url,
	}));
	const connItems = connections.map((item) => ({
		key: "conn:" + item.alias, alias: item.alias, target: "conn:" + item.alias,
		sub: item.user + "@" + item.ip + (item.port && item.port !== 22 ? ":" + item.port : ""),
	}));
	const total = hostItems.length + connItems.length;
	const okTotal = hostItems.concat(connItems)
		.reduce((n, it) => (statusOf(it.key).kind === "ok" ? n + 1 : n), 0);

	const statusLabel = (s) => s.kind === "ok"
		? (typeof s.latencyMs === "number" ? s.latencyMs + " " + t("ms") : t("status.ok"))
		: s.kind === "probing" ? t("status.probing")
		: s.kind === "fail" ? t("status.fail")
		: "—";

	const row = (it) => {
		const s = statusOf(it.key);
		const expanded = open !== null && open.target === it.target;
		return h("div", { key: it.key, className: "dshm-s-item" },
			h("button", {
				type: "button",
				className: "dshm-s-row",
				"aria-expanded": expanded ? "true" : "false",
				title: s.kind === "fail" ? (s.error || t("status.fail")) : it.sub,
				onClick: () => setOpen((prev) => (prev !== null && prev.target === it.target ? null : { target: it.target, endpoint: it.sub })),
			},
				h(Dot, { kind: s.kind }),
				h("span", { className: "dshm-s-main" },
					h("span", { className: "dshm-s-name" }, it.alias),
					h("span", { className: "dshm-s-sub dshm-mono" }, it.sub)),
				h("span", { className: "dshm-s-status" + (s.kind === "ok" ? " dshm-s-status--ok" : s.kind === "fail" ? " dshm-s-status--fail" : "") },
					statusLabel(s)),
				h(Ico, { name: "info", size: 12 })),
			expanded ? h(SideInfo, { key: it.target, target: it.target, endpoint: it.sub }) : null);
	};

	return h("div", { className: "dshm-s-root" },
		h("style", null, STYLE_CSS),
		h("div", { className: "dshm-s-head" },
			h("span", { className: "dshm-s-title" }, t("side.guide.title")),
			total > 0 ? h("span", { className: "dshm-s-badge" }, okTotal + "/" + total + " " + t("stat.reachable")) : null,
			h(Btn, {
				size: "sm", variant: "plain", iconOnly: true, onClick: () => load(),
				title: t("action.refresh"), ariaLabel: t("action.refresh"),
			}, h(Ico, { name: "refresh", size: 13 })),
			h(Btn, {
				size: "sm", variant: "plain", iconOnly: true, onClick: () => probeAll(), disabled: probing,
				title: t("action.probeAll"), ariaLabel: t("action.probeAll"),
			}, probing ? h("span", { className: "dshm-spin" }) : h(Ico, { name: "probe", size: 12 }))),

		error !== "" ? h("div", { className: "dshm-error dshm-s-error", role: "alert" },
			h(Ico, { name: "warn", size: 13 }),
			h("span", null, error)) : null,

		hosts === null
			? h("div", { className: "dshm-s-group" }, h("div", { className: "dshm-s-empty" }, "…"))
			: total === 0
				? h("div", { className: "dshm-s-group" },
					h("div", { className: "dshm-s-empty" },
						h(Ico, { name: "tray", size: 20 }),
						h("span", null, t("empty"))))
				: h(React.Fragment, null,
					hostItems.length > 0 ? h(React.Fragment, null,
						h("span", { className: "dshm-s-seclabel" }, t("sec.keyhosts")),
						h("div", { className: "dshm-s-group" }, hostItems.map(row))) : null,
					connItems.length > 0 ? h(React.Fragment, null,
						h("span", { className: "dshm-s-seclabel" }, t("sec.conns")),
						h("div", { className: "dshm-s-group" }, connItems.map(row))) : null));
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
	const [infoTarget, setInfoTarget] = useState(null);
	const alive = useRef(true);
	const probeRef = useRef(null);
	useEffect(() => () => { alive.current = false; }, []);
	useEffect(() => {
		const redraw = () => setLangTick((v) => v + 1);
		relocalizeHooks.add(redraw);
		return () => { relocalizeHooks.delete(redraw); };
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
				}, h(Ico, { name: "probe", size: 11 })),
				h(Btn, {
					size: "sm", variant: "plain", iconOnly: true,
					onClick: () => setInfoTarget({ target: item.alias, alias: item.alias, endpoint: item.user + "@" + item.url }),
					title: t("action.info"), ariaLabel: t("action.info"),
				}, h(Ico, { name: "info", size: 13 }))));
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
				}, h(Ico, { name: "trash", size: 12 })),
				h(Btn, {
					size: "sm", variant: "plain", iconOnly: true,
					onClick: () => setInfoTarget({
						target: key, alias: item.alias,
						endpoint: item.user + "@" + item.ip + (item.port && item.port !== 22 ? ":" + item.port : ""),
					}),
					title: t("action.info"), ariaLabel: t("action.info"),
				}, h(Ico, { name: "info", size: 13 }))));
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
				h(Btn, { variant: "destructive", wide: true, onClick: () => deleteConnection(confirmAlias) }, t("alert.delete")))) : null,

		infoTarget !== null ? h(InfoSheet, {
			target: infoTarget.target,
			alias: infoTarget.alias,
			endpoint: infoTarget.endpoint,
			onClose: () => setInfoTarget(null),
		}) : null);
}


/**
 * 侧栏面板图标（sidebar.panellist）：宿主 PanelRow 本身就是按钮（min-height 36px、
 * padding 7px 8px），occupant 只需按 props.size（宽栏 16 / 窄栏 18）渲染纯图标。
 * 不能再套 36px 按钮——嵌套 button 属非法 HTML，且会把宿主行撑到 ~50px 导致
 * 侧栏各行高低不齐（v1.1.1 修复）。
 */
function PanelGlyph(props) {
	const size = (props && props.size) || 18;
	return h("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
		h("rect", { x: 2.75, y: 4.25, width: 18.5, height: 15.5, rx: 2.75, stroke: "currentColor", strokeWidth: 1.7 }),
		h("path", { d: "M6.75 9.25l2.9 2.75-2.9 2.75", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" }),
		h("path", { d: "M12.25 14.75h4.9", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" }));
}

/** 主面板视图：同一管理页组件，滚动容器 + 居中限宽排版。 */
function SshPanel() {
	return h("div", {
		style: {
			flex: 1, minHeight: 0, overflowY: "auto", boxSizing: "border-box",
			width: "100%", maxWidth: "880px", margin: "0 auto",
			padding: "20px 24px 30px",
		},
	}, h(SshManagerSection, {}));
}

/** 主面板 key 与 sidebar.panellist 的按钮 id（layout.selectPanel 的参数）。 */
const PANEL_ID = "ssh-manager";

function apply(ctx) {
	// Keep UI_LANG in step with the harness language for the plugin's whole
	// lifetime; sections re-render themselves through the relocalize hooks.
	ctx.effect(() => subscribeLocale(ctx));
	ctx.slots.inject("settings.section", () => ctx.slots.register({
		name: "settings.section",
		id: "dsh-ssh-manager",
		order: 46,
		label: () => t("nav.title"),
		inject: () => ({}),
	}, (props) => SshManagerSection(props, ctx)));

	// DSH 内嵌面板：侧栏图标 + main keyed slot，与设置页共用同一组件。
	ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
		name: "sidebar.panellist",
		id: PANEL_ID,
		order: 95,
		label: () => t("nav.title"),
	}, PanelGlyph));
	ctx.slots.inject("main", () => ctx.slots.register({
		name: "main",
		key: PANEL_ID,
	}, () => SshPanel()));

	// 右侧栏「SSH」标签页（sidebar.right.pane.tab / .title 两个 keyed 插槽，
	// key 必须等于类型注册的 id，宿主按 definition.id 派发）。插槽注册挂在
	// 宿主声明上：右侧栏未加载时静默等待，不影响设置页与主面板。
	ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
		name: "sidebar.right.pane.tab",
		key: SIDE_ID,
	}, (props) => SshSideTab(props)));
	ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register({
		name: "sidebar.right.pane.tab.title",
		key: SIDE_ID,
	}, SshSideTitle));

	// 标签「类型」注册（Start 卡片 → openTab(kind)）。sidebarRightTabs 是
	// 右侧栏插件的可选服务：经 ctx.get 探测，缺失时跳过（不声明为硬依赖，
	// 以免未来服务更名时整个插件被停用）。注册的清理挂在自身 fiber 上。
	const sideTabs = ctx.get("sidebarRightTabs");
	if (sideTabs && typeof sideTabs.register === "function") {
		ctx.effect(() => sideTabs.register({
			id: SIDE_ID,
			kind: SIDE_KIND,
			priority: "extension",
			title: () => t("side.title"),
			guide: [{
				id: "ssh",
				order: 60,
				title: () => t("side.guide.title"),
				description: () => t("side.guide.sub"),
				icon: SideGuideIcon,
			}],
		}), "dsh-ssh-manager: right-sidebar tab type");
	}
}

const inject = ["slots", "locale"];

exports.apply = apply;
exports.inject = inject;

return module.exports;
}});
