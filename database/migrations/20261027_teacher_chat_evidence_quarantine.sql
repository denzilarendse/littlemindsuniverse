-- Teacher-origin schoolwork capture for Teacher–Milo.
-- Quarantine-only: uploads remain private and are not exposed to Milo until a trusted scanner/review pipeline marks them safe.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'teacher-chat-evidence-quarantine',
  'teacher-chat-evidence-quarantine',
  false,
  26214400,
  array['image/jpeg','image/png','image/webp','application/pdf']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = least(coalesce(storage.buckets.file_size_limit, excluded.file_size_limit), excluded.file_size_limit),
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.teacher_chat_evidence (
  id uuid primary key default gen_random_uuid(),
  teacher_profile_id uuid not null references public.profiles(id) on delete restrict,
  classroom_id uuid not null references public.classrooms(id) on delete restrict,
  learner_id uuid not null references public.learners(id) on delete restrict,
  source_type text not null check (source_type in ('teacher_upload','camera_capture')),
  source_context text not null default 'teacher_milo_chat' check (source_context = 'teacher_milo_chat'),
  original_filename text not null check (length(original_filename) between 1 and 180),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 20971520),
  status text not null default 'pending_scan' check (status in ('pending_scan','scan_passed','scan_failed','teacher_reviewed','deleted')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_profile_id uuid references public.profiles(id) on delete restrict,
  scan_completed_at timestamptz,
  scan_result_code text,
  constraint teacher_chat_evidence_review_pair check (
    (reviewed_at is null and reviewed_by_profile_id is null)
    or (reviewed_at is not null and reviewed_by_profile_id is not null)
  )
);

create index if not exists teacher_chat_evidence_teacher_created_idx
  on public.teacher_chat_evidence (teacher_profile_id, created_at desc);
create index if not exists teacher_chat_evidence_classroom_learner_idx
  on public.teacher_chat_evidence (classroom_id, learner_id, created_at desc);

alter table public.teacher_chat_evidence enable row level security;
revoke all on public.teacher_chat_evidence from anon, authenticated;
grant select on public.teacher_chat_evidence to authenticated;
grant all on public.teacher_chat_evidence to service_role;

drop policy if exists teacher_read_own_chat_evidence on public.teacher_chat_evidence;
create policy teacher_read_own_chat_evidence
on public.teacher_chat_evidence
for select to authenticated
using (
  teacher_profile_id = (select auth.uid())
  and public.teacher_can_access_learner(learner_id)
  and exists (
    select 1 from public.classrooms c
    join public.classroom_members cm on cm.classroom_id = c.id
    where c.id = teacher_chat_evidence.classroom_id
      and c.teacher_profile_id = (select auth.uid())
      and c.active = true
      and cm.learner_id = teacher_chat_evidence.learner_id
      and cm.status::text = 'active'
  )
);

drop policy if exists teacher_upload_chat_evidence_quarantine on storage.objects;
create policy teacher_upload_chat_evidence_quarantine
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'teacher-chat-evidence-quarantine'
  and array_length(storage.foldername(name), 1) = 3
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.classrooms c
    join public.classroom_members cm on cm.classroom_id = c.id
    where c.id::text = (storage.foldername(name))[2]
      and cm.learner_id::text = (storage.foldername(name))[3]
      and c.teacher_profile_id = (select auth.uid())
      and c.active = true
      and cm.status::text = 'active'
  )
);

drop policy if exists teacher_read_chat_evidence_quarantine on storage.objects;
create policy teacher_read_chat_evidence_quarantine
on storage.objects
for select to authenticated
using (
  bucket_id = 'teacher-chat-evidence-quarantine'
  and array_length(storage.foldername(name), 1) = 3
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.classrooms c
    join public.classroom_members cm on cm.classroom_id = c.id
    where c.id::text = (storage.foldername(name))[2]
      and cm.learner_id::text = (storage.foldername(name))[3]
      and c.teacher_profile_id = (select auth.uid())
      and c.active = true
      and cm.status::text = 'active'
  )
);

