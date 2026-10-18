# dsh-ssh-manager

`v1.0.0` · MIT · DeepSeek Harness ≥ 0.2.1-rc.1

[English](#english) | [简体中文](#简体中文) | [日本語](#日本語) | [Español](#español) | [Architecture (DAG)](#architecture)

---

## English

Manage SSH identity keys and per-host ssh config from the DSH plugin card — files land under `$DSH_HOME/.ssh`, so agents can `git clone git@host:repo` with zero manual setup.

**Features**

- Card-driven: uses the built-in 0.2.x plugin-config form; saves hot-apply (volatile config), no restart
- Isolated: everything lives in `$DSH_HOME/.ssh`; the only write to `~/.ssh` is one idempotent `Include` line
- Materializes per host: `Host` block (0600), private key (0600), derived `.pub` (0644, via `ssh-keygen -y`)
- `autoInclude`: appends one idempotent `Include` line to `~/.ssh/config` so plain `ssh`/`git` resolves managed hosts
- Self-healing: idempotent reconcile, orphan cleanup on host removal, invalid entries skipped with warnings

**Install**

```bash
dsh plugin --profile desktop add simonxluo/dsh-ssh-manager
# or from a local clone
dsh plugin --profile desktop add /path/to/dsh-ssh-manager
```

**Quick start** — Settings → Plugins → Plugin configuration → SSH Manager:

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

**Roadmap**

- One-click import from an existing `~/.ssh/config`
- In-card key generation (`ed25519`), no paste needed
- Per-host connectivity probe (`ssh -G` / handshake check)
- `known_hosts` management via `ssh-keyscan`
- Agent-facing health tool (`ssh_hosts_check`)
- Optional custom UI card when the built-in form is not enough

---

## 简体中文

在 DSH 插件配置卡片中管理 SSH 身份密钥与按主机 ssh 配置——文件落盘到 `$DSH_HOME/.ssh`，agent 无需任何手工配置即可 `git clone git@host:repo`。

**功能**

- 卡片驱动：复用 0.2.x 内置插件配置表单，保存即热生效（volatile 配置），无需重启
- 完全隔离：所有产物都在 `$DSH_HOME/.ssh`；对 `~/.ssh` 的唯一写操作是幂等追加一行 `Include`
- 每主机落盘：`Host` 块（0600）、私钥（0600）、推导公钥 `.pub`（0644，`ssh-keygen -y`）
- `autoInclude`：向 `~/.ssh/config` 幂等追加一行 `Include`，普通 `ssh`/`git` 即可解析托管主机
- 自愈：幂等收敛、删除主机自动清理孤儿目录、非法条目跳过并告警

**安装**

```bash
dsh plugin --profile desktop add simonxluo/dsh-ssh-manager
```

**快速上手** —— 设置 → 插件 → 插件配置 → SSH 管理（示例同上，见 English 节）。

**路线图**

- 一键导入既有 `~/.ssh/config`
- 卡片内直接生成密钥（`ed25519`），免粘贴
- 按主机连通性探测（`ssh -G` / 握手检查）
- `known_hosts` 管理（`ssh-keyscan`）
- 面向 agent 的健康检查工具（`ssh_hosts_check`）
- 内置表单不够用时提供自定义 UI 卡片

---

## 日本語

DSH のプラグイン設定カードから SSH 鍵とホスト別 ssh 設定を管理——ファイルは `$DSH_HOME/.ssh` に配置され、エージェントは事前設定なしで `git clone git@host:repo` できます。

**機能**

- カード駆動：0.2.x 標準のプラグイン設定フォームを利用、保存はホット適用（volatile 設定・再起動不要）
- 完全分離：成果物はすべて `$DSH_HOME/.ssh`。`~/.ssh` への書き込みは冪等な `Include` 1 行のみ
- ホスト単位の生成：`Host` ブロック（0600）、秘密鍵（0600）、派生公開鍵 `.pub`（0644、`ssh-keygen -y`）
- `autoInclude`：`~/.ssh/config` に冪等に `Include` を 1 行追記し、通常の `ssh`/`git` で解決可能に
- 自己修復：冪等リコンサイル、ホスト削除時の孤立ディレクトリ掃除、無効エントリは警告付きスキップ

**インストール**

```bash
dsh plugin --profile desktop add simonxluo/dsh-ssh-manager
```

**ロードマップ**

- 既存 `~/.ssh/config` のワンクリック取り込み
- カード内での鍵生成（`ed25519`）
- ホスト別の接続テスト（`ssh -G` / ハンドシェイク）
- `known_hosts` 管理（`ssh-keyscan`）
- エージェント向けヘルスチェックツール

---

## Español

Gestiona claves SSH e configuración por host desde la tarjeta de plugins de DSH — los archivos se materializan en `$DSH_HOME/.ssh`, y los agentes pueden hacer `git clone git@host:repo` sin configuración manual.

**Características**

- Tarjeta nativa: usa el formulario estándar de 0.2.x; los cambios se aplican en caliente (config volatile), sin reiniciar
- Aislado: todo vive en `$DSH_HOME/.ssh`; la única escritura en `~/.ssh` es una línea `Include` idempotente
- Por host: bloque `Host` (0600), clave privada (0600), pública derivada `.pub` (0644, vía `ssh-keygen -y`)
- `autoInclude`: añade una línea `Include` idempotente a `~/.ssh/config` para que `ssh`/`git` resuelvan los hosts
- Autocuración: reconciliación idempotente, limpieza de huérfanos, entradas inválidas omitidas con aviso

**Instalación**

```bash
dsh plugin --profile desktop add simonxluo/dsh-ssh-manager
```

**Hoja de ruta**

- Importación en un clic desde `~/.ssh/config`
- Generación de claves en la tarjeta (`ed25519`)
- Prueba de conectividad por host (`ssh -G` / handshake)
- Gestión de `known_hosts` (`ssh-keyscan`)
- Herramienta de salud para agentes

---

## Architecture

Two DAGs grounded in [`index.js`](index.js). Captions: **EN** control flow / data flow · **中文** 控制流 / 数据流 · **日本語** 制御フロー / データフロー · **ES** flujo de control / flujo de datos.

### Control-flow DAG

*How a config change becomes a reconciled, import-aware SSH setup.*

```mermaid
flowchart TD
    ACT["apply() on plugin activation"] --> LC["liveConfig proxy wraps row config"]
    ACT --> EFF["ctx.effect: setInterval 3 s"]
    LC -->|"activation"| FP{"sync(): fingerprint of hosts + autoInclude changed?"}
    EFF -->|"config change"| FP
    FP -->|"no"| NOOP["Skip, state already in sync"]

    subgraph RK["reconcileKeys pipeline"]
        VAL{"Entry valid? alias, url, PEM key"}
        VAL -->|"invalid"| SKIP["Skip entry and warn"]
        VAL -->|"valid"| SWEEP["Orphan sweep: config.d children not wanted"]
        SWEEP --> OWN{"looksOwned(dir)?"}
        OWN -->|"owned"| RM["Remove managed host dir"]
        OWN -->|"foreign"| KEEP["Leave untouched"]
        RM --> KEYC{"Per wanted host: private key content changed?"}
        KEEP --> KEYC
        KEYC -->|"yes"| WKEY["Write private key 0600"]
        WKEY --> PUB["ssh-keygen -y derives .pub 0644, best effort"]
        KEYC -->|"no or empty"| HCFG["Write Host block config 0600"]
        WKEY --> HCFG
        HCFG --> FLAT["Rewrite flat config managed Include region, idempotent"]
    end

    subgraph IMP["ensureSshImport"]
        PRES{"Include already in ~/.ssh/config?"}
        PRES -->|"yes"| OK["Nothing to do"]
        PRES -->|"no"| MKF["Ensure flat config exists"]
        MKF --> APP["Append Include to ~/.ssh/config, keep content and mode, re-check before write"]
    end

    FP -->|"yes"| VAL
    FLAT --> AI{"autoInclude on AND hosts > 0?"}
    AI -->|"no"| DONE["Log materialized host count"]
    AI -->|"yes"| PRES
    APP --> DONE
    OK --> DONE
```

### Data-flow DAG

*From the config card to on-disk artifacts and the Include chain used by ssh/git.*

```mermaid
flowchart LR
    CARD["Plugin config card (volatile row config)"]
    CARD --> HOSTS["hosts: alias -> url / user / privateKey / args"]
    CARD --> AUTO["autoInclude (default on)"]
    HOSTS --> LP["liveConfig proxy"]
    AUTO --> LP
    LP --> SYNC["sync(): fingerprint gate"]
    SYNC --> RK["reconcileKeys(): validate + materialize"]

    subgraph DISK["$DSH_HOME/.ssh (isolated from ~/.ssh)"]
        FLAT["config (managed Include region, 0600)"]
        HCFG["config.d/{host}/config (Host block, 0600)"]
        KEY["config.d/{host}/{host} (private key, 0600)"]
        PUB["config.d/{host}/{host}.pub (0644)"]
    end

    RK --> KEY
    RK --> HCFG
    RK --> FLAT
    KEY -->|"ssh-keygen -y"| PUB
    AUTO -.->|"gates: on + hosts > 0"| IMP["ensureSshImport()"]
    IMP -.->|"create if missing"| FLAT
    IMP -->|"append Include line"| OUTER["~/.ssh/config"]

    OUTER -->|"Include"| FLAT
    FLAT -->|"Include config.d/*/config"| HCFG
    HCFG -.->|"IdentityFile"| KEY

    OUTER --> SSH["ssh (ssh -G alias)"]
    OUTER --> GIT["git (clone git@alias:repo)"]
    SSH --> EFF["Effective HostName / User / IdentityFile"]
    GIT --> EFF
```

---

## Acknowledgments

- Successor in purpose to [AndreasSeidl/dsh-ssh-manager](https://github.com/AndreasSeidl/dsh-ssh-manager) 0.3.0 (DSH 0.1.x era; its `settingsScope` client service no longer exists in 0.2.x).
- Diagrams authored with the [Pretty-mermaid-skills](https://github.com/imxv/Pretty-mermaid-skills) agent skill.

## License

[MIT](LICENSE) © 2026 simonxluo
