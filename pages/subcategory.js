import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

// Paleta de apoio só para dar cor aos cartões quando não há foto —
// mesma lógica visual do protótipo (cada negócio ganha uma cor fixa).
const HUES = ['#0F6E5C', '#8A4B2B', '#6B3FA0', '#2E6B7A', '#A0522D', '#4B5D67', '#7A5C2E'];
function getHue(business, index) {
  return HUES[index % HUES.length];
}
function getInitials(name) {
  return (name || '')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function Subcategory() {
  const router = useRouter();

  const {
    id,
    country,
    province,
  } = router.query;

  const [subcategory, setSubcategory] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [premiumBusinesses, setPremiumBusinesses] = useState([]);

  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');

  const [query, setQuery] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [loading, setLoading] = useState(true);
  const [premiumLoading, setPremiumLoading] = useState(true);
  const [error, setError] = useState('');

  const [premiumOpen, setPremiumOpen] = useState(false);
  const [premiumIndex, setPremiumIndex] = useState(0);

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
    loadPremiumBusinesses();
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

    const {
      data,
      error: subcategoryError,
    } = await supabase
      .from('subcategories')
      .select(`
        id,
        created_at,
        category_id,
        name,
        description
      `)
      .eq('id', id)
      .single();

    if (subcategoryError) {
      console.error(subcategoryError);

      setError(
        'Não foi possível carregar esta subcategoria.'
      );

      setLoading(false);
      return;
    }

    const {
      data: provinceData,
      error: provinceError,
    } = await supabase
      .from('provinces')
      .select('id, name, country_id')
      .eq('id', province)
      .eq('country_id', country)
      .single();

    if (provinceError || !provinceData) {
      setError(
        'A província selecionada não pertence ao país escolhido.'
      );

      setLoading(false);
      return;
    }

    const {
      data: countryData,
    } = await supabase
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

    const {
      data,
      error: businessesError,
    } = await request;

    if (businessesError) {
      console.error(businessesError);
      setBusinesses([]);
      setLoading(false);
      return;
    }

    setBusinesses(data || []);
    setLoading(false);
  }

  async function loadPremiumBusinesses() {
    setPremiumLoading(true);

    /*
      Destaques Premium usam a tabela existente:

      business_subscriptions
      - id
      - created_at
      - business_id
      - plan_id
      - starts_at
      - ends_at
      - status

      Um negócio só entra aqui quando possui uma
      assinatura válida neste momento.
    */

    const now = new Date().toISOString();

    const {
      data: subscriptions,
      error: subscriptionError,
    } = await supabase
      .from('business_subscriptions')
      .select(`
        id,
        business_id,
        plan_id,
        starts_at,
        ends_at,
        status
      `)
      .eq('status', 'active')
      .lte('starts_at', now)
      .gte('ends_at', now);

    if (subscriptionError) {
      console.error(subscriptionError);
      setPremiumBusinesses([]);
      setPremiumLoading(false);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      setPremiumBusinesses([]);
      setPremiumLoading(false);
      return;
    }

    const businessIds = [
      ...new Set(
        subscriptions
          .map((subscription) => subscription.business_id)
          .filter(Boolean)
      ),
    ];

    if (businessIds.length === 0) {
      setPremiumBusinesses([]);
      setPremiumLoading(false);
      return;
    }

    const {
      data: premiumData,
      error: premiumError,
    } = await supabase
      .from('businesses')
      .select(`
        id,
        name,
        description,
        municipality,
        neighborhood,
        logo_url,
        country_id,
        province_id,
        subcategory_id,
        is_active,
        approval_status
      `)
      .in('id', businessIds)
      .eq('country_id', country)
      .eq('province_id', province)
      .eq('subcategory_id', id)
      .eq('is_active', true)
      .eq('approval_status', 'approved');

    if (premiumError) {
      console.error(premiumError);
      setPremiumBusinesses([]);
      setPremiumLoading(false);
      return;
    }

    /*
      Mantemos apenas os negócios que possuem
      assinatura válida.
    */

    const validSubscriptionBusinessIds = new Set(
      subscriptions.map(
        (subscription) => subscription.business_id
      )
    );

    const filteredPremium = (premiumData || []).filter(
      (business) =>
        validSubscriptionBusinessIds.has(business.id)
    );

    setPremiumBusinesses(filteredPremium);
    setPremiumLoading(false);
  }

  function openPremiumFeed(index) {
    setPremiumIndex(index);
    setPremiumOpen(true);

    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  }

  function closePremiumFeed() {
    setPremiumOpen(false);

    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  function nextPremium() {
    if (premiumBusinesses.length === 0) return;

    setPremiumIndex((current) =>
      current >= premiumBusinesses.length - 1
        ? 0
        : current + 1
    );
  }

  function previousPremium() {
    if (premiumBusinesses.length === 0) return;

    setPremiumIndex((current) =>
      current <= 0
        ? premiumBusinesses.length - 1
        : current - 1
    );
  }

  function handlePremiumWheel(event) {
    if (event.deltaY > 0) {
      nextPremium();
    } else if (event.deltaY < 0) {
      previousPremium();
    }
  }

  const currentPremium =
    premiumBusinesses[premiumIndex];
  const currentPremiumHue =
    currentPremium
      ? getHue(currentPremium, premiumBusinesses.indexOf(currentPremium))
      : '#0F6E5C';

  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div style={{ background: '#FAF7F2', minHeight: '100vh' }}>
        {/* BARRA VERDE DO TOPO */}
        <div
          style={{
            background: '#0A2E27',
            color: '#fff',
            padding: '16px 18px 14px',
          }}
        >
          <div
            style={{
              maxWidth: 1080,
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
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
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  background: '#DDA10A',
                  color: '#0A2E27',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                T
              </div>
              <b
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 600,
                  fontSize: 19,
                  letterSpacing: '.2px',
                }}
              >
                Talaza
              </b>
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
              style={{
                textDecoration: 'none',
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
              }}
              title="Voltar à categoria"
            >
              ←
            </Link>
          </div>

          <div
            style={{
              maxWidth: 1080,
              margin: '12px auto 0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              color: 'rgba(255,255,255,0.75)',
            }}
          >
            📍 <b style={{ color: '#fff', fontWeight: 600 }}>{countryName}</b> · {provinceName}
          </div>
        </div>

        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 18px 50px' }}>
          {loading && (
            <p style={{ color: '#5B655F', fontSize: 13, marginTop: 20 }}>
              A carregar…
            </p>
          )}

          {error && (
            <div
              style={{
                marginTop: 20,
                padding: 14,
                borderRadius: 12,
                background: '#FFF1F0',
                border: '1px solid #F7C9C4',
                color: '#9B2C2C',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {!loading && !error && subcategory && (
            <>
              {/* TÍTULO */}
              <h1
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 600,
                  fontSize: 27,
                  marginTop: 20,
                  marginBottom: 6,
                  color: '#1C2321',
                }}
              >
                {subcategory.name}
              </h1>

              {subcategory.description && (
                <p
                  style={{
                    color: '#5B655F',
                    fontSize: 13.5,
                    marginTop: 0,
                    maxWidth: 480,
                    lineHeight: 1.5,
                  }}
                >
                  {subcategory.description}
                </p>
              )}

              {/* PESQUISA — compacta, numa linha */}
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#fff',
                    border: '1px solid #E7E2D6',
                    borderRadius: 13,
                    padding: '11px 14px',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9AA39D" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    style={{
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontSize: 13.5,
                      width: '100%',
                      fontFamily: 'inherit',
                    }}
                    placeholder="Pesquisar por nome…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowMoreFilters((v) => !v)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#0F6E5C',
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {showMoreFilters ? 'Fechar' : 'Município/Bairro'}
                  </button>
                </div>

                {showMoreFilters && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 7,
                      marginTop: 7,
                    }}
                  >
                    <input
                      style={{
                        flex: 1,
                        border: '1px solid #E7E2D6',
                        borderRadius: 10,
                        padding: '8px 11px',
                        fontSize: 12,
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                      placeholder="Município"
                      value={municipality}
                      onChange={(e) => setMunicipality(e.target.value)}
                    />
                    <input
                      style={{
                        flex: 1,
                        border: '1px solid #E7E2D6',
                        borderRadius: 10,
                        padding: '8px 11px',
                        fontSize: 12,
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                      placeholder="Bairro"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* DESTAQUES PREMIUM */}
              <section style={{ marginTop: 26, marginBottom: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <h2
                    style={{
                      fontFamily: "'Fraunces', serif",
                      fontSize: 18,
                      fontWeight: 600,
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      color: '#1C2321',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>👑</span> Destaques Premium
                  </h2>
                  {premiumBusinesses.length > 0 && (
                    <span style={{ fontSize: 11.5, color: '#5B655F' }}>deslize →</span>
                  )}
                </div>

                {premiumLoading && (
                  <p style={{ color: '#5B655F', fontSize: 12 }}>A carregar destaques…</p>
                )}

                {!premiumLoading && premiumBusinesses.length === 0 && (
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 14,
                      background: '#FFFFFF',
                      border: '1px solid #E7E2D6',
                      color: '#5B655F',
                      fontSize: 12.5,
                    }}
                  >
                    Ainda não existem Destaques Premium nesta subcategoria.
                  </div>
                )}

                {!premiumLoading && premiumBusinesses.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      overflowX: 'auto',
                      paddingBottom: 6,
                    }}
                  >
                    {premiumBusinesses.map((business, index) => {
                      const hue = getHue(business, index);
                      return (
                        <button
                          key={business.id}
                          type="button"
                          onClick={() => openPremiumFeed(index)}
                          style={{
                            flex: '0 0 120px',
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <div
                            style={{
                              width: 120,
                              height: 142,
                              borderRadius: 16,
                              position: 'relative',
                              overflow: 'hidden',
                              boxShadow: '0 6px 16px -6px rgba(10,46,39,0.3)',
                              backgroundImage: business.logo_url
                                ? `url(${business.logo_url})`
                                : undefined,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              background: business.logo_url ? undefined : hue,
                              display: 'flex',
                              alignItems: 'flex-end',
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background:
                                  'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)',
                              }}
                            />
                            <span
                              style={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                background: '#DDA10A',
                                color: '#0A2E27',
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '3px 7px',
                                borderRadius: 20,
                                zIndex: 2,
                              }}
                            >
                              👑 Premium
                            </span>
                            <span
                              style={{
                                position: 'relative',
                                zIndex: 2,
                                color: '#fff',
                                fontSize: 12.5,
                                fontWeight: 600,
                                padding: '0 10px 10px',
                                lineHeight: 1.25,
                              }}
                            >
                              {business.name}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* NEGÓCIOS — "Encontre aqui" */}
              <section style={{ marginTop: 22 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <h2
                    style={{
                      fontFamily: "'Fraunces', serif",
                      fontSize: 18,
                      fontWeight: 600,
                      margin: 0,
                      color: '#1C2321',
                    }}
                  >
                    Encontre aqui
                  </h2>
                  <span style={{ color: '#5B655F', fontSize: 11 }}>{provinceName}</span>
                </div>

                {loading && (
                  <p style={{ color: '#5B655F', fontSize: 13 }}>A carregar…</p>
                )}

                {!loading && businesses.length === 0 && (
                  <div
                    style={{
                      padding: 17,
                      borderRadius: 13,
                      background: '#FFFFFF',
                      border: '1px solid #E7E2D6',
                      color: '#5B655F',
                      fontSize: 13,
                    }}
                  >
                    Ainda não há negócios cadastrados nesta subcategoria nesta região.
                  </div>
                )}

                {!loading && businesses.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
                      gap: 10,
                    }}
                  >
                    {businesses.map((business, index) => {
                      const hue = getHue(business, index);
                      return (
                        <Link
                          key={business.id}
                          href={`/businesses/${business.id}?country=${country}&province=${province}`}
                          style={{
                            textDecoration: 'none',
                            color: 'inherit',
                            display: 'flex',
                            gap: 12,
                            background: '#FFFFFF',
                            border: '1px solid #E7E2D6',
                            borderRadius: 14,
                            padding: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 64,
                              height: 64,
                              borderRadius: 10,
                              flexShrink: 0,
                              backgroundImage: business.logo_url
                                ? `url(${business.logo_url})`
                                : undefined,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              background: business.logo_url ? undefined : hue,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontFamily: "'Fraunces', serif",
                              fontWeight: 600,
                              fontSize: 20,
                            }}
                          >
                            {!business.logo_url && getInitials(business.name)}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#1C2321' }}>
                              {business.name}
                            </p>
                            {(business.municipality || business.neighborhood) && (
                              <p style={{ fontSize: 12, color: '#5B655F', margin: '3px 0 5px' }}>
                                {business.neighborhood}
                                {business.municipality && business.neighborhood ? ' · ' : ''}
                                {business.municipality}
                              </p>
                            )}
                            {business.description && (
                              <p
                                style={{
                                  fontSize: 11.5,
                                  color: '#5B655F',
                                  margin: '0 0 6px',
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
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#0F6E5C',
                              }}
                            >
                              Ver perfil →
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      {/* FEED DOS DESTAQUES PREMIUM — ecrã cheio */}
      {premiumOpen && currentPremium && (
        <div
          onWheel={handlePremiumWheel}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#0A0A0A',
            color: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* TOPO DO FEED */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)',
            }}
          >
            <button
              type="button"
              onClick={closePremiumFeed}
              style={{
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'rgba(0,0,0,0.35)',
                color: '#FFFFFF',
                borderRadius: 10,
                padding: '9px 12px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              ← Voltar
            </button>

            <div
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                letterSpacing: 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              👑 DESTAQUE PREMIUM
            </div>

            <div style={{ fontSize: 11, opacity: 0.8 }}>
              {premiumIndex + 1}/{premiumBusinesses.length}
            </div>
          </div>

          {/* CONTEÚDO PRINCIPAL */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {currentPremium.logo_url ? (
              <img
                src={currentPremium.logo_url}
                alt={currentPremium.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: `linear-gradient(145deg, ${currentPremiumHue}, #0A2E27)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Fraunces', serif",
                  fontSize: 90,
                  fontWeight: 600,
                }}
              >
                {getInitials(currentPremium.name)}
              </div>
            )}

            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.05) 55%, rgba(0,0,0,0.18) 100%)',
              }}
            />

            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                padding: '24px 18px 28px',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: '#DDA10A',
                  color: '#0A2E27',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 20,
                  marginBottom: 10,
                }}
              >
                👑 Destaque Premium
              </span>

              <div
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: 24,
                  fontWeight: 600,
                  marginBottom: 14,
                }}
              >
                {currentPremium.name}
              </div>

              <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                <a
                  href={currentPremium.phone ? `sms:${currentPremium.phone}` : '#'}
                  onClick={(event) => {
                    if (!currentPremium.phone) {
                      event.preventDefault();
                    }
                  }}
                  style={{
                    textDecoration: 'none',
                    border: 'none',
                    background: '#DDA10A',
                    color: '#0A2E27',
                    borderRadius: 12,
                    padding: '11px 15px',
                    fontWeight: 700,
                    fontSize: 12,
                    opacity: currentPremium.phone ? 1 : 0.55,
                  }}
                >
                  Enviar SMS
                </a>

                <Link
                  href={`/businesses/${currentPremium.id}?country=${country}&province=${province}`}
                  style={{
                    textDecoration: 'none',
                    border: '1px solid rgba(255,255,255,0.5)',
                    background: 'rgba(255,255,255,0.12)',
                    color: '#FFFFFF',
                    borderRadius: 12,
                    padding: '11px 15px',
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  Ver perfil
                </Link>
              </div>
            </div>

            {premiumBusinesses.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={previousPremium}
                  aria-label="Destaque anterior"
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(0,0,0,0.25)',
                    color: '#FFFFFF',
                    fontSize: 20,
                    cursor: 'pointer',
                  }}
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={nextPremium}
                  aria-label="Próximo destaque"
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(0,0,0,0.25)',
                    color: '#FFFFFF',
                    fontSize: 20,
                    cursor: 'pointer',
                  }}
                >
                  ›
                </button>
              </>
            )}
          </div>

          {premiumBusinesses.length > 1 && (
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                gap: 4,
                zIndex: 4,
              }}
            >
              {premiumBusinesses.map((business, index) => (
                <span
                  key={business.id}
                  style={{
                    width: index === premiumIndex ? 18 : 5,
                    height: 4,
                    borderRadius: 5,
                    background: index === premiumIndex ? '#DDA10A' : 'rgba(255,255,255,0.45)',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
