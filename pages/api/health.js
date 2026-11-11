import { createClient } from '@supabase/supabase-js';

const HEALTH_TIMEOUT_MS = 2500;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ ok: false });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return res.status(503).json({ ok: false, app: 'ok', database: 'unconfigured' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init = {}) => fetch(input, { ...init, signal: controller.signal })
      }
    });
    const { error } = await supabase.from('countries').select('id').limit(1);
    if (error) return res.status(503).json({ ok: false, app: 'ok', database: 'degraded' });
    return res.status(200).json({ ok: true, app: 'ok', database: 'ok' });
  } catch (_) {
    return res.status(503).json({ ok: false, app: 'ok', database: 'unavailable' });
  } finally {
    clearTimeout(timeout);
  }
}
