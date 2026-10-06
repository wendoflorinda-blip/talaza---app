import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
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
  purpleLine: '#E4D3FB',
  ink: '#101828',
  inkSoft: '#475467',
  inkFaint: '#98A2B3',
  canvas: '#F7F8FA',
  line: '#E4E7EC',
};

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

  return (
    <div
      className="container"
      style={{
        paddingBottom: 50,
        background: COLORS.canvas,
        minHeight: '100vh',
      }}
    >
      {/* CABEÇALHO */}
      <nav
        className="topnav"
        style={{
          padding: '16px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
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
            className="logo"
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

          <b style={{ color: COLORS.brandDark, fontSize: 17, letterSpacing: '-0.01em' }}>
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
          className="btn btn-ghost"
          style={{
            marginLeft: 'auto',
            fontSize: 12.5,
            fontWeight: 700,
            color: COLORS.brand,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 10,
            padding: '8px 12px',
            background: '#fff',
          }}
        >
          ← Voltar
        </Link>
      </nav>

      {loading && (
        <p style={{ color: COLORS.inkFaint, fontSize: 13 }}>
          A carregar…
        </p>
      )}

      {error && (
        <div
          style={{
            marginTop: 20,
            padding: 14,
            borderRadius: 13,
            background: '#FFF1F0',
            border: '1px solid #FBD5D2',
            color: '#9B2C2C',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && subcategory && (
        <>
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

          {/* TÍTULO */}
          <h1
            style={{
              fontSize: 24,
              marginTop: 16,
              marginBottom: 5,
              color: COLORS.ink,
              letterSpacing: '-0.01em',
            }}
          >
            {subcategory.name}
          </h1>

          {subcategory.description && (
            <p
              style={{
                color: COLORS.inkSoft,
                fontSize: 13,
                marginTop: 0,
                lineHeight: 1.5,
              }}
            >
              {subcategory.description}
            </p>
          )}

          {/* PESQUISA */}
          <div style={{ margin: '18px 0' }}>
            <input
              className="input"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                margin: 0,
                border: `1.5px solid ${COLORS.line}`,
                borderRadius: 13,
                padding: '12px 14px',
                fontSize: 13.5,
                background: COLORS.canvas,
                outline: 'none',
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
                  border: `1.5px solid ${COLORS.line}`,
                  borderRadius: 11,
                  padding: '10px 12px',
                  fontSize: 12.5,
                  background: '#fff',
                  outline: 'none',
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
                  border: `1.5px solid ${COLORS.line}`,
                  borderRadius: 11,
                  padding: '10px 12px',
                  fontSize: 12.5,
                  background: '#fff',
                  outline: 'none',
                }}
                placeholder="Bairro"
                value={neighborhood}
                onChange={(e) =>
                  setNeighborhood(e.target.value)
                }
              />
            </div>
          </div>

          {/* DESTAQUES PREMIUM — roxo + coroa, discreto */}
          <section
            style={{
              marginTop: 24,
              marginBottom: 30,
              padding: '16px 16px 18px',
              borderRadius: 18,
              background: `linear-gradient(160deg, ${COLORS.purpleSoft} 0%, #FBF8FF 100%)`,
              border: `1px solid ${COLORS.purpleLine}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                marginBottom: 2,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  background: COLORS.purple,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  flexShrink: 0,
                  boxShadow: '0 4px 10px rgba(124,58,237,.3)',
                }}
              >
                👑
              </div>

              <h2
                style={{
                  fontSize: 15.5,
                  margin: 0,
                  color: COLORS.purpleDark,
                }}
              >
                Destaques Premium
              </h2>
            </div>

            <p
              style={{
                margin: '6px 0 0 37px',
                fontSize: 11.5,
                color: COLORS.inkSoft,
              }}
            >
              Negócios que escolheram estar em destaque.
            </p>

            {premiumLoading && (
              <p
                style={{
                  color: COLORS.inkFaint,
                  fontSize: 12,
                  marginTop: 14,
                }}
              >
                A carregar destaques…
              </p>
            )}

            {!premiumLoading &&
              premiumBusinesses.length === 0 && (
                <div
                  style={{
                    marginTop: 14,
                    padding: 14,
                    borderRadius: 12,
                    background: '#FFFFFF',
                    border: `1px solid ${COLORS.purpleLine}`,
                    color: COLORS.inkSoft,
                    fontSize: 12,
                  }}
                >
                  Ainda não existem Destaques Premium
                  nesta subcategoria.
                </div>
              )}

            {!premiumLoading &&
              premiumBusinesses.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    overflowX: 'auto',
                    paddingTop: 14,
                    paddingBottom: 4,
                  }}
                >
                  {premiumBusinesses.map(
                    (business, index) => (
                      <button
                        key={business.id}
                        type="button"
                        onClick={() =>
                          openPremiumFeed(index)
                        }
                        style={{
                          flex: '0 0 148px',
                          border: `1px solid ${COLORS.purpleLine}`,
                          borderRadius: 14,
                          background: '#FFFFFF',
                          padding: 8,
                          cursor: 'pointer',
                          textAlign: 'left',
                          boxShadow:
                            '0 8px 20px rgba(124,58,237,.14)',
                        }}
                      >
                        <div style={{ position: 'relative' }}>
                          {business.logo_url ? (
                            <img
                              src={business.logo_url}
                              alt={business.name}
                              style={{
                                width: '100%',
                                height: 100,
                                objectFit: 'cover',
                                borderRadius: 10,
                                display: 'block',
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '100%',
                                height: 100,
                                borderRadius: 10,
                                background: COLORS.brandSoft,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: COLORS.brand,
                                fontSize: 26,
                                fontWeight: 800,
                              }}
                            >
                              {business.name
                                ?.charAt(0)
                                ?.toUpperCase()}
                            </div>
                          )}

                          <span
                            style={{
                              position: 'absolute',
                              top: 6,
                              left: 6,
                              background: 'rgba(124,58,237,.92)',
                              color: '#fff',
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '3px 7px',
                              borderRadius: 7,
                            }}
                          >
                            👑 Premium
                          </span>
                        </div>

                        <div
                          style={{
                            marginTop: 9,
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: COLORS.ink,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {business.name}
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}
          </section>

          {/* NEGÓCIOS */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <h2 style={{ fontSize: 17, margin: 0, color: COLORS.ink }}>
              Encontre aqui
            </h2>

            <span style={{ color: COLORS.inkFaint, fontSize: 11, fontWeight: 600 }}>
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
                  padding: '26px 20px',
                  borderRadius: 15,
                  background: `linear-gradient(180deg, #FFFFFF, ${COLORS.canvas})`,
                  border: `1.5px dashed ${COLORS.line}`,
                  color: COLORS.inkSoft,
                  fontSize: 13,
                  textAlign: 'center',
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
                    }}
                  >
                    {business.logo_url ? (
                      <img
                        src={business.logo_url}
                        alt={business.name}
                        style={{
                          width: '100%',
                          height: 105,
                          objectFit: 'cover',
                          borderRadius: 11,
                          marginBottom: 9,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: 105,
                          borderRadius: 11,
                          background: COLORS.brandSoft,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: COLORS.brand,
                          fontSize: 28,
                          fontWeight: 800,
                          marginBottom: 9,
                        }}
                      >
                        {business.name
                          ?.charAt(0)
                          ?.toUpperCase()}
                      </div>
                    )}

                    <h3 style={{ fontSize: 14, margin: '3px 0 5px', color: COLORS.ink }}>
                      {business.name}
                    </h3>

                    {business.description && (
                      <p
                        style={{
                          fontSize: 11.5,
                          color: COLORS.inkSoft,
                          lineHeight: 1.45,
                          margin: '0 0 8px',
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
                      <div style={{ fontSize: 10.5, color: COLORS.inkFaint, fontWeight: 600 }}>
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

      {/* FEED DOS DESTAQUES PREMIUM */}
      {premiumOpen &&
        currentPremium && (
          <div
            onWheel={handlePremiumWheel}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: '#1B0F2E',
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
                background:
                  'linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)',
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
                }}
              >
                ← Voltar
              </button>

              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  letterSpacing: 0.4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                👑 DESTAQUE PREMIUM
              </div>

              <div style={{ fontSize: 11, opacity: 0.8 }}>
                {premiumIndex + 1}/
                {premiumBusinesses.length}
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
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background:
                      `linear-gradient(145deg, ${COLORS.purpleDark}, ${COLORS.purple})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 90,
                    fontWeight: 800,
                  }}
                >
                  {currentPremium.name
                    ?.charAt(0)
                    ?.toUpperCase()}
                </div>
              )}

              {/* LEVE SOBREPOSIÇÃO */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.05) 55%, rgba(0,0,0,0.18) 100%)',
                }}
              />

              {/* INFORMAÇÕES */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: '24px 18px 28px',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    background: COLORS.purple,
                    color: '#fff',
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 20,
                    marginBottom: 10,
                  }}
                >
                  👑 Premium
                </div>

                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    marginBottom: 14,
                    fontFamily: 'inherit',
                  }}
                >
                  {currentPremium.name}
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 9,
                    flexWrap: 'wrap',
                  }}
                >
                  <a
                    href={
                      currentPremium.phone
                        ? `sms:${currentPremium.phone}`
                        : '#'
                    }
                    onClick={(event) => {
                      if (!currentPremium.phone) {
                        event.preventDefault();
                      }
                    }}
                    style={{
                      textDecoration: 'none',
                      border: 'none',
                      background: COLORS.gold,
                      color: '#3A2B00',
                      borderRadius: 12,
                      padding: '11px 15px',
                      fontWeight: 800,
                      fontSize: 12,
                      opacity: currentPremium.phone
                        ? 1
                        : 0.55,
                    }}
                  >
                    Enviar SMS
                  </a>

                  <Link
                    href={`/businesses/${currentPremium.id}?country=${country}&province=${province}`}
                    style={{
                      textDecoration: 'none',
                      border: '1px solid rgba(255,255,255,0.5)',
                      background:
                        'rgba(255,255,255,0.12)',
                      color: '#FFFFFF',
                      borderRadius: 12,
                      padding: '11px 15px',
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    Ver perfil
                  </Link>
                </div>
              </div>

              {/* CONTROLES LATERAIS */}
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
                      border:
                        '1px solid rgba(255,255,255,0.3)',
                      background:
                        'rgba(0,0,0,0.25)',
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
                      border:
                        '1px solid rgba(255,255,255,0.3)',
                      background:
                        'rgba(0,0,0,0.25)',
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

            {/* INDICADOR */}
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
                {premiumBusinesses.map(
                  (business, index) => (
                    <span
                      key={business.id}
                      style={{
                        width:
                          index === premiumIndex
                            ? 18
                            : 5,
                        height: 4,
                        borderRadius: 5,
                        background:
                          index === premiumIndex
                            ? COLORS.gold
                            : 'rgba(255,255,255,0.45)',
                      }}
                    />
                  )
                )}
              </div>
            )}
          </div>
        )}
    </div>
  );
}                            
