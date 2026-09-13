import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [countries, setCountries] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [countryId, setCountryId] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [query, setQuery] = useState('');
  const [businesses, setBusinesses] = useState([]);

  useEffect(() => {
    supabase.from('countries').select('*').eq('is_active', true).then(({ data }) => {
      setCountries(data || []);
      if (data && data.length) setCountryId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!countryId) return;
    supabase.from('provinces').select('*').eq('country_id', countryId).eq('is_active', true)
      .then(({ data }) => setProvinces(data || []));
  }, [countryId]);

  useEffect(() => {
    if (!countryId) return;
    let req = supabase.from('businesses').select('*').eq('country_id', countryId)
      .order('is_premium', { ascending: false }).limit(12);
    if (provinceId) req = req.eq('province_id', provinceId);
    if (query) req = req.ilike('name', `%${query}%`);
    req.then(({ data }) => setBusinesses(data || []));
  }, [countryId, provinceId, query]);

  return (
    <div className="container">
      <nav className="topnav">
        <div className="logo">T</div>
        <b>Talaza</b>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Link href="/login" className="btn btn-ghost">Entrar</Link>
          <Link href="/signup" className="btn btn-brand">Criar conta</Link>
        </div>
      </nav>

      <h1 style={{ fontSize: 26 }}>O que você procura hoje?</h1>
      <p style={{ color: 'var(--ink-soft)' }}>
        Encontre oportunidades, empresas, lojas, profissionais e serviços de forma rápida, organizada e confiável.
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '18px 0', alignItems: 'center' }}>
        <select className="input" style={{ width: 160, marginBottom: 0 }} value={countryId} onChange={e => setCountryId(e.target.value)}>
          {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input" style={{ width: 180, marginBottom: 0 }} value={provinceId} onChange={e => setProvinceId(e.target.value)}>
          <option value="">Todas as províncias</option>
          {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input className="input" style={{ flex: 1, minWidth: 200, marginBottom: 0 }} placeholder="Pesquisar por nome…"
          value={query} onChange={e => setQuery(e.target.value)} />
        <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>🌍 Mais países em breve</span>
      </div>

      <Link href="/post-business" className="btn btn-gold" style={{ marginBottom: 24 }}>Divulgar o meu negócio</Link>

      <div className="grid">
        {businesses.map(b => (
          <Link key={b.id} href={`/businesses/${b.id}`} className="card">
            {b.is_premium && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold-dark)' }}>👑 PREMIUM</span>}
            <h3 style={{ fontSize: 15, margin: '6px 0 2px' }}>{b.name}</h3>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{b.category}</div>
          </Link>
        ))}
        {businesses.length === 0 && <p style={{ color: 'var(--ink-faint)' }}>Ainda não há negócios cadastrados aqui — seja o primeiro.</p>}
      </div>
    </div>
  );
}
