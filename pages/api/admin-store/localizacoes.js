import { requireMainAdmin } from '../../../lib/adminStoreAccess';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  const auth = await requireMainAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  try {
    const [countries, provinces, categories, subcategories] = await Promise.all([
      auth.supabase.from('countries').select('id,name,is_enabled').order('name'),
      auth.supabase.from('provinces').select('id,name,country_id').order('name'),
      auth.supabase.from('categories').select('id,name').eq('active', true).eq('signup_visible', true).order('name'),
      auth.supabase.from('subcategories').select('id,name,category_id').eq('is_active', true).order('name'),
    ]);
    const issue = countries.error || provinces.error || categories.error || subcategories.error;
    if (issue) throw issue;

    return res.status(200).json({
      countries: countries.data || [],
      provinces: provinces.data || [],
      categories: categories.data || [],
      subcategories: subcategories.data || [],
    });
  } catch (error) {
    console.error('Admin store locations error:', error?.code || error?.message);
    return res.status(503).json({ error: 'Não foi possível carregar países, províncias e categorias.' });
  }
}
