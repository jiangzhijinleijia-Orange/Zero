# 蒼理塾 学習管理アプリ

蒼理塾(琉球サーティー)のための学習管理 Web アプリ。Discord が苦手とする「状態の管理と蓄積」(課題の進捗・成績・予定)に特化する。

> **会話は Discord、状態はアプリ** — Discord を置き換えるものではない。

## リポジトリ構成

| パス | 内容 |
|---|---|
| [`app/`](app/) | Web アプリ本体(Next.js + Supabase) |
| [`supabase/migrations/`](supabase/migrations/) | DB スキーマ + RLS ポリシー(権限制御の本丸) |
| [`supabase/tests/`](supabase/tests/) | RLS の pgTAP テスト |
| [`scripts/`](scripts/) | RLS 検証スクリプト(素の PostgreSQL で実行可) |
| [`docs/`](docs/) | 要件・設計・運用ドキュメント |

## ドキュメント

| ドキュメント | 内容 |
|---|---|
| [要件定義書(たたき台 v1.0)](docs/requirements.md) | 機能要件・非機能要件・スコープ |
| [要件レビュー — 論点整理と推奨案](docs/requirements-review.md) | 未決事項への推奨案(実装はこの推奨を採用) |
| [技術設計書 — データモデル・RLS・認証](docs/technical-design.md) | DB 設計の考え方 |
| [デプロイ・運用ガイド](docs/deployment.md) | **セットアップ手順とゼロコスト保証** |
| [使い方ガイド](docs/user-guide.md) | 生徒・講師・運営向け(Discord 配布用) |
| [保護者向け同意文書(ひな形)](docs/consent-form.md) | NF-6 対応。β開始前に Google Forms 化 |

## プロジェクト概要

- **目的**: 学習者が効率よく、最適に学習できる状態を作る
- **MVP(Phase 1)**: 課題タスク管理 / 模試・テスト成績登録 / カレンダー / ユーザー管理(招待制)
- **技術スタック**: Next.js + Supabase + Vercel
- **運用費**: **0円**。課金が構造的に発生しない構成([deployment.md §1](docs/deployment.md#1-ゼロコスト保証nf-8))

## ステータス

MVP 実装済み(Phase 1 の Must + 主要 Should)。クローズドβに向けて:

1. [デプロイガイド](docs/deployment.md)に従って Supabase / Vercel をセットアップ
2. 要件レビューの未決事項は[推奨案](docs/requirements-review.md)どおり仮決めで実装済み。運営レビューで変更が出た箇所のみ調整
3. β検証の最重要項目: **生徒が言われなくてもステータスを更新するか**(要件 §10)

## 開発

```bash
cd app && npm install && npm run dev   # 開発サーバー
cd app && npm run build                # 型チェック込みビルド
sudo -u postgres bash scripts/verify-rls-local.sh   # RLS 検証(スキーマ変更時は必須)
```
