import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function PostBusiness() {
  const router = useRouter();
  const { province } = router.query;

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [openingHours, setOpeningHours] = useState('');

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [provinces, setProvinces] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    checkUserAndLock();
  }, [router.isReady]);

  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      setSubcategoryId('');
      return;
    }
    loadSubcategories(categoryId);
  }, [categoryId]);

  async function checkUserAndLock() {
    setLoadingData(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.replace('/signup');
      return;
    }
    setUser(session.user);

    const { data: prof } = await supabase.from('profiles').select('id, name, paisCodigo, pais, country_id, telefone, telefoneVerificado').eq('id', session.user.id).single();

    if (!prof ||!prof.telefoneVerificado) {
      router.replace('/signup');
      return;
    }
    setProfile(prof);

    // Carrega provincias SÓ do país travado dele (+244 = Angola)
    const { data: provData } = await supabase.from('provinces').select('id, name').eq('country_id', prof.country_id).order('name');
    setProvinces(provData || []);
    if (provData && provData[0]) setSelectedProvince(provData[0].id);

    const { data: catData } = await supabase.from('categories').select('id, name').order('name');
    setCategories(catData || []);
    setLoadingData(false);
  }

  async function loadSubcategories(catId) {
    const { data } = await supabase.from('subcategories').select('id, name').eq('category_id', catId).order('name');
    setSubcategories(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!businessName.trim() ||!categoryId ||!subcategoryId ||!selectedProvince) {
      setError('Preencha nome, categoria e província.');
      setLoading(false);
      return;
    }

    // O PAÍS É TRAVADO, NÃO VEM DA URL
    const { error: bError } = await supabase.from('businesses').insert({
      owner_id: user.id,
      name: businessName.trim(),
      description: description.trim() || null,
      country_id: profile.country_id, // TRAVADO PELO +244
      province_id: selectedProvince,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      municipality: municipality.trim() || null,
      neighborhood: neighborhood.trim() || null,
      address: address.trim() || null,
      phone: profile.telefone, // USA O TELEFONE VERIFICADO
      whatsapp: profile.telefone,
      email: user.email,
      opening_hours: openingHours.trim() || null,
      is_active: false,
      approval_status: 'pending',
    });

    if (bError) {
      setError('Erro ao criar negócio: ' + bError.message);
      setLoading(false);
      return;
    }
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F7F6', padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 600, background: '#FFFFFF', borderRadius: 26, padding: 34, textAlign: 'center' }}>
          <h1 style={{ color: '#075B4E' }}>Negócio criado em {profile.pais}!</h1>
          <p style={{ color: '#596B68' }}>Seu negócio está travado em {profile.pais} ({profile.telefone}) e só aparecerá para clientes de {profile.pais}.</p>
          <Link href={`/explore?country=${profile.country_id}&province=${selectedProvince}`} style={{ display: 'block', marginTop: 20, padding: '14px 20px', borderRadius: 13, background: '#075B4E', color: '#FFFFFF', textDecoration: 'none', fontWeight: 800 }}>Ver meu painel</Link>
        </div>
      </div>
    );
  }

  if (loadingData) return <div style={{ padding: 30, textAlign: 'center' }}>Verificando seu telefone {profile?.telefone || ''}...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7F6', padding: 24 }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ background: '#FFFFFF', borderRadius: 26, padding: 30 }}>
          <div style={{ padding: '7px 12px', borderRadius: 999, background: '#EAF4F1', color: '#075B4E', fontSize: 12, fontWeight: 800, display: 'inline-block' }}>País travado: {profile.pais} {profile.telefone} ✓</div>
          <h1 style={{ color: '#17342F', marginTop: 15 }}>Crie seu negócio em {profile.pais}</h1>
          <p style={{ color: '#66736F' }}>Seu telefone {profile.telefone} já foi verificado. Você só pode criar negócios em {profile.pais}.</p>

          <form onSubmit={handleSubmit}>
            <label style={labelStyle}>Nome do negócio *</label>
            <input value={businessName} onChange={e => setBusinessName(e.target.value)} required style={inputStyle} />

            <label style={labelStyle}>Província * (só de {profile.pais})</label>
            <select value={selectedProvince} onChange={e => setSelectedProvince(e.target.value)} required style={inputStyle}>
              {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
              <div><label style={labelStyle}>Categoria *</label><select value={categoryId} onChange={e => setCategoryId(e.target.value)} required style={inputStyle}><option value="">Escolher</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label style={labelStyle}>Subcategoria *</label><select value={subcategoryId} onChange={e => setSubcategoryId(e.target.value)} required style={inputStyle}><option value="">Escolher</option>{subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            </div>

            <label style={labelStyle}>Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} style={{...inputStyle, resize: 'vertical'}} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
              <div><label style={labelStyle}>Município</label><input value={municipality} onChange={e => setMunicipality(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Bairro</label><input value={neighborhood} onChange={e => setNeighborhood(e.target.value)} style={inputStyle} /></div>
            </div>

            {error && <div style={{ marginTop: 20, padding: 14, borderRadius: 13, background: '#FFF1F0', color: '#9B2C2C' }}>{error}</div>}

            <button type="submit" disabled={loading} style={{ width: '100%', marginTop: 25, padding: 16, border: 'none', borderRadius: 14, background: '#075B4E', color: '#FFF', fontWeight: 800, cursor: 'pointer' }}>{loading? 'Criando...' : `Criar negócio em ${profile.pais} →`}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
const inputStyle = { width: '100%', boxSizing: 'border-box', marginTop: 8, padding: 14, borderRadius: 12, border: '1px solid #D5DEDB', background: '#FFFFFF', color: '#17342F', fontSize: 15 };
const labelStyle = { display: 'block', marginTop: 17, fontWeight: 700, color: '#17342F' };
