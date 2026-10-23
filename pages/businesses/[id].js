import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import ProductsView, { VIEW_MODES } from '../../components/ProductsView';

const MODE_LABELS = {
  vertical: 'Vertical',
  deslize: 'Quadrado / deslize',
  normal: 'Grade normal',
};

function clean(value) {
  return String(value || '').trim();
}

function formatPhone(value) {
  return String(value || '').replace(/[^\d+]/g, '');
}

export default function BusinessPublicProfile() {
  const router = useRouter();
  const { id, country, province } = router.query;
  const [business, setBusiness] = useState(null);
  const [mainImages, setMainImages] = useState([]);
  const [panelImages, setPanelImages] = useState([]);
  const [viewMode, setViewMode] = useState('normal');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (!router.isReady || !id) return;
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError('');
      try {
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('id, owner_id, name, description, country_id, province_id, municipality, neighborhood, address, phone, whatsapp, email, opening_hours, logo_url, cover_url, is_active, approval_status, panel_view_mode')
          .eq('id', id)
          .eq('is_active', true)
          .eq('approval_status', 'approved')
          .maybeSingle();

        if (businessError) throw businessError;
        if (!businessData) throw new Error('Este negócio não está disponível publicamente.');

        // A província e o país da URL devem corresponder ao negócio.
        // Isso impede abrir um perfil de outra província alterando o link.
        if (country && businessData.country_id !== country) {
          throw new Error('Este negócio pertence a outro país.');
        }
        if (province && businessData.province_id !== province) {
          throw new Error('Este negócio pertence a outra província.');
        }

        // Privacidade segura por defeito: se a coluna ainda não existir,
        // o perfil continua a carregar e o e-mail permanece oculto.
        let emailVisible = false;
        const { data: emailPreference, error: emailPreferenceError } = await supabase
          .from('businesses')
          .select('show_email')
          .eq('id', businessData.id)
          .maybeSingle();
        if (!emailPreferenceError) emailVisible = emailPreference?.show_email === true;
        businessData.show_email = emailVisible;

        const { data: imageData, error: imageError } = await supabase
          .from('business_images')
          .select('id, business_id, kind, slot, image_url, video_url, media_type, storage_path, name, description, price, created_at')
          .eq('business_id', businessData.id)
          .order('slot', { ascending: true });

        if (imageError) throw imageError;
        if (cancelled) return;

        const allImages = imageData || [];
        setBusiness(businessData);
        setMainImages(allImages.filter((image) => image.kind === 'main').sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0)).slice(0, 3));
        setPanelImages(allImages.filter((image) => image.kind === 'panel'));
        setViewMode(VIEW_MODES.includes(businessData.panel_view_mode) ? businessData.panel_view_mode : 'normal');
      } catch (err) {
        console.error('Erro ao carregar perfil público do negócio:', err);
        if (!cancelled) setError(err?.message || 'Não foi possível carregar este perfil.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();
    return () => { cancelled = true; };
  }, [router.isReady, id]);

  const backHref = useMemo(() => {
    const requestedReturn = Array.isArray(router.query.returnTo) ? router.query.returnTo[0] : router.query.returnTo;
    if (typeof requestedReturn === 'string' && requestedReturn.startsWith('/subcategory?')) return requestedReturn;
    const params = new URLSearchParams();
    if (country || business?.country_id) params.set('country', country || business.country_id);
    if (province || business?.province_id) params.set('province', province || business.province_id);
    return '/explore' + (params.toString() ? '?' + params.toString() : '');
  }, [router.query.returnTo, country, province, business]);

  const backLabel = backHref.startsWith('/subcategory?') ? 'Voltar à subcategoria' : backHref.startsWith('/category?') ? 'Voltar às subcategorias' : 'Voltar à Vitrine';

  const contactNumber = business?.phone;
  const messageHref = business?.owner_id ? '/mensagens?to=' + encodeURIComponent(business.owner_id) + '&source=Vitrine&sourceId=' + encodeURIComponent(business.id) + '&returnTo=' + encodeURIComponent(backHref) : null;
  const addressParts = [business?.address, business?.neighborhood].map(clean).filter(Boolean);
  const addressLine = addressParts.join(', ');

  return (
    <>
      <Head>
        <title>{business?.name ? business.name + ' | Talaza' : 'Perfil do negócio | Talaza'}</title>
        <meta name="description" content={clean(business?.description) || 'Conhece este negócio na Talaza.'} />
      </Head>
      <main className="publicPage">
        <header className="topbar">
          <Link href={backHref} className="brand"><span className="brandMark">T</span><span>Talaza</span></Link>
          <Link href={backHref} className="backLink">← {backLabel}</Link>
        </header>

        {loading ? (
          <div className="stateCard">A carregar perfil do negócio…</div>
        ) : error ? (
          <div className="stateCard errorState">
            <h1>Perfil indisponível</h1>
            <p>{error}</p>
            <Link href={backHref} className="primaryButton">{backLabel}</Link>
          </div>
        ) : business && (
          <div className="profileWrap">
            <section className="identityCard">
              <div className="cover">
                {business.cover_url ? <img src={business.cover_url} alt={'Capa de ' + business.name} /> : <div className="coverFallback">{business.name}</div>}
              </div>
              <div className="identityBody">
                <div className="logo">
                  {business.logo_url ? <img src={business.logo_url} alt={'Logo de ' + business.name} /> : <span>{clean(business.name).slice(0, 1).toUpperCase() || 'T'}</span>}
                </div>
                <h1>{business.name}</h1>
                <div className="mainImages">
                  {[0, 1, 2].map((slot) => {
                    const image = mainImages.find((item) => item.slot === slot) || mainImages[slot];
                    return <div className="mainImage" key={slot}>{image?.image_url ? <img src={image.image_url} alt={image.name || ('Imagem principal ' + (slot + 1))} /> : <span>Imagem {slot + 1}</span>}</div>;
                  })}
                </div>
                {business.description && <p className="description">{business.description}</p>}
                <div className="topActions">
                  {messageHref ? <Link className="messageButton" href={messageHref}>Enviar mensagem dentro da Talaza</Link> : <span className="disabledMessage">Mensagem interna indisponível</span>}
                  
                </div>
              </div>
            </section>

            <section className="detailsCard">
              <h2>Contactos e localização</h2>
              <div className="detailsGrid">
                
                {business.phone && <div className="detail"><span>Telefone</span><strong>{business.phone}</strong></div>}
                {business.show_email === true && business.email && <div className="detail"><span>E-mail</span><strong>{business.email}</strong></div>}
                {addressLine && <div className="detail"><span>Localização</span><strong>{addressLine}</strong></div>}
                {business.municipality && <div className="detail"><span>Município</span><strong>{business.municipality}</strong></div>}
                {business.neighborhood && <div className="detail"><span>Bairro</span><strong>{business.neighborhood}</strong></div>}
                {business.opening_hours && <div className="detail"><span>Horário</span><strong>{business.opening_hours}</strong></div>}
              </div>
              {!business.whatsapp && !business.phone && !business.email && !addressLine && !business.opening_hours && <p className="muted">O vendedor ainda não adicionou os contactos e a localização.</p>}
            </section>

            <section className="productsCard">
              <div className="productsHeading">
                <div><span className="eyebrow">GALERIA DO NEGÓCIO</span><h2>Produtos e imagens</h2><p>Consulta os produtos e escolhe a forma de visualização.</p></div>
              </div>
              <div className="modeChoices" role="group" aria-label="Modo de visualização dos produtos">
                {VIEW_MODES.map((mode) => <button key={mode} type="button" className={viewMode === mode ? 'modeButton active' : 'modeButton'} onClick={() => setViewMode(mode)} aria-pressed={viewMode === mode}>{MODE_LABELS[mode]}</button>)}
              </div>
              <ProductsView items={panelImages} mode={viewMode} editable={false} businessName={business.name} businessId={business.id} sellerId={business.owner_id} />
            </section>
            <p className="publicNotice">Este é o perfil público do negócio. As alterações só podem ser feitas pelo vendedor no seu painel.</p>
          </div>
        )}
      </main>
      <style jsx>{`
        .publicPage{min-height:100vh;background:#F5F7F6;color:#17211F;font-family:Arial,Helvetica,sans-serif;padding-bottom:42px}
        .topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px max(5%,calc((100% - 980px)/2));background:#fff;border-bottom:1px solid #E0E8E4}
        .brand{display:flex;align-items:center;gap:8px;text-decoration:none;color:#075B4E;font-size:17px;font-weight:900}
        .brandMark{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:#075B4E;color:#F0C84B}
        .backLink{color:#075B4E;text-decoration:none;font-size:12px;font-weight:800}
        .profileWrap{width:min(980px,calc(100% - 28px));margin:16px auto 0;display:grid;gap:13px}
        .identityCard,.detailsCard,.productsCard,.stateCard{overflow:hidden;border:1px solid #E1E8E4;border-radius:19px;background:#fff;box-shadow:0 8px 25px rgba(20,54,44,.045)}
        .cover{height:clamp(145px,22vw,240px);background:linear-gradient(135deg,#DCECE6,#F0F5F2)}
        .cover img{width:100%;height:100%;display:block;object-fit:cover}
        .coverFallback{height:100%;display:grid;place-items:center;padding:20px;text-align:center;color:#075B4E;font-size:clamp(20px,4vw,30px);font-weight:900}
        .identityBody{padding:0 18px 17px}
        .logo{width:78px;height:78px;margin-top:-39px;position:relative;display:grid;place-items:center;overflow:hidden;border:5px solid white;border-radius:50%;background:#E6F1EC;color:#075B4E;font-size:30px;font-weight:900;box-shadow:0 3px 12px rgba(0,0,0,.1)}
        .logo img{width:100%;height:100%;object-fit:cover}
        h1{font-size:clamp(22px,4vw,31px);line-height:1.2;margin:9px 0 7px;overflow-wrap:anywhere}
        .description{white-space:pre-wrap;color:#53635D;font-size:13px;line-height:1.55;margin:0 0 12px}
        .mainImages{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:12px 0}
        .mainImage{aspect-ratio:1/1;overflow:hidden;border-radius:12px;background:#EDF3F0}
        .mainImage img{display:block;width:100%;height:100%;object-fit:cover}
        .mainImage span{height:100%;display:grid;place-items:center;color:#8A9992;font-size:12px}
        .topActions{display:flex;gap:10px;margin-top:14px}
        .messageButton,.disabledMessage,.primaryButton{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:11px 17px;border-radius:11px;text-decoration:none;font-size:13px;font-weight:800}
        .messageButton,.primaryButton{background:#075B4E;color:#fff}
        .disabledMessage{background:#EDF1EF;color:#7A8983}
        .detailsCard,.productsCard{padding:18px}
        h2{font-size:20px;margin:0 0 15px}
        .detailsGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .detail{display:grid;gap:5px;min-width:0;padding:10px;border:1px solid #E6ECE9;border-radius:12px;background:#FAFCFB}
        .detail span{font-size:11px;color:#75847D;font-weight:700}
        .detail strong{font-size:13px;line-height:1.5;overflow-wrap:anywhere;font-weight:700}
        .muted{color:#73827B;font-size:13px}
        .productsHeading{display:flex;justify-content:space-between;gap:15px}
        .eyebrow{font-size:10px;letter-spacing:1.5px;color:#0B7563;font-weight:900}
        .productsHeading h2{margin:5px 0}
        .productsHeading p{margin:0 0 15px;color:#687770;font-size:12px;line-height:1.5}
        .modeChoices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:16px}
        .modeButton{padding:10px 8px;border:1px solid #DCE6E1;border-radius:10px;background:#F7FAF8;color:#3E5149;font-size:11px;font-weight:800;cursor:pointer}
        .modeButton.active{background:#F2EDF8;border-color:#7656A6;color:#7656A6;box-shadow:inset 0 0 0 1px #075B4E}
        .publicNotice{text-align:center;color:#7A8983;font-size:11px;line-height:1.6;margin:0}
        .stateCard{width:min(640px,calc(100% - 32px));box-sizing:border-box;margin:55px auto;padding:24px;line-height:1.6;color:#52635B}
        .stateCard h1{color:#17211F}
        .errorState{border-color:#F0D5D5}
        @media(max-width:600px){.topbar{padding:13px 15px}.profileWrap{width:calc(100% - 20px);margin-top:12px;gap:12px}.identityBody{padding:0 14px 16px}.logo{width:78px;height:78px;margin-top:-39px}.detailsCard,.productsCard{padding:16px}.detailsGrid{grid-template-columns:1fr}.mainImages{gap:5px}.modeChoices{gap:5px}.modeButton{font-size:10px;padding:10px 4px}.cover{height:165px}.stateCard{margin-top:25px}}
      `}</style>
    </>
  );
}
