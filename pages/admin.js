 import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const OPPORTUNITY_ACCESS_PLAN_ID = '0fff05f6-c619-4c72-ba3e-3a0028eafef7';
const ADMIN_READ_ONLY = process.env.NEXT_PUBLIC_TALAZA_ADMIN_READ_ONLY === 'true';

function getPaymentProofPaths(request) {
  const image = request?.proof_image_url || null;
  const file = request?.proof_file_url || null;
  if (image || file) return { image, file };

  const legacyValue = request?.proof_url;
  if (!legacyValue) return { image: null, file: null };

  // Compatibilidade com pedidos antigos e com a alternativa JSON se a migração
  // das colunas separadas ainda não estiver aplicada.
  try {
    const parsed = JSON.parse(legacyValue);
    if (parsed && typeof parsed === 'object') {
      return {
        image: parsed.imagePath || parsed.image || null,
        file: parsed.filePath || parsed.file || null,
      };
    }
  } catch (_) {
    // proof_url antigo contém diretamente o caminho do ficheiro.
  }

  return String(request?.proof_type || '').toLowerCase() === 'pdf'
    ? { image: null, file: legacyValue }
    : { image: legacyValue, file: null };
}

export default function Admin() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [vendorPlanRows, setVendorPlanRows] = useState([]);
  const [vendorPlanFilter, setVendorPlanFilter] = useState('all');
  const [expandedVendorId, setExpandedVendorId] = useState('');
  const [businessFilter, setBusinessFilter] = useState('pending');
  const [subscriptionRequests, setSubscriptionRequests] = useState([]);
  const [paymentHistoryById, setPaymentHistoryById] = useState({});
  const [opportunityAccessLoadError, setOpportunityAccessLoadError] = useState('');
  const [girassolReactivations, setGirassolReactivations] = useState([]);
  const [girassolProofUrls, setGirassolProofUrls] = useState({});
  const [reviewingGirassolId, setReviewingGirassolId] = useState('');
  const [paymentProofUrls, setPaymentProofUrls] = useState({});
  const [businessNames, setBusinessNames] = useState({});
  const [planNames, setPlanNames] = useState({});
  const [communityReports, setCommunityReports] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [supportMessages, setSupportMessages] = useState([]);
  const [supportFilter, setSupportFilter] = useState('all');
  const [reportFilter, setReportFilter] = useState('pending');
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [notificationHistoryFilter, setNotificationHistoryFilter] = useState('all');
  const [deletingNotificationId, setDeletingNotificationId] = useState('');
  const [profiles, setProfiles] = useState([]);
  const [emailChangeRequests, setEmailChangeRequests] = useState([]);
  const [emailChangeLoadError, setEmailChangeLoadError] = useState('');
  const [emailChangeBusyId, setEmailChangeBusyId] = useState('');
  const [events, setEvents] = useState([]);
  const [jobPosts, setJobPosts] = useState([]);
  const [jobReviewChecks, setJobReviewChecks] = useState({});
  const [officialKind, setOfficialKind] = useState('motivation');
  const [officialTitle, setOfficialTitle] = useState('');
  const [officialBody, setOfficialBody] = useState('');
  const [officialSaving, setOfficialSaving] = useState(false);
  const [officialBackgroundColor, setOfficialBackgroundColor] = useState('#173B35');
  const [officialBackgroundImage, setOfficialBackgroundImage] = useState('');
  const [officialBackgroundGradient, setOfficialBackgroundGradient] = useState('linear-gradient(135deg, #173B35 0%, #64358B 55%, #D8A319 100%)');
  const [officialImageUploading, setOfficialImageUploading] = useState(false);
  const officialImageInputRef = useRef(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState('');
  const [deletingSupportId, setDeletingSupportId] = useState('');
  const [officialTextColor, setOfficialTextColor] = useState('#FFFFFF');
  const [officialFontFamily, setOfficialFontFamily] = useState('Georgia');
  const [officialDuration, setOfficialDuration] = useState(30);
  const [activeAdminSection, setActiveAdminSection] = useState('vendedores');
  const [resubmissions, setResubmissions] = useState([]);
  const [resubmissionBusyId, setResubmissionBusyId] = useState('');
  const [resubmissionError, setResubmissionError] = useState('');
  const [officialArchive, setOfficialArchive] = useState([]);
  const [notificationAudience, setNotificationAudience] = useState('all');
  const [notificationUserId, setNotificationUserId] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [reviewingPaymentId, setReviewingPaymentId] = useState('');
  const [rejectionModalPayment, setRejectionModalPayment] = useState(null);
  const [paymentRejectionReasons, setPaymentRejectionReasons] = useState([]);
  const [paymentRejectionOther, setPaymentRejectionOther] = useState('');

  const [updatingBusinessId, setUpdatingBusinessId] = useState('');
  const [reviewingPostId, setReviewingPostId] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadPaymentProofUrls() {
      const entries = [];
      for (const request of subscriptionRequests) {
        const paths = getPaymentProofPaths(request);
        for (const [kind, path] of [['image', paths.image], ['file', paths.file]]) {
          if (path) entries.push([request.id + ':' + kind, path]);
        }
      }

      const uniquePaths = [...new Map(entries.map(([key, path]) => [key, path])).entries()];
      const nextUrls = {};
      await Promise.all(uniquePaths.map(async ([key, path]) => {
        const { data, error } = await supabase.storage
          .from('payment-proofs')
          .createSignedUrl(path, 300);
        if (!error && data?.signedUrl) nextUrls[key] = data.signedUrl;
        else if (error) console.warn('Não foi possível gerar o endereço temporário do comprovativo:', key, error.message);
      }));

      if (!cancelled) setPaymentProofUrls(nextUrls);
    }

    if (subscriptionRequests.length) loadPaymentProofUrls();
    else setPaymentProofUrls({});

    return () => { cancelled = true; };
  }, [subscriptionRequests]);

  useEffect(() => {
    if (!ADMIN_READ_ONLY) checkAdmin();
  }, []);

  async function checkAdmin() {
    setLoading(true);
    setMessage('');

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace('/login');
      return;
    }

    const { data: admin, error: adminError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle();

    if (adminError) {
      console.error('Erro ao verificar administrador:', adminError);
      setMessage(adminError.message);
      setLoading(false);
      return;
    }

    if (!admin) {
      setAuthorized(false);
      setLoading(false);
      return;
    }

    setAuthorized(true);
    await loadBusinesses();
    await loadVendorPlanRows();
    await loadPaymentResubmissions();
    await loadSubscriptionRequests();
    await loadGirassolReactivations();
    await loadCommunityReports();
    await loadPendingCommunityPosts();
    await loadSupportMessages();
    await loadAdminNotifications();
    await loadProfiles();
    await loadPendingEmailChanges();
    await loadEvents();
    await loadJobPosts();
    await loadOfficialArchive();

    setLoading(false);
  }

  async function loadVendorPlanRows() {
    const [{data: businessRows,error: businessError},{data: subscriptionRows,error: subscriptionError},{data: paymentRows,error: paymentError},{data: planRows,error: planError}] = await Promise.all([
      supabase.from('businesses').select('id,owner_id,name,phone,province_id,provinces(name)').order('created_at',{ascending:false}),
      supabase.from('business_subscriptions').select('id,business_id,plan_id,starts_at,expires_at,status,created_at').order('created_at',{ascending:false}),
      supabase.from('payment_submissions').select('id,business_id,plan_id,amount,status,created_at,reviewed_at').not('business_id','is',null).order('created_at',{ascending:true}),
      supabase.from('plans').select('id,name,duration_days')
    ]);
    const loadError = businessError || subscriptionError || paymentError || planError;
    if (loadError) {
      console.error('Não foi possível carregar a gestão de planos dos vendedores:',loadError);
      setVendorPlanRows([]);
      return;
    }
    const planMap = Object.fromEntries((planRows||[]).map(plan=>[plan.id,plan]));
    const latestByBusiness = {};
    (subscriptionRows||[]).forEach(row=>{ if(!latestByBusiness[row.business_id]) latestByBusiness[row.business_id]=row; });
    const approvedPayments = (paymentRows||[]).filter(row=>String(row.status||'').toLowerCase()==='approved');
    const historyByBusiness = {};
    approvedPayments.forEach(row=>{
      const plan=planMap[row.plan_id]||{};
      (historyByBusiness[row.business_id] ||= []).push({...row,planName:plan.name||'Plano',durationDays:Number(plan.duration_days)||0});
    });
    const now=Date.now();
    const rows=(businessRows||[]).map(business=>{
      const subscription=latestByBusiness[business.id]||null;
      const expiry=subscription?.expires_at?new Date(subscription.expires_at):null;
      const remaining=expiry&&!Number.isNaN(expiry.getTime())?Math.max(0,Math.ceil((expiry.getTime()-now)/86400000)):0;
      const active=Boolean(subscription && String(subscription.status||'').trim().toLowerCase()==='active' && remaining>0);
      const status=!active?'expired':remaining<=7?'expiring':'active';
      const history=historyByBusiness[business.id]||[];
      const plan=subscription?planMap[subscription.plan_id]:null;
      return {...business,subscription,planName:plan?.name||'Sem plano ativo',remainingDays:remaining,status,history,historyTotalDays:history.reduce((sum,item)=>sum+item.durationDays,0)};
    });
    setVendorPlanRows(rows);
  }

  async function loadPaymentResubmissions() {
    setResubmissionError('');
    const { data: rows, error } = await supabase.from('payment_resubmissions').select('id,seller_id,phone,express_number,file_url,file_type,status,created_at').eq('status','pending').order('created_at',{ascending:false});
    if (error) { setResubmissionError('Não foi possível carregar os comprovativos corrigidos: '+error.message); setResubmissions([]); return; }
    const sellerIds=[...new Set((rows||[]).map(row=>row.seller_id).filter(Boolean))];
    const [{data:statuses,error:statusError},{data:businessRows,error:businessError}] = await Promise.all([
      sellerIds.length ? supabase.from('seller_status').select('seller_id,status,reject_reason').in('seller_id',sellerIds) : Promise.resolve({data:[],error:null}),
      sellerIds.length ? supabase.from('businesses').select('id,owner_id,name,phone,approval_status,is_active,created_at').in('owner_id',sellerIds).order('created_at',{ascending:false}) : Promise.resolve({data:[],error:null})
    ]);
    if(statusError) console.error('Estado dos vendedores nos reenvios:',statusError);
    if(businessError) console.error('Negócios associados aos reenvios:',businessError);
    const statusMap=Object.fromEntries((statuses||[]).map(item=>[item.seller_id,item]));
    const businessMap={}; (businessRows||[]).forEach(item=>{ if(!businessMap[item.owner_id]) businessMap[item.owner_id]=item; });
    const enriched=await Promise.all((rows||[]).map(async row=>{
      const {data:signed,error:signedError}=await supabase.storage.from('payment-proofs').createSignedUrl(row.file_url,600);
      if(signedError) console.warn('Preview de comprovativo indisponível:',signedError.message);
      return {...row,sellerStatus:statusMap[row.seller_id]||null,business:businessMap[row.seller_id]||null,previewUrl:signed?.signedUrl||null};
    }));
    setResubmissions(enriched);
  }

  async function reviewPaymentResubmission(item, approved) {
    if(resubmissionBusyId) return;
    setResubmissionBusyId(item.id); setResubmissionError('');
    try {
      const {data:business,error:businessError}=await supabase.from('businesses').select('id,owner_id,approval_status,is_active').eq('owner_id',item.seller_id).order('created_at',{ascending:false}).limit(1).maybeSingle();
      if(businessError) throw businessError;
      if(!business) throw new Error('Não foi encontrado um negócio associado a este vendedor.');
      if(approved){
        // O reenvio atualiza o pagamento recusado existente; nunca cria um novo payment_submissions.
        const {data:rejectedPayment,error:rejectedPaymentError}=await supabase.from('payment_submissions')
          .select('id,plan_id,amount,created_at,express_sender_phone,express_number')
          .eq('user_id',item.seller_id).eq('business_id',business.id).eq('status','rejected')
          .order('created_at',{ascending:false}).limit(1).maybeSingle();
        if(rejectedPaymentError) throw rejectedPaymentError;
        let validHosting=false;
        if(rejectedPayment){
          const expressSenderPhone=String(rejectedPayment.express_sender_phone||rejectedPayment.express_number||item.express_number||'').trim();
          if(!expressSenderPhone) throw new Error('O pagamento original e o reenvio não contêm o número Express. Não é possível aprovar sem esse dado.');
          const {data:plan,error:planError}=await supabase.from('plans').select('id,price,duration_days').eq('id',rejectedPayment.plan_id).maybeSingle();
          if(planError) throw planError;
          if(!plan || Number(plan.price)!==Number(rejectedPayment.amount)) throw new Error('O valor do pagamento original não corresponde ao preço atual do plano. Verifica o plano antes de aprovar.');
          const now=new Date();
          const {data:existingSubscription,error:subscriptionError}=await supabase.from('business_subscriptions')
            .select('id,starts_at,expires_at,status').eq('business_id',business.id)
            .order('created_at',{ascending:false}).limit(1).maybeSingle();
          if(subscriptionError) throw subscriptionError;
          const currentExpiry=existingSubscription?.expires_at?new Date(existingSubscription.expires_at):null;
          const subscriptionStillActive=Boolean(currentExpiry&&!Number.isNaN(currentExpiry.getTime())&&currentExpiry>now&&String(existingSubscription?.status||'').trim().toLowerCase()==='active');
          const baseDate=subscriptionStillActive?currentExpiry:now;
          const durationDays=Number(plan.duration_days)||0;
          if(durationDays<=0) throw new Error('A duração do plano não está configurada.');
          const expiresAt=new Date(baseDate.getTime()+durationDays*86400000).toISOString();
          const subscriptionData={business_id:business.id,plan_id:plan.id,starts_at:subscriptionStillActive?(existingSubscription?.starts_at||now.toISOString()):now.toISOString(),status:'active',expires_at:expiresAt};
          const subscriptionResult=existingSubscription?.id
            ?await supabase.from('business_subscriptions').update(subscriptionData).eq('id',existingSubscription.id).select('id').maybeSingle()
            :await supabase.from('business_subscriptions').insert(subscriptionData).select('id').maybeSingle();
          if(subscriptionResult.error||!subscriptionResult.data) throw new Error('Não foi possível ativar a hospedagem: '+(subscriptionResult.error?.message||'sem confirmação do Supabase'));
          const {error:paymentUpdateError}=await supabase.from('payment_submissions').update({
            status:'approved',reviewed_at:now.toISOString(),notes:null,
            express_sender_phone:expressSenderPhone,proof_file_url:item.file_url,proof_type:item.file_type
          }).eq('id',rejectedPayment.id).eq('status','rejected');
          if(paymentUpdateError) throw paymentUpdateError;
          validHosting=true;
        } else {
          const {data:subscriptions,error:subscriptionError}=await supabase.from('business_subscriptions').select('id,status,expires_at').eq('business_id',business.id).eq('status','active').gt('expires_at',new Date().toISOString()).order('expires_at',{ascending:false}).limit(1);
          if(subscriptionError) throw subscriptionError;
          validHosting=Boolean(subscriptions&&subscriptions.length);
        }
        const businessPatch={approval_status:'approved',is_active:validHosting};
        const {error:updateBusinessError}=await supabase.from('businesses').update(businessPatch).eq('id',business.id);
        if(updateBusinessError) throw updateBusinessError;
        const {error:statusError}=await supabase.from('seller_status').upsert({seller_id:item.seller_id,status:'approved',reject_reason:null,updated_at:new Date().toISOString()},{onConflict:'seller_id'});
        if(statusError) throw statusError;
        const {error:submissionError}=await supabase.from('payment_resubmissions').update({status:'approved'}).eq('id',item.id).eq('status','pending');
        if(submissionError) throw submissionError;
        const {error:notificationError}=await supabase.from('notifications').insert({user_id:item.seller_id,type:'seller_approved',audience:'seller',title:'O teu negócio foi aprovado!',content:validHosting?'O teu negócio foi aprovado e a hospedagem está válida.':'O teu negócio foi aprovado. Escolhe um plano de hospedagem para ativar o perfil.',link:'/seller',is_read:false});
        if(notificationError) throw new Error('Negócio atualizado, mas a notificação do vendedor falhou: '+notificationError.message);
        alert(validHosting?'Negócio aprovado. A hospedagem válida foi mantida ativa.':'Negócio aprovado. O estado de is_active foi preservado porque não existe hospedagem válida.');
      } else {
        const {error:submissionError}=await supabase.from('payment_resubmissions').update({status:'rejected'}).eq('id',item.id).eq('status','pending');
        if(submissionError) throw submissionError;
        const {error:statusError}=await supabase.from('seller_status').upsert({seller_id:item.seller_id,status:'rejected',reject_reason:item.sellerStatus?.reject_reason||'Comprovativo corrigido ainda não aceite.',updated_at:new Date().toISOString()},{onConflict:'seller_id'});
        if(statusError) throw statusError;
        const {error:businessUpdateError}=await supabase.from('businesses').update({approval_status:'rejected'}).eq('id',business.id);
        if(businessUpdateError) throw businessUpdateError;
        const {error:notificationError}=await supabase.from('notifications').insert({user_id:item.seller_id,type:'seller_resubmission_rejected',audience:'seller',title:'Comprovativo ainda recusado',content:'A equipa Talaza manteve a recusa do comprovativo enviado. Consulta o motivo no teu painel e corrige os dados.',link:'/seller',is_read:false});
        if(notificationError) console.error('Recusa feita, mas não foi possível notificar o vendedor:',notificationError);
        alert('O comprovativo foi mantido como recusado.');
      }
      await Promise.all([loadPaymentResubmissions(),loadBusinesses()]);
    } catch(err) { setResubmissionError(err.message||'Não foi possível concluir a análise.'); }
    finally { setResubmissionBusyId(''); }
  }

  async function loadBusinesses() {
    const { data, error } = await supabase
      .from('businesses')
      .select(`
        id,
        owner_id,
        name,
        description,
        municipality,
        neighborhood,
        phone,
        whatsapp,
        email,
        logo_url,
        created_at,
        approval_status,
        is_active,
        countries (
          name
        ),
        provinces (
          name
        ),
        categories (
          name
        ),
        subcategories (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setMessage(error.message);
      return;
    }

    // Só entra na fila de aprovação quando o perfil está completo e existe comprovativo de plano.
    const { data: proofRows, error: proofError } = await supabase
      .from('payment_submissions')
      .select('business_id, plan_id, proof_url, proof_image_url, proof_file_url, status');
    if (proofError) {
      console.error('Erro ao validar comprovativos dos negócios:', proofError);
      setMessage('Não foi possível validar os comprovativos dos vendedores: ' + proofError.message);
      setBusinesses([]);
      return;
    }
    const readyBusinessIds = new Set((proofRows || [])
      .filter((payment) => payment.business_id && payment.plan_id && [payment.proof_url, payment.proof_image_url, payment.proof_file_url].some((path) => String(path || '').trim()))
      .map((payment) => payment.business_id));
    setBusinesses((data || []).filter((business) => {
      const approvalStatus = String(business.approval_status || 'pending').toLowerCase();
      if (approvalStatus !== 'pending') return true;
      return Boolean(
        business.name?.trim() &&
        business.description?.trim() &&
        business.country_id &&
        business.province_id &&
        business.category_id &&
        business.subcategory_id &&
        readyBusinessIds.has(business.id)
      );
    }));
  }

  async function loadSubscriptionRequests() {
    const { data, error } = await supabase.from('payment_submissions')
      .select('*').order('created_at',{ascending:false});
    if (error) {
      console.error('Erro ao carregar pagamentos dos vendedores:',error);
      setMessage('Perfis carregados. Não foi possível carregar a fila de pagamentos: '+error.message);
      setSubscriptionRequests([]);
      return;
    }
    // O acesso às Oportunidades para Exploradores/Criadores fica suspenso nesta fase.
    const requests = (data || []).filter(item =>
      String(item.plan_id || '').trim().toLowerCase() !== OPPORTUNITY_ACCESS_PLAN_ID.toLowerCase() &&
      String(item.proof_url || '').trim() &&
      (item.business_id || item.event_id || item.job_post_id || item.premium_promotion_id)
    );
    setSubscriptionRequests(requests);
    const historyResult = requests.length
      ? await supabase.from('payment_submission_history').select('*').eq('source_type','commercial')
          .in('submission_id',requests.map(item=>item.id)).order('created_at',{ascending:true})
      : { data: [], error: null };
    if (!historyResult.error) {
      setPaymentHistoryById((historyResult.data || []).reduce((acc,row)=>{(acc[row.submission_id] ||= []).push(row);return acc;},{}));
    }
    const businessIds = [...new Set(requests.map(item=>item.business_id).filter(Boolean))];
    const planIds = [...new Set(requests.map(item=>item.plan_id).filter(Boolean))];
    if (businessIds.length) {
      const {data:businessRows,error:businessNamesError} = await supabase.from('businesses').select('id,name').in('id',businessIds);
      if (businessNamesError) console.error('Erro ao carregar nomes dos negócios:',businessNamesError);
      else setBusinessNames(Object.fromEntries((businessRows || []).map(item=>[item.id,item.name])));
    } else setBusinessNames({});
    if (planIds.length) {
      const {data:planRows,error:planNamesError} = await supabase.from('plans').select('id,name,title,plan_name,nome,duration_days').in('id',planIds);
      if (planNamesError) console.error('Erro ao carregar nomes dos planos:',planNamesError);
      else {
        const namesById = {};
        (planRows || []).forEach(item=>{namesById[item.id]=item.name || item.title || item.plan_name || item.nome || 'Plano';});
        setPlanNames(namesById);
      }
    } else setPlanNames({});
  }

  async function approveHostingAndProfile(business) {
    if (!business?.id || reviewingPaymentId || updatingBusinessId) return;
    const pendingPayment = subscriptionRequests.find(request =>
      request.business_id === business.id &&
      ['pending','submitted'].includes(String(request.status||'').toLowerCase()) &&
      request.plan_id
    );
    if (!pendingPayment) {
      alert('Não existe comprovativo pendente para este negócio.');
      return;
    }
    setUpdatingBusinessId(business.id);
    try {
      const { data, error } = await supabase.rpc('admin_approve_hosting_and_profile', {
        p_business_id: business.id
      });
      if (error) throw error;
      await Promise.all([loadBusinesses(), loadSubscriptionRequests(), loadVendorPlanRows()]);
      alert(data?.subscription_created
        ? 'Pagamento e perfil aprovados. Foram concedidos ' + data.plan_days + ' dias, uma única vez.'
        : 'Pagamento e perfil aprovados. A Hospedagem ativa existente foi preservada; não foram acrescentados dias.');
    } catch (error) {
      alert(error.message || 'Não foi possível aprovar pagamento e perfil.');
    } finally {
      setUpdatingBusinessId('');
    }
  }

  async function updateBusiness(id, status) {
    const businessForReview = businesses.find((item) => item.id === id);
    const rejectionReason = status === 'rejected'
      ? window.prompt('Indique o motivo da recusa do cadastro do vendedor:')
      : '';

    if (status === 'rejected' && (!rejectionReason || !rejectionReason.trim())) return;

    let endDate = null;
    let isPaid = false;
    let grantedPlanDays = 0;
    if (status === 'approved') {
      const { data: approvedPayment, error: approvedPaymentError } = await supabase
        .from('payment_submissions')
        .select('id,created_at')
        .eq('business_id', id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (approvedPaymentError) {
        alert('Não foi possível verificar o pagamento aprovado: ' + approvedPaymentError.message);
        return;
      }
      if (!approvedPayment) {
        alert('Não tem pagamento aprovado');
        return;
      }
      const { data: existingSubscription, error: subscriptionReadError } = await supabase
        .from('business_subscriptions')
        .select('id,plan_id,starts_at,expires_at,status,created_at')
        .eq('business_id', id)
        .eq('status', 'active')
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (subscriptionReadError) {
        alert('Não foi possível consultar a hospedagem atual: ' + subscriptionReadError.message);
        return;
      }
      const expiry = existingSubscription?.expires_at ? new Date(existingSubscription.expires_at) : null;
      isPaid = Boolean(expiry && !Number.isNaN(expiry.getTime()) && expiry.getTime() > Date.now());
      endDate = isPaid ? expiry.toISOString() : null;
      if (!isPaid) {
        alert('Não existe uma Hospedagem ativa. Utilize “Aprovar Pagamento + Perfil” para conceder os dias uma única vez.');
        return;
      }
    }
    const updates = {
      approval_status: status,
      is_active: status === 'approved' ? isPaid : false,
    };

    const { data: updatedBusiness, error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      alert('Não foi possível aprovar/recusar o negócio. Verifique as permissões RLS de businesses: ' + error.message);
      return;
    }

    if (!updatedBusiness) {
      alert('O Supabase não confirmou a alteração do negócio. Confirme a política RLS administrativa de businesses.');
      return;
    }

    if (businessForReview?.owner_id) {
      const approvedWithHosting = status === 'approved' && isPaid;
      await notifyUser(
        businessForReview.owner_id,
        status === 'approved' ? 'Perfil Talaza analisado' : 'Cadastro de vendedor recusado',
        status === 'approved'
          ? (approvedWithHosting
              ? 'O seu perfil foi aprovado e a hospedagem está ativa até ' + new Date(endDate).toLocaleDateString('pt-PT') + (grantedPlanDays ? ' (' + grantedPlanDays + ' dias concedidos).' : '.')
              : 'O seu perfil foi aprovado na análise, mas ainda não tem um pagamento aprovado com plano válido. Por isso, não ficará visível na Vitrine até a hospedagem ser confirmada.')
          : 'O seu cadastro de vendedor foi recusado. Motivo: ' + rejectionReason.trim(),
        'seller_review',
        null,
        'seller'
      );
    }

    await loadBusinesses();
    alert(status === 'approved'
      ? (isPaid ? 'Perfil aprovado e hospedagem ativada.' : 'Perfil aprovado na análise, mas permanece inativo até existir uma hospedagem paga válida.')
      : 'Cadastro recusado.');
  }

  async function loadGirassolReactivations() {
    const { data, error } = await supabase.from('girassol_reactivation_requests').select('id,business_id,tier,amount,currency,proof_path,status,notes,created_at').order('created_at', { ascending: false });
    if (error) { console.error('Erro ao carregar reativações Girassol:', error); setGirassolReactivations([]); return; }
    const rows = data || [];
    const ids = [...new Set(rows.map(row => row.business_id).filter(Boolean))];
    const result = ids.length ? await supabase.from('businesses').select('id,name,owner_id').in('id', ids) : { data: [] };
    const businessById = Object.fromEntries((result.data || []).map(row => [row.id, row]));
    const proofUrls = {};
    await Promise.all(rows.map(async row => {
      const { data: signed } = await supabase.storage.from('girassol-proofs').createSignedUrl(row.proof_path, 300);
      if (signed?.signedUrl) proofUrls[row.id] = signed.signedUrl;
    }));
    setGirassolProofUrls(proofUrls);
    setGirassolReactivations(rows.map(row => ({ ...row, business: businessById[row.business_id] || null })));
  }

  async function reviewGirassolReactivation(request, approved) {
    const reason = approved ? '' : window.prompt('Indique o motivo da recusa da reactivação Girassol:');
    if (!approved && (!reason || !reason.trim())) return;
    if (reviewingGirassolId) return;
    setReviewingGirassolId(request.id);
    const { data, error } = await supabase.from('girassol_reactivation_requests')
      .update({ status: approved ? 'approved' : 'rejected', notes: approved ? request.notes : reason.trim() })
      .eq('id', request.id).eq('status', 'pending').select('id').maybeSingle();
    if (error || !data) { alert('Não foi possível actualizar a reactivação: ' + (error?.message || 'Pedido já analisado.')); setReviewingGirassolId(''); return; }
    if (request.business?.owner_id) await notifyUser(request.business.owner_id, approved ? 'Girassol reactivado' : 'Reactivação Girassol recusada', approved ? 'A administração aprovou a reactivação do seu acesso Girassol. A hospedagem normal continua a ser necessária.' : 'O pedido de reactivação foi recusado. Motivo: ' + reason.trim(), 'girassol_reactivation');
    await loadGirassolReactivations();
    setReviewingGirassolId('');
    alert(approved ? 'Acesso Girassol reactivado. A hospedagem não foi alterada.' : 'Pedido de reactivação recusado.');
  }

  async function loadCommunityReports() {
    const { data, error } = await supabase
      .from('community_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Erro ao carregar denúncias:', error);
      setCommunityReports([]);
      setMessage('Não foi possível carregar as denúncias da Comunidade Talaza: ' + error.message);
      return;
    }
    setCommunityReports(data || []);
  }

  async function loadPendingCommunityPosts() {
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar publicações pendentes da comunidade:', error);
      setCommunityPosts([]);
      setMessage('Não foi possível carregar as publicações pendentes da Comunidade Talaza: ' + error.message);
      return;
    }

    setCommunityPosts(data || []);
  }

  async function loadOfficialArchive() {
    const [motivationResult, themeResult] = await Promise.all([
      supabase.from('community_motivation').select('id, title, created_at, duration_days, expires_at, is_active').order('created_at', { ascending: false }),
      supabase.from('community_monthly_themes').select('id, month_title, created_at, duration_days, starts_at, ends_at, is_active').order('created_at', { ascending: false }),
    ]);
    if (motivationResult.error || themeResult.error) {
      console.error('Não foi possível carregar o histórico editorial:', motivationResult.error || themeResult.error);
      return;
    }
    setOfficialArchive([
      ...(motivationResult.data || []).map(item => ({ ...item, archiveType: 'Motivação', archiveTitle: item.title, archiveExpiresAt: item.expires_at })),
      ...(themeResult.data || []).map(item => ({ ...item, archiveType: 'Tema do mês', archiveTitle: item.month_title, archiveExpiresAt: item.ends_at })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  }

  async function loadSupportMessages() {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar mensagens do suporte:', error);
      setMessage('Não foi possível carregar as mensagens do Suporte Talaza: ' + error.message);
      setSupportMessages([]);
      return;
    }
    setSupportMessages(data || []);
  }

  async function loadAdminNotifications() {
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) { console.error('Erro ao carregar notificações administrativas:', error); setAdminNotifications([]); setMessage('Não foi possível carregar o histórico de notificações: ' + error.message); return; }
    setAdminNotifications(data || []);
  }

  async function loadEvents() {
    const [{ data, error }, { data: proofs, error: proofError }] = await Promise.all([
      supabase.from('events').select('*').order('created_at', { ascending: false }),
      supabase.from('payment_submissions').select('event_id, plan_id, proof_url').not('proof_url', 'is', null),
    ]);
    if (error || proofError) {
      const issue = error || proofError;
      console.error('Erro ao carregar eventos/comprovativos:', issue);
      setMessage('Não foi possível carregar eventos completos e os seus comprovativos: ' + issue.message);
      setEvents([]);
      return;
    }
    const paidEventIds = new Set((proofs || []).filter((item) => item.event_id && item.plan_id && String(item.proof_url || '').trim()).map((item) => item.event_id));
    setEvents((data || []).filter((item) =>
      item.title?.trim() &&
      item.description?.trim() &&
      item.event_type?.trim() &&
      item.country_id &&
      item.province_id &&
      item.location?.trim() &&
      item.starts_at &&
      (item.image_url || item.video_url) &&
      paidEventIds.has(item.id)
    ));
  }

  async function loadJobPosts() {
    const { data, error } = await supabase.from('job_posts').select('*, province:provinces(name), country:countries(name)').order('created_at', { ascending: false });
    if (error) { console.error('Erro ao carregar oportunidades:', error); setMessage('Não foi possível carregar oportunidades: ' + error.message); setJobPosts([]); return; }
    // Os posts visuais podem não ter título nem descrição: a imagem é o conteúdo principal.
    setJobPosts((data || []).filter((item) =>
      item.user_id &&
      item.country_id &&
      item.province_id &&
      (item.image_url || (item.title?.trim() && item.description?.trim()))
    ).sort((a, b) => {
      const aPending = ['pending','pending_review'].includes(String(a.status || '').toLowerCase()) ? 0 : 1;
      const bPending = ['pending','pending_review'].includes(String(b.status || '').toLowerCase()) ? 0 : 1;
      return aPending - bPending || new Date(b.created_at || 0) - new Date(a.created_at || 0);
    }));
  }

  async function notifyUser(userId, title, body, type = 'admin_review', referenceId = null, audience = 'explorer', linkOverride = null) {
    if (!userId) return { ok: false, error: 'Utilizador destinatário não identificado.' };
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      content: body,
      type,
      audience,
      link: linkOverride || (type === 'opportunity_review' ? '/minhas-vagas' : audience === 'seller' ? '/seller' : '/explore'),
      reference_id: referenceId,
    });
    if (error) {
      console.error('Não foi possível criar a notificação:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  async function moderateEvent(event, approved) {
    const reason = approved ? '' : window.prompt('Indique o motivo da recusa do evento:');
    if (!approved && (!reason || !reason.trim())) return;
    const alreadyPaid = ['approved', 'paid', 'completed'].includes(String(event.payment_status || '').toLowerCase());
    const patch = approved
      ? { status: alreadyPaid ? 'published' : 'pending_payment', admin_approved: true }
      : { status: 'rejected', admin_approved: false };
    const { data, error } = await supabase.from('events').update(patch).eq('id', event.id).select('id, user_id').maybeSingle();
    if (error || !data) { alert('Não foi possível atualizar o evento: ' + (error?.message || 'Nenhuma linha foi alterada.')); return; }
    await notifyUser(data.user_id || event.user_id, approved ? 'Evento aprovado pela Talaza' : 'Evento recusado pela Talaza', approved ? (alreadyPaid ? 'O seu evento foi aprovado e publicado.' : 'O seu evento foi aprovado na análise administrativa. Para ficar visível, ainda precisa de confirmação do pagamento.') : 'O seu evento não foi aprovado. Motivo: ' + reason.trim(), 'event_review');
    await loadEvents();
    alert(approved ? 'Evento aprovado.' : 'Evento recusado e motivo enviado nas notificações do responsável.');
  }

  async function moderateJob(post, approved) {
    const pendingStatus = ['pending', 'pending_review'].includes(String(post.status || '').toLowerCase());
    if (!pendingStatus) { alert('Esta vaga já foi analisada.'); return; }
    const checks = jobReviewChecks[post.id] || {};
    if (approved && !(checks.link && checks.message && checks.data)) {
      alert('Antes de aprovar, confirme os três pontos da revisão: link, mensagem e dados.');
      return;
    }
    const reason = approved ? '' : window.prompt('Indique o motivo da recusa da oportunidade:');
    if (!approved && (!reason || !reason.trim())) return;

    const allowedDurations = [7, 15, 30];
    const durationDays = allowedDurations.includes(Number(post.duration_days)) ? Number(post.duration_days) : 30;
    const submittedAt = post.created_at ? new Date(post.created_at) : new Date();
    const expiresAt = new Date(submittedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
    if (approved && expiresAt.getTime() <= Date.now()) {
      const { error: expireError } = await supabase.from('job_posts')
        .update({ status: 'expired', is_active: false, admin_approved: false })
        .eq('id', post.id);
      if (expireError) alert('Não foi possível atualizar o estado: ' + expireError.message);
      else { await loadJobPosts(); alert('O prazo desta vaga terminou.'); }
      return;
    }

    const patch = approved
      ? { status: 'approved', is_active: true, admin_approved: true, duration_days: durationDays, expires_at: expiresAt.toISOString() }
      : { status: 'rejected', is_active: false, admin_approved: false };
    const { data, error } = await supabase.from('job_posts').update(patch).eq('id', post.id).select('id,user_id').maybeSingle();
    if (error || !data) { alert('Não foi possível atualizar a vaga: ' + (error?.message || 'Nenhuma linha foi alterada.')); return; }
    const body = approved
      ? 'A sua vaga "' + (post.title || post.profession || 'Oportunidade') + '" foi aprovada e já está visível na área Oportunidades da província onde foi publicada.'
      : 'A sua vaga "' + (post.title || post.profession || 'Oportunidade') + '" foi rejeitada. Motivo: ' + reason.trim() + '. Pode consultar este motivo em Minhas vagas.';
    await notifyUser(data.user_id || post.user_id, approved ? 'Vaga aprovada pela Talaza' : 'Vaga rejeitada pela Talaza', body, 'opportunity_review', post.id, 'explorer');
    await loadJobPosts();
    alert(approved ? 'Vaga aprovada e publicada na província selecionada.' : 'Vaga rejeitada. O motivo foi enviado ao responsável.');
  }

  async function uploadOfficialBackground(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Escolha um ficheiro de imagem.'); return; }
    if (file.size > 8 * 1024 * 1024) { alert('A imagem deve ter no máximo 8 MB.'); return; }
    setOfficialImageUploading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) throw new Error('A sessão expirou. Entre novamente.');
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = 'community-backgrounds/' + authData.user.id + '/' + Date.now() + '.' + ext;
      const { error: uploadError } = await supabase.storage.from('business-media').upload(path, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('business-media').getPublicUrl(path);
      if (!data?.publicUrl) throw new Error('O Supabase não devolveu o endereço da imagem.');
      setOfficialBackgroundImage(data.publicUrl);
      alert('Imagem carregada. Confirma a pré-visualização antes de publicar.');
    } catch (error) {
      alert('Não foi possível carregar a imagem: ' + (error.message || 'erro desconhecido'));
    } finally { setOfficialImageUploading(false); }
  }

  async function publishOfficialCommunityContent() {
    if (officialSaving) return;
    if (officialKind === 'weekly_question' && !officialBody.trim()) {
      alert('Escreve a descrição da semana.');
      return;
    }
    if (!officialTitle.trim()) {
      alert('Preenche o título antes de publicar.');
      return;
    }

    setOfficialSaving(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const adminId = authData?.user?.id;
      if (authError || !adminId) {
        alert('A sessão administrativa expirou. Entra novamente.');
        return;
      }

      const expiresAt = new Date(Date.now() + officialDuration * 24 * 60 * 60 * 1000).toISOString();

      if (officialKind === 'motivation') {
        const { error } = await supabase.from('community_motivation').insert({
          admin_id: adminId,
          title: officialTitle.trim(),
          content: officialTitle.trim(),
          image_url: null,
          is_active: true,
          background_color: officialBackgroundColor,
          background_gradient: officialBackgroundGradient,
          background_image_url: officialBackgroundImage.trim() || null,
          text_color: officialTextColor,
          font_family: officialFontFamily,
          aspect_ratio: '16:9',
          duration_days: officialDuration,
          expires_at: expiresAt,
        });
        if (error) {
          alert('Não foi possível guardar a motivação em community_motivation: ' + error.message + '. Vamos configurar a política RLS desta tabela a seguir.');
          return;
        }
      } else {
        const now = new Date();
        const { data: activeTheme, error: activeError } = await supabase
          .from('community_monthly_themes')
          .select('id, month_title, week_title, week_description, week_number, starts_at, ends_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeError) {
          alert('Não foi possível consultar o tema atual: ' + activeError.message);
          return;
        }

        const weekNumber = Math.ceil((((now - new Date(now.getFullYear(), 0, 1)) / 86400000) + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7);

        if (officialKind === 'weekly_question') {
          if (!activeTheme) {
            alert('Publica primeiro o tema do mês. Depois poderás definir o título da semana dentro desse tema.');
            return;
          }

          const { error } = await supabase
            .from('community_monthly_themes')
            .update({
              week_title: officialTitle.trim(),
              week_description: officialBody.trim(),
              week_number: weekNumber,
            })
            .eq('id', activeTheme.id);

          if (error) {
            alert('Não foi possível atualizar o título da semana: ' + error.message + '. Vamos configurar a política RLS administrativa a seguir.');
            return;
          }
        } else {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          const { error } = await supabase.from('community_monthly_themes').insert({
            admin_id: adminId,
            month_title: officialTitle.trim(),
            month_description: null,
            week_title: 'Título da semana por definir',
            week_description: null,
            week_number: weekNumber,
            starts_at: now.toISOString(),
            ends_at: expiresAt,
            duration_days: officialDuration,
            is_active: true,
            background_color: officialBackgroundColor,
            background_gradient: officialBackgroundGradient,
            background_image_url: officialBackgroundImage.trim() || null,
            text_color: officialTextColor,
            font_family: officialFontFamily,
          });

          if (error) {
            alert('Não foi possível guardar o tema em community_monthly_themes: ' + error.message + '. Vamos configurar a política RLS desta tabela a seguir.');
            return;
          }
        }
      }

      await loadOfficialArchive();
      setOfficialTitle('');
      setOfficialBody('');
      alert(officialKind === 'motivation'
        ? 'Motivação Talaza guardada na tabela oficial.'
        : officialKind === 'theme'
          ? 'Tema do mês guardado na tabela oficial.'
          : 'Título da semana atualizado na tabela oficial.');
    } finally {
      setOfficialSaving(false);
    }
  }
  async function loadPendingEmailChanges() {
    setEmailChangeLoadError('');
    const { data, error } = await supabase.functions.invoke('talaza-signup-proof', {
      body: { action: 'admin_email_changes_list' }
    });
    if (error || data?.error) {
      const reason = data?.error || error?.message || 'Erro desconhecido';
      console.error('Erro ao carregar trocas de e-mail pendentes:', error || data?.error);
      setEmailChangeLoadError('Não foi possível carregar as trocas de e-mail: ' + reason);
      setEmailChangeRequests([]);
      return;
    }
    setEmailChangeRequests(Array.isArray(data?.items) ? data.items : []);
  }

  async function managePendingEmailChange(userId, action) {
    const isCancel = action === 'admin_email_change_cancel';
    const confirmation = isCancel
      ? 'Cancelar o pedido pendente? O e-mail atual será mantido e os links pendentes serão invalidados.'
      : 'Reenviar o link de confirmação para o novo endereço pedido?';
    if (!window.confirm(confirmation)) return;

    setEmailChangeBusyId(userId + ':' + action);
    setEmailChangeLoadError('');
    try {
      const { data, error } = await supabase.functions.invoke('talaza-signup-proof', {
        body: { action, user_id: userId }
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Não foi possível concluir a operação.');
      alert(data?.message || (isCancel ? 'Pedido cancelado.' : 'Link reenviado.'));
      await loadPendingEmailChanges();
    } catch (operationError) {
      console.error('Erro na gestão de troca de e-mail:', operationError);
      setEmailChangeLoadError(operationError.message || 'Não foi possível concluir a operação.');
    } finally {
      setEmailChangeBusyId('');
    }
  }

  async function loadProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, account_type')
      .order('name', { ascending: true });

    if (error) {
      console.error('Erro ao carregar utilizadores:', error);
      setMessage('Não foi possível carregar a lista de utilizadores: ' + error.message);
      setProfiles([]);
      return;
    }
    setProfiles(data || []);
  }

  async function sendAdminNotification(event) {
    event.preventDefault();
    if (!notificationTitle.trim() || !notificationBody.trim()) {
      alert('Preencha o título e a mensagem da notificação.');
      return;
    }
    if (['user', 'seller_user'].includes(notificationAudience) && !notificationUserId) {
      alert('Escolha o utilizador que vai receber a notificação.');
      return;
    }

    setSendingNotification(true);
    const sellerRoles = ['seller', 'vendedor', 'business'];
    const isSeller = profile => sellerRoles.includes(String(profile.account_type || '').toLowerCase());
    const recipients = ['user', 'seller_user'].includes(notificationAudience)
      ? profiles.filter(profile => profile.id === notificationUserId && (notificationAudience !== 'seller_user' || isSeller(profile)))
      : profiles.filter(profile => notificationAudience === 'all' || (notificationAudience === 'sellers' && isSeller(profile)) || (notificationAudience === 'explorers' && !isSeller(profile)));
    const notificationRows = recipients.flatMap(profile => {
      const base = {
        user_id: profile.id,
        title: notificationTitle.trim(),
        content: notificationBody.trim(),
        type: ['user', 'seller_user'].includes(notificationAudience) ? 'individual' : notificationAudience === 'sellers' ? 'sellers' : notificationAudience === 'explorers' ? 'explorers' : 'general',
      };
      if (notificationAudience === 'all') return [
        { ...base, audience: 'seller', link: '/seller' },
        { ...base, audience: 'explorer', link: '/explore' },
      ];
      const audience = ['sellers', 'seller_user'].includes(notificationAudience)
        ? 'seller'
        : notificationAudience === 'user' && sellerRoles.includes(String(profile.account_type || '').toLowerCase())
          ? 'seller'
          : 'explorer';
      return [{ ...base, audience, link: audience === 'seller' ? '/seller' : '/explore' }];
    });
    const { error } = notificationRows.length
      ? await supabase.from('notifications').insert(notificationRows)
      : { error: new Error('Não existem destinatários para este filtro.') };
    setSendingNotification(false);

    if (error) {
      alert('Não foi possível enviar a notificação. Confirme se criou a tabela notifications e as políticas RLS indicadas: ' + error.message);
      return;
    }

    setNotificationTitle('');
    setNotificationBody('');
    await loadAdminNotifications();
    alert(notificationAudience === 'all' ? 'Notificação geral enviada aos utilizadores autenticados.' : notificationAudience === 'seller_user' ? 'Notificação enviada ao vendedor selecionado.' : notificationAudience === 'user' ? 'Notificação enviada ao utilizador selecionado.' : 'Notificação enviada ao grupo selecionado.');
  }

  async function editSupportMessage(item) {
    const nextMessage = window.prompt('Editar mensagem de suporte:', item.message || '');
    if (nextMessage === null || !nextMessage.trim()) return;
    const { error } = await supabase.from('support_messages').update({ message: nextMessage.trim() }).eq('id', item.id);
    if (error) { alert('Não foi possível editar a mensagem: ' + error.message); return; }
    await loadSupportMessages();
  }

  async function copyText(value) {
    try { if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(String(value || '')); else { const helper = document.createElement('textarea'); helper.value = String(value || ''); helper.style.position = 'fixed'; helper.style.opacity = '0'; document.body.appendChild(helper); helper.select(); const copied = document.execCommand('copy'); helper.remove(); if (!copied) throw new Error('Cópia não suportada pelo navegador.'); } alert('Conteúdo copiado.'); }
    catch (error) { alert('Não foi possível copiar o conteúdo: ' + error.message); }
  }

  async function editAdminNotification(item) {
    const nextTitle = window.prompt('Editar título da notificação:', item.title || ''); if (nextTitle === null || !nextTitle.trim()) return;
    const nextBody = window.prompt('Editar mensagem da notificação:', item.content || item.body || ''); if (nextBody === null || !nextBody.trim()) return;
    const { error } = await supabase.from('notifications').update({ title: nextTitle.trim(), content: nextBody.trim() }).eq('id', item.id);
    if (error) { alert('Não foi possível editar a notificação: ' + error.message); return; } await loadAdminNotifications();
  }

  async function deleteAdminNotification(item) {
    if (!window.confirm('Eliminar esta notificação? Esta ação não pode ser desfeita.')) return;
    setDeletingNotificationId(item.id); const { error } = await supabase.from('notifications').delete().eq('id', item.id); setDeletingNotificationId('');
    if (error) { alert('Não foi possível eliminar a notificação: ' + error.message); return; } await loadAdminNotifications();
  }

  async function deleteSupportMessage(item) {
    if (!window.confirm('Eliminar esta mensagem de suporte? Esta ação não pode ser desfeita.')) return;
    setDeletingSupportId(item.id);
    const { error } = await supabase.from('support_messages').delete().eq('id', item.id);
    setDeletingSupportId('');
    if (error) { alert('Não foi possível eliminar a mensagem: ' + error.message); return; }
    await loadSupportMessages();
  }

  async function deletePaymentProof(request) {
    if (!window.confirm('Eliminar este registo de comprovativo da lista administrativa? O pagamento não será apagado do histórico contabilístico.')) return;
    setDeletingPaymentId(request.id);
    try {
      const paths = getPaymentProofPaths(request);
      const storagePaths = [paths.image, paths.file].filter(Boolean).filter(path => !/^https?:\/\//i.test(path));
      if (storagePaths.length) {
        const { error: storageError } = await supabase.storage.from('payment-proofs').remove(storagePaths);
        if (storageError) throw storageError;
      }
      const { error } = await supabase.from('payment_submissions').delete().eq('id', request.id);
      if (error) throw error;
      await loadSubscriptionRequests();
      alert('Comprovativo eliminado.');
    } catch (error) {
      alert('Não foi possível eliminar o comprovativo: ' + (error.message || 'erro desconhecido') + '. Confirma as permissões administrativas no Supabase.');
    } finally { setDeletingPaymentId(''); }
  }

  async function markSupportReviewed(item) {
    const { error } = await supabase
      .from('support_messages')
      .update({ status: 'reviewed' })
      .eq('id', item.id);
    if (error) {
      alert('Não foi possível atualizar a mensagem de suporte: ' + error.message);
      return;
    }
    await loadSupportMessages();
  }

  async function reviewCommunityPost(post, approved) {
    const rejectionReason = approved ? '' : window.prompt('Indique o motivo da recusa desta publicação da Comunidade Talaza:');
    if (!approved && (!rejectionReason || !rejectionReason.trim())) return;
    if (reviewingPostId) return;
    setReviewingPostId(post.id);
    const nextModerationStatus = approved ? 'approved' : 'rejected';
    const nextStatus = approved ? 'published' : 'rejected';

    const { data: updatedRows, error } = await supabase
      .from('community_posts')
      .update({
        moderation_status: nextModerationStatus,
        status: nextStatus,
      })
      .eq('id', post.id)
      .eq('moderation_status', 'pending')
      .select('id');

    if (error) {
      setReviewingPostId('');
      alert('A publicação não foi atualizada no Supabase. Verifique as permissões RLS de community_posts: ' + error.message);
      return;
    }

    if (!updatedRows || updatedRows.length === 0) {
      setReviewingPostId('');
      alert('O Supabase não confirmou nenhuma alteração. A política RLS pode estar a bloquear a aprovação ou a publicação já não está pendente.');
      return;
    }

    await notifyUser(post.user_id, approved ? 'Publicação aprovada na Comunidade Talaza' : 'Publicação recusada na Comunidade Talaza', approved ? 'A sua publicação foi aprovada e já pode aparecer na Comunidade Talaza.' : 'A sua publicação foi recusada. Motivo: ' + rejectionReason.trim(), 'community_review');
    await loadPendingCommunityPosts();
    setReviewingPostId('');
  }

  async function reviewReport(report, status) {
    const { error } = await supabase
      .from('community_reports')
      .update({ status })
      .eq('id', report.id);
    if (error) {
      alert('Não foi possível atualizar a denúncia: ' + error.message);
      return;
    }
    await loadCommunityReports();
  }

  async function openProof(path) {
    if (!path) return;
    const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      alert('Não foi possível abrir o comprovativo. Confirme as permissões do armazenamento payment-proofs.');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  function getPaymentAreaLabel(request) {
    const explicitArea = String(
      request?.area ||
      request?.area_name ||
      request?.platform_area ||
      request?.service_type ||
      request?.payment_for ||
      ''
    ).toLowerCase();

    if (request?.premium_promotion_id) return 'Destaques Premium';
    if (request?.plan_id === OPPORTUNITY_ACCESS_PLAN_ID) return 'Acesso às Oportunidades';
    if (request?.event_id || explicitArea.includes('evento')) return 'Eventos';
    if (request?.job_post_id || request?.opportunity_id || explicitArea.includes('oportunidade') || explicitArea.includes('vaga')) return 'Oportunidades';
    if (request?.business_id || explicitArea.includes('vitrine') || explicitArea.includes('hospedagem')) return 'Vitrine / Hospedagem';
    return 'Área por identificar';
  }

  async function reviewPayment(request, approved, rejectionReasonOverride = '') {
    if (String(request?.plan_id || '').toLowerCase() === OPPORTUNITY_ACCESS_PLAN_ID.toLowerCase()) {
      alert('Os pagamentos de acesso às Oportunidades estão suspensos nesta fase. Esta funcionalidade será configurada futuramente.');
      return;
    }
    let rejectionReason = '';
    if (!approved && !rejectionReasonOverride) {
      setRejectionModalPayment(request);
      setPaymentRejectionReasons([]);
      setPaymentRejectionOther('');
      return;
    }
    if (!approved) rejectionReason = String(rejectionReasonOverride || '').trim();
    if (reviewingPaymentId) return;
    if (approved && String(request.status || '').toLowerCase() !== 'pending') {
      alert('Este pagamento já foi analisado. Não é permitido acrescentar novamente os dias deste pagamento.');
      return;
    }

    if (approved && String(request.payment_method || '').trim().toLowerCase() === 'express') {
      const senderPhone = String(request.express_sender_phone || '').replace(/\s+/g, '');
      if (!/^\+2449\d{8}$/.test(senderPhone)) {
        alert('Não é possível confirmar este pagamento Express: falta um número de remetente válido (+244 9XX XXX XXX).');
        return;
      }
      const { data: planRow, error: planCheckError } = await supabase
        .from('plans').select('price').eq('id', request.plan_id).maybeSingle();
      if (planCheckError || !planRow || Number(planRow.price) !== Number(request.amount)) {
        alert('Não é possível confirmar este pagamento Express: o valor enviado não corresponde ao valor do plano.');
        return;
      }
      if (!window.confirm('Confirma que verificou no extrato Express que o número ' + senderPhone + ' enviou exatamente ' + Number(request.amount).toLocaleString('pt-AO') + ' Kz? Só confirme se número e valor coincidirem.')) return;
    }
    setReviewingPaymentId(request.id);
    const nextStatus = approved ? 'approved' : 'rejected';
    const reviewedAt = new Date().toISOString();

    const { data: updatedPayment, error: paymentError } = await supabase
      .from('payment_submissions')
      .update({
        status: nextStatus,
        reviewed_at: reviewedAt,
        notes: approved ? (request.notes || null) : rejectionReason.trim(),
      })
      .eq('id', request.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (paymentError || !updatedPayment) {
      setReviewingPaymentId('');
      alert('Não foi possível atualizar o pagamento. Confirme as políticas RLS de payment_submissions: ' + (paymentError?.message || 'Nenhuma linha foi alterada.'));
      return;
    }

    if (!approved && request.business_id) {
      const { error: sellerStatusError } = await supabase.from('seller_status').upsert({
        seller_id: request.user_id, status: 'rejected',
        reject_reason: rejectionReason.trim(), updated_at: reviewedAt
      }, { onConflict: 'seller_id' });
      if (sellerStatusError) console.error('Não foi possível atualizar seller_status após recusa:', sellerStatusError.message);
      const { error: businessReviewError } = await supabase.from('businesses')
        .update({ approval_status: 'rejected', is_active: false })
        .eq('id', request.business_id).eq('owner_id', request.user_id);
      if (businessReviewError) console.error('Não foi possível atualizar o estado do perfil após recusa:', businessReviewError.message);
    }

    let activationMessage = '';
    const areaLabel = getPaymentAreaLabel(request);

    if (request.premium_promotion_id) {
      const { data: promotion, error: promotionReadError } = await supabase.from('premium_promotions').select('id,user_id,plan_id').eq('id', request.premium_promotion_id).maybeSingle();
      if (promotionReadError || !promotion) {
        activationMessage = ' Não foi possível localizar a publicação Destaque Premium: ' + (promotionReadError?.message || 'registo não encontrado.');
      } else if (approved) {
        const { data: plan, error: planError } = await supabase.from('plans').select('duration_days').eq('id', promotion.plan_id || request.plan_id).maybeSingle();
        const durationDays = Number(plan?.duration_days) || 0;
        if (planError || durationDays <= 0) activationMessage = ' O pagamento foi aprovado, mas a duração do plano Premium não está configurada.';
        else {
          const startsAt = new Date();
          const expiresAt = new Date(startsAt.getTime() + durationDays * 86400000).toISOString();
          const { error: updateError } = await supabase.from('premium_promotions').update({ status: 'active', starts_at: startsAt.toISOString(), expires_at: expiresAt, payment_submission_id: request.id }).eq('id', promotion.id);
          if (updateError) activationMessage = ' O pagamento foi aprovado, mas não foi possível ativar o Destaque Premium: ' + updateError.message;
          else {
            activationMessage = ' O Destaque Premium está ativo até ' + new Date(expiresAt).toLocaleDateString('pt-AO') + '.';
            await notifyUser(promotion.user_id || request.user_id, 'Destaque Premium aprovado — Talaza', 'O seu Destaque Premium foi aprovado e já está ativo.', 'payment_review');
          }
        }
      } else {
        const { error: updateError } = await supabase.from('premium_promotions').update({ status: 'rejected' }).eq('id', promotion.id);
        if (updateError) activationMessage = ' O comprovativo foi recusado, mas não foi possível atualizar a publicação: ' + updateError.message;
        else await notifyUser(promotion.user_id || request.user_id, 'Destaque Premium recusado — Talaza', 'O comprovativo do seu Destaque Premium foi recusado. Motivo: ' + rejectionReason.trim(), 'payment_review');
      }
    }

    if (approved && request.business_id && request.plan_id) {
      activationMessage = ' Pagamento aprovado. A Hospedagem e o perfil só são ativados em conjunto através de “Aprovar Pagamento + Perfil”.';
    }

    if (approved && request.event_id) {
      const { data: event, error: eventReadError } = await supabase
        .from('events')
        .select('id, user_id, admin_approved')
        .eq('id', request.event_id)
        .maybeSingle();

      if (eventReadError || !event) {
        activationMessage += ' O pagamento foi aprovado, mas o evento associado não foi encontrado.';
      } else {
        const eventPatch = { payment_status: 'paid' };
        if (event.admin_approved === true) eventPatch.status = 'published';
        const { error: eventUpdateError } = await supabase.from('events').update(eventPatch).eq('id', event.id);
        if (eventUpdateError) activationMessage += ' O pagamento foi aprovado, mas não foi possível atualizar o evento: ' + eventUpdateError.message;
        else {
          activationMessage += event.admin_approved === true
            ? ' O evento foi publicado após confirmação do pagamento.'
            : ' O pagamento está confirmado; o evento ainda precisa de aprovação administrativa.';
          await notifyUser(event.user_id || request.user_id, 'Pagamento de evento aprovado — Talaza', event.admin_approved === true ? 'O pagamento foi confirmado e o evento foi publicado.' : 'O pagamento foi confirmado. O evento ainda aguarda aprovação administrativa.', 'payment_review');
        }
      }
    }
    
    // Este pagamento compra acesso às oportunidades (não paga a publicação de uma vaga).
    if (request.plan_id === OPPORTUNITY_ACCESS_PLAN_ID) {
      if (approved) {
        const [{ data: plan, error: planError }, { data: profile, error: profileError }] = await Promise.all([
          supabase.from('plans').select('id, duration_days, is_active, plan_type, area')
            .eq('id', request.plan_id).maybeSingle(),
          supabase.from('profiles').select('country_id, province_id')
            .eq('id', request.user_id).maybeSingle(),
        ]);
        const durationDays = Number(plan?.duration_days) || 0;
        const validPlan = plan && plan.is_active === true &&
          String(plan.plan_type || '').trim().toLowerCase() === 'opportunities' &&
          String(plan.area || '').trim().toLowerCase() === 'oportunidades';
        if (planError || profileError || !validPlan || durationDays <= 0) {
          activationMessage += ' O pagamento foi aprovado, mas não foi possível validar o plano, a duração ou a localização da conta.';
        } else {
          const { data: existing, error: readError } = await supabase
            .from('user_plan_subscriptions')
            .select('id, starts_at, expires_at, status')
            .eq('user_id', request.user_id)
            .eq('plan_id', request.plan_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (readError) {
            activationMessage += ' O pagamento foi aprovado, mas não foi possível consultar o acesso anterior: ' + readError.message;
          } else {
            const now = new Date();
            const previousExpiry = existing?.expires_at ? new Date(existing.expires_at) : null;
            const baseDate = previousExpiry && !Number.isNaN(previousExpiry.getTime()) && previousExpiry > now
              ? previousExpiry : now;
            const expiresAt = new Date(baseDate.getTime() + durationDays * 86400000).toISOString();
            const subscriptionData = {
              user_id: request.user_id,
              plan_id: request.plan_id,
              country_id: request.country_id || profile?.country_id || null,
              province_id: request.province_id || profile?.province_id || null,
              status: 'active',
              starts_at: existing?.starts_at || now.toISOString(),
              expires_at: expiresAt,
            };
            const result = existing?.id
              ? await supabase.from('user_plan_subscriptions').update(subscriptionData).eq('id', existing.id).select('id').maybeSingle()
              : await supabase.from('user_plan_subscriptions').insert(subscriptionData).select('id').maybeSingle();
            if (result.error || !result.data) {
              activationMessage += ' O pagamento foi aprovado, mas não foi possível ativar o acesso às Oportunidades: ' + (result.error?.message || 'O Supabase não confirmou a assinatura.');
            } else {
              activationMessage += ' O acesso às Oportunidades está ativo até ' + new Date(expiresAt).toLocaleDateString('pt-AO') + '.';
            }
          }
        }
      } else {
        activationMessage += ' O pedido de acesso às Oportunidades foi recusado.';
      }
    }


    const opportunityId = request.job_post_id || request.opportunity_id || null;
    if (approved && opportunityId) {
      const { data: opportunity, error: opportunityReadError } = await supabase
        .from('job_posts')
        .select('id, user_id, admin_approved')
        .eq('id', opportunityId)
        .maybeSingle();

      if (opportunityReadError || !opportunity) {
        activationMessage += ' O pagamento foi aprovado, mas a oportunidade associada não foi encontrada.';
      } else {
        const opportunityPatch = { payment_status: 'approved' };
        if (opportunity.admin_approved === true) {
          opportunityPatch.status = 'published';
          opportunityPatch.is_active = true;
        }
        const { error: opportunityUpdateError } = await supabase.from('job_posts').update(opportunityPatch).eq('id', opportunity.id);
        if (opportunityUpdateError) {
          activationMessage += ' O pagamento foi aprovado, mas não foi possível atualizar a oportunidade: ' + opportunityUpdateError.message;
        } else {
          activationMessage += opportunity.admin_approved === true
            ? ' A oportunidade foi publicada após confirmação do pagamento.'
            : ' O pagamento está confirmado; a oportunidade ainda precisa de aprovação administrativa.';
          await notifyUser(opportunity.user_id || request.user_id, 'Pagamento de oportunidade aprovado — Talaza', opportunity.admin_approved === true ? 'O pagamento foi confirmado e a oportunidade foi publicada.' : 'O pagamento foi confirmado. A oportunidade ainda aguarda aprovação administrativa.', 'payment_review');
        }
      }
    }

    if (!approved && request.event_id) {
      const { error: eventBlockError } = await supabase.from('events')
        .update({ status:'pending_payment', payment_status:'pending' }).eq('id',request.event_id);
      if (eventBlockError) activationMessage += ' O evento não pôde ser bloqueado automaticamente; verifique a área de Eventos.';
    }

    if (!approved && request.plan_id === OPPORTUNITY_ACCESS_PLAN_ID) {
      const { error: opportunityBlockError } = await supabase.from('user_plan_subscriptions')
        .update({ status:'inactive' }).eq('user_id',request.user_id).eq('plan_id',request.plan_id);
      if (opportunityBlockError) activationMessage += ' O acesso às Oportunidades não pôde ser bloqueado automaticamente.';
    }

    if (!approved && request.business_id) {
      const { error: deactivateError } = await supabase.from('businesses').update({ is_active: false }).eq('id', request.business_id);
      if (deactivateError) console.error('O comprovativo foi recusado, mas não foi possível desativar o perfil:', deactivateError.message);
    }

    const notificationTitle = approved ? 'Pagamento aprovado' : 'Pagamento rejeitado';
    const rejectionLink = !approved && request.business_id
      ? '/seller-reenvio?business=' + encodeURIComponent(request.business_id) + '&payment=' + encodeURIComponent(request.id)
      : null;
    const notificationBody = approved
      ? 'O seu pagamento para ' + areaLabel + ' foi aprovado.' + activationMessage
      : 'Motivos: ' + rejectionReason.split('\\n').filter(Boolean).join(' + ') + (paymentRejectionOther.trim() ? '\\nTexto do admin: ' + paymentRejectionOther.trim() : '') + '\\nCorrige os dados e envia um novo comprovativo.';
    const paymentAudience = (request.business_id || request.premium_promotion_id) ? 'seller' : 'explorer';
    const notificationResult = await notifyUser(request.user_id, notificationTitle, notificationBody, 'payment_review', request.id, paymentAudience, rejectionLink);

    await loadSubscriptionRequests();
    await loadBusinesses();
    await loadEvents();
    await loadJobPosts();
    setReviewingPaymentId('');
    if (!notificationResult.ok) {
      alert((approved ? 'Pagamento aprovado' : 'Pagamento recusado') + ', mas a notificação não foi enviada: ' + notificationResult.error);
    } else {
      alert(approved ? 'Pagamento aprovado.' + activationMessage : 'Pagamento recusado e notificação enviada ao utilizador.');
    }
  }

  async function confirmPaymentRejection() {
    if (!rejectionModalPayment || reviewingPaymentId) return;
    const reasons = paymentRejectionReasons.slice();
    const other = paymentRejectionOther.trim();
    if (!reasons.length || (reasons.includes('Outro motivo') && !other)) return;
    const reasonText = reasons.map(reason => reason === 'Outro motivo' ? 'Outro motivo: ' + other : reason).join('\\n');
    await reviewPayment(rejectionModalPayment, false, reasonText);
    setRejectionModalPayment(null);
    setPaymentRejectionReasons([]);
    setPaymentRejectionOther('');
  }

  async function refreshAdminData() {
    if (refreshing) return;
    setRefreshing(true);
    await Promise.all([
      loadBusinesses(),
      loadVendorPlanRows(),
      loadPaymentResubmissions(),
      loadSubscriptionRequests(),
      loadGirassolReactivations(),
      loadCommunityReports(),
      loadPendingCommunityPosts(),
      loadSupportMessages(),
      loadAdminNotifications(),
      loadProfiles(),
      loadPendingEmailChanges(),
      loadEvents(),
      loadJobPosts(),
    ]);
    setRefreshing(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  const pendingBusinessCount = businesses.filter((business) => String(business.approval_status || 'pending').toLowerCase() === 'pending').length;
  const filteredBusinesses = businesses.filter((business) => businessFilter === 'all' || String(business.approval_status || 'pending').toLowerCase() === businessFilter);

  if (ADMIN_READ_ONLY) {
    return (
      <main style={styles.center}>
        <section style={styles.restricted}>
          <div style={styles.logo}>T</div>
          <h1 style={{ margin: '0 0 12px', color: '#12332D' }}>Administração temporariamente em pausa</h1>
          <p style={{ color: '#52635E', lineHeight: 1.6 }}>
            A área administrativa da versão Dev está temporariamente em modo de segurança para proteger os dados reais da Talaza.
            As operações administrativas serão reativadas quando a versão Dev tiver uma base Supabase independente.
          </p>
          <p style={{ color: '#8A6500', fontWeight: 700, marginBottom: 0 }}>A produção (Main) não foi alterada.</p>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main style={styles.center}>
        <p>A verificar acesso...</p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main style={styles.center}>
        <div style={styles.restricted}>
          <div style={styles.logo}>T</div>

          <h1>Acesso restrito</h1>

          <p>
            Esta área é exclusiva para administradores da Talaza.
          </p>

          {message && (
            <p style={styles.error}>
              {message}
            </p>
          )}

          <button
            style={styles.button}
            onClick={() => router.push('/')}
          >
            Voltar à Talaza
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>

      <header style={styles.header}>
        <div>
          <div style={styles.brand}>TALAZA</div>
          <div style={styles.subtitle}>
            Painel de administração
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={refreshAdminData} disabled={refreshing} style={{ ...styles.logout, opacity: refreshing ? .65 : 1 }}>
            {refreshing ? 'A atualizar…' : 'Atualizar painel'}
          </button>
          <button
            onClick={logout}
            style={styles.logout}
          >
            Terminar sessão
          </button>
        </div>
      </header>

      <section style={styles.content}>

        <div id="vendedores" style={styles.titleRow}>
          <div>
            <h1 style={styles.title}>
              Administração
            </h1>

            <p style={styles.description}>
              Gerencie os perfis de negócio enviados para validação.
            </p>
          </div>

          <nav aria-label="Secções do painel administrativo" style={{ display: 'flex', flexWrap: 'wrap', overflow: 'visible', gap: 10, margin: '0 -4px 10px', padding: '8px 4px 14px' }}>
            {[
              ['vendedores', 'Vendedores', pendingBusinessCount],
              ['trocas-email', 'Trocas de e-mail pendentes', emailChangeRequests.filter(item => item.status === 'Pendente - Por confirmar').length],
              ['pagamentos', 'Pagamentos e hospedagem', subscriptionRequests.filter(item => String(item.status || '').toLowerCase() === 'pending' && !item.premium_promotion_id && (item.business_id || item.event_id || item.job_post_id)).length],
              ['reenvios', 'Reenvios', resubmissions.filter(item => String(item.status || '').toLowerCase() === 'pending').length],
              ['acessos-oportunidades', 'Acessos às Oportunidades', subscriptionRequests.filter(item => String(item.plan_id || '').trim().toLowerCase() === OPPORTUNITY_ACCESS_PLAN_ID.toLowerCase() && String(item.status || '').trim().toLowerCase() === 'pending').length],
              ['girassol', 'Reactivação Girassol', girassolReactivations.filter(item => String(item.status || '').toLowerCase() === 'pending').length],
              ['destaques-premium', 'Destaques Premium', subscriptionRequests.filter(item => item.premium_promotion_id && String(item.status || '').toLowerCase() === 'pending').length],
              ['eventos', 'Eventos', events.filter(item => String(item.status || '').toLowerCase() === 'pending_payment').length],
              ['oportunidades', 'Vagas por aprovar', jobPosts.filter(item => ['pending','pending_review'].includes(String(item.status || '').toLowerCase())).length],
              ['comunidade', 'Comunidade Talaza', communityPosts.filter(item => String(item.moderation_status || 'pending').toLowerCase() === 'pending').length],
              ['suporte', 'Suporte Talaza', supportMessages.filter(item => String(item.status || 'pending').toLowerCase() === 'pending').length],
              ['notificacoes', 'Notificações', adminNotifications.length],
              ['denuncias', 'Denúncias da Comunidade', communityReports.filter(item => String(item.status || 'pending').toLowerCase() === 'pending').length],
              ['conteudo-oficial', 'Motivação e tema do mês', officialArchive.length]
            ].map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveAdminSection(key);
                  if (key === 'reenvios') loadPaymentResubmissions();
                }}
                aria-pressed={activeAdminSection === key}
                style={{
                  order: key === 'vendedores' ? 0 : key === 'pagamentos' ? 1 : key === 'reenvios' ? 2 : 3,
                  flex: '0 0 auto',
                  alignItems: 'center',
                  gap: 10,
                  padding: '13px 18px',
                  borderRadius: 999,
                  border: key === 'reenvios' ? '2px solid #C62828' : activeAdminSection === key ? '3px solid #D8A319' : '1px solid #D5E4DF',
                  background: activeAdminSection === key ? '#075B4E' : key === 'reenvios' ? '#FFF5F5' : '#E4F0ED',
                  color: activeAdminSection === key ? '#FFFFFF' : key === 'reenvios' ? '#9E1B1B' : '#075B4E',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                  scrollSnapAlign: 'start',
                  boxShadow: activeAdminSection === key ? '0 0 0 2px rgba(216,163,25,.18)' : 'none'
                }}
              >
                {label}
                {(key === 'reenvios' || Number(count) > 0) && (
                  <span
                    style={{
                      minWidth: 25,
                      height: 25,
                      padding: '0 7px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 999,
                      background: key === 'reenvios' ? '#C62828' : activeAdminSection === key ? '#D8A319' : '#FFF0B8',
                      color: key === 'reenvios' ? '#FFFFFF' : '#075B4E',
                      fontWeight: 900
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            ))}

          </nav>
          <p style={{ margin: '0 0 24px', color: '#64756F', fontSize: 13, textAlign: 'center' }}>→ Deslize para ver mais áreas</p>
          <div style={styles.counter}>
            {pendingBusinessCount} pendente
            {pendingBusinessCount !== 1 ? 's' : ''}
          </div>
        </div>

        <div style={{ display: activeAdminSection === 'vendedores' ? 'block' : 'none' }}>
        <section style={{marginBottom:26,padding:18,border:'1px solid #D5E4DF',borderRadius:18,background:'#F8FBF9'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
            <div><h2 style={{margin:'0 0 5px',color:'#12332D'}}>Planos e validade dos vendedores</h2><p style={{margin:0,color:'#64756F',fontSize:13}}>Contagem regressiva baseada exclusivamente na data de fim da assinatura.</p></div>
            <button type="button" onClick={loadVendorPlanRows} style={{padding:'9px 13px',borderRadius:9,border:'1px solid #BFD4CC',background:'#FFFFFF',color:'#075B4E',fontWeight:800}}>Atualizar lista</button>
          </div>
          <div role="group" aria-label="Filtrar validade dos planos" style={{display:'flex',gap:8,flexWrap:'wrap',margin:'15px 0'}}>
            {[
              ['all','Todos',vendorPlanRows.length],
              ['active','Ativos',vendorPlanRows.filter(row=>row.status==='active').length],
              ['expired','Expirados',vendorPlanRows.filter(row=>row.status==='expired').length],
              ['expiring','A expirar em 7 dias',vendorPlanRows.filter(row=>row.status==='expiring').length]
            ].map(([value,label,count])=><button key={value} type="button" onClick={()=>setVendorPlanFilter(value)} style={{padding:'8px 12px',borderRadius:999,border:vendorPlanFilter===value?'2px solid #D8A319':'1px solid #D5E4DF',background:vendorPlanFilter===value?'#075B4E':'#FFFFFF',color:vendorPlanFilter===value?'#FFFFFF':'#075B4E',fontWeight:800}}>{label} ({count})</button>)}
          </div>
          {vendorPlanRows.filter(row=>vendorPlanFilter==='all'||row.status===vendorPlanFilter).length===0
            ? <p style={{padding:14,background:'#FFFFFF',borderRadius:12,color:'#64756F'}}>Não existem vendedores nesta categoria.</p>
            : <div style={{display:'grid',gap:10}}>
              {vendorPlanRows.filter(row=>vendorPlanFilter==='all'||row.status===vendorPlanFilter).map(row=>{
                const expanded=expandedVendorId===row.id;
                const badgeColor=row.status==='expired'?'#B42318':row.status==='expiring'?'#9A6700':'#17643B';
                const badgeBg=row.status==='expired'?'#FDECEC':row.status==='expiring'?'#FFF5D6':'#E6F5EC';
                return <article key={row.id} style={{padding:14,border:'1px solid #E1E9E5',borderRadius:14,background:'#FFFFFF'}}>
                  <button type="button" onClick={()=>setExpandedVendorId(expanded?'':row.id)} aria-expanded={expanded} style={{width:'100%',display:'grid',gridTemplateColumns:'minmax(0,1fr) auto',gap:12,alignItems:'center',textAlign:'left',border:0,background:'transparent',padding:0,cursor:'pointer',color:'#173B35'}}>
                    <span style={{minWidth:0}}>
                      <strong style={{display:'block',fontSize:15}}>{row.name||'Negócio sem nome'}</strong>
                      <span style={{display:'block',fontSize:12,color:'#64756F',marginTop:4}}>{row.phone||'Sem telefone'} · {row.provinces?.name||'Província não indicada'}</span>
                      <span style={{display:'block',fontSize:12,marginTop:5}}>{row.planName} · Início: {row.subscription?.starts_at?new Date(row.subscription.starts_at).toLocaleDateString('pt-AO'):'—'} · Fim: {row.subscription?.expires_at?new Date(row.subscription.expires_at).toLocaleDateString('pt-AO'):'—'}</span>
                    </span>
                    <span style={{textAlign:'right'}}>
                      <strong style={{display:'block',fontSize:22,color:badgeColor}}>{row.remainingDays}</strong>
                      <span style={{fontSize:11,color:badgeColor,fontWeight:900}}>{row.status==='expired'?'EXPIRADO - INATIVO':row.status==='expiring'?'A EXPIRAR':'ATIVO'}</span>
                      <span style={{display:'block',fontSize:11,color:'#64756F',marginTop:5}}>{expanded?'Fechar histórico ▲':'Ver histórico ▼'}</span>
                    </span>
                  </button>
                  {expanded&&<div style={{marginTop:13,paddingTop:12,borderTop:'1px solid #E7EEEA'}}>
                    <strong style={{fontSize:13,color:'#173B35'}}>Histórico de pagamentos aprovados</strong>
                    {row.history.length===0?<p style={{fontSize:12,color:'#64756F'}}>Ainda não há pagamentos aprovados registados.</p>:<div style={{display:'grid',gap:7,marginTop:8}}>
                      {row.history.map(payment=><div key={payment.id} style={{display:'flex',justifyContent:'space-between',gap:10,fontSize:12,color:'#42534C'}}><span>{payment.planName} · {payment.created_at?new Date(payment.created_at).toLocaleDateString('pt-AO'):'—'}</span><strong>+{payment.durationDays} dias</strong></div>)}
                    </div>}
                    <div style={{marginTop:10,padding:10,borderRadius:9,background:'#F2F7F4',fontSize:12,color:'#173B35'}}><strong>Total de dias contratados no histórico: {row.historyTotalDays}</strong></div>
                    <div style={{marginTop:7,fontSize:11,color:'#64756F',wordBreak:'break-all'}}>Negócio ID: {row.id} · Vendedor ID: {row.owner_id}</div>
                  </div>}
                </article>;
              })}
            </div>}
        </section>
        <div role="group" aria-label="Filtrar vendedores por estado" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {[
            ['pending', 'Pendentes', pendingBusinessCount],
            ['approved', 'Aprovados', businesses.filter((business) => String(business.approval_status || '').toLowerCase() === 'approved').length],
            ['rejected', 'Rejeitados', businesses.filter((business) => String(business.approval_status || '').toLowerCase() === 'rejected').length],
            ['all', 'Todos', businesses.length],
          ].map(([value, label, count]) => <button key={value} type="button" onClick={() => setBusinessFilter(value)} aria-pressed={businessFilter === value} style={{ padding: '9px 14px', borderRadius: 999, border: businessFilter === value ? '2px solid #D8A319' : '1px solid #D5E4DF', background: businessFilter === value ? '#075B4E' : '#FFFFFF', color: businessFilter === value ? '#FFFFFF' : '#075B4E', fontWeight: 800, cursor: 'pointer' }}>{label} ({count})</button>)}
        </div>
        {message && (
          <div style={styles.errorBox}>
            {message}
          </div>
        )}

        {filteredBusinesses.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>✓</div>

            <h2>{businessFilter === 'pending' ? 'Nenhum perfil pendente' : businessFilter === 'approved' ? 'Nenhum perfil aprovado' : businessFilter === 'rejected' ? 'Nenhum perfil rejeitado' : 'Nenhum perfil registado'}</h2>

            <p>
              {businessFilter === 'pending' ? 'Não existem negócios aguardando validação neste momento.' : 'Não existem negócios nesta categoria.'}
            </p>
          </div>
        ) : (
          <div style={styles.list}>

            {filteredBusinesses.map((business) => (

              <article
                key={business.id}
                style={styles.card}
              >

                <div style={styles.cardTop}>

                  {business.logo_url ? (
                    <img
                      src={business.logo_url}
                      alt=""
                      style={styles.logoImage}
                    />
                  ) : (
                    <div style={styles.logoPlaceholder}>
                      {business.name?.charAt(0)?.toUpperCase() || 'T'}
                    </div>
                  )}

                  <div style={{ flex: 1 }}>
                    <h2 style={styles.businessName}>
                      {business.name}
                    </h2>

                    <div style={styles.meta}>
                      {business.categories?.name || 'Sem categoria'}
                      {' · '}
                      {business.subcategories?.name || 'Sem subcategoria'}
                    </div>
                  </div>

                  <span style={String(business.approval_status || 'pending').toLowerCase() === 'pending' ? styles.pending : styles.paymentStatus}>
                    {String(business.approval_status || 'pending').toLowerCase() === 'approved' ? 'Aprovado' : String(business.approval_status || 'pending').toLowerCase() === 'rejected' ? 'Rejeitado' : 'Pendente'}
                  </span>

                </div>

                <div style={styles.details}>

                  <p>
                    <strong>Responsável:</strong>{' '}
                    {profiles.find(profile => profile.id === business.owner_id)?.name || 'Nome não disponível'}
                  </p>
                  <p>
                    <strong>ID interno do responsável:</strong>{' '}
                    {business.owner_id || '—'}
                  </p>
                  <p>
                    <strong>Localização:</strong>{' '}
                    {business.countries?.name || '-'}
                    {' · '}
                    {business.provinces?.name || '-'}
                  </p>

                  <p>
                    <strong>Município:</strong>{' '}
                    {business.municipality || '-'}
                  </p>

                  <p>
                    <strong>Bairro:</strong>{' '}
                    {business.neighborhood || '-'}
                  </p>

                  {business.description && (
                    <p>
                      <strong>Descrição:</strong>{' '}
                      {business.description}
                    </p>
                  )}

                  {business.phone && (
                    <p>
                      <strong>Telefone:</strong>{' '}
                      {business.phone}
                    </p>
                  )}

                  {business.whatsapp && (
                    <p>
                      <strong>Contacto:</strong>{' '}
                      {business.whatsapp}
                    </p>
                  )}

                  {business.email && (
                    <p>
                      <strong>Email:</strong>{' '}
                      {business.email}
                    </p>
                  )}

                </div>

                {String(business.approval_status || 'pending').toLowerCase() === 'pending' && <div style={styles.actions}>
                  {subscriptionRequests.some(request => request.business_id === business.id && ['pending','submitted'].includes(String(request.status||'').toLowerCase()) && request.plan_id) && <button type="button" disabled={Boolean(updatingBusinessId)} style={{...styles.approve,background:'#075B4E',opacity:updatingBusinessId?.6:1}} onClick={()=>approveHostingAndProfile(business)}>{updatingBusinessId===business.id?'A aprovar…':'✅ Aprovar Pagamento + Perfil'}</button>}
                  <button style={styles.reject} onClick={() => updateBusiness(business.id, 'rejected')}>Recusar</button>
                  <button style={styles.approve} onClick={() => updateBusiness(business.id, 'approved')}>Aprovar só perfil</button>
                </div>}

              </article>

            ))}

          </div>
        )}

        </div>

        <section id="trocas-email" style={{ marginTop: 0, display: activeAdminSection === 'trocas-email' ? 'block' : 'none' }}>
          <div style={styles.titleRow}>
            <div>
              <h2 style={styles.title}>Trocas de e-mail pendentes</h2>
              <p style={styles.description}>Acompanhe os pedidos de alteração do e-mail de acesso. A confirmação final continua a ser feita exclusivamente pelo titular através do link enviado ao novo endereço.</p>
            </div>
            <div style={styles.counter}>{emailChangeRequests.filter(item => item.status === 'Pendente - Por confirmar').length} pendente(s)</div>
          </div>
          {emailChangeLoadError && <div style={styles.errorBox}>{emailChangeLoadError}</div>}
          {emailChangeRequests.length === 0
            ? <div style={styles.empty}><h3>Nenhuma troca pendente.</h3><p>Quando um utilizador pedir para alterar o e-mail, o pedido aparecerá aqui.</p></div>
            : <div style={styles.list}>{emailChangeRequests.map(item => {
                const pending = item.status === 'Pendente - Por confirmar';
                const resendKey = item.user_id + ':admin_email_change_resend';
                const cancelKey = item.user_id + ':admin_email_change_cancel';
                return (
                  <article key={item.user_id} style={styles.card}>
                    <div style={styles.cardTop}>
                      <div style={styles.logoPlaceholder}>@</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={styles.businessName}>{item.business_name || item.user_name || 'Utilizador Talaza'}</h3>
                        <div style={styles.meta}>{item.business_name ? 'Utilizador: ' + (item.user_name || 'Nome não disponível') : 'Conta de utilizador'} · {item.requested_at ? new Date(item.requested_at).toLocaleString('pt-AO') : 'Data não disponível'}</div>
                      </div>
                      <span style={pending ? styles.pending : styles.paymentStatus}>{item.status || 'Pendente - Por confirmar'}</span>
                    </div>
                    <div style={styles.details}>
                      <p><strong>user_id:</strong> <span style={{ wordBreak: 'break-all' }}>{item.user_id}</span></p>
                      <p><strong>E-mail atual:</strong> {item.current_email || '—'}</p>
                      <p><strong>E-mail novo pedido:</strong> {item.pending_email || '—'}</p>
                      <p><strong>Data do pedido:</strong> {item.requested_at ? new Date(item.requested_at).toLocaleString('pt-AO') : 'Data não disponível'}</p>
                      <p><strong>Estado:</strong> {item.status || 'Pendente - Por confirmar'}</p>
                    </div>
                    {pending && <div style={styles.actions}>
                      <button type="button" disabled={Boolean(emailChangeBusyId)} style={{ ...styles.button, opacity: emailChangeBusyId ? .6 : 1 }} onClick={() => managePendingEmailChange(item.user_id, 'admin_email_change_resend')}>{emailChangeBusyId === resendKey ? 'A reenviar…' : 'Reenviar link de confirmação'}</button>
                      <button type="button" disabled={Boolean(emailChangeBusyId)} style={{ ...styles.reject, opacity: emailChangeBusyId ? .6 : 1 }} onClick={() => managePendingEmailChange(item.user_id, 'admin_email_change_cancel')}>{emailChangeBusyId === cancelKey ? 'A cancelar…' : 'Cancelar pedido'}</button>
                    </div>}
                  </article>
                );
              })}</div>}
        </section>

        <section id="eventos" style={{ marginTop: 0, display: activeAdminSection === 'eventos' ? 'block' : 'none' }}>
          <div style={styles.titleRow}><div><h2 style={styles.title}>Eventos</h2><p style={styles.description}>Analise os eventos submetidos, consulte os detalhes e aprove ou recuse com um motivo.</p></div><div style={styles.counter}>{events.filter(item => ['pending_payment', 'pending', 'pending_review'].includes(String(item.status || '').toLowerCase())).length} por analisar · {events.length} total</div></div>
          {events.length === 0 ? <div style={styles.empty}><h3>Sem eventos registados</h3><p>Os eventos enviados aparecerão aqui.</p></div> : <div style={styles.list}>{events.map(item => <article key={item.id} style={styles.card}><div style={styles.cardTop}><div style={styles.logoPlaceholder}>EV</div><div style={{ flex: 1 }}><h3 style={styles.businessName}>{item.title || 'Evento sem título'}</h3><div style={styles.meta}>Estado: {item.status || '—'} · Pagamento: {item.payment_status || '—'} · {item.created_at ? new Date(item.created_at).toLocaleString('pt-AO') : ''}</div></div></div><div style={styles.details}><p>{item.description || 'Sem descrição.'}</p>{item.image_url && <p><a href={item.image_url} target="_blank" rel="noreferrer">Ver imagem do evento ↗</a></p>}<p><strong>Local:</strong> {item.location || '—'}</p><p><strong>Responsável:</strong> {profiles.find(profile => profile.id === item.user_id)?.name || 'Nome não disponível'}</p><p><strong>ID interno:</strong> {item.user_id || '—'}</p></div>{!item.admin_approved && !['published','approved','rejected','cancelled','expired'].includes(String(item.status || '').toLowerCase()) && <div style={styles.actions}><button type="button" style={styles.reject} onClick={() => moderateEvent(item, false)}>Recusar evento</button><button type="button" style={styles.approve} onClick={() => moderateEvent(item, true)}>Aprovar evento</button></div>}</article>)}</div>}
          <div style={{ marginTop: 30 }}>
            <h3 style={{ ...styles.title, fontSize: 21 }}>Comprovativos de pagamento dos eventos</h3>
            <p style={styles.description}>Só aparecem aqui os pagamentos de eventos com comprovativo enviado. A aprovação do evento e a confirmação do pagamento são decisões separadas.</p>
            {subscriptionRequests.filter(request => request.event_id).length === 0
              ? <div style={styles.empty}><h3>Sem comprovativos de eventos</h3><p>Quando alguém selecionar um plano e enviar o comprovativo, o pedido aparecerá aqui.</p></div>
              : <div style={styles.list}>{subscriptionRequests.filter(request => request.event_id).map(request => {
                  const event = events.find(item => item.id === request.event_id);
                  const pending = String(request.status || '').toLowerCase() === 'pending' || String(request.status || '').toLowerCase() === 'submitted';
                  const paths = getPaymentProofPaths(request);
                  return <article key={request.id} style={styles.card}>
                    <div style={styles.cardTop}>
                      <div style={styles.logoPlaceholder}>₭</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={styles.businessName}>{event?.title || 'Evento associado'}</h3>
                        <div style={styles.meta}>Responsável: {profiles.find(profile => profile.id === (event?.user_id || request.user_id))?.name || 'Nome não disponível'} · Plano: {planNames[request.plan_id] || 'Plano de evento'} · {request.created_at ? new Date(request.created_at).toLocaleString('pt-AO') : ''}</div>
                      </div>
                      <span style={pending ? styles.pending : styles.paymentStatus}>{request.resubmitted_from_id || (paymentHistoryById[request.id] || []).some(entry=>entry.action==='resubmitted') ? 'Reenviado / Corrigido' : (request.status || 'Sem estado')}</span>
                    </div>
                    <div style={styles.details}>
                      <p><strong>Valor:</strong> {Number.isFinite(Number(request.amount)) ? new Intl.NumberFormat('pt-AO').format(Number(request.amount)) + ' Kz' : '—'}</p>
                    <p><strong>Número Express que fez a transferência:</strong> {request.express_sender_phone || 'Não informado (registo antigo)'}</p>
                      {request.user_response && String(request.user_response).replace(/\D/g, '') !== String(request.express_sender_phone || '').replace(/\D/g, '') && <p><strong>Mensagem de correção:</strong> {request.user_response}</p>}
                      {(paymentHistoryById[request.id] || []).map(entry => <div key={entry.id} style={{fontSize:11,color:'#68736F',margin:'6px 0',padding:'7px',background:'#F7F8F7',borderRadius:8}}>
                        <div>{entry.action==='submitted'?'1.º envio':entry.action==='rejected'?'Recusa: '+(entry.reason||''):entry.action==='resubmitted'?'Reenviado / Corrigido':'Aprovado'} · {new Date(entry.created_at).toLocaleString('pt-AO')}{entry.user_response && String(entry.user_response).replace(/\D/g, '') !== String(request.express_sender_phone || '').replace(/\D/g, '') ? ' · '+entry.user_response : ''}</div>
                        {(entry.proof_image_url || entry.proof_file_url || entry.proof_url) && <button type="button" style={styles.proofLink} onClick={()=>openProof(entry.proof_image_url || entry.proof_file_url || entry.proof_url)}>Abrir comprovativo desta etapa ↗</button>}
                      </div>)}
                      {paths.image && <p><button type="button" style={styles.proofLink} onClick={() => openProof(paths.image)}>Abrir imagem do comprovativo ↗</button></p>}
                      {paths.file && <p><button type="button" style={styles.proofLink} onClick={() => openProof(paths.file)}>Abrir comprovativo PDF ↗</button></p>}
                      {!paths.image && !paths.file && <p style={{ color: '#9B3A28' }}>Este pedido não contém um ficheiro de comprovativo válido.</p>}
                    </div>
                    {pending && paths.image || pending && paths.file ? <div style={styles.actions}>
                      <button type="button" disabled={reviewingPaymentId === request.id} style={styles.reject} onClick={() => reviewPayment(request, false)}>Rejeitar pagamento</button>
                      <button type="button" disabled={reviewingPaymentId === request.id} style={styles.approve} onClick={() => reviewPayment(request, true)}>Confirmar pagamento</button>
                    </div> : null}
                  </article>;
                })}</div>}
          </div>
        </section>

        <section id="oportunidades" style={{ marginTop: 0, display: activeAdminSection === 'oportunidades' ? 'block' : 'none' }}>
          <div style={styles.titleRow}>
            <div><h2 style={styles.title}>Vagas por aprovar</h2><p style={styles.description}>Verifique o link, o conteúdo e a integridade dos dados antes de aprovar. Só as vagas aprovadas ficam visíveis em Oportunidades.</p></div>
            <div style={styles.counter}>{jobPosts.filter(item => ['pending','pending_review'].includes(String(item.status || '').toLowerCase())).length} pendente(s)</div>
          </div>
          {jobPosts.filter(item => ['pending','pending_review'].includes(String(item.status || '').toLowerCase())).length === 0
            ? <div style={styles.empty}><h3>Nenhuma vaga pendente de aprovação</h3><p>As novas publicações aparecerão aqui.</p></div>
            : <div style={styles.list}>{jobPosts.filter(item => ['pending','pending_review'].includes(String(item.status || '').toLowerCase())).map(item => {
                const checks = jobReviewChecks[item.id] || {};
                const rawText = [item.description,item.requirements,item.salary,item.professional_competence,item.work_availability].filter(Boolean).join(' ');
                const linkMatch = rawText.match(/https?:\/\/[^\s<>"']+/i);
                const author = profiles.find(profile => profile.id === (item.user_id || item.employer_id));
                const toggleCheck = key => setJobReviewChecks(previous => ({ ...previous, [item.id]: { ...(previous[item.id] || {}), [key]: !previous[item.id]?.[key] } }));
                return <article key={item.id} style={styles.card}>
                  <div style={styles.cardTop}><div style={styles.logoPlaceholder}>V</div><div style={{flex:1,minWidth:0}}><h3 style={styles.businessName}>{item.title || item.profession || 'Vaga sem título'}</h3><div style={styles.meta}>Pendente - Por aprovar · {item.created_at ? new Date(item.created_at).toLocaleString('pt-AO') : 'Data indisponível'}</div></div></div>
                  <div style={styles.details}>
                    <p><strong>Descrição:</strong> {item.description || 'Não informada'}</p>
                    <p><strong>Província:</strong> {item.province?.name || '—'}</p>
                    <p><strong>Quem publicou:</strong> {author?.name || 'Utilizador Talaza'} · {item.user_id || 'ID indisponível'}</p>
                    <p><strong>Profissão:</strong> {item.profession || '—'} · <strong>Área:</strong> {item.area || '—'}</p>
                    <p><strong>Requisitos:</strong> {item.requirements || '—'}</p>
                    <p><strong>Remuneração:</strong> {item.salary || 'Não indicada'}</p>
                    <p><strong>WhatsApp indicado:</strong> {item.whatsapp || '—'} (não será mostrado publicamente)</p>
                    {linkMatch ? <p><strong>Link encontrado:</strong> <a href={linkMatch[0].replace(/[),.!?;:]+$/, '')} target="_blank" rel="noopener noreferrer nofollow">Abrir e verificar o link ↗</a></p> : <p><strong>Link:</strong> Não foi encontrado um link no texto da vaga.</p>}
                    {item.image_url && <p><a href={item.image_url} target="_blank" rel="noopener noreferrer">Abrir cartaz/anexo ↗</a></p>}
                  </div>
                  <div style={{marginTop:14,padding:14,borderRadius:12,background:'#F8FAF9',border:'1px solid #DDE8E2'}}>
                    <strong>Verificação obrigatória antes de aprovar</strong>
                    <label style={{display:'flex',gap:9,alignItems:'flex-start',marginTop:12,fontSize:13}}><input type="checkbox" checked={Boolean(checks.link)} onChange={() => toggleCheck('link')}/> <span>Link: verifiquei se é legítimo, relevante e não contém spam, burla ou phishing (ou confirmei que não existe link).</span></label>
                    <label style={{display:'flex',gap:9,alignItems:'flex-start',marginTop:10,fontSize:13}}><input type="checkbox" checked={Boolean(checks.message)} onChange={() => toggleCheck('message')}/> <span>Mensagem: verifiquei que não contém palavrões, burla, promessas falsas, conteúdo sexual ou inadequado.</span></label>
                    <label style={{display:'flex',gap:9,alignItems:'flex-start',marginTop:10,fontSize:13}}><input type="checkbox" checked={Boolean(checks.data)} onChange={() => toggleCheck('data')}/> <span>Dados: confirmei que a vaga está completa, coerente e não apresenta sinais evidentes de falsidade.</span></label>
                  </div>
                  <div style={styles.actions}>
                    <button type="button" style={styles.reject} onClick={() => moderateJob(item,false)}>Rejeitar + motivo</button>
                    <button type="button" style={{...styles.approve,opacity:checks.link&&checks.message&&checks.data?1:.55}} onClick={() => moderateJob(item,true)}>Aprovar vaga</button>
                  </div>
                </article>;
              })}</div>}
        </section>

        <section id="conteudo-oficial" style={{ marginTop: 0, display: activeAdminSection === 'conteudo-oficial' ? 'block' : 'none' }}>
          <div style={styles.titleRow}><div><h2 style={styles.title}>Comunidade Terapêutica — Motivação e Tema do Mês</h2><p style={styles.description}>Publica e gere apenas a Motivação Talaza, o Tema do Mês e a descrição do Tema da Semana.</p></div></div>
          <div style={styles.card}>
            <label style={styles.label}>Tipo de conteúdo</label>
            <select value={officialKind} onChange={event => setOfficialKind(event.target.value)} style={styles.input}>
              <option value="motivation">Motivação</option><option value="theme">Tema do mês</option><option value="weekly_question">Título da semana</option>
            </select>
            <label style={styles.label}>Duração da motivação / tema</label>
            <select value={officialDuration} onChange={event => setOfficialDuration(Number(event.target.value))} style={styles.input}>
              <option value={7}>7 dias</option><option value={15}>15 dias</option><option value={30}>30 dias</option>
            </select>
            <p style={styles.meta}>Quando a duração terminar, o conteúdo deixa de aparecer ao público, mas permanece guardado no histórico para consulta e reutilização futura.</p>
            <label style={styles.label}>Título / tema</label>
            <input value={officialTitle} onChange={event => setOfficialTitle(event.target.value)} placeholder={officialKind === 'motivation' ? 'Ex.: A força de recomeçar' : officialKind === 'theme' ? 'Ex.: O valor de recomeçar' : 'Ex.: O que aprendeste esta semana?'} style={styles.input} />
            {officialKind !== 'theme' && <>
              <label style={styles.label}>{officialKind === 'weekly_question' ? 'Descrição da semana' : 'Frase motivacional'}</label>
              <textarea value={officialBody} onChange={event => setOfficialBody(event.target.value)} placeholder={officialKind === 'weekly_question' ? 'Escreve a descrição e a orientação da semana.' : 'Escreve a frase motivacional que será apresentada num cartão 16:9.'} rows={officialKind === 'motivation' ? 3 : 5} style={styles.input} />
            </>}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:12, marginTop:14 }}>
              <div><label style={styles.label}>Cor do fundo</label><input aria-label="Cor do fundo" type="color" value={officialBackgroundColor} onChange={event=>setOfficialBackgroundColor(event.target.value)} style={{ ...styles.input, height:46, padding:4 }} /></div>
              <div><label style={styles.label}>Cor das letras</label><input aria-label="Cor das letras" type="color" value={officialTextColor} onChange={event=>setOfficialTextColor(event.target.value)} style={{ ...styles.input, height:46, padding:4 }} /></div>
              <div><label style={styles.label}>Tipo de letra</label><select value={officialFontFamily} onChange={event=>setOfficialFontFamily(event.target.value)} style={styles.input}><option value="Georgia">Georgia — elegante</option><option value="Arial">Arial — simples</option><option value="Verdana">Verdana — legível</option><option value="Trebuchet MS">Trebuchet MS — moderno</option><option value="Times New Roman">Times New Roman — clássico</option><option value="system-ui">Sistema — contemporâneo</option></select></div>
            </div>
            <label style={styles.label}>Imagem de fundo externa</label>
            <input ref={officialImageInputRef} type="file" accept="image/*" disabled={officialImageUploading} onChange={event => { const selectedFile = event.target.files?.[0]; if (selectedFile) uploadOfficialBackground(selectedFile); event.target.value = ''; }} style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }} />
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}><button type="button" disabled={officialImageUploading} onClick={() => officialImageInputRef.current?.click()} style={{ ...styles.approve, background: 'linear-gradient(135deg, #075B4E 0%, #64358B 58%, #D8A319 100%)', opacity: officialImageUploading ? .65 : 1 }}>{officialImageUploading ? 'A carregar imagem…' : 'Escolher imagem da galeria'}</button>{officialBackgroundImage && <button type="button" onClick={() => setOfficialBackgroundImage('')} style={styles.reject}>Remover imagem</button>}</div>
            <p style={styles.meta}>{officialImageUploading ? 'A carregar imagem…' : 'Seleciona uma imagem do computador/galeria (máximo 8 MB) ou cola um URL abaixo.'}</p>
            <input type="url" value={officialBackgroundImage} onChange={event=>setOfficialBackgroundImage(event.target.value)} placeholder="Ou cola aqui o URL da imagem" style={styles.input} />
            <label style={styles.label}>Fundo em degradê</label>
            <select value={officialBackgroundGradient} onChange={event => setOfficialBackgroundGradient(event.target.value)} style={styles.input}>
              <option value="linear-gradient(135deg, #173B35 0%, #64358B 55%, #D8A319 100%)">Talaza — verde, roxo e dourado</option>
              <option value="linear-gradient(135deg, #075B4E 0%, #18A999 100%)">Verde oceano</option>
              <option value="linear-gradient(135deg, #64358B 0%, #C06C84 100%)">Roxo e rosa</option>
              <option value="linear-gradient(135deg, #1D3557 0%, #457B9D 50%, #A8DADC 100%)">Azul profundo</option>
              <option value="linear-gradient(135deg, #7F4F24 0%, #DDA15E 55%, #FEFAE0 100%)">Terra e areia</option>
              <option value="linear-gradient(135deg, #232526 0%, #414345 100%)">Grafite</option>
            </select>
            <div style={{ marginTop:12, padding:16, minHeight:officialKind==='motivation'?180:110, aspectRatio:officialKind==='motivation'?'16 / 9':undefined, borderRadius:14, color:officialTextColor, fontFamily:officialFontFamily, backgroundColor:officialBackgroundColor, backgroundImage:officialBackgroundImage.trim()? 'linear-gradient(rgba(0,0,0,.15),rgba(0,0,0,.15)),url('+officialBackgroundImage.trim()+')':officialBackgroundGradient, backgroundSize:'cover', backgroundPosition:'center', display:'flex', flexDirection:'column', justifyContent:'center', textAlign:'center', overflow:'hidden' }}>
              <strong style={{ fontSize:officialKind==='motivation'?22:18 }}>{officialTitle || (officialKind==='theme'?'Tema do mês':officialKind==='weekly_question'?'Título da semana':'A sua frase motivacional')}</strong>
              {officialKind==='weekly_question' && <span style={{ marginTop:8, fontSize:14 }}>{officialBody || 'A descrição da semana aparecerá aqui.'}</span>}
            </div>
            <div style={styles.actions}><button type="button" disabled={officialSaving} style={styles.approve} onClick={publishOfficialCommunityContent}>{officialSaving ? 'A publicar…' : 'Publicar conteúdo oficial'}</button></div>
            <p style={styles.meta}>Motivação e temas ficam guardados nas tabelas oficiais, mesmo depois de expirarem. A expiração apenas os retira da apresentação pública.</p>
            <div style={{ marginTop: 22 }}>
              <h3 style={{ ...styles.title, fontSize: 20 }}>Histórico de motivações e temas</h3>
              {officialArchive.length === 0 ? <div style={styles.empty}><p>Ainda não existem conteúdos guardados.</p></div> : <div style={styles.list}>{officialArchive.map(item => {
                const expired = item.archiveExpiresAt && new Date(item.archiveExpiresAt) <= new Date();
                return <article key={item.archiveType + item.id} style={styles.card}>
                  <div style={styles.cardTop}><div style={styles.logoPlaceholder}>{item.archiveType === 'Motivação' ? 'M' : 'T'}</div><div style={{ flex: 1 }}><h4 style={styles.businessName}>{item.archiveTitle || 'Sem título'}</h4><div style={styles.meta}>{item.archiveType} · {item.duration_days || 30} dias · Publicado: {new Date(item.created_at).toLocaleDateString('pt-AO')}</div></div><span style={expired ? styles.paymentStatus : styles.pending}>{expired ? 'Arquivado' : 'Ativo'}</span></div>
                </article>;
              })}</div>}
            </div>
          </div>
        </section>

        <section id="comunidade" style={{ marginTop: 0, display: activeAdminSection === 'comunidade' ? 'block' : 'none' }}>
          <div style={styles.titleRow}>
            <div>
              <h2 style={styles.title}>Aprovação da Comunidade Talaza</h2>
              <p style={styles.description}>As publicações só aparecem na comunidade depois da aprovação administrativa.</p>
            </div>
            <div style={styles.counter}>{communityPosts.filter(post => String(post.moderation_status || 'pending').toLowerCase() === 'pending').length} por analisar · {communityPosts.length} enviadas</div>
          </div>
          {communityPosts.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>✓</div>
              <h2>Sem publicações para aprovar</h2>
              <p>Quando alguém enviar uma pergunta, “Achei!”, “Procura-se” ou outro conteúdo sujeito a moderação, aparecerá aqui enquanto aguarda análise.</p>
            </div>
          ) : (
            <div style={styles.list}>
              {communityPosts.map(post => (
                <article key={post.id} style={styles.card}>
                  <div style={styles.cardTop}>
                    <div style={styles.logoPlaceholder}>
                      {post.post_type === 'question' ? '❔' : post.post_type === 'found_item' ? '🔎' : '📝'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={styles.businessName}>{post.title || 'Pergunta da comunidade'}</h3>
                      <div style={styles.meta}>
                        Tipo: {post.post_type || '—'} · Alcance: {post.scope === 'country' ? 'Nacional' : 'Provincial'} · {post.created_at ? new Date(post.created_at).toLocaleString('pt-AO') : 'Data não disponível'}
                      </div>
                    </div>
                    <span style={String(post.moderation_status || 'pending').toLowerCase() === 'pending' ? styles.pending : styles.paymentStatus}>{post.moderation_status || 'pending'}</span>
                  </div>
                  <div style={styles.details}>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{post.content || 'Sem descrição.'}</p>
                    <p><strong>Enviado por:</strong> {profiles.find(profile => profile.id === post.user_id)?.name || 'Utilizador Talaza'}</p>
                    <p><strong>ID do autor:</strong> {post.user_id || '—'}</p>
                    <p><strong>Província (ID):</strong> {post.province_id || 'Nacional / não indicada'}</p>
                    <p><strong>Expira em:</strong> {post.expires_at ? new Date(post.expires_at).toLocaleString('pt-AO') : 'Não definido'}</p>
                    {post.image_url && <p><a href={post.image_url} target="_blank" rel="noreferrer" style={{ color: '#075B4E', fontWeight: 700 }}>Ver imagem da publicação ↗</a></p>}
                  </div>
                  {String(post.moderation_status || 'pending').toLowerCase() === 'pending' && <div style={styles.actions}>
                    <button type="button" disabled={reviewingPostId === post.id} style={{ ...styles.reject, opacity: reviewingPostId === post.id ? .6 : 1 }} onClick={() => reviewCommunityPost(post, false)}>{reviewingPostId === post.id ? 'A guardar…' : 'Rejeitar publicação'}</button>
                    <button type="button" disabled={reviewingPostId === post.id} style={{ ...styles.approve, opacity: reviewingPostId === post.id ? .6 : 1 }} onClick={() => reviewCommunityPost(post, true)}>{reviewingPostId === post.id ? 'A guardar…' : 'Aprovar e publicar'}</button>
                  </div>}
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="girassol" style={{ marginTop: 0, display: activeAdminSection === "girassol" ? "block" : "none" }}>
          <div style={styles.titleRow}>
            <div><h2 style={styles.title}>Reactivação Girassol e Girassol Pró</h2><p style={styles.description}>Analise comprovativos de 12.000 Kz. A aprovação reactiva apenas o acesso Girassol; não renova a hospedagem normal da loja.</p></div>
            <div style={styles.counter}>{girassolReactivations.filter(item => String(item.status || "").toLowerCase() === "pending").length} por analisar</div>
          </div>
          {girassolReactivations.length === 0 ? <div style={styles.empty}><div style={styles.emptyIcon}>🌻</div><h2>Sem pedidos de reactivação</h2><p>Os comprovativos enviados pelos vendedores aparecerão aqui.</p></div> :
            <div style={styles.list}>{girassolReactivations.map(request => {
              const pending = String(request.status || "").toLowerCase() === "pending";
              return <article key={request.id} style={styles.card}>
                <div style={styles.cardTop}><div style={styles.logoPlaceholder}>🌻</div><div style={{ flex: 1, minWidth: 0 }}><h3 style={styles.businessName}>{request.business?.name || "Negócio TALAZA"}</h3><div style={styles.meta}>{request.tier === "girassol_pro" ? "Girassol Pró" : "Girassol"} · {request.created_at ? new Date(request.created_at).toLocaleString("pt-AO") : "Data não disponível"}</div></div><span style={pending ? styles.pending : styles.paymentStatus}>{request.status}</span></div>
                <div style={styles.details}><p><strong>Valor:</strong> {Number(request.amount).toLocaleString("pt-AO")} Kz</p><p><strong>Nota:</strong> A hospedagem da loja não é alterada por esta aprovação.</p>{girassolProofUrls[request.id] ? <p><a href={girassolProofUrls[request.id]} target="_blank" rel="noreferrer" style={{ color: "#075B4E", fontWeight: 800 }}>Abrir comprovativo ↗</a></p> : <p>Comprovativo a carregar ou indisponível.</p>}{request.notes && <p><strong>Observação:</strong> {request.notes}</p>}</div>
                {pending && <div style={styles.actions}><button type="button" disabled={reviewingGirassolId === request.id} style={styles.reject} onClick={() => reviewGirassolReactivation(request, false)}>Recusar</button><button type="button" disabled={reviewingGirassolId === request.id} style={styles.approve} onClick={() => reviewGirassolReactivation(request, true)}>{reviewingGirassolId === request.id ? "A guardar…" : "Aprovar reactivação"}</button></div>}
              </article>;
            })}</div>
          }
        </section>

        <section id="reenvios" style={{marginTop:0,display:activeAdminSection==='reenvios'?'block':'none'}}>
          <div style={styles.titleRow}><div><h2 style={styles.title}>Reenvios de comprovativos</h2><p style={styles.description}>Revê os novos comprovativos e telefones enviados pelos vendedores após uma recusa.</p></div><div style={styles.counter}>{resubmissions.filter(item=>String(item.status||'').toLowerCase()==='pending').length} por analisar</div></div>
          {resubmissionError&&<div role="alert" style={{marginBottom:14,padding:12,borderRadius:10,background:'#FCEBED',color:'#A52F3B',fontSize:13}}>{resubmissionError}</div>}
          {!resubmissions.some(item=>String(item.status||'').toLowerCase()==='pending')?<div style={styles.empty}><div style={styles.emptyIcon}>◇</div><h2>Nenhum reenvio pendente</h2><p>Quando um vendedor reenviar um comprovativo após a recusa, o pedido aparecerá aqui.</p></div>:
            <div style={styles.list}>{resubmissions.filter(item=>String(item.status||'').toLowerCase()==='pending').map(item=><article key={item.id} style={styles.card}>
              <div style={styles.cardTop}><div style={styles.logoPlaceholder}>₭</div><div style={{flex:1,minWidth:0}}>
                <h3 style={styles.businessName}>{item.business?.name||'Negócio sem nome associado'}</h3>
                <p style={styles.description}>Número Express que fez a transferência: <strong>{String(item.phone || '').replace(/\D/g, '').length === 9 ? '+244' + String(item.phone).replace(/\D/g, '') : String(item.phone || '')}</strong></p>
                <p style={styles.description}>Reenviado em: {new Date(item.created_at).toLocaleString('pt-AO')}</p>
              </div></div>
              <p style={{fontSize:12,color:'#A52F3B',marginTop:10}}><strong>Motivo da recusa anterior:</strong> {item.sellerStatus?.reject_reason||'Motivo anterior não registado.'}</p>
              <div style={{marginTop:12,padding:10,border:'1px solid #DCE6E1',borderRadius:12,background:'#F8FAF9'}}>
                {item.previewUrl?(item.file_type==='pdf'
                  ?<a href={item.previewUrl} target="_blank" rel="noreferrer" download style={{display:'inline-flex',alignItems:'center',gap:9,padding:'12px 16px',borderRadius:10,background:'#173F32',color:'#FFFFFF',fontWeight:900,textDecoration:'none'}}>Ver comprovativo ↗</a>
                  :<a href={item.previewUrl} target="_blank" rel="noreferrer"><img src={item.previewUrl} alt="Comprovativo reenviado" style={{display:'block',maxWidth:'100%',maxHeight:360,objectFit:'contain',margin:'0 auto',borderRadius:8}}/></a>)
                  :<p style={{fontSize:12,color:'#A52F3B'}}>Não foi possível gerar o preview do ficheiro. Verifica o bucket payment-proofs.</p>}
              </div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:14}}>
                <button type="button" disabled={resubmissionBusyId===item.id} onClick={()=>reviewPaymentResubmission(item,true)} style={styles.approve}>{resubmissionBusyId===item.id?'A guardar…':'Aprovar'}</button>
                <button type="button" disabled={resubmissionBusyId===item.id} onClick={()=>reviewPaymentResubmission(item,false)} style={styles.reject}>Rejeitar</button>
              </div>
            </article>)}</div>
          }
        </section>

        <section id="pagamentos" style={{ marginTop: 0, display: activeAdminSection === 'pagamentos' ? 'block' : 'none' }}>
          <div style={styles.titleRow}>
            <div>
              <h2 style={styles.title}>Pagamentos e hospedagem da Vitrine</h2>
              <p style={styles.description}>Esta secção mostra apenas os comprovativos com ficheiro enviados para a hospedagem dos negócios. Os pagamentos de eventos ficam em Eventos; as publicações gratuitas ficam em Oportunidades.</p>
            </div>
            <div style={styles.counter}>{subscriptionRequests.filter(item => item.business_id && !item.premium_promotion_id && String(item.status || '').toLowerCase() === 'pending').length} pagamentos de hospedagem pendentes</div>
          </div>
          {subscriptionRequests.filter(item => item.business_id && !item.premium_promotion_id).length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>◇</div>
              <h2>Sem pedidos de pagamento</h2>
              <p>Os comprovativos enviados para as áreas pagas da Talaza aparecerão aqui quando forem registados.</p>
            </div>
          ) : (
            <div style={styles.list}>
              {subscriptionRequests.filter(item => item.business_id && !item.premium_promotion_id).map(request => {
                const pending = String(request.status || '').toLowerCase() === 'pending';
                return <article key={request.id} style={styles.card}>
                  <div style={styles.cardTop}>
                    <div style={styles.logoPlaceholder}>₭</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={styles.businessName}>{businessNames[request.business_id] || (request.event_id ? 'Pagamento de evento' : (request.job_post_id || request.opportunity_id) ? 'Pagamento de oportunidade' : getPaymentAreaLabel(request))}</h3>
                      <div style={styles.meta}>Área: {getPaymentAreaLabel(request)} · {request.business_id ? 'Negócio: ' + (businessNames[request.business_id] || 'A carregar nome…') + ' · ' : ''}Plano: {planNames[request.plan_id] || 'A carregar plano…'}</div>
                    </div>
                    <span style={pending ? styles.pending : styles.paymentStatus}>{request.status || 'Sem estado'}</span>
                  </div>
                  <div style={styles.details}>
                    <p><strong>Valor:</strong> {Number.isFinite(Number(request.amount)) ? new Intl.NumberFormat('pt-AO').format(Number(request.amount)) + ' Kz' : 'Não definido'}</p>
                    <p><strong>Número Express que fez a transferência:</strong> {request.express_sender_phone || 'Não informado (registo antigo)'}</p>
                    <p><strong>Data:</strong> {request.created_at ? new Date(request.created_at).toLocaleString('pt-AO') : '—'}</p>
                    {(() => {
                      const paths = getPaymentProofPaths(request);
                      const imageUrl = paymentProofUrls[request.id + ':image'];
                      const fileUrl = paymentProofUrls[request.id + ':file'];
                      return (
                        <div style={{ marginTop: 12, padding: 12, border: '1px solid #DCE6E1', borderRadius: 12, background: '#FAFCFB' }}>
                          <p style={{ marginTop: 0 }}><strong>Comprovativo enviado pela cliente:</strong></p>
                          {paths.image ? (
                            <div style={{ marginBottom: 12 }}>
                              {imageUrl ? (
                                <a href={imageUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block' }}>
                                  <img src={imageUrl} alt="Comprovativo de pagamento enviado" style={{ display: 'block', maxWidth: '100%', width: 280, maxHeight: 360, objectFit: 'contain', border: '1px solid #DCE6E1', borderRadius: 8, background: '#fff' }} />
                                </a>
                              ) : <p>A preparar a imagem do comprovativo…</p>}
                              <p><button type="button" style={styles.proofLink} onClick={() => openProof(paths.image)}>Abrir imagem em tamanho completo ↗</button></p>
                            </div>
                          ) : null}
                          {paths.file ? (
                            <p><button type="button" style={styles.proofLink} onClick={() => openProof(paths.file)}>Abrir/baixar comprovativo PDF ↗</button></p>
                          ) : null}
                          {!paths.image && !paths.file && (
                            <p style={{ color: '#9B3A28', marginBottom: 0 }}>
                              O registo deste pagamento não contém um caminho de comprovativo legível. Atualize o painel e confirme se a publicação do formulário de pagamento já foi concluída.
                            </p>
                          )}
                          {paths.image && !imageUrl && (
                            <p style={{ color: '#9B3A28', marginBottom: 0 }}>
                              O caminho da imagem foi encontrado, mas o Supabase não forneceu acesso temporário. Confirme a política de leitura do bucket privado payment-proofs para administradores.
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div style={styles.actions}>
                    {pending && <><button disabled={reviewingPaymentId === request.id} style={{ ...styles.reject, opacity: reviewingPaymentId === request.id ? .6 : 1 }} onClick={() => reviewPayment(request, false)}>{reviewingPaymentId === request.id ? 'A guardar…' : 'Rejeitar pagamento'}</button>
                    <button disabled={reviewingPaymentId === request.id} style={{ ...styles.approve, opacity: reviewingPaymentId === request.id ? .6 : 1 }} onClick={() => reviewPayment(request, true)}>{reviewingPaymentId === request.id ? 'A guardar…' : 'Confirmar pagamento'}</button></>}
                    <button type="button" disabled={deletingPaymentId === request.id} style={styles.reject} onClick={() => deletePaymentProof(request)}>{deletingPaymentId === request.id ? 'A eliminar…' : 'Eliminar comprovativo'}</button>
                  </div>
                </article>;
              })}
            </div>
          )}
        </section>

        <section id="acessos-oportunidades" style={{ marginTop:0, display:activeAdminSection==='acessos-oportunidades'?'block':'none' }}>
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>◇</div>
            <h2>Acesso às Oportunidades</h2>
            <p>Os pagamentos para Exploradores e Criadores ainda não estão disponíveis. Esta funcionalidade será configurada futuramente. Nesta fase, apenas os pagamentos dos Vendedores são recebidos.</p>
          </div>
        </section>

        <section id="destaques-premium" style={{ marginTop: 0, display: activeAdminSection === 'destaques-premium' ? 'block' : 'none' }}>
          <div style={styles.titleRow}>
            <div><h2 style={styles.title}>Aprovação de Destaques Premium</h2><p style={styles.description}>Anúncios Premium com comprovativo enviado para análise administrativa.</p></div>
            <div style={styles.counter}>{subscriptionRequests.filter(item => item.premium_promotion_id && String(item.status || '').toLowerCase() === 'pending').length} por aprovar</div>
          </div>
          {subscriptionRequests.filter(item => item.premium_promotion_id).length === 0 ? (
            <div style={styles.empty}><div style={styles.emptyIcon}>◇</div><h2>Sem Destaques Premium para aprovar</h2><p>Os anúncios aparecerão aqui depois do envio do comprovativo.</p></div>
          ) : (
            <div style={styles.list}>
              {subscriptionRequests.filter(item => item.premium_promotion_id).map(request => {
                const pending = String(request.status || '').toLowerCase() === 'pending';
                const paths = getPaymentProofPaths(request);
                const imageUrl = paymentProofUrls[request.id + ':image'];
                return <article key={request.id} style={styles.card}>
                  <div style={styles.cardTop}><div style={styles.logoPlaceholder}>★</div><div style={{ flex: 1, minWidth: 0 }}><h3 style={styles.businessName}>{businessNames[request.business_id] || 'Destaque Premium'}</h3><div style={styles.meta}>Área: Destaques Premium · Plano: {planNames[request.plan_id] || 'A carregar plano…'}</div></div><span style={pending ? styles.pending : styles.paymentStatus}>{request.status || 'Sem estado'}</span></div>
                  <div style={styles.details}>
                    <p><strong>Valor:</strong> {Number.isFinite(Number(request.amount)) ? new Intl.NumberFormat('pt-AO').format(Number(request.amount)) + ' Kz' : 'Não definido'}</p>
                    <p><strong>Número Express que fez a transferência:</strong> {request.express_sender_phone || 'Não informado (registo antigo)'}</p>
                    <p><strong>Data:</strong> {request.created_at ? new Date(request.created_at).toLocaleString('pt-AO') : '—'}</p>
                    {paths.image && imageUrl && <a href={imageUrl} target="_blank" rel="noreferrer"><img src={imageUrl} alt="Comprovativo Destaque Premium" style={{ display: 'block', maxWidth: '100%', width: 260, maxHeight: 320, objectFit: 'contain', border: '1px solid #DCE6E1', borderRadius: 8, background: '#fff' }} /></a>}
                    {paths.file && <p><button type="button" style={styles.proofLink} onClick={() => openProof(paths.file)}>Abrir/baixar comprovativo ↗</button></p>}
                    {!paths.image && !paths.file && <p style={{ color: '#9B3A28' }}>Este pedido não contém comprovativo legível.</p>}
                    {paths.image && !imageUrl && <p style={{ color: '#9B3A28' }}>Não foi possível abrir o comprovativo. Verifique o bucket payment-proofs.</p>}
                  </div>
                  <div style={styles.actions}>{pending && <><button disabled={reviewingPaymentId === request.id} style={{ ...styles.reject, opacity: reviewingPaymentId === request.id ? .6 : 1 }} onClick={() => reviewPayment(request, false)}>{reviewingPaymentId === request.id ? 'A guardar…' : 'Rejeitar pagamento'}</button><button disabled={reviewingPaymentId === request.id} style={{ ...styles.approve, opacity: reviewingPaymentId === request.id ? .6 : 1 }} onClick={() => reviewPayment(request, true)}>{reviewingPaymentId === request.id ? 'A guardar…' : 'Aprovar Destaque Premium'}</button></>}</div>
                </article>;
              })}
            </div>
          )}
        </section>

        <section id="suporte" style={{ marginTop: 0, display: activeAdminSection === 'suporte' ? 'block' : 'none' }}>
          <div style={styles.titleRow}>
            <div>
              <h2 style={styles.title}>Suporte Talaza — mensagens recebidas</h2>
              <p style={styles.description}>As mensagens enviadas pelos utilizadores através do menu Suporte Talaza aparecem aqui.</p>
            </div>
            <div style={styles.counter}>{supportMessages.filter(item => String(item.status || 'pending') === 'pending').length} por analisar</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>{[['all','Todas'],['pending','Por analisar'],['reviewed','Analisadas']].map(([value,label]) => <button key={value} type="button" onClick={() => setSupportFilter(value)} style={{ padding: '9px 13px', borderRadius: 999, border: supportFilter === value ? '1px solid #64358B' : '1px solid #DDE5E0', background: supportFilter === value ? 'linear-gradient(135deg,#075B4E,#64358B)' : '#FFFFFF', color: supportFilter === value ? '#FFFFFF' : '#244A42', fontWeight: 800, cursor: 'pointer' }}>{label}</button>)}</div>
           {supportMessages.filter(item => supportFilter === 'all' || String(item.status || 'pending').toLowerCase() === supportFilter).length === 0 ? (
            <div style={styles.empty}><div style={styles.emptyIcon}>✉</div><h2>Sem mensagens recebidas</h2><p>As mensagens enviadas pelos utilizadores aparecerão aqui.</p></div>
          ) : (
            <div style={styles.list}>{supportMessages.filter(item => supportFilter === 'all' || String(item.status || 'pending').toLowerCase() === supportFilter).map(item => (
              <article key={item.id} style={styles.card}>
                <div style={styles.cardTop}>
                  <div style={styles.logoPlaceholder}>✉</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={styles.businessName}>{profiles.find(profile => profile.id === item.user_id)?.name || 'Utilizador Talaza'}</h3>
                    <div style={styles.meta}>{item.created_at ? new Date(item.created_at).toLocaleString('pt-AO') : 'Data não disponível'} · {item.status || 'pending'}</div>
                  </div>
                  <span style={String(item.status || 'pending') === 'pending' ? styles.pending : styles.paymentStatus}>{item.status || 'pending'}</span>
                </div>
                <div style={styles.details}><p style={{ whiteSpace: 'pre-wrap' }}>{item.message}</p><p><strong>ID do utilizador:</strong> {item.user_id}</p></div>
                <div style={styles.actions}><button type="button" style={styles.proofLink} onClick={() => copyText(item.message || '')}>Copiar</button><button type="button" style={styles.button} onClick={() => editSupportMessage(item)}>Editar</button>{String(item.status || 'pending') === 'pending' && <button type="button" style={styles.approve} onClick={() => markSupportReviewed(item)}>Marcar como analisada</button>}<button type="button" disabled={deletingSupportId === item.id} style={styles.reject} onClick={() => deleteSupportMessage(item)}>{deletingSupportId === item.id ? 'A eliminar…' : 'Eliminar mensagem'}</button></div>
              </article>
            ))}</div>
          )}
        </section>

        <section id="notificacoes" style={{ marginTop: 0, display: activeAdminSection === 'notificacoes' ? 'block' : 'none' }}>
          <div style={styles.titleRow}>
            <div>
              <h2 style={styles.title}>Notificações Talaza</h2>
              <p style={styles.description}>Envie notificações aos exploradores, vendedores, todos os utilizadores ou a uma pessoa específica. As notificações ficam na área “Notificações” da conta.</p>
            </div>
          </div>
          <form onSubmit={sendAdminNotification} style={styles.card}>
            <label style={styles.formLabel} htmlFor="notification-audience">Destinatários</label>
            <select id="notification-audience" value={notificationAudience} onChange={event => setNotificationAudience(event.target.value)} style={styles.formInput}>
              <option value="all">Todos os utilizadores</option>
              <option value="explorers">Exploradores normais</option>
              <option value="sellers">Todos os vendedores</option>
              <option value="seller_user">Um vendedor específico</option>
              <option value="user">Uma pessoa específica</option>
            </select>
            {['user', 'seller_user'].includes(notificationAudience) && <>
              <label style={styles.formLabel} htmlFor="notification-user">{notificationAudience === 'seller_user' ? 'Escolher vendedor' : 'Escolher utilizador'}</label>
              <select id="notification-user" value={notificationUserId} onChange={event => setNotificationUserId(event.target.value)} style={styles.formInput} required>
                <option value="">{notificationAudience === 'seller_user' ? 'Selecione um vendedor' : 'Selecione um utilizador'}</option>
                {profiles.filter(profile => notificationAudience !== 'seller_user' || ['seller','vendedor','business'].includes(String(profile.account_type || '').toLowerCase())).map(profile => <option key={profile.id} value={profile.id}>{profile.name || 'Utilizador'} · {profile.id.slice(0, 8)}</option>)}
              </select>
            </>}
            <label style={styles.formLabel} htmlFor="notification-title">Título</label>
            <input id="notification-title" value={notificationTitle} onChange={event => setNotificationTitle(event.target.value)} maxLength={120} required style={styles.formInput} placeholder="Ex.: Informação importante da Talaza" />
            <label style={styles.formLabel} htmlFor="notification-body">Mensagem</label>
            <textarea id="notification-body" value={notificationBody} onChange={event => setNotificationBody(event.target.value)} rows={5} maxLength={5000} required style={{ ...styles.formInput, resize: 'vertical' }} placeholder="Escreva a mensagem que será mostrada na área de notificações." />
            <div style={styles.actions}><button type="submit" disabled={sendingNotification} style={{ ...styles.approve, opacity: sendingNotification ? .7 : 1 }}>{sendingNotification ? 'A enviar…' : 'Enviar notificação'}</button></div>
          </form>
          <div style={{ ...styles.titleRow, marginTop: 26, marginBottom: 12 }}>
            <div><h3 style={{ ...styles.title, fontSize: 20 }}>Histórico de notificações</h3><p style={styles.description}>Edite, copie ou elimine uma notificação já enviada.</p></div>
            <span style={styles.counter}>{adminNotifications.length} recentes</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {[[ 'all', 'Todas' ], [ 'general', 'Todos' ], [ 'explorers', 'Exploradores' ], [ 'sellers', 'Vendedores' ], [ 'individual', 'Individuais' ], [ 'support', 'Suporte Talaza' ]].map(([value,label]) => <button key={value} type="button" onClick={() => setNotificationHistoryFilter(value)} style={{ padding: '9px 13px', borderRadius: 999, border: notificationHistoryFilter === value ? '1px solid #64358B' : '1px solid #DDE5E0', background: notificationHistoryFilter === value ? 'linear-gradient(135deg,#075B4E,#64358B)' : '#FFFFFF', color: notificationHistoryFilter === value ? '#FFFFFF' : '#244A42', fontWeight: 800, cursor: 'pointer' }}>{label}</button>)}
          </div>
          {adminNotifications.filter(item => notificationHistoryFilter === 'all' || String(item.type || 'general').toLowerCase() === notificationHistoryFilter).length === 0
            ? <div style={styles.empty}><p>Não existem notificações nesta categoria.</p></div>
            : <div style={styles.list}>{adminNotifications.filter(item => notificationHistoryFilter === 'all' || String(item.type || 'general').toLowerCase() === notificationHistoryFilter).map(item => <article key={item.id} style={{ ...styles.card, borderLeft: '5px solid #64358B', background: 'linear-gradient(135deg,#FFFFFF 0%,#F7F2FC 100%)' }}>
              <div style={styles.cardTop}><div style={{ ...styles.logoPlaceholder, background: 'linear-gradient(135deg,#075B4E,#64358B)', color: '#FFFFFF' }}>N</div><div style={{ flex: 1, minWidth: 0 }}><h4 style={styles.businessName}>{item.title || 'Notificação Talaza'}</h4><div style={styles.meta}>{item.created_at ? new Date(item.created_at).toLocaleString('pt-AO') : 'Data indisponível'} · {item.type || 'general'} · {item.user_id ? 'Destinatário: ' + String(item.user_id).slice(0,8) : 'Sem destinatário'}</div></div></div>
              <div style={styles.details}><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.content || item.body || ''}</p></div>
              <div style={{ ...styles.actions, flexWrap: 'wrap' }}><button type="button" style={styles.proofLink} onClick={() => copyText((item.title || '') + '\n' + (item.content || item.body || ''))}>Copiar</button><button type="button" style={styles.button} onClick={() => editAdminNotification(item)}>Editar</button><button type="button" disabled={deletingNotificationId === item.id} style={styles.reject} onClick={() => deleteAdminNotification(item)}>{deletingNotificationId === item.id ? 'A eliminar…' : 'Eliminar'}</button></div>
            </article>)}</div>}
        </section>

        <section id="denuncias" style={{ marginTop: 0, display: activeAdminSection === 'denuncias' ? 'block' : 'none' }}>
          <div style={styles.titleRow}>
            <div>
              <h2 style={styles.title}>Denúncias da Comunidade Talaza</h2>
              <p style={styles.description}>Analise os motivos e marque as denúncias como revistas ou rejeitadas.</p>
            </div>
            <div style={styles.counter}>{communityReports.filter(report => String(report.status || 'pending').toLowerCase() === 'pending').length} por analisar</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>{[['pending','Por analisar'],['reviewed','Revistas'],['rejected','Rejeitadas'],['all','Todas']].map(([value,label]) => <button key={value} type="button" onClick={() => setReportFilter(value)} style={{ padding: '9px 13px', borderRadius: 999, border: reportFilter === value ? '1px solid #64358B' : '1px solid #DDE5E0', background: reportFilter === value ? 'linear-gradient(135deg,#075B4E,#64358B)' : '#FFFFFF', color: reportFilter === value ? '#FFFFFF' : '#244A42', fontWeight: 800, cursor: 'pointer' }}>{label}</button>)}</div>
          {communityReports.filter(report => reportFilter === 'all' || String(report.status || 'pending').toLowerCase() === reportFilter).length === 0 ? <div style={styles.empty}><div style={styles.emptyIcon}>✓</div><h2>Sem denúncias pendentes</h2><p>Quando os utilizadores denunciarem publicações da comunidade, os registos aparecerão aqui.</p></div> :
            <div style={styles.list}>{communityReports.filter(report => reportFilter === 'all' || String(report.status || 'pending').toLowerCase() === reportFilter).map(report => {
              const pending = String(report.status || 'pending').toLowerCase() === 'pending';
              return <article key={report.id} style={styles.card}>
                <div style={styles.cardTop}>
                  <div style={styles.logoPlaceholder}>⚑</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={styles.businessName}>Denúncia #{String(report.id).slice(0,8)}</h3>
                    <div style={styles.meta}>Enviado por: {profiles.find(profile => profile.id === report.reporter_id)?.name || 'Utilizador Talaza'} · {report.created_at ? new Date(report.created_at).toLocaleString('pt-AO') : 'Data não disponível'}</div>
                  </div>
                  <span style={pending ? styles.pending : styles.paymentStatus}>{report.status || 'pending'}</span>
                </div>
                <div style={styles.details}>
                  <p><strong>Motivo:</strong> {report.reason || 'Não informado'}</p>
                  <p><strong>Data:</strong> {report.created_at ? new Date(report.created_at).toLocaleString('pt-AO') : '—'}</p>
                </div>
                {pending && <div style={styles.actions}>
                  <button style={styles.reject} onClick={() => reviewReport(report, 'rejected')}>Rejeitar denúncia</button>
                  <button style={styles.approve} onClick={() => reviewReport(report, 'reviewed')}>Marcar como revista</button>
                </div>}
              </article>;
            })}</div>}
        </section>
      </section>
      {rejectionModalPayment && <div role="presentation" onClick={() => { if (!reviewingPaymentId) setRejectionModalPayment(null); }} style={{position:'fixed',inset:0,zIndex:300,background:'rgba(9,25,19,.62)',display:'flex',alignItems:'center',justifyContent:'center',padding:18,boxSizing:'border-box'}}>
        <section role="dialog" aria-modal="true" aria-labelledby="payment-rejection-title" onClick={event=>event.stopPropagation()} style={{width:'100%',maxWidth:560,maxHeight:'88vh',overflowY:'auto',background:'#FFFFFF',borderRadius:20,padding:24,boxShadow:'0 22px 70px rgba(0,0,0,.28)',boxSizing:'border-box'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
            <div><div style={{fontSize:11,fontWeight:900,letterSpacing:1.5,color:'#B8860B'}}>TALAZA · ADMINISTRAÇÃO</div><h2 id="payment-rejection-title" style={{margin:'6px 0 0',color:'#12332D'}}>Rejeitar comprovante</h2></div>
            <button type="button" aria-label="Fechar" onClick={()=>setRejectionModalPayment(null)} disabled={Boolean(reviewingPaymentId)} style={{border:0,background:'#F1F4F2',borderRadius:10,width:36,height:36,fontSize:22,cursor:'pointer'}}>×</button>
          </div>
          <p style={{color:'#64736D',fontSize:13,lineHeight:1.5}}>Marca todos os motivos que se aplicam. Podes selecionar mais do que um.</p>
          <div style={{display:'grid',gap:9,marginTop:16}}>
            {['Número Express incompatível / errado','Imagem turva / borrada','Imagem ilegível','PDF ilegível','PDF incorreto / não é o comprovante deste pagamento','Valor não bate com o extrato / comprovante','Outro motivo'].map(reason=><label key={reason} style={{display:'flex',alignItems:'flex-start',gap:10,padding:11,border:'1px solid '+(paymentRejectionReasons.includes(reason)?'#0A6B54':'#DCE5E0'),background:paymentRejectionReasons.includes(reason)?'#EFF8F3':'#FFFFFF',borderRadius:11,cursor:'pointer',fontSize:13,color:'#263D35',lineHeight:1.45}}>
              <input type="checkbox" checked={paymentRejectionReasons.includes(reason)} onChange={event=>setPaymentRejectionReasons(current=>event.target.checked?[...current,reason]:current.filter(item=>item!==reason))} style={{width:17,height:17,marginTop:1,accentColor:'#075B4E'}}/>
              <span>{reason}</span>
            </label>)}
          </div>
          {paymentRejectionReasons.includes('Outro motivo') && <div style={{marginTop:14}}>
            <label htmlFor="payment-rejection-other" style={{display:'block',fontSize:13,fontWeight:800,color:'#244A42',marginBottom:7}}>Descreve o outro motivo (obrigatório)</label>
            <textarea id="payment-rejection-other" value={paymentRejectionOther} onChange={event=>setPaymentRejectionOther(event.target.value)} rows={3} placeholder="Explica claramente o que precisa de ser corrigido…" style={{width:'100%',boxSizing:'border-box',border:'1px solid #C9D8D1',borderRadius:11,padding:12,font:'inherit',resize:'vertical'}}/>
          </div>}
          <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20,flexWrap:'wrap'}}>
            <button type="button" disabled={Boolean(reviewingPaymentId)} onClick={()=>setRejectionModalPayment(null)} style={{...styles.reject,padding:'12px 16px'}}>Cancelar</button>
            <button type="button" disabled={Boolean(reviewingPaymentId)||!paymentRejectionReasons.length||(paymentRejectionReasons.includes('Outro motivo')&&!paymentRejectionOther.trim())} onClick={confirmPaymentRejection} style={{...styles.approve,background:'#A52F3B',opacity:(!paymentRejectionReasons.length||(paymentRejectionReasons.includes('Outro motivo')&&!paymentRejectionOther.trim())) ? 0.5 : 1,padding:'12px 18px'}}>{reviewingPaymentId?'A rejeitar…':'Rejeitar comprovante'}</button>
          </div>
        </section>
      </div>}
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#F5F7F6',
    color: '#12332D',
  },

  center: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F5F7F6',
    padding: 24,
  },

  restricted: {
    width: '100%',
    maxWidth: 420,
    background: '#fff',
    padding: 32,
    borderRadius: 18,
    textAlign: 'center',
    boxShadow: '0 8px 30px rgba(0,0,0,.08)',
  },

  logo: {
    width: 58,
    height: 58,
    margin: '0 auto 18px',
    borderRadius: 16,
    background: '#075B4E',
    color: '#E6A900',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 800,
  },

  header: {
    background: '#075B4E',
    color: '#fff',
    padding: '18px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },

  brand: {
    fontWeight: 800,
    letterSpacing: 2,
    color: '#E6A900',
  },

  subtitle: {
    fontSize: 12,
    opacity: .8,
    marginTop: 4,
  },

  content: {
    width: '100%',
    maxWidth: 1100,
    margin: '0 auto',
    padding: '32px 20px 60px',
  },

  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
    marginBottom: 26,
    flexWrap: 'wrap',
  },

  title: {
    margin: 0,
    fontSize: 28,
  },

  description: {
    marginTop: 8,
    color: '#65736F',
  },

  counter: {
    background: '#FFF3C7',
    color: '#8A6500',
    padding: '9px 14px',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 13,
  },

  list: {
    display: 'grid',
    gap: 18,
  },

  card: {
    background: '#fff',
    borderRadius: 18,
    padding: 20,
    boxShadow: '0 5px 20px rgba(0,0,0,.06)',
    border: '1px solid #E7ECEA',
  },

  cardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },

  logoImage: {
    width: 58,
    height: 58,
    borderRadius: 14,
    objectFit: 'cover',
  },

  logoPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 14,
    background: '#E4F0ED',
    color: '#075B4E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: 22,
  },

  businessName: {
    margin: 0,
    fontSize: 19,
  },

  meta: {
    marginTop: 5,
    color: '#687772',
    fontSize: 13,
  },

  paymentStatus: { background: '#EDE6F6', color: '#64358B', padding: '7px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800, textTransform: 'capitalize' },
  proofLink: { border: 0, background: 'transparent', color: '#64358B', textDecoration: 'underline', fontWeight: 800, cursor: 'pointer', padding: 0 },
  formLabel: { display: 'block', marginTop: 12, marginBottom: 6, color: '#12332D', fontSize: 13, fontWeight: 800 },
  formInput: { display: 'block', width: '100%', boxSizing: 'border-box', border: '1px solid #DDE5E0', borderRadius: 10, padding: '12px 13px', background: '#FFFFFF', color: '#12332D', fontSize: 14, fontFamily: 'inherit' },

  pending: {
    background: '#FFF3C7',
    color: '#8A6500',
    padding: '6px 9px',
    borderRadius: 7,
    fontSize: 11,
    fontWeight: 700,
  },

  details: {
    marginTop: 18,
    paddingTop: 16,
    borderTop: '1px solid #EDF0EF',
    color: '#52635E',
    fontSize: 14,
    lineHeight: 1.55,
  },

  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },

  approve: {
    border: 0,
    background: '#075B4E',
    color: '#fff',
    padding: '10px 18px',
    borderRadius: 9,
    fontWeight: 700,
    cursor: 'pointer',
  },

  reject: {
    border: 0,
    background: '#F0F2F1',
    color: '#8B3027',
    padding: '10px 18px',
    borderRadius: 9,
    fontWeight: 700,
    cursor: 'pointer',
  },

  logout: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,.35)',
    color: '#fff',
    padding: '9px 14px',
    borderRadius: 8,
    cursor: 'pointer',
  },

  button: {
    marginTop: 18,
    border: 0,
    background: '#075B4E',
    color: '#fff',
    padding: '11px 18px',
    borderRadius: 9,
    fontWeight: 700,
    cursor: 'pointer',
  },

  empty: {
    background: '#fff',
    borderRadius: 18,
    padding: 50,
    textAlign: 'center',
    boxShadow: '0 5px 20px rgba(0,0,0,.05)',
  },

  emptyIcon: {
    width: 50,
    height: 50,
    borderRadius: '50%',
    background: '#E4F0ED',
    color: '#075B4E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 15px',
    fontSize: 22,
    fontWeight: 800,
  },

  label: {
    display: 'block',
    marginTop: 14,
    marginBottom: 7,
    color: '#244A42',
    fontSize: 13,
    fontWeight: 700,
  },

  input: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #D5DFDB',
    background: '#FFFFFF',
    color: '#12332D',
    borderRadius: 9,
    padding: '11px 12px',
    marginBottom: 10,
    font: 'inherit',
  },

  error: {
    color: '#A33A30',
    fontSize: 13,
  },

  errorBox: {
    background: '#FFF0EE',
    color: '#9C3027',
    padding: 14,
    borderRadius: 10,
    marginBottom: 18,
  },
};       
