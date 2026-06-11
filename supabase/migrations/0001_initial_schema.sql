-- =============================================================================
-- 蒼理塾 学習管理アプリ 初期スキーマ
-- docs/technical-design.md に基づく。権限制御はすべて本ファイルの RLS で完結する
-- (NF-5: アプリ層のバグでも他生徒の成績が漏れない)。
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 列挙型
-- ---------------------------------------------------------------------------
create type user_role        as enum ('student', 'teacher', 'admin');
create type user_status      as enum ('active', 'inactive');
create type task_status      as enum ('not_started', 'in_progress', 'done');
create type exam_type        as enum ('mock', 'term', 'quiz');
create type event_type       as enum ('mock_exam', 'offline', 'other');
create type event_visibility as enum ('all', 'targeted');

-- ---------------------------------------------------------------------------
-- テーブル
-- ---------------------------------------------------------------------------

-- ユーザー(auth.users と 1:1。認証情報は Supabase Auth に委譲 → F-4-6 最小収集)
create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 50),
  role         user_role not null,
  grade        text,
  affiliation  text,
  status       user_status not null default 'active',
  created_at   timestamptz not null default now()
);

-- 担当関係(N:N + 期間。ended_on が null の行が「現担当」)
create table mentorships (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles (id) on delete cascade,
  student_id uuid not null references profiles (id) on delete cascade,
  started_on date not null default current_date,
  ended_on   date,
  check (teacher_id <> student_id),
  check (ended_on is null or ended_on >= started_on)
);
create unique index mentorships_active_uniq
  on mentorships (teacher_id, student_id) where ended_on is null;
create index mentorships_student_active_idx
  on mentorships (student_id) where ended_on is null;

-- 招待(F-4-4: 運営発行・72時間・1回限り)
create table invitations (
  id         uuid primary key default gen_random_uuid(),
  token      uuid not null unique default gen_random_uuid(),
  role       user_role not null,
  grade      text,
  mentor_id  uuid references profiles (id) on delete set null,
  created_by uuid references profiles (id) on delete set null,
  expires_at timestamptz not null default now() + interval '72 hours',
  used_by    uuid references profiles (id) on delete set null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

-- 科目マスタ(表記ゆれ対策。廃止は is_active=false の論理削除)
create table subjects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  sort_order int not null default 0,
  is_active  boolean not null default true
);

-- 分野タグマスタ(F-2-8。Phase 2 の生命線なので統制語彙とする)
create table topics (
  id         uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects (id),
  name       text not null check (length(trim(name)) between 1 and 50),
  unique (subject_id, name)
);

-- 課題マスタ(F-1-1)
create table assignments (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid references profiles (id) on delete set null,
  title       text not null check (length(trim(title)) between 1 and 100),
  description text,
  subject_id  uuid references subjects (id),
  due_date    date not null,
  created_at  timestamptz not null default now()
);
create index assignments_due_idx on assignments (due_date);

-- 課題×生徒 = タスク(F-1-2: 1課題を複数生徒へ割当)
create table assignment_tasks (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments (id) on delete cascade,
  student_id    uuid not null references profiles (id) on delete cascade,
  status        task_status not null default 'not_started',
  progress_note text,
  completed_at  timestamptz,
  updated_at    timestamptz not null default now(),
  unique (assignment_id, student_id)
);
create index assignment_tasks_student_idx on assignment_tasks (student_id, status);

-- テストマスタ(F-2-1, F-2-3。provider: 模試の提供元、基準差の誤読防止)
create table exams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) between 1 and 100),
  exam_date  date not null,
  type       exam_type not null,
  provider   text,
  created_by uuid references profiles (id) on delete set null
);

-- 成績(F-2-2。registered_by: 誰が登録したかを KPI 分析のため記録)
create table exam_scores (
  id            uuid primary key default gen_random_uuid(),
  exam_id       uuid not null references exams (id) on delete cascade,
  student_id    uuid not null references profiles (id) on delete cascade,
  subject_id    uuid not null references subjects (id),
  score         numeric not null check (score >= 0),
  max_score     numeric not null check (max_score > 0),
  deviation     numeric check (deviation is null or deviation between 0 and 100),
  judgement     text check (judgement in ('A', 'B', 'C', 'D', 'E')),
  note          text,
  registered_by uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (exam_id, student_id, subject_id),
  check (score <= max_score)
);
create index exam_scores_student_idx on exam_scores (student_id, subject_id);

