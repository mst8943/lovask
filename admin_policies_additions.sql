-- Admin access policies for analytics

drop policy if exists "Transactions select admin" on public.transactions;

create policy "Transactions select admin" on public.transactions
  for select using (public.is_admin());

drop policy if exists "AI usage select admin" on public.ai_usage;

create policy "AI usage select admin" on public.ai_usage
  for select using (public.is_admin());
