import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import TalazaMenu from '../components/TalazaMenu';

const COLORS = {
  brand: '#0F6E5C',
  brandDark: '#083F35',
  brandDeep: '#062F29',
  brandSoft: '#E8F3F0',
  gold: '#DDA10A',
  goldDark: '#8A6607',
  goldSoft: '#FBF1D7',
  purple: '#7252B8',
  purpleSoft: '#F1ECFA',
  ink: '#17211F',
  inkSoft: '#596560',
  inkFaint: '#89948F',
  canvas: '#F8F7F3',
  surface: '#FFFFFF',
  line: '#E5E9E7',
};

const AREAS = [
  {
    name: 'Encontrar',
    description:
      'Encontre negócios, produtos, serviços e soluções perto de você.',
    color: COLORS.brand,
    icon: 'search',
    action: 'scroll',
  },
  {
    name: 'Contratar',
    description:
      'Publique uma vaga e encontre pessoas disponíveis para trabalhar.',
    color: COLORS.brand,
    icon: 'briefcase',
    route: '/contratar',
  },
  {
    name: 'Comunidade',
    description:
      'Partilhe perguntas, recomendações, avisos e ideias com a comunidade Talaza.',
    color: COLORS.purple,
    icon: 'community',
    route: '/comunidade',
  },
  {
    name: 'Oportunidades',
    description:
      'Veja vagas e oportunidades publicadas para pessoas da sua província.',
    color: COLORS.purple,
    icon: 'opportunity',
    route: '/oportunidades',
  },
  {
    name: 'Eventos',
    description:
      'Descubra eventos, cursos, feiras, lançamentos e outros momentos especiais.',
    color: COLORS.gold,
    icon: 'calendar',
    route: '/eventos',
  },
  {
    name: 'Ebooks',
    description:
      'Descubra ebooks para aprender, desenvolver novas habilidades e explorar conhecimentos.',
    color: COLORS.gold,
    icon: 'book',
    route: '/ebooks',
  },
];

const CATEGORY_ICON_BY_NAME = {
  restaurantes: 'food',
  alimentação: 'food',
  alimentos: 'food',
  comida: 'food',
  bebidas: 'food',

  beleza: 'beauty',
  'beleza e estética': 'beauty',
  estética: 'beauty',
  cabeleireiros: 'beauty',

  saúde: 'health',
  'saúde e bem-estar': 'health',
  medicina: 'health',
  farmácia: 'health',

  educação: 'education',
  'educação e formação': 'education',
  escolas: 'education',
  formação: 'education',

  tecnologia: 'technology',
  informática: 'technology',
  'informática e tecnologia': 'technology',

  construção: 'construction',
  'construção e manutenção': 'construction',
  manutenção: 'construction',

  transporte: 'transport',
  'transporte e logística': 'transport',
  logística: 'transport',

  comércio: 'commerce',
  'vendas e comércio': 'commerce',
  vendas: 'commerce',

  agricultura: 'agriculture',
  'agricultura e produção': 'agriculture',

  eventos: 'events',
  entretenimento: 'events',

  imóveis: 'home',
  imobiliário: 'home',
  habitação: 'home',

  automóveis: 'car',
  automóveis: 'car',
  carros: 'car',

  serviços: 'services',
  profissionais: 'services',

  fotografia: 'camera',
  música: 'music',

  outros: 'other',
};

function AreaIcon({ type, color }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  const paths = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" />
      </>
    ),

    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M3 12h18" />
      </>
    ),

    community: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.7 2.7-6 6-6s6 2.3 6 6" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M16 14.5c2.6.4 4.5 2.3 4.5 5.5" />
      </>
    ),

    opportunity: (
      <>
        <path d="M7 17 17 7" />
        <path d="M7 7h10v10" />
      </>
    ),

    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <line x1="8" y1="3" x2="8" y2="7" />
        <line x1="16" y1="3" x2="16" y2="7" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),

    book: (
      <>
        <path d="M4 5a3 3 0 0 1 3-3h13v18H7a3 3 0 0 0-3 3V5Z" />
        <path d="M7 20h13" />
      </>
    ),
  };

  return <svg {...common}>{paths[type]}</svg>;
}

