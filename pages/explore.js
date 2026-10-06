import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const COLORS = {
  brand: '#0F6E5C',
  brandDark: '#0A4A3E',
  brandSoft: '#E5F2EF',
  gold: '#DDA10A',
  goldDark: '#8A6607',
  goldSoft: '#FBF1D7',
  purple: '#7C3AED',
  purpleDark: '#5B21B6',
  purpleSoft: '#F3E8FD',
  ink: '#101828',
  inkSoft: '#475467',
  inkFaint: '#98A2B3',
  canvas: '#F7F8FA',
  line: '#E4E7EC',
};

const AREAS = [
  {
    name: 'Encontrar',
    icon: '⌕',
    description:
      'Encontre negócios, produtos, serviços e soluções perto de você.',
    color: COLORS.brand,
    action: 'scroll',
  },
  {
    name: 'Contratar',
    icon: '◉',
    description:
      'Publique uma vaga e encontre pessoas disponíveis para trabalhar.',
    color: COLORS.brand,
    route: '/contratar',
  },
  {
    name: 'Comunidade',
    icon: '◎',
    description:
      'Partilhe perguntas, recomendações, avisos e ideias com a comunidade Talaza.',
    color: COLORS.purple,
    route: '/comunidade',
  },
  {
    name: 'Oportunidades',
    icon: '↗',
    description:
      'Veja vagas e oportunidades publicadas para pessoas da sua província.',
    color: COLORS.purple,
    route: '/oportunidades',
  },
  {
    name: 'Eventos',
    icon: '◇',
    description:
      'Descubra eventos, cursos, feiras, lançamentos e outros momentos especiais.',
    color: COLORS.gold,
    route: '/eventos',
  },
  {
    name: 'Ebooks',
    icon: '▤',
    description:
      'Descubra ebooks para aprender, desenvolver novas habilidades e explorar conhecimentos.',
    color: COLORS.gold,
    route: '/ebooks',
  },
];

// Ícones em SVG por área — só a aparência do glifo muda, o mapeamento por nome é o mesmo.
const AREA_ICON_PATHS = {
  Encontrar: <><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
  Contratar: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
  Comunidade: <><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6" /><circle cx="17.5" cy="9" r="2.5" /><path d="M15.5 14.2c2.5.4 4.3 2.4 4.3 5.6" /></>,
  Oportunidades: <><line x1="17" y1="17" x2="7" y2="7" /><polyline points="7 17 7 7 17 7" /></>,
  Eventos: <><rect x="3" y="5" width="18" height="16" rx="2" /><line x1="16" y1="3" x2="16" y2="7" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="3" y1="10" x2="21" y2="10" /></>,
  Ebooks: <><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17z" /></>,
};

