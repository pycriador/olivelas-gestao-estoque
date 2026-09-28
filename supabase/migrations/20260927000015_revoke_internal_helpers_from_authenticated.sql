-- =============================================================================
-- MIGRATION: 20260927000015_revoke_internal_helpers_from_authenticated.sql
-- Fecha uma exposicao que a auditoria de 011 deixou passar.
--
-- A 011 revogou PUBLIC e anon das funcoes privileged, mas nao tirou
-- `authenticated`. Para as 9 RPCs que o app chama isso e o correto. Para os
-- helpers internos, nao: elesGrant EXECUTE a quem esta logado sem nenhuma
-- guarda interna, e o frontend nunca os chama.
--
-- restore_stock_after_delete e o caso grave:
--   - SECURITY DEFINER, entao roda com o privilegio do dono;
--   - sem checagem de has_store_access / is_global_admin no corpo;
--   - reverte o saldo de qualquer loja, de qualquer usuario logado.
--
-- Confirmado em producao (2026-09-27): um usuario sem vinculo com a loja
-- chamou public.restore_stock_after_delete(loja, 'ORDER', id) e o saldo foi
-- de 45 para 50. O unico limite era o saldo ainda bater com o que a
-- movimentacao deixou -- ou seja, a protecao contra erro acidental, nao
-- contra abuso.
--
-- seed_default_cost_centers tem o mesmo formato (SECURITY DEFINER, sem guarda)
-- e o mesmo grant herdado, mas o dano e menor: so insere linhas de centro de
-- custo faltantes numa loja.
--
-- Ordem de aplicacao: depois de 20260927000014_global_admin_delete_auth_user.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers internos: somente o dono executa.
--
-- Nao ha GRANT aauthenticated aqui de proposito. global_admin_delete continua
-- funcionando porque e SECURITY DEFINER: quando ela chama o helper, roda
-- como postgres, que e o owner e sempre pode executar.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.restore_stock_after_delete(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.seed_default_cost_centers(UUID)
  FROM PUBLIC, anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Defense in depth: a guarda no corpo, para quem fechar a sessao e chegar
-- direto no helper. Um usuario comum nao deveria nem conseguir invocar, mas
-- se um dia o GRANT voltar, a funcao recusa em vez de reverter.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_stock_after_delete(
  p_store_id UUID,
  p_reference_type TEXT,
  p_reference_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_group RECORD;
  v_chamador UUID := auth.uid();
BEGIN
  -- global_admin_delete e SECURITY DEFINER, entao chega aqui com auth.uid()
  -- do usuario que a chamou, mas executando como postgres. O unico caller
  -- legit e a propria global_admin_delete, que ja checa is_global_admin
  -- antes de chegar. Qualquer outro caminho e chamada direta e nao passa.
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_chamador AND is_global_admin
  ) THEN
    RAISE EXCEPTION
      'restauracao de saldo restrita a global admin. Use a exclusao global '
      'ou chame create_order_with_stock / restore_sale_stock.';
  END IF;

  -- Um grupo por produto: da primeira a ultima movimentacao do registro.
  FOR v_group IN
    SELECT m.product_id,
           (ARRAY_AGG(m.previous_quantity ORDER BY m.created_at, m.id))[1] AS restore_to,
           (ARRAY_AGG(m.new_quantity ORDER BY m.created_at DESC, m.id DESC))[1] AS expected_current,
           COUNT(*) AS movements
    FROM public.stock_movements m
    WHERE m.store_id = p_store_id
      -- Case-insensitive de proposito: os pedidos ja gravados no banco
      -- usavam reference_type 'ORDER' (maiusculo) de uma versao anterior do
      -- fluxo, enquanto create_order_with_stock grava 'order'.
      AND UPPER(m.reference_type) = UPPER(p_reference_type)
      AND m.reference_id = p_reference_id
      AND m.previous_quantity IS NOT NULL
      AND m.new_quantity IS NOT NULL
    GROUP BY m.product_id
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.stock_balances sb
                   WHERE sb.store_id = p_store_id AND sb.product_id = v_group.product_id) THEN
      -- Sem linha de saldo nao ha o que reverter.
      CONTINUE;
    END IF;

    IF v_group.expected_current IS NULL THEN
      -- Movimentacao sem saldo registrado (log sem efeito no estoque).
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.stock_balances sb
      WHERE sb.store_id = p_store_id
        AND sb.product_id = v_group.product_id
        AND sb.quantity = v_group.expected_current
    ) THEN
      RAISE EXCEPTION
        'Nao foi possivel remover: o saldo do produto mudou depois deste registro. Estoque % ja foi movimentado.',
        v_group.product_id;
    END IF;

    UPDATE public.stock_balances
    SET quantity = v_group.restore_to,
        updated_at = NOW()
    WHERE store_id = p_store_id
      AND product_id = v_group.product_id;

    -- Um lote que a movimentacao esvaziou volta a ficar ativo.
    UPDATE public.stock_batches sb
    SET quantity = sb.quantity + COALESCE((
          SELECT SUM(m.quantity) FROM public.stock_movements m
          WHERE m.store_id = p_store_id
            AND m.product_id = v_group.product_id
            AND UPPER(m.reference_type) = UPPER(p_reference_type)
            AND m.reference_id = p_reference_id
            AND m.movement_type IN ('SALE', 'EXIT', 'LOSS', 'DAMAGE', 'EXPIRATION')
        ), 0),
        status = CASE
          WHEN sb.status = 'DEPLETED'::batch_status_enum
               AND sb.quantity + COALESCE((
                 SELECT SUM(m.quantity) FROM public.stock_movements m
                 WHERE m.store_id = p_store_id
                   AND m.product_id = v_group.product_id
                   AND UPPER(m.reference_type) = UPPER(p_reference_type)
                   AND m.reference_id = p_reference_id
                   AND m.movement_type IN ('SALE', 'EXIT', 'LOSS', 'DAMAGE', 'EXPIRATION')
               ), 0) > 0
          THEN 'ACTIVE'::batch_status_enum
          ELSE sb.status
        END,
        updated_at = NOW()
    WHERE sb.store_id = p_store_id
      AND sb.product_id = v_group.product_id
      AND EXISTS (
        SELECT 1 FROM public.stock_movements m
        WHERE m.store_id = p_store_id
          AND m.product_id = v_group.product_id
          AND UPPER(m.reference_type) = UPPER(p_reference_type)
          AND m.reference_id = p_reference_id
          AND m.movement_type IN ('SALE', 'EXIT', 'LOSS', 'DAMAGE', 'EXPIRATION')
          AND m.batch_id = sb.id
      );
  END LOOP;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.restore_stock_after_delete(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;
