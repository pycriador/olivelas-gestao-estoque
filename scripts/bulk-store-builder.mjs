#!/usr/bin/env node
/**
 * ============================================================================
 * OLIVELAS — BULK STORE & BRANCH BUILDER (CLI + AI ORCHESTRATOR)
 * ============================================================================
 * Criação em massa de Loja Matriz, Filiais, Administradores, Fornecedores,
 * Categorias, Produtos, Fotos Royalty-Free (Supabase Storage + Galeria),
 * Saldos de Estoque, Lotes com Validade e Movimentações.
 *
 * Modos de uso:
 *   1) Via arquivo JSON de especificação:
 *      node scripts/bulk-store-builder.mjs --spec scripts/specs/primor.json
 *
 *   2) Via prompt em linguagem natural (usa a IA da Loja / Cofre Supabase):
 *      node scripts/bulk-store-builder.mjs --prompt "Criar matriz Primor com filiais P1 a P5..."
 *
 *   3) Simulação sem gravar no banco (Dry-Run):
 *      node scripts/bulk-store-builder.mjs --spec scripts/specs/primor.json --dry-run
 * ============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';

const { Client } = pg;

const DEFAULT_SUPABASE_URL = 'https://mffrafqyjbjitlhjnlai.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_NfhTi2u06ypAJzlqHms5ug_MW_8bLlQ';

const ALL_PLATFORM_MODULES = [
  'MOD_CATALOG_WA',
  'MOD_POS_SALES',
  'MOD_INVENTORY',
  'MOD_EXPIRATION',
  'MOD_CUSTOMERS',
  'MOD_SUPPLIERS',
  'MOD_PURCHASING',
  'MOD_REPORTS',
  'MOD_TEAM_AUDIT',
  'MOD_API_INTEGRATIONS',
  'MOD_AI_COPILOT_CHAT',
  'MOD_AI_SALES_CRM',
  'MOD_AI_INVENTORY_EXPIRATION',
  'MOD_AI_PURCHASING_TRENDS',
  'MOD_AI_BI_INSIGHTS',
];

/**
 * Catálogo curado de fotos sem direitos autorais (Unsplash License / CC0)
 * para correspondência automática por palavras-chave do nome do produto.
 */
export const ROYALTY_FREE_IMAGE_CATALOG = [
  {
    keywords: ['refrigerante lata', 'coca lata', 'soda can', 'lata'],
    url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80',
    defaultSellingPrice: 6.0,
    defaultCostPrice: 3.5,
    category: 'Bebidas & Sucos',
  },
  {
    keywords: ['refrigerante pequeno', 'caculinha', 'caçulinha', '200ml', 'garrafinha', 'refrigerante'],
    url: 'https://images.unsplash.com/photo-1581006852262-e4307cf6283a?auto=format&fit=crop&w=800&q=80',
    defaultSellingPrice: 4.5,
    defaultCostPrice: 2.5,
    category: 'Bebidas & Sucos',
  },
  {
    keywords: ['agua sem gas', 'água sem gás', 'agua mineral', 'água mineral', 'agua', 'água'],
    url: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=800&q=80',
    defaultSellingPrice: 3.5,
    defaultCostPrice: 1.5,
    category: 'Bebidas & Sucos',
  },
  {
    keywords: ['guarana dolly', 'guaraná dolly', 'dolly', 'guarana', 'guaraná'],
    url: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?auto=format&fit=crop&w=800&q=80',
    defaultSellingPrice: 5.0,
    defaultCostPrice: 2.8,
    category: 'Bebidas & Sucos',
  },
  {
    keywords: ['suco natural', 'suco de laranja', 'suco', 'juice'],
    url: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=800&q=80',
    defaultSellingPrice: 8.0,
    defaultCostPrice: 4.2,
    category: 'Bebidas & Sucos',
  },
  {
    keywords: ['marmita a/b', 'marmita ab', 'marmita mista'],
    url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
    defaultSellingPrice: 15.0,
    defaultCostPrice: 8.5,
    category: 'Marmitas & Refeições',
  },
  {
    keywords: ['marmita a', 'prato executivo a', 'refeicao a'],
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    altUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    defaultSellingPrice: 15.0,
    defaultCostPrice: 8.5,
    category: 'Marmitas & Refeições',
  },
  {
    keywords: ['marmita b', 'prato executivo b', 'refeicao b'],
    url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
    altUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
    defaultSellingPrice: 15.0,
    defaultCostPrice: 8.5,
    category: 'Marmitas & Refeições',
  },
  {
    keywords: ['marmita', 'quentinha', 'pf', 'prato feito', 'almoco', 'almoço', 'refeicao', 'refeição'],
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    defaultSellingPrice: 18.0,
    defaultCostPrice: 10.0,
    category: 'Marmitas & Refeições',
  },
];

