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
  const [activeTab, setActiveTab] = useState('girassol');
  const [premiumPlanChoice, setPremiumPlanChoice] = useState('');
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
  const selectedPremiumPlan = premiumPlans.find(plan => String(plan.id) === String(premiumPlanChoice)) || premiumPlans[0] || null;
  return <main style={S.page}>
    <header style={S.header}><div style={S.headerInner}>
      <div><div style={S.brand}>TALAZA</div><div style={S.headerTitle}>Planos</div></div>
      <Link href={{ pathname: '/seller', query: { country: business?.country_id, province: business?.province_id } }} style={S.back}>← Painel</Link>
    </div></header>
    <div style={S.content}>
      {error && <div role="alert" style={S.error}>{error}</div>}
      {business && <>
        <section style={{marginBottom:22}}>
          <span style={{...S.eyebrow,color:'#8B6A4A'}}>PLANOS DO SEU NEGÓCIO</span>
          <h1 style={{fontSize:'clamp(27px,5vw,36px)',lineHeight:1.15,margin:'9px 0 7px',color:'#0A3D2A'}}>Escolha como quer crescer na Talaza</h1>
          <p style={{margin:0,color:'#6B5747',fontSize:14,lineHeight:1.7}}>Consulte os serviços disponíveis para manter o seu negócio visível, conquistar benefícios permanentes e aumentar o alcance das suas publicações.</p>
          <p style={{margin:'8px 0 0',fontSize:12,color:'#75675B'}}>Negócio: <strong>{business.name}</strong></p>
        </section>
        <nav aria-label="Categorias de planos" style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8,marginBottom:20}}>
          {[
            ['hospedagem','Hospedagem'],
            ['girassol','Girassol'],
            ['premium','Destaque Premium']
          ].map(([key,label])=><button key={key} type="button" onClick={()=>setActiveTab(key)} aria-pressed={activeTab===key} style={{minWidth:0,padding:'12px 8px',borderRadius:13,border:activeTab===key?'2px solid #D4AF37':'1px solid #DED8CE',background:activeTab===key?'#0A3D2A':'#F0EDE8',color:activeTab===key?'#FFFFFF':'#0A3D2A',fontWeight:900,fontSize:12,cursor:'pointer',boxShadow:activeTab===key?'0 4px 12px rgba(10,61,42,.14)':'none'}}>{label}</button>)}
        </nav>

        {activeTab === 'hospedagem' && <article style={S.planMainCard}>
          <div style={S.planIcon}>🏡</div>
          <div style={S.planBadge}>SERVIÇO BASE</div>
          <h2 style={S.planTitle}>Hospedagem</h2>
          <h3 style={S.planSubtitle}>O teu negócio sempre visível na Talaza</h3>
          <p style={S.planDescription}>Ao ativar a Hospedagem, o teu perfil fica hospedado na Vitrine da Talaza e os clientes conseguem encontrar-te, guardar o teu perfil e falar contigo a qualquer hora. É a base para cresceres e desbloqueares os outros níveis.</p>
          <div style={S.planBenefitHeading}>Benefícios incluídos</div>
          <ul style={S.planBenefits}>
            {[
              'Perfil de negócio hospedado na Vitrine da Talaza',
              'Aparecer nas pesquisas por categoria e província',
              'Clientes podem guardar o teu perfil',
              'Receber pedidos e mensagens',
              'Pagamento seguro com Multicaixa Express'
            ].map((item,i)=><li key={i} style={{display:'flex',alignItems:'flex-start',gap:11,fontSize:14,lineHeight:1.6,color:'#604B3C'}}><span style={S.planCheck}>✓</span><span>{item}</span></li>)}
          </ul>
          {pendingRequest ? <div style={S.planNotice}><strong>Pagamento em verificação</strong><p>Já recebemos o comprovativo deste negócio. O plano escolhido está em verificação para ativação. Não é possível escolher outro plano até a equipa Talaza concluir a análise.</p></div> :
            hostingPlans.length===0 ? <div style={S.planNotice}><strong>Planos de hospedagem em preparação</strong><p>Não encontramos planos registados para a categoria deste negócio. Os preços e períodos só serão apresentados quando estiverem configurados na Talaza.</p></div> :
            <div style={{marginTop:18,display:'grid',gap:10}}>
              <div style={S.planBenefitHeading}>Escolhe o período de hospedagem</div>
              {hostingPlans.map((plan,index)=>{
                const theme=HOSTING_THEMES[index%HOSTING_THEMES.length];
                return <div key={plan.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',padding:'13px 14px',borderRadius:14,background:'rgba(255,255,255,.66)',border:'1px solid #DDCDBB'}}>
                  <div><strong style={{color:'#6E3038'}}>{titleOf(plan,index)}</strong><div style={{fontSize:12,color:'#6B5747',marginTop:3}}>{plan.duration_days?plan.duration_days+' dias de hospedagem':'Duração conforme o plano'} · {priceOf(plan)}</div></div>
                  <button type="button" onClick={()=>{const planName=titleOf(plan,index);const confirmed=window.confirm('Pretende escolher o plano "'+planName+'" para o seu negócio? Se continuar, irá para a página de pagamento por Multicaixa Express.');if(confirmed)router.push({pathname:'/Pagamento',query:{plan:plan.id,business:business.id}});}} style={{border:0,borderRadius:11,padding:'11px 15px',background:theme.color,color:'#fff',fontWeight:900,cursor:'pointer'}}>Escolher plano →</button>
                </div>;
              })}
            </div>}
        </article>}

        {activeTab === 'girassol' && <article style={S.planMainCard}>
          <div style={{...S.planIcon,fontSize:52}}>🌻</div>
          <div style={S.planBadge}>PRIMEIRO NÍVEL</div>
          <h2 style={S.planTitle}>Girassol</h2>
          <div style={S.planBigNumber}>5.000 Guardados únicos</div>
          <p style={S.planDescription}>Ao alcançar 5.000 Guardados únicos, o seu negócio conquista permanentemente o nível Girassol. Mesmo que, mais tarde, os clientes deixem de guardar o seu perfil ou a contagem diminua, a conquista e o desbloqueio não são retirados.</p>
          <div style={S.planBenefitHeading}>Benefícios incluídos</div>
          <ul style={S.planBenefits}>
            {[
              'Publicar gratuitamente na Vitrine principal da Talaza',
              'Desbloqueia o acesso à Rede de Parcerias',
              'Desbloqueia a Entrega Interprovincial',
              'Selo Girassol no perfil para dar confiança',
              'Progresso contado automaticamente pela Talaza'
            ].map((item,i)=><li key={i}><span style={S.planCheck}>✓</span><span>{item}</span></li>)}
          </ul>
          <div style={{padding:15,borderRadius:15,background:'rgba(255,255,255,.68)',border:'1px solid #DDCDBB'}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',fontSize:12,color:'#604B3C',fontWeight:800}}><span>O teu progresso</span><span>{Math.min(100,Number(girassolAccount?.unique_saved_count||0)/5000*100).toFixed(1)}%</span></div>
            <div style={{height:10,borderRadius:99,background:'#E4D8CA',overflow:'hidden',marginTop:9}}><div style={{height:'100%',width:Math.min(100,(Number(girassolAccount?.unique_saved_count||0)/5000)*100)+'%',background:'linear-gradient(90deg,#FFFFFF 0%,#9A7655 100%)'}}/></div>
            <p style={{margin:'8px 0 0',fontSize:12,color:'#604B3C'}}>{Number(girassolAccount?.unique_saved_count||0).toLocaleString('pt-AO')} / 5.000 Guardados únicos</p>
            {girassolAccount?.unlocked_tier && <strong style={{display:'block',marginTop:8,color:'#6E3038',fontSize:13}}>🌻 Conquista permanente desbloqueada</strong>}
            <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid #DDCDBB',fontSize:12,lineHeight:1.6,color:'#604B3C'}}><strong>Próximo nível: Girassol Pró</strong><br/>Meta de 1.000.000 Guardados únicos e possibilidade de publicar na Entrega Interprovincial em até 10 províncias.</div>
          </div>
          <p style={{margin:'15px 0 0',fontSize:12,lineHeight:1.65,color:'#6B5747'}}>Não são compras de impulsionamento: o progresso é contado automaticamente pela Talaza.</p>
          <div style={{...S.planNotice,marginTop:13}}><strong>Importante sobre a hospedagem</strong><p>Se ainda não atingiu o desbloqueio do plano e a hospedagem expirar, terá 15 dias para renovar. Se não renovar dentro desse prazo, perde a quantidade de Guardados acumulada para o desbloqueio e terá de começar novamente. Depois de desbloquear, a conquista é permanente e não é retirada mesmo que os Guardados diminuam. A falta de hospedagem pode suspender temporariamente os benefícios, mas não apaga a conquista.</p></div>
          {girassolAccount?.access_status==='suspended' && <div style={{...S.planNotice,marginTop:12}}><strong>Acesso suspenso</strong><p>A sua conquista continua guardada. Reactivação actual: {Number(girassolAccount.reactivation_amount||12000).toLocaleString('pt-AO')} Kz. A reactivação não substitui a hospedagem normal.</p></div>}
        </article>}

        {activeTab === 'premium' && <article style={S.planMainCard}>
          <div style={{...S.planIcon,fontSize:42}}>✦</div>
          <div style={S.planBadge}>MÁXIMA VISIBILIDADE</div>
          <h2 style={S.planTitle}>Destaque Premium</h2>
          <h3 style={S.planSubtitle}>Fica no topo e vende mais rápido</h3>
          <p style={S.planDescription}>O Destaque Premium coloca o teu negócio no topo da Vitrine e nas primeiras posições das pesquisas. Ideal para quem quer vender hoje, não esperar. Enquanto estiver ativo, és o primeiro que o cliente vê.</p>
          <div style={S.planBenefitHeading}>Benefícios incluídos</div>
          <ul style={S.planBenefits}>
            {[
              'Topo da Vitrine principal durante todo o período',
              'Primeiro lugar nas pesquisas da tua categoria',
              'Selo Premium dourado no perfil',
              'Prioridade nas sugestões da Talaza',
              'Estatísticas de quem viu e guardou o teu perfil'
            ].map((item,i)=><li key={i}><span style={S.planCheck}>✓</span><span>{item}</span></li>)}
          </ul>
          {premiumPlans.length>0 && <div style={{marginTop:16}}>
            <label style={{display:'block',fontSize:12,fontWeight:900,color:'#6E3038',marginBottom:7}}>Escolhe a duração do Destaque Premium</label>
            <select value={selectedPremiumPlan?.id||''} onChange={event=>setPremiumPlanChoice(event.target.value)} style={{width:'100%',padding:13,borderRadius:12,border:'1px solid #DDCDBB',background:'#fff',color:'#604B3C',fontWeight:700}}>
              {premiumPlans.map(plan=><option key={plan.id} value={plan.id}>{titleOf(plan,premiumPlans.indexOf(plan))} · {plan.duration_days||'—'} dias · {priceOf(plan)}</option>)}
            </select>
          </div>}
          <button type="button" disabled={!selectedPremiumPlan} onClick={()=>selectedPremiumPlan&&router.push({pathname:'/criar-impulsionamento',query:{plan:selectedPremiumPlan.id}})} style={{...S.planCta,opacity:selectedPremiumPlan?1:.55,cursor:selectedPremiumPlan?'pointer':'not-allowed'}}>Ativar Destaque Premium</button>
          {!selectedPremiumPlan && <p style={{margin:'10px 0 0',fontSize:12,color:'#6B5747'}}>Os planos de Destaque Premium ainda estão a ser configurados.</p>}
          {promotions.length>0 && <div style={{marginTop:22,paddingTop:17,borderTop:'1px solid #DDCDBB'}}>
            <div style={S.planBenefitHeading}>As minhas publicações impulsionadas</div>
            <div style={{display:'grid',gap:10,marginTop:12}}>{promotions.map(item=><div key={item.id} style={{display:'flex',gap:12,alignItems:'center',padding:11,borderRadius:13,background:'rgba(255,255,255,.65)'}}>
              {item.media_type==='video'?<video src={item.media_url} muted style={{width:64,height:64,objectFit:'cover',borderRadius:9}}/>:<img src={item.media_url} alt="" style={{width:64,height:64,objectFit:'cover',borderRadius:9}}/>}
              <div style={{minWidth:0,flex:1}}><strong style={{display:'block',color:'#6E3038',fontSize:13}}>{item.description}</strong><span style={{fontSize:11,color:'#6B5747'}}>Estado: {item.status==='active'&&item.expires_at&&new Date(item.expires_at).getTime()<=Date.now()?'Expirada':({pending_payment:'A aguardar comprovativo',pending:'Em análise',active:'Ativa',rejected:'Recusada',expired:'Expirada',cancelled:'Cancelada'})[item.status]||item.status}</span></div>
            </div>)}</div>
          </div>}
        </article>}
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
 noBenefits:{fontSize:12,lineHeight:1.6,color:COLORS.muted,margin:'13px 0 22px'},
 planMainCard:{position:'relative',maxWidth:780,margin:'0 auto',padding:'28px clamp(18px,4vw,34px)',borderRadius:24,background:'linear-gradient(145deg,#F7F0E5 0%,#EFE2D0 100%)',border:'1px solid #D9C6AE',boxShadow:'0 16px 38px rgba(74,53,34,.09)',color:'#604B3C'},
 planIcon:{width:82,height:82,display:'grid',placeItems:'center',fontSize:45,marginBottom:14,borderRadius:22,background:'rgba(255,255,255,.72)',border:'1px solid rgba(255,255,255,.85)',boxShadow:'0 8px 22px rgba(93,67,45,.12)'},
 planBadge:{display:'inline-flex',padding:'7px 11px',borderRadius:999,background:'rgba(255,255,255,.72)',color:'#805A42',fontSize:10,fontWeight:900,letterSpacing:1.1},
 planTitle:{fontSize:30,lineHeight:1.15,margin:'15px 0 6px',color:'#7B3038',fontWeight:900},
 planSubtitle:{fontSize:16,lineHeight:1.45,margin:'0 0 14px',color:'#815B46',fontWeight:800},
 planBigNumber:{fontSize:'clamp(26px,5vw,38px)',lineHeight:1.12,margin:'10px 0 14px',fontWeight:950,letterSpacing:-.8,color:'#7B3038'},
 planDescription:{fontSize:14,lineHeight:1.75,margin:'12px 0 20px',color:'#604B3C'},
 planBenefitHeading:{fontSize:12,fontWeight:950,letterSpacing:.7,textTransform:'uppercase',color:'#7B3038',marginTop:17},
 planBenefits:{listStyle:'none',padding:0,margin:'12px 0 18px',display:'grid',gap:12},
 planBenefitsItem:{},
 planCheck:{width:22,height:22,flex:'0 0 22px',borderRadius:'50%',display:'grid',placeItems:'center',background:'#0A3D2A',color:'#fff',fontWeight:900,fontSize:12},
 planNotice:{padding:15,borderRadius:14,background:'rgba(255,255,255,.65)',border:'1px solid #DDCDBB',fontSize:12,lineHeight:1.7,color:'#604B3C'},
 planCta:{width:'100%',marginTop:18,padding:'15px 18px',border:0,borderRadius:13,background:'#0A3D2A',color:'#fff',fontWeight:900,fontSize:14,boxShadow:'0 8px 20px rgba(10,61,42,.16)'}
};
S.benefits = { ...S.benefits };
