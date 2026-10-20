import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

const COLORS = {
  green: '#0F6E5C',
  darkGreen: '#083F35',
  gold: '#DDA10A',
  purple: '#7252B8',
  purpleSoft: '#F1ECFA',
  ink: '#17211F',
  muted: '#596560',
  faint: '#89948F',
  canvas: '#F8F6F3',
  white: '#FFFFFF',
  line: '#E5E9E7',
};

function getInitials(name) {
  const words = String(name || '')
    .normalize('NFC')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return (
    words
      .map((word) => word.charAt(0).toLocaleUpperCase('pt-AO'))
      .join('') || '?'
  );
}

function cleanText(value) {
  return String(value || '').trim();
}

function makeBusinessHref(id, country, province) {
  const params = new URLSearchParams();

  if (country) params.set('country', country);
  if (province) params.set('province', province);

  const query = params.toString();

  return `/businesses/${id}${query ? `?${query}` : ''}`;
}

export default function Subcategory() {
  const router = useRouter();
  const { id, country, province } = router.query;

  const [subcategory, setSubcategory] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [premiumBusinesses, setPremiumBusinesses] = useState([]);
  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');

  const [search, setSearch] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [loading, setLoading] = useState(true);
  const [premiumLoading, setPremiumLoading] = useState(true);
  const [error, setError] = useState('');

  const [premiumOpen, setPremiumOpen] = useState(false);
  const [premiumIndex, setPremiumIndex] = useState(0);

  useEffect(() => {
    if (!router.isReady || !id) return;

    let cancelled = false;

    async function loadPage() {
      setLoading(true);
      setPremiumLoading(true);
      setError('');

      try {
        const { data: subcategoryData, error: subcategoryError } =
          await supabase
            .from('subcategories')
            .select('id, name, description, category_id')
            .eq('id', id)
            .single();

        if (subcategoryError) throw subcategoryError;

        let foundCountryName = '';
        let foundProvinceName = '';

        if (country) {
          const { data } = await supabase
            .from('countries')
            .select('id, name')
            .eq('id', country)
            .maybeSingle();

          foundCountryName = data?.name || '';
        }

        if (province) {
          const { data } = await supabase
            .from('provinces')
            .select('id, name, country_id')
            .eq('id', province)
            .maybeSingle();

          if (data && (!country || data.country_id === country)) {
            foundProvinceName = data.name || '';
          }
        }

        if (cancelled) return;

        setSubcategory(subcategoryData);
        setCountryName(foundCountryName);
        setProvinceName(foundProvinceName);

        // Sem província selecionada, permite explorar esta subcategoria
        // noutras províncias. O filtro de localização continua disponível.
        let businessQuery = supabase
          .from('businesses')
          .select(
            'id, name, description, municipality, neighborhood, logo_url, country_id, province_id, subcategory_id, is_active, approval_status'
          )
          .eq('subcategory_id', id)
          .eq('is_active', true)
          .eq('approval_status', 'approved');

        if (country) businessQuery = businessQuery.eq('country_id', country);
        if (province) businessQuery = businessQuery.eq('province_id', province);

        const { data: businessData, error: businessError } =
          await businessQuery.order('created_at', { ascending: false });

        if (businessError) throw businessError;

        if (cancelled) return;

        setBusinesses(businessData || []);
        setLoading(false);

        // Procura subscrições ativas e dentro do período contratado.
        const now = new Date().toISOString();

        const { data: subscriptions, error: subscriptionError } =
          await supabase
            .from('business_subscriptions')
            .select('business_id, starts_at, ends_at, status')
            .eq('status', 'active')
            .lte('starts_at', now)
            .gte('ends_at', now);

        if (subscriptionError) {
          console.error(
            'Não foi possível carregar subscrições Premium:',
            subscriptionError
          );

          if (!cancelled) setPremiumBusinesses([]);
          return;
        }

        const eligibleIds = new Set(
          (subscriptions || [])
            .map((subscription) => subscription.business_id)
            .filter(Boolean)
        );

        const premium = (businessData || []).filter((business) =>
          eligibleIds.has(business.id)
        );

        if (!cancelled) {
          setPremiumBusinesses(premium);
        }
      } catch (err) {
        console.error('Erro ao carregar subcategoria:', err);

        if (!cancelled) {
          setError(
            'Não foi possível carregar esta subcategoria. Tenta novamente.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setPremiumLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, id, country, province]);

  useEffect(() => {
    if (!premiumOpen) return;

    function onKeyDown(event) {
      if (event.key === 'Escape') setPremiumOpen(false);

      if (event.key === 'ArrowRight') {
        setPremiumIndex((current) =>
          premiumBusinesses.length
            ? (current + 1) % premiumBusinesses.length
            : 0
        );
      }

      if (event.key === 'ArrowLeft') {
        setPremiumIndex((current) =>
          premiumBusinesses.length
            ? (current - 1 + premiumBusinesses.length) %
              premiumBusinesses.length
            : 0
        );
      }
    }

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [premiumOpen, premiumBusinesses.length]);

  const filteredBusinesses = useMemo(() => {
    const term = cleanText(search).toLocaleLowerCase('pt-AO');
    const selectedMunicipality = cleanText(municipality).toLocaleLowerCase(
      'pt-AO'
    );
    const selectedNeighborhood = cleanText(neighborhood).toLocaleLowerCase(
      'pt-AO'
    );

    return businesses.filter((business) => {
      const name = cleanText(business.name).toLocaleLowerCase('pt-AO');
      const businessMunicipality = cleanText(
        business.municipality
      ).toLocaleLowerCase('pt-AO');
      const businessNeighborhood = cleanText(
        business.neighborhood
      ).toLocaleLowerCase('pt-AO');

      const matchesSearch =
        !term || name.includes(term) || businessMunicipality.includes(term) || businessNeighborhood.includes(term);

      const matchesMunicipality =
        !selectedMunicipality ||
        businessMunicipality.includes(selectedMunicipality);

      const matchesNeighborhood =
        !selectedNeighborhood ||
        businessNeighborhood.includes(selectedNeighborhood);

      return (
        matchesSearch && matchesMunicipality && matchesNeighborhood
      );
    });
  }, [businesses, search, municipality, neighborhood]);

  const premiumIds = useMemo(
    () => new Set(premiumBusinesses.map((business) => business.id)),
    [premiumBusinesses]
  );

  const currentPremium = premiumBusinesses[premiumIndex] || null;

  function openPremium(index) {
    setPremiumIndex(index);
    setPremiumOpen(true);
  }

  function movePremium(direction) {
    if (!premiumBusinesses.length) return;

    setPremiumIndex(
      (current) =>
        (current + direction + premiumBusinesses.length) %
        premiumBusinesses.length
    );
  }

  function getBackHref() {
    const params = new URLSearchParams();

    if (country) params.set('country', country);
    if (province) params.set('province', province);

    return `/explore${params.toString() ? `?${params.toString()}` : ''}`;
  }

  return (
    <>
      <Head>
        <title>
          {subcategory?.name
            ? `${subcategory.name} | Talaza`
            : 'Subcategoria | Talaza'}
        </title>
        <meta
          name="description"
          content="Encontra negócios e serviços na Vitrine Talaza."
        />
      </Head>

      <main className="page">
        <header className="topbar">
          <Link href={getBackHref()} className="brand">
            <span className="brandMark">T</span>
            <span>talaza</span>
          </Link>

          <Link href={getBackHref()} className="backLink">
            ← Voltar à Vitrine
          </Link>
        </header>

        <section className="hero">
          <span className="eyebrow">VITRINE TALAZA</span>

          <h1>
            {loading
              ? 'A carregar…'
              : cleanText(subcategory?.name) || 'Subcategoria'}
          </h1>

          {subcategory?.description && (
            <p className="description">{subcategory.description}</p>
          )}

          {(countryName || provinceName) && (
            <div className="location">
              {countryName && <span>{countryName}</span>}
              {provinceName && <span>• {provinceName}</span>}
            </div>
          )}
        </section>

        <section className="content">
          {!country || !province ? (
            <div className="notice">
              <strong>Explorar negócios de outras províncias</strong>
              <p>
                {country
                  ? 'Estás a ver negócios desta subcategoria em todas as províncias do país.'
                  : 'Estás a ver negócios desta subcategoria em todas as localizações disponíveis.'}
                {' '}Podes selecionar uma localização para filtrar os resultados.
              </p>
              <Link href="/country" className="primaryButton">
                Filtrar por localização
              </Link>
            </div>
          ) : null}
          {true ? (
            <>
              <section className="searchPanel">
                <label className="searchLabel" htmlFor="business-search">
                  O que procuras?
                </label>

                <div className="searchRow">
                  <span className="searchIcon" aria-hidden="true">
                    ⌕
                  </span>

                  <input
                    id="business-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Pesquisar negócios nesta subcategoria…"
                  />

                  <button
                    type="button"
                    className="filterToggle"
                    onClick={() => setShowFilters((value) => !value)}
                    aria-expanded={showFilters}
                  >
                    <span aria-hidden="true">☷</span>
                    Filtros
                  </button>
                </div>

                {showFilters && (
                  <div className="filters">
                    <label>
                      Município
                      <input
                        value={municipality}
                        onChange={(event) =>
                          setMunicipality(event.target.value)
                        }
                        placeholder="Ex.: Maianga"
                      />
                    </label>

                    <label>
                      Bairro
                      <input
                        value={neighborhood}
                        onChange={(event) =>
                          setNeighborhood(event.target.value)
                        }
                        placeholder="Ex.: Alvalade"
                      />
                    </label>

                    <button
                      type="button"
                      className="clearFilters"
                      onClick={() => {
                        setMunicipality('');
                        setNeighborhood('');
                        setSearch('');
                      }}
                    >
                      Limpar filtros
                    </button>
                  </div>
                )}
              </section>

              <section className="premiumSection">
                <div className="sectionHeading">
                  <div>
                    <span className="premiumEyebrow">DESTAQUES</span>
                    <h2>Premium</h2>
                    <p>Negócios com subscrição Premium ativa.</p>
                  </div>

                  {premiumBusinesses.length > 0 && (
                    <span className="premiumCount">
                      {premiumBusinesses.length}
                    </span>
                  )}
                </div>

                {premiumLoading ? (
                  <div className="message">A carregar destaques…</div>
                ) : premiumBusinesses.length === 0 ? (
                  <div className="emptyPremium">
                    <span className="emptyPremiumMark">✦</span>
                    <div>
                      <strong>Novos destaques em breve</strong>
                      <p>
                        Ainda não há negócios Premium ativos nesta
                        subcategoria e localização.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="premiumGrid">
                    {premiumBusinesses.map((business, index) => (
                      <button
                        type="button"
                        className="premiumCard"
                        key={business.id}
                        onClick={() => openPremium(index)}
                      >
                        <div className="premiumImage">
                          {business.logo_url ? (
                            <img
                              src={business.logo_url}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <span>{getInitials(business.name)}</span>
                          )}

                          <span className="premiumBadge">✦ Premium</span>
                        </div>

                        <div className="premiumCardText">
                          <h3>{business.name}</h3>
                          <p>
                            {cleanText(business.municipality) ||
                              cleanText(business.neighborhood) ||
                              'Na tua província'}
                          </p>
                          <span>Ver destaque →</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="businessSection">
                <div className="sectionHeading">
                  <div>
                    <h2>Todos os negócios</h2>
                    <p>
                      Negócios aprovados e ativos nesta subcategoria.
                    </p>
                  </div>

                  {!loading && (
                    <span className="resultCount">
                      {filteredBusinesses.length}{' '}
                      {filteredBusinesses.length === 1
                        ? 'resultado'
                        : 'resultados'}
                    </span>
                  )}
                </div>

                {loading && (
                  <div className="message">A carregar negócios…</div>
                )}

                {!loading && error && (
                  <div className="message error">
                    <p>{error}</p>
                    <button
                      type="button"
                      onClick={() => router.replace(router.asPath)}
                    >
                      Tentar novamente
                    </button>
                  </div>
                )}

                {!loading &&
                  !error &&
                  filteredBusinesses.length === 0 && (
                    <div className="emptyState">
                      <span className="emptyIcon">⌕</span>
                      <h3>Nenhum negócio encontrado</h3>
                      <p>
                        Experimenta outra pesquisa ou limpa os filtros.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearch('');
                          setMunicipality('');
                          setNeighborhood('');
                        }}
                      >
                        Limpar pesquisa
                      </button>
                    </div>
                  )}

                {!loading && !error && filteredBusinesses.length > 0 && (
                  <div className="businessGrid">
                    {filteredBusinesses.map((business) => (
                      <Link
                        href={makeBusinessHref(
                          business.id,
                          country,
                          province
                        )}
                        key={business.id}
                        className="businessCard"
                      >
                        <div className="businessAvatar">
                          {business.logo_url ? (
                            <img
                              src={business.logo_url}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <span>{getInitials(business.name)}</span>
                          )}
                        </div>

                        <div className="businessInfo">
                          <div className="businessTitleRow">
                            <h3>{business.name}</h3>

                            {premiumIds.has(business.id) && (
                              <span className="smallPremium">✦</span>
                            )}
                          </div>

                          <p className="businessDescription">
                            {cleanText(business.description) ||
                              'Conhece os serviços deste negócio.'}
                          </p>

                          <div className="businessLocation">
                            {business.municipality && (
                              <span>{business.municipality}</span>
                            )}

                            {business.neighborhood && (
                              <span>• {business.neighborhood}</span>
                            )}
                          </div>

                          <span className="profileLink">
                            Ver perfil →
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </section>

        <footer className="footer">
          <span>Talaza</span>
          <span>Descobre. Compara. Encontra.</span>
        </footer>

        {premiumOpen && currentPremium && (
          <div
            className="premiumOverlay"
            role="dialog"
            aria-modal="true"
            aria-label="Destaques Premium"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setPremiumOpen(false);
              }
            }}
          >
            <button
              type="button"
              className="closeFeed"
              onClick={() => setPremiumOpen(false)}
              aria-label="Fechar destaques"
            >
              ×
            </button>

            {premiumBusinesses.length > 1 && (
              <button
                type="button"
                className="feedArrow feedArrowLeft"
                onClick={() => movePremium(-1)}
                aria-label="Destaque anterior"
              >
                ‹
              </button>
            )}

            <article className="feedCard">
              <div className="feedVisual">
                {currentPremium.logo_url ? (
                  <img src={currentPremium.logo_url} alt="" />
                ) : (
                  <span>{getInitials(currentPremium.name)}</span>
                )}

                <span className="feedPremiumBadge">✦ Premium</span>
              </div>

              <div className="feedDetails">
                <span className="feedCounter">
                  {premiumIndex + 1} / {premiumBusinesses.length}
                </span>

                <h2>{currentPremium.name}</h2>

                <p>
                  {cleanText(currentPremium.description) ||
                    'Conhece este negócio na Vitrine Talaza.'}
                </p>

                <div className="feedLocation">
                  {[currentPremium.municipality, currentPremium.neighborhood]
                    .filter(Boolean)
                    .join(' • ') || provinceName || 'Talaza'}
                </div>

                <Link
                  href={makeBusinessHref(
                    currentPremium.id,
                    country,
                    province
                  )}
                  className="viewProfileButton"
                >
                  Ver perfil
                </Link>
              </div>
            </article>

            {premiumBusinesses.length > 1 && (
              <button
                type="button"
                className="feedArrow feedArrowRight"
                onClick={() => movePremium(1)}
                aria-label="Próximo destaque"
              >
                ›
              </button>
            )}
          </div>
        )}
      </main>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: ${COLORS.canvas};
          color: ${COLORS.ink};
          font-family: Arial, Helvetica, sans-serif;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 17px max(5%, calc((100% - 1160px) / 2));
          background: ${COLORS.white};
          border-bottom: 1px solid ${COLORS.line};
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 9px;
          color: ${COLORS.darkGreen};
          font-size: 23px;
          font-weight: 800;
          text-decoration: none;
        }

        .brandMark {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border-radius: 11px;
          background: ${COLORS.green};
          color: white;
        }

        .backLink {
          color: ${COLORS.green};
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
        }

        .hero {
          padding: 42px max(5%, calc((100% - 1160px) / 2));
          background: ${COLORS.darkGreen};
          color: white;
        }

        .eyebrow,
        .premiumEyebrow {
          color: #EBCB78;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .hero h1 {
          margin: 12px 0 9px;
          font-size: clamp(27px, 4vw, 40px);
          line-height: 1.15;
          letter-spacing: -1px;
        }

        .description {
          max-width: 680px;
          margin: 0;
          color: #E1EAE6;
          font-size: 14px;
          line-height: 1.7;
        }

        .location {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 15px;
          color: #EBCB78;
          font-size: 12px;
          font-weight: 700;
        }

        .content {
          max-width: 1160px;
          margin: 0 auto;
          padding: 30px 24px 54px;
        }

        .searchPanel {
          margin-bottom: 36px;
          padding: 20px;
          border: 1px solid ${COLORS.line};
          border-radius: 17px;
          background: white;
        }

        .searchLabel {
          display: block;
          margin-bottom: 10px;
          font-size: 13px;
          font-weight: 800;
        }

        .searchRow {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .searchIcon {
          color: ${COLORS.green};
          font-size: 27px;
        }

        .searchRow input {
          flex: 1;
          min-width: 0;
          padding: 13px 5px;
          border: 0;
          outline: none;
          color: ${COLORS.ink};
          font-size: 14px;
        }

        .filterToggle {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 11px 14px;
          border: 1px solid #E2D9F5;
          border-radius: 10px;
          background: ${COLORS.purpleSoft};
          color: ${COLORS.purple};
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .filters {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          align-items: end;
          gap: 12px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid ${COLORS.line};
        }

        .filters label {
          display: grid;
          gap: 7px;
          color: ${COLORS.muted};
          font-size: 12px;
          font-weight: 700;
        }

        .filters input {
          width: 100%;
          box-sizing: border-box;
          padding: 11px;
          border: 1px solid ${COLORS.line};
          border-radius: 9px;
          outline-color: ${COLORS.purple};
          color: ${COLORS.ink};
        }

        .clearFilters {
          padding: 11px 12px;
          border: 0;
          border-radius: 9px;
          background: #F1F2F0;
          color: ${COLORS.muted};
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .sectionHeading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .sectionHeading h2 {
          margin: 5px 0;
          font-size: 22px;
          letter-spacing: -0.5px;
        }

        .sectionHeading p {
          margin: 0;
          color: ${COLORS.muted};
          font-size: 12px;
          line-height: 1.6;
        }

        .premiumEyebrow {
          color: ${COLORS.gold};
        }

        .premiumCount,
        .resultCount {
          flex-shrink: 0;
          padding: 8px 11px;
          border-radius: 20px;
          background: ${COLORS.purpleSoft};
          color: ${COLORS.purple};
          font-size: 12px;
          font-weight: 800;
        }

        .premiumSection {
          margin-bottom: 40px;
        }

        .premiumGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 15px;
        }

        .premiumCard {
          overflow: hidden;
          padding: 0;
          border: 1px solid #E8DDBB;
          border-radius: 16px;
          background: white;
          text-align: left;
          cursor: pointer;
          transition: transform 0.18s, border-color 0.18s;
        }

        .premiumCard:hover {
          transform: translateY(-2px);
          border-color: ${COLORS.gold};
        }

        .premiumImage {
          position: relative;
          display: grid;
          place-items: center;
          height: 150px;
          overflow: hidden;
          background: #F6F0E0;
          color: #8B6505;
          font-size: 38px;
          font-weight: 800;
        }

        .premiumImage img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .premiumBadge,
        .feedPremiumBadge {
          position: absolute;
          top: 11px;
          left: 11px;
          padding: 7px 9px;
          border-radius: 8px;
          background: ${COLORS.gold};
          color: #302406;
          font-size: 10px;
          font-weight: 900;
        }

        .premiumCardText {
          padding: 15px;
        }

        .premiumCardText h3 {
          margin: 0 0 7px;
          font-size: 15px;
          line-height: 1.4;
        }

        .premiumCardText p {
          margin: 0 0 12px;
          color: ${COLORS.muted};
          font-size: 12px;
        }

        .premiumCardText > span {
          color: ${COLORS.green};
          font-size: 12px;
          font-weight: 800;
        }

        .emptyPremium {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 19px;
          border: 1px solid #E8DDBB;
          border-radius: 14px;
          background: #FFFCF4;
        }

        .emptyPremiumMark {
          display: grid;
          place-items: center;
          width: 43px;
          height: 43px;
          flex-shrink: 0;
          border-radius: 13px;
          background: #FBF1D7;
          color: #8B6505;
          font-size: 22px;
        }

        .emptyPremium strong {
          font-size: 13px;
        }

        .emptyPremium p {
          margin: 5px 0 0;
          color: ${COLORS.muted};
          font-size: 12px;
          line-height: 1.5;
        }

        .businessGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 13px;
        }

        .businessCard {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          min-width: 0;
          padding: 17px;
          border: 1px solid ${COLORS.line};
          border-radius: 15px;
          background: white;
          color: inherit;
          text-decoration: none;
          transition: border-color 0.18s, transform 0.18s;
        }

        .businessCard:hover {
          border-color: ${COLORS.green};
          transform: translateY(-2px);
        }

        .businessAvatar {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 56px;
          height: 56px;
          overflow: hidden;
          border-radius: 15px;
          background: #E8F3F0;
          color: ${COLORS.green};
          font-size: 19px;
          font-weight: 800;
        }

        .businessAvatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .businessInfo {
          min-width: 0;
          flex: 1;
        }

        .businessTitleRow {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .businessTitleRow h3 {
          overflow-wrap: anywhere;
          margin: 1px 0 7px;
          font-size: 14px;
          line-height: 1.4;
        }

        .smallPremium {
          color: ${COLORS.gold};
          font-size: 15px;
        }

        .businessDescription {
          display: -webkit-box;
          overflow: hidden;
          margin: 0 0 9px;
          color: ${COLORS.muted};
          font-size: 12px;
          line-height: 1.5;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .businessLocation {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          color: ${COLORS.faint};
          font-size: 11px;
        }

        .profileLink {
          display: inline-block;
          margin-top: 11px;
          color: ${COLORS.green};
          font-size: 12px;
          font-weight: 800;
        }

        .message,
        .notice {
          padding: 22px;
          border: 1px solid ${COLORS.line};
          border-radius: 14px;
          background: white;
          color: ${COLORS.muted};
          font-size: 13px;
          line-height: 1.7;
        }

        .error {
          border-color: #F0C8CD;
          color: #9C2F3C;
        }

        .error button,
        .primaryButton,
        .emptyState button {
          display: inline-block;
          padding: 10px 14px;
          border: 0;
          border-radius: 9px;
          background: ${COLORS.green};
          color: white;
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
        }

        .notice strong {
          color: ${COLORS.ink};
          font-size: 15px;
        }

        .notice p {
          margin: 7px 0 15px;
        }

        .emptyState {
          padding: 38px 20px;
          border: 1px dashed #D7DEDA;
          border-radius: 15px;
          background: white;
          text-align: center;
        }

        .emptyIcon {
          display: inline-grid;
          place-items: center;
          width: 46px;
          height: 46px;
          border-radius: 15px;
          background: ${COLORS.purpleSoft};
          color: ${COLORS.purple};
          font-size: 25px;
        }

        .emptyState h3 {
          margin: 14px 0 7px;
          font-size: 16px;
        }

        .emptyState p {
          margin: 0 0 16px;
          color: ${COLORS.muted};
          font-size: 12px;
        }

        .footer {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 20px max(5%, calc((100% - 1160px) / 2));
          border-top: 1px solid ${COLORS.line};
          color: ${COLORS.muted};
          font-size: 11px;
        }

        .premiumOverlay {
          position: fixed;
          z-index: 1000;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          padding: 24px;
          background: rgba(4, 24, 20, 0.94);
        }

        .feedCard {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 0.85fr);
          width: min(900px, 100%);
          max-height: 86vh;
          overflow: auto;
          border-radius: 20px;
          background: white;
        }

        .feedVisual {
          position: relative;
          display: grid;
          place-items: center;
          min-height: 380px;
          overflow: hidden;
          background: #E8F3F0;
          color: ${COLORS.green};
          font-size: 55px;
          font-weight: 800;
        }

        .feedVisual img {
          width: 100%;
          height: 100%;
          min-height: 380px;
          object-fit: cover;
        }

        .feedDetails {
          align-self: center;
          padding: 30px;
        }

        .feedCounter {
          color: ${COLORS.purple};
          font-size: 11px;
          font-weight: 800;
        }

        .feedDetails h2 {
          margin: 13px 0;
          font-size: 26px;
          line-height: 1.2;
          overflow-wrap: anywhere;
        }

        .feedDetails p {
          color: ${COLORS.muted};
          font-size: 13px;
          line-height: 1.7;
          white-space: pre-wrap;
        }

        .feedLocation {
          margin: 14px 0 20px;
          color: ${COLORS.faint};
          font-size: 12px;
        }

        .viewProfileButton {
          display: inline-block;
          padding: 12px 17px;
          border-radius: 10px;
          background: ${COLORS.green};
          color: white;
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
        }

        .closeFeed {
          position: absolute;
          top: 17px;
          right: 20px;
          width: 42px;
          height: 42px;
          border: 1px solid rgba(255, 255, 255, 0.35);
          border-radius: 50%;
          background: transparent;
          color: white;
          font-size: 29px;
          cursor: pointer;
        }

        .feedArrow {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 42px;
          height: 42px;
          border: 1px solid rgba(255, 255, 255, 0.35);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 29px;
          cursor: pointer;
        }

        @media (max-width: 760px) {
          .topbar {
            padding: 15px 18px;
          }

          .hero {
            padding: 32px 20px;
          }

          .content {
            padding: 24px 15px 40px;
          }

          .premiumGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .businessGrid {
            grid-template-columns: 1fr;
          }

          .filters {
            grid-template-columns: 1fr;
          }

          .clearFilters {
            justify-self: start;
          }

          .feedCard {
            grid-template-columns: 1fr;
            max-width: 460px;
            max-height: 82vh;
          }

          .feedVisual,
          .feedVisual img {
            min-height: 230px;
            max-height: 35vh;
          }

          .feedDetails {
            padding: 22px;
          }

          .feedDetails h2 {
            font-size: 22px;
          }

          .feedArrow {
            position: absolute;
            top: 45%;
          }

          .feedArrowLeft {
            left: 8px;
          }

          .feedArrowRight {
            right: 8px;
          }
        }

        @media (max-width: 430px) {
          .searchPanel {
            padding: 14px;
          }

          .searchRow {
            flex-wrap: wrap;
          }

          .searchRow input {
            flex-basis: calc(100% - 45px);
          }

          .filterToggle {
            margin-left: auto;
          }

          .premiumGrid {
            grid-template-columns: 1fr;
          }

          .premiumImage {
            height: 175px;
          }

          .sectionHeading h2 {
            font-size: 19px;
          }

          .businessCard {
            padding: 13px;
          }

          .businessAvatar {
            width: 48px;
            height: 48px;
          }

          .premiumOverlay {
            padding: 12px;
          }

          .feedArrow {
            width: 35px;
            height: 35px;
          }

          .footer {
            padding: 18px;
          }
        }
      `}</style>
    </>
  );
}
