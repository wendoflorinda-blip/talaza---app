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

  async function loadPremiumBusinesses() {
    setPremiumLoading(true);

    /*
      Primeiro encontramos as assinaturas ativas.
      Depois cruzamos com os negócios desta subcategoria.
    */

    const { data: subscriptions, error: subscriptionError } =
      await supabase
        .from('business_subscriptions')
        .select(`
          business_id,
          plan_id,
          starts_at,
          status
        `)
        .eq('status', 'active');

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

    const { data: premiumData, error: premiumError } =
      await supabase
        .from('businesses')
        .select(`
          id,
          name,
          description,
          municipality,
          neighborhood,
          logo_url
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

    setPremiumBusinesses(premiumData || []);
    setPremiumLoading(false);
  }

  function openPremium(index = 0) {
    setPremiumIndex(index);
    setPremiumOpen(true);
  }

  function closePremium() {
    setPremiumOpen(false);
  }

  function nextPremium() {
    if (premiumIndex < premiumBusinesses.length - 1) {
      setPremiumIndex((current) => current + 1);
    }
  }

  function previousPremium() {
    if (premiumIndex > 0) {
      setPremiumIndex((current) => current - 1);
    }
  }

  function sendSMS(business) {
    if (!business) return;

    /*
      Ainda não existe no código fornecido um campo de telefone
      específico do negócio. Por isso não inventamos uma coluna.
    */

    alert(
      `O contacto de ${business.name} será ligado aqui quando o campo de telefone/SMS estiver definido.`
    );
  }

  if (premiumOpen && premiumBusinesses.length > 0) {
    const business = premiumBusinesses[premiumIndex];

    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#000000',
          color: '#FFFFFF',
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          overflow: 'hidden',
        }}
      >
        {/* TOPO DO FEED */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 15px',
            background:
              'linear-gradient(to bottom, rgba(0,0,0,.75), transparent)',
          }}
        >
          <button
            type="button"
            onClick={closePremium}
            style={{
              border: '1px solid rgba(255,255,255,.25)',
              background: 'rgba(0,0,0,.35)',
              color: '#FFFFFF',
              borderRadius: 10,
              padding: '9px 13px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            ← Voltar
          </button>

          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '.3px',
            }}
          >
            DESTAQUES PREMIUM
          </div>

          <div
            style={{
              fontSize: 11,
              opacity: .8,
            }}
          >
            {premiumIndex + 1}/{premiumBusinesses.length}
          </div>
        </div>

        {/* CONTEÚDO VERTICAL */}
        <div
          style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.name}
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
                padding: 30,
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 900,
                  textAlign: 'center',
                }}
              >
                {business.name}
              </div>
            </div>
          )}

          {/* GRADIENTE INFERIOR */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '42%',
              background:
                'linear-gradient(to top, rgba(0,0,0,.88), transparent)',
              pointerEvents: 'none',
            }}
          />

          {/* INFORMAÇÕES */}
          <div
            style={{
              position: 'absolute',
              left: 18,
              right: 18,
              bottom: 24,
              zIndex: 5,
            }}
          >
            <h2
              style={{
                margin: '0 0 7px',
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              {business.name}
            </h2>

            {business.description && (
              <p
                style={{
                  margin: '0 0 14px',
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: 'rgba(255,255,255,.88)',
                  maxWidth: 500,
                }}
              >
                {business.description}
              </p>
            )}

            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={() => sendSMS(business)}
                style={{
                  border: 'none',
                  background: '#E6A900',
                  color: '#17342F',
                  borderRadius: 12,
                  padding: '11px 15px',
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                Enviar SMS
              </button>

              <Link
                href={`/businesses/${business.id}?country=${country}&province=${province}`}
                style={{
                  textDecoration: 'none',
                  background: 'rgba(255,255,255,.14)',
                  border: '1px solid rgba(255,255,255,.3)',
                  color: '#FFFFFF',
                  borderRadius: 12,
                  padding: '11px 15px',
                  fontWeight: 800,
                  backdropFilter: 'blur(8px)',
                }}
              >
                Ver perfil
              </Link>
            </div>
          </div>

          {/* NAVEGAÇÃO LATERAL */}
          <div
            style={{
              position: 'absolute',
              right: 12,
              bottom: 110,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              zIndex: 8,
            }}
          >
            {premiumIndex > 0 && (
              <button
                type="button"
                onClick={previousPremium}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  border:
                    '1px solid rgba(255,255,255,.35)',
                  background: 'rgba(0,0,0,.4)',
                  color: '#FFFFFF',
                  fontSize: 20,
                  cursor: 'pointer',
                }}
              >
                ↑
              </button>
            )}

            {premiumIndex <
              premiumBusinesses.length - 1 && (
              <button
                type="button"
                onClick={nextPremium}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  border:
                    '1px solid rgba(255,255,255,.35)',
                  background: 'rgba(0,0,0,.4)',
                  color: '#FFFFFF',
                  fontSize: 20,
                  cursor: 'pointer',
                }}
              >
                ↓
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="container"
      style={{
        paddingBottom: 60,
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
              marginTop: 24,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 19,
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
                  Negócios que escolheram aparecer aqui.
                </p>
              </div>

              {premiumBusinesses.length > 0 && (
                <button
                  type="button"
                  onClick={() => openPremium(0)}
                  style={{
                    border: 'none',
                    background: '#075B4E',
                    color: '#FFFFFF',
                    borderRadius: 10,
                    padding: '9px 12px',
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Ver destaques
                </button>
              )}
            </div>

            {premiumLoading && (
              <div
                style={{
                  padding: 15,
                  borderRadius: 14,
                  background: '#F7FAF9',
                  color: '#7A8986',
                  fontSize: 12,
                }}
              >
                A carregar destaques…
              </div>
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
                    gap: 9,
                    overflowX: 'auto',
                    paddingBottom: 4,
                  }}
                >
                  {premiumBusinesses.map(
                    (business, index) => (
                      <button
                        key={business.id}
                        type="button"
                        onClick={() =>
                          openPremium(index)
                        }
                        style={{
                          flex: '0 0 145px',
                          border: '1px solid #DCE6E3',
                          borderRadius: 14,
                          background: '#FFFFFF',
                          padding: 8,
                          cursor: 'pointer',
                          textAlign: 'left',
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
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              height: 105,
                              borderRadius: 10,
                              background: '#075B4E',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textAlign: 'center',
                              padding: 8,
                              boxSizing: 'border-box',
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {business.name}
                          </div>
                        )}

                        <div
                          style={{
                            marginTop: 7,
                            fontSize: 12,
                            fontWeight: 850,
                            color: '#17342F',
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
              marginBottom: 11,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                margin: 0,
              }}
            >
              Negócios
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