export function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function resolveProductMetadata(productName, sellingPrice = null) {
  const norm = String(productName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  for (const item of ROYALTY_FREE_IMAGE_CATALOG) {
    if (item.keywords.some((kw) => norm.includes(slugify(kw).replace(/-/g, ' ')) || norm.includes(kw))) {
      const price = sellingPrice && Number(sellingPrice) > 0 ? Number(sellingPrice) : item.defaultSellingPrice;
      const cost = Number((price * 0.56).toFixed(2));
      const useAlt = item.altUrl && price >= 20;
      return {
        imageUrl: useAlt ? item.altUrl : item.url,
        sellingPrice: price,
        costPrice: cost,
        categoryName: item.category,
      };
    }
  }

  const fallbackPrice = sellingPrice && Number(sellingPrice) > 0 ? Number(sellingPrice) : 12.0;
  return {
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    sellingPrice: fallbackPrice,
    costPrice: Number((fallbackPrice * 0.55).toFixed(2)),
    categoryName: 'Geral',
  };
}

function generateFallbackSvgBuffer(name, category = 'Catálogo Online') {
  const safeName = String(name || 'Produto').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeCat = String(category || 'Geral').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#0284c7"/>
      </linearGradient>
    </defs>
    <rect width="600" height="600" fill="url(#bg)" rx="32"/>
    <text x="300" y="280" font-family="sans-serif" font-size="36" font-weight="bold" fill="#ffffff" text-anchor="middle">${safeName}</text>
    <text x="300" y="340" font-family="sans-serif" font-size="22" fill="#bae6fd" text-anchor="middle">${safeCat}</text>
  </svg>`;
  return Buffer.from(svg, 'utf-8');
}

const imageDownloadCache = new Map();

async function downloadImageWithCache(url, productName, categoryName) {
  if (url && imageDownloadCache.has(url)) {
    return imageDownloadCache.get(url);
  }
  if (url) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) OlivelasBulkBuilder/1.0',
          Accept: 'image/jpeg,image/webp,image/png,image/*;q=0.8',
        },
      });
      clearTimeout(timer);
      if (res.ok) {
        const ab = await res.arrayBuffer();
        const buffer = Buffer.from(ab);
        if (buffer.length > 1000) {
          const contentType = res.headers.get('content-type') || 'image/jpeg';
          const ext = contentType.includes('png')
            ? 'png'
            : contentType.includes('webp')
              ? 'webp'
              : 'jpg';
          const result = { buffer, contentType, ext, source: 'royalty-free-web' };
          imageDownloadCache.set(url, result);
          return result;
        }
      }
    } catch {
      // Fallback below
    }
  }
  return {
    buffer: generateFallbackSvgBuffer(productName, categoryName),
    contentType: 'image/svg+xml',
    ext: 'svg',
    source: 'svg-fallback',
  };
}

async function connectPostgres() {
  const sqlPath = path.resolve(process.cwd(), '.sql');
  if (!fs.existsSync(sqlPath)) {
    throw new Error('Arquivo .sql de configuração de conexão não encontrado na raiz do projeto.');
  }
  const sqlRaw = fs.readFileSync(sqlPath, 'utf8');
  const cfg = Object.fromEntries(
    sqlRaw
      .trim()
      .split('\n')
      .map((line) => {
        const idx = line.indexOf('=');
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      })
  );

  const projectRef = cfg.host.split('.')[1];
  const regions = [
    'aws-0-us-east-1.pooler.supabase.com',
    'aws-0-sa-east-1.pooler.supabase.com',
    'aws-1-us-east-1.pooler.supabase.com',
    'aws-1-sa-east-1.pooler.supabase.com',
  ];

  for (const host of regions) {
    const client = new Client({
      host,
      port: 5432,
      database: cfg.database || 'postgres',
      user: `${cfg.user}.${projectRef}`,
      password: cfg.password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });
    try {
      await client.connect();
      return { client, projectRef };
    } catch {
      // try next region
    }
  }
  throw new Error('Não foi possível conectar ao pooler PostgreSQL do Supabase.');
}

/**
 * Usa a IA configurada no cofre da plataforma (public.ai_provider_configs)
 * para transformar um prompt em linguagem natural em um JSON de especificação BulkStoreSpec.
 */
async function generateSpecFromPromptWithStoreAi(client, userPrompt) {
  console.log('🤖 Consultando IA da Loja (Cofre Supabase public.ai_provider_configs)...');
  const { rows } = await client.query(`
    SELECT provider_code, default_model, base_url,
           CASE WHEN encrypted_api_key IS NOT NULL
                THEN pgp_sym_decrypt(encrypted_api_key::BYTEA, public.fn_internal_ai_vault_secret()::TEXT)
                ELSE NULL
           END AS api_key
    FROM public.ai_provider_configs
    WHERE is_enabled = true
    ORDER BY is_primary DESC, fallback_priority ASC
  `);

  const provider = rows.find((r) => r.api_key);
  if (!provider) {
    throw new Error('Nenhuma chave de API ativa encontrada em public.ai_provider_configs.');
  }

  const systemInstruction = `Você é o arquiteto de criação de redes de lojas em lote do ERP Olivelas.
Converta o pedido do usuário em um objeto JSON estrito no formato BulkStoreSpec:
{
  "headquarters": { "name": "...", "slug": "...", "description": "..." },
  "branches": [{ "name": "P1", "slug": "primor-p1", "branchCode": "P1" }],
  "admins": [{ "email": "...", "fullName": "...", "role": "STORE_ADMIN" }],
  "suppliers": [{ "key": "cozinha_a", "corporateName": "...", "tradeName": "..." }],
  "categories": [{ "key": "bebidas", "name": "Bebidas & Sucos", "slug": "bebidas-sucos" }],
  "defaultExpirationDate": "2026-12-31",
  "products": [
    {
      "name": "...",
      "sku": "...",
      "categoryKey": "...",
      "supplierKey": "...",
      "unit": "UN",
      "costPrice": 3.5,
      "sellingPrice": 6.0,
      "headquartersQty": 100,
      "branchQty": 100,
      "expirationDate": "2026-12-31",
      "isPublishedCatalog": true,
      "isActive": true
    }
  ]
}
Responda APENAS com o JSON puro, sem blocos markdown.`;

  if (provider.provider_code === 'GEMINI') {
    const model = provider.default_model || 'gemini-2.5-flash';
    const base = (provider.base_url || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
    const url = `${base}/models/${model}:generateContent?key=${encodeURIComponent(provider.api_key.trim())}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      return JSON.parse(cleaned);
    }
  }
  throw new Error('Provedor de IA não retornou JSON válido; use --spec com arquivo JSON.');
}

