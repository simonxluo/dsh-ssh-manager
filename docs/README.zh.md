# dsh-ssh-manager

`v1.0.1` · MIT · DeepSeek Harness ≥ 0.2.1-rc.1

[English](../README.md) | **简体中文** | [日本語](README.ja.md) | [Español](README.es.md) | [Architecture (DAG)](../README.md#architecture)

---

在 DSH 插件配置卡片中管理 SSH 身份密钥与按主机 ssh 配置——文件落盘到 `$DSH_HOME/.ssh`，agent 无需任何手工配置即可 `git clone git@host:repo`。

**功能**

- 卡片驱动：复用 0.2.x 内置插件配置表单，保存即热生效（volatile 配置），无需重启
- 完全隔离：所有产物都在 `$DSH_HOME/.ssh`；对 `~/.ssh` 的唯一写操作是幂等追加一行 `Include`
- 每主机落盘：`Host` 块（0600）、私钥（0600）、推导公钥 `.pub`（0644，`ssh-keygen -y`）
- **密码连接**：以 ip / 用户 / 密码创建连接（别名可选，缺省用 IP），可绑定工作区，在设置面板管理——密码仅首次输入时可见，之后只写不可查（0600 本地存储，API 永不回传）；以 TCP 探测连通性
- **Apple 风格设置页**：大标题、统计卡片与细分隔线的分组内嵌列表；新增/编辑以 sheet 子窗口呈现（焦点圈定 + Escape 关闭），删除走 alert 确认框——配色全部基于 `--dsw-alias-*` 主题 token
- `autoInclude`：在 `~/.ssh/config` 的首个 `Host` 块前幂等插入一行 `Include`，普通 `ssh`/`git` 即可解析托管主机
- 自愈：幂等收敛、删除主机自动清理孤儿目录、非法条目跳过并告警

**安装**

```bash
dsh plugin --profile desktop add simonxluo/dsh-ssh-manager
# 或从本地克隆安装
dsh plugin --profile desktop add /path/to/dsh-ssh-manager
```

**快速上手** —— 设置 → 插件 → 插件配置 → SSH 管理：

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

**路线图**

- 一键导入既有 `~/.ssh/config`
- 卡片内直接生成密钥（`ed25519`），免粘贴
- 按主机连通性探测（`ssh -G` / 握手检查）
- `known_hosts` 管理（`ssh-keyscan`）
- 面向 agent 的健康检查工具（`ssh_hosts_check`）
- 内置表单不够用时提供自定义 UI 卡片

---

控制流 / 数据流 DAG 见 [Architecture (DAG)](../README.md#architecture)；致谢与许可证见 [English README](../README.md#acknowledgments)。
