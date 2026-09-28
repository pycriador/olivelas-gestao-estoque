-- =============================================================================
-- MIGRATION: 20260927000016_close_authenticated_default_on_new_functions.sql
--
-- A 011 criou trg_revoke_default_function_exec para impedir que funcoes novas
-- no schema public nascessem expostas. Mas o corte so alcançava PUBLIC e anon:
-- o default do Supabase continua a dar EXECUTE a authenticated e service_role.
-- Verificado em producao (probe 2026-09-27) e no banco local:
--   anon=false authenticated=true service_role=true
-- para uma funcao recem-criada sem nenhum GRANT.
--
-- Isso contradiz o contrato documentado em docs/pt-BR/security.md (funcao
-- nova precisa de GRANT explicito) e deixa a proxima RPC SECURITY DEFINER
-- sem guarda interna acessiveis por qualquer usuario logado -- exatamente a
-- classe de problema que a 015 fechou nos helpers internos.
--
-- Esta migration amplia o REVOKE do event trigger para PUBLIC, anon,
-- authenticated e service_role. Daqui pra frente, uma RPC nova so funciona
-- se a propria migration der GRANT (como 006 a 011 ja fazem). Funcoes
-- existentes nao mudam de ACL por esta migration: ela so reescreve o corpo
-- do trigger.
--
-- Ordem de aplicacao: depois de 20260927000015_revoke_internal_helpers_from_authenticated.sql.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_revoke_default_function_exec()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cmd RECORD;
BEGIN
  FOR v_cmd IN SELECT * FROM pg_event_trigger_ddl_commands() LOOP
    IF v_cmd.command_tag = 'CREATE FUNCTION'
       AND v_cmd.object_identity LIKE 'public.%' THEN
      -- object_identity ja vem qualificado (public.fn), nao repetir o schema.
      -- Revoga para todos os roles que o default do Supabase alcança:
      -- PUBLIC (implicito do Postgres), anon (default pg_default_acl) e
      -- authenticated/service_role (GRANT explicito do supabase_admin -- ver
      -- 011, bloco 1b). Nada nasce executavel sem GRANT explicito.
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role',
                     v_cmd.object_identity);
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_revoke_default_function_exec() FROM PUBLIC, anon, authenticated, service_role;