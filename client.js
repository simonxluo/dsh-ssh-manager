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
	"error.load": "Failed to load hosts: ",
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
	"error.load": "加载主机失败：",
	"key.has": "含托管密钥",
	"key.none": "无托管密钥",
	"ms": "毫秒",
};

/** The browser locale picks the dictionary; keys fall back to English. */
function makeT(locale) {
	const dict = String(locale ?? "").toLowerCase().startsWith("zh") ? zh : en;
	return (key) => dict[key] ?? en[key] ?? key;
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

function statusBadge(status, t) {
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
		return h("span", { style: Object.assign({}, style, { background: "rgba(239,68,68,.1)", color: "#dc2626" }), title: status.error || "" },
			h("span", { style: Object.assign({}, dot, { background: "#ef4444" }) }),
			t("status.fail"));
	}
	return h("span", { style: Object.assign({}, style, { background: "rgba(120,120,120,.12)", color: "inherit", opacity: 0.75 }) },
		h("span", { style: Object.assign({}, dot, { background: "currentColor", opacity: 0.5 }) }),
		t("status.unknown"));
}

function SshManagerSection(props, ctx) {
	const t = makeT(ctx && ctx.locale && ctx.locale.getLocale ? ctx.locale.getLocale().id : undefined);
	const [hosts, setHosts] = useState(null);
	const [probed, setProbed] = useState({});
	const [probing, setProbing] = useState(false);
	const [error, setError] = useState("");
	const alive = useRef(true);
	useEffect(() => () => { alive.current = false; }, []);

	const load = useCallback(async () => {
		try {
			const value = await api(undefined);
			if (!alive.current) return;
			setHosts(value.hosts);
			setProbed(value.probed || {});
			setError("");
		} catch (err) {
			if (alive.current) setError(String(err && err.message ? err.message : err));
		}
	}, []);

	const probeAll = useCallback(async () => {
		setProbing(true);
		// 乐观标记：全部进入 probing 视觉态。
		setProbed((prev) => {
			const next = Object.assign({}, prev);
			if (hosts) for (const item of hosts) next[item.alias] = "probing";
			return next;
		});
		try {
			const value = await api("probe");
			if (!alive.current) return;
			setProbed((prev) => Object.assign({}, prev, value.results));
		} catch (err) {
			if (alive.current) setError(String(err && err.message ? err.message : err));
		} finally {
			if (alive.current) setProbing(false);
		}
	}, [hosts]);

	useEffect(() => {
		(async () => {
			await load();
			if (alive.current) await probeAll();
		})();
		const timer = setInterval(() => { probeAll(); }, RESCAN_MS);
		return () => clearInterval(timer);
		// 仅挂载时启动：周期任务自己携带最新闭包状态。
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const th = { textAlign: "left", padding: "8px 12px", fontWeight: 600, fontSize: "13px", opacity: 0.75 };
	const td = { padding: "8px 12px", fontSize: "13px" };
	const row = { borderTop: "1px solid var(--dsh-border, rgba(128,128,128,.2))" };
	const button = {
		padding: "6px 14px",
		fontSize: "13px",
		borderRadius: "8px",
		cursor: "pointer",
		border: "1px solid var(--dsh-border, rgba(128,128,128,.35))",
		background: "transparent",
		color: "inherit",
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
		error ? h("div", { style: { color: "#dc2626", fontSize: "13px" } }, t("error.load"), error) : null,
		hosts === null ? h("div", { style: { opacity: 0.6, fontSize: "13px" } }, "…") :
		hosts.length === 0 ? h("div", { style: { opacity: 0.65, fontSize: "13px", padding: "16px 0" } }, t("empty")) :
		h("table", { style: { width: "100%", borderCollapse: "collapse" } },
			h("thead", null, h("tr", null,
				h("th", { style: th }, t("col.alias")),
				h("th", { style: th }, t("col.url")),
				h("th", { style: th }, t("col.user")),
				h("th", { style: th }, t("col.key")),
				h("th", { style: th }, t("col.status")))),
			h("tbody", null, hosts.map((item) => {
				const status = probed[item.alias];
				const ok = status && typeof status === "object" && status.ok === true;
				return h("tr", { key: item.alias, style: row },
					h("td", { style: Object.assign({}, td, { fontWeight: 600 }) }, item.alias),
					h("td", { style: td }, item.url || "—"),
					h("td", { style: td }, item.user || "—"),
					h("td", { style: td, title: item.hasKey ? t("key.has") : t("key.none") }, item.hasKey ? t("key.yes") : t("key.no")),
					h("td", { style: td },
						statusBadge(
							status === "probing" ? "probing"
								: status && typeof status === "object" ? (status.ok ? "ok" : status)
								: "unknown",
							t),
						ok && typeof status.latencyMs === "number"
							? h("span", { style: { marginLeft: "8px", fontSize: "12px", opacity: 0.6 } }, status.latencyMs + " " + t("ms"))
							: null));
			}))));
}

function apply(ctx) {
	ctx.slots.inject("settings.section", () => ctx.slots.register({
		name: "settings.section",
		id: "dsh-ssh-manager",
		order: 46,
		label: () => {
			const t = makeT(ctx.locale && ctx.locale.getLocale ? ctx.locale.getLocale().id : undefined);
			return t("nav.title");
		},
		inject: () => ({}),
	}, (props) => SshManagerSection(props, ctx)));
}

const inject = ["slots", "locale"];

exports.apply = apply;
exports.inject = inject;

return module.exports;
}});