-- 分野タグ別得点(F-2-8)
create table score_topics (
  id            uuid primary key default gen_random_uuid(),
  exam_score_id uuid not null references exam_scores (id) on delete cascade,
  topic_id      uuid not null references topics (id),
  score         numeric not null check (score >= 0),
  max_score     numeric not null check (max_score > 0),
  unique (exam_score_id, topic_id),
  check (score <= max_score)
);

-- 予定(F-3)
create table events (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (length(trim(title)) between 1 and 100),
  starts_at  timestamptz not null,
  ends_at    timestamptz,
  type       event_type not null default 'other',
  visibility event_visibility not null default 'all',
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index events_starts_idx on events (starts_at);

-- 限定公開予定の対象生徒(F-3-4)
create table event_targets (
  event_id   uuid not null references events (id) on delete cascade,
  student_id uuid not null references profiles (id) on delete cascade,
  primary key (event_id, student_id)
);

-- ---------------------------------------------------------------------------
-- ヘルパー関数(security definer: 関数内の参照は RLS を通らないため再帰しない)
-- ---------------------------------------------------------------------------
create schema if not exists app;

create or replace function app.my_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and status = 'active';
$$;

create or replace function app.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app.my_role() = 'admin', false);
$$;

create or replace function app.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app.my_role() in ('teacher', 'admin'), false);
$$;

-- 有効なプロフィールを持つか。無効化(F-4-5)されたユーザーは即時に何も見えなくなる
create or replace function app.is_active() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and status = 'active'
  );
$$;

-- 自分(講師)が当該生徒の「現担当」か。現担当は過去の履歴も含めて閲覧できる
create or replace function app.is_mentor_of(p_student uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from mentorships
    where teacher_id = auth.uid() and student_id = p_student and ended_on is null
  );
$$;

