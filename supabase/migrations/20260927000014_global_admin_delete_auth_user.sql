CREATE OR REPLACE FUNCTION public.global_admin_delete_platform_user(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_requester_id UUID := auth.uid();
  v_email TEXT;
  v_before JSONB;
  v_deleted INTEGER;
BEGIN
  IF NOT public.is_global_admin() THEN
    RAISE EXCEPTION 'Apenas o Admin Global pode remover usuários da plataforma';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não informado';
  END IF;

  IF p_user_id = v_requester_id THEN
    RAISE EXCEPTION 'Você não pode remover sua própria conta';
  END IF;

  SELECT p.email, to_jsonb(p)
    INTO v_email, v_before
  FROM public.profiles p
  WHERE p.id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  INSERT INTO public.audit_logs (
    store_id,
    user_id,
    action,
    entity,
    entity_id,
    before_data
  ) VALUES (
    NULL,
    v_requester_id,
    'GLOBAL_USER_DELETED',
    'profiles',
    p_user_id::TEXT,
    v_before
  );

  DELETE FROM auth.users
  WHERE id = p_user_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted <> 1 THEN
    RAISE EXCEPTION 'A identidade de autenticação do usuário não foi removida';
  END IF;

  RETURN format('Usuário %s removido da plataforma.', v_email);
END;
$$;

REVOKE ALL ON FUNCTION public.global_admin_delete_platform_user(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.global_admin_delete_platform_user(UUID) TO authenticated;