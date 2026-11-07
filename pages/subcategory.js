import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import MediaOptions from '../components/MediaOptions';

const COLORS = {
  green: '#0F6E5C',
  darkGreen: '#083F35',
  gold: '#DDA10A',
  purple: '#7656A6',
  purpleSoft: '#F2EDF8',
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

function makeBusinessHref(id, country, province, subcategoryId) {
  const params = new URLSearchParams();
  if (country) params.set('country', country);
  if (province) params.set('province', province);
  if (subcategoryId) {
    const returnParams = new URLSearchParams();
    returnParams.set('id', subcategoryId);
    if (country) returnParams.set('country', country);
    if (province) returnParams.set('province', province);
    params.set('returnTo', `/subcategory?${returnParams.toString()}`);
  }
  const query = params.toString();
  return `/businesses/${id}${query ? `?${query}` : ''}`;
}

export default function Subcategory() {
  const router = useRouter();
  const { id, country, province, homeCountry, homeProvince } = router.query;

  const [subcategory, setSubcategory] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [businessImagesById, setBusinessImagesById] = useState({});
  const [premiumPromotions, setPremiumPromotions] = useState([]);
  const [savedPromotionIds, setSavedPromotionIds] = useState([]);
  const [savingPromotionId, setSavingPromotionId] = useState('');
  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');

  const [search, setSearch] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [premiumLoading, setPremiumLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyItems, setHistoryItems] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [savedBusinessIds, setSavedBusinessIds] = useState([]);
  const [savingBusinessId, setSavingBusinessId] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  const historyStorageKey = 'talaza_history_subcategory_' + String(id || '') + '_' + String(province || 'all');

  const [premiumOpen, setPremiumOpen] = useState(false);

  useEffect(() => {
    if (!premiumOpen) return;
    const scroller = document.querySelector('.premiumFeedScroller');
    if (!scroller) return;
    const videos = Array.from(scroller.querySelectorAll('video'));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (!entry.isIntersecting || entry.intersectionRatio < 0.65) {
          video.pause();
          return;
        }
        // Reproduz o vídeo que ocupa a maior parte do feed, como nos feeds sociais.
        // Primeiro tenta com som; se o navegador bloquear autoplay com áudio,
        // inicia automaticamente sem som. O utilizador pode activar o som nos controlos.
        videos.forEach((other) => { if (other !== video) other.pause(); });
        const playback = video.play();
        if (playback && typeof playback.catch === 'function') {
          playback.catch(() => {
            video.muted = true;
            video.play().catch(() => {});
          });
        }
      });
    }, { root: scroller, threshold: [0, 0.35, 0.65, 0.85, 1] });
    videos.forEach((video) => observer.observe(video));
    return () => {
      observer.disconnect();
      videos.forEach((video) => video.pause());
    };
  }, [premiumOpen, premiumPromotions.length]);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => { if (alive) setCurrentUserId(data?.user?.id || null); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  async function toggleSavedBusiness(business) {
    if (!currentUserId) { setSaveNotice('Inicia sessão na Talaza para guardar este perfil.'); return; }
    setSavingBusinessId(business.id); setSaveNotice('');
    try {
      if (savedBusinessIds.includes(business.id)) {
        const { error: deleteError } = await supabase.from('saved_businesses').delete().eq('user_id', currentUserId).eq('business_id', business.id);
        if (deleteError) throw deleteError;
        setSavedBusinessIds(prev => prev.filter(value => value !== business.id));
        setSaveNotice('Perfil removido dos guardados.');
      } else {
        const { error: insertError } = await supabase.from('saved_businesses').insert({ user_id: currentUserId, business_id: business.id });
        if (insertError && insertError.code !== '23505') throw insertError;
        setSavedBusinessIds(prev => prev.includes(business.id) ? prev : [...prev, business.id]);
        setSaveNotice('Perfil guardado. Poderás consultar os teus guardados na área de notificações quando ela for configurada.');
      }
    } catch (err) { setSaveNotice(err?.message || 'Não foi possível guardar este perfil.'); }
    finally { setSavingBusinessId(''); }
  }

  useEffect(() => {
    if (!router.isReady || !id) return;
    try {
      const saved = localStorage.getItem(historyStorageKey);
      setHistoryItems(saved ? JSON.parse(saved) : []);
    } catch {
      setHistoryItems([]);
    }
  }, [router.isReady, id, province]);

  function clearSubcategoryHistory() {
    try { localStorage.removeItem(historyStorageKey); } catch {}
    setHistoryItems([]);
    setShowHistory(false);
  }

  function trackBusinessAction(business) {
    if (!business?.id) return;
    setHistoryItems(previous => {
      const next = [{
        id: business.id,
        name: business.name,
        logo_url: business.logo_url || null,
        cover_url: business.cover_url || null,
        at: new Date().toISOString(),
        href: makeBusinessHref(business.id, country, province, id)
      }, ...previous.filter(item => item.id !== business.id)].slice(0, 100);
      try { localStorage.setItem(historyStorageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }

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

        // Os exploradores podem mudar de província, mas cada negócio
        // só aparece na província em que o vendedor o registou.
        let businessQuery = supabase
          .from('businesses')
          .select(
            'id, owner_id, name, description, municipality, neighborhood, address, phone, whatsapp, opening_hours, logo_url, cover_url, country_id, province_id, subcategory_id, is_active, approval_status, created_at'
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
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          const { data: savedRows, error: savedError } = await supabase.from('saved_businesses').select('business_id').eq('user_id', authData.user.id);
          if (!savedError && !cancelled) { setCurrentUserId(authData.user.id); setSavedBusinessIds((savedRows || []).map(row => row.business_id)); }
        }

        // Carrega separadamente as três imagens principais de cada negócio.
        // A falha da galeria não impede a apresentação dos cartões.
        const businessIds = (businessData || []).map((business) => business.id);
        if (businessIds.length) {
          const { data: imageData, error: imageError } = await supabase
            .from('business_images')
            .select('id, business_id, kind, slot, image_url, name, description, price')
            .in('business_id', businessIds)
            .eq('kind', 'main')
            .order('slot', { ascending: true });

          if (imageError) {
            console.error('Não foi possível carregar imagens principais:', imageError);
          } else if (!cancelled) {
            const grouped = {};
            (imageData || []).forEach((image) => {
              if (!grouped[image.business_id]) grouped[image.business_id] = [];
              grouped[image.business_id].push(image);
            });
            setBusinessImagesById(grouped);
          }
        } else if (!cancelled) {
          setBusinessImagesById({});
        }

        // Na subcategoria aparecem os dois planos Premium: 15 dias (2.500 Kz)
        // e 30 dias (5.000 Kz). O plano de 30 dias também surge em Para si.
        const { data: premiumPlanRows, error: premiumPlanError } = await supabase.from('plans')
          .select('id,duration_days').eq('plan_type','Destaque Premium').in('duration_days',[15,30]).eq('is_active',true);
        if (premiumPlanError) console.warn('Não foi possível consultar os planos Premium:',premiumPlanError);
        const subcategoryPlanIds=(premiumPlanRows||[]).map(item=>item.id);
        if(subcategoryPlanIds.length) {
          const { data: promoRows, error: promoError } = await supabase.from('premium_promotions')
            .select('id,business_id,plan_id,media_url,media_type,description,starts_at,expires_at,status')
            .in('plan_id',subcategoryPlanIds).eq('status','active').gt('expires_at',new Date().toISOString())
            .order('starts_at',{ascending:false});
          if(promoError) console.warn('Não foi possível carregar promoções da subcategoria:',promoError);
          const promoBusinessIds=[...new Set((promoRows||[]).map(item=>item.business_id).filter(Boolean))];
          const {data:promoAuth}=await supabase.auth.getUser();
          const promoUserId=promoAuth?.user?.id || currentUserId;
          if(promoUserId) setCurrentUserId(promoUserId);
          const [promoBusinesses,promoSaved]=await Promise.all([
            promoBusinessIds.length ? supabase.from('businesses').select('id,name,owner_id,province_id,country_id,subcategory_id').in('id',promoBusinessIds) : Promise.resolve({data:[],error:null}),
            promoUserId ? supabase.from('saved_premium_promotions').select('promotion_id').eq('user_id',promoUserId) : Promise.resolve({data:[],error:null})
          ]);
          if(promoBusinesses.error) console.warn('Não foi possível carregar negócios dos destaques:',promoBusinesses.error);
          const businessMap=Object.fromEntries((promoBusinesses.data||[]).map(item=>[item.id,item]));
          const visible=(promoRows||[]).filter(item=>{
            const b=businessMap[item.business_id];
            return b && String(b.subcategory_id)===String(id) && (!country || String(b.country_id)===String(country)) && (!province || String(b.province_id)===String(province));
          }).map(item=>({...item,business:businessMap[item.business_id],duration_days:Number((premiumPlanRows||[]).find(plan=>String(plan.id)===String(item.plan_id))?.duration_days||0)}));
          if(!cancelled) {
            setPremiumPromotions(visible);
            setSavedPromotionIds((promoSaved.data||[]).map(row=>row.promotion_id));
          }
        } else if(!cancelled) setPremiumPromotions([]);
        setLoading(false);
        if (!cancelled) {
          setPremiumLoading(false);
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

  async function toggleSavedPromotion(promotion) {
    if(!currentUserId) { setSaveNotice('Inicia sessão na Talaza para guardar esta publicação.'); return; }
    setSavingPromotionId(promotion.id); setSaveNotice('');
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
    } catch(err) { setSaveNotice(err.message || 'Não foi possível guardar a publicação.'); }
    finally { setSavingPromotionId(''); }
  }

  useEffect(() => {
    if (!premiumOpen) return;

    function onKeyDown(event) {
      if (event.key === 'Escape') setPremiumOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [premiumOpen]);

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
      const matchesSearch =
        !term || name.includes(term) || businessMunicipality.includes(term);

      const matchesMunicipality =
        !selectedMunicipality ||
        businessMunicipality.includes(selectedMunicipality);

      return matchesSearch && matchesMunicipality;
    });
  }, [businesses, search, municipality]);

  function getBackHref() {
    const categoryId = subcategory?.category_id;
    if (!categoryId) {
      const params = new URLSearchParams();
      if (country) params.set('country', country);
      if (province) params.set('province', province);
      if (homeCountry) params.set('homeCountry', homeCountry);
      if (homeProvince) params.set('homeProvince', homeProvince);
      return `/explore${params.toString() ? `?${params.toString()}` : ''}`;
    }

    const params = new URLSearchParams({ id: String(categoryId) });
    if (country) params.set('country', String(country));
    if (province) params.set('province', String(province));
    if (homeCountry) params.set('homeCountry', String(homeCountry));
    if (homeProvince) params.set('homeProvince', String(homeProvince));
    return `/category?${params.toString()}`;
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => router.push({ pathname: '/historico', query: { type: 'subcategory', key: historyStorageKey, returnTo: router.asPath } })} style={{ border: '1px solid #D7C3EA', background: '#F0E7F7', color: '#64358B', borderRadius: 10, padding: '9px 12px', fontWeight: 800, cursor: 'pointer', fontSize: 12 }}>◷ Ver histórico ({historyItems.length})</button>
            <Link href={getBackHref()} className="backLink" onClick={clearSubcategoryHistory}>← Voltar às subcategorias</Link>
          </div>
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
          {true && (
            <>
              <section className="searchPanel">
                <div className="searchRow compactSearch">
                  {!searchOpen ? (
                    <button type="button" className="searchIcon searchIconButton" aria-label="Abrir pesquisa" onClick={() => setSearchOpen(true)}>⌕</button>
                  ) : (
                    <>
                      <span className="searchIcon" aria-hidden="true">⌕</span>
                      <input id="business-search" type="search" autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome do negócio ou município…" aria-label="Pesquisar por nome do negócio ou município" />
                      <button type="button" className="searchClose" aria-label="Fechar pesquisa" onClick={() => {setSearch('');setSearchOpen(false);}}>×</button>
                    </>
                  )}
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

              {!premiumLoading && premiumPromotions.length > 0 && (
                <section className="premiumSection" aria-label="Destaques Premium">
                  <button type="button" className="premiumLauncher" onClick={() => setPremiumOpen(true)}>
                    <span className="premiumLauncherIcon">✦</span>
                    <span className="premiumLauncherText"><strong>Destaques Premium</strong><small>Publicações especiais desta subcategoria</small></span>
                    <span className="premiumLauncherCount">{premiumPromotions.length}</span>
                    <span className="premiumLauncherArrow">›</span>
                  </button>
                </section>
              )}

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
                    {filteredBusinesses.map((business) => {
                      const mainImages = (businessImagesById[business.id] || [])
                        .filter((image) => image.kind === 'main')
                        .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
                        .slice(0, 3);
                      // O botão principal abre sempre a conversa interna Talaza.
                      // owner_id identifica o utilizador vendedor; business.id identifica o negócio.
                      const canMessage = Boolean(business.owner_id);

                      return (
                        <article className="businessCard" key={business.id}>
                          <div className="cardCover">
                            {business.cover_url ? (
                              <img src={business.cover_url} alt={'Capa de ' + business.name} loading="lazy" />
                            ) : (
                              <div className="coverFallback"><span>{business.name}</span></div>
                            )}
                            <div className="cardLogo">
                              {business.logo_url ? (
                                <img src={business.logo_url} alt={'Logo de ' + business.name} loading="lazy" />
                              ) : (
                                <span>{getInitials(business.name)}</span>
                              )}
                            </div>
                          </div>

                          <div className="businessInfo">
                            <div className="businessTitleRow">
                              <h3>{business.name}</h3>
                            </div>
                            <div className="mainImagesPreview">
                              {[0, 1, 2].map((slot) => {
                                const image = mainImages.find((item) => item.slot === slot) || mainImages[slot];
                                return (
                                  <div className="mainPreview" key={slot}>
                                    {image?.image_url ? (
                                      <img src={image.image_url} alt={image.name || ('Imagem principal ' + (slot + 1))} loading="lazy" />
                                    ) : (
                                      <span className="mainPlaceholder">Imagem {slot + 1}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            <p className="businessDescription">
                              {cleanText(business.description) || 'Conhece os serviços deste negócio.'}
                            </p>

                            <div className="businessActions">
                              {canMessage ? (
                                <button
                                  type="button"
                                  className="messageButton"
                                  onClick={() => { trackBusinessAction(business); router.push({
                                    pathname: '/mensagens',
                                    query: {
                                      to: business.owner_id,
                                      source: 'Vitrine',
                                      sourceId: business.id,
                                    },
                                  }); }}
                                >
                                  <span className="actionIcon">💬</span>
                                  <span>Enviar<br />mensagem</span>
                                </button>
                              ) : (
                                <span className="messageButton disabledButton" aria-disabled="true">
                                  <span className="actionIcon">💬</span>
                                  <span>Mensagem<br />indisponível</span>
                                </span>
                              )}
                              <Link className="profileButton" style={{backgroundColor:"#00A651",background:"#00A651",border:"1.8px solid #00A651",color:"#FFFFFF"}} href={makeBusinessHref(business.id, country, province, id)} onClick={() => trackBusinessAction(business)}>
                                <span className="actionIcon">👤</span>
                                <span>Ver perfil</span>
                              </Link>
                              <button type="button" className={'saveButton' + (savedBusinessIds.includes(business.id) ? ' saved' : '')} disabled={savingBusinessId === business.id} onClick={() => toggleSavedBusiness(business)}>
                                <span className="actionIcon">🔖</span>
                                <span>{savingBusinessId === business.id ? 'A guardar…' : savedBusinessIds.includes(business.id) ? 'Guardado' : 'Guardar'}</span>
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </section>

        {saveNotice && <div role="status" className="saveNotice">{saveNotice}<button type="button" onClick={() => setSaveNotice('')} aria-label="Fechar aviso">×</button></div>}
        <footer className="footer">
          <span>Talaza</span>
          <span>Descobre. Compara. Encontra.</span>
        </footer>

        {premiumOpen && premiumPromotions.length > 0 && (
          <div className="premiumFeedOverlay" role="dialog" aria-modal="true" aria-label="Feed de Destaques Premium" onClick={(event) => {
            if (event.target === event.currentTarget) setPremiumOpen(false);
          }}>
            <button type="button" className="premiumFeedClose" onClick={() => setPremiumOpen(false)} aria-label="Fechar destaques">×</button>
            <div className="premiumFeedScroller">
              {premiumPromotions.map((item, index) => (
                <article className="premiumFeedItem" key={item.id}>
                  {item.media_type === 'video'
                    ? <MediaOptions url={item.media_url} isVideo fileName="destaque-premium" storagePath={item.storage_path}><video className="premiumFeedMedia" src={item.media_url} controls playsInline preload="auto" autoPlay muted={false} onPlay={(event) => {
                      const currentVideo = event.currentTarget;
                      const scroller = currentVideo.closest('.premiumFeedScroller');
                      scroller?.querySelectorAll('video').forEach((video) => {
                        if (video !== currentVideo) video.pause();
                      });
                    }} /></MediaOptions>
                    : <MediaOptions url={item.media_url} fileName="destaque-premium"><img className="premiumFeedMedia" src={item.media_url} alt="Publicação Destaque Premium" /></MediaOptions>}
                  <div className="premiumFeedShade" />
                  <div className="premiumFeedTop"><span>✦ DESTAQUE PREMIUM</span><small>{index + 1} / {premiumPromotions.length}</small></div>
                  <div className="premiumFeedInfo">
                    <strong>{item.business?.name || 'Negócio Talaza'}</strong>
                    <p>{cleanText(item.description) || 'Conhece esta publicação na Talaza.'}</p>
                    <div className="premiumFeedActions">
                      {Number(item.duration_days) === 30 && <button
                        type="button"
                        disabled={!item.business?.id || savingBusinessId === item.business.id}
                        onClick={() => toggleSavedBusiness(item.business)}
                        aria-pressed={savedBusinessIds.includes(item.business?.id)}
                        style={{background:savedBusinessIds.includes(item.business?.id)?'#E8F3EF':'#FFFFFF',color:'#08745F',border:'1px solid #B9D8CD'}}
                      >
                        {savingBusinessId === item.business?.id ? 'A guardar…' : savedBusinessIds.includes(item.business?.id) ? 'Guardado' : 'Guardar'}
                      </button>}
                      <button type="button" disabled={!item.business?.owner_id} onClick={() => router.push({pathname:'/mensagens',query:{to:item.business?.owner_id,source:'Destaques Premium',sourceId:item.business_id,box:'explore'}})}><span aria-hidden="true">💬 </span>Enviar mensagem</button>
                      <Link href={makeBusinessHref(item.business_id,country,province,id)} onClick={() => trackBusinessAction(item.business)}>Ver perfil</Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .premium-post-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr)); gap:16px; }
        .premium-post-card { overflow:hidden; border:1px solid #E3E8E4; border-radius:17px; background:#fff; box-shadow:0 9px 24px rgba(24,39,34,.06); }
        .premium-post-card > img,.premium-post-card > video { display:block; width:100%; aspect-ratio:1/1; object-fit:cover; background:#111; }
        .premium-post-body { padding:14px; } .premium-post-label { color:#9A7100; font-size:10px; font-weight:900; letter-spacing:1px; }
        .premium-post-body h3 { margin:8px 0 5px; font-size:16px; } .premium-post-body p { color:#66736F; font-size:13px; line-height:1.55; }
        .premium-post-actions { display:flex; flex-wrap:wrap; gap:7px; margin-top:12px; }
        .premium-post-actions button,.premium-post-actions a { border:0; border-radius:9px; padding:9px 11px; background:#08745F; color:#fff; text-decoration:none; font-size:11px; font-weight:800; cursor:pointer; }
        .premium-post-actions a { background:#F2EAF9; color:#3F1D60; }

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
          font-size: 11px;
          line-height: 1.2;
          overflow-wrap: anywhere;
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
          height: 128px;
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
          gap: 14px;
        }

        .businessCard {
          min-width: 0;
          overflow: hidden;
          border: 1px solid ${COLORS.line};
          border-radius: 18px;
          background: white;
          box-shadow: 0 8px 24px rgba(17, 49, 41, .06);
          transition: border-color .18s, transform .18s, box-shadow .18s;
        }

        .businessCard:hover {
          border-color: #B7D5CC;
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(17, 49, 41, .1);
        }

        .cardCover {
          position: relative;
          height: 150px;
          background: linear-gradient(135deg, #DDECE6, #F1F5F2);
        }

        .cardCover > img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .coverFallback {
          display: grid;
          place-items: center;
          width: 100%;
          height: 100%;
          padding: 16px;
          box-sizing: border-box;
          color: #075B4E;
          font-size: 18px;
          font-weight: 800;
          text-align: center;
        }

        .cardLogo {
          position: absolute;
          left: 14px;
          bottom: -24px;
          display: grid;
          place-items: center;
          width: 60px;
          height: 60px;
          overflow: hidden;
          border: 4px solid #fff;
          border-radius: 50%;
          background: #E8F3F0;
          color: ${COLORS.green};
          font-size: 20px;
          font-weight: 800;
          box-shadow: 0 2px 9px rgba(0,0,0,.1);
        }

        .cardLogo img { width: 100%; height: 100%; object-fit: cover; }

        .businessInfo { min-width: 0; padding: 32px 14px 14px; }

        .businessTitleRow { display: flex; align-items: center; gap: 7px; }

        .businessTitleRow h3 {
          overflow-wrap: anywhere;
          margin: 0 0 7px;
          font-size: 16px;
          line-height: 1.35;
        }

        .smallPremium { color: ${COLORS.gold}; font-size: 15px; }

        .businessDescription {
          display: -webkit-box;
          overflow: hidden;
          min-height: 38px;
          margin: 0 0 13px;
          color: ${COLORS.muted};
          font-size: 12px;
          line-height: 1.45;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .mainImagesPreview {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
          margin: 0 0 11px;
        }

        .mainPreview { aspect-ratio: 1 / 1; overflow: hidden; border-radius: 9px; background: #EDF3F0; }
        .mainPreview img { display: block; width: 100%; height: 100%; object-fit: cover; }

        .mainPlaceholder {
          display: grid;
          place-items: center;
          width: 100%;
          height: 100%;
          padding: 3px;
          box-sizing: border-box;
          color: #8A9992;
          font-size: 10px;
          text-align: center;
        }

        .businessActions { display: flex; width: 100%; gap: 8px; align-items: stretch; }
        .messageButton, .profileButton, .saveButton {
          display: flex;
          flex: 1 1 0;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          min-width: 0;
          min-height: 54px;
          height: 54px;
          padding: 5px 3px;
          box-sizing: border-box;
          border: 1.8px solid #C9A227;
          border-radius: 14px;
          color: #FFFFFF;
          font-size: 12.5px;
          line-height: 14px;
          font-weight: 700;
          text-align: center;
          text-decoration: none;
          white-space: normal;
          transition: filter .15s, transform .15s;
          cursor: pointer;
        }
        .messageButton, .saveButton { background: #112a15; border: 1.8px solid #C9A227; }
        .businessActions a.profileButton, .businessActions .profileButton { background: #00A651 !important; background-color: #00A651 !important; border: 1.8px solid #00A651 !important; color: #FFFFFF !important; opacity: 1 !important; }
        .actionIcon { display: block; color: #FFD700; font-size: 16px; line-height: 18px; }
        .saveButton { width: auto; overflow-wrap: normal; }
        .saveButton.saved { background: #173D25; border-color: #E0BD4B; color: #FFFFFF; }
        .saveButton:disabled { opacity: .6; cursor: wait; }
        .disabledButton { opacity: .55; cursor: not-allowed; }
        .messageButton:hover, .profileButton:hover, .saveButton:hover { filter: brightness(1.16); }
        .messageButton:active, .profileButton:active, .saveButton:active { transform: scale(.98); }

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

        .premiumSection { margin: 0 0 22px; }
        .premiumLauncher { display:flex; align-items:center; gap:12px; width:100%; min-height:66px; padding:11px 15px; border:1px solid #E7D8A9; border-radius:14px; background:linear-gradient(105deg,#FFFCF2,#FFFFFF); color:#332B18; text-align:left; cursor:pointer; box-shadow:0 5px 16px rgba(73,57,15,.045); }
        .premiumLauncherIcon { display:grid; place-items:center; width:39px; height:39px; flex:0 0 39px; border-radius:12px; background:#F8EBC5; color:#98700A; font-size:23px; }
        .premiumLauncherText { display:flex; flex:1; min-width:0; flex-direction:column; gap:3px; }
        .premiumLauncherText strong { font-size:13px; }
        .premiumLauncherText small { color:#777064; font-size:11px; }
        .premiumLauncherCount { display:grid; place-items:center; min-width:28px; height:28px; padding:0 7px; border-radius:20px; background:#DDA10A; color:#302406; font-size:12px; font-weight:900; }
        .premiumLauncherArrow { color:#98700A; font-size:25px; line-height:1; }
        .premiumFeedOverlay { position:fixed; z-index:1200; inset:0; display:flex; justify-content:center; background:rgba(3,10,9,.97); }
        .premiumFeedScroller { width:min(100%,520px); height:100%; overflow-y:auto; overscroll-behavior:contain; scroll-snap-type:y mandatory; scrollbar-width:none; }
        .premiumFeedScroller::-webkit-scrollbar { display:none; }
        .premiumFeedItem { position:relative; width:100%; height:100vh; height:100dvh; overflow:hidden; scroll-snap-align:start; scroll-snap-stop:always; background:#101614; color:#fff; }
        .premiumFeedItem :global(.talazaMediaOptions){position:relative;width:100%;height:100%;display:block}.premiumFeedItem :global(.talazaMediaOptions > video),.premiumFeedItem :global(.talazaMediaOptions > img){width:100%;height:100%;object-fit:cover;display:block}.premiumFeedMedia { position:absolute; inset:0; display:block; width:100%; height:100%; object-fit:contain; background:#080B0A; }
        .premiumFeedShade { position:absolute; inset:0; pointer-events:none; background:linear-gradient(180deg,rgba(0,0,0,.34),transparent 28%,transparent 48%,rgba(0,0,0,.82)); }
        .premiumFeedTop { position:absolute; top:20px; left:18px; right:72px; display:flex; justify-content:space-between; gap:10px; align-items:center; font-size:10px; font-weight:900; letter-spacing:1.2px; color:#F4D77E; }
        .premiumFeedTop small { color:#fff; font-size:11px; letter-spacing:0; }
        .premiumFeedClose { position:fixed; z-index:3; top:14px; right:16px; width:42px; height:42px; border:1px solid rgba(255,255,255,.55); border-radius:50%; background:rgba(0,0,0,.38); color:#fff; font-size:27px; cursor:pointer; }
        .premiumFeedInfo { position:absolute; z-index:2; left:20px; right:20px; bottom:max(86px,calc(env(safe-area-inset-bottom) + 64px)); }
        .premiumFeedInfo strong { display:block; margin-bottom:9px; font-size:21px; text-shadow:0 2px 8px rgba(0,0,0,.5); }
        .premiumFeedInfo p { max-width:440px; margin:0 0 16px; color:#F3F3F3; font-size:14px; line-height:1.55; white-space:pre-wrap; text-shadow:0 1px 5px rgba(0,0,0,.6); }
        .premiumFeedActions { display:flex; flex-wrap:wrap; gap:9px; }
        .premiumFeedActions button,.premiumFeedActions a { display:inline-flex; align-items:center; justify-content:center; min-height:40px; padding:0 15px; border:1px solid rgba(255,255,255,.2); border-radius:10px; background:#08745F; color:#fff; font-size:12px; font-weight:800; text-decoration:none; cursor:pointer; }
        .premiumFeedActions a { background:#F2EAF9; color:#3F1D60; }
        .premiumFeedActions button:disabled { opacity:.5; cursor:not-allowed; }

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
          .cardCover { height: 145px; }
          .businessInfo { padding-left: 14px; padding-right: 14px; }

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
