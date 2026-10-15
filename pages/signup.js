import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const FLAGS = { Angola: '🇦🇴', 'Moçambique': '🇲🇿', Mozambique: '🇲🇿', Portugal: '🇵🇹', Brasil: '🇧🇷', 'África do Sul': '🇿🇦' };

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [accountType, setAccountType] = useState('cliente');
  const [lockedType, setLockedType] = useState(false);
  const [countryId, setCountryId] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [countries, setCountries] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    const t = router.query.type;
    if (t === 'cliente' || t === 'vendedor') { setAccountType(t); setLockedType(true); }
    loadCountries();
  }, [router.isReady]);

  useEffect(() => { if (countryId) loadProvinces(countryId); else { setProvinces([]); setProvinceId(''); } }, [countryId]);

  async function loadCountries() {
    const { data } = await supabase.from('countries').select('id, name').order('name');
    setCountries(data || []);
  }
  async function loadProvinces(cid) {
    const { data } = await supabase.from('provinces').select('id, name').eq('country_id', cid).order('name');
    setProvinces(data || []);
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError(''); setNotice('');
    if (!name.trim() ||!phone.trim() ||!email.trim() ||!password ||!countryId ||!provinceId) { setError('Preencha todos os campos.'); return; }
    if (password.length < 8) { setError('A senha deve ter 8 caracteres.'); return; }
    setLoading(true);
    try {
      const { data: prov } = await supabase.from('provinces').select('id').eq('id', provinceId).eq('country_id', countryId).maybeSingle();
      if (!prov) throw new Error('A província não pertence a este país.');

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { name: name.trim(), phone: phone.trim(), account_type: accountType } }
      });
      if (error) throw error;
      if (!data.session) { setNotice('Conta criada. Verifique seu e-mail para confirmar.'); return; }

      const user = data.user;
      const { error: pErr } = await supabase.from('profiles').upsert({
        id: user.id, name: name.trim(), phone: phone.trim(), country_id: countryId, province_id: provinceId, account_type: accountType
      }, { onConflict: 'id' });
      if (pErr) throw pErr;

      const dest = accountType === 'vendedor'? '/post-business' : '/explore';
      await router.replace({ pathname: dest, query: { country: countryId, province: provinceId } });
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: 24, paddingBottom: 60 }}>
      <Link href="/" style={{ color: '#0F6E5C', textDecoration: 'none' }}>← Talaza</Link>
      <h1 style={{ marginTop: 20 }}>Criar conta</h1>

      {accountType === 'cliente'? (
        <div style={infoGreen}><b>🛒 Conta de cliente - Explora Talaza</b><br/>Você vai ver negócios e produtos perto de você. Pode comprar, falar com vendedores e salvar favoritos.</div>
      ) : (
        <div style={infoYellow}><b>🏪 Conta de vendedor</b><br/>Você vai criar sua loja, adicionar produtos/serviços e receber clientes. Após criar, vamos configurar seu negócio.</div>
      )}

      <form onSubmit={handleSignup} style={{ display: 'grid', gap: 14, marginTop: 16 }}>
        <label>Tipo de conta
          <select value={accountType} onChange={e => setAccountType(e.target.value)} disabled={lockedType} required style={field}>
            <option value="cliente">Cliente - Explorar</option>
            <option value="vendedor">Vendedor - Vender</option>
          </select>
        </label>
        <label>Nome completo<input value={name} onChange={e => setName(e.target.value)} required style={field}/></label>
        <label>Telefone (com DDI)<input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+244 923 000 000" required style={field}/></label>
        <label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={field}/></label>
        <label>Palavra-passe
          <div style={{ position: 'relative' }}>
            <input type={showPass? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required style={{...field, paddingRight: 42 }} />
            <span onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 10, top: 16, cursor: 'pointer' }}>{showPass? '🙈' : '👁️'}</span>
          </div>
        </label>
        <label>País
          <select value={countryId} onChange={e => setCountryId(e.target.value)} required style={field}>
            <option value="">Escolha o país</option>
            {countries.map(c => <option key={c.id} value={c.id}>{FLAGS[c.name] || '🏳️'} {c.name}</option>)}
          </select>
        </label>
        <label>Província
          <select value={provinceId} onChange={e => setProvinceId(e.target.value)} required disabled={!countryId} style={field}>
            <option value="">Escolha a província</option>
            {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        {error && <p style={{ color: '#B93845', fontSize: 13 }}>{error}</p>}
        {notice && <p style={{ color: '#0F6E5C', fontSize: 13 }}>{notice}</p>}

        <button type="submit" disabled={loading} style={btn}>{loading? 'A criar...' : 'Criar conta'}</button>
      </form>
      <p style={{ marginTop: 18, fontSize: 14 }}>Já tem conta? <Link href="/login">Entrar</Link></p>
    </main>
  );
}
const field = { display: 'block', width: '100%', marginTop: 6, padding: '12px', border: '1px solid #E5E9E7', borderRadius: 10 };
const btn = { border: 0, borderRadius: 10, padding: 14, background: '#0F6E5C', color: 'white', fontWeight: 700, cursor: 'pointer' };
const infoGreen = { background: '#ECFDF5', border: '1px solid #A7F3D0', padding: 12, borderRadius: 10, fontSize: 13, lineHeight: 1.5 };
const infoYellow = { background: '#FFFBEB', border: '1px solid #FCD34D', padding: 12, borderRadius: 10, fontSize: 13, lineHeight: 1.5 };
