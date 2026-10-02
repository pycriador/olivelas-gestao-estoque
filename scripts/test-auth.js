import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mffrafqyjbjitlhjnlai.supabase.co';
const supabaseKey = 'sb_publishable_NfhTi2u06ypAJzlqHms5ug_MW_8bLlQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
  const email = 'admin@olivelas.com';
  const password = 'Password123!';
  
  let { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.log('SignIn attempt:', error.message);
    // try sign up if not exists
    const signUpRes = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: 'Administrador Olivelas' }
      }
    });
    console.log('SignUp attempt:', signUpRes);
    data = signUpRes.data;
  } else {
    console.log('SignIn success! User ID:', data.user?.id);
  }

  if (data?.session) {
    console.log('Session token acquired!');
  }
}

testAuth();
