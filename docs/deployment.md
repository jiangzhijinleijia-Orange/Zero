# デプロイ・運用ガイド(ゼロコスト構成)

| 項目 | 内容 |
|---|---|
| 対象 | 運営メンバー(引き継ぎ可能であること: NF-9) |
| 方針 | **構造的に料金が発生しない構成**(§1)。全コンポーネントが無料プラン内で完結する |

---

## 1. ゼロコスト保証(NF-8)

本プロダクトは「使いすぎたら課金される」構造を持たない。各サービスの無料プランは**超過時に課金されるのではなく、止まる**ものだけを選んでいる。

| コンポーネント | プラン | 超過時の挙動 | 備考 |
|---|---|---|---|
| Supabase(DB・認証) | Free | **一時停止(課金されない)** | クレジットカード登録不要。Free のまま使う限り請求は発生し得ない |
| Vercel(ホスティング) | Hobby | **制限(課金されない)** | 非営利コミュニティ利用は Hobby 規約の範囲内。カード登録不要 |
| Discord Webhook(通知) | 無料 | レート制限のみ | 外部 SaaS 課金なし |
| GitHub Actions(CI) | 無料枠 | **停止(課金されない)** | public リポジトリは無制限。private は月2,000分、超過時は支払い設定がない限り停止 |
| メール送信 | 使わない | — | 招待は Discord DM で配布。認証も Discord OAuth 中心でメール依存を排除 |

実装側でも以下を徹底している:

- **有料 API を一切呼ばない**(AI API・外部 SaaS なし)
- **Vercel の Image Optimization を無効化**(`next.config.ts` の `images.unoptimized`)— 従量カウント自体を発生させない
- **cron・常駐ジョブなし** — リマインド通知(F-5-2)を将来入れる場合も Supabase 内蔵の `pg_cron`(無料)を使う方針
- **service_role キーをアプリに持たせない** — anon キー + RLS のみで動作。漏洩時の被害も限定される

⚠ 守るべき運用ルール:**Supabase を Pro に上げない/Vercel にカードを登録しない**。これだけで「気づいたら課金」は構造的に起こらない。

容量の目安: Supabase Free は DB 500MB。本アプリのデータは1レコード数百バイト程度であり、数十名 × 数年分でも数十 MB に収まる。

---

## 2. 初回セットアップ(約30分)

### 2.1 Supabase プロジェクト

1. [supabase.com](https://supabase.com) で無料アカウントを作成し、新規プロジェクトを作成(リージョン: Tokyo)
2. SQL Editor で `supabase/migrations/0001_initial_schema.sql` の内容を実行
3. Project Settings → API から `URL` と `anon` キーを控える

### 2.2 Discord OAuth(推奨ログイン方式)

1. [Discord Developer Portal](https://discord.com/developers/applications) でアプリを作成
2. OAuth2 → Redirects に Supabase の callback URL を登録
   (`https://<project-ref>.supabase.co/auth/v1/callback`。Supabase の Authentication → Providers → Discord 画面に表示される)
3. Client ID / Client Secret を Supabase の Authentication → Providers → Discord に設定して有効化
4. Supabase の Authentication → URL Configuration で Site URL を本番 URL に、
   Redirect URLs に `https://<本番ドメイン>/auth/callback` を追加

講師・運営向けのメール+パスワードは Authentication → Providers → Email で有効(デフォルト)。
ユーザーは Supabase ダッシュボードから手動作成できる(自己サインアップは無効化推奨:
Authentication → Sign In / Up → 「Allow new users to sign up」をオフにしても、
招待制は RLS(プロフィール未作成ユーザーは何も見えない)で守られているため任意)。

### 2.3 Vercel デプロイ

1. このリポジトリを Vercel にインポート(Root Directory: `app`)
2. 環境変数を設定(`app/.env.example` 参照):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `DISCORD_WEBHOOK_URL`(任意。課題割当の通知用)
3. デプロイ。以後 `main` への push で自動デプロイ

### 2.4 最初の運営アカウント

最初の1人だけは招待リンクが存在しないため、手動でプロフィールを作る:

1. デプロイした本番 URL の `/login` から Discord でログイン(この時点では何も見えない)
2. Supabase の SQL Editor で実行:

```sql
insert into profiles (id, display_name, role)
select id, '運営 太郎', 'admin' from auth.users
order by created_at limit 1;
```

3. 以後は `/admin` から招待リンクを発行して、講師・生徒を追加していく

---

## 3. 日常運用

| 作業 | 手順 |
|---|---|
| メンバー追加 | `/admin` → 招待リンク発行 → Discord DM で本人へ(72時間有効・1回限り) |
| 担当の変更 | `/admin` → 担当関係。終了すると講師からは即座に見えなくなる |
| 退会(無効化) | `/admin` → ユーザー一覧 → 無効化。ログインしても何も見えなくなる |
| 退会(データ削除) | Supabase ダッシュボード → Authentication → 該当ユーザーを削除。本人のプロフィール・課題・成績は連動して物理削除される(NF-7。申請から30日以内を目安) |
| 科目・分野の追加 | 科目は SQL Editor で `subjects` に insert。分野タグは成績登録画面から講師・運営が追加可能 |

### KPI の確認(§11)

Supabase の SQL Editor で月次実行(専用基盤なし)。例:

```sql
-- 週次アクティブ生徒率
select count(*) filter (where u.last_sign_in_at > now() - interval '7 days') * 100.0
       / nullif(count(*), 0) as weekly_active_pct
from profiles p join auth.users u on u.id = p.id
where p.role = 'student' and p.status = 'active';

-- 課題ステータス更新率(直近4週の締切分)
select count(*) filter (where t.status <> 'not_started') * 100.0
       / nullif(count(*), 0) as updated_pct
from assignment_tasks t
join assignments a on a.id = t.assignment_id
where a.due_date between current_date - 28 and current_date;
```

---

## 4. 開発環境

```bash
cd app
npm install
cp .env.example .env.local   # Supabase の値を設定
npm run dev
```

### テスト・検証

| コマンド | 内容 |
|---|---|
| `npm run build`(app/) | 型チェック込みのビルド |
| `npm run lint`(app/) | ESLint |
| `supabase test db` | pgTAP による RLS テスト(`supabase/tests/rls.test.sql`。要 Supabase CLI + Docker) |
| `sudo -u postgres bash scripts/verify-rls-local.sh` | **素の PostgreSQL だけで RLS を検証**(Docker 不要)。マイグレーション適用 + 25シナリオ |
| CI(`.github/workflows/ci.yml`) | push / PR ごとに自動実行:ビルド + lint + 起動スモークテスト + RLS 25シナリオ |

**スキーマを変更したら必ず RLS 検証を再実行すること。** 成績の権限分離(F-2-6 / NF-5)はこのテストが守っている。

---

## 5. 引き継ぎメモ(NF-9)

- 権限制御はすべて DB(RLS)にある。Next.js 側の権限チェックは表示の出し分けであり、セキュリティ境界ではない
- スキーマ変更は `supabase/migrations/` に追加 → SQL Editor で適用 → `app/src/lib/database.types.ts` を同期 → RLS 検証
- 設計の背景は `docs/requirements.md`(要件)、`docs/requirements-review.md`(決定の経緯)、`docs/technical-design.md`(DB 設計)を参照
