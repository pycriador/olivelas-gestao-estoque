-- =============================================================================
-- MIGRATION: 20260927000011_harden_grants_and_legacy_rpcs.sql
-- Fecha dois problemas que a auditoria do banco de producao revelou.
--
-- 1) GRANT EXECUTE ... TO anon em todas as funcoes do schema public.
--    As migrations anteriores faziam `REVOKE ALL ... FROM PUBLIC` e
--    `GRANT EXECUTE ... TO authenticated`, o que nao basta: o setup do
--    Supabase tem um GRANT EXECUTE explicito para o role anon, e um grant
--    direto so sai com REVOKE desse mesmo role. As funcoes SECURITY DEFINER
--    de estoque e venda ficavam executaveis por qualquer visitante com a
--    chave publica do app, sem sessao e sem passar por login.
--
-- 2) process_sale_stock_deduction, a funcao legada que criava estoque
--    negativo. Ela e a origem do historico de saldos quebrados: quando nao
--    existia linha em stock_balances, inseria a linha JA com valor negativo
--    (`VALUES (..., -v_item.quantity, 0)`) em vez de recusar, e nao validava
--    saldo antes de debitar. Nenhum trigger, nenhuma outra funcao e nenhum
--    bundle a chamam desde que create_order_with_stock assumiu a venda
--    inteira em uma transacao.
--
-- Ordem de aplicacao: depois de 20260926000010_global_admin_delete.sql.
--
-- has_store_access e has_store_role ficam de fora de proposito: sao
-- predicados de somente leitura, devolvem falso para anon e nao expõem
-- dado algum.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Executar privileged exige sessao
--
-- O catalogo publico nao e afetado: ele le a tabela products direto pelo
-- PostgREST e nao chama nenhuma RPC.
--
-- O revogo e seguido de grant explicito para o que o app usa de verdade.
-- Isso nao e redundancia: 003 criou restore_sale_stock e
-- receive_purchase_order_stock sem nenhum GRANT, e as duas so funcionavam
-- porque o Supabase da EXECUTE para todo mundo no schema public -- o mesmo
-- grant que estava deixando tudo exposto para anon. Sem o grant explicito,
-- revogar anon derrubaria junto o acesso de quem esta logado.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.apply_stock_movement(
  uuid, stock_movement_type_enum, numeric, uuid, text, date, numeric,
  text, text, uuid, text, uuid, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_stock_movement(
  uuid, stock_movement_type_enum, numeric, uuid, text, date, numeric,
  text, text, uuid, text, uuid, text, text
) TO authenticated;

REVOKE ALL ON FUNCTION public.clear_batch_disposition(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_batch_disposition(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.create_order_with_stock(
  uuid, uuid, text, text, jsonb, numeric, numeric, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_with_stock(
  uuid, uuid, text, text, jsonb, numeric, numeric, text, text
) TO authenticated;

-- Wrapper de compatibilidade para o bundle ja publicado, que ainda passa
-- 10 argumentos.
REVOKE ALL ON FUNCTION public.create_order_with_stock(
  uuid, uuid, text, text, jsonb, numeric, numeric, text, text, boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_with_stock(
  uuid, uuid, text, text, jsonb, numeric, numeric, text, text, boolean
) TO authenticated;

REVOKE ALL ON FUNCTION public.generate_stock_alerts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_stock_alerts(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.global_admin_delete(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.global_admin_delete(text, uuid) TO authenticated;

-- Chamadas pelo app: receber compra e reverter venda cancelada.
REVOKE ALL ON FUNCTION public.receive_purchase_order_stock(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.receive_purchase_order_stock(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.restore_sale_stock(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_sale_stock(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.set_batch_disposition(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_batch_disposition(uuid, text, text) TO authenticated;

-- Sem grant de proposito: seed_default_cost_centers so roda por trigger e
-- backfill, e restore_stock_after_delete so e chamada por global_admin_delete
-- (SECURITY DEFINER, executa com o privilegio do dono). O frontend nunca
-- chama as duas diretamente.
REVOKE ALL ON FUNCTION public.restore_stock_after_delete(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.seed_default_cost_centers(uuid) FROM PUBLIC, anon;


-- -----------------------------------------------------------------------------
-- 2. A funcao legada perde o acesso E a capacidad de corromper
--
-- Revogar execucao ja impede o dano por fora. O guard interno vai alem:
-- se alguem reativar a chamada adiante (um trigger, um script de
-- correcao), a funcao recusa em vez de debitar o que nao existe.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_sale_stock_deduction(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item RECORD;
  v_current_stock NUMERIC(12, 3);
  v_store_id UUID;
  v_order_status order_status_enum;
BEGIN
  SELECT store_id, status INTO v_store_id, v_order_status
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido % nao encontrado', p_order_id;
  END IF;

  IF v_order_status = 'CANCELLED' THEN
    RAISE EXCEPTION 'Nao e possivel baixar estoque de um pedido cancelado';
  END IF;

  -- A venda inteira ja acontece em create_order_with_stock, com trava de
  -- linha, validacao de saldo e rollback. Chamar esta funcao sobre um pedido
  -- criado por ali debitaria o estoque uma segunda vez.
  IF EXISTS (
    SELECT 1 FROM public.stock_movements m
    WHERE m.store_id = v_store_id
      AND UPPER(m.reference_type) IN ('ORDER', 'ORDER_CANCELLATION')
      AND m.reference_id = p_order_id::TEXT
  ) THEN
    RAISE EXCEPTION
      'Este pedido ja teve o estoque baixado. Use restore_sale_stock para reverter.';
  END IF;

  FOR v_item IN
    SELECT oi.product_id, oi.batch_id, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    SELECT quantity INTO v_current_stock
    FROM public.stock_balances
    WHERE store_id = v_store_id AND product_id = v_item.product_id
    FOR UPDATE;

    -- Antes, a linha ausente virava INSERT com saldo negativo. Agora a
    -- linha ausente e recusa: produto sem saldo nao tem o que debitar.
    IF v_current_stock IS NULL THEN
      RAISE EXCEPTION
        'Produto % nao tem saldo em estoque nesta loja.', v_item.product_id;
    END IF;

    IF v_current_stock < v_item.quantity THEN
      RAISE EXCEPTION
        'Estoque insuficiente para o produto %: disponivel %, pedido %.',
        v_item.product_id, v_current_stock, v_item.quantity;
    END IF;

    UPDATE public.stock_balances
    SET quantity = quantity - v_item.quantity,
        updated_at = NOW()
    WHERE store_id = v_store_id AND product_id = v_item.product_id;

    IF v_item.batch_id IS NOT NULL THEN
      UPDATE public.stock_batches
      SET quantity = GREATEST(0, quantity - v_item.quantity),
          status = CASE
            WHEN quantity - v_item.quantity <= 0 THEN 'DEPLETED'::batch_status_enum
            ELSE status
          END,
          updated_at = NOW()
      WHERE id = v_item.batch_id;
    END IF;

    INSERT INTO public.stock_movements (
      store_id, product_id, batch_id, movement_type, quantity,
      previous_quantity, new_quantity, reference_id, reference_type,
      notes, user_id
    ) VALUES (
      v_store_id, v_item.product_id, v_item.batch_id, 'SALE', v_item.quantity,
      v_current_stock, v_current_stock - v_item.quantity,
      p_order_id::TEXT, 'ORDER', 'Baixa automatica de venda (funcao legada)',
      auth.uid()
    );
  END LOOP;

  UPDATE public.orders
  SET status = 'CONFIRMED', updated_at = NOW()
  WHERE id = p_order_id;

  RETURN TRUE;
END;
$$;

-- -----------------------------------------------------------------------------
-- 1b. Corta o grant automatico, para nao voltar no proximo deploy
--
-- Os REVOKE acima so tratam das funcoes que existem hoje. O padrao do
-- Postgres da EXECUTE a PUBLIC em TODA funcao recem-criada, e o setup do
-- Supabase ainda soma um `anon=X` explicito por default. Sem cortar os dois,
-- a proxima migration que criar uma RPC volta a expor para visitante sem
-- sessao, e nem um teste escrito contra a lista fixa de hoje acusaria.
--
-- O ALTER DEFAULT PRIVILEGES resolve o `anon=X` do Supabase, mas NAO resolve
-- o PUBLIC: o EXECUTE para PUBLIC em funcao e um default implicito do
-- Postgres, e o `pg_default_acl` gerado pelo REVOKE FROM PUBLIC e
-- descartado por ser igual ao default. Verificado no PG 17: apos o comando,
-- `pg_default_acl` fica vazio e a funcao nova continua executavel por anon.
--
-- O event trigger e o que fecha de verdade. Ele roda em ddl_command_end e
-- revoga PUBLIC/anon de cada funcao recem-criada em public, antes que
-- qualquer requisicao a alcance. Consequencia: toda RPC nova precisa de
-- GRANT EXECUTE ... TO authenticated na propria migration. E o que 006 a
-- 011 fazem.
--
-- O trigger e restrito a CREATE FUNCTION no schema public: nao mexe em
-- tabelas, sequences, nem em funcoes de outros schemas (storage, auth).
-- O catalogo publico continua funcionando porque le a tabela products pelo
-- PostgREST, sem passar por RPC.
-- -----------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;

-- O Supabase tambem cria default privileges para o role supabase_admin, e
-- sao eles que dao o `anon=X` automatico. Mas o role postgres NAO e membro de
-- supabase_admin: a revogacao direta falha com "permission denied to change
-- default privileges" (verificado no projeto real). Como nao podemos mudar
-- o default de um role alheio, o event trigger acima e o que garante o
-- resultado -- ele roda em ddl_command_end, ja com o privilege do owner da
-- nova funcao, e nao depende de default privilege nenhum.
--
-- O bloco abaixo tenta mesmo assim, e ignora a recusa: se rodar em um
-- Postgres onde o role tem permissao, ajuda; se nao, o trigger cobre.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    BEGIN
      EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
               REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE
        'default privileges de supabase_admin mantidos (sem permissao); '
        'trg_revoke_default_function_exec cobre o schema public.';
    END;
  END IF;
END;
$$;

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
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon',
                     v_cmd.object_identity);
    END IF;
  END LOOP;
END;
$$;

-- IF NOT EXISTS nao existe para CREATE EVENT TRIGGER; o DO abaixo torna a
-- migration reexecutavel.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_event_trigger WHERE evtname = 'trg_revoke_default_function_exec') THEN
    CREATE EVENT TRIGGER trg_revoke_default_function_exec
      ON ddl_command_end
      WHEN TAG IN ('CREATE FUNCTION')
      EXECUTE FUNCTION public.fn_revoke_default_function_exec();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_revoke_default_function_exec() FROM PUBLIC, anon;

-- A legada perde a execucao de todo mundo:
REVOKE ALL ON FUNCTION public.process_sale_stock_deduction(uuid) FROM PUBLIC, anon, authenticated;
