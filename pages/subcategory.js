 import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Subcategory() {
  const router = useRouter();

  const {
    id,
    country,
    province,
  } = router.query;

  const [subcategory, setSubcategory] = useState(null);
  const [businesses, setBusinesses] = useState([]);

  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');

  const [query, setQuery] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [neighborhood, setNeighborhood] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    if (!id || !country || !province) {
      router.replace('/country');
      return;
    }

    loadSubcategory();
  }, [
    router.isReady,
    id,
    country,
    province,
  ]);

  useEffect(() => {
    if (
      !router.isReady ||
      !id ||
      !country ||
      !province
    ) {
      return;
    }

    loadBusinesses();
  }, [
    router.isReady,
    id,
    country,
    province,
    query,
    municipality,
    neighborhood,
  ]);

  async function loadSubcategory() {
    setLoading(true);
    setError('');

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
      setError(
        'Não foi possível carregar esta subcategoria.'
      );
      setLoading(false);
      return;
    }

    const { data: provinceData } = await supabase
      .from('provinces')
      .select('id, name, country_id')
      .eq('id', province)
      .eq('country_id', country)
      .single();

    if (!provinceData) {
      setError(
        'A província selecionada não pertence ao país escolhido.'
      );
      setLoading(false);
      return;
    }

    const { data: countryData } = await supabase
      .from('countries')
      .select('id, name')
      .eq('id', country)
      .single();

    setSubcategory(data);
    setProvinceName(provinceData.name);
    setCountryName(countryData?.name || '');

    setLoading(false);
  }

  async function loadBusinesses() {
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
      .eq('country_id', country)
      .eq('province_id', province)
      .eq('subcategory_id', id)
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .order('created_at', {
        ascending: false,
      });

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
    <div
      className="container"
      style={{
        paddingBottom: 50,
      }}
    >
      {/* CABEÇALHO */}
      <nav
        className="topnav"
        style={{
          padding: '12px 0',
        }}
      >
        <Link
          href={{
            pathname: '/explore',
            query: {
              country,
              province,
            },
          }}
          style={{
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            className="logo"
            style={{
              background: '#075B4E',
              color: '#E6A900',
            }}
          >
            T
          </div>

          <b>Talaza</b>
        </Link>

        <Link
          href={{
            pathname: '/category',
            query: {
              id: subcategory?.category_id,
              country,
              province,
            },
          }}
          className="btn btn-ghost"
          style={{
            fontSize: 12,
          }}
        >
          ← Voltar
        </Link>
      </nav>

      {error && (
        <div
          style={{
            marginTop: 20,
            padding: 14,
            borderRadius: 12,
            background: '#FFF1F0',
            color: '#9B2C2C',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {subcategory && (
        <>
          {/* LOCALIZAÇÃO */}
          <div
            style={{
              marginTop: 15,
              padding: '9px 12px',
              borderRadius: 11,
              background: '#EAF4F1',
              color: '#075B4E',
              fontSize: 11,
              fontWeight: 700,
              display: 'inline-flex',
            }}
          >
            {countryName} · {provinceName}
          </div>

          {/* TÍTULO */}
          <h1
            style={{
              fontSize: 25,
              marginTop: 17,
              marginBottom: 5,
            }}
          >
            {subcategory.name}
          </h1>

          {subcategory.description && (
            <p
              style={{
                color: 'var(--ink-soft)',
                fontSize: 13,
                marginTop: 0,
              }}
            >
              {subcategory.description}
            </p>
          )}

          {/* PESQUISA COMPACTA */}
          <div
            style={{
              margin: '18px 0',
            }}
          >
            <input
              className="input"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                margin: 0,
                borderRadius: 13,
                padding: '12px 14px',
              }}
              placeholder="Pesquisar por nome…"
              value={query}
              onChange={(e) =>
                setQuery(e.target.value)
              }
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(160px,1fr))',
                gap: 8,
                marginTop: 8,
              }}
            >
              <input
                className="input"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  margin: 0,
                  borderRadius: 11,
                  padding: '10px 12px',
                  fontSize: 12,
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
                  width: '100%',
                  boxSizing: 'border-box',
                  margin: 0,
                  borderRadius: 11,
                  padding: '10px 12px',
                  fontSize: 12,
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 11,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                margin: 0,
              }}
            >
              Encontre aqui
            </h2>

            <span
              style={{
                color: '#7A8986',
                fontSize: 10,
              }}
            >
              {provinceName}
            </span>
          </div>

          {loading && (
            <p style={{ color: 'var(--ink-faint)' }}>
              A carregar…
            </p>
          )}

          {!loading &&
            businesses.length === 0 && (
              <div
                style={{
                  padding: 17,
                  borderRadius: 13,
                  background: '#FFFFFF',
                  border: '1px solid #DCE6E3',
                  color: '#7A8986',
                  fontSize: 13,
                }}
              >
                Ainda não há negócios cadastrados nesta
                subcategoria nesta região.
              </div>
            )}

          {!loading &&
            businesses.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit,minmax(190px,1fr))',
                  gap: 10,
                }}
              >
                {businesses.map((business) => (
                  <Link
                    key={business.id}
                    href={`/businesses/${business.id}?country=${country}&province=${province}`}
                    style={{
                      textDecoration: 'none',
                      color: 'inherit',
                      background: '#FFFFFF',
                      border: '1px solid #DCE6E3',
                      borderRadius: 14,
                      padding: 12,
                    }}
                  >
                    {business.logo_url && (
                      <img
                        src={business.logo_url}
                        alt={business.name}
                        style={{
                          width: '100%',
                          height: 105,
                          objectFit: 'cover',
                          borderRadius: 10,
                          marginBottom: 8,
                        }}
                      />
                    )}

                    <h3
                      style={{
                        fontSize: 14,
                        margin: '3px 0 5px',
                      }}
                    >
                      {business.name}
                    </h3>

                    {business.description && (
                      <p
                        style={{
                          fontSize: 11,
                          color: 'var(--ink-soft)',
                          lineHeight: 1.4,
                          margin: '0 0 7px',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {business.description}
                      </p>
                    )}

                    {(business.municipality ||
                      business.neighborhood) && (
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--ink-faint)',
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
