grant select on table public.country_plan_prices to anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.country_plan_prices from anon;
revoke insert, update, delete, truncate, references, trigger on table public.country_plan_prices from authenticated;