async function ensureUserAndAdminProfile(client, adminSpec) {
  const email = String(adminSpec.email || '').trim().toLowerCase();
  const fullName = String(adminSpec.fullName || email.split('@')[0]).trim();

  const existingProfile = await client.query(
    `SELECT id, email, full_name FROM public.profiles WHERE LOWER(email) = $1 LIMIT 1`,
    [email]
  );

  let userId;
  if (existingProfile.rows.length > 0) {
    userId = existingProfile.rows[0].id;
  } else {
    const existingAuth = await client.query(
      `SELECT id FROM auth.users WHERE LOWER(email) = $1 LIMIT 1`,
      [email]
    );
    if (existingAuth.rows.length > 0) {
      userId = existingAuth.rows[0].id;
    } else {
      userId = crypto.randomUUID();
      const defaultPass = adminSpec.password || 'Mudar@12345';
      await client.query(
        `INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password,
          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
          '00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', $2,
          extensions.crypt($3, extensions.gen_salt('bf')), NOW(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('full_name', $4::text), NOW(), NOW()
        )`,
        [userId, email, defaultPass, fullName]
      );
    }

    await client.query(
      `INSERT INTO public.profiles (id, email, full_name, is_global_admin, created_at, updated_at)
       VALUES ($1, $2, $3, false, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name)`,
      [userId, email, fullName]
    );
  }

  // Garantir que o administrador tenha todos os módulos liberados em user_permission_profiles
  await client.query(
    `INSERT INTO public.user_permission_profiles (
      user_id, enabled_modules, enforce_over_store_admin, payment_status, updated_at
    ) VALUES ($1, $2, false, 'EXEMPT', NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET enabled_modules = $2,
        updated_at = NOW()`,
    [userId, ALL_PLATFORM_MODULES]
  );

  return { userId, email, fullName };
}

