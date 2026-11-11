import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Limita rajadas de leituras por separador de browser/processo.
// Escritas, uploads e pagamentos não são atrasados por esta fila e nunca
// são repetidos automaticamente, evitando ambiguidades em operações críticas.
const MAX_CONCURRENT_READS = 6;
let activeReads = 0;
const waitingReads = [];

async function limitedSupabaseFetch(input, init = {}) {
  const method = String(init.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') return fetch(input, init);

  if (activeReads >= MAX_CONCURRENT_READS) {
    await new Promise((resolve) => waitingReads.push(resolve));
  } else {
    activeReads += 1;
  }
  try {
    return await fetch(input, init);
  } finally {
    const next = waitingReads.shift();
    if (next) next();
    else activeReads = Math.max(0, activeReads - 1);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: limitedSupabaseFetch }
});