function AreaIcon({ name, color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {AREA_ICON_PATHS[name]}
    </svg>
  );
}

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
    const { data: countryData, error: countryError } =
      await supabase
        .from('countries')
        .select('id, name')
        .eq('id', country)
        .single();

    if (countryError) {
      console.error('Erro ao carregar país:', countryError);
    }

    const { data: provinceData, error: provinceError } =
      await supabase
        .from('provinces')
        .select('id, name, country_id')
        .eq('id', province)
        .eq('country_id', country)
        .single();

    if (provinceError) {
      console.error(
        'Erro ao carregar província:',
        provinceError
      );
    }

    setCountryName(countryData?.name || '');
    setProvinceName(provinceData?.name || '');
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error('Erro ao carregar categorias:', error);
      setCategories([]);
      return;
    }

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
      console.error('Erro ao carregar negócios:', error);
      setBusinesses([]);
      setLoading(false);
      return;
    }

    setBusinesses(data || []);
    setLoading(false);
  }

  function handleAreaClick(area) {
    if (area.route) {
      router.push({
        pathname: area.route,
        query: {
          country,
          province,
        },
      });

      return;
    }

    setSelectedArea(
      selectedArea === area.name
        ? null
        : area.name
    );

    if (area.action === 'scroll') {
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
        background: COLORS.canvas,
      }}
    >
      <div
        className="container"
        style={{
          maxWidth: 1100,
          paddingBottom: 50,
        }}
      >
        {/* CABEÇALHO */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 0',
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
              gap: 9,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: `linear-gradient(155deg, ${COLORS.brand}, ${COLORS.brandDark})`,
                color: COLORS.gold,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                boxShadow: '0 3px 8px rgba(15,110,92,.25)',
              }}
            >
              T
            </div>

            <b
              style={{
                color: COLORS.brandDark,
                fontSize: 18,
                letterSpacing: '-0.01em',
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
            <Link
              href={{
                pathname: '/login',
                query: {
                  redirect: `/explore?country=${country}&province=${province}`,
                },
              }}
              style={{
                textDecoration: 'none',
                color: COLORS.brand,
                fontSize: 12.5,
                fontWeight: 700,
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
                border: `1px solid ${COLORS.line}`,
                borderRadius: 10,
                background: '#FFFFFF',
                color: COLORS.inkSoft,
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              ⋮
            </button>
          </div>
        </nav>

        {/* LOCALIZAÇÃO */}
        <div
          style={{
            marginTop: 10,
            padding: '7px 14px',
            borderRadius: 99,
            background: COLORS.brandSoft,
            color: COLORS.brandDark,
            fontSize: 12.5,
            fontWeight: 700,
            display: 'inline-flex',
          }}
        >
          {countryName} · {provinceName}
        </div>

        {/* PESQUISA */}
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
              border: `1.5px solid ${COLORS.line}`,
              borderRadius: 13,
              padding: '13px 15px',
              fontSize: 13.5,
              background: COLORS.canvas,
              outline: 'none',
              transition: 'border-color .15s, background .15s',
            }}
            placeholder="Pesquisar negócios, produtos ou serviços…"
            value={query}
            onChange={(e) =>
              setQuery(e.target.value)
            }
          />
        </div>

        {/* ÁREAS */}
        <section
          style={{
            marginTop: 20,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(6, minmax(72px, 1fr))',
              gap: 8,
            }}
          >
            {AREAS.map((area) => {
              const isOn = selectedArea === area.name;
              return (
                <button
                  key={area.name}
                  type="button"
                  onClick={() =>
                    handleAreaClick(area)
                  }
                  style={{
                    minWidth: 0,
                    border: `1.5px solid ${isOn ? area.color : COLORS.line}`,
                    borderRadius: 14,
                    background: isOn ? `${area.color}14` : '#FFFFFF',
                    padding: '12px 6px',
                    cursor: 'pointer',
                    color: COLORS.ink,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'border-color .15s, background .15s',
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: `${area.color}1A`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AreaIcon name={area.name} color={area.color} />
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      lineHeight: 1.2,
                      color: isOn ? area.color : COLORS.inkSoft,
                      textAlign: 'center',
                    }}
                  >
                    {area.name}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedArea && (
            <div
              style={{
                marginTop: 10,
                padding: '12px 14px',
                borderRadius: 13,
                background: '#FFFFFF',
                border: `1px solid ${COLORS.line}`,
                color: COLORS.inkSoft,
                fontSize: 12.5,
                lineHeight: 1.5,
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
            marginTop: 28,
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
                fontSize: 18,
                margin: 0,
                color: COLORS.ink,
                letterSpacing: '-0.01em',
              }}
            >
              Encontrar
            </h2>

            <span
              style={{
                color: COLORS.inkFaint,
                fontSize: 11.5,
                fontWeight: 600,
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
              gap: 8,
              marginTop: 12,
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
                  color: COLORS.ink,
                  background: '#FFFFFF',
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 12,
                  padding: '13px 12px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  display: 'block',
                  transition: 'border-color .15s, background .15s',
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
            marginTop: 32,
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
                fontSize: 18,
                margin: 0,
                color: COLORS.ink,
                letterSpacing: '-0.01em',
              }}
            >
              Negócios perto de você
            </h2>

            <span
              style={{
                fontSize: 11.5,
                color: COLORS.inkFaint,
                fontWeight: 600,
              }}
            >
              {provinceName}
            </span>
          </div>

          {loading && (
            <p style={{ color: COLORS.inkFaint, fontSize: 13 }}>
              A carregar…
            </p>
          )}

          {!loading &&
            businesses.length === 0 && (
              <div
                style={{
                  padding: '28px 22px',
                  borderRadius: 16,
                  background: `linear-gradient(180deg, #FFFFFF, ${COLORS.canvas})`,
                  border: `1.5px dashed ${COLORS.line}`,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 13,
                    background: COLORS.goldSoft,
                    color: COLORS.goldDark,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 22s7-7.58 7-12a7 7 0 1 0-14 0c0 4.42 7 12 7 12z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                </div>
                <p style={{ color: COLORS.inkSoft, fontSize: 13, lineHeight: 1.5 }}>
                  Ainda não há negócios publicados nesta região.
                </p>
              </div>
            )}

          {!loading &&
            businesses.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit,minmax(190px,1fr))',
                  gap: 12,
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
                      border: `1px solid ${COLORS.line}`,
                      borderRadius: 15,
                      padding: 12,
                      display: 'block',
                      transition: 'box-shadow .15s, border-color .15s',
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
                          borderRadius: 11,
                          marginBottom: 9,
                        }}
                      />
                    )}

                    <h3
                      style={{
                        fontSize: 14,
                        margin: '3px 0 5px',
                        color: COLORS.ink,
                      }}
                    >
                      {business.name}
                    </h3>

                    {business.description && (
                      <p
                        style={{
                          fontSize: 11.5,
                          color: COLORS.inkSoft,
                          margin: '0 0 8px',
                          lineHeight: 1.45,
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
                          fontSize: 10.5,
                          color: COLORS.inkFaint,
                          fontWeight: 600,
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
    
                
          
          
                          
                        
      
