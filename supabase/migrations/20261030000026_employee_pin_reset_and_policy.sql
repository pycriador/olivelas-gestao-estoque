-- ============================================================================
-- MIGRATION 26: RESET DE PIN NO PRÓXIMO LOGIN E PRÉ-REQUISITOS DO PIN POR FUNCIONÁRIO
-- ============================================================================

-- 1. Adicionar colunas de controle de reset de PIN no próximo login e política de pré-requisitos em store_users
ALTER TABLE public.store_users
  ADD COLUMN IF NOT EXISTS require_pin_reset BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS pin_requirements JSONB DEFAULT '{"minLength": 6, "maxLength": 12, "requireNumbers": true, "requireUppercase": true, "requireLowercase": false, "requireSymbols": true, "disallowSequential": true}'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS pin_updated_at TIMESTAMPTZ;

-- 2. Atualizar RPC upsert_store_employee para suportar p_require_pin_reset e p_pin_requirements (com DEFAULT para retrocompatibilidade)
CREATE OR REPLACE FUNCTION public.upsert_store_employee(
  p_store_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_password TEXT DEFAULT NULL,
  p_role public.user_role_enum DEFAULT 'SELLER'::public.user_role_enum,
  p_job_title TEXT DEFAULT NULL,
  p_employee_registration TEXT DEFAULT NULL,
  p_custom_role_id UUID DEFAULT NULL,
  p_can_approve_writeoff BOOLEAN DEFAULT FALSE,
  p_approval_pin TEXT DEFAULT NULL,
  p_max_writeoff_value NUMERIC DEFAULT NULL,
  p_granted_permissions TEXT[] DEFAULT '{}'::TEXT[],
  p_revoked_permissions TEXT[] DEFAULT '{}'::TEXT[],
  p_is_active BOOLEAN DEFAULT TRUE,
  p_require_pin_reset BOOLEAN DEFAULT NULL,
  p_pin_requirements JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_norm_email TEXT := LOWER(TRIM(p_email));
  v_target_user_id UUID;
  v_store_user_id UUID;
  v_encrypted_pw TEXT;
  v_raw_pw TEXT;
  v_default_pin_req JSONB := '{"minLength": 6, "maxLength": 12, "requireNumbers": true, "requireUppercase": true, "requireLowercase": false, "requireSymbols": true, "disallowSequential": true}'::jsonb;
BEGIN
  IF v_norm_email IS NULL OR v_norm_email = '' THEN
    RAISE EXCEPTION 'O e-mail do funcionário é obrigatório.';
  END IF;

  IF NOT (
    public.is_global_admin() OR
    public.has_store_role(p_store_id, ARRAY['STORE_ADMIN']::public.user_role_enum[])
  ) THEN
    RAISE EXCEPTION 'Apenas o Administrador da Loja ou Global Admin pode gerenciar funcionários e papéis.';
  END IF;

  -- 1. Verificar se o usuário já existe em profiles ou auth.users
  SELECT id INTO v_target_user_id
  FROM public.profiles
  WHERE LOWER(email) = v_norm_email
  LIMIT 1;

  IF v_target_user_id IS NULL THEN
    SELECT id INTO v_target_user_id
    FROM auth.users
    WHERE LOWER(email) = v_norm_email
    LIMIT 1;
  END IF;

  -- 2. Se não existir no auth.users, criar a identidade com segurança sem afetar a sessão atual
  IF v_target_user_id IS NULL THEN
    v_target_user_id := gen_random_uuid();
    v_raw_pw := COALESCE(NULLIF(TRIM(p_password), ''), 'Olivelas@2026');
    v_encrypted_pw := extensions.crypt(v_raw_pw, extensions.gen_salt('bf'));

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_target_user_id,
      'authenticated',
      'authenticated',
      v_norm_email,
      v_encrypted_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', COALESCE(NULLIF(TRIM(p_full_name), ''), split_part(v_norm_email, '@', 1)), 'phone', p_phone),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_target_user_id,
      jsonb_build_object('sub', v_target_user_id::TEXT, 'email', v_norm_email, 'email_verified', true),
      'email',
      v_target_user_id::TEXT,
      NOW(),
      NOW(),
      NOW()
    ) ON CONFLICT DO NOTHING;
  ELSIF p_password IS NOT NULL AND TRIM(p_password) <> '' THEN
    v_encrypted_pw := extensions.crypt(TRIM(p_password), extensions.gen_salt('bf'));
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        updated_at = NOW()
    WHERE id = v_target_user_id;
  END IF;

  -- 3. Garantir/atualizar registro em public.profiles
  INSERT INTO public.profiles (id, email, full_name, phone, updated_at)
  VALUES (
    v_target_user_id,
    v_norm_email,
    COALESCE(NULLIF(TRIM(p_full_name), ''), split_part(v_norm_email, '@', 1)),
    NULLIF(TRIM(p_phone), ''),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(NULLIF(TRIM(EXCLUDED.full_name), ''), public.profiles.full_name),
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
      updated_at = NOW();

  -- 4. Upsert em public.store_users com todas as permissões granulares, flag de aprovador e política de PIN
  INSERT INTO public.store_users (
    store_id,
    user_id,
    role,
    job_title,
    employee_registration,
    custom_role_id,
    can_approve_writeoff,
    approval_pin,
    require_pin_reset,
    pin_requirements,
    pin_updated_at,
    max_writeoff_value,
    granted_permissions,
    revoked_permissions,
    is_active,
    updated_at
  ) VALUES (
    p_store_id,
    v_target_user_id,
    p_role,
    NULLIF(TRIM(p_job_title), ''),
    NULLIF(TRIM(p_employee_registration), ''),
    p_custom_role_id,
    COALESCE(p_can_approve_writeoff, p_role = 'STOCK_APPROVER'::public.user_role_enum),
    NULLIF(TRIM(p_approval_pin), ''),
    COALESCE(p_require_pin_reset, FALSE),
    COALESCE(p_pin_requirements, v_default_pin_req),
    CASE WHEN NULLIF(TRIM(p_approval_pin), '') IS NOT NULL THEN NOW() ELSE NULL END,
    p_max_writeoff_value,
    COALESCE(p_granted_permissions, '{}'::TEXT[]),
    COALESCE(p_revoked_permissions, '{}'::TEXT[]),
    COALESCE(p_is_active, TRUE),
    NOW()
  )
  ON CONFLICT (store_id, user_id) DO UPDATE
  SET role = EXCLUDED.role,
      job_title = EXCLUDED.job_title,
      employee_registration = EXCLUDED.employee_registration,
      custom_role_id = EXCLUDED.custom_role_id,
      can_approve_writeoff = EXCLUDED.can_approve_writeoff,
      approval_pin = COALESCE(EXCLUDED.approval_pin, public.store_users.approval_pin),
      require_pin_reset = COALESCE(p_require_pin_reset, public.store_users.require_pin_reset),
      pin_requirements = COALESCE(p_pin_requirements, public.store_users.pin_requirements, v_default_pin_req),
      pin_updated_at = CASE
        WHEN EXCLUDED.approval_pin IS NOT NULL AND EXCLUDED.approval_pin IS DISTINCT FROM public.store_users.approval_pin THEN NOW()
        ELSE public.store_users.pin_updated_at
      END,
      max_writeoff_value = EXCLUDED.max_writeoff_value,
      granted_permissions = EXCLUDED.granted_permissions,
      revoked_permissions = EXCLUDED.revoked_permissions,
      is_active = EXCLUDED.is_active,
      updated_at = NOW()
  RETURNING id INTO v_store_user_id;

  -- 5. Registrar auditoria
  INSERT INTO public.audit_logs (
    store_id, user_id, action, entity, entity_id, after_data
  ) VALUES (
    p_store_id,
    v_caller,
    'STORE_EMPLOYEE_UPSERTED',
    'store_users',
    v_store_user_id::TEXT,
    jsonb_build_object(
      'email', v_norm_email,
      'fullName', p_full_name,
      'role', p_role,
      'jobTitle', p_job_title,
      'employeeRegistration', p_employee_registration,
      'canApproveWriteoff', p_can_approve_writeoff,
      'requirePinReset', COALESCE(p_require_pin_reset, FALSE),
      'pinRequirements', COALESCE(p_pin_requirements, v_default_pin_req),
      'grantedPermissions', p_granted_permissions,
      'revokedPermissions', p_revoked_permissions
    )
  );

  RETURN v_store_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_store_employee(
  UUID, TEXT, TEXT, TEXT, TEXT, public.user_role_enum, TEXT, TEXT, UUID,
  BOOLEAN, TEXT, NUMERIC, TEXT[], TEXT[], BOOLEAN, BOOLEAN, JSONB
) TO authenticated;

-- 3. RPC para o próprio funcionário concluir o reset obrigatório de PIN no login
CREATE OR REPLACE FUNCTION public.complete_employee_pin_reset(
  p_store_id UUID,
  p_new_pin TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_su RECORD;
  v_pin TEXT := TRIM(COALESCE(p_new_pin, ''));
  v_min_len INT;
  v_max_len INT;
  v_req_numbers BOOLEAN;
  v_req_upper BOOLEAN;
  v_req_lower BOOLEAN;
  v_req_symbols BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sessão não autenticada.';
  END IF;

  SELECT *
  INTO v_su
  FROM public.store_users
  WHERE store_id = p_store_id
    AND user_id = v_user_id
    AND is_active = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vínculo de funcionário não encontrado para esta loja.';
  END IF;

  v_min_len := COALESCE((v_su.pin_requirements->>'minLength')::INT, 6);
  v_max_len := COALESCE((v_su.pin_requirements->>'maxLength')::INT, 12);
  v_req_numbers := COALESCE((v_su.pin_requirements->>'requireNumbers')::BOOLEAN, TRUE);
  v_req_upper := COALESCE((v_su.pin_requirements->>'requireUppercase')::BOOLEAN, TRUE);
  v_req_lower := COALESCE((v_su.pin_requirements->>'requireLowercase')::BOOLEAN, FALSE);
  v_req_symbols := COALESCE((v_su.pin_requirements->>'requireSymbols')::BOOLEAN, TRUE);

  IF CHAR_LENGTH(v_pin) < v_min_len OR CHAR_LENGTH(v_pin) > v_max_len THEN
    RAISE EXCEPTION 'O PIN deve ter entre % e % caracteres.', v_min_len, v_max_len;
  END IF;

  IF v_req_numbers AND v_pin !~ '[0-9]' THEN
    RAISE EXCEPTION 'O PIN deve conter pelo menos um número (0-9).';
  END IF;

  IF v_req_upper AND v_pin !~ '[A-Z]' THEN
    RAISE EXCEPTION 'O PIN deve conter pelo menos uma letra maiúscula (A-Z).';
  END IF;

  IF v_req_lower AND v_pin !~ '[a-z]' THEN
    RAISE EXCEPTION 'O PIN deve conter pelo menos uma letra minúscula (a-z).';
  END IF;

  IF v_req_symbols AND v_pin !~ '[!@#$%^&*()_+\-=\[\]{};'':"\\|,.<>/?~`@]' THEN
    RAISE EXCEPTION 'O PIN deve conter pelo menos um símbolo especial.';
  END IF;

  UPDATE public.store_users
  SET approval_pin = v_pin,
      require_pin_reset = FALSE,
      pin_updated_at = NOW(),
      updated_at = NOW()
  WHERE id = v_su.id;

  INSERT INTO public.audit_logs (
    store_id, user_id, action, entity, entity_id, after_data
  ) VALUES (
    p_store_id,
    v_user_id,
    'EMPLOYEE_PIN_RESET_COMPLETED',
    'store_users',
    v_su.id::TEXT,
    jsonb_build_object(
      'userId', v_user_id,
      'requirePinReset', FALSE,
      'pinUpdatedAt', NOW()
    )
  );

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_employee_pin_reset(UUID, TEXT) TO authenticated;
