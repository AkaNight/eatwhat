create unique index cravings_user_active_label_unique
on public.cravings (user_id, lower(btrim(label)))
where active = true;