-- 招待の引換(F-4-4)。invitations はクライアントから読めないため、検証はここに集約
create or replace function app.redeem_invitation(p_token uuid, p_display_name text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  inv invitations;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if length(trim(coalesce(p_display_name, ''))) not between 1 and 50 then
    raise exception 'INVALID_DISPLAY_NAME';
  end if;

  select * into inv from invitations
   where token = p_token and used_at is null and expires_at > now()
   for update;
  if not found then
    raise exception 'INVALID_INVITATION';
  end if;
  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'ALREADY_REGISTERED';
  end if;

  insert into profiles (id, display_name, role, grade)
  values (auth.uid(), trim(p_display_name), inv.role, inv.grade);

  if inv.role = 'student' and inv.mentor_id is not null then
    insert into mentorships (teacher_id, student_id)
    values (inv.mentor_id, auth.uid());
  end if;

  update invitations set used_by = auth.uid(), used_at = now() where id = inv.id;
end $$;

-- 運営によるユーザー有効化/無効化(F-4-5)。
-- profiles.status は列レベル権限で一般更新を禁止しているため、運営操作はこの関数を通す
create or replace function app.admin_set_user_status(p_user uuid, p_status user_status)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not app.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  update profiles set status = p_status where id = p_user;
  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;
end $$;

-- PostgREST(supabase-js の rpc)は public スキーマのみ公開のため、公開用ラッパーを置く
create or replace function public.redeem_invitation(p_token uuid, p_display_name text)
returns void
language sql security invoker as $$
  select app.redeem_invitation(p_token, p_display_name);
$$;

create or replace function public.admin_set_user_status(p_user uuid, p_status user_status)
returns void
language sql security invoker as $$
  select app.admin_set_user_status(p_user, p_status);
$$;

revoke all on function public.redeem_invitation(uuid, text) from public, anon;
revoke all on function public.admin_set_user_status(uuid, user_status) from public, anon;
grant execute on function public.redeem_invitation(uuid, text) to authenticated;
grant execute on function public.admin_set_user_status(uuid, user_status) to authenticated;

-- タスクの completed_at / updated_at を自動管理(生徒の入力は status の1タップだけ → P-4)
create or replace function app.set_task_timestamps() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if new.status = 'done' and old.status is distinct from 'done' then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end $$;

create trigger assignment_tasks_timestamps
  before update on assignment_tasks
  for each row execute function app.set_task_timestamps();

-- ---------------------------------------------------------------------------
-- RLS ポリシー
-- ---------------------------------------------------------------------------

-- ===== profiles =====
alter table profiles enable row level security;

create policy profiles_select on profiles for select using (
  id = auth.uid()  -- 自分の行は無効化後も見える(無効化の案内表示用)
  or app.is_admin()
  or (app.is_active() and app.is_mentor_of(id))
  -- 講師・運営の表示名は全員に可視(課題作成者名・担当講師名の表示に必要)
  or (role in ('teacher', 'admin') and app.my_role() is not null)
);
create policy profiles_update_own on profiles for update
  using (id = auth.uid() and app.is_active())
  with check (id = auth.uid());
create policy profiles_admin_update on profiles for update
  using (app.is_admin()) with check (app.is_admin());
-- insert は app.redeem_invitation(security definer)経由のみ。delete はサーバー管理のみ

-- ===== mentorships =====
alter table mentorships enable row level security;
create policy mentorships_select on mentorships for select using (
  app.is_active()
  and (teacher_id = auth.uid() or student_id = auth.uid() or app.is_admin())
);
create policy mentorships_admin_write on mentorships for all
  using (app.is_admin()) with check (app.is_admin());

-- ===== invitations =====(運営のみ。引換は security definer 関数経由)
alter table invitations enable row level security;
create policy invitations_admin on invitations for all
  using (app.is_admin()) with check (app.is_admin());

-- ===== subjects / topics =====
alter table subjects enable row level security;
create policy subjects_select on subjects for select using (app.my_role() is not null);
create policy subjects_admin on subjects for all
  using (app.is_admin()) with check (app.is_admin());

alter table topics enable row level security;
create policy topics_select on topics for select using (app.my_role() is not null);
create policy topics_staff_insert on topics for insert with check (app.is_staff());
create policy topics_admin_update on topics for update
  using (app.is_admin()) with check (app.is_admin());
create policy topics_admin_delete on topics for delete using (app.is_admin());

-- ===== assignments =====
alter table assignments enable row level security;
create policy assignments_select on assignments for select using (
  app.is_active()
  and (app.is_admin()
       or created_by = auth.uid()
       or exists (select 1 from assignment_tasks t
                  where t.assignment_id = assignments.id
                    and (t.student_id = auth.uid() or app.is_mentor_of(t.student_id))))
);
create policy assignments_staff_insert on assignments for insert
  with check (app.is_staff() and created_by = auth.uid());
create policy assignments_owner_update on assignments for update
  using (created_by = auth.uid() or app.is_admin());
create policy assignments_owner_delete on assignments for delete
  using (created_by = auth.uid() or app.is_admin());

-- ===== assignment_tasks =====
alter table assignment_tasks enable row level security;
create policy tasks_select on assignment_tasks for select using (
  app.is_active()
  and (student_id = auth.uid() or app.is_mentor_of(student_id) or app.is_admin())
);
create policy tasks_insert on assignment_tasks for insert with check (
  app.is_admin()
  or exists (select 1 from assignments a
             where a.id = assignment_id and a.created_by = auth.uid())
);
create policy tasks_update on assignment_tasks for update using (
  app.is_active()
  and (student_id = auth.uid() or app.is_mentor_of(student_id) or app.is_admin())
);
create policy tasks_delete on assignment_tasks for delete using (
  app.is_admin()
  or exists (select 1 from assignments a
             where a.id = assignment_id and a.created_by = auth.uid())
);

-- ===== exams =====
alter table exams enable row level security;
create policy exams_select on exams for select using (app.my_role() is not null);
create policy exams_insert on exams for insert
  with check (app.my_role() is not null and created_by = auth.uid());
create policy exams_owner_update on exams for update
  using (created_by = auth.uid() or app.is_admin());
create policy exams_admin_delete on exams for delete using (app.is_admin());

-- ===== exam_scores ===== ← F-2-6 / NF-5 の核心:本人・現担当・運営以外には不可視
alter table exam_scores enable row level security;
create policy scores_select on exam_scores for select using (
  app.is_active()
  and (student_id = auth.uid() or app.is_mentor_of(student_id) or app.is_admin())
);
create policy scores_insert on exam_scores for insert with check (
  app.is_active()
  and registered_by = auth.uid()
  and (student_id = auth.uid() or app.is_mentor_of(student_id) or app.is_admin())
);
create policy scores_update on exam_scores for update using (
  app.is_active()
  and (student_id = auth.uid() or app.is_mentor_of(student_id) or app.is_admin())
);
create policy scores_delete on exam_scores for delete using (
  app.is_active()
  and (student_id = auth.uid() or app.is_mentor_of(student_id) or app.is_admin())
);

-- ===== score_topics =====(親の exam_scores の可視性に追従)
alter table score_topics enable row level security;
create policy score_topics_all on score_topics for all using (
  app.is_active()
  and exists (select 1 from exam_scores s
              where s.id = exam_score_id
                and (s.student_id = auth.uid()
                     or app.is_mentor_of(s.student_id)
                     or app.is_admin()))
) with check (
  app.is_active()
  and exists (select 1 from exam_scores s
              where s.id = exam_score_id
                and (s.student_id = auth.uid()
                     or app.is_mentor_of(s.student_id)
                     or app.is_admin()))
);

-- ===== events / event_targets =====
alter table events enable row level security;
create policy events_select on events for select using (
  app.my_role() is not null
  and (visibility = 'all'
       or app.is_staff()
       or exists (select 1 from event_targets t
                  where t.event_id = events.id and t.student_id = auth.uid()))
);
create policy events_staff_insert on events for insert
  with check (app.is_staff() and created_by = auth.uid());
create policy events_owner_update on events for update
  using (created_by = auth.uid() or app.is_admin());
create policy events_owner_delete on events for delete
  using (created_by = auth.uid() or app.is_admin());

alter table event_targets enable row level security;
create policy event_targets_select on event_targets for select using (
  app.is_active() and (student_id = auth.uid() or app.is_staff())
);
create policy event_targets_staff_write on event_targets for all
  using (app.is_staff()) with check (app.is_staff());

-- ---------------------------------------------------------------------------
-- カレンダー合成ビュー(F-3-2: 締切は events に複製しない)
-- security_invoker により閲覧者自身の RLS で評価される
-- → 生徒には「見える予定」+「自分の課題の締切」だけが返る
-- ---------------------------------------------------------------------------
create view calendar_items
with (security_invoker = on) as
  select e.id,
         e.title,
         e.starts_at,
         e.ends_at,
         e.type::text as item_type,
         'event'      as source
    from events e
  union all
  select a.id,
         a.title,
         (a.due_date::timestamp at time zone 'Asia/Tokyo') as starts_at,
         null::timestamptz as ends_at,
         'assignment_due'  as item_type,
         'assignment'      as source
    from assignments a;

-- ---------------------------------------------------------------------------
-- 権限(grant / revoke)
-- ---------------------------------------------------------------------------

-- 未ログイン(anon)はテーブルに一切触れない
revoke all on all tables in schema public from anon;

-- 本人が直接 update してよい列を制限(role / status / student_id 等の改変防止)
revoke update on profiles from authenticated;
grant  update (display_name, grade, affiliation) on profiles to authenticated;

revoke update on assignment_tasks from authenticated;
grant  update (status, progress_note) on assignment_tasks to authenticated;

revoke update on exam_scores from authenticated;
grant  update (subject_id, score, max_score, deviation, judgement, note)
  on exam_scores to authenticated;

grant select on calendar_items to authenticated;

-- app スキーマの関数
grant usage on schema app to authenticated;
revoke all on all functions in schema app from public, anon;
grant execute on function
  app.my_role(),
  app.is_admin(),
  app.is_staff(),
  app.is_active(),
  app.is_mentor_of(uuid),
  app.redeem_invitation(uuid, text),
  app.admin_set_user_status(uuid, user_status)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 科目マスタ初期データ(要件レビューで確定したリストに差し替えて運用開始する)
-- ---------------------------------------------------------------------------
insert into subjects (name, sort_order) values
  ('英語',     10),
  ('数学I・A', 20),
  ('数学II・B', 21),
  ('数学III',  22),
  ('現代文',   30),
  ('古典',     31),
  ('物理',     40),
  ('化学',     41),
  ('生物',     42),
  ('地学',     43),
  ('地理',     50),
  ('歴史',     51),
  ('公民',     52),
  ('情報',     60);
