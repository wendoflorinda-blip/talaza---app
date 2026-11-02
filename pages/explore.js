import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import TalazaMenu from '../components/TalazaMenu';

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
};

const AREAS = [
  {
    name: 'Encontrar',
    description: 'Encontre negócios, produtos, serviços e soluções.',
    icon: '⌕',
    color: C.green,
    action: 'categories',
  },
  {
    name: 'Contratar',
    description: 'Publique uma vaga e encontre profissionais.',
    icon: '▣',
    color: C.green,
    route: '/contratar',
  },
  {
    name: 'Comunidade',
    description: 'Partilhe perguntas, recomendações e ideias.',
    icon: '◎',
    color: C.purple,
    route: '/comunidade',
  },
  {
    name: 'Oportunidades',
    description: 'Descubra vagas e novas oportunidades.',
    icon: '↗',
    color: C.purple,
    route: '/oportunidades',
  },
  {
    name: 'Eventos',
    description: 'Descubra eventos, cursos, feiras e lançamentos.',
    icon: '▦',
    color: C.gold,
    route: '/eventos',
  },
  {
    name: 'Ebooks',
    description: 'Explore ebooks e conhecimentos para desenvolver novas competências.',
    icon: '▤',
    color: C.gold,
    route: '/ebooks',
  },
];

function safeValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function categoryIcon(name = '') {
  const value = String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (/aliment|restaur|comida|bebida|gastronom|confeitaria|pastelaria/.test(value)) return 'food';
  if (/beleza|estetica|cabeleire|barbear|tranca/.test(value)) return 'beauty';
  if (/saude|medic|farmac/.test(value)) return 'health';
  if (/educa|escola|formacao/.test(value)) return 'education';
  if (/imove|habitacao|casa|construcao/.test(value)) return 'home';
  if (/transport|logistica|automov|carro/.test(value)) return 'transport';
  if (/tecnologia|informatica/.test(value)) return 'technology';
  if (/servic|profission|manutenc/.test(value)) return 'services';

  return 'other';
}

function CategoryIcon({ type }) {
  const paths = {
    food: (
      <>
        <path d="M7 3v8M4 3v5a3 3 0 006 0V3M7 11v10" />
        <path d="M17 21V3c-2.5 1.5-3.5 4.5-3.5 8H17" />
      </>
    ),
    beauty: (
      <>
        <path d="M12 3v7M8.5 3v4a3.5 3.5 0 007 0V3" />
        <path d="M12 10v11" />
      </>
    ),
    health: (
      <>
        <path d="M12 21s-7-4.5-7-11a4 4 0 017-2.4A4 4 0 0119 10c0 6.5-7 11-7 11Z" />
        <path d="M9 12h6M12 9v6" />
      </>
    ),
    education: (
      <>
        <path d="m3 9 9-5 9 5-9 5-9-5Z" />
        <path d="M7 11.5V16c3 2 7 2 10 0v-4.5" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    transport: (
      <>
        <path d="M3 6h12v11H3zM15 10h4l3 3v4h-7" />
        <circle cx="7" cy="18" r="1.5" />
        <circle cx="18" cy="18" r="1.5" />
      </>
    ),
    technology: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </>
    ),
    services: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1" />
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

  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[type] || paths.other}
    </svg>
  );
}