drop policy if exists teacher_delete_chat_evidence_quarantine on storage.objects;
create policy teacher_delete_chat_evidence_quarantine
on storage.objects
for delete to authenticated
using (
  bucket_id = 'teacher-chat-evidence-quarantine'
  and array_length(storage.foldername(name), 1) = 3
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.classrooms c
    join public.classroom_members cm on cm.classroom_id = c.id
    where c.id::text = (storage.foldername(name))[2]
      and cm.learner_id::text = (storage.foldername(name))[3]
      and c.teacher_profile_id = (select auth.uid())
      and c.active = true
      and cm.status::text = 'active'
  )
);

create or replace function public.register_teacher_chat_evidence(
  p_classroom_id uuid,
  p_learner_id uuid,
  p_storage_path text,
  p_original_filename text,
  p_mime_type text,
  p_file_size_bytes bigint,
  p_source_type text
) returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'Sign-in is required.'; end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = v_uid and p.role::text = 'teacher'
  ) then raise exception 'Only a teacher account may register teacher-origin evidence.'; end if;
  if p_source_type not in ('teacher_upload','camera_capture') then
    raise exception 'Unsupported evidence source.';
  end if;
  if p_mime_type not in ('image/jpeg','image/png','image/webp','application/pdf') then
    raise exception 'Unsupported file type.';
  end if;
  if not (
    (p_mime_type = 'image/jpeg' and lower(coalesce(p_storage_path,'')) ~ '\.(jpg|jpeg)$')
    or (p_mime_type = 'image/png' and lower(coalesce(p_storage_path,'')) ~ '\.png$')
    or (p_mime_type = 'image/webp' and lower(coalesce(p_storage_path,'')) ~ '\.webp$')
    or (p_mime_type = 'application/pdf' and lower(coalesce(p_storage_path,'')) ~ '\.pdf$')
  ) then raise exception 'File extension does not match the declared MIME type.'; end if;
  if p_file_size_bytes is null or p_file_size_bytes <= 0 or p_file_size_bytes > 20971520 then
    raise exception 'File must be between 1 byte and 20 MiB.';
  end if;
  if coalesce(length(trim(p_original_filename)),0) < 1 or length(p_original_filename) > 180
     or p_original_filename ~ '[[:cntrl:]]' then
    raise exception 'Invalid filename.';
  end if;
  if coalesce(p_storage_path,'') !~ (
    '^' || v_uid::text || '/' || p_classroom_id::text || '/' || p_learner_id::text || '/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp|pdf)$'
  ) then raise exception 'Evidence path does not match this teacher, classroom, and learner.'; end if;
  if not exists (
    select 1 from public.classrooms c
    join public.classroom_members cm on cm.classroom_id = c.id
    where c.id = p_classroom_id and c.teacher_profile_id = v_uid and c.active = true
      and cm.learner_id = p_learner_id and cm.status::text = 'active'
  ) then raise exception 'The selected learner is not in your active classroom.'; end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'teacher-chat-evidence-quarantine'
      and o.name = p_storage_path and o.owner_id = v_uid::text
  ) then raise exception 'Private upload could not be verified.'; end if;
  insert into public.teacher_chat_evidence (
    teacher_profile_id, classroom_id, learner_id, source_type, original_filename,
    storage_path, mime_type, file_size_bytes, status
  ) values (
    v_uid, p_classroom_id, p_learner_id, p_source_type, trim(p_original_filename),
    p_storage_path, p_mime_type, p_file_size_bytes, 'pending_scan'
  ) returning id into v_id;
  return v_id;
end;
$function$;

