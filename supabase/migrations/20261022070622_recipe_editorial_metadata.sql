alter table public.recipes add column if not exists description text, add column if not exists total_time_minutes integer;
comment on column public.recipes.description is 'Optional concise recipe introduction, independent from preparation notes';
comment on column public.recipes.total_time_minutes is 'Optional total duration in minutes, including preparation and waiting';
notify pgrst, 'reload schema';
