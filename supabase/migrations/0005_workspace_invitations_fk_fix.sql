-- workspace_invitations.invited_by no tenía "on delete cascade" (a diferencia
-- de todo el resto de FKs a auth.users en el esquema), así que borrar una
-- cuenta que hubiera invitado a alguien fallaba por violación de FK. Se
-- detectó al limpiar usuarios de prueba del flujo de invitación de equipo.
begin;

alter table public.workspace_invitations
  drop constraint workspace_invitations_invited_by_fkey,
  add constraint workspace_invitations_invited_by_fkey
    foreign key (invited_by) references auth.users(id) on delete cascade;

commit;
