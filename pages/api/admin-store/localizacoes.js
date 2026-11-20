import { getSupabaseAdminServer } from '../../../lib/supabaseAdminServer';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  try {
    const supabase = getSupabaseAdminServer();
    const [countries, provinces] = await Promise.all([
      supabase.from('countries').select('id,name').order('name'),
      supabase.from('provinces').select('id,name,country_id').order('name'),
    ]);
    if (countries.error || provinces.error) throw countries.error || provinces.error;
    return res.status(200).json({
      countries: countries.data || [],
      provinces: provinces.data || [],
    });
  } catch (error) {
    console.error('Admin store locations error:', error?.code || error?.message);
    return res.status(503).json({ error: 'As localizações não estão disponíveis neste momento.' });
  }
}
