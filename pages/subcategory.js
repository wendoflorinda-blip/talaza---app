      
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

      {loading && (
        <p style={{ color: 'var(--ink-faint)' }}>
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

          {/* PESQUISA */}
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

          {/* DESTAQUES PREMIUM */}
          <section
            style={{
              marginTop: 25,
              marginBottom: 30,
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
              <div>
                <h2
                  style={{
                    fontSize: 19,
                    margin: 0,
                    color: '#17342F',
                  }}
                >
                  Destaques Premium
                </h2>

                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 11,
                    color: '#7A8986',
                  }}
                >
                  Negócios que escolheram estar em destaque.
                </p>
              </div>
            </div>

            {premiumLoading && (
              <p
                style={{
                  color: '#7A8986',
                  fontSize: 12,
                }}
              >
                A carregar destaques…
              </p>
            )}

            {!premiumLoading &&
              premiumBusinesses.length === 0 && (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    background: '#FFFFFF',
                    border: '1px solid #DCE6E3',
                    color: '#7A8986',
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
                    paddingBottom: 5,
                    scrollbarWidth: 'thin',
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
                          flex: '0 0 155px',
                          border: '1px solid #D8E2DF',
                          borderRadius: 16,
                          background: '#FFFFFF',
                          padding: 8,
                          cursor: 'pointer',
                          textAlign: 'left',
                          boxShadow:
                            '0 5px 16px rgba(7,91,78,0.07)',
                        }}
                      >
                        {business.logo_url ? (
                          <img
                            src={business.logo_url}
                            alt={business.name}
                            style={{
                              width: '100%',
                              height: 115,
                              objectFit: 'cover',
                              borderRadius: 11,
                              display: 'block',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: 115,
                              borderRadius: 11,
                              background: '#EAF4F1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#075B4E',
                              fontSize: 30,
                              fontWeight: 900,
                            }}
                          >
                            {business.name
                              ?.charAt(0)
                              ?.toUpperCase()}
                          </div>
                        )}

                        <div
                          style={{
                            marginTop: 9,
                            fontSize: 13,
                            fontWeight: 800,
                            color: '#17342F',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {business.name}
                        </div>

                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 10,
                            color: '#B88300',
                            fontWeight: 800,
                          }}
                        >
                          PREMIUM
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
                          borderRadius: 10,
                          marginBottom: 8,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: 105,
                          borderRadius: 10,
                          background: '#EAF4F1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#075B4E',
                          fontSize: 28,
                          fontWeight: 900,
                          marginBottom: 8,
                        }}
                      >
                        {business.name
                          ?.charAt(0)
                          ?.toUpperCase()}
                      </div>
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

      {/* FEED DOS DESTAQUES PREMIUM */}
      {premiumOpen &&
        currentPremium && (
          <div
            onWheel={handlePremiumWheel}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: '#071C18',
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
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: 0.5,
                }}
              >
                DESTAQUE PREMIUM
              </div>

              <div
                style={{
                  fontSize: 11,
                  opacity: 0.8,
                }}
              >
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
                      'linear-gradient(145deg, #075B4E, #0B7563)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 90,
                    fontWeight: 900,
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
                    fontSize: 22,
                    fontWeight: 900,
                    marginBottom: 14,
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
                      background: '#E6A900',
                      color: '#17342F',
                      borderRadius: 12,
                      padding: '11px 15px',
                      fontWeight: 900,
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
                      fontWeight: 800,
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
                            ? '#E6A900'
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
