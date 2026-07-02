# AGENT.md

## 検証環境

このリポジトリでの検証には、カレントディレクトリの `mise.toml` で指定された Node.js と、カレントディレクトリの `.venv` を使ってよい。

Node.js を使う場合は、原則として以下のように `mise exec` 経由で実行する。

```sh
mise exec -- node --version
mise exec -- npm --version
mise exec -- npx --version
```

Python を使う場合は、カレントディレクトリの仮想環境を使う。

```sh
.venv/bin/python --version
```

Python の外部ライブラリが必要な場合は、カレントディレクトリの `.venv` に入れてよい。

```sh
.venv/bin/python -m pip install <package>
```

グローバルの Python には、絶対に外部ライブラリをインストールしない。

## 注意

- 新しい環境の作成や依存関係の追加は、ユーザーの明示的な依頼がある場合のみ行う。
- `.venv/` と `node_modules/` は検証用のローカル生成物として扱い、Git管理対象にしない。
- コミットメッセージは日本語にする。
- Git 操作でリポジトリの状態を変更する場合は、必ずユーザーに昇格許可を求める。
- `git status` や `git diff` などの読み取り専用操作は、昇格なしで実行してよい。
