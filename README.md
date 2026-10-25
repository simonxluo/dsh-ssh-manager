# dsh-ssh-manager

`v1.1.0` · MIT · DeepSeek Harness ≥ 0.2.1-rc.1

**English** | [简体中文](docs/README.zh.md) | [日本語](docs/README.ja.md) | [Español](docs/README.es.md)

---

Manage SSH identity keys and per-host ssh config from the DSH plugin card — files land under `$DSH_HOME/.ssh`, so agents can `git clone git@host:repo` with zero manual setup.

**Features**

- Card-driven: uses the built-in 0.2.x plugin-config form; saves hot-apply (volatile config), no restart
- Isolated: everything lives in `$DSH_HOME/.ssh`; the only write to `~/.ssh` is one idempotent `Include` line
- Materializes per host: `Host` block (0600), private key (0600), derived `.pub` (0644, via `ssh-keygen -y`)
- **Password connections**: ip / user / password entries with an optional alias (defaults to the ip) and a workspace binding, managed in the Settings panel — the password is visible only while first typed and write-only afterwards (0600 local store, never returned by the API); connectivity is probed over TCP
- **Apple-style settings page**: large title, stat tiles, and grouped inset lists with hairline separators; add/edit opens as a sheet (focus trap + Escape), delete confirms through an alert dialog — all colors ride on `--dsw-alias-*` theme tokens
- **Machine info (ⓘ)**: every row has an info button that opens a sheet with a live SSH snapshot — CPU / memory / swap / disk meters (warn ≥ 60%, error ≥ 85%), load, uptime, OS, kernel, hostname, cores; key hosts collect over their managed alias, password connections through a secret-free `SSH_ASKPASS` shim (no `sshpass` needed), and the password never crosses argv or disk
- `autoInclude`: inserts one idempotent `Include` line before the first `Host` block of `~/.ssh/config` so plain `ssh`/`git` resolves managed hosts
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
        MKF --> APP["Insert Include before first Host/Match block of ~/.ssh/config, keep content and mode, re-check"]
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
    IMP -->|"insert Include line before first Host block"| OUTER["~/.ssh/config"]

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
