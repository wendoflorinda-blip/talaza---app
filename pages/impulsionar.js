import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const COLORS = {
  green: '#08745F', greenDark: '#06483D', greenSoft: '#E8F6F1',
  purple: '#64358B', purpleDark: '#3F1D60', purpleSoft: '#F2EAF9',
  gold: '#D8A319', goldDark: '#5B4300', goldSoft: '#FFF5D6',
  ink: '#182722', muted: '#66736F', background: '#F7F6F3', line: '#E3E8E4', white: '#FFFFFF'
};
const PREMIUM_THEMES = {
  visibility: {
    background: 'linear-gradient(145deg, #061A40 0%, #123D78 48%, #8CCBFF 100%)',
    accent: '#FFFFFF',
    muted: 'rgba(255,255,255,.88)',
    button: '#FFFFFF',
    buttonText: '#092A59',
    shadow: '0 18px 38px rgba(7,35,83,.25)',
    icon: '◈'
  },
  reach: {
    background: 'linear-gradient(145deg, #8D1E1E 0%, #D93620 48%, #F2A900 100%)',
    accent: '#FFFFFF',
    muted: 'rgba(255,255,255,.92)',
    button: '#FFFFFF',
    buttonText: '#7D2117',
    shadow: '0 18px 38px rgba(157,48,20,.25)',
    icon: '✦'
  }
};
const HOSTING_THEMES = [
  { name: 'Essencial', icon: '◈', color: COLORS.green, dark: COLORS.greenDark, soft: COLORS.greenSoft, border: '#B8E0D2' },
  { name: 'Prestígio', icon: '✦', color: COLORS.purple, dark: COLORS.purpleDark, soft: COLORS.purpleSoft, border: '#D7C3EA' },
  { name: 'Elite', icon: '♛', color: COLORS.gold, dark: COLORS.goldDark, soft: COLORS.goldSoft, border: '#EBD58C' }
];
function priceOf(plan) {
  const value = plan.price ?? plan.price_kz ?? plan.amount ?? plan.valor;
  if (value === null || value === undefined || value === '') return 'Preço não definido';
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat('pt-AO', { maximumFractionDigits: 0 }).format(n) + ' Kz' : String(value);
}
function titleOf(plan, index) {
  return plan.name || plan.title || plan.plan_name || plan.nome || (plan.duration_days ? 'Hospedagem por ' + plan.duration_days + ' dias' : THEMES[index % 3].name);
}
function benefitsOf(plan) {
  const description = String(plan.description || '').trim();
  if (!description) return [];
  return description.split(/\n|;|\|/).map(item => item.replace(/^[-•✓✔\s]+/, '').trim()).filter(Boolean);
}
export default function Impulsionar() {
  const router = useRouter();
  const [business, setBusiness] = useState(null);
  const [girassolAccount, setGirassolAccount] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingRequest, setPendingRequest] = useState(null);
  const [promotions, setPromotions] = useState([]);
  useEffect(() => { if (router.isReady) loadData(); }, [router.isReady]);
  async function loadData() {
    setLoading(true); setError('');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) { router.replace('/login'); return; }
    const { data: businessData, error: businessError } = await supabase.from('businesses')
      .select('id, name, category_id, subcategory_id, country_id, province_id, is_active, approval_status')
      .eq('owner_id', session.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (businessError || !businessData) {
      console.error(businessError);
      setError(businessError ? 'Não foi possível carregar o seu negócio. Tente novamente.' : 'Não encontramos um negócio associado à sua conta.');
      setLoading(false); return;
    }
    setBusiness(businessData);
    const { data: girassolData, error: girassolError } = await supabase.from('girassol_accounts').select('business_id,unique_saved_count,unlocked_tier,access_status,reactivation_started_at,reactivation_amount').eq('business_id',businessData.id).maybeSingle();
    if (girassolError) console.error('Erro ao carregar progressos Girassol:',girassolError);
    setGirassolAccount(girassolData || null);
    const { data: promotionRows, error: promotionError } = await supabase.from('premium_promotions')
      .select('id, plan_id, status, description, created_at, starts_at, expires_at, media_type, media_url')
      .eq('business_id', businessData.id).order('created_at', { ascending: false });
    if (promotionError) console.error('Erro ao carregar histórico de impulsionamentos:', promotionError);
    setPromotions(promotionRows || []);
    const { data: pendingData, error: pendingError } = await supabase
      .from('payment_submissions')
      .select('id, plan_id, amount, created_at, status')
      .eq('business_id', businessData.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pendingError) console.error('Erro ao verificar pedido pendente:', pendingError);
    const latestStatus = String(pendingData?.status || '').toLowerCase();
    const lockedForVerification = Boolean(
      pendingData &&
      (latestStatus === 'pending' ||
        (latestStatus === 'approved' &&
          (!businessData.is_active || String(businessData.approval_status || '').toLowerCase() !== 'approved')))
    );
    setPendingRequest(lockedForVerification ? pendingData : null);
    const { data, error: plansError } = await supabase.from('plans').select('*');
    if (plansError) {
      console.error(plansError); setError('Não foi possível carregar os planos. Verifique as permissões da tabela plans.'); setLoading(false); return;
    }
    setPlans(data || []); setLoading(false);
  }
  const premiumPlans = useMemo(() => plans.filter(plan =>
    String(plan.plan_type || '').trim().toLocaleLowerCase('pt-AO') === 'destaque premium' &&
    plan.is_active !== false
  ).sort((a,b) => Number(a.duration_days || 0) - Number(b.duration_days || 0)), [plans]);
  const hostingPlans = useMemo(() => {
    if (!business) return [];
    return plans.filter(plan => {
      const type = String(plan.plan_type || plan.type || '').trim().toLocaleLowerCase('pt-AO');
      const categoryMatches = !plan.category_id || String(plan.category_id) === String(business.category_id);
      const subcategoryMatches = !plan.subcategory_id || String(plan.subcategory_id) === String(business.subcategory_id);
      const enabled = plan.is_active !== false && plan.active !== false && plan.enabled !== false;
      return type === 'hospedagem' && categoryMatches && subcategoryMatches && enabled;
    }).sort((a,b) => Number(a.duration_days || 0) - Number(b.duration_days || 0));
  }, [plans, business]);
  if (loading) return <main style={S.center}>A carregar os planos da sua categoria…</main>;
  return <main style={S.page}>
    <header style={S.header}><div style={S.headerInner}>
      <div><div style={S.brand}>TALAZA</div><div style={S.headerTitle}>Impulsionar</div></div>
      <Link href={{ pathname: '/seller', query: { country: business?.country_id, province: business?.province_id } }} style={S.back}>← Painel</Link>
    </div></header>
    <div style={S.content}>
      {error && <div role="alert" style={S.error}>{error}</div>}
      {business && <>
        <section style={S.hero}>
          <span style={S.eyebrow}>O SEU NEGÓCIO</span>
          <h1 style={S.heroTitle}>Dê mais alcance ao seu negócio</h1>
          <p style={S.heroText}>Escolha um Destaque Premium para promover uma publicação do negócio <strong>{business.name}</strong>. A publicação só entra nas vitrines após a confirmação do pagamento.</p>
          <span style={S.status}>Estado do perfil: {business.is_active ? 'Ativo' : 'A aguardar ativação'}{business.approval_status ? ' · ' + business.approval_status : ''}</span>
        </section>
        <section style={{marginTop:25}}>
          <div style={{marginBottom:16}}>
            <span style={{...S.eyebrow,color:COLORS.gold}}>REDE DE PARCERIAS</span>
            <h2 style={{fontSize:25,margin:'8px 0',color:COLORS.ink}}>Planos Girassol</h2>
            <p style={{color:COLORS.muted,fontSize:14,lineHeight:1.7,maxWidth:780}}>Os níveis Girassol são conquistas do seu negócio, alcançadas através de Guardados únicos. Ao atingir cada meta, desbloqueia o acesso à Rede de Parcerias e à Entrega Interprovincial. Não são compras de impulsionamento: o progresso é contado automaticamente pela Talaza.</p>
          </div>
          <div style={S.grid}>
            <article style={{...S.card,borderColor:'#EBD58C',background:'linear-gradient(145deg,#FFF9E8,#F8EAC1)'}}>
              <div style={{...S.icon,background:'#D8A319',color:'#fff'}}>✿</div><div style={{...S.tag,color:'#705000',background:'rgba(255,255,255,.75)'}}>PRIMEIRO NÍVEL</div>
              <h3 style={{...S.cardTitle,color:'#5B4300'}}>Girassol</h3><div style={{...S.price,color:'#5B4300'}}>5.000 Guardados únicos</div>
              <p style={{fontSize:13,lineHeight:1.65,color:'#66552C'}}>Desbloqueia a presença na lista de vendedores disponíveis para parceria e a possibilidade de publicar entregas interprovinciais em até 3 províncias por publicação.</p>
              <div style={{height:9,borderRadius:99,background:'rgba(91,67,0,.12)',overflow:'hidden'}}><div style={{height:'100%',width:Math.min(100,(Number(girassolAccount?.unique_saved_count||0)/5000)*100)+'%',background:'#D8A319'}}/></div>
              <p style={{fontSize:12,color:'#66552C'}}>{Number(girassolAccount?.unique_saved_count||0).toLocaleString('pt-AO')} / 5.000 Guardados únicos</p>
              {girassolAccount?.unlocked_tier && <strong style={{fontSize:12,color:'#5B4300'}}>Conquista desbloqueada</strong>}
            </article>
            <article style={{...S.card,borderColor:'#CFC2E5',background:'linear-gradient(145deg,#F7F2FC,#E8DDF4)'}}>
              <div style={{...S.icon,background:COLORS.purple,color:'#fff'}}>✧</div><div style={{...S.tag,color:COLORS.purpleDark,background:'rgba(255,255,255,.75)'}}>NÍVEL AVANÇADO</div>
              <h3 style={{...S.cardTitle,color:COLORS.purpleDark}}>Girassol Pró</h3><div style={{...S.price,color:COLORS.purpleDark}}>1.000.000 Guardados únicos</div>
              <p style={{fontSize:13,lineHeight:1.65,color:'#59476D'}}>Eleva o seu acesso à Rede de Parcerias e permite publicar entregas interprovinciais em até 10 províncias por publicação. O total de Guardados continua a acumular depois do primeiro nível.</p>
              <div style={{height:9,borderRadius:99,background:'rgba(63,29,96,.12)',overflow:'hidden'}}><div style={{height:'100%',width:Math.min(100,(Number(girassolAccount?.unique_saved_count||0)/1000000)*100)+'%',background:COLORS.purple}}/></div>
              <p style={{fontSize:12,color:'#59476D'}}>{Number(girassolAccount?.unique_saved_count||0).toLocaleString('pt-AO')} / 1.000.000 Guardados únicos</p>
              {girassolAccount?.unlocked_tier==='girassol_pro' && <strong style={{fontSize:12,color:COLORS.purpleDark}}>Conquista desbloqueada</strong>}
            </article>
          </div>
          {girassolAccount?.access_status==='suspended' && <div style={{marginTop:14,padding:15,borderRadius:14,background:'#FFF5D6',color:'#6A4D00',lineHeight:1.65,fontSize:13}}>O seu nível Girassol permanece conquistado, mas o acesso está suspenso por falta de hospedagem activa. Reactivação actual: <strong>{Number(girassolAccount.reactivation_amount||12000).toLocaleString('pt-AO')} Kz</strong>. O valor duplica a cada 365 dias completos desde o início da suspensão. A reactivação não substitui a hospedagem normal.</div>}
        </section>
        <section style={{ marginTop:25 }}>
          <div style={{ marginBottom:16 }}>
            <span style={{ ...S.eyebrow, color:COLORS.purple }}>DESTAQUES PREMIUM</span>
            <h2 style={{ fontSize:25, margin:'8px 0', color:COLORS.ink }}>Escolha como quer aparecer na Talaza</h2>
            <p style={{ color:COLORS.muted, fontSize:13, lineHeight:1.65, maxWidth:760 }}>Escolha o plano, carregue uma imagem ou vídeo, escreva a descrição e envie o comprovativo. O prazo começa apenas depois da aprovação do pagamento.</p>
          </div>
          {premiumPlans.length === 0 ? <section style={S.empty}><h3>Planos Premium em preparação</h3><p>Os planos de destaque ainda não estão disponíveis.</p></section> :
            <section style={S.grid}>{premiumPlans.map((plan,index)=>{
              const maximum = Number(plan.duration_days) === 30;
              const theme = maximum ? PREMIUM_THEMES.reach : PREMIUM_THEMES.visibility;
              const benefits = benefitsOf(plan);
              return <article key={plan.id} style={{ ...S.card, borderColor:'rgba(255,255,255,.42)', background:theme.background, color:theme.accent, boxShadow:theme.shadow }}>
                <div style={{ ...S.icon, background:'rgba(255,255,255,.18)', color:'#fff', border:'1px solid rgba(255,255,255,.34)', boxShadow:'0 8px 22px rgba(0,0,0,.15)' }}>{theme.icon}</div>
                <div style={{ ...S.tag, color:'#fff', background:'rgba(5,17,39,.28)', border:'1px solid rgba(255,255,255,.28)' }}>DESTAQUE PREMIUM · {maximum?'30 DIAS':'15 DIAS'}</div>
                <h3 style={{ ...S.cardTitle, color:'#fff', textShadow:'0 2px 8px rgba(0,0,0,.22)' }}>{titleOf(plan,index)}</h3>
                <div style={{ ...S.price, color:'#fff', textShadow:'0 2px 10px rgba(0,0,0,.25)' }}>{priceOf(plan)}</div>
                <div style={{...S.duration,color:theme.muted}}>◷ {plan.duration_days} dias de promoção após aprovação</div>
                <div style={{...S.benefitTitle,color:'#fff'}}>O que este destaque oferece</div>
                {benefits.length ? <ul style={S.benefits}>{benefits.map((benefit,i)=><li key={i} style={{display:'flex',gap:10,alignItems:'flex-start',fontSize:13,lineHeight:1.6,color:'#fff',textShadow:'0 1px 4px rgba(0,0,0,.18)'}}><span style={{...S.check,background:'rgba(255,255,255,.22)',border:'1px solid rgba(255,255,255,.48)'}}>✓</span><span>{benefit}</span></li>)}</ul> : <p style={{...S.noBenefits,color:theme.muted}}>{plan.area}</p>}
                <button type="button" onClick={()=>router.push({pathname:'/criar-impulsionamento',query:{plan:plan.id}})} style={{...S.cta,background:theme.button,color:theme.buttonText,boxShadow:'0 8px 20px rgba(0,0,0,.16)'}}>Escolher este destaque <span>→</span></button>
              </article>;
            })}</section>}
        </section>
        <section style={{ marginTop:32 }}>
          <h2 style={{ fontSize:21, color:COLORS.ink }}>As minhas publicações impulsionadas</h2>
          {promotions.length===0 ? <div style={S.empty}><p>Ainda não tem publicações impulsionadas. Quando criar uma, poderá acompanhar aqui o estado do pedido e o período de promoção.</p></div> :
            <div style={{ display:'grid', gap:12, marginTop:14 }}>{promotions.map(item=><article key={item.id} style={{display:'flex',gap:14,alignItems:'center',padding:14,background:'#fff',border:'1px solid '+COLORS.line,borderRadius:15}}>
              {item.media_type==='video' ? <video src={item.media_url} muted style={{width:82,height:82,objectFit:'cover',borderRadius:10}}/> : <img src={item.media_url} alt="" style={{width:82,height:82,objectFit:'cover',borderRadius:10}}/>}
              <div style={{minWidth:0,flex:1}}><strong style={{display:'block',color:COLORS.ink}}>{item.description}</strong><span style={{fontSize:12,color:COLORS.muted}}>Estado: {item.status==='active' && item.expires_at && new Date(item.expires_at).getTime()<=Date.now() ? 'Expirada' : ({pending_payment:'A aguardar comprovativo',pending:'Em análise',active:'Ativa',rejected:'Recusada',expired:'Expirada',cancelled:'Cancelada'})[item.status] || item.status}</span>{item.expires_at && <div style={{fontSize:11,color:COLORS.muted}}>Termina em {new Date(item.expires_at).toLocaleDateString('pt-AO')}</div>}</div>
            </article>)}</div>}
        </section>
        <div style={{ marginTop:36, borderTop:'1px solid '+COLORS.line, paddingTop:25 }}>
          <h2 style={{fontSize:20,color:COLORS.ink}}>Hospedagem da Vitrine</h2>
          <p style={{fontSize:13,color:COLORS.muted}}>Os planos de hospedagem do seu negócio continuam disponíveis aqui, separados dos Destaques Premium.</p>
        </div>
        {pendingRequest ? <section style={S.empty}><div style={S.emptyIcon}>✓</div><h2>Pagamento em verificação</h2><p>Já recebemos o comprovativo deste negócio. O plano escolhido está em verificação para ativação. Não é possível escolher outro plano até a equipa Talaza concluir a análise.</p><Link href={{ pathname: '/seller', query: { country: business.country_id, province: business.province_id } }} style={S.back}>Voltar ao painel</Link></section> : hostingPlans.length === 0 ? <section style={S.empty}><div style={S.emptyIcon}>♧</div><h2>Planos em preparação</h2><p>Não encontramos planos de hospedagem registados para esta categoria. Não vamos mostrar preços de outras categorias nem inventar valores.</p></section> :
        <section style={S.grid}>{hostingPlans.map((plan, index) => {
          const theme = HOSTING_THEMES[index % HOSTING_THEMES.length];
          const benefits = benefitsOf(plan);
          return <article key={plan.id} style={{ ...S.card, borderColor: theme.border, background: theme.soft }}>
            <div style={{ ...S.icon, background: theme.color, color: '#fff' }}>{theme.icon}</div>
            <div style={{ ...S.tag, color: theme.dark, background: 'rgba(255,255,255,.72)' }}>HOSPEDAGEM TALAZA</div>
            <h2 style={{ ...S.cardTitle, color: theme.dark }}>{titleOf(plan,index)}</h2>
            <div style={{ ...S.price, color: theme.dark }}>{priceOf(plan)}</div>
            <div style={S.duration}><span>◷</span> {plan.duration_days ? plan.duration_days + ' dias de hospedagem' : 'Duração conforme o plano'}</div>
            <div style={S.benefitTitle}>O que está incluído</div>
            {benefits.length ? <ul style={S.benefits}>{benefits.map((benefit,i)=><li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.55, color: COLORS.ink }}><span style={{ ...S.check, background: theme.color }}>✓</span><span>{benefit}</span></li>)}</ul> : <p style={S.noBenefits}>Consulte as condições deste plano antes de efetuar o pagamento.</p>}
            <button type="button" onClick={() => {
              const planName = titleOf(plan, index);
              const confirmed = window.confirm('Pretende escolher o plano "' + planName + '" para o seu negócio? Se continuar, irá para a página de pagamento por Multicaixa Express.');
              if (confirmed) router.push({ pathname: '/Pagamento', query: { plan: plan.id, business: business.id } });
            }} style={{ ...S.cta, background: theme.color }}>Escolher este plano <span>→</span></button>
            <p style={S.footnote}>O perfil será ativado após a validação do pagamento e os requisitos de aprovação aplicáveis.</p>
          </article>;
        })}</section>}
 
      </>}
    </div>
  </main>;
}
const S = {
 page:{minHeight:'100vh',background:COLORS.background,color:COLORS.ink,paddingBottom:50},
 center:{minHeight:'100vh',display:'grid',placeItems:'center',background:COLORS.background,color:COLORS.green,fontWeight:800,padding:24},
 header:{background:COLORS.greenDark,color:'#fff',padding:'17px 20px'},
 headerInner:{maxWidth:1080,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',gap:14},
 brand:{fontSize:11,letterSpacing:2.5,color:COLORS.gold,fontWeight:900},
 headerTitle:{fontSize:18,fontWeight:800,marginTop:5},
 back:{color:'#fff',textDecoration:'none',fontWeight:800,fontSize:12,border:'1px solid rgba(255,255,255,.3)',padding:'10px 13px',borderRadius:11},
 content:{maxWidth:1080,margin:'0 auto',padding:'26px 18px'},
 hero:{padding:'28px',borderRadius:24,background:'linear-gradient(125deg,#06483D,#08745F 58%,#64358B)',color:'#fff',boxShadow:'0 18px 44px rgba(6,72,61,.14)'},
 eyebrow:{fontSize:11,letterSpacing:2,color:'#F4D36B',fontWeight:900},
 heroTitle:{fontSize:'clamp(27px,5vw,39px)',lineHeight:1.12,margin:'12px 0'},
 heroText:{maxWidth:760,lineHeight:1.7,fontSize:14,color:'rgba(255,255,255,.88)',margin:0},
 status:{display:'inline-block',marginTop:17,padding:'7px 11px',borderRadius:999,background:'rgba(255,255,255,.14)',fontSize:11,fontWeight:800},
 grid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,285px),1fr))',gap:19,marginTop:25,alignItems:'stretch'},
 card:{position:'relative',display:'flex',flexDirection:'column',padding:23,border:'1px solid',borderRadius:23,boxShadow:'0 12px 32px rgba(30,40,35,.06)',minWidth:0},
 icon:{width:52,height:52,borderRadius:17,display:'grid',placeItems:'center',fontSize:27,fontWeight:900,boxShadow:'0 8px 18px rgba(0,0,0,.12)'},
 tag:{alignSelf:'flex-start',marginTop:16,borderRadius:999,padding:'7px 10px',fontSize:10,fontWeight:900,letterSpacing:1},
 cardTitle:{fontSize:22,lineHeight:1.2,margin:'15px 0 8px',overflowWrap:'anywhere'},
 price:{fontSize:30,fontWeight:900,letterSpacing:-.7,marginTop:5},
 duration:{display:'flex',gap:8,alignItems:'center',marginTop:7,color:COLORS.muted,fontSize:12,fontWeight:800},
 benefitTitle:{fontSize:12,fontWeight:900,textTransform:'uppercase',letterSpacing:.8,marginTop:23,color:COLORS.ink},
 benefits:{listStyle:'none',margin:'13px 0 22px',padding:0,display:'grid',gap:11},
 check:{display:'grid',placeItems:'center',flex:'0 0 21px',width:21,height:21,borderRadius:'50%',color:'#fff',fontSize:12,fontWeight:900},
 cta:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,width:'100%',marginTop:'auto',padding:'14px 16px',border:0,borderRadius:13,color:'#fff',fontSize:14,fontWeight:900,cursor:'pointer',boxShadow:'0 7px 15px rgba(0,0,0,.10)'},
 footnote:{fontSize:10,lineHeight:1.5,color:COLORS.muted,margin:'12px 0 0'},
 empty:{marginTop:25,padding:28,border:'1px dashed #C8D4CE',borderRadius:20,background:'#fff',textAlign:'center'},
 emptyIcon:{fontSize:30,color:COLORS.purple},
 info:{display:'flex',gap:13,alignItems:'flex-start',marginTop:22,padding:17,border:'1px solid #E2D8EE',borderRadius:15,background:COLORS.purpleSoft,color:COLORS.purpleDark,fontSize:12,lineHeight:1.6},
 infoIcon:{fontSize:20,fontWeight:900},
 error:{padding:14,marginBottom:16,borderRadius:12,background:'#FFF0EE',color:'#9C3027',lineHeight:1.5},
 noBenefits:{fontSize:12,lineHeight:1.6,color:COLORS.muted,margin:'13px 0 22px'}
};
S.benefits = { ...S.benefits };
