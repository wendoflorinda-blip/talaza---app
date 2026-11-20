import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

const inputStyle = { width: '100%', padding: '13px 14px', border: '1px solid #dfe7e2', borderRadius: 10, fontSize: 15, boxSizing: 'border-box', background: '#fff' };
const labelStyle = { display: 'block', margin: '14px 0 6px', fontWeight: 700, color: '#173c31', fontSize: 13 };

export default function AdminStoreSignup() {
  const router = useRouter();
  const [countries, setCountries] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [form, setForm] = useState({ country: '', province: '', municipio: '', bairro: '', secretCode: '', nome_da_loja: '', username: '', password: '', telefone: '', descricao: '' });
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/admin-store/localizacoes').then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(({ ok, data }) => { if (!ok) throw new Error(data.error); setCountries(data.countries || []); setProvinces(data.provinces || []); })
      .catch(e => setError(e.message || 'Não foi possível carregar países e províncias.'));
  }, []);

  const countryRow = countries.find(c => c.name === form.country);
  const availableProvinces = useMemo(() => provinces.filter(p => p.country_id === countryRow?.id), [provinces, countryRow]);
  function change(key, value) { setForm(old => ({ ...old, [key]: value })); }
  function toggleProvince(name) {
    setSelected(old => old.some(p => p.country === form.country && p.province === name)
      ? old.filter(p => !(p.country === form.country && p.province === name))
      : [...old, { country: form.country, province: name }]);
  }

  async function submit(event) {
    event.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    try {
      const response = await fetch('/api/admin-store/cadastro', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, provinces: selected }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível criar a loja.');
      setSuccess(data.message || 'Loja criada.'); 
      setTimeout(() => router.replace('/admin/entrar'), 900);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return <>
    <Head><title>Cadastro da loja administrativa — Talaza</title><meta name="robots" content="noindex,nofollow" /></Head>
    <main style={{ minHeight: '100vh', background: '#f7f8f5', padding: '32px 16px', fontFamily: 'Arial,sans-serif', color: '#18392f' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', background: '#fff', border: '1px solid #e3e9e5', borderRadius: 18, padding: 24, boxShadow: '0 12px 35px #18392f0d' }}>
        <div style={{ color: '#0b4937', fontWeight: 900, letterSpacing: 3 }}>TALAZA</div>
        <h1 style={{ marginBottom: 6 }}>Criar loja administrativa</h1>
        <p style={{ color: '#64736c', marginTop: 0 }}>Preencha os dados para configurar a loja única do sistema.</p>
        <form onSubmit={submit}>
          <h3>1. Localização principal</h3>
          <label style={labelStyle}>País *</label>
          <select required value={form.country} onChange={e => { change('country', e.target.value); change('province', ''); }} style={inputStyle}>
            <option value="">Selecionar país</option>{countries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <label style={labelStyle}>Província *</label>
          <select required value={form.province} onChange={e => change('province', e.target.value)} style={inputStyle}>
            <option value="">Selecionar província</option>{availableProvinces.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
          <label style={labelStyle}>Município *</label><input required value={form.municipio} onChange={e => change('municipio', e.target.value)} style={inputStyle} />
          <label style={labelStyle}>Bairro *</label><input required value={form.bairro} onChange={e => change('bairro', e.target.value)} style={inputStyle} />
          <label style={labelStyle}>Código secreto *</label><input required type="password" autoComplete="off" value={form.secretCode} onChange={e => change('secretCode', e.target.value)} style={inputStyle} />
          <h3 style={{ marginTop: 28 }}>2. Dados da loja</h3>
          <label style={labelStyle}>Nome da loja *</label><input required value={form.nome_da_loja} onChange={e => change('nome_da_loja', e.target.value)} style={inputStyle} />
          <label style={labelStyle}>Username *</label><input required minLength={3} maxLength={30} autoCapitalize="none" autoCorrect="off" value={form.username} onChange={e => change('username', e.target.value)} placeholder="ex.: talazastore" style={inputStyle} />
          <small style={{ color: '#718078' }}>3–30 caracteres: letras sem acentos, números, ponto, hífen ou underscore.</small>
          <label style={labelStyle}>Palavra-passe *</label><input required minLength={10} type="password" autoComplete="new-password" value={form.password} onChange={e => change('password', e.target.value)} style={inputStyle} />
          <label style={labelStyle}>Telefone *</label><input required value={form.telefone} onChange={e => change('telefone', e.target.value)} style={inputStyle} />
          <label style={labelStyle}>Descrição</label><textarea rows={4} value={form.descricao} onChange={e => change('descricao', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
          <h3 style={{ marginTop: 28 }}>3. Províncias onde a loja poderá aparecer</h3>
          <p style={{ color: '#64736c', fontSize: 13 }}>Selecione as províncias adicionais. A localização principal também será incluída automaticamente.</p>
          {availableProvinces.map(p => <label key={p.id} style={{ display: 'flex', gap: 9, alignItems: 'center', padding: '7px 0' }}>
            <input type="checkbox" checked={selected.some(x => x.country === form.country && x.province === p.name)} onChange={() => toggleProvince(p.name)} />{p.name}
          </label>)}
          {error && <p role="alert" style={{ background: '#fff0f0', color: '#a3212c', padding: 12, borderRadius: 9 }}>{error}</p>}
          {success && <p role="status" style={{ background: '#edf8f1', color: '#17633a', padding: 12, borderRadius: 9 }}>{success}</p>}
          <button disabled={loading} type="submit" style={{ marginTop: 22, width: '100%', border: 0, borderRadius: 11, padding: 15, background: '#0b4937', color: '#fff', fontWeight: 800, fontSize: 15, cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'A criar loja…' : 'Criar loja administrativa'}</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13 }}><a href="/admin/entrar" style={{ color: '#0b4937', fontWeight: 700 }}>Já tenho conta administrativa</a></p>
      </div>
    </main>
  </>;
}
