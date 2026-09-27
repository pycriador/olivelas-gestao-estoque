-- =============================================================================
-- MIGRATION: 20260926000008_stock_alerts.sql
-- Gera alertas automaticos de validade (7/30 dias), estoque baixo, ruptura e
-- reposicao na tela /notifications.
--
-- A geracao e idempotente: cada condicao produz uma chave estavel
-- (dedupe_key) e a RPC sincroniza - insere/atualiza o que ainda vale e remove
-- o que deixou de valer. A trilha real continua em audit_logs.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Colunas de alerta automatico em notifications
-- -----------------------------------------------------------------------------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS severity SMALLINT NOT NULL DEFAULT 1;

-- A tela de notificacoes e store-scoped (markAllAsRead atualiza a loja
-- inteira), entao alertas automaticos sao da loja, nao de um usuario.
ALTER TABLE public.notifications ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN public.notifications.dedupe_key IS
  'Chave estavel do alerta automatico. NULL em notificacoes manuais.';
COMMENT ON COLUMN public.notifications.source IS
  'MANUAL (criada no app) ou AUTO (gerada por generate_stock_alerts).';
COMMENT ON COLUMN public.notifications.severity IS
  '1=info, 2=atencao, 3=critico. Usado para reabrir o alerta quando escala.';
COMMENT ON COLUMN public.notifications.user_id IS
  'NULL em alertas automaticos, que sao da loja inteira.';

