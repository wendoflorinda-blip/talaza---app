import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [countries, setCountries] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [categories, setCategories] = useState([]);
  const [businesses, setBusinesses] = useState([]);

  const [countryId, setCountryId] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [query, setQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCountries();
    loadCategories();
  }, []);

  async function loadCountries() {
    const { data, error } = await supabase
      .from('countries')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      setError('Não foi possível carregar os países.');
      return;
    }

    setCountries(data || []);

    if (data && data.length > 0) {
      setCountryId(data[0].id);
    }
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setCategories(data || []);
  }

  useEffect(() => {
    if (!countryId) return;

    loadProvinces();
  }, [countryId]);

  async function loadProvinces() {
    const { data, error } = await supabase
      .from('provinces')
      .select('id, name')
      .eq('country_id', countryId)
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setProvinces(data || []);
    setProvinceId('');
  }

  useEffect(() => {
    if (!countryId) return;

    loadBusinesses();
  }, [countryId, provinceId, query]);

  async function loadBusinesses() {
    setLoading(true);

    let request = supabase
      .from('businesses')
      .select(`
        id,
        name,
        description,
        municipality,
        neighborhood,
        logo_url,
        category_id,
        subcategory_id
      `)
      .eq('country_id', countryId)
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .order('created_at', { ascending: false });

    if (provinceId) {
      request = request.eq('province_id', provinceId);
    }

    if (query.trim()) {
      request = request.ilike(
        'name',
        `%${query.trim()}%`
      );
    }

    const { data, error } = await request;

    if (error) {
      console.error(error);
      setBusinesses([]);
      setLoading(false);
      return;
    }

    setBusinesses(data || []);
    setLoading(false);
  }

  return (
    <div className="container">

      {/* CABEÇALHO */}
      <nav className="topnav">

        <Link
          href="/"
          style={{
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <div className="logo">T</div>
          <b>Talaza</b>
        </Link>

        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            gap: 8
          }}
        >
          <Link
            href="/login"
            className="btn btn-ghost"
          >
            Entrar
          </Link>

          <Link
            href="/signup"
            className="btn btn-brand"
          >
            Criar conta
          </Link>
        </div>

      </nav>

      {/* INTRODUÇÃO */}
      <h1 style={{ fontSize: 26 }}>
        O que você procura hoje?
      </h1>

      <p style={{ color: 'var(--ink-soft)' }}>
        Encontre negócios, produtos, serviços e oportunidades
        de forma rápida, organizada e confiável.
      </p>

      {/* PAÍS + PROVÍNCIA + PESQUISA */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          margin: '18px 0',
          alignItems: 'center'
        }}
      >

        <select
          className="input"
          style={{
            width: 160,
            marginBottom: 0
          }}
          value={countryId}
          onChange={(e) => setCountryId(e.target.value)}
        >
          {countries.map((country) => (
            <option
              key={country.id}
              value={country.id}
            >
              {country.name}
            </option>
          ))}
        </select>

        <select
          className="input"
          style={{
            width: 180,
            marginBottom: 0
          }}
          value={provinceId}
          onChange={(e) => setProvinceId(e.target.value)}
        >
          <option value="">
            Todas as províncias
          </option>

          {provinces.map((province) => (
            <option
              key={province.id}
              value={province.id}
            >
              {province.name}
            </option>
          ))}
        </select>

        <input
          className="input"
          style={{
            flex: 1,
            minWidth: 200,
            marginBottom: 0
          }}
          placeholder="Pesquisar por nome…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <span
          style={{
            fontSize: 11,
            color: 'var(--ink-faint)'
          }}
        >
          🌍 Mais países em breve
        </span>

      </div>

      {/* BOTÃO DO VENDEDOR */}
      <Link
        href="/post-business"
        className="btn btn-gold"
        style={{ marginBottom: 24 }}
      >
        Divulgar o meu negócio
      </Link>

      {/* CATEGORIAS */}
      <div style={{ marginBottom: 28 }}>

        <h2 style={{ fontSize: 19 }}>
          Categorias
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 10,
            marginTop: 12
          }}
        >

          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category?id=${category.id}`}
              className="card"
              style={{
                textDecoration: 'none',
                color: 'inherit'
              }}
            >
              <strong style={{ fontSize: 14 }}>
                {category.name}
              </strong>
            </Link>
          ))}

        </div>

      </div>

      {/* NEGÓCIOS */}
      <div>

        <h2 style={{ fontSize: 19 }}>
          Negócios
        </h2>

        {loading && (
          <p style={{ color: 'var(--ink-faint)' }}>
            A carregar…
          </p>
        )}

        {!loading && businesses.length === 0 && (
          <p style={{ color: 'var(--ink-faint)' }}>
            Ainda não há negócios cadastrados nesta região.
          </p>
        )}

        {!loading && businesses.length > 0 && (

          <div className="grid">

            {businesses.map((business) => (

              <Link
                key={business.id}
                href={`/businesses/${business.id}`}
                className="card"
                style={{
                  textDecoration: 'none',
                  color: 'inherit'
                }}
              >

                {business.logo_url && (
                  <img
                    src={business.logo_url}
                    alt={business.name}
                    style={{
                      width: '100%',
                      height: 140,
                      objectFit: 'cover',
                      borderRadius: 8,
                      marginBottom: 8
                    }}
                  />
                )}

                <h3
                  style={{
                    fontSize: 15,
                    margin: '6px 0 4px'
                  }}
                >
                  {business.name}
                </h3>

                {business.description && (
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--ink-soft)',
                      margin: '4px 0'
                    }}
                  >
                    {business.description}
                  </p>
                )}

                {(business.municipality ||
                  business.neighborhood) && (

                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--ink-faint)',
                      marginTop: 6
                    }}
                  >
                    {business.municipality}

                    {business.municipality &&
                    business.neighborhood
                      ? ' · '
                      : ''}

                    {business.neighborhood}
                  </div>

                )}

              </Link>

            ))}

          </div>

        )}

      </div>

      {error && (
        <p
          style={{
            color: '#D92D20',
            fontSize: 13,
            marginTop: 20
          }}
        >
          {error}
        </p>
      )}

    </div>
  );
}
        
        

           
      
        
            

                
                      

                

  
