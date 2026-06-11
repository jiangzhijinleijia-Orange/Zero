-- =============================================================================
-- RLS 検証テスト(docs/technical-design.md §4.4)
-- 実行方法: supabase test db   (ローカルの Supabase CLI。費用ゼロ)
-- 権限分離(F-2-6 / NF-5)はこのテストが守る。スキーマ変更時は必ず再実行すること。
--
-- 登場人物(UUID 下4桁): 000a=生徒A / 000b=生徒B / 00c1=講師1 / 00c2=講師2
--                        00d1=運営 / 00e1=未登録ユーザー
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
create schema if not exists tests;
select plan(18);

-- ---------------------------------------------------------------------------
-- テストデータ(postgres として投入。RLS の対象外)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'student-a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'student-b@test.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'teacher-1@test.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'teacher-2@test.local'),
  ('00000000-0000-0000-0000-0000000000d1', 'admin@test.local'),
  ('00000000-0000-0000-0000-0000000000e1', 'newcomer@test.local');

insert into profiles (id, display_name, role) values
  ('00000000-0000-0000-0000-00000000000a', '生徒A', 'student'),
  ('00000000-0000-0000-0000-00000000000b', '生徒B', 'student'),
  ('00000000-0000-0000-0000-0000000000c1', '講師1', 'teacher'),
  ('00000000-0000-0000-0000-0000000000c2', '講師2', 'teacher'),
  ('00000000-0000-0000-0000-0000000000d1', '運営',  'admin');

-- 講師1 が 生徒A の現担当
insert into mentorships (teacher_id, student_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a');

-- 成績: 生徒A と 生徒B に1件ずつ
insert into exams (id, name, exam_date, type, created_by) values
  ('00000000-0000-0000-0000-000000000101', '第1回 全国模試', '2026-06-01', 'mock',
   '00000000-0000-0000-0000-0000000000c1');

insert into exam_scores (exam_id, student_id, subject_id, score, max_score, registered_by)
select '00000000-0000-0000-0000-000000000101',
       '00000000-0000-0000-0000-00000000000a',
       s.id, 72, 100, '00000000-0000-0000-0000-00000000000a'
  from subjects s where s.name = '英語';

insert into exam_scores (exam_id, student_id, subject_id, score, max_score, registered_by)
select '00000000-0000-0000-0000-000000000101',
       '00000000-0000-0000-0000-00000000000b',
       s.id, 65, 100, '00000000-0000-0000-0000-00000000000b'
  from subjects s where s.name = '英語';

-- 課題: 講師1 → 生徒A
insert into assignments (id, created_by, title, due_date) values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-0000000000c1',
   '英単語 1-100', '2026-06-20');
insert into assignment_tasks (id, assignment_id, student_id) values
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-00000000000a');

-- 期限切れの招待
insert into invitations (token, role, created_by, expires_at) values
  ('00000000-0000-0000-0000-000000000501', 'student',
   '00000000-0000-0000-0000-0000000000d1', now() - interval '1 hour');

-- ---------------------------------------------------------------------------
-- なりすましヘルパー
-- ---------------------------------------------------------------------------
create or replace function tests.authenticate_as(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
                     json_build_object('sub', p_uid, 'role', 'authenticated')::text,
                     true);
  set local role authenticated;
end $$;

-- =============================================================================
-- シナリオ 1: 生徒間の分離(F-2-6)
-- =============================================================================
select tests.authenticate_as('00000000-0000-0000-0000-00000000000a');

select isnt_empty(
  $$ select 1 from exam_scores where student_id = '00000000-0000-0000-0000-00000000000a' $$,
  '生徒Aは自分の成績を閲覧できる');

select is_empty(
  $$ select 1 from exam_scores where student_id = '00000000-0000-0000-0000-00000000000b' $$,
  '生徒Aから生徒Bの成績は見えない');

select is_empty(
  $$ select 1 from profiles where id = '00000000-0000-0000-0000-00000000000b' $$,
  '生徒Aから生徒Bのプロフィールは見えない');

select isnt_empty(
  $$ select 1 from profiles where id = '00000000-0000-0000-0000-0000000000c1' $$,
  '生徒Aから講師の表示名は見える(担当講師名の表示用)');

