import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Copy, ShoppingCart, MessageCircle, ChevronRight, Phone, MapPin, Building2, Home, Clock, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

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
  const [isSavedGraceProfile, setIsSavedGraceProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyToast, setCopyToast] = useState('');
  
  useEffect(() => {
    if (!router.isReady || !id) return;
    let cancelled = false;

    async function loadProfile() {
      setIsSavedGraceProfile(false);
      setLoading(true);
      setError('');
      try {
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('id, owner_id, name, description, country_id, province_id, municipality, neighborhood, address, phone, whatsapp, email, opening_hours, logo_url, cover_url, is_active, approval_status, panel_view_mode')
          .eq('id', id)
          .eq('approval_status', 'approved')
          .maybeSingle();

        if (businessError) throw businessError;
        if (!businessData) throw new Error('Este negócio não está disponível publicamente.');
        const { data: hostingRows, error: hostingError } = await supabase.from('business_subscriptions')
          .select('id,status,starts_at,expires_at,created_at')
          .eq('business_id',businessData.id)
          .order('starts_at',{ascending:false}).order('created_at',{ascending:false}).limit(1);
        if (!hostingError) {
          const currentSub=hostingRows?.[0];
          const expiry=currentSub?.expires_at ? new Date(currentSub.expires_at) : null;
          businessData.is_active=Boolean(businessData.is_active && currentSub && String(currentSub.status || '').trim().toLowerCase()==='active' && expiry && !Number.isNaN(expiry.getTime()) && expiry.getTime()>Date.now());
        } else {
          businessData.is_active=false;
        }
        if (!businessData.is_active) {
          const { data: { user: viewer } } = await supabase.auth.getUser();
          if (!viewer) throw new Error('A hospedagem deste negócio expirou. Entre na sua conta e consulte os seus Guardados durante o período de tolerância.');
          const isOwner = String(businessData.owner_id) === String(viewer.id);
          const { data: savedRow, error: savedError } = isOwner
            ? { data:{id:'owner'}, error:null }
            : await supabase.from('saved_businesses').select('id')
                .eq('business_id', businessData.id).eq('user_id', viewer.id).maybeSingle();
          if (savedError || !savedRow) throw new Error('Este negócio está temporariamente inativo e só pode ser consultado pelos exploradores que já o guardaram.');
          setIsSavedGraceProfile(!isOwner);
        }

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
    if (typeof requestedReturn === 'string' && requestedReturn.startsWith('/') && !requestedReturn.startsWith('//') && !requestedReturn.includes('\\')) return requestedReturn;
    const params = new URLSearchParams();
    if (country || business?.country_id) params.set('country', country || business.country_id);
    if (province || business?.province_id) params.set('province', province || business.province_id);
    return '/explore' + (params.toString() ? '?' + params.toString() : '');
  }, [router.query.returnTo, country, province, business]);

  const backLabel = backHref.startsWith('/perfil') ? 'Voltar aos guardados' : backHref.startsWith('/subcategory?') ? 'Voltar à subcategoria' : backHref.startsWith('/category?') ? 'Voltar às subcategorias' : 'Voltar à Vitrine';

  const contactNumber = business?.phone;
  const messageHref = business?.owner_id && business?.is_active ? '/mensagens?to=' + encodeURIComponent(business.owner_id) + '&source=Vitrine&sourceId=' + encodeURIComponent(business.id) + '&returnTo=' + encodeURIComponent(backHref) : null;
  const addressParts = [business?.address, business?.neighborhood].map(clean).filter(Boolean);
  const addressLine = addressParts.join(', ');

  async function copyContact(value) {
    const text = clean(value);
    if (!text || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setCopyToast('Não foi possível copiar. Tente novamente.');
      window.setTimeout(() => setCopyToast(''), 2600);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopyToast('Copiado com sucesso!');
    } catch {
      setCopyToast('Não foi possível copiar. Tente novamente.');
    }
    window.setTimeout(() => setCopyToast(''), 2600);
  }

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
                {isSavedGraceProfile && <div role="status" style={{display:'inline-flex',marginTop:8,padding:'7px 11px',borderRadius:999,background:'#FFF1C2',color:'#6B4A00',fontSize:12,fontWeight:800}}>Perfil inativo temporariamente · hospedagem expirada</div>}
                <div className="mainImages">
                  {[0, 1, 2].map((slot) => {
                    const image = mainImages.find((item) => item.slot === slot) || mainImages[slot];
                    return <div className="mainImage" key={slot}>{image?.image_url ? <img src={image.image_url} alt={image.name || ('Imagem principal ' + (slot + 1))} /> : <span>Imagem {slot + 1}</span>}</div>;
                  })}
                </div>
                {business.description && <p className="description">{business.description}</p>}
              </div>
            </section>

            {/* Botões soltos fora do cartão branco do perfil */}
            <div
              className="w-full px-4 mt-5 mb-2 flex gap-3"
              style={{width:'100%',padding:'0 16px',marginTop:'20px',marginBottom:'8px',display:'flex',gap:'12px',boxSizing:'border-box'}}
            >
              <Link
                href={{pathname:'/businesses/' + business.id + '/products',query:{country:business.country_id,province:business.province_id,returnTo:router.asPath}}}
                style={{
                  background:'linear-gradient(90deg, #FFD700 0%, #B8860B 100%)',
                  color:'#000',
                  height:'54px',
                  minHeight:'54px',
                  padding:'0 22px',
                  fontSize:'16px',
                  fontWeight:'700',
                  borderRadius:'9999px',
                  flex:'1',
                  minWidth:0,
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'space-between',
                  textDecoration:'none',
                  boxSizing:'border-box',
                }}
              >
                <span style={{display:'flex',alignItems:'center',gap:'8px',whiteSpace:'nowrap'}}>🛒 Produtos</span>
                <span style={{fontSize:'20px'}}>›</span>
              </Link>

              {messageHref ? (
                <Link
                  href={messageHref}
                  style={{
                    background:'#0a0a0a',
                    border:'1.5px solid #FFD700',
                    color:'#fff',
                    height:'54px',
                    minHeight:'54px',
                    padding:'0 22px',
                    fontSize:'16px',
                    fontWeight:'700',
                    borderRadius:'9999px',
                    flex:'1',
                    minWidth:0,
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'space-between',
                    textDecoration:'none',
                    boxSizing:'border-box',
                  }}
                >
                  <span style={{display:'flex',alignItems:'center',gap:'8px',whiteSpace:'nowrap'}}>💬 Enviar Mensagem</span>
                  <span style={{fontSize:'20px'}}>›</span>
                </Link>
              ) : (
                <span
                  style={{
                    background:'#0a0a0a',
                    border:'1.5px solid #FFD700',
                    color:'#fff',
                    height:'54px',
                    minHeight:'54px',
                    padding:'0 22px',
                    fontSize:'16px',
                    fontWeight:'700',
                    borderRadius:'9999px',
                    flex:'1',
                    minWidth:0,
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    boxSizing:'border-box',
                  }}
                >Mensagem interna indisponível</span>
              )}
            </div>

            <section className="detailsCard">
              <h2>Contactos e localização</h2>
              <div className="detailsGrid">
                {business.phone && <div className="detail"><span className="detailIcon"><Phone size={18} color="#6B7280" /></span><div><span>Telefone</span><strong>{business.phone}</strong></div><button type="button" className="copyButton" aria-label="Copiar telefone" onClick={() => copyContact(business.phone)}><Copy size={19} /></button></div>}
                {business.show_email === true && business.email && <div className="detail"><span className="detailIcon"><Mail size={18} color="#6B7280" /></span><div><span>E-mail</span><strong>{business.email}</strong></div><button type="button" className="copyButton" aria-label="Copiar e-mail" onClick={() => copyContact(business.email)}><Copy size={19} /></button></div>}
                {addressLine && <div className="detail"><span className="detailIcon"><MapPin size={18} color="#6B7280" /></span><div><span>Localização</span><strong>{addressLine}</strong></div><button type="button" className="copyButton" aria-label="Copiar localização" onClick={() => copyContact(addressLine)}><Copy size={19} /></button></div>}
                {business.municipality && <div className="detail"><span className="detailIcon"><Building2 size={18} color="#6B7280" /></span><div><span>Município</span><strong>{business.municipality}</strong></div><button type="button" className="copyButton" aria-label="Copiar município" onClick={() => copyContact(business.municipality)}><Copy size={19} /></button></div>}
                {business.neighborhood && <div className="detail"><span className="detailIcon"><Home size={18} color="#6B7280" /></span><div><span>Bairro</span><strong>{business.neighborhood}</strong></div><button type="button" className="copyButton" aria-label="Copiar bairro" onClick={() => copyContact(business.neighborhood)}><Copy size={19} /></button></div>}
                {business.opening_hours && <div className="detail"><span className="detailIcon"><Clock size={18} color="#6B7280" /></span><div><span>Horário</span><strong>{business.opening_hours}</strong></div><button type="button" className="copyButton" aria-label="Copiar horário" onClick={() => copyContact(business.opening_hours)}><Copy size={19} /></button></div>}
              </div>
              {!business.whatsapp && !business.phone && !business.email && !addressLine && !business.opening_hours && <p className="muted">O vendedor ainda não adicionou os contactos e a localização.</p>}
            </section>
            {copyToast && <div className="copyToast" role="status" aria-live="polite">{copyToast}</div>}

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
        .profileWrap{width:min(920px,calc(100% - 28px));margin:16px auto 0;display:grid;gap:13px}
        .identityCard,.detailsCard,.productsCard,.stateCard{overflow:hidden;border:1px solid #E1E8E4;border-radius:19px;background:#fff;box-shadow:0 8px 25px rgba(20,54,44,.045)}
        .cover{height:clamp(145px,22vw,240px);background:linear-gradient(135deg,#DCECE6,#F0F5F2)}
        .cover img{width:100%;height:100%;display:block;object-fit:cover}
        .coverFallback{height:100%;display:grid;place-items:center;padding:20px;text-align:center;color:#075B4E;font-size:clamp(20px,4vw,30px);font-weight:900}
        .identityBody{padding:0 18px 17px}
        .logo{width:78px;height:78px;margin-top:-39px;position:relative;display:grid;place-items:center;overflow:hidden;border:5px solid white;border-radius:50%;background:#E6F1EC;color:#075B4E;font-size:30px;font-weight:900;box-shadow:0 3px 12px rgba(0,0,0,.1)}
        .logo img{width:100%;height:100%;object-fit:cover}
        h1{font-size:clamp(22px,4vw,31px);line-height:1.2;margin:9px 0 7px;overflow-wrap:anywhere}
        .description{white-space:pre-wrap;color:#53635D;font-size:13px;line-height:1.55;margin:0 0 12px}
        .mainImages{flex:1;min-width:0;width:auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0}
        .mainImage{aspect-ratio:1/1;max-height:180px;overflow:hidden;border-radius:13px;background:#EDF3F0;box-shadow:0 3px 12px rgba(20,54,44,.07)}
        .mainImage img{display:block;width:100%;height:100%;object-fit:cover}
        .mainImage span{height:100%;display:grid;place-items:center;color:#8A9992;font-size:12px}
        .profileActionPills{display:flex;gap:12px;width:100%;margin:16px 0 0;padding:0 16px;box-sizing:border-box}
        .profileActionButton{flex:1 1 0;min-width:160px;min-height:52px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:16px 24px;border-radius:999px;text-decoration:none!important;font-size:16px;font-weight:700;box-sizing:border-box;transition:transform .15s ease}
        .profileActionButton:active{transform:scale(.97)}
        .profileActionLabel{display:inline-flex;align-items:center;gap:9px;min-width:0;white-space:nowrap}
        .profileActionButton.disabledMessage{background:#EDF1EF!important;color:#7A8983!important;border:1px solid #DCE5E0}
        .copyButton{width:39px;height:39px;flex:0 0 39px;display:grid;place-items:center;border:0;border-radius:50%;background:transparent;color:#B8860B;cursor:pointer}
        .copyButton:hover{background:#FFF7D6;color:#8B6500}
        .copyToast{position:fixed;z-index:1000;left:50%;bottom:26px;transform:translateX(-50%);padding:12px 18px;border-radius:999px;background:#0A0A0A;color:#fff;border:1px solid #D5A900;box-shadow:0 8px 24px rgba(0,0,0,.22);font-size:13px;font-weight:800;white-space:nowrap}
        .detailsCard{padding:20px;background:#FFFFFF}
        h2{font-size:20px;margin:0 0 15px}
        .detailsGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
        .detail{display:flex;align-items:center;gap:12px;min-width:0;padding:13px 14px;border:1px solid #E5E7EB;border-radius:16px;background:#FFFFFF}
        .detail>div{display:grid;gap:4px;min-width:0;flex:1}
        .detailIcon{width:38px;height:38px;flex:0 0 38px;display:grid;place-items:center;border-radius:50%;background:#F3F4F6;color:#6B7280}
        .detail span{font-size:10px;letter-spacing:.45px;text-transform:uppercase;color:#718078;font-weight:850}
        .detail strong{font-size:13px;line-height:1.45;overflow-wrap:anywhere;font-weight:750;color:#20332B}
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
        @media(max-width:600px){.profileActionPills{gap:8px;padding:0 4px}.profileActionButton{flex:1 1 160px;min-width:160px;padding:14px 16px;font-size:14px;min-height:52px}.profileActionLabel{gap:6px}.topbar{padding:13px 15px}.profileWrap{width:calc(100% - 20px);margin-top:12px;gap:12px}.identityBody{padding:0 14px 16px}.logo{width:78px;height:78px;margin-top:-39px}.detailsCard,.productsCard{padding:16px}.detailsGrid{grid-template-columns:1fr}.mainImages{gap:5px}.modeChoices{gap:5px}.modeButton{font-size:10px;padding:10px 4px}.cover{height:165px}.stateCard{margin-top:25px}}
      `}</style>
    </>
  );
}
