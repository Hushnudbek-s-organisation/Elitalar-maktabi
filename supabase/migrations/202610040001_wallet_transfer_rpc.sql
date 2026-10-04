-- Atomic PP transfers. Apply this migration in the Supabase SQL editor or with the Supabase CLI.
-- The app uses the existing school ID + profile password flow, so the PIN is verified
-- inside PostgreSQL and is never returned to the browser as profile data.
create or replace function public.transfer_pp(
  p_sender_id text,
  p_receiver_id text,
  p_amount bigint,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  sender_row public.profiles%rowtype;
  receiver_row public.profiles%rowtype;
  new_balance bigint;
  new_transaction_id text;
begin
  if p_sender_id is null or p_receiver_id is null or p_pin is null then
    raise exception 'Transfer ma''lumotlari to''liq emas.' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount < 1 then
    raise exception 'O''tkazma miqdori kamida 1 PP bo''lishi kerak.' using errcode = 'P0001';
  end if;
  if p_sender_id = p_receiver_id then
    raise exception 'O''zingizga PP o''tkaza olmaysiz.' using errcode = 'P0001';
  end if;

  select * into sender_row from public.profiles where id = p_sender_id for update;
  if not found or lower(coalesce(sender_row.role, '')) <> 'student' then
    raise exception 'Yuboruvchi o''quvchi topilmadi.' using errcode = 'P0001';
  end if;
  if sender_row.password is distinct from p_pin then
    raise exception 'Parol noto''g''ri.' using errcode = 'P0001';
  end if;
  if coalesce(sender_row.pp_balance, 0) < p_amount then
    raise exception 'Hisobingizda mablag'' yetarli emas.' using errcode = 'P0001';
  end if;

  select * into receiver_row from public.profiles where id = p_receiver_id for update;
  if not found or lower(coalesce(receiver_row.role, '')) <> 'student' then
    raise exception 'Qabul qiluvchi o''quvchi topilmadi.' using errcode = 'P0001';
  end if;

  new_balance := coalesce(sender_row.pp_balance, 0) - p_amount;
  update public.profiles set pp_balance = new_balance where id = p_sender_id;
  update public.profiles set pp_balance = coalesce(pp_balance, 0) + p_amount where id = p_receiver_id;

  insert into public.transactions (sender_id, receiver_id, amount)
  values (p_sender_id, p_receiver_id, p_amount)
  returning id::text into new_transaction_id;

  return jsonb_build_object(
    'balance', new_balance,
    'transaction_id', new_transaction_id,
    'amount', p_amount
  );
end;
$$;

revoke all on function public.transfer_pp(text, text, bigint, text) from public;
grant execute on function public.transfer_pp(text, text, bigint, text) to anon, authenticated;
