begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'consultations', 'consultations table exists');

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'student-one@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'student-two@example.com'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'admin@example.com');

update public.profiles
set role = 'admin'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

insert into public.consultations (
  id,
  student_id,
  first_name,
  last_name,
  reason,
  scheduled_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'Student',
    'One',
    'First consultation',
    '2030-01-10 09:00:00+00'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    'Student',
    'One',
    'Second consultation',
    '2030-01-11 09:00:00+00'
  ),
  (
    '20000000-0000-4000-8000-000000000001',
    '22222222-2222-4222-8222-222222222222',
    'Student',
    'Two',
    'Another consultation',
    '2030-01-12 09:00:00+00'
  );

select results_eq(
  $$
    select count(*)
    from public.profiles
    where id in (
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    )
  $$,
  array[3::bigint],
  'new auth users receive student profiles'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select results_eq(
  $$select count(*) from public.consultations$$,
  array[2::bigint],
  'a student sees only their consultations'
);

select results_eq(
  $$select count(*) from public.profiles$$,
  array[1::bigint],
  'a student sees only their own profile'
);

select throws_ok(
  $$update public.profiles set role = 'admin' where id = '11111111-1111-4111-8111-111111111111'$$,
  '42501',
  'permission denied for table profiles',
  'a student cannot promote their own role'
);

select lives_ok(
  $$
    insert into public.consultations (
      student_id,
      first_name,
      last_name,
      reason,
      scheduled_at
    )
    values (
      '11111111-1111-4111-8111-111111111111',
      'Student',
      'One',
      'New consultation',
      '2030-01-13 09:00:00+00'
    )
  $$,
  'a student can create their own consultation'
);

select throws_ok(
  $$
    insert into public.consultations (
      student_id,
      first_name,
      last_name,
      reason,
      scheduled_at
    )
    values (
      '22222222-2222-4222-8222-222222222222',
      'Student',
      'Two',
      'Unauthorized consultation',
      '2030-01-14 09:00:00+00'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "consultations"',
  'a student cannot create a consultation for another user'
);

select lives_ok(
  $$
    update public.consultations
    set scheduled_at = '2030-02-10 09:00:00+00'
    where id = '10000000-0000-4000-8000-000000000001'
  $$,
  'a student can reschedule their own consultation'
);

select throws_ok(
  $$
    update public.consultations
    set reason = 'Changed directly'
    where id = '10000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  'permission denied for table consultations',
  'a student cannot edit fields outside the supported workflow'
);

select results_eq(
  $$
    update public.consultations
    set scheduled_at = '2030-02-12 09:00:00+00'
    where id = '20000000-0000-4000-8000-000000000001'
    returning id
  $$,
  $$select id from public.consultations where false$$,
  'a student cannot update another student consultation'
);

select lives_ok(
  $$
    update public.consultations
    set status = 'cancelled'
    where id = '10000000-0000-4000-8000-000000000002'
  $$,
  'a student can cancel their own consultation'
);

select results_eq(
  $$
    update public.consultations
    set scheduled_at = '2030-03-10 09:00:00+00'
    where id = '10000000-0000-4000-8000-000000000002'
    returning id
  $$,
  $$select id from public.consultations where false$$,
  'a cancelled consultation cannot be changed'
);

select throws_ok(
  $$
    delete from public.consultations
    where id = '10000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  'permission denied for table consultations',
  'students cannot hard-delete consultation history'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select results_eq(
  $$
    select count(*)
    from public.consultations
    where student_id in (
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222'
    )
  $$,
  array[4::bigint],
  'an admin can read every consultation'
);

select results_eq(
  $$
    select count(*)
    from public.profiles
    where id in (
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    )
  $$,
  array[3::bigint],
  'an admin can read every profile'
);

select results_eq(
  $$
    update public.consultations
    set scheduled_at = '2030-04-10 09:00:00+00'
    where id = '10000000-0000-4000-8000-000000000001'
    returning id
  $$,
  $$select id from public.consultations where false$$,
  'the admin role is read-only for student consultations'
);

reset role;
set local role anon;

select throws_ok(
  $$select count(*) from public.consultations$$,
  '42501',
  'permission denied for table consultations',
  'anonymous users cannot read consultations'
);

select * from finish();

rollback;
