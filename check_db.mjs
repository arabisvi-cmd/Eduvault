import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kxclbimagkfzhxkwcafk.supabase.co';
const supabaseKey = 'sb_publishable_O4RMQoLTrxSxbnXIuWPwHQ_l0iFMUrL';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking public.users...");
  let { data: users, error: errUsers } = await supabase.from('users').select('*').limit(1);
  console.log("Users:", users ? "EXISTS" : "MISSING/404", errUsers);

  console.log("\nChecking public.institutions...");
  let { data: inst, error: errInst } = await supabase.from('institutions').select('*').limit(1);
  console.log("Institutions:", inst ? "EXISTS" : "MISSING/404", errInst);
}

check();