revoke all on function public.register_teacher_chat_evidence(uuid,uuid,text,text,text,bigint,text) from public, anon;
grant execute on function public.register_teacher_chat_evidence(uuid,uuid,text,text,text,bigint,text) to authenticated;
)
    or (p_mime_type = 'image/png' and lower(coalesce(p_storage_path,'')) ~ '\.png  if p_file_size_bytes is null or p_file_size_bytes <= 0 or p_file_size_bytes > 20971520 then
    raise exception 'File must be between 1 byte and 20 MiB.';
  end if;
  if coalesce(length(trim(p_original_filename)),0) < 1 or length(p_original_filename) > 180
     or p_original_filename ~ '[[:cntrl:]]' then
    raise exception 'Invalid filename.';
  end if;
  if coalesce(p_storage_path,'') !~ (
    '^' || v_uid::text || '/' || p_classroom_id::text || '/' || p_learner_id::text || '/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp|pdf)$'
  ) then raise exception 'Evidence path does not match this teacher, classroom, and learner.'; end if;
  if not exists (
    select 1 from public.classrooms c
    join public.classroom_members cm on cm.classroom_id = c.id
    where c.id = p_classroom_id and c.teacher_profile_id = v_uid and c.active = true
      and cm.learner_id = p_learner_id and cm.status::text = 'active'
  ) then raise exception 'The selected learner is not in your active classroom.'; end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'teacher-chat-evidence-quarantine'
      and o.name = p_storage_path and o.owner_id = v_uid::text
  ) then raise exception 'Private upload could not be verified.'; end if;
  insert into public.teacher_chat_evidence (
    teacher_profile_id, classroom_id, learner_id, source_type, original_filename,
    storage_path, mime_type, file_size_bytes, status
  ) values (
    v_uid, p_classroom_id, p_learner_id, p_source_type, trim(p_original_filename),
    p_storage_path, p_mime_type, p_file_size_bytes, 'pending_scan'
  ) returning id into v_id;
  return v_id;
end;
$function$;

revoke all on function public.register_teacher_chat_evidence(uuid,uuid,text,text,text,bigint,text) from public, anon;
grant execute on function public.register_teacher_chat_evidence(uuid,uuid,text,text,text,bigint,text) to authenticated;
)
    or (p_mime_type = 'image/webp' and lower(coalesce(p_storage_path,'')) ~ '\.webp  if p_file_size_bytes is null or p_file_size_bytes <= 0 or p_file_size_bytes > 20971520 then
    raise exception 'File must be between 1 byte and 20 MiB.';
  end if;
  if coalesce(length(trim(p_original_filename)),0) < 1 or length(p_original_filename) > 180
     or p_original_filename ~ '[[:cntrl:]]' then
    raise exception 'Invalid filename.';
  end if;
  if coalesce(p_storage_path,'') !~ (
    '^' || v_uid::text || '/' || p_classroom_id::text || '/' || p_learner_id::text || '/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp|pdf)$'
  ) then raise exception 'Evidence path does not match this teacher, classroom, and learner.'; end if;
  if not exists (
    select 1 from public.classrooms c
    join public.classroom_members cm on cm.classroom_id = c.id
    where c.id = p_classroom_id and c.teacher_profile_id = v_uid and c.active = true
      and cm.learner_id = p_learner_id and cm.status::text = 'active'
  ) then raise exception 'The selected learner is not in your active classroom.'; end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'teacher-chat-evidence-quarantine'
      and o.name = p_storage_path and o.owner_id = v_uid::text
  ) then raise exception 'Private upload could not be verified.'; end if;
  insert into public.teacher_chat_evidence (
    teacher_profile_id, classroom_id, learner_id, source_type, original_filename,
    storage_path, mime_type, file_size_bytes, status
  ) values (
    v_uid, p_classroom_id, p_learner_id, p_source_type, trim(p_original_filename),
    p_storage_path, p_mime_type, p_file_size_bytes, 'pending_scan'
  ) returning id into v_id;
  return v_id;
end;
$function$;