async function upsertStoreUnit(client, unitSpec, parentStoreId = null) {
  const isBranch = Boolean(parentStoreId || unitSpec.isBranch);
  const slug = slugify(unitSpec.slug || (parentStoreId ? `filial-${unitSpec.name}` : unitSpec.name));
  const branchCode = unitSpec.branchCode ? String(unitSpec.branchCode).trim().toUpperCase() : isBranch ? String(unitSpec.name).trim().toUpperCase() : null;

  const existing = await client.query(
    `SELECT id FROM public.stores WHERE slug = $1 LIMIT 1`,
    [slug]
  );

  let storeId;
  if (existing.rows.length > 0) {
    storeId = existing.rows[0].id;
    await client.query(
      `UPDATE public.stores
       SET name = $1,
           document = COALESCE($2, document),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           whatsapp = COALESCE($5, whatsapp),
           description = COALESCE($6, description),
           is_branch = $7,
           parent_store_id = $8,
           branch_code = $9,
           is_active = true,
           deleted_at = null,
           updated_at = NOW()
       WHERE id = $10`,
      [
        unitSpec.name,
        unitSpec.document || null,
        unitSpec.email || null,
        unitSpec.phone || null,
        unitSpec.whatsapp || null,
        unitSpec.description || null,
        isBranch,
        parentStoreId,
        branchCode,
        storeId,
      ]
    );
  } else {
    const inserted = await client.query(
      `INSERT INTO public.stores (
        name, slug, document, email, phone, whatsapp, description,
        is_branch, parent_store_id, branch_code, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      RETURNING id`,
      [
        unitSpec.name,
        slug,
        unitSpec.document || null,
        unitSpec.email || null,
        unitSpec.phone || null,
        unitSpec.whatsapp || null,
        unitSpec.description || null,
        isBranch,
        parentStoreId,
        branchCode,
      ]
    );
    storeId = inserted.rows[0].id;
  }

  return {
    id: storeId,
    name: unitSpec.name,
    slug,
    isBranch,
    parentStoreId,
    branchCode,
  };
}

