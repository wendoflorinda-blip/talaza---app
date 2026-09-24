import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const AREAS = [
  {
    name: 'Encontrar',
    icon: '⌕',
    description:
      'Encontre negócios, produtos, serviços e soluções perto de você.',
    color: '#075B4E',
  },
  {
    name: 'Contratar',
    icon: '◉',
    description:
      'Encontre profissionais e pessoas preparadas para realizar o que você precisa.',
    color: '#0B7563',
  },
  {
    name: 'Comunidade',
    icon: '◎',
    description:
      'Partilhe perguntas, recomendações, avisos e ideias com a comunidade.',
    color: '#B88300',
  },
  {
    name: 'Oportunidades',
    icon: '↗',
    description:
      'Encontre oportunidades de trabalho, colaborações e vagas publicadas.',
    color: '#9A6D00',
  },
  {
    name: 'Eventos',
    icon: '◇',
    description:
      'Descubra eventos, cursos, feiras, lançamentos e outros momentos especiais.',
    color: '#075B4E',
  },
  {
    name: 'Ebooks',
    icon: '▤',
    description:
      'Descubra ebooks para aprender, desenvolver novas habilidades e explorar conhecimentos.',
    color: '#0B7563',
  },
];

export default function Explore() {
  const router = useRouter();

  const { country, province } = router.query;

  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');

  const [categories, setCategories] = useState([]);
  const [businesses, setBusinesses] = useState([]);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedArea, setSelectedArea] = useState(null);

  useEffect(() => {
    if (!router.isReady) return;

    if (!country || !province) {
      router.replace('/country');
      return;
    }

    loadLocation();
    loadCategories();
  }, [router.isReady, country, province]);

  useEffect(() => {
    if (!router.isReady || !country || !province) return;

    loadBusinesses();
  }, [router.isReady, country, province, query]);

  async function loadLocation() {
    const { data: countryData } = await supabase
      .from('countries')
      .select('id, name')
      .eq('id', country)
      .single();

    const { data: provinceData } = await supabase
      .from('provinces')
      .select('id, name, country_id')
      .eq('id', province)
      .eq('country_id', country)
      .single();

    setCountryName(countryData?.name || '');
    setProvinceName(provinceData?.name || '');
  }

  async function loadCategories() {
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .order('name', { ascending: true });

    setCategories(data || []);
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
      .eq('country_id', country)
      .eq('province_id', province)
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .order('created_at', { ascending: false });

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

  function handleAreaClick(area) {
    setSelectedArea(
      selectedArea === area.name
        ? null
        : area.name
    );

    if (area.name === 'Encontrar') {
      setTimeout(() => {
        document
          .getElementById('categorias')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
      }, 50);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F7F6',
      }}
    >
      <div
        className="container"
        style={{
          maxWidth: 1100,
          paddingBottom: 50,
        }}
      >
        {/* CABEÇALHO COMPACTO */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 0',
          }}
        >
          <Link
            href={{
              pathname: '/explore',
              query: { country, province },
            }}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: '#075B4E',
                color: '#E6A900',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
              }}
            >
              T
            </div>

            <b
              style={{
                color: '#075B4E',
                fontSize: 18,
              }}
            >
              Talaza
            </b>
          </Link>

          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                display: 'none',
                color: '#596B68',
                fontSize: 12,
              }}
            >
              {provinceName}
            </div>

            <Link
              href="/login"
              style={{
                textDecoration: 'none',
                color: '#075B4E',
                fontSize: 12,
                fontWeight: 800,
                padding: '8px 10px',
              }}
            >
              Já tenho uma conta
            </Link>

            <button
              type="button"
              aria-label="Menu"
              style={{
                width: 34,
                height: 34,
                border: '1px solid #D5DEDB',
                borderRadius: 10,
                background: '#FFFFFF',
                color: '#075B4E',
                fontSize: 18,
                cursor: 'pointer',
              }}
            >
              ⋮
            </button>
          </div>
        </nav>

        {/* LOCALIZAÇÃO + PESQUISA */}
        <div
          style={{
            marginTop: 12,
            padding: '10px 13px',
            borderRadius: 12,
            background: '#EAF4F1',
            color: '#075B4E',
            fontSize: 12,
            fontWeight: 700,
            display: 'inline-flex',
          }}
        >
          {countryName} · {provinceName}
        </div>

        <div
          style={{
            marginTop: 14,
          }}
        >
          <input
            className="input"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              margin: 0,
              borderRadius: 14,
              padding: '13px 15px',
              fontSize: 14,
            }}
            placeholder="Pesquisar negócios, produtos ou serviços…"
            value={query}
            onChange={(e) =>
              setQuery(e.target.value)
            }
          />
        </div>

        {/* ÁREAS COMPACTAS */}
        <section
          style={{
            marginTop: 18,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(6, minmax(72px, 1fr))',
              gap: 7,
            }}
          >
            {AREAS.map((area) => (
              <button
                key={area.name}
                type="button"
                onClick={() =>
                  handleAreaClick(area)
                }
                style={{
                  minWidth: 0,
                  border: '1px solid #DCE6E3',
                  borderTop: `3px solid ${area.color}`,
                  borderRadius: 12,
                  background:
                    selectedArea === area.name
                      ? '#EAF4F1'
                      : '#FFFFFF',
                  padding: '10px 5px',
                  cursor: 'pointer',
                  color: '#17342F',
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    color: area.color,
                    fontWeight: 900,
                    lineHeight: 1,
                  }}
                >
                  {area.icon}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 10,
                    fontWeight: 800,
                    lineHeight: 1.2,
                  }}
                >
                  {area.name}
                </div>
              </button>
            ))}
          </div>

          {selectedArea && (
            <div
              style={{
                marginTop: 8,
                padding: '10px 13px',
                borderRadius: 12,
                background: '#FFFFFF',
                border: '1px solid #DCE6E3',
                color: '#596B68',
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              {
                AREAS.find(
                  (area) =>
                    area.name === selectedArea
                )?.description
              }
            </div>
          )}
        </section>

        {/* CATEGORIAS */}
        <section
          id="categorias"
          style={{
            marginTop: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <h2
              style={{
                fontSize: 19,
                margin: 0,
              }}
            >
              Encontrar
            </h2>

            <span
              style={{
                color: '#7A8986',
                fontSize: 11,
              }}
            >
              {provinceName}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit,minmax(130px,1fr))',
              gap: 7,
              marginTop: 11,
            }}
          >
            {categories.map((category) => (
              <Link
                key={category.id}
                href={{
                  pathname: '/category',
                  query: {
                    id: category.id,
                    country,
                    province,
                  },
                }}
                style={{
                  textDecoration: 'none',
                  color: '#17342F',
                  background: '#FFFFFF',
                  border: '1px solid #DCE6E3',
                  borderRadius: 11,
                  padding: '12px 11px',
                  fontSize: 12,
                  fontWeight: 750,
                }}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>

        {/* NEGÓCIOS */}
        <section
          style={{
            marginTop: 30,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <h2
              style={{
                fontSize: 19,
                margin: 0,
              }}
            >
              Negócios perto de você
            </h2>

            <span
              style={{
                fontSize: 11,
                color: '#7A8986',
              }}
            >
              {provinceName}
            </span>
          </div>

          {loading && (
            <p style={{ color: '#7A8986' }}>
              A carregar…
            </p>
          )}

          {!loading &&
            businesses.length === 0 && (
              <div
                style={{
                  padding: 18,
                  borderRadius: 14,
                  background: '#FFFFFF',
                  border: '1px solid #DCE6E3',
                  color: '#7A8986',
                  fontSize: 13,
                }}
              >
                Ainda não há negócios publicados nesta região.
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
                      display: 'block',
                    }}
                  >
                    {business.logo_url && (
                      <img
                        src={business.logo_url}
                        alt={business.name}
                        style={{
                          width: '100%',
                          height: 110,
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
                          color: '#596B68',
                          margin: '0 0 7px',
                          lineHeight: 1.4,
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
                          color: '#7A8986',
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
        </section>
      </div>
    </div>
  );
}            
                                  
