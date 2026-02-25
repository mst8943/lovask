-- Atomik coin harcama fonksiyonu (race condition fix)
CREATE OR REPLACE FUNCTION public.spend_coins(
  p_user_id uuid,
  p_amount int,
  p_reason text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance int;
  v_is_premium boolean;
  v_final_amount int;
BEGIN
  -- Premium kullanıcılar chat_initiation için 0 jeton harcar
  SELECT coin_balance, is_premium INTO v_balance, v_is_premium
  FROM public.users WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_final_amount := p_amount;
  IF v_is_premium AND p_reason = 'chat_initiation' THEN
    v_final_amount := 0;
  END IF;

  IF v_final_amount = 0 THEN
    RETURN true;
  END IF;

  IF v_balance < v_final_amount THEN
    RETURN false;
  END IF;

  UPDATE public.users
  SET coin_balance = coin_balance - v_final_amount
  WHERE id = p_user_id;

  INSERT INTO public.transactions (user_id, amount, type, metadata)
  VALUES (p_user_id, -v_final_amount, 'spend',
    p_metadata || jsonb_build_object('reason', p_reason));

  RETURN true;
END;
$$;

-- Atomik coin ekleme fonksiyonu (race condition fix)
CREATE OR REPLACE FUNCTION public.add_coins(
  p_user_id uuid,
  p_amount int,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET coin_balance = coin_balance + p_amount
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO public.transactions (user_id, amount, type, metadata)
  VALUES (p_user_id, p_amount, 'purchase',
    jsonb_build_object('reason', p_reason));

  RETURN true;
END;
$$;
