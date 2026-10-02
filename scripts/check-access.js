import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mffrafqyjbjitlhjnlai.supabase.co';
const supabaseKey = 'sb_publishable_NfhTi2u06ypAJzlqHms5ug_MW_8bLlQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStoresAndUsers() {
  const { data: stores, error: sErr } = await supabase.from('stores').select('id, name, slug, is_active');
  console.log('Stores:', stores, 'Error:', sErr);

  const { data: prods, error: pErr } = await supabase.from('products').select('id, name, sku').limit(5);
  console.log('Sample Products:', prods?.length, 'Error:', pErr);
}

checkStoresAndUsers();