async function populateStoreCatalogAndInventory({
  client,
  store,
  admins,
  suppliersSpec,
  categoriesSpec,
  productsSpec,
  defaultExpirationDate,
  defaultManufacturingDate,
}) {
  const storeId = store.id;
  const primaryAdminId = admins[0]?.userId || null;

  // 1. Vincular todos os administradores como STORE_ADMIN na unidade
  for (const adm of admins) {
    await client.query(
      `INSERT INTO public.store_users (
        store_id, user_id, role, job_title, can_approve_writeoff, is_active, updated_at
      ) VALUES ($1, $2, 'STORE_ADMIN', 'Administrador Geral', true, true, NOW())
      ON CONFLICT (store_id, user_id) DO UPDATE
      SET role = 'STORE_ADMIN',
          can_approve_writeoff = true,
          is_active = true,
          updated_at = NOW()`,
      [storeId, adm.userId]
    );
  }

  // 2. Garantir Centros de Custo padrão para a unidade
  const defaultCostCenters = [
    { code: 'COZ-01', name: 'Cozinha & Produção', category: 'OPERATIONAL' },
    { code: 'PDV-02', name: 'Frente de Caixa & Atendimento', category: 'COMMERCIAL' },
    { code: 'LOG-03', name: 'Estoque & Expedição', category: 'LOGISTICS' },
  ];
  for (const cc of defaultCostCenters) {
    await client.query(
      `INSERT INTO public.cost_centers (store_id, code, name, category, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (store_id, code) DO NOTHING`,
      [storeId, cc.code, cc.name, cc.category]
    );
  }

  // 3. Cadastrar Fornecedores na unidade
  const supplierMap = new Map();
  for (const sup of suppliersSpec) {
    const corpName = sup.corporateName || sup.tradeName || sup.name;
    const tradeName = sup.tradeName || sup.name || corpName;
    const existingSup = await client.query(
      `SELECT id FROM public.suppliers
       WHERE store_id = $1 AND (LOWER(trade_name) = LOWER($2) OR LOWER(corporate_name) = LOWER($3))
       AND deleted_at IS NULL
       LIMIT 1`,
      [storeId, tradeName, corpName]
    );

    let supId;
    if (existingSup.rows.length > 0) {
      supId = existingSup.rows[0].id;
      await client.query(
        `UPDATE public.suppliers
         SET corporate_name = $1,
             trade_name = $2,
             document = COALESCE($3, document),
             contact_name = COALESCE($4, contact_name),
             phone = COALESCE($5, phone),
             email = COALESCE($6, email),
             notes = COALESCE($7, notes),
             status = 'ACTIVE',
             updated_at = NOW()
         WHERE id = $8`,
        [
          corpName,
          tradeName,
          sup.document || null,
          sup.contactName || null,
          sup.phone || null,
          sup.email || null,
          sup.notes || null,
          supId,
        ]
      );
    } else {
      const insSup = await client.query(
        `INSERT INTO public.suppliers (
          store_id, corporate_name, trade_name, document,
          contact_name, phone, email, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE')
        RETURNING id`,
        [
          storeId,
          corpName,
          tradeName,
          sup.document || null,
          sup.contactName || null,
          sup.phone || null,
          sup.email || null,
          sup.notes || null,
        ]
      );
      supId = insSup.rows[0].id;
    }

    supplierMap.set(sup.key || slugify(tradeName), supId);
    supplierMap.set(tradeName.toLowerCase(), supId);
  }

  // 4. Cadastrar Categorias na unidade
  const categoryMap = new Map();
  for (const cat of categoriesSpec) {
    const catSlug = slugify(cat.slug || cat.name);
    const insCat = await client.query(
      `INSERT INTO public.categories (store_id, name, slug, deleted_at)
       VALUES ($1, $2, $3, null)
       ON CONFLICT (store_id, slug) DO UPDATE
       SET name = EXCLUDED.name, deleted_at = null, updated_at = NOW()
       RETURNING id`,
      [storeId, cat.name, catSlug]
    );
    const catId = insCat.rows[0].id;
    categoryMap.set(cat.key || catSlug, catId);
    categoryMap.set(cat.name.toLowerCase(), catId);
  }

  // 5. Cadastrar Produtos + Fotos Royalty-Free + Estoque + Lotes + Movimentações
  const createdProducts = [];
  for (let i = 0; i < productsSpec.length; i++) {
    const p = productsSpec[i];
    const autoMeta = resolveProductMetadata(p.name, p.sellingPrice);
    const sellingPrice = Number(p.sellingPrice ?? autoMeta.sellingPrice);
    const costPrice = Number(p.costPrice ?? autoMeta.costPrice);
    const margin =
      sellingPrice > 0
        ? Number((((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(2))
        : 0;

    const sku =
      p.sku ||
      `PRD-${String(i + 1).padStart(3, '0')}-${Math.round(sellingPrice * 100)}`;

    let categoryId =
      categoryMap.get(p.categoryKey) ||
      categoryMap.get(String(p.categoryName || autoMeta.categoryName).toLowerCase()) ||
      null;

    if (!categoryId) {
      const fallbackCatName = p.categoryName || autoMeta.categoryName || 'Geral';
      const fallbackCatSlug = slugify(fallbackCatName);
      const cRes = await client.query(
        `INSERT INTO public.categories (store_id, name, slug)
         VALUES ($1, $2, $3)
         ON CONFLICT (store_id, slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [storeId, fallbackCatName, fallbackCatSlug]
      );
      categoryId = cRes.rows[0].id;
      categoryMap.set(fallbackCatName.toLowerCase(), categoryId);
    }

    const supplierId =
      supplierMap.get(p.supplierKey) ||
      supplierMap.get(String(p.supplierName || '').toLowerCase()) ||
      Array.from(supplierMap.values())[0] ||
      null;

    const qty = store.isBranch
      ? Number(
          p.branchQuantities?.[store.branchCode] ??
            p.branchQuantities?.[store.name] ??
            p.branchQty ??
            p.quantity ??
            0
        )
      : Number(p.headquartersQty ?? p.quantity ?? 0);

    const expDate = p.expirationDate || defaultExpirationDate || '2026-12-31';
    const mfgDate = p.manufacturingDate || defaultManufacturingDate || '2026-11-04';
    const minStock = Number(p.minStock ?? (store.isBranch ? Math.max(2, Math.floor(qty * 0.2)) : 10));
    const maxStock = Number(p.maxStock ?? Math.max(200, qty * 3));

    const prodRes = await client.query(
      `INSERT INTO public.products (
        store_id, name, sku, barcode, ean, description,
        category_id, supplier_id, cost_price, selling_price, margin_percentage,
        unit, min_stock, max_stock, controls_batch, controls_expiration,
        is_active, is_published_catalog, deleted_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, true, true,
        true, true, null, NOW()
      )
      ON CONFLICT (store_id, sku) DO UPDATE
      SET name = EXCLUDED.name,
          barcode = COALESCE(EXCLUDED.barcode, public.products.barcode),
          ean = COALESCE(EXCLUDED.ean, public.products.ean),
          description = COALESCE(EXCLUDED.description, public.products.description),
          category_id = EXCLUDED.category_id,
          supplier_id = EXCLUDED.supplier_id,
          cost_price = EXCLUDED.cost_price,
          selling_price = EXCLUDED.selling_price,
          margin_percentage = EXCLUDED.margin_percentage,
          unit = EXCLUDED.unit,
          min_stock = EXCLUDED.min_stock,
          max_stock = EXCLUDED.max_stock,
          controls_batch = true,
          controls_expiration = true,
          is_active = true,
          is_published_catalog = true,
          deleted_at = null,
          updated_at = NOW()
      RETURNING id`,
      [
        storeId,
        p.name,
        sku,
        p.barcode || null,
        p.description || `${p.name} — Disponível para venda e no catálogo online.`,
        categoryId,
        supplierId,
        costPrice,
        sellingPrice,
        margin,
        p.unit || 'UN',
        minStock,
        maxStock,
      ]
    );
    const productId = prodRes.rows[0].id;

    // 5.1. Foto Royalty-Free: upload para Supabase Storage + product_images + media_library
    const imageUrl = p.imageUrl || autoMeta.imageUrl;
    const imgData = await downloadImageWithCache(imageUrl, p.name, autoMeta.categoryName);
    const fileSlug = slugify(`${p.name}-${sku}`).slice(0, 48);
    const storagePath = `${storeId}/${productId}/catalog-${fileSlug}.${imgData.ext}`;

    const uploadRes = await fetch(
      `${DEFAULT_SUPABASE_URL}/storage/v1/object/products/${storagePath}`,
      {
        method: 'POST',
        headers: {
          apikey: DEFAULT_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${DEFAULT_SUPABASE_ANON_KEY}`,
          'Content-Type': imgData.contentType,
          'x-upsert': 'true',
          'Cache-Control': 'max-age=31536000',
        },
        body: imgData.buffer,
      }
    );

    const publicUrl = uploadRes.ok
      ? `${DEFAULT_SUPABASE_URL}/storage/v1/object/public/products/${storagePath}`
      : imageUrl;

    await client.query(`DELETE FROM public.product_images WHERE product_id = $1 AND store_id = $2`, [
      productId,
      storeId,
    ]);
    await client.query(
      `INSERT INTO public.product_images (
        product_id, store_id, storage_path, public_url, is_primary, display_order
      ) VALUES ($1, $2, $3, $4, true, 0)`,
      [productId, storeId, storagePath, publicUrl]
    );

    await client.query(
      `INSERT INTO public.media_library (
        store_id, file_name, storage_path, public_url, mime_type, size_bytes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (store_id, storage_path) DO UPDATE
      SET public_url = EXCLUDED.public_url,
          size_bytes = EXCLUDED.size_bytes`,
      [
        storeId,
        `${p.name} (${sku}).${imgData.ext}`,
        storagePath,
        publicUrl,
        imgData.contentType,
        imgData.buffer.length,
        primaryAdminId,
      ]
    );

    // 5.2. Saldo em stock_balances
    await client.query(
      `INSERT INTO public.stock_balances (store_id, product_id, quantity, reserved_quantity, updated_at)
       VALUES ($1, $2, $3, 0, NOW())
       ON CONFLICT (store_id, product_id) DO UPDATE
       SET quantity = EXCLUDED.quantity,
           reserved_quantity = 0,
           updated_at = NOW()`,
      [storeId, productId, qty]
    );

    // 5.3. Lote em stock_batches com validade 31/12/2026
    const unitPrefix = (store.branchCode || 'MTZ').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const lotNumber = `LT-${unitPrefix}-${sku}-202612`;

    const batchRes = await client.query(
      `INSERT INTO public.stock_batches (
        store_id, product_id, lot_number, quantity, cost_price,
        manufacturing_date, expiration_date, status, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', NOW())
      ON CONFLICT (store_id, product_id, lot_number) DO UPDATE
      SET quantity = EXCLUDED.quantity,
          cost_price = EXCLUDED.cost_price,
          manufacturing_date = EXCLUDED.manufacturing_date,
          expiration_date = EXCLUDED.expiration_date,
          status = 'ACTIVE',
          updated_at = NOW()
      RETURNING id`,
      [storeId, productId, lotNumber, qty, costPrice, mfgDate, expDate]
    );
    const batchId = batchRes.rows[0].id;

    // 5.4. Movimentação inicial de estoque (ENTRY)
    const existingMov = await client.query(
      `SELECT id FROM public.stock_movements
       WHERE store_id = $1 AND product_id = $2 AND batch_id = $3 AND movement_type = 'ENTRY'
       LIMIT 1`,
      [storeId, productId, batchId]
    );

    if (existingMov.rows.length === 0) {
      await client.query(
        `INSERT INTO public.stock_movements (
          store_id, product_id, batch_id, movement_type,
          quantity, previous_quantity, new_quantity, unit_cost,
          reference_type, notes, user_id, operator_id
        ) VALUES ($1, $2, $3, 'ENTRY', $4, 0, $4, $5, 'INITIAL_LOAD', $6, $7, $7)`,
        [
          storeId,
          productId,
          batchId,
          qty,
          costPrice,
          `Carga inicial em lote (${store.isBranch ? `Filial ${store.name}` : `Matriz ${store.name}`}) — Validade ${expDate}`,
          primaryAdminId,
        ]
      );
    }

    createdProducts.push({
      id: productId,
      name: p.name,
      sku,
      sellingPrice,
      costPrice,
      quantity: qty,
      expirationDate: expDate,
      lotNumber,
      publicUrl,
    });
  }

  // 6. Gerar alertas de estoque/validade e registrar auditoria
  try {
    await client.query(`SELECT public.generate_stock_alerts($1)`, [storeId]);
  } catch {
    // ignore if function not needed
  }

  await client.query(
    `INSERT INTO public.audit_logs (store_id, user_id, action, entity, entity_id, after_data)
     VALUES ($1, $2, $3, 'stores', $4, $5)`,
    [
      storeId,
      primaryAdminId,
      store.isBranch ? 'BULK_BRANCH_INITIALIZED' : 'BULK_HEADQUARTERS_INITIALIZED',
      storeId,
      JSON.stringify({
        storeName: store.name,
        slug: store.slug,
        isBranch: store.isBranch,
        admins: admins.map((a) => a.email),
        suppliersCount: suppliersSpec.length,
        productsCount: createdProducts.length,
        totalUnitsInStock: createdProducts.reduce((acc, item) => acc + item.quantity, 0),
        defaultExpirationDate,
      }),
    ]
  );

  return {
    store,
    suppliersCount: suppliersSpec.length,
    categoriesCount: categoriesSpec.length,
    productsCount: createdProducts.length,
    totalStockUnits: createdProducts.reduce((acc, item) => acc + item.quantity, 0),
    products: createdProducts,
  };
}

export async function runBulkStoreBuilder(options = {}) {
  const { specPath, promptText, dryRun = false, saveSpecPath } = options;

  const { client } = await connectPostgres();
  try {
    let spec;
    if (specPath) {
      const resolved = path.resolve(process.cwd(), specPath);
      spec = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    } else if (promptText) {
      spec = await generateSpecFromPromptWithStoreAi(client, promptText);
      if (saveSpecPath) {
        fs.mkdirSync(path.dirname(path.resolve(process.cwd(), saveSpecPath)), { recursive: true });
        fs.writeFileSync(path.resolve(process.cwd(), saveSpecPath), JSON.stringify(spec, null, 2));
      }
    } else {
      throw new Error('Informe --spec <caminho.json> ou --prompt "<instrução>"');
    }

    console.log('========================================================================');
    console.log(`🚀 CRIAÇÃO EM LOTE DE LOJA & FILIAIS — MATRIZ: ${spec.headquarters.name}`);
    console.log('========================================================================');
    console.log(`• Matriz:         ${spec.headquarters.name} (/store/${slugify(spec.headquarters.slug || spec.headquarters.name)})`);
    console.log(`• Filiais (${(spec.branches || []).length}):    ${(spec.branches || []).map((b) => b.name).join(', ')}`);
    console.log(`• Admins (${(spec.admins || []).length}):     ${(spec.admins || []).map((a) => a.email).join(', ')}`);
    console.log(`• Fornecedores:   ${(spec.suppliers || []).map((s) => s.tradeName || s.name).join(', ')}`);
    console.log(`• Produtos/Loja:  ${(spec.products || []).length} itens (Validade padrão: ${spec.defaultExpirationDate || '2026-12-31'})`);

    if (dryRun) {
      console.log('\n[DRY-RUN] Simulação concluída com sucesso. Nenhum dado foi gravado.');
      return { dryRun: true, spec };
    }

    // Habilitar política temporária no Storage para upload das fotos dos produtos
    await client.query(`DROP POLICY IF EXISTS temp_bulk_store_upload_policy ON storage.objects`);
    await client.query(`
      CREATE POLICY temp_bulk_store_upload_policy ON storage.objects
      FOR ALL TO anon, authenticated
      USING (bucket_id = 'products')
      WITH CHECK (bucket_id = 'products')
    `);

    // 1. Resolver contas dos Administradores
    const resolvedAdmins = [];
    for (const adm of spec.admins || []) {
      const resolved = await ensureUserAndAdminProfile(client, adm);
      resolvedAdmins.push(resolved);
      console.log(`👤 Admin verificado: ${resolved.email} (${resolved.userId})`);
    }

    // 2. Criar/Atualizar Loja Matriz
    const hqStore = await upsertStoreUnit(client, spec.headquarters, null);
    console.log(`\n🏢 Matriz criada/atualizada: ${hqStore.name} (ID: ${hqStore.id} | Slug: /store/${hqStore.slug})`);

    // 3. Popular Matriz
    const hqSummary = await populateStoreCatalogAndInventory({
      client,
      store: hqStore,
      admins: resolvedAdmins,
      suppliersSpec: spec.suppliers || [],
      categoriesSpec: spec.categories || [],
      productsSpec: spec.products || [],
      defaultExpirationDate: spec.defaultExpirationDate || '2026-12-31',
      defaultManufacturingDate: spec.defaultManufacturingDate || '2026-11-04',
    });
    console.log(
      `   ✅ Matriz "${hqStore.name}": ${hqSummary.productsCount} produtos, ${hqSummary.totalStockUnits} un. em estoque, ${hqSummary.suppliersCount} fornecedores.`
    );

    // 4. Criar/Atualizar e Popular todas as Filiais vinculadas à Matriz
    const branchSummaries = [];
    for (const branchSpec of spec.branches || []) {
      const branchStore = await upsertStoreUnit(client, branchSpec, hqStore.id);
      const bSummary = await populateStoreCatalogAndInventory({
        client,
        store: branchStore,
        admins: resolvedAdmins,
        suppliersSpec: spec.suppliers || [],
        categoriesSpec: spec.categories || [],
        productsSpec: spec.products || [],
        defaultExpirationDate: spec.defaultExpirationDate || '2026-12-31',
        defaultManufacturingDate: spec.defaultManufacturingDate || '2026-11-04',
      });
      branchSummaries.push(bSummary);
      console.log(
        `   ✅ Filial "${branchStore.name}" (${branchStore.branchCode} -> /store/${branchStore.slug}): ${bSummary.productsCount} produtos, ${bSummary.totalStockUnits} un. em estoque.`
      );
    }

    console.log('\n========================================================================');
    console.log('🎉 CRIAÇÃO EM LOTE FINALIZADA COM SUCESSO!');
    console.log('========================================================================');

    return {
      headquarters: hqSummary,
      branches: branchSummaries,
      admins: resolvedAdmins,
    };
  } finally {
    await client
      .query(`DROP POLICY IF EXISTS temp_bulk_store_upload_policy ON storage.objects`)
      .catch(() => {});
    await client.end();
  }
}

// Execução direta via CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
  };

  const specPath = getArg('--spec') || (args[0] && !args[0].startsWith('--') ? args[0] : null);
  const promptText = getArg('--prompt');
  const saveSpecPath = getArg('--save-spec');
  const dryRun = args.includes('--dry-run');

  runBulkStoreBuilder({ specPath, promptText, saveSpecPath, dryRun }).catch((err) => {
    console.error('❌ Erro no Bulk Store Builder:', err.message || err);
    process.exit(1);
  });
}
