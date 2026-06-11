# 蒼理塾 学習管理アプリ(Web)

Next.js(App Router)+ Supabase。セットアップと運用は [docs/deployment.md](../docs/deployment.md) を参照。

```bash
npm install
cp .env.example .env.local   # Supabase の URL / anon キーを設定
npm run dev                  # http://localhost:3000
```

## 構成

| パス | 内容 |
|---|---|
| `src/app/` | 画面(App Router)。`(app)/` 配下はログイン必須 |
| `src/lib/actions.ts` | すべての更新系 Server Action |
| `src/lib/database.types.ts` | DB スキーマの型(`supabase/migrations` と手動同期) |
| `src/lib/supabase/` | Supabase クライアント(server / client / セッション更新) |
| `src/components/` | UI コンポーネント |
| `src/proxy.ts` | セッショントークンの自動リフレッシュ |

## 設計の前提

- **権限はすべて DB の RLS が強制する**(`supabase/migrations/`)。アプリ側の role 分岐は表示の出し分けにすぎない
- **ゼロコスト**: 有料 API なし・画像最適化オフ・cron なし。詳細は deployment.md §1
- 日時はすべて JST(`src/lib/dates.ts`)