-- So alertas automaticos sao unicos; manuais ficam livres (NULL nunca colide).
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_dedupe_key
  ON public.notifications (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_auto
  ON public.notifications (store_id, source)
  WHERE source = 'AUTO';

-- -----------------------------------------------------------------------------
-- 2. RPC: sincroniza os alertas automaticos da loja
--
-- SECURITY DEFINER porque notifications nao tem policy de INSERT/DELETE: a
-- RPC e o unico caminho de escrita e a guarda has_store_access() abaixo e a
-- checagem de acesso. Quem nao tem acesso a loja recebe erro.
-- search_path fixo evita hijack de schema.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_stock_alerts(p_store_id UUID)
RETURNS TABLE (
  expiring_7d BIGINT,
  expiring_30d BIGINT,
  low_stock BIGINT,
  out_of_stock BIGINT,
  reorder BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  IF p_store_id IS NULL THEN
    RAISE EXCEPTION 'Loja nao informada para geracao de alertas';
  END IF;

  -- Guarda de acesso. vale_global_admin passa por has_store_access.
  IF NOT public.has_store_access(p_store_id) THEN
    RAISE EXCEPTION 'Sem acesso a loja %', p_store_id;
  END IF;

  ------------------------------------------------------------------
  -- Alertas desejados: validades + saldos, com chave estavel por condicao
  ------------------------------------------------------------------
  -- ON COMMIT DROP so limpa no fim da transacao. Chamadas repetidas dentro
  -- da MESMA transacao (ou duas sincronizacoes no mesmo request) colidiam
  -- com "relacao _desired_alerts ja existe", entao o DROP e explicito.
  DROP TABLE IF EXISTS _desired_alerts;

  CREATE TEMP TABLE _desired_alerts ON COMMIT DROP AS
  WITH stock AS (
    -- Saldo disponivel por produto. O LEFT JOIN cobre produtos que nunca
    -- tiveram movimentacao (sem linha em stock_balances).
    SELECT
      p.id AS product_id,
      p.store_id,
      p.name,
      p.sku,
      p.min_stock,
      p.max_stock,
      COALESCE(sb.available_quantity, 0) AS available
    FROM public.products p
    LEFT JOIN public.stock_balances sb
      ON sb.product_id = p.id
     AND sb.store_id = p.store_id
    WHERE p.store_id = p_store_id
      AND p.deleted_at IS NULL
      AND p.is_active = TRUE
  ),
  batches AS (
    SELECT
      sb.id AS batch_id,
      sb.store_id,
      sb.lot_number,
      sb.quantity,
      sb.expiration_date,
      p.name AS product_name,
      p.sku,
      (sb.expiration_date - v_today) AS days_left
    FROM public.stock_batches sb
    JOIN public.products p
      ON p.id = sb.product_id
     AND p.deleted_at IS NULL
    WHERE sb.store_id = p_store_id
      AND sb.expiration_date IS NOT NULL
      -- Janela de 30 dias, incluindo o que ja venceu (dias negativos).
      AND sb.expiration_date <= v_today + 30
      -- Lote baixado, bloqueado ou sem saldo nao gera alerta novo.
      AND sb.quantity > 0
      AND sb.status = 'ACTIVE'
  )
  -- Validade <= 7 dias (ou ja vencido). Uma chave por lote; a severidade
  -- escala sozinha conforme os dias passam.
  SELECT
    ('expiry:' || b.batch_id::TEXT) AS dedupe_key,
    'EXPIRING_7D'::TEXT AS type,
    3::SMALLINT AS severity,
    CASE
      WHEN b.days_left < 0 THEN
        'Lote "' || b.product_name || '" (' || b.lot_number || ') venceu ha '
        || ABS(b.days_left) || ' dia(s)'
      ELSE
        'Lote "' || b.product_name || '" (' || b.lot_number || ') vence em '
        || b.days_left || ' dia(s)'
    END AS title,
    'Quantidade em estoque: ' || b.quantity
      || ' | SKU ' || COALESCE(b.sku, '-')
      || ' | Vencimento: ' || b.expiration_date AS message,
    jsonb_build_object(
      'kind', 'expiry',
      'batch_id', b.batch_id,
      'product_name', b.product_name,
      'sku', b.sku,
      'lot_number', b.lot_number,
      'quantity', b.quantity,
      'expiration_date', b.expiration_date,
      'days_left', b.days_left
    ) AS metadata
  FROM batches b
  WHERE b.days_left <= 7

  UNION ALL

  -- Validade entre 8 e 30 dias
  SELECT
    ('expiry:' || b.batch_id::TEXT),
    'EXPIRING_30D'::TEXT,
    2::SMALLINT,
    'Lote "' || b.product_name || '" (' || b.lot_number || ') vence em '
      || b.days_left || ' dia(s)',
    'Quantidade em estoque: ' || b.quantity
      || ' | SKU ' || COALESCE(b.sku, '-')
      || ' | Vencimento: ' || b.expiration_date,
    jsonb_build_object(
      'kind', 'expiry',
      'batch_id', b.batch_id,
      'product_name', b.product_name,
      'sku', b.sku,
      'lot_number', b.lot_number,
      'quantity', b.quantity,
      'expiration_date', b.expiration_date,
      'days_left', b.days_left
    )
  FROM batches b
  WHERE b.days_left > 7 AND b.days_left <= 30

  UNION ALL

  -- Ruptura: disponivel zerado
  SELECT
    ('stock:' || s.product_id::TEXT),
    'OUT_OF_STOCK'::TEXT,
    3::SMALLINT,
    'Produto "' || s.name || '" esta sem estoque',
    'SKU ' || COALESCE(s.sku, '-') || ' | Disponivel: ' || s.available
      || ' | Estoque minimo: ' || s.min_stock,
    jsonb_build_object(
      'kind', 'stock',
      'product_id', s.product_id,
      'product_name', s.name,
      'sku', s.sku,
      'available', s.available,
      'min_stock', s.min_stock,
      'max_stock', s.max_stock
    )
  FROM stock s
  WHERE s.available <= 0
    AND s.min_stock > 0

  UNION ALL

  -- Estoque baixo: ainda vende, mas ja tocou o minimo
  SELECT
    ('stock:' || s.product_id::TEXT),
    'LOW_STOCK'::TEXT,
    2::SMALLINT,
    'Estoque baixo: "' || s.name || '"',
    'Disponivel: ' || s.available || ' | Estoque minimo: ' || s.min_stock
      || ' | SKU ' || COALESCE(s.sku, '-'),
    jsonb_build_object(
      'kind', 'stock',
      'product_id', s.product_id,
      'product_name', s.name,
      'sku', s.sku,
      'available', s.available,
      'min_stock', s.min_stock,
      'max_stock', s.max_stock
    )
  FROM stock s
  WHERE s.available > 0
    AND s.min_stock > 0
    AND s.available <= s.min_stock

  UNION ALL

  -- Reposicao: sugestao de compra. Dispara na metade do estoque minimo,
  -- sugerindo repor ate o maximo cadastrado.
  SELECT
    ('reorder:' || s.product_id::TEXT),
    'REORDER_SUGGESTED'::TEXT,
    1::SMALLINT,
    'Reposicao sugerida: "' || s.name || '"',
    'Disponivel: ' || s.available
      || ' | Estoque minimo: ' || s.min_stock
      || ' | Sugestao de compra: ' || GREATEST(s.max_stock - s.available, 0)
      || ' un | SKU ' || COALESCE(s.sku, '-'),
    jsonb_build_object(
      'kind', 'reorder',
      'product_id', s.product_id,
      'product_name', s.name,
      'sku', s.sku,
      'available', s.available,
      'min_stock', s.min_stock,
      'max_stock', s.max_stock,
      'suggested_quantity', GREATEST(s.max_stock - s.available, 0)
    )
  FROM stock s
  WHERE s.max_stock > 0
    AND s.available <= GREATEST(s.min_stock / 2, 0.001);

  ------------------------------------------------------------------
  -- Insere/atualiza o que ainda vale
  --
  -- is_read so volta a false quando o alerta escala de severidade, para
  -- nao reabrir notificacoes que ja foram tratadas.
  ------------------------------------------------------------------
  INSERT INTO public.notifications (
    store_id, user_id, type, title, message, metadata, severity, source, dedupe_key
  )
  SELECT
    p_store_id,
    NULL,
    d.type,
    d.title,
    d.message,
    d.metadata,
    d.severity,
    'AUTO',
    d.dedupe_key
  FROM _desired_alerts d
  ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL
  DO UPDATE SET
    type = EXCLUDED.type,
    title = EXCLUDED.title,
    message = EXCLUDED.message,
    metadata = EXCLUDED.metadata,
    severity = EXCLUDED.severity,
    is_read = CASE
      WHEN EXCLUDED.severity > public.notifications.severity THEN FALSE
      ELSE public.notifications.is_read
    END;

  ------------------------------------------------------------------
  -- Remove o que deixou de valer (lote baixado, estoque normalizado)
  ------------------------------------------------------------------
  DELETE FROM public.notifications n
  WHERE n.store_id = p_store_id
    AND n.source = 'AUTO'
    AND n.dedupe_key IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM _desired_alerts d WHERE d.dedupe_key = n.dedupe_key
    );

  ------------------------------------------------------------------
  -- Resumo por condicao para a tela
  ------------------------------------------------------------------
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE d.severity = 3 AND d.metadata->>'kind' = 'expiry'),
    COUNT(*) FILTER (WHERE d.severity = 2 AND d.metadata->>'kind' = 'expiry'),
    COUNT(*) FILTER (WHERE d.type = 'LOW_STOCK'),
    COUNT(*) FILTER (WHERE d.type = 'OUT_OF_STOCK'),
    COUNT(*) FILTER (WHERE d.type = 'REORDER_SUGGESTED')
  FROM _desired_alerts d;

END;
$$;

COMMENT ON FUNCTION public.generate_stock_alerts(UUID) IS
  'Sincroniza alertas automaticos de validade/estoque/reposicao da loja.';

-- -----------------------------------------------------------------------------
-- 3. Grants: so usuarios autenticados podem rodar a sincronizacao
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.generate_stock_alerts(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_stock_alerts(UUID) TO authenticated;