select throws_ok(
  $$ insert into exam_scores (exam_id, student_id, subject_id, score, max_score, registered_by)
     select '00000000-0000-0000-0000-000000000101',
            '00000000-0000-0000-0000-00000000000b',
            s.id, 50, 100, '00000000-0000-0000-0000-00000000000a'
       from subjects s where s.name = '数学I・A' $$,
  '42501', null,
  '生徒Aは他生徒の成績を登録できない');

-- =============================================================================
-- シナリオ 2: タスク更新は status / progress_note のみ(P-4 / 改ざん防止)
-- =============================================================================
select lives_ok(
  $$ update assignment_tasks set status = 'done'
      where id = '00000000-0000-0000-0000-000000000401' $$,
  '生徒Aは自分のタスクのステータスを更新できる');

select results_eq(
  $$ select completed_at is not null from assignment_tasks
      where id = '00000000-0000-0000-0000-000000000401' $$,
  array[true],
  '完了時に completed_at がトリガーで自動設定される');

select throws_ok(
  $$ update assignment_tasks set student_id = '00000000-0000-0000-0000-00000000000b'
      where id = '00000000-0000-0000-0000-000000000401' $$,
  '42501', null,
  '生徒は割当先(student_id)を書き換えられない');

select throws_ok(
  $$ update profiles set role = 'admin'
      where id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', null,
  '生徒は自分のロールを昇格できない');

-- =============================================================================
-- シナリオ 3: 講師の閲覧範囲は現担当のみ
-- =============================================================================
select tests.authenticate_as('00000000-0000-0000-0000-0000000000c1');

select isnt_empty(
  $$ select 1 from exam_scores where student_id = '00000000-0000-0000-0000-00000000000a' $$,
  '現担当の講師1は生徒Aの成績を閲覧できる');

select tests.authenticate_as('00000000-0000-0000-0000-0000000000c2');

select is_empty(
  $$ select 1 from exam_scores where student_id = '00000000-0000-0000-0000-00000000000a' $$,
  '担当外の講師2から生徒Aの成績は見えない');

select is_empty(
  $$ select 1 from profiles where id = '00000000-0000-0000-0000-00000000000a' $$,
  '担当外の講師2から生徒Aのプロフィールは見えない');

-- 担当終了後は見えなくなる(レビュー A-3)
reset role;
update mentorships set ended_on = current_date
 where teacher_id = '00000000-0000-0000-0000-0000000000c1';

select tests.authenticate_as('00000000-0000-0000-0000-0000000000c1');
select is_empty(
  $$ select 1 from exam_scores where student_id = '00000000-0000-0000-0000-00000000000a' $$,
  '担当終了後、元担当の講師1から生徒Aの成績は見えなくなる');

-- =============================================================================
-- シナリオ 4: 招待制(F-4-4)
-- =============================================================================
select tests.authenticate_as('00000000-0000-0000-0000-0000000000e1');

select throws_ok(
  $$ select app.redeem_invitation('00000000-0000-0000-0000-000000000501', '新規生徒') $$,
  'P0001', 'INVALID_INVITATION',
  '期限切れの招待トークンは引換できない');

select is_empty(
  $$ select 1 from subjects $$,
  'プロフィール未作成のユーザー(野良登録)は科目マスタすら見えない');

-- =============================================================================
-- シナリオ 5: 無効化(F-4-5)。無効化されたユーザーは即時に何も見えない
-- =============================================================================
select tests.authenticate_as('00000000-0000-0000-0000-0000000000d1');

select lives_ok(
  $$ select admin_set_user_status('00000000-0000-0000-0000-00000000000a', 'inactive') $$,
  '運営はユーザーを無効化できる');

select tests.authenticate_as('00000000-0000-0000-0000-00000000000a');

select is_empty(
  $$ select 1 from exam_scores $$,
  '無効化されたユーザーは自分の成績も見えなくなる');

-- =============================================================================
-- シナリオ 6: 未ログイン(anon)はテーブル権限自体がない
-- =============================================================================
reset role;
select ok(
  not has_table_privilege('anon', 'public.profiles', 'select')
  and not has_table_privilege('anon', 'public.exam_scores', 'select')
  and not has_table_privilege('anon', 'public.assignment_tasks', 'select'),
  '未ログイン(anon)に主要テーブルの SELECT 権限がない');

select * from finish();
rollback;
