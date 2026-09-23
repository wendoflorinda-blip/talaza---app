import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Subcategory() {
  const router = useRouter();
  const { id } = router.query;

  const [subcategory, setSubcategory] = useState(null);
  const [businesses, setBusinesses] = useState([]);

  const [query, setQuery] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [neighborhood, setNeighborhood] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady || !id) return;

    loadSubcategory();
  }, [router.isReady, id]);

  useEffect(() => {
    if (!router.isReady || !id) return;

    loadBusinesses();
  }, [
    router.isReady,
    id,
    query,
    municipality,
    neighborhood
  ]);

  async function loadSubcategory() {
    const { data, error } = await supabase
      .from('subcategories')
      .select(`
        id,
        name,
        description,
        category_id
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error(error);
      setError('Não foi possível carregar esta subcategoria.');
      setLoading(false);
      return;
    }

    setSubcategory(data);
  }

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
        logo_url
      `)
      .eq('subcategory_id', id)
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .order('created_at', { ascending: false });

    if (query.trim()) {
      request = request.ilike(
        'name',
        `%${query.trim()}%`
      );
    }

    if (municipality.trim()) {
      request = request.ilike(
        'municipality',
        `%${municipality.trim()}%`
      );
    }

    if (neighborhood.trim()) {
      request = request.ilike(
        'neighborhood',
        `%${neighborhood.trim()}%`
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

        <Link
          href="/"
          className="btn btn-ghost"
        >
          Voltar
        </Link>

      </nav>

      {error && (
        <p
          style={{
            color: '#D92D20',
            fontSize: 13
          }}
        >
          {error}
        </p>
      )}

      {subcategory && (
        <>
          {/* TÍTULO */}
          <h1
            style={{
              fontSize: 26,
              marginTop: 20
            }}
          >
            {subcategory.name}
          </h1>

          {subcategory.description && (
            <p
              style={{
                color: 'var(--ink-soft)'
              }}
            >
              {subcategory.description}
            </p>
          )}

          {/* PESQUISA */}
          <div
            style={{
              display: 'grid',
              gap: 10,
              margin: '20px 0'
            }}
          >

            <input
              className="input"
              placeholder="Pesquisar por nome…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <div
              style={{
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap'
              }}
            >

              <input
                className="input"
                style={{
                  flex: 1,
                  minWidth: 180
                }}
                placeholder="Município"
                value={municipality}
                onChange={(e) =>
                  setMunicipality(e.target.value)
                }
              />

              <input
                className="input"
                style={{
                  flex: 1,
                  minWidth: 180
                }}
                placeholder="Bairro"
                value={neighborhood}
                onChange={(e) =>
                  setNeighborhood(e.target.value)
                }
              />

            </div>

          </div>

          {/* NEGÓCIOS */}
          <h2 style={{ fontSize: 19 }}>
            Encontre aqui
          </h2>

          {loading && (
            <p style={{ color: 'var(--ink-faint)' }}>
              A carregar…
            </p>
          )}

          {!loading && businesses.length === 0 && (
            <p style={{ color: 'var(--ink-faint)' }}>
              Ainda não há negócios cadastrados nesta subcategoria.
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
                        color: 'var(--ink-soft)'
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
                        color: 'var(--ink-faint)'
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

        </>
      )}

    </div>
  );
}
