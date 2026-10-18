# dsh-ssh-manager

[中文](#中文) | [English](#english)

管理 SSH 身份密钥与按主机 ssh 配置，让 DeepSeek Harness（DSH）中的 agent 可以直接
`git clone git@host:user/repo`。本仓库是针对 **DSH 0.2.x 的原生重写**，与
[AndreasSeidl/dsh-ssh-manager](https://github.com/AndreasSeidl/dsh-ssh-manager) 0.3.0（面向 0.1.x，
依赖已移除的 `settingsScope` 客户端服务，在 0.2.x 上无法激活）用途相同的继任实现。

## 中文

### 工作方式

在 **设置 → 插件 → 插件配置 → SSH 管理** 卡片中编辑主机条目（无需自定义界面，直接使用
0.2.x 内置的插件配置表单，保存即热生效）：

```yaml
hosts:
  github.com:
    url: github.com        # HostName，真实连接的主机
    user: git              # ssh 用户（GitHub/GitLab 用 git）
    privateKey: |          # PEM 私钥原文（secret 字段，界面按需显示）
      -----BEGIN OPENSSH PRIVATE KEY-----
      ...
    args: |                # 额外 ssh 配置行，每行一条（ProxyJump / Port 等）
      ServerAliveInterval 30
autoInclude: true          # 自动在 ~/.ssh/config 追加一行 Include（默认开）
```

插件将其落盘为真实 SSH 文件（与你的 `~/.ssh` 隔离，互不干扰）：

```
$DSH_HOME/.ssh/                    （未设置 DSH_HOME 时为 ~/.dsh/.ssh）
  config                           托管 Include 区域（0600）
  config.d/<host>/config           该主机的 Host 块（0600）
  config.d/<host>/<host>           私钥（0600）
  config.d/<host>/<host>.pub       由 ssh-keygen 推导的公钥（0644，尽力而为）
```

`autoInclude` 开启且存在主机时，会向 `~/.ssh/config` 追加一行
`Include $DSH_HOME/.ssh/config`（保留原文件内容，幂等，可随时手动删除），
使普通 `ssh` / `git` 读取到托管的主机配置。

不认识的文件（known_hosts、手动放置的密钥等）一律保留不动；删除卡片中的主机会同步清理
对应的托管目录。无效条目（别名非法、缺 url、私钥不是 PEM 格式）会被跳过并记录告警。

### 安装

```bash
# 从本仓库（本地 clone 或 GitHub URL）
dsh plugin --profile desktop add /path/to/dsh-ssh-manager
# 或在 DSH 插件管理页通过自定义源安装
```

要求：DSH ≥ 0.2.1-rc.1（在 0.2.1-rc.2 桌面端验证），Node ≥ 22.19。

## English

### How it works

Edit host entries in **Settings → Plugins → Plugin configuration → SSH Manager**
(the built-in 0.2.x plugin-config form — no custom client, saves hot-apply):

```yaml
hosts:
  github.com:
    url: github.com        # HostName
    user: git
    privateKey: |          # PEM private key (secret field, masked in the UI)
      -----BEGIN OPENSSH PRIVATE KEY-----
      ...
    args: |                # extra ssh-config lines (ProxyJump, Port, ...)
      ServerAliveInterval 30
autoInclude: true          # append the Include line to ~/.ssh/config (default)
```

The plugin materializes them as real SSH files, isolated from your `~/.ssh`:

```
$DSH_HOME/.ssh/                    (~/.dsh/.ssh when DSH_HOME is unset)
  config                           flat file, managed Include region (0600)
  config.d/<host>/config           the Host block (0600)
  config.d/<host>/<host>           the private key (0600)
  config.d/<host>/<host>.pub       derived public key (0644, best-effort)
```

With `autoInclude` on and at least one host, it appends one
`Include $DSH_HOME/.ssh/config` line to `~/.ssh/config` (idempotent, preserves
existing content) so plain `ssh`/`git` picks the managed hosts up.

Unrecognized files are never touched; removing a host cleans up its managed
directory; invalid entries are skipped with a warning.

### Install

```bash
dsh plugin --profile desktop add /path/to/dsh-ssh-manager
```

Requires DSH ≥ 0.2.1-rc.1 (verified on 0.2.1-rc.2 desktop), Node ≥ 22.19.
