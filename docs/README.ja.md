# dsh-ssh-manager

`v1.1.0` · MIT · DeepSeek Harness ≥ 0.2.1-rc.1

[English](../README.md) | [简体中文](README.zh.md) | **日本語** | [Español](README.es.md) | [Architecture (DAG)](../README.md#architecture)

---

DSH のプラグイン設定カードから SSH 鍵とホスト別 ssh 設定を管理——ファイルは `$DSH_HOME/.ssh` に配置され、エージェントは事前設定なしで `git clone git@host:repo` できます。

**機能**

- カード駆動：0.2.x 標準のプラグイン設定フォームを利用、保存はホット適用（volatile 設定・再起動不要）
- 完全分離：成果物はすべて `$DSH_HOME/.ssh`。`~/.ssh` への書き込みは冪等な `Include` 1 行のみ
- ホスト単位の生成：`Host` ブロック（0600）、秘密鍵（0600）、派生公開鍵 `.pub`（0644、`ssh-keygen -y`）
- **パスワード接続**：ip / ユーザー / パスワードで接続を作成（エイリアス任意、未指定なら IP）。ワークスペース連携可能。パスワードは初回入力時のみ表示、以降は書き込み専用（0600 ローカル保存、API では返されない）。TCP で到達性を確認
- **Apple 風設定ページ**：大きなタイトル、統計タイル、ヘアライン区切りのグループ化リスト。追加・編集はシート（フォーカストラップ + Escape）、削除はアラートで確認。色はすべて `--dsw-alias-*` テーマトークンを使用
- **マシン情報（ⓘ）**：各行の情報ボタンでリアルタイム SSH スナップショットを表示——CPU / メモリ / スワップ / ディスクのメーター（60% 以上で警告色、85% 以上でエラー色）と負荷・稼働時間・OS・カーネルなど。鍵ホストは管理エイリアス経由、パスワード接続は秘密を含まない `SSH_ASKPASS` ヘルパー（sshpass 不要）で収集し、パスワードは argv・ディスクを経由しない
- `autoInclude`：`~/.ssh/config` の最初の `Host` ブロック前に冪等に `Include` を 1 行挿入し、通常の `ssh`/`git` で解決可能に
- 自己修復：冪等リコンサイル、ホスト削除時の孤立ディレクトリ掃除、無効エントリは警告付きスキップ

**インストール**

```bash
dsh plugin --profile desktop add simonxluo/dsh-ssh-manager
# またはローカルクローンから
dsh plugin --profile desktop add /path/to/dsh-ssh-manager
```

**クイックスタート** — 設定 → プラグイン → プラグイン設定 → SSH 管理：

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

**ロードマップ**

- 既存 `~/.ssh/config` のワンクリック取り込み
- カード内での鍵生成（`ed25519`）
- ホスト別の接続テスト（`ssh -G` / ハンドシェイク）
- `known_hosts` 管理（`ssh-keyscan`）
- エージェント向けヘルスチェックツール

---

制御フロー / データフロー DAG は [Architecture (DAG)](../README.md#architecture) を、謝辞とライセンスは [English README](../README.md#acknowledgments) を参照。