export default function Explore() {
  const router = useRouter();

  const country = safeValue(router.query.country);
  const province = safeValue(router.query.province);

  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [categories, setCategories] = useState([]);
  const [businesses, setBusinesses] = useState([]);\n  const [premiumPromotions, setPremiumPromotions] = useState([]);\n  const [currentUserId, setCurrentUserId] = useState(null);\n  const [savedPromotionIds, setSavedPromotionIds] = useState([]);\n  const [savingPromotionId, setSavingPromotionId] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [businessError, setBusinessError] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [mainHistoryCount, setMainHistoryCount] = useState(0);

  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem('talaza_history_main') || '[]'); setMainHistoryCount(Array.isArray(saved) ? saved.length : 0); } catch { setMainHistoryCount(0); }
  }, []);

  function trackMainBusiness(business) {
    if (!business?.id) return;
    try {
      const saved = JSON.parse(localStorage.getItem('talaza_history_main') || '[]');
      const next = [{ id: business.id, name: business.name, logo_url: business.logo_url || null, cover_url: business.cover_url || null, href: '/businesses/' + business.id + (Object.keys(exploreQuery).length ? '?' + new URLSearchParams(exploreQuery).toString() : ''), at: new Date().toISOString() }, ...(Array.isArray(saved) ? saved.filter(item => item.id !== business.id) : [])].slice(0, 100);
      localStorage.setItem('talaza_history_main', JSON.stringify(next));
      setMainHistoryCount(next.length);
    } catch {}
  }

  useEffect(() => {
    if (!router.isReady) return;

    let cancelled = false;

    async function loadCategories() {
      setLoadingCategories(true);
      setCategoryError('');

      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name')
          .order('name', { ascending: true });

        if (error) throw error;

        if (!cancelled) setCategories(data || []);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        if (!cancelled) {
          setCategories([]);
          setCategoryError('Não foi possível carregar as categorias do Supabase.');
        }
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, [router.isReady]);

  useEffect(() => {
    if (!router.isReady) return;

    let cancelled = false;

    async function loadLocation() {
      setCountryName('');
      setProvinceName('');

      if (!country) return;

      try {
        const { data: countryData, error: countryError } = await supabase
          .from('countries')
          .select('id, name')
          .eq('id', country)
          .single();

        if (countryError) throw countryError;

        if (!cancelled) setCountryName(countryData?.name || '');

        if (province) {
          const { data: provinceData, error: provinceError } = await supabase
            .from('provinces')
            .select('id, name, country_id')
            .eq('id', province)
            .eq('country_id', country)
            .single();

          if (provinceError) throw provinceError;

          if (!cancelled) setProvinceName(provinceData?.name || '');
        }
      } catch (error) {
        console.error('Erro ao carregar localização:', error);
        if (!cancelled) {
          setCountryName('');
          setProvinceName('');
        }
      }
    }

    loadLocation();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, country, province]);

  useEffect(() => {
    if (!router.isReady) return;

    // Sem IDs de localização, a Vitrine continua acessível.
    // A listagem de negócios só é consultada quando há país e província.
    if (!country || !province) {
      setBusinesses([]);
      setBusinessError('');
      setLoadingBusinesses(false);
      return;
    }

    let cancelled = false;

    async function loadBusinesses() {
      // A Vitrine principal fica vazia até configurarmos o plano Premium.
      // A hospedagem normal só dá visibilidade na respetiva subcategoria.
      setLoadingBusinesses(false);
      setBusinessError('');
      setBusinesses([]);
    }

    loadBusinesses();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, country, province]);

  useEffect(() => {
    if (!router.isReady || !country || !province) { setPremiumPromotions([]); return; }
    let cancelled = false;
    async function loadPremiumPromotions() {
      setLoadingBusinesses(true);
      setBusinessError('');
      try {
        const { data: rows, error: promotionError } = await supabase.from('premium_promotions')
          .select('id,business_id,plan_id,media_url,media_type,description,expires_at,starts_at')
          .eq('status','active').gt('expires_at',new Date().toISOString()).order('starts_at',{ascending:false});
        if (promotionError) throw promotionError;
        const promotionRows = rows || [];
        const businessIds = [...new Set(promotionRows.map(item=>item.business_id))];
        const planIds = [...new Set(promotionRows.map(item=>item.plan_id))];
        const [businessResult, planResult, authResult] = await Promise.all([
          businessIds.length ? supabase.from('businesses').select('id,name,owner_id,logo_url,country_id,province_id,subcategory_id').in('id',businessIds) : Promise.resolve({data:[],error:null}),
          planIds.length ? supabase.from('plans').select('id,duration_days').in('id',planIds) : Promise.resolve({data:[],error:null}),
          supabase.auth.getUser()
        ]);
        if (businessResult.error) throw businessResult.error;
        const businessById = Object.fromEntries((businessResult.data||[]).map(item=>[item.id,item]));
        const planById = Object.fromEntries((planResult.data||[]).map(item=>[item.id,item]));
        const visible = promotionRows.filter(item => {
          const b=businessById[item.business_id];
          return b && String(b.country_id)===String(country) && String(b.province_id)===String(province);
        }).map(item=>({...item,business:businessById[item.business_id],duration_days:planById[item.plan_id]?.duration_days||0}));
        if (cancelled) return;
        setPremiumPromotions(visible);
        const uid=authResult.data?.user?.id||null;
        setCurrentUserId(uid);
        if(uid) {
          const {data:savedRows,error:savedError}=await supabase.from('saved_premium_promotions').select('promotion_id').eq('user_id',uid);
          if(!savedError && !cancelled) setSavedPromotionIds((savedRows||[]).map(row=>row.promotion_id));
        }
      } catch(err) {
        console.error('Erro ao carregar Destaques Premium da Vitrine:',err);
        if(!cancelled) { setPremiumPromotions([]); setBusinessError('Não foi possível carregar os Destaques Premium desta região.'); }
      } finally { if(!cancelled) setLoadingBusinesses(false); }
    }
    loadPremiumPromotions();
    return ()=>{cancelled=true;};
  },[router.isReady,country,province]);

  async function toggleSavedPromotion(promotion) {
    if(!currentUserId) { router.push('/login'); return; }
    setSavingPromotionId(promotion.id);
    try {
      if(savedPromotionIds.includes(promotion.id)) {
        const {error}=await supabase.from('saved_premium_promotions').delete().eq('user_id',currentUserId).eq('promotion_id',promotion.id);
        if(error) throw error;
        setSavedPromotionIds(prev=>prev.filter(id=>id!==promotion.id));
      } else {
        const {error}=await supabase.from('saved_premium_promotions').insert({user_id:currentUserId,promotion_id:promotion.id});
        if(error) throw error;
        setSavedPromotionIds(prev=>[...prev,promotion.id]);
      }
    } catch(err) { setBusinessError(err.message||'Não foi possível guardar a publicação.'); }
    finally { setSavingPromotionId(''); }
  }

  async function handleAreaClick(area) {
    if (area.route) {
      let targetCountry = country;
      let targetProvince = province;

      // A Comunidade Talaza permanece na província principal do perfil,
      // mesmo quando a pessoa está a explorar outra província.
      if (area.route === '/comunidade') {
        targetCountry = safeValue(router.query.homeCountry) || country;
        targetProvince = safeValue(router.query.homeProvince) || '';

        if (!targetProvince) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('country_id, province_id')
              .eq('id', user.id)
              .maybeSingle();
            targetCountry = profile?.country_id || country;
            targetProvince = profile?.province_id || province;
          }
        }
      }

      router.push({
        pathname: area.route,
        query: {
          ...(targetCountry ? { country: targetCountry } : {}),
          ...(targetProvince ? { province: targetProvince } : {}),
        },
      });
      return;
    }

    setSelectedArea((current) => current === area.name ? '' : area.name);

    if (area.action === 'categories') {
      setTimeout(() => {
        document.getElementById('categorias')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 50);
    }
  }

  // Preserva a localização principal do explorador separada da província
  // temporariamente selecionada para explorar outras regiões.
  const homeCountry = safeValue(router.query.homeCountry);
  const homeProvince = safeValue(router.query.homeProvince);
  const exploreQuery = {
    ...(country ? { country } : {}),
    ...(province ? { province } : {}),
    ...(homeCountry ? { homeCountry } : {}),
    ...(homeProvince ? { homeProvince } : {}),
  };

  const locationLabel = [countryName, provinceName].filter(Boolean).join(' · ');

  return (
    <div className="explore-page">
      <style jsx global>{`
        html, body, #__next {
          margin: 0;
          min-height: 100%;
          background: ${C.canvas};
        }
        *, *::before, *::after { box-sizing: border-box; }
      `}</style>

      <div className="page-inner">
        <nav className="top-nav">
          <Link
            href={{ pathname: '/explore', query: exploreQuery }}
            className="brand"
          >
            <span className="brand-mark">T</span>
            <span className="brand-text">
              <strong>Talaza</strong>
              <small>Tudo num só lugar</small>
            </span>
          </Link>

          <TalazaMenu
            country={country}
            province={province}
            countryName={countryName}
            provinceName={provinceName}
          />
        </nav>

        <header className="intro">
          {locationLabel && (
            <div className="location-chip">
              <span>●</span> {locationLabel}
            </div>
          )}

          <h1>Encontre o que precisa.<br />Descubra o que pode fazer.</h1>

          <p>
            Explore negócios, produtos, serviços e oportunidades na Talaza.
          </p>
        </header>

        <section className="areas-section" aria-label="Áreas da Talaza">
          <div className="areas-grid">
            {AREAS.map((area) => {
              const active = selectedArea === area.name;

              return (
                <button
                  key={area.name}
                  type="button"
                  className={`area-card${active ? ' area-card-active' : ''}`}
                  style={{
                    '--area-color': area.color,
                    '--area-soft': `${area.color}18`,
                  }}
                  onClick={() => handleAreaClick(area)}
                >
                  <span className="area-icon">{area.icon}</span>
                  <span className="area-name">{area.name}</span>
                </button>
              );
            })}
          </div>

          {selectedArea && (
            <div className="area-description">
              {AREAS.find((area) => area.name === selectedArea)?.description}
            </div>
          )}
        </section>

        <section className="categories-section" id="categorias">
          <div className="section-heading">
            <div>
              <span className="section-kicker">EXPLORAR</span>
              <h2>Encontre por categoria</h2>
            </div>
            {provinceName && <span className="section-location">{provinceName}</span>}
          </div>

          {loadingCategories && (
            <div className="status-card">A carregar categorias…</div>
          )}

          {!loadingCategories && categoryError && (
            <div className="error-card">{categoryError}</div>
          )}

          {!loadingCategories && !categoryError && categories.length === 0 && (
            <div className="empty-card">
              Ainda não existem categorias registadas no Supabase.
            </div>
          )}

          {!loadingCategories && !categoryError && categories.length > 0 && (
            <div className="category-grid">
              {categories.map((category, index) => {
                const colors = [
                  C.green,
                  C.gold,
                  C.purple,
                  '#B35C4A',
                  '#3975A6',
                  '#5E7A43',
                ];
                const color = colors[index % colors.length];

                return (
                  <Link
                    key={category.id}
                    href={{
                      pathname: '/category',
                      query: {
                        id: category.id,
                        ...exploreQuery,
                      },
                    }}
                    className="category-card"
                  >
                    <span
                      className="category-icon"
                      style={{
                        '--category-color': color,
                        '--category-soft': `${color}18`,
                      }}
                    >
                      <CategoryIcon type={categoryIcon(category.name)} />
                    </span>

                    <span className="category-text">
                      <strong>{category.name}</strong>
                      <small>Explorar <span>→</span></small>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="businesses-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">VITRINE LOCAL</span>
              <Link href={{ pathname: '/historico', query: { type: 'vitrine', key: 'talaza_history_main', returnTo: router.asPath } }} className="history-link">◷ Histórico ({mainHistoryCount})</Link>
          <h2>Destaques Premium da região</h2>
            </div>
            {provinceName && <span className="section-location">{provinceName}</span>}
          </div>

          {!country || !province ? (
            <div className="empty-card">
              <span className="location-symbol">⌖</span>
              <p>
                Para ver negócios da sua região, abra a Vitrine com o país e a
                província selecionados. Pode continuar a explorar as categorias.
              </p>
            </div>
          ) : (
            <>
              {loadingBusinesses && (
                <div className="status-card">A carregar negócios…</div>
              )}

              {!loadingBusinesses && businessError && (
                <div className="error-card">{businessError}</div>
              )}

              {!loadingBusinesses && !businessError && premiumPromotions.length > 0 && (
                <div className="premium-post-grid">
                  {premiumPromotions.map((item) => (
                    <article key={item.id} className="premium-post-card">
                      {item.media_type === 'video' ? <video src={item.media_url} controls playsInline /> : <img src={item.media_url} alt="Publicação Destaque Premium" />}
                      <div className="premium-post-body">
                        <span className="premium-post-label">✦ DESTAQUE PREMIUM</span>
                        <h3>{item.business?.name || 'Negócio Talaza'}</h3>
                        <p>{item.description}</p>
                        <div className="premium-post-actions">
                          <button type="button" onClick={()=>router.push({pathname:'/mensagens',query:{to:item.business?.owner_id,source:'Vitrine',sourceId:item.business_id,box:'explore'}})} disabled={!item.business?.owner_id}>Enviar mensagem</button>
                          <Link href={{pathname:'/businesses/'+item.business_id,query:exploreQuery}}>Ver perfil</Link>
                          {item.duration_days===30 && <button type="button" onClick={()=>toggleSavedPromotion(item)} disabled={savingPromotionId===item.id}>{savingPromotionId===item.id?'…':savedPromotionIds.includes(item.id)?'✓ Guardado':'☆ Guardar'}</button>}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {!loadingBusinesses && !businessError && premiumPromotions.length === 0 && <div className="empty-card"><p>Ainda não há publicações Destaque Premium ativas nesta região.</p></div>}
            </>
          )}
        </section>
      </div>

      <style jsx>{`
        .history-link { display:inline-flex; border:1px solid #D7E2DC; border-radius:10px; padding:9px 11px; color:#145B49; background:#FFFFFF; font-size:12px; font-weight:800; text-decoration:none; white-space:nowrap; margin:0 0 12px; }
        .explore-page {
          min-height: 100vh;
          background: ${C.canvas};
          color: ${C.ink};
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
          padding-bottom: 110px;
        }
        .page-inner { max-width: 1180px; margin: 0 auto; padding: 0 18px; }
        .top-nav {
          min-height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: ${C.dark};
        }
        .brand-mark {
          display: grid;
          place-items: center;
          width: 40px;
          height: 40px;
          border-radius: 13px;
          background: ${C.green};
          color: ${C.gold};
          font-family: Georgia, serif;
          font-size: 22px;
          font-weight: 900;
        }
        .brand-text { display: flex; flex-direction: column; }
        .brand-text strong { font-size: 19px; font-weight: 900; letter-spacing: -.03em; }
        .brand-text small { margin-top: 1px; color: ${C.faint}; font-size: 9.5px; font-weight: 700; }
        .intro { position: relative; padding: 27px 0 8px; }
        .location-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 14px;
          padding: 7px 11px;
          border-radius: 99px;
          background: ${C.greenSoft};
          color: ${C.dark};
          font-size: 11px;
          font-weight: 800;
        }
        .location-chip span { color: ${C.gold}; }
        .intro h1 {
          max-width: 760px;
          margin: 0;
          color: ${C.dark};
          font-size: clamp(29px, 5vw, 44px);
          line-height: 1.08;
          letter-spacing: -.045em;
          font-weight: 900;
        }
        .intro p {
          max-width: 620px;
          margin: 12px 0 0;
          color: ${C.muted};
          font-size: 13.5px;
          line-height: 1.65;
        }
        .areas-section { margin-top: 26px; }
        .areas-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
        }
        .area-card {
          display: flex;
          min-width: 0;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 94px;
          padding: 12px 6px;
          border: 1px solid ${C.line};
          border-radius: 16px;
          background: ${C.white};
          cursor: pointer;
          transition: border-color .18s ease, transform .18s ease;
        }
        .area-card:hover { transform: translateY(-2px); border-color: var(--area-color); }
        .area-card-active { border-color: var(--area-color); background: var(--area-soft); }
        .area-icon {
          display: grid;
          place-items: center;
          width: 35px;
          height: 35px;
          border-radius: 12px;
          background: var(--area-soft);
          color: var(--area-color);
          font-size: 23px;
          line-height: 1;
        }
        .area-name { color: ${C.muted}; font-size: 11px; font-weight: 800; text-align: center; }
        .area-description {
          margin-top: 10px;
          padding: 13px 15px;
          border: 1px solid ${C.line};
          border-left: 3px solid ${C.purple};
          border-radius: 13px;
          background: white;
          color: ${C.muted};
          font-size: 12px;
          line-height: 1.6;
        }
        .categories-section, .businesses-section { margin-top: 36px; scroll-margin-top: 20px; }\n        .premium-post-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr)); gap:18px; }\n        .premium-post-card { overflow:hidden; border:1px solid #E3E8E4; border-radius:18px; background:#fff; box-shadow:0 10px 28px rgba(24,39,34,.07); }\n        .premium-post-card > img,.premium-post-card > video { display:block; width:100%; aspect-ratio:1/1; object-fit:cover; background:#111; }\n        .premium-post-body { padding:15px; } .premium-post-label { color:#9A7100; font-size:10px; font-weight:900; letter-spacing:1px; }\n        .premium-post-body h3 { margin:8px 0 5px; font-size:16px; } .premium-post-body p { color:#66736F; font-size:13px; line-height:1.55; }\n        .premium-post-actions { display:flex; flex-wrap:wrap; gap:7px; margin-top:12px; }\n        .premium-post-actions button,.premium-post-actions a { border:0; border-radius:9px; padding:9px 11px; background:#08745F; color:#fff; text-decoration:none; font-size:11px; font-weight:800; cursor:pointer; }\n        .premium-post-actions a { background:#F2EAF9; color:#3F1D60; }
        .section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }
        .section-kicker {
          color: ${C.purple};
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .14em;
        }
        .section-heading h2 {
          margin: 5px 0 0;
          color: ${C.ink};
          font-size: 23px;
          letter-spacing: -.035em;
        }
        .section-location { color: ${C.faint}; font-size: 11px; font-weight: 700; }
        .category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(165px, 1fr));
          gap: 11px;
        }
        .category-card {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 11px;
          padding: 14px 12px;
          border: 1px solid ${C.line};
          border-radius: 17px;
          background: white;
          color: ${C.ink};
          text-decoration: none;
          box-shadow: 0 5px 18px rgba(23,33,31,.025);
          transition: transform .18s ease, border-color .18s ease;
        }
        .category-card:hover { transform: translateY(-2px); border-color: ${C.purple}; }
        .category-icon {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 42px;
          height: 42px;
          border-radius: 13px;
          background: var(--category-soft);
          color: var(--category-color);
        }
        .category-text { display: flex; min-width: 0; flex-direction: column; gap: 5px; }
        .category-text strong { font-size: 12.5px; line-height: 1.35; overflow-wrap: anywhere; }
        .category-text small { color: ${C.faint}; font-size: 10px; font-weight: 700; }
        .category-text small span { color: ${C.purple}; }
        .business-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(195px, 1fr));
          gap: 13px;
        }
        .business-card {
          display: block;
          min-width: 0;
          padding: 11px;
          border: 1px solid ${C.line};
          border-radius: 18px;
          background: white;
          color: inherit;
          text-decoration: none;
          box-shadow: 0 7px 24px rgba(23,33,31,.035);
          transition: transform .18s ease, border-color .18s ease;
        }
        .business-card:hover { transform: translateY(-2px); border-color: ${C.purple}; }
        .business-card img, .business-placeholder {
          display: grid;
          place-items: center;
          width: 100%;
          height: 130px;
          margin-bottom: 11px;
          border-radius: 13px;
          object-fit: cover;
        }
        .business-placeholder {
          background: ${C.greenSoft};
          color: ${C.green};
          font-size: 33px;
          font-weight: 900;
        }
        .business-card h3 { margin: 0 2px 5px; font-size: 14px; line-height: 1.35; }
        .business-card p {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin: 0 2px 8px;
          color: ${C.muted};
          font-size: 11.5px;
          line-height: 1.5;
        }
        .business-location {
          display: block;
          margin: 0 2px;
          color: ${C.faint};
          font-size: 10.5px;
          font-weight: 700;
        }
        .business-link {
          display: inline-block;
          margin: 10px 2px 2px;
          color: ${C.green};
          font-size: 11px;
          font-weight: 900;
        }
        .status-card, .empty-card, .error-card {
          padding: 22px;
          border: 1px solid ${C.line};
          border-radius: 16px;
          background: white;
          color: ${C.muted};
          font-size: 12.5px;
          line-height: 1.6;
        }
        .empty-card { text-align: center; }
        .empty-card p { max-width: 550px; margin: 8px auto 0; }
        .location-symbol {
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          margin: 0 auto 10px;
          border-radius: 15px;
          background: ${C.goldSoft};
          color: ${C.gold};
          font-size: 27px;
        }
        .error-card { border-color: #F0D2CF; background: #FFF5F4; color: #9B2C2C; }
        @media (max-width: 760px) {
          .areas-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .category-grid { grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); }
        }
        @media (max-width: 430px) {
          .page-inner { padding: 0 13px; }
          .top-nav { min-height: 68px; }
          .intro { padding-top: 23px; }
          .areas-grid { gap: 8px; }
          .area-card { min-height: 85px; border-radius: 14px; }
          .category-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
          .category-card { gap: 8px; padding: 11px 9px; }
          .category-icon { width: 36px; height: 36px; }
          .category-text strong { font-size: 11.5px; }
          .section-heading h2 { font-size: 20px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .area-card, .category-card, .business-card { transition: none; }
        }
      `}</style>
    </div>
  );
}

// Forçar a barra inferior de Perfil, Mensagens e Notificações nesta página.
Explore.showMessageDock = true;
