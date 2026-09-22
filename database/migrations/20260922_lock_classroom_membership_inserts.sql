-- LittleMindsUniverse release hardening
-- Prevent teachers (or any ordinary authenticated client) from manufacturing
-- learner access by inserting arbitrary learner UUIDs into a classroom they own.
--
-- Intended enrollment path remains public.join_classroom_by_code(), which is a
-- SECURITY DEFINER RPC that verifies the signed-in guardian is linked to the
-- learner and that the classroom code is valid. Teacher UI only needs SELECT
-- and UPDATE (for marking an existing membership removed).

begin;

revoke insert on table public.classroom_members from authenticated;

drop policy if exists teacher_manages_classroom_members
on public.classroom_members;

create policy teacher_updates_classroom_members
on public.classroom_members
for update
to authenticated
using (public.teacher_owns_classroom(classroom_id))
with check (public.teacher_owns_classroom(classroom_id));

commit;