function CategoryIcon({ type, color }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  const icons = {
    food: (
      <>
        <path d="M7 3v7" />
        <path d="M4.5 3v7a2.5 2.5 0 0 0 5 0V3" />
        <path d="M7 12v9" />
        <path d="M17 3v18" />
        <path d="M17 3c-2.2 1.4-3.3 3.5-3.3 6 0 2.1 1.2 3.4 3.3 3.4" />
      </>
    ),

    beauty: (
      <>
        <path d="M9 3v6" />
        <path d="M6.5 3v6a2.5 2.5 0 0 0 5 0V3" />
        <path d="M9 11.5V21" />
        <path d="M17 3v18" />
        <path d="M14.5 8.5h5" />
      </>
    ),

    health: (
      <>
        <path d="M12 21s-7-4.5-7-11a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 6.5-7 11-7 11Z" />
        <path d="M9 12h6" />
        <path d="M12 9v6" />
      </>
    ),

    education: (
      <>
        <path d="m3 9 9-5 9 5-9 5-9-5Z" />
        <path d="M7 11.5V16c3 2 7 2 10 0v-4.5" />
        <path d="M21 9v7" />
      </>
    ),

    technology: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
        <path d="M8 8h8M8 12h5" />
      </>
    ),

    construction: (
      <>
        <path d="m14 6 4-4 4 4-4 4" />
        <path d="M18 10 9 19a2.5 2.5 0 0 1-3.5 0l-.5-.5a2.5 2.5 0 0 1 0-3.5L14 6" />
        <path d="m3 21 3-3" />
      </>
    ),

    transport: (
      <>
        <path d="M5 17h14l-1-8H6l-1 8Z" />
        <path d="M7 9 8 5h8l1 4" />
        <circle cx="8" cy="18.5" r="1.5" />
        <circle cx="16" cy="18.5" r="1.5" />
      </>
    ),

    commerce: (
      <>
        <path d="M4 9h16l-1 11H5L4 9Z" />
        <path d="M7 9V6a5 5 0 0 1 10 0v3" />
      </>
    ),

    agriculture: (
      <>
        <path d="M12 21V9" />
        <path d="M12 12c-5 0-7-3-7-7 5 0 7 3 7 7Z" />
        <path d="M12 16c5 0 7-3 7-7-5 0-7 3-7 7Z" />
      </>
    ),

    events: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </>
    ),

    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </>
    ),

    car: (
      <>
        <path d="M5 17h14l-1-7H6l-1 7Z" />
        <path d="m7 10 1.5-4h7L17 10" />
        <circle cx="8" cy="18" r="1.5" />
        <circle cx="16" cy="18" r="1.5" />
      </>
    ),

    camera: (
      <>
        <path d="M4 7h4l1.5-2h5L16 7h4v12H4V7Z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),

    music: (
      <>
        <path d="M9 18V5l10-2v13" />
        <circle cx="6.5" cy="18" r="2.5" />
        <circle cx="16.5" cy="16" r="2.5" />
      </>
    ),

    services: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20h-2.6v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H6v-2.6h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V6h2.6v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v2.6h-.1a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),

    other: (
      <>
        <circle cx="5" cy="12" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="19" cy="12" r="1.5" />
      </>
    ),
  };

  return <svg {...common}>{icons[type] || icons.other}</svg>;
}

function getCategoryIcon(name) {
  const normalized = String(name || '')
    .trim()
    .toLowerCase();

  return CATEGORY_ICON_BY_NAME[normalized] || 'other';
}

