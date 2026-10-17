import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const C = {
  green: '#0F6E5C',
  dark: '#083F35',
  deep: '#062F29',
  greenSoft: '#E8F3F0',
  gold: '#DDA10A',
  goldSoft: '#FBF1D7',
  purple: '#7252B8',
  purpleSoft: '#F1ECFA',
  ink: '#17211F',
  muted: '#596560',
  faint: '#89948F',
  canvas: '#F8F6F3',
  white: '#FFFFFF',
  line: '#E5E9E7',
  red: '#B93845',
};

const HUES = [C.green, '#8A4B2B', C.purple, '#2E6B7A', '#A0522D', '#4B5D67'];

function getHue(index) {
  return HUES[index % HUES.length];
}

function getInitials(name) {
  const words = String(name || '')
    .normalize('NFC')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toLocaleUpperCase('pt-AO'))
    .join('') || 'T';
}

function safeQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default function Subcategory() {
  const router = useRouter();

  const id = safeQueryValue(router.query.id);
  const country = safeQueryValue(router.query.country);
  const province = safeQueryValue(router.query.province);

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

    if (!id) {
      setError('Subcategoria inválida. Volte à categoria e escolha uma opção.');
      setLoading(false);
      setPremiumLoading(false);
      return;
    }

    let cancelled = false;

    async function loadSubcategory() {
      setLoading(true);
      setError('');

      try {
        const { data, error: subcategoryError } = await supabase
          .from('subcategories')
          .select('id, name, description, category_id')
          .eq('id', id)
          .single();

        if (subcategoryError || !data) {
          throw new Error('Não foi possível encontrar esta subcategoria no Supabase.');
        }

        let nextCountryName = '';
        let nextProvinceName = '';

        if (country && province) {
          const { data: provinceData, error: provinceError } = await supabase
            .from('provinces')
            .select('id, name, country_id')
            .eq('id', province)
            .eq('country_id', country)
            .single();

          if (provinceError || !provinceData) {
            throw new Error('A província não pertence ao país selecionado.');
          }

          const { data: countryData } = await supabase
            .from('countries')
            .select('id, name')
            .eq('id', country)
            .single();

          nextCountryName = countryData?.name || '';
          nextProvinceName = provinceData.name || '';
        }

        if (!cancelled) {
          setSubcategory(data);
          setCountryName(nextCountryName);
          setProvinceName(nextProvinceName);
        }
      } catch (loadError) {
        console.error('Erro em subcategory.js:', loadError);
        if (!cancelled) setError(loadError.message || 'Ocorreu um erro ao carregar a subcategoria.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSubcategory();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, id, country, province]);

  useEffect(() => {
    if (!router.isReady || !id) return;

    let cancelled = false;

    async function loadBusinesses() {
      setLoading(true);

      try {
        let request = supabase
          .from('businesses')
          .select('id, name, description, municipality, neighborhood, logo_url, whatsapp, phone, country_id, province_id, subcategory_id')
          .eq('subcategory_id', id)
          .eq('is_active', true)
          .eq('approval_status', 'approved')
          .order('created_at', { ascending: false });

        if (country) request = request.eq('country_id', country);
        if (province) request = request.eq('province_id', province);

        if (query.trim()) {
          request = request.ilike('name', `%${query.trim()}%`);
        }

        if (municipality.trim()) {
          request = request.ilike('municipality', `%${municipality.trim()}%`);
        }

        if (neighborhood.trim()) {
          request = request.ilike('neighborhood', `%${neighborhood.trim()}%`);
        }

        const { data, error: businessesError } = await request;

        if (businessesError) throw businessesError;
        if (!cancelled) setBusinesses(data || []);
      } catch (loadError) {
        console.error('Erro ao carregar negócios:', loadError);
        if (!cancelled) setBusinesses([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBusinesses();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, id, country, province, query, municipality, neighborhood]);

  useEffect(() => {
    if (!router.isReady || !id) return;

    let cancelled = false;

    async function loadPremiumBusinesses() {
      setPremiumLoading(true);

      try {
        const now = new Date().toISOString();

        const { data: subscriptions, error: subscriptionError } = await supabase
          .from('business_subscriptions')
          .select('business_id, starts_at, ends_at, status')
          .eq('status', 'active')
          .lte('starts_at', now)
          .gte('ends_at', now);

        if (subscriptionError) throw subscriptionError;

        const businessIds = [
          ...new Set((subscriptions || [])
            .map((subscription) => subscription.business_id)
            .filter(Boolean)),
        ];

        if (!businessIds.length) {
          if (!cancelled) setPremiumBusinesses([]);
          return;
        }

        let request = supabase
          .from('businesses')
          .select('id, name, description, municipality, neighborhood, logo_url, whatsapp, phone, country_id, province_id, subcategory_id')
          .in('id', businessIds)
          .eq('subcategory_id', id)
          .eq('is_active', true)
          .eq('approval_status', 'approved');

        if (country) request = request.eq('country_id', country);
        if (province) request = request.eq('province_id', province);

        const { data, error: premiumError } = await request;

        if (premiumError) throw premiumError;

        if (!cancelled) {
          setPremiumBusinesses(data || []);
          setPremiumIndex(0);
        }
      } catch (loadError) {
        console.error('Erro ao carregar Destaques Premium:', loadError);
        if (!cancelled) setPremiumBusinesses([]);
      } finally {
        if (!cancelled) setPremiumLoading(false);
      }
    }

    loadPremiumBusinesses();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, id, country, province]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    document.body.style.overflow = premiumOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [premiumOpen]);

  useEffect(() => {
    if (!premiumOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') setPremiumOpen(false);

      if (event.key === 'ArrowRight') {
        setPremiumIndex((current) => (
          current >= premiumBusinesses.length - 1 ? 0 : current + 1
        ));
      }

      if (event.key === 'ArrowLeft') {
        setPremiumIndex((current) => (
          current <= 0 ? premiumBusinesses.length - 1 : current - 1
        ));
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [premiumOpen, premiumBusinesses.length]);

  function openPremiumFeed(index) {
    setPremiumIndex(index);
    setPremiumOpen(true);
  }

  function nextPremium() {
    if (!premiumBusinesses.length) return;
    setPremiumIndex((current) => (
      current >= premiumBusinesses.length - 1 ? 0 : current + 1
    ));
  }

  function previousPremium() {
    if (!premiumBusinesses.length) return;
    setPremiumIndex((current) => (
      current <= 0 ? premiumBusinesses.length - 1 : current - 1
    ));
  }

  const currentPremium = premiumBusinesses[premiumIndex];
  const locationText = [countryName, provinceName].filter(Boolean).join(' · ');
  const categoryHref = {
    pathname: '/category',
    query: {
      ...(subcategory?.category_id ? { id: subcategory.category_id } : {}),
      ...(country ? { country } : {}),
      ...(province ? { province } : {}),
    },
  };

  return (
    <>
      <Head>
        <title>{subcategory?.name ? `${subcategory.name} | Talaza` : 'Talaza'}</title>
        <meta name="description" content="Encontre negócios e serviços na Vitrine Talaza." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="sub-page">
        <header className="topbar">
          <div className="topbar-inner">
            <Link
              href={{
                pathname: '/explore',
                query: {
                  ...(country ? { country } : {}),
                  ...(province ? { province } : {}),
                },
              }}
              className="brand"
            >
              <span className="brand-mark">T</span>
              <span>Talaza</span>
            </Link>

            <Link href={categoryHref} className="back-button">
              <span aria-hidden="true">←</span> Categoria
            </Link>
          </div>

          {locationText && (
            <div className="location-line">
              <span>●</span> {locationText}
            </div>
          )}
        </header>

        <main className="main-content">
          {loading && !subcategory && (
            <div className="status-card">A carregar subcategoria…</div>
          )}

          {error && (
            <div className="error-card">
              <strong>Não foi possível abrir esta subcategoria.</strong>
              <p>{error}</p>
              <Link href={categoryHref} className="primary-button">Voltar à categoria</Link>
            </div>
          )}

          {!error && subcategory && (
            <>
              <section className="intro">
                <span className="eyebrow">VITRINE TALAZA</span>
                <h1>{subcategory.name}</h1>
                {subcategory.description && <p>{subcategory.description}</p>}
              </section>

              <section className="search-section" aria-label="Pesquisar negócios">
                <div className="search-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.faint} strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m16 16 5 5" />
                  </svg>

                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Pesquisar por nome…"
                    aria-label="Pesquisar por nome"
                  />

                  <button
                    type="button"
                    className="filter-toggle"
                    onClick={() => setShowMoreFilters((value) => !value)}
                    aria-expanded={showMoreFilters}
                  >
                    {showMoreFilters ? 'Fechar filtros' : 'Filtros'}
                  </button>
                </div>

                {showMoreFilters && (
                  <div className="extra-filters">
                    <input
                      value={municipality}
                      onChange={(event) => setMunicipality(event.target.value)}
                      placeholder="Município"
                      aria-label="Filtrar por município"
                    />
                    <input
                      value={neighborhood}
                      onChange={(event) => setNeighborhood(event.target.value)}
                      placeholder="Bairro"
                      aria-label="Filtrar por bairro"
                    />
                  </div>
                )}
              </section>

              <section className="premium-section">
                <div className="section-heading">
                  <div>
                    <span className="section-kicker">EM DESTAQUE</span>
                    <h2><span className="crown">♛</span> Destaques Premium</h2>
                  </div>
                  {premiumBusinesses.length > 0 && (
                    <span className="swipe-hint">Toque para ver</span>
                  )}
                </div>

                {premiumLoading && <p className="subtle-text">A carregar destaques…</p>}

                {!premiumLoading && premiumBusinesses.length === 0 && (
                  <div className="notice-card">
                    Ainda não existem Destaques Premium ativos nesta subcategoria.
                  </div>
                )}

                {!premiumLoading && premiumBusinesses.length > 0 && (
                  <div className="premium-list">
                    {premiumBusinesses.map((business, index) => (
                      <button
                        type="button"
                        key={business.id}
                        className="premium-card"
                        onClick={() => openPremiumFeed(index)}
                      >
                        <div
                          className="premium-image"
                          style={{
                            backgroundColor: getHue(index),
                            backgroundImage: business.logo_url
                              ? `url("${business.logo_url}")`
                              : 'none',
                          }}
                        >
                          {!business.logo_url && (
                            <span className="premium-initials">{getInitials(business.name)}</span>
                          )}
                          <span className="premium-label">♛ Premium</span>
                          <span className="premium-name">{business.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="business-section">
                <div className="section-heading">
                  <div>
                    <span className="section-kicker">DESCUBRA</span>
                    <h2>Encontre aqui</h2>
                  </div>
                  {provinceName && <span className="province-label">{provinceName}</span>}
                </div>

                {loading && <div className="notice-card">A carregar negócios…</div>}

                {!loading && businesses.length === 0 && (
                  <div className="empty-card">
                    <div className="empty-symbol">⌕</div>
                    <h3>Nenhum negócio encontrado</h3>
                    <p>
                      {query || municipality || neighborhood
                        ? 'Experimente alterar a pesquisa ou retirar algum filtro.'
                        : 'Ainda não há negócios aprovados nesta subcategoria e região.'}
                    </p>
                    {(query || municipality || neighborhood) && (
                      <button
                        type="button"
                        className="clear-button"
                        onClick={() => {
                          setQuery('');
                          setMunicipality('');
                          setNeighborhood('');
                        }}
                      >
                        Limpar pesquisa
                      </button>
                    )}
                  </div>
                )}

                {!loading && businesses.length > 0 && (
                  <div className="business-grid">
                    {businesses.map((business, index) => (
                      <Link
                        key={business.id}
                        href={{
                          pathname: `/businesses/${business.id}`,
                          query: {
                            ...(country ? { country } : {}),
                            ...(province ? { province } : {}),
                          },
                        }}
                        className="business-card"
                      >
                        {business.logo_url ? (
                          <img
                            className="business-image"
                            src={business.logo_url}
                            alt={business.name}
                          />
                        ) : (
                          <div
                            className="business-image business-placeholder"
                            style={{ backgroundColor: getHue(index) }}
                          >
                            {getInitials(business.name)}
                          </div>
                        )}

                        <div className="business-details">
                          <h3>{business.name}</h3>

                          {(business.neighborhood || business.municipality) && (
                            <p className="business-location">
                              {[business.neighborhood, business.municipality]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          )}

                          {business.description && (
                            <p className="business-description">{business.description}</p>
                          )}

                          <span className="profile-link">Ver perfil <span>→</span></span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {premiumOpen && currentPremium && (
        <div className="feed-overlay" role="dialog" aria-modal="true" aria-label="Destaques Premium">
          <div className="feed-top">
            <button type="button" className="feed-back" onClick={() => setPremiumOpen(false)}>
              ← Voltar
            </button>
            <span className="feed-title">♛ DESTAQUE PREMIUM</span>
            <span className="feed-count">{premiumIndex + 1}/{premiumBusinesses.length}</span>
          </div>

          <div className="feed-media">
            {currentPremium.logo_url ? (
              <img src={currentPremium.logo_url} alt={currentPremium.name} />
            ) : (
              <div
                className="feed-placeholder"
                style={{ backgroundColor: getHue(premiumIndex) }}
              >
                {getInitials(currentPremium.name)}
              </div>
            )}

            <div className="feed-shade" />

            <div className="feed-details">
              <span className="feed-badge">♛ Destaque Premium</span>
              <h2>{currentPremium.name}</h2>

              {currentPremium.description && <p>{currentPremium.description}</p>}

              {(currentPremium.neighborhood || currentPremium.municipality) && (
                <p className="feed-location">
                  {[currentPremium.neighborhood, currentPremium.municipality]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}

              <div className="feed-actions">
                <a
                  className={`sms-button${!(currentPremium.phone || currentPremium.whatsapp) ? ' disabled' : ''}`}
                  href={
                    currentPremium.phone
                      ? `sms:${currentPremium.phone}`
                      : currentPremium.whatsapp
                        ? `https://wa.me/${String(currentPremium.whatsapp).replace(/\D/g, '')}`
                        : undefined
                  }
                  onClick={(event) => {
                    if (!(currentPremium.phone || currentPremium.whatsapp)) event.preventDefault();
                  }}
                >
                  {currentPremium.phone ? 'Enviar SMS' : 'Contactar'}
                </a>

                <Link
                  className="profile-button"
                  href={{
                    pathname: `/businesses/${currentPremium.id}`,
                    query: {
                      ...(country ? { country } : {}),
                      ...(province ? { province } : {}),
                    },
                  }}
                >
                  Ver perfil
                </Link>
              </div>
            </div>

            {premiumBusinesses.length > 1 && (
              <>
                <button type="button" className="feed-arrow feed-prev" onClick={previousPremium} aria-label="Destaque anterior">‹</button>
                <button type="button" className="feed-arrow feed-next" onClick={nextPremium} aria-label="Próximo destaque">›</button>
              </>
            )}
          </div>

          {premiumBusinesses.length > 1 && (
            <div className="feed-dots">
              {premiumBusinesses.map((business, index) => (
                <button
                  type="button"
                  key={business.id}
                  onClick={() => setPremiumIndex(index)}
                  className={index === premiumIndex ? 'active' : ''}
                  aria-label={`Ver destaque ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .sub-page {
          min-height: 100vh;
          background: ${C.canvas};
          color: ${C.ink};
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
          padding-bottom: 45px;
        }
        .sub-page * { box-sizing: border-box; }
        .topbar {
          padding: 17px 20px 14px;
          background: ${C.deep};
          color: ${C.white};
        }
        .topbar-inner {
          max-width: 1080px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }
        .brand {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          color: white;
          text-decoration: none;
          font-size: 19px;
          font-weight: 800;
        }
        .brand-mark {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: ${C.gold};
          color: ${C.deep};
          font-family: Georgia, serif;
          font-size: 19px;
          font-weight: 900;
        }
        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 12px;
          border: 1px solid rgba(255,255,255,.2);
          border-radius: 99px;
          color: white;
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
          background: rgba(255,255,255,.07);
        }
        .location-line {
          max-width: 1080px;
          margin: 12px auto 0;
          color: rgba(255,255,255,.76);
          font-size: 12px;
        }
        .location-line span { color: ${C.gold}; margin-right: 5px; }
        .main-content { max-width: 1080px; margin: 0 auto; padding: 0 20px; }
        .intro { padding: 27px 0 4px; }
        .eyebrow, .section-kicker {
          display: block;
          color: ${C.purple};
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .14em;
        }
        .intro h1 {
          margin: 8px 0 0;
          font-family: 'Fraunces', Georgia, serif;
          font-size: clamp(29px, 5vw, 40px);
          line-height: 1.08;
          letter-spacing: -.035em;
        }
        .intro p {
          max-width: 620px;
          margin: 9px 0 0;
          color: ${C.muted};
          font-size: 13px;
          line-height: 1.65;
        }
        .search-section { margin-top: 19px; }
        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 13px;
          border: 1px solid ${C.line};
          border-radius: 14px;
          background: white;
          box-shadow: 0 5px 18px rgba(23,33,31,.03);
        }
        .search-box input {
          min-width: 0;
          flex: 1;
          border: 0;
          outline: 0;
          background: transparent;
          color: ${C.ink};
          font: inherit;
          font-size: 13px;
        }
        .filter-toggle {
          flex-shrink: 0;
          border: 0;
          background: ${C.purpleSoft};
          color: ${C.purple};
          border-radius: 9px;
          padding: 8px 10px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }
        .extra-filters {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
          margin-top: 9px;
        }
        .extra-filters input {
          width: 100%;
          min-width: 0;
          padding: 11px 12px;
          border: 1px solid ${C.line};
          border-radius: 11px;
          background: white;
          color: ${C.ink};
          outline-color: ${C.purple};
          font: inherit;
          font-size: 12px;
        }
        .premium-section, .business-section { margin-top: 29px; }
        .section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 13px;
        }
        .section-heading h2 {
          margin: 5px 0 0;
          font-family: 'Fraunces', Georgia, serif;
          font-size: 21px;
          font-weight: 600;
          letter-spacing: -.025em;
        }
        .crown { color: ${C.purple}; }
        .swipe-hint, .province-label { color: ${C.muted}; font-size: 11px; }
        .premium-list {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding: 2px 2px 9px;
          scrollbar-width: thin;
        }
        .premium-card {
          flex: 0 0 132px;
          width: 132px;
          padding: 0;
          border: 0;
          border-radius: 16px;
          background: transparent;
          text-align: left;
          cursor: pointer;
        }
        .premium-image {
          position: relative;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          width: 132px;
          height: 154px;
          overflow: hidden;
          border-radius: 16px;
          background-position: center;
          background-size: cover;
          color: white;
          box-shadow: 0 6px 18px rgba(23,33,31,.12);
        }
        .premium-image::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 35%, rgba(0,0,0,.72));
        }
        .premium-initials { align-self: center; font-family: Georgia, serif; font-size: 34px; font-weight: 800; }
        .premium-label {
          position: absolute;
          z-index: 1;
          top: 8px;
          left: 8px;
          padding: 5px 7px;
          border-radius: 99px;
          background: ${C.purple};
          color: white;
          font-size: 9px;
          font-weight: 800;
        }
        .premium-name {
          position: relative;
          z-index: 1;
          width: 100%;
          padding: 12px 9px;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.3;
        }
        .notice-card, .status-card, .empty-card, .error-card {
          padding: 18px;
          border: 1px solid ${C.line};
          border-radius: 15px;
          background: white;
          color: ${C.muted};
          font-size: 12.5px;
          line-height: 1.6;
        }
        .subtle-text { color: ${C.muted}; font-size: 12px; }
        .business-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(255px, 1fr));
          gap: 11px;
        }
        .business-card {
          display: flex;
          gap: 12px;
          min-width: 0;
          padding: 11px;
          border: 1px solid ${C.line};
          border-radius: 15px;
          background: white;
          color: inherit;
          text-decoration: none;
          transition: border-color .18s ease, transform .18s ease;
        }
        .business-card:hover { border-color: ${C.purple}; transform: translateY(-2px); }
        .business-image {
          flex: 0 0 68px;
          width: 68px;
          height: 68px;
          border-radius: 11px;
          object-fit: cover;
        }
        .business-placeholder {
          display: grid;
          place-items: center;
          color: white;
          font-family: Georgia, serif;
          font-size: 22px;
          font-weight: 800;
        }
        .business-details { min-width: 0; flex: 1; }
        .business-details h3 {
          margin: 1px 0 0;
          font-size: 14px;
          line-height: 1.35;
          font-weight: 800;
          overflow-wrap: anywhere;
        }
        .business-location {
          margin: 4px 0 0;
          color: ${C.muted};
          font-size: 11px;
          line-height: 1.4;
        }
        .business-description {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin: 5px 0 0;
          color: ${C.muted};
          font-size: 11.5px;
          line-height: 1.45;
        }
        .profile-link {
          display: inline-block;
          margin-top: 8px;
          color: ${C.green};
          font-size: 11px;
          font-weight: 800;
        }
        .empty-card { text-align: center; padding: 30px 20px; }
        .empty-symbol {
          display: grid;
          place-items: center;
          width: 50px;
          height: 50px;
          margin: 0 auto 12px;
          border-radius: 16px;
          background: ${C.purpleSoft};
          color: ${C.purple};
          font-size: 28px;
        }
        .empty-card h3 { margin: 0; color: ${C.ink}; font-size: 15px; }
        .empty-card p { max-width: 400px; margin: 8px auto 14px; }
        .clear-button {
          border: 0;
          border-radius: 10px;
          padding: 10px 14px;
          background: ${C.purpleSoft};
          color: ${C.purple};
          font-weight: 800;
          cursor: pointer;
        }
        .error-card { background: #FFF5F4; border-color: #F3D0CC; color: ${C.red}; }
        .error-card p { margin: 7px 0 12px; }
        .primary-button {
          display: inline-flex;
          padding: 10px 13px;
          border-radius: 10px;
          background: ${C.green};
          color: white;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
        }
        .feed-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #080B0A;
          color: white;
        }
        .feed-top {
          position: absolute;
          z-index: 4;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 15px;
          background: linear-gradient(to bottom, rgba(0,0,0,.7), transparent);
        }
        .feed-back {
          padding: 9px 11px;
          border: 1px solid rgba(255,255,255,.25);
          border-radius: 10px;
          background: rgba(0,0,0,.2);
          color: white;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }
        .feed-title { font-size: 11px; font-weight: 900; letter-spacing: .07em; }
        .feed-count { font-size: 11px; color: rgba(255,255,255,.8); }
        .feed-media { position: relative; flex: 1; min-height: 0; display: grid; place-items: center; }
        .feed-media > img, .feed-placeholder { width: 100%; height: 100%; object-fit: contain; }
        .feed-placeholder {
          display: grid;
          place-items: center;
          font-family: Georgia, serif;
          font-size: clamp(60px, 15vw, 100px);
          font-weight: 800;
        }
        .feed-shade {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,.88), transparent 70%);
          pointer-events: none;
        }
        .feed-details {
          position: absolute;
          z-index: 2;
          right: 0;
          bottom: 0;
          left: 0;
          padding: 28px 20px 38px;
        }
        .feed-badge {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 99px;
          background: ${C.purple};
          color: white;
          font-size: 10px;
          font-weight: 900;
        }
        .feed-details h2 {
          margin: 12px 0;
          font-family: 'Fraunces', Georgia, serif;
          font-size: 27px;
          line-height: 1.15;
        }
        .feed-details p { max-width: 650px; font-size: 13px; line-height: 1.55; }
        .feed-location { color: rgba(255,255,255,.75); }
        .feed-actions { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 17px; }
        .sms-button, .profile-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 16px;
          border-radius: 12px;
          text-decoration: none;
          font-size: 12px;
          font-weight: 900;
        }
        .sms-button { background: ${C.gold}; color: ${C.deep}; }
        .sms-button.disabled { opacity: .45; pointer-events: none; }
        .profile-button { border: 1px solid rgba(255,255,255,.5); color: white; background: rgba(255,255,255,.1); }
        .feed-arrow {
          position: absolute;
          z-index: 3;
          top: 48%;
          width: 40px;
          height: 40px;
          border: 1px solid rgba(255,255,255,.35);
          border-radius: 50%;
          background: rgba(0,0,0,.3);
          color: white;
          font-size: 26px;
          cursor: pointer;
        }
        .feed-prev { left: 10px; }
        .feed-next { right: 10px; }
        .feed-dots {
          position: absolute;
          z-index: 4;
          bottom: 12px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 6px;
        }
        .feed-dots button {
          width: 6px;
          height: 6px;
          padding: 0;
          border: 0;
          border-radius: 99px;
          background: rgba(255,255,255,.45);
          cursor: pointer;
        }
        .feed-dots button.active { width: 19px; background: ${C.gold}; }
        @media (max-width: 540px) {
          .topbar { padding-left: 14px; padding-right: 14px; }
          .main-content { padding-left: 14px; padding-right: 14px; }
          .business-grid { grid-template-columns: 1fr; }
          .extra-filters { grid-template-columns: 1fr; }
          .section-heading h2 { font-size: 19px; }
          .feed-details { padding: 22px 16px 34px; }
          .feed-details h2 { font-size: 23px; }
          .feed-title { font-size: 9px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .business-card { transition: none; }
        }
      `}</style>
    </>
  );
}
