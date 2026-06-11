begin;
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
  ('00000000-0000-0000-0000-0000000000d1', '運営', 'admin');
insert into mentorships (teacher_id, student_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a');
insert into exams (id, name, exam_date, type, created_by) values
  ('00000000-0000-0000-0000-000000000101', '第1回 全国模試', '2026-06-01', 'mock', '00000000-0000-0000-0000-0000000000c1');
insert into exam_scores (exam_id, student_id, subject_id, score, max_score, registered_by)
select '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-00000000000a', s.id, 72, 100, '00000000-0000-0000-0000-00000000000a' from subjects s where s.name = '英語';
insert into exam_scores (exam_id, student_id, subject_id, score, max_score, registered_by)
select '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-00000000000b', s.id, 65, 100, '00000000-0000-0000-0000-00000000000b' from subjects s where s.name = '英語';
insert into assignments (id, created_by, title, due_date) values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-0000000000c1', '英単語 1-100', '2026-06-20');
insert into assignment_tasks (id, assignment_id, student_id) values
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-00000000000a');
insert into invitations (token, role, created_by, expires_at) values
  ('00000000-0000-0000-0000-000000000501', 'student', '00000000-0000-0000-0000-0000000000d1', now() - interval '1 hour');
insert into invitations (token, role, grade, mentor_id, created_by) values
  ('00000000-0000-0000-0000-000000000502', 'student', '高1', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d1');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
do $$ begin
  assert (select count(*) from exam_scores where student_id='00000000-0000-0000-0000-00000000000a') = 1, 'T1';
  assert (select count(*) from exam_scores where student_id='00000000-0000-0000-0000-00000000000b') = 0, 'T2';
  assert (select count(*) from profiles where id='00000000-0000-0000-0000-00000000000b') = 0, 'T3';
  assert (select count(*) from profiles where id='00000000-0000-0000-0000-0000000000c1') = 1, 'T4';
end $$;
do $$ begin
  begin
    insert into exam_scores (exam_id, student_id, subject_id, score, max_score, registered_by)
    select '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-00000000000b', s.id, 50, 100, '00000000-0000-0000-0000-00000000000a' from subjects s where s.name='数学I・A';
    raise exception 'T5 FAILED';
  exception when insufficient_privilege then null;
  end;
end $$;
update assignment_tasks set status='done' where id='00000000-0000-0000-0000-000000000401';
do $$ begin
  assert (select completed_at is not null from assignment_tasks where id='00000000-0000-0000-0000-000000000401'), 'T6';
end $$;
do $$ begin
  begin
    update assignment_tasks set student_id='00000000-0000-0000-0000-00000000000b' where id='00000000-0000-0000-0000-000000000401';
    raise exception 'T7 FAILED';
  exception when insufficient_privilege then null;
  end;
end $$;
do $$ begin
  begin
    update profiles set role='admin' where id='00000000-0000-0000-0000-00000000000a';
    raise exception 'T8 FAILED';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
do $$ begin
  assert (select count(*) from exam_scores where student_id='00000000-0000-0000-0000-00000000000a') = 1, 'T9';
end $$;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
do $$ begin
  assert (select count(*) from exam_scores where student_id='00000000-0000-0000-0000-00000000000a') = 0, 'T10';
  assert (select count(*) from profiles where id='00000000-0000-0000-0000-00000000000a') = 0, 'T11';
end $$;
reset role;
update mentorships set ended_on = current_date where teacher_id='00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
do $$ begin
  assert (select count(*) from exam_scores where student_id='00000000-0000-0000-0000-00000000000a') = 0, 'T12';
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
do $$ begin
  begin
    perform app.redeem_invitation('00000000-0000-0000-0000-000000000501', '新規生徒');
    raise exception 'T13 FAILED';
  exception when raise_exception then
    if sqlerrm like '%T13%' then raise; end if;
  end;
end $$;
do $$ begin
  assert (select count(*) from subjects) = 0, 'T14';
end $$;
select app.redeem_invitation('00000000-0000-0000-0000-000000000502', '新規生徒');
do $$ begin
  assert (select count(*) from profiles where id=auth.uid() and role='student' and grade='高1') = 1, 'T15';
  assert (select count(*) from mentorships where student_id=auth.uid() and teacher_id='00000000-0000-0000-0000-0000000000c2' and ended_on is null) = 1, 'T16';
  assert (select count(*) from subjects) > 0, 'T17';
end $$;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
do $$ begin
  begin
    perform app.redeem_invitation('00000000-0000-0000-0000-000000000502', '誰か');
    raise exception 'T18 FAILED';
  exception when raise_exception then
    if sqlerrm like '%T18%' then raise; end if;
  end;
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
do $$ begin
  assert (select count(*) from exam_scores) = 2, 'T19';
end $$;
select admin_set_user_status('00000000-0000-0000-0000-00000000000a', 'inactive');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
do $$ begin
  assert (select count(*) from exam_scores) = 0, 'T20';
  assert (select count(*) from subjects) = 0, 'T21';
end $$;
do $$ begin
  begin
    perform admin_set_user_status('00000000-0000-0000-0000-00000000000b', 'inactive');
    raise exception 'T22 FAILED';
  exception when raise_exception then
    if sqlerrm like '%T22%' then raise; end if;
  end;
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
do $$ begin
  assert (select count(*) from calendar_items where source='assignment') = 0, 'T23';
end $$;

reset role;
do $$ begin
  assert not has_table_privilege('anon', 'public.profiles', 'select'), 'T24';
  assert not has_table_privilege('anon', 'public.exam_scores', 'select'), 'T25';
end $$;
select 'ALL 25 RLS TESTS PASSED' as result;
rollback;
