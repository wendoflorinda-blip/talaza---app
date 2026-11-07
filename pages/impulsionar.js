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
            ['premium','Destaque Premium'],
            ['girassol','Girassol']
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

        {activeTab === 'girassol' && <>
          <div style={S.grid}>
            <article style={{...S.card,borderColor:'#B99A78',background:'linear-gradient(135deg,#FFFFFF 0%,#E9DDCF 48%,#9A7655 100%)',color:'#5E4937'}}>
              <div style={{...S.icon,width:72,height:72,minWidth:72,borderRadius:20,fontSize:46,background:'linear-gradient(135deg,#FFFFFF 0%,#9A7655 100%)',boxShadow:'0 8px 20px rgba(90,64,43,.18)'}}>🌻</div>
              <div style={{...S.tag,color:'#65472F',background:'rgba(255,255,255,.8)'}}>PRIMEIRO NÍVEL</div>
              <h2 style={{...S.cardTitle,color:'#65472F'}}>Girassol</h2>
              <div style={{...S.price,color:'#65472F'}}>5.000 Guardados únicos</div>
              <p style={{fontSize:13,lineHeight:1.7,color:'#5E4937'}}>Ao alcançar 5.000 Guardados únicos, o seu negócio conquista permanentemente o nível Girassol. Mesmo que, mais tarde, os clientes deixem de guardar o seu perfil ou a contagem diminua, a conquista e o desbloqueio não são retirados.</p>
              <div style={{fontSize:12,fontWeight:900,color:'#65472F',marginTop:5}}>BENEFÍCIOS INCLUÍDOS</div>
              <ul style={{margin:'9px 0 16px',paddingLeft:19,color:'#5E4937',fontSize:12,lineHeight:1.75}}>
                <li>Publicar gratuitamente na Vitrine principal da sua província.</li>
                <li>Publicar gratuitamente na Vitrine da sua própria subcategoria, na província oficial do negócio.</li>
                <li>Ter o perfil apresentado em «Vendedores disponíveis para parceria», para outros vendedores descobrirem o negócio, consultarem o perfil e enviarem mensagens internas.</li>
                <li>Publicar ofertas de Entrega Interprovincial para até 3 províncias escolhidas.</li>
              </ul>
              <div style={{height:9,borderRadius:99,background:'rgba(100,71,47,.16)',overflow:'hidden'}}><div style={{height:'100%',width:Math.min(100,(Number(girassolAccount?.unique_saved_count||0)/5000)*100)+'%',background:'linear-gradient(90deg,#FFFFFF 0%,#9A7655 100%)'}}/></div>
              <p style={{fontSize:12,color:'#5E4937'}}>{Number(girassolAccount?.unique_saved_count||0).toLocaleString('pt-AO')} / 5.000 Guardados únicos</p>
              {girassolAccount?.unlocked_tier && <strong style={{display:'block',fontSize:12,color:'#65472F'}}>🌻 Conquista permanente desbloqueada</strong>}
            </article>
            <article style={{...S.card,borderColor:'#83B8D9',background:'linear-gradient(135deg,#FFFFFF 0%,#D8ECFA 48%,#5798C8 100%)',color:'#315A78'}}>
              <div style={{...S.icon,width:72,height:72,minWidth:72,borderRadius:20,fontSize:46,background:'linear-gradient(135deg,#FFFFFF 0%,#5798C8 100%)',boxShadow:'0 8px 20px rgba(23,76,115,.18)'}}>🌻</div>
              <div style={{...S.tag,color:'#174C73',background:'rgba(255,255,255,.82)'}}>NÍVEL AVANÇADO</div>
              <h2 style={{...S.cardTitle,color:'#174C73'}}>Girassol Pró</h2>
              <div style={{...S.price,color:'#174C73'}}>1.000.000 Guardados únicos</div>
              <p style={{fontSize:13,lineHeight:1.7,color:'#315A78'}}>Ao alcançar 1.000.000 de Guardados únicos, sobe para Girassol Pró. É uma conquista permanente: não perde o nível mesmo que os Guardados diminuam ou deixe de receber novos Guardados.</p>
              <div style={{fontSize:12,fontWeight:900,color:'#174C73',marginTop:5}}>TODOS OS BENEFÍCIOS GIRASSOL, MAIS</div>
              <ul style={{margin:'9px 0 16px',paddingLeft:19,color:'#315A78',fontSize:12,lineHeight:1.75}}>
                <li>Publicação gratuita na Vitrine principal e na Vitrine da sua própria subcategoria.</li>
                <li>Presença no directório de vendedores disponíveis para parceria enquanto o acesso estiver activo.</li>
                <li>Publicações de Entrega Interprovincial dirigidas a até 10 províncias escolhidas por si.</li>
                <li>Mais oportunidades para receber contactos, encontrar parceiros e conquistar clientes noutras regiões.</li>
              </ul>
              <div style={{height:9,borderRadius:99,background:'rgba(23,76,115,.15)',overflow:'hidden'}}><div style={{height:'100%',width:Math.min(100,(Number(girassolAccount?.unique_saved_count||0)/1000000)*100)+'%',background:'linear-gradient(90deg,#FFFFFF 0%,#5798C8 100%)'}}/></div>
              <p style={{fontSize:12,color:'#315A78'}}>{Number(girassolAccount?.unique_saved_count||0).toLocaleString('pt-AO')} / 1.000.000 Guardados únicos</p>
              {girassolAccount?.unlocked_tier==='girassol_pro' && <strong style={{display:'block',fontSize:12,color:'#174C73'}}>🌻 Conquista permanente desbloqueada</strong>}
            </article>
          </div>
          <div style={{marginTop:15,padding:17,borderRadius:15,background:'#F0F4F7',border:'1px solid #CBD5DF',color:'#34485A',fontSize:13,lineHeight:1.75}}>
            <strong style={{display:'block',marginBottom:5}}>Atenção ao prazo de hospedagem</strong>
            Se ainda não tiver atingido a meta do nível e a hospedagem da sua loja expirar, terá 15 dias para renovar. Se não renovar dentro desse prazo, perde a quantidade de Guardados acumulada para o desbloqueio e terá de começar novamente. Esta regra só afecta quem ainda não conquistou o nível.
            <br/><br/><strong>A conquista é permanente depois de desbloqueada.</strong> Mesmo que os Guardados diminuam, não perde o marco. Se a hospedagem ficar expirada por mais de 15 dias, os benefícios ficam suspensos até à reactivação e à regularização da hospedagem. A reactivação não substitui a hospedagem normal.
          </div>
          {girassolAccount?.access_status==='suspended' && <div style={{...S.planNotice,marginTop:12}}><strong>Acesso suspenso</strong><p>A sua conquista continua guardada. Reactivação actual: {Number(girassolAccount.reactivation_amount||12000).toLocaleString('pt-AO')} Kz. A reactivação não substitui a hospedagem normal.</p></div>}
        </>}

        {activeTab === 'premium' && <>
          {premiumPlans.length>0 ? <div style={S.grid}>
            {premiumPlans.map((plan,index)=>{
              const planPrice=Number(plan.price);
              const isShort=Number(plan.duration_days||0)===15;
              const isFiveThousand=planPrice===5000;
              const theme=isFiveThousand
                ?{background:'linear-gradient(135deg,#F59A23 0%,#D93620 48%,#F2C14E 100%)',border:'#D65A23',text:'#FFFFFF',button:'#FFFFFF',buttonText:'#9D321B',icon:'✦'}
                :{background:'linear-gradient(135deg,#071B3D 0%,#164A85 55%,#B9DDF8 100%)',border:'#8ABBE5',text:'#FFFFFF',button:'#FFFFFF',buttonText:'#123B68',icon:'◈'};
              const benefits=benefitsOf(plan);
              return <article key={plan.id} style={{...S.card,background:theme.background,borderColor:theme.border,color:theme.text,boxShadow:'0 18px 38px rgba(7,35,83,.18)'}}>
                <div style={{...S.icon,background:'rgba(255,255,255,.2)',color:'#fff',border:'1px solid rgba(255,255,255,.35)'}}>{theme.icon}</div>
                <div style={{...S.tag,background:'rgba(255,255,255,.18)',color:'#fff'}}>{Number(plan.duration_days||0)===15?'15 DIAS DE VISIBILIDADE':isFiveThousand?'MAIOR ALCANCE':'DESTAQUE PREMIUM'}</div>
                <h3 style={{...S.cardTitle,color:'#fff'}}>{titleOf(plan,index)}</h3>
                <div style={{...S.price,color:'#fff'}}>{priceOf(plan)}</div>
                <div style={{...S.duration,color:'rgba(255,255,255,.9)'}}>◷ {plan.duration_days||'—'} dias de destaque</div>
                <div style={{...S.benefitTitle,color:'#fff'}}>Benefícios do plano</div>
                <ul style={S.benefits}>
                  {(benefits.length?benefits:['Destaque da publicação na Vitrine principal','Maior visibilidade durante todo o período contratado','Botões Ver perfil e Enviar mensagem na publicação']).map((item,i)=><li key={i} style={{display:'flex',alignItems:'flex-start',gap:10,color:'rgba(255,255,255,.95)',fontSize:12,lineHeight:1.6}}><span style={{...S.check,background:'rgba(255,255,255,.2)',border:'1px solid rgba(255,255,255,.45)'}}>✓</span><span>{item}</span></li>)}
                </ul>
                <button type="button" onClick={()=>router.push({pathname:'/criar-impulsionamento',query:{plan:plan.id}})} style={{...S.cta,background:theme.button,color:theme.buttonText}}>Ativar Destaque Premium <span>→</span></button>
              </article>;
            })}
          </div> : <div style={S.empty}><div style={S.emptyIcon}>✦</div><h3>Planos em preparação</h3><p>Os planos de Destaque Premium ainda não estão configurados para esta conta.</p></div>}
          {promotions.length>0 && <div style={{...S.planMainCard,marginTop:22}}>
            <div style={S.planBenefitHeading}>As minhas publicações impulsionadas</div>
            <div style={{display:'grid',gap:10,marginTop:12}}>{promotions.map(item=>{
              const waitingProof=item.status==='pending_payment';
              const stateLabel=item.status==='active'&&item.expires_at&&new Date(item.expires_at).getTime()<=Date.now()?'Expirada':({pending_payment:'A aguardar comprovativo',pending:'Comprovativo enviado · Em análise',active:'Ativa',rejected:'Recusada',expired:'Expirada',cancelled:'Cancelada'})[item.status]||item.status;
              return <div key={item.id} style={{display:'flex',gap:12,alignItems:'center',padding:12,borderRadius:13,background:'rgba(255,255,255,.65)',border:'1px solid #E3D8C9',flexWrap:'wrap'}}>
                {item.media_type==='video'?<video src={item.media_url} muted style={{width:64,height:64,objectFit:'cover',borderRadius:9}}/>:<img src={item.media_url} alt="" style={{width:64,height:64,objectFit:'cover',borderRadius:9}}/>}
                <div style={{minWidth:0,flex:1}}><strong style={{display:'block',color:'#6E3038',fontSize:13}}>{item.description}</strong><span style={{fontSize:11,color:'#6B5747'}}>Estado: {stateLabel}</span></div>
                {waitingProof && <button type="button" onClick={()=>router.push({pathname:'/criar-impulsionamento',query:{plan:item.plan_id,edit_promotion_id:item.id}})} style={{border:0,borderRadius:10,padding:'11px 13px',background:'#0A3D2A',color:'#fff',fontSize:12,fontWeight:900,cursor:'pointer'}}>Enviar comprovativo →</button>}
              </div>;
            })}</div>
          </div>}
        </>}
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