function getCategoryColor(index) {
  const colors = [
    COLORS.brand,
    COLORS.gold,
    COLORS.purple,
    '#B35C4A',
    '#3975A6',
    '#5E7A43',
  ];

  return colors[index % colors.length];
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
  const [loadingCategories, setLoadingCategories] =
    useState(true);

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
  }, [
    router.isReady,
    country,
    province,
    query,
  ]);

  async function loadLocation() {
    const { data: countryData, error: countryError } =
      await supabase
        .from('countries')
        .select('id, name')
        .eq('id', country)
        .single();

    if (countryError) {
      console.error(
        'Erro ao carregar país:',
        countryError
      );
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
    setLoadingCategories(true);

    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error(
        'Erro ao carregar categorias:',
        error
      );

      setCategories([]);
      setLoadingCategories(false);
      return;
    }

    setCategories(data || []);
    setLoadingCategories(false);
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
      console.error(
        'Erro ao carregar negócios:',
        error
      );

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
        color: COLORS.ink,
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '0 18px 60px',
        }}
      >
        {/* CABEÇALHO */}
        <nav
          style={{
            minHeight: 72,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
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
              gap: 10,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 13,
                background: `linear-gradient(145deg, ${COLORS.brand}, ${COLORS.brandDark})`,
                color: COLORS.gold,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 20,
                boxShadow:
                  '0 7px 18px rgba(8,63,53,.18)',
              }}
            >
              T
            </div>

            <div>
              <div
                style={{
                  color: COLORS.brandDark,
                  fontSize: 19,
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                }}
              >
                Talaza
              </div>

              <div
                style={{
                  color: COLORS.inkFaint,
                  fontSize: 9.5,
                  fontWeight: 700,
                  marginTop: -1,
                }}
              >
                Tudo num só lugar
              </div>
            </div>
          </Link>

          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
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
                fontSize: 12,
                fontWeight: 800,
                padding: '9px 8px',
              }}
            >
              Já tenho conta
            </Link>

            <TalazaMenu
              country={country}
              province={province}
              countryName={countryName}
              provinceName={provinceName}
            />
          </div>
        </nav>

        {/* HERO / LOCALIZAÇÃO */}
        <section
          style={{
            paddingTop: 16,
            paddingBottom: 5,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 12px',
              borderRadius: 99,
              background: COLORS.brandSoft,
              color: COLORS.brandDark,
              fontSize: 11.5,
              fontWeight: 800,
            }}
          >
            <span style={{ color: COLORS.gold }}>
              ●
            </span>

            {countryName || 'País'} ·{' '}
            {provinceName || 'Província'}
          </div>

          <h1
            style={{
              margin: '17px 0 6px',
              fontSize:
                'clamp(27px, 5vw, 42px)',
              lineHeight: 1.04,
              letterSpacing: '-0.045em',
              color: COLORS.brandDark,
              fontWeight: 900,
              maxWidth: 680,
            }}
          >
            Encontre o que precisa.
            <br />
            Descubra o que pode fazer.
          </h1>

          <p
            style={{
              margin: 0,
              maxWidth: 620,
              color: COLORS.inkSoft,
              fontSize: 13.5,
              lineHeight: 1.65,
            }}
          >
            Explore negócios, produtos, serviços,
            oportunidades e muito mais na sua região.
          </p>
        </section>

        {/* PESQUISA */}
        <div
          style={{
            marginTop: 20,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 15,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          >
            <AreaIcon
              type="search"
              color={COLORS.inkFaint}
            />
          </div>

          <input
            value={query}
            onChange={(e) =>
              setQuery(e.target.value)
            }
            placeholder="Pesquisar negócios, produtos ou serviços…"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: `1px solid ${COLORS.line}`,
              borderRadius: 16,
              padding:
                '14px 16px 14px 46px',
              fontSize: 13,
              background: COLORS.surface,
              color: COLORS.ink,
              outline: 'none',
              boxShadow:
                '0 6px 22px rgba(20,50,43,.04)',
            }}
          />
        </div>

        {/* ÁREAS */}
        <section style={{ marginTop: 22 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(6, minmax(80px, 1fr))',
              gap: 9,
            }}
          >
            {AREAS.map((area) => {
              const isOn =
                selectedArea === area.name;

              return (
                <button
                  key={area.name}
                  type="button"
                  onClick={() =>
                    handleAreaClick(area)
                  }
                  style={{
                    minWidth: 0,
                    border: `1px solid ${
                      isOn
                        ? area.color
                        : COLORS.line
                    }`,
                    borderRadius: 16,
                    background: isOn
                      ? `${area.color}12`
                      : COLORS.surface,
                    padding:
                      '12px 7px 11px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 7,
                    transition:
                      'all .18s ease',
                    boxShadow: isOn
                      ? `0 8px 22px ${area.color}18`
                      : '0 4px 14px rgba(20,50,43,.025)',
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 11,
                      background: `${area.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AreaIcon
                      type={area.icon}
                      color={area.color}
                    />
                  </div>

                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      lineHeight: 1.2,
                      color: isOn
                        ? area.color
                        : COLORS.inkSoft,
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
                marginTop: 11,
                padding: '13px 15px',
                borderRadius: 15,
                background: COLORS.surface,
                border: `1px solid ${COLORS.line}`,
                color: COLORS.inkSoft,
                fontSize: 12,
                lineHeight: 1.55,
              }}
            >
              {
                AREAS.find(
                  (area) =>
                    area.name ===
                    selectedArea
                )?.description
              }
            </div>
          )}
        </section>

        {/* CATEGORIAS */}
        <section
          id="categorias"
          style={{
            marginTop: 34,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: COLORS.goldDark,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '.12em',
                  marginBottom: 5,
                }}
              >
                Explorar
              </div>

              <h2
                style={{
                  fontSize: 22,
                  margin: 0,
                  color: COLORS.ink,
                  letterSpacing: '-0.035em',
                }}
              >
                Encontre por categoria
              </h2>
            </div>

            <span
              style={{
                color: COLORS.inkFaint,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {provinceName}
            </span>
          </div>

          {loadingCategories && (
            <div
              style={{
                marginTop: 14,
                padding: 20,
                background: COLORS.surface,
                borderRadius: 16,
                border: `1px solid ${COLORS.line}`,
                color: COLORS.inkFaint,
                fontSize: 12,
              }}
            >
              A carregar categorias…
            </div>
          )}

          {!loadingCategories &&
            categories.length === 0 && (
              <div
                style={{
                  marginTop: 14,
                  padding: 22,
                  borderRadius: 16,
                  background: COLORS.surface,
                  border: `1px dashed ${COLORS.line}`,
                  color: COLORS.inkSoft,
                  fontSize: 12.5,
                  textAlign: 'center',
                }}
              >
                Ainda não existem categorias
                disponíveis.
              </div>
            )}

          {!loadingCategories &&
            categories.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit,minmax(145px,1fr))',
                  gap: 10,
                  marginTop: 14,
                }}
              >
                {categories.map(
                  (category, index) => {
                    const color =
                      getCategoryColor(
                        index
                      );

                    const icon =
                      getCategoryIcon(
                        category.name
                      );

                    return (
                      <Link
                        key={category.id}
                        href={{
                          pathname:
                            '/category',
                          query: {
                            id: category.id,
                            country,
                            province,
                          },
                        }}
                        style={{
                          textDecoration:
                            'none',
                          color: COLORS.ink,
                          background:
                            COLORS.surface,
                          border: `1px solid ${COLORS.line}`,
                          borderRadius: 17,
                          padding:
                            '14px 13px',
                          display: 'flex',
                          alignItems:
                            'center',
                          gap: 11,
                          boxShadow:
                            '0 5px 18px rgba(20,50,43,.035)',
                          transition:
                            'transform .15s ease, box-shadow .15s ease',
                        }}
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 13,
                            background: `${color}12`,
                            display:
                              'flex',
                            alignItems:
                              'center',
                            justifyContent:
                              'center',
                            flexShrink: 0,
                          }}
                        >
                          <CategoryIcon
                            type={icon}
                            color={color}
                          />
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 12.5,
                              fontWeight: 800,
                              lineHeight:
                                1.3,
                              color:
                                COLORS.ink,
                            }}
                          >
                            {
                              category.name
                            }
                          </div>

                          <div
                            style={{
                              marginTop: 3,
                              fontSize: 9.8,
                              color:
                                COLORS.inkFaint,
                            }}
                          >
                            Explorar
                          </div>
                        </div>
                      </Link>
                    );
                  }
                )}
              </div>
            )}
        </section>

        {/* NEGÓCIOS */}
        <section
          style={{
            marginTop: 38,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: 13,
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: COLORS.goldDark,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '.12em',
                  marginBottom: 5,
                }}
              >
                Vitrine local
              </div>

              <h2
                style={{
                  fontSize: 22,
                  margin: 0,
                  color: COLORS.ink,
                  letterSpacing: '-0.035em',
                }}
              >
                Negócios perto de você
              </h2>
            </div>

            <span
              style={{
                fontSize: 11,
                color: COLORS.inkFaint,
                fontWeight: 700,
              }}
            >
              {provinceName}
            </span>
          </div>

          {loading && (
            <div
              style={{
                padding: 22,
                borderRadius: 17,
                background: COLORS.surface,
                border: `1px solid ${COLORS.line}`,
                color: COLORS.inkFaint,
                fontSize: 12.5,
              }}
            >
              A carregar negócios…
            </div>
          )}

          {!loading &&
            businesses.length === 0 && (
              <div
                style={{
                  padding: '34px 22px',
                  borderRadius: 18,
                  background: COLORS.surface,
                  border: `1px dashed ${COLORS.line}`,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 15,
                    background:
                      COLORS.goldSoft,
                    color: COLORS.goldDark,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin:
                      '0 auto 13px',
                  }}
                >
                  <svg
                    width="23"
                    height="23"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s7-7.58 7-12a7 7 0 1 0-14 0c0 4.42 7 12 7 12z" />
                    <circle
                      cx="12"
                      cy="10"
                      r="2.5"
                    />
                  </svg>
                </div>

                <p
                  style={{
                    margin: 0,
                    color: COLORS.inkSoft,
                    fontSize: 13,
                    lineHeight: 1.55,
                  }}
                >
                  Ainda não há negócios
                  publicados nesta região.
                </p>
              </div>
            )}

          {!loading &&
            businesses.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit,minmax(200px,1fr))',
                  gap: 13,
                }}
              >
                {businesses.map(
                  (business) => (
                    <Link
                      key={business.id}
                      href={`/businesses/${business.id}?country=${country}&province=${province}`}
                      style={{
                        textDecoration:
                          'none',
                        color: 'inherit',
                        background:
                          COLORS.surface,
                        border: `1px solid ${COLORS.line}`,
                        borderRadius: 18,
                        padding: 11,
                        display: 'block',
                        boxShadow:
                          '0 7px 24px rgba(20,50,43,.045)',
                      }}
                    >
                      {business.logo_url ? (
                        <img
                          src={
                            business.logo_url
                          }
                          alt={
                            business.name
                          }
                          style={{
                            width: '100%',
                            height: 125,
                            objectFit:
                              'cover',
                            borderRadius: 13,
                            marginBottom: 10,
                            display:
                              'block',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: 125,
                            borderRadius: 13,
                            marginBottom: 10,
                            background: `linear-gradient(145deg, ${COLORS.brandSoft}, ${COLORS.goldSoft})`,
                            display:
                              'flex',
                            alignItems:
                              'center',
                            justifyContent:
                              'center',
                            color:
                              COLORS.brand,
                            fontSize: 30,
                            fontWeight: 900,
                          }}
                        >
                          {String(
                            business.name ||
                              'T'
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}

                      <h3
                        style={{
                          fontSize: 14,
                          margin:
                            '3px 2px 5px',
                          color:
                            COLORS.ink,
                          letterSpacing:
                            '-0.01em',
                        }}
                      >
                        {
                          business.name
                        }
                      </h3>

                      {business.description && (
                        <p
                          style={{
                            fontSize: 11.5,
                            color:
                              COLORS.inkSoft,
                            margin:
                              '0 2px 8px',
                            lineHeight: 1.45,
                            display:
                              '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient:
                              'vertical',
                            overflow:
                              'hidden',
                          }}
                        >
                          {
                            business.description
                          }
                        </p>
                      )}

                      {(business.municipality ||
                        business.neighborhood) && (
                        <div
                          style={{
                            margin:
                              '0 2px',
                            fontSize: 10.5,
                            color:
                              COLORS.inkFaint,
                            fontWeight: 700,
                          }}
                        >
                          {
                            business.municipality
                          }

                          {business.municipality &&
                          business.neighborhood
                            ? ' · '
                            : ''}

                          {
                            business.neighborhood
                          }
                        </div>
                      )}
                    </Link>
                  )
                )}
              </div>
            )}
        </section>
      </div>
    </div>
  );
}
    
                
          
          
                          
                        
      
