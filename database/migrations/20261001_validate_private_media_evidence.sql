-- LMU Architecture 2.0 Stage 2
-- Defense-in-depth validation for private learner media evidence.

create or replace function public.validate_learner_evidence_media_row()
returns trigger
language plpgsql
security invoker
set search_path = 'public', 'pg_temp'
as $$
declare
  v_max_seconds integer;
begin
  if new.storage_path is not null then
    if new.file_size_bytes is null or new.file_size_bytes <= 0 then
      raise exception 'Evidence file size is invalid.';
    end if;
    if new.file_size_bytes > 26214400 then
      raise exception 'Evidence file exceeds the 25 MB private storage limit.';
    end if;
  end if;

  if new.evidence_type = 'whiteboard' then
    if lower(coalesce(new.mime_type,'')) <> 'image/png' then
      raise exception 'Whiteboard evidence must be a PNG image.';
    end if;
  elsif new.evidence_type = 'photo' then
    if lower(coalesce(new.mime_type,'')) not like 'image/%' then
      raise exception 'Photo evidence must use an image MIME type.';
    end if;
  elsif new.evidence_type = 'video' then
    if lower(coalesce(new.mime_type,'')) not like 'video/%' then
      raise exception 'Video evidence must use a video MIME type.';
    end if;
    if new.duration_seconds is null or new.duration_seconds <= 0 then
      raise exception 'Video evidence duration is required.';
    end if;
    select ep.max_capture_seconds
      into v_max_seconds
    from public.evidence_policy_versions ep
    where ep.policy_key='video_evidence'
      and ep.active=true
    order by ep.version desc
    limit 1;
    if v_max_seconds is not null and new.duration_seconds > v_max_seconds then
      raise exception 'Video evidence is longer than the permitted capture limit.';
    end if;
  elsif new.evidence_type = 'audio' then
    if lower(coalesce(new.mime_type,'')) not like 'audio/%' then
      raise exception 'Audio evidence must use an audio MIME type.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_learner_evidence_media_row() from public, anon, authenticated, service_role;

drop trigger if exists learner_evidence_media_validation on public.learner_evidence_items;
create trigger learner_evidence_media_validation
before insert or update of evidence_type, storage_path, mime_type, file_size_bytes, duration_seconds
on public.learner_evidence_items
for each row execute function public.validate_learner_evidence_media_row();