revoke all on function public.register_teacher_chat_evidence(uuid,uuid,text,text,text,bigint,text) from public, anon;
grant execute on function public.register_teacher_chat_evidence(uuid,uuid,text,text,text,bigint,text) to authenticated;
)
    or (p_mime_type = 'application/pdf' and lower(coalesce(p_storage_path,'')) ~ '\.pdf  if p_file_size_bytes is null or p_file_size_bytes <= 0 or p_file_size_bytes > 20971520 then
    raise exception 'File must be between 1 byte and 20 MiB.';
  end if;
  if coalesce(length(trim(p_original_filename)),0) < 1 or length(p_original_filename) > 180
     or p_original_filename ~ '[[:cntrl:]]' then
    raise exception 'Invalid filename.';
  end if;
  if coalesce(p_storage_path,'') !~ (
    '^' || v_uid::text || '/' || p_classroom_id::text || '/' || p_learner_id::text || '/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp|pdf)$'
  ) then raise exception 'Evidence path does not match this teacher, classroom, and learner.'; end if;
  if not exists (
    select 1 from public.classrooms c
    join public.classroom_members cm on cm.classroom_id = c.id
    where c.id = p_classroom_id and c.teacher_profile_id = v_uid and c.active = true
      and cm.learner_id = p_learner_id and cm.status::text = 'active'
  ) then raise exception 'The selected learner is not in your active classroom.'; end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'teacher-chat-evidence-quarantine'
      and o.name = p_storage_path and o.owner_id = v_uid::text
  ) then raise exception 'Private upload could not be verified.'; end if;
  insert into public.teacher_chat_evidence (
    teacher_profile_id, classroom_id, learner_id, source_type, original_filename,
    storage_path, mime_type, file_size_bytes, status
  ) values (
    v_uid, p_classroom_id, p_learner_id, p_source_type, trim(p_original_filename),
    p_storage_path, p_mime_type, p_file_size_bytes, 'pending_scan'
  ) returning id into v_id;
  return v_id;
end;
$function$;

revoke all on function public.register_teacher_chat_evidence(uuid,uuid,text,text,text,bigint,text) from public, anon;
grant execute on function public.register_teacher_chat_evidence(uuid,uuid,text,text,text,bigint,text) to authenticated;
)
  ) then raise exception 'File extension does not match the declared MIME type.'; end if;
  if p_file_size_bytes is null or p_file_size_bytes <= 0 or p_file_size_bytes > 20971520 then
    raise exception 'File must be between 1 byte and 20 MiB.';
  end if;
  if coalesce(length(trim(p_original_filename)),0) < 1 or length(p_original_filename) > 180
     or p_original_filename ~ '[[:cntrl:]]' then
    raise exception 'Invalid filename.';
  end if;
  if coalesce(p_storage_path,'') !~ (
    '^' || v_uid::text || '/' || p_classroom_id::text || '/' || p_learner_id::text || '/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp|pdf)$'
  ) then raise exception 'Evidence path does not match this teacher, classroom, and learner.'; end if;
  if not exists (
    select 1 from public.classrooms c
    join public.classroom_members cm on cm.classroom_id = c.id
    where c.id = p_classroom_id and c.teacher_profile_id = v_uid and c.active = true
      and cm.learner_id = p_learner_id and cm.status::text = 'active'
  ) then raise exception 'The selected learner is not in your active classroom.'; end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'teacher-chat-evidence-quarantine'
      and o.name = p_storage_path and o.owner_id = v_uid::text
  ) then raise exception 'Private upload could not be verified.'; end if;
  insert into public.teacher_chat_evidence (
    teacher_profile_id, classroom_id, learner_id, source_type, original_filename,
    storage_path, mime_type, file_size_bytes, status
  ) values (
    v_uid, p_classroom_id, p_learner_id, p_source_type, trim(p_original_filename),
    p_storage_path, p_mime_type, p_file_size_bytes, 'pending_scan'
  ) returning id into v_id;
  return v_id;
end;
$function$;

revoke all on function public.register_teacher_chat_evidence(uuid,uuid,text,text,text,bigint,text) from public, anon;
grant execute on function public.register_teacher_chat_evidence(uuid,uuid,text,text,text,bigint,text) to authenticated;
