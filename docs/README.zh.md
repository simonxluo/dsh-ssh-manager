<div align="center">

<img src="../icon.svg" width="108" alt="dsh-ssh-manager"/>

# dsh-ssh-manager

**在 DeepSeek Harness 插件配置卡片中管理 SSH 身份密钥与按主机 ssh 配置。**

[![version](https://img.shields.io/badge/version-1.2.0-0071e3)](https://github.com/simonxluo/dsh-ssh-manager/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-34c759)](https://github.com/simonxluo/dsh-ssh-manager/blob/main/LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek_Harness-%E2%89%A5_0.2.1--rc.1-8957e5)](https://github.com/simonxluo/dsh-ssh-manager)
[![platform](https://img.shields.io/badge/platform-macOS_%7C_Linux-8E8E93)](https://github.com/simonxluo/dsh-ssh-manager)

🇬🇧 [English](../README.md) · 🇨🇳 **简体中文** · 🇯🇵 [日本語](README.ja.md) · 🇪🇸 [Español](README.es.md)

</div>

---

## 目录

- [功能](#功能)
- [安装](#安装)
- [快速上手](#快速上手)
- [路线图](#路线图)
- [Architecture（DAG 图，英文）](../README.md#architecture)
- [致谢与许可证（英文）](../README.md#acknowledgments)

---

在 DSH 插件配置卡片中管理 SSH 身份密钥与按主机 ssh 配置——文件落盘到 `$DSH_HOME/.ssh`，agent 无需任何手工配置即可 `git clone git@host:repo`。

## 功能

- 卡片驱动：复用 0.2.x 内置插件配置表单，保存即热生效（volatile 配置），无需重启
- 完全隔离：所有产物都在 `$DSH_HOME/.ssh`；对 `~/.ssh` 的唯一写操作是幂等追加一行 `Include`
- 每主机落盘：`Host` 块（0600）、私钥（0600）、推导公钥 `.pub`（0644，`ssh-keygen -y`）
- **密码连接**：以 ip / 用户 / 密码创建连接（别名可选，缺省用 IP），可绑定工作区，在设置面板管理——密码仅首次输入时可见，之后只写不可查（0600 本地存储，API 永不回传）；以 TCP 探测连通性
- **Apple 风格设置页**：大标题、统计卡片与细分隔线的分组内嵌列表；新增/编辑以 sheet 子窗口呈现（焦点圈定 + Escape 关闭），删除走 alert 确认框——配色全部基于 `--dsw-alias-*` 主题 token
- **机器信息（ⓘ）**：每行右侧的信息按钮打开实时 SSH 快照——CPU / 内存 / 交换分区 / 磁盘仪表条（≥60% 转警示色、≥85% 转错误色）与负载、运行时间、系统、内核等参数；密钥主机走托管别名采集，密码连接经无秘密的 `SSH_ASKPASS` 助手（无需 sshpass），密码不经 argv、不落盘
- **内嵌面板**：管理页同时注册为侧栏一键切换的主面板（终端图标），与设置页共用同一组件
- **右侧栏标签页**：右侧栏的「SSH」标签，从 Start 卡片打开——紧凑主机列表（状态点 + 延迟）常驻对话旁；点击行内联展开机器信息（CPU / 内存 / 交换分区 / 磁盘仪表、运行时间、系统），可手动刷新
- **Agent 工具**：只读的 `ssh_list` / `ssh_search` 把托管清单（别名 · 地址/用户 · IP/端口 · 工作区，附探测缓存；绝不包含密钥与密码）暴露给助手——「我有哪些服务器」「按关键字找主机」无需翻文件即可回答；匹配为不区分大小写的包含式，空格分隔多关键字要求全部命中
- `autoInclude`：在 `~/.ssh/config` 的首个 `Host` 块前幂等插入一行 `Include`，普通 `ssh`/`git` 即可解析托管主机
- 自愈：幂等收敛、删除主机自动清理孤儿目录、非法条目跳过并告警

## 安装

```bash
dsh plugin --profile desktop add simonxluo/dsh-ssh-manager
# 或从本地克隆安装
dsh plugin --profile desktop add /path/to/dsh-ssh-manager
```

## 快速上手

设置 → 插件 → 插件配置 → SSH 管理：

```yaml
hosts:
  github-work:
    url: github.com
    user: git
    privateKey: |
      -----BEGIN OPENSSH PRIVATE KEY-----
      ...
    args: |
      ServerAliveInterval 30
autoInclude: true
```

## 路线图

- [x] 按主机连通性探测（探测按钮，TCP + SSH 握手）
- [x] 自定义 UI（Apple 风格设置页 + 内嵌主面板）
- [x] 每台主机实时机器信息（经 SSH 采集 CPU / 内存 / 磁盘）
- [x] 右侧栏「SSH」标签（Start 卡片 → 紧凑列表 + 行内机器信息）
- [ ] 一键导入既有 `~/.ssh/config`
- [ ] 卡片内直接生成密钥（`ed25519`），免粘贴
- [ ] `known_hosts` 管理（`ssh-keyscan`）
- [x] 面向 agent 的查询工具（`ssh_list` 清单 + `ssh_search` 模糊查找）

---

控制流 / 数据流 DAG 见 [Architecture（英文）](../README.md#architecture)；致谢与许可证见 [English README](../README.md#acknowledgments)。
