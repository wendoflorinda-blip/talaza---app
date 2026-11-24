import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import TalazaMenu from '../components/TalazaMenu';
import ProductsView, { VIEW_MODES } from '../components/ProductsView';
import { supabase } from '../lib/supabaseClient';
import { prepareImage, formatKz } from '../lib/imageTools';
import MusicEditor from '../components/MusicEditor';
import NotificationsPanel from '../components/NotificationsPanel';

export default function Seller() {
  const router = useRouter();

  const { country, province } = router.query;

  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [savedTotalCount, setSavedTotalCount] = useState(0);
  const [savedCountPanelOpen, setSavedCountPanelOpen] = useState(false);
  const [unreadExploreCount, setUnreadExploreCount] = useState(0);
  const [unreadStoreCount, setUnreadStoreCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [emailVisibilitySaving, setEmailVisibilitySaving] = useState(false);
  const [newLoginEmail, setNewLoginEmail] = useState('');
  const [confirmLoginEmail, setConfirmLoginEmail] = useState('');
  const [emailChangeBusy, setEmailChangeBusy] = useState(false);
  const [emailChangeFeedback, setEmailChangeFeedback] = useState('');
  const [emailChangeFeedbackType, setEmailChangeFeedbackType] = useState(''); 
  const [lastEmailChangedAt, setLastEmailChangedAt] = useState(null);
  const [pendingLoginEmail, setPendingLoginEmail] = useState('');
  const [supportDraft, setSupportDraft] = useState('');
  const [supportSending, setSupportSending] = useState(false);
  const [supportFeedback, setSupportFeedback] = useState('');
  const [editHours, setEditHours] = useState('');
  const [editMunicipality, setEditMunicipality] = useState('');
  const [editNeighborhood, setEditNeighborhood] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [assetUploading, setAssetUploading] = useState(false);
  const [subscriptionPending, setSubscriptionPending] = useState(false);
  const [hostingProofSubmitted, setHostingProofSubmitted] = useState(false);
  const [hostingPaymentApproved, setHostingPaymentApproved] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [hostingExpiry, setHostingExpiry] = useState(null);
  const [hostingExpired, setHostingExpired] = useState(false);
  const [hostingNoPlan, setHostingNoPlan] = useState(false);
  const [hostingPlanName, setHostingPlanName] = useState('Sem plano registado');
  const [hostingRemainingDays, setHostingRemainingDays] = useState(0);
  const [hostingLastAddedDays, setHostingLastAddedDays] = useState(0);
  const [renewalPlans, setRenewalPlans] = useState([]);
  const [renewalLoading, setRenewalLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [sellerReview, setSellerReview] = useState(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [resubmissionPhone, setResubmissionPhone] = useState('');
  const [resubmissionFile, setResubmissionFile] = useState(null);
  const [resubmissionBusy, setResubmissionBusy] = useState(false);
  const [resubmissionError, setResubmissionError] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ---- galeria (imagens principais + imagens de painel) ----
  const [images, setImages] = useState([]);
  const [galleryError, setGalleryError] = useState('');
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [viewMode, setViewMode] = useState('normal');
  const [customerOpen, setCustomerOpen] = useState(false);
  const [sheet, setSheet] = useState(null); // { type: 'menu' | 'price' | 'text', id }
  const [sheetPrice, setSheetPrice] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [sheetDesc, setSheetDesc] = useState('');
  const [businessUpdates, setBusinessUpdates] = useState([]);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [musicEditorOpen, setMusicEditorOpen] = useState(false);
  const [musicTargetItem, setMusicTargetItem] = useState(null);
  const [productEditorOpen, setProductEditorOpen] = useState(false);
  const [productPhotos, setProductPhotos] = useState([]);
  const [productPhotoPreviews, setProductPhotoPreviews] = useState([]);
  const [productTitle, setProductTitle] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productError, setProductError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    loadBusiness();
  }, [router.isReady, country, province]);

  useEffect(() => {
    const urls = productPhotos.map(file => URL.createObjectURL(file));
    setProductPhotoPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [productPhotos]);

  // Atualiza os contadores dos botões de mensagens sem precisar abrir a caixa.
  useEffect(() => {
    if (!router.isReady) return undefined;
    let cancelled = false;

    async function refreshUnreadCounts() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user;
        if (!currentUser) return;

        const [{ data: memberships, error: membershipsError }, { data: ownedBusinesses, error: businessesError }] = await Promise.all([
          supabase.from('conversation_participants').select('conversation_id').eq('user_id', currentUser.id),
          supabase.from('businesses').select('id').eq('owner_id', currentUser.id)
        ]);
        if (membershipsError) throw membershipsError;
        if (businessesError) throw businessesError;

        const ids = [...new Set((memberships || []).map(row => row.conversation_id).filter(Boolean))];
        if (!ids.length) {
          if (!cancelled) {
            setUnreadExploreCount(0);
            setUnreadStoreCount(0);
          }
          return;
        }

        const [{ data: conversations, error: conversationsError }, { data: latestRows, error: messagesError }] = await Promise.all([
          supabase.from('conversations').select('id,source_id').in('id', ids),
          supabase.from('talaza_messages').select('conversation_id,sender_id,created_at').in('conversation_id', ids).order('created_at', { ascending: false })
        ]);
        if (conversationsError) throw conversationsError;
        if (messagesError) throw messagesError;

        let readMap = {};
        try {
          readMap = JSON.parse(window.localStorage.getItem('talaza_read') || '{}') || {};
        } catch (_) {
          readMap = {};
        }

        const latestByConversation = {};
        (latestRows || []).forEach(message => {
          if (!latestByConversation[message.conversation_id]) latestByConversation[message.conversation_id] = message;
        });
        const ownBusinessIds = new Set((ownedBusinesses || []).map(item => String(item.id)));
        const conversationById = new Map((conversations || []).map(item => [item.id, item]));
        let exploreCount = 0;
        let storeCount = 0;

        ids.forEach(id => {
          const last = latestByConversation[id];
          if (!last || last.sender_id === currentUser.id) return;
          const readAt = readMap[id];
          if (readAt && new Date(last.created_at).getTime() <= new Date(readAt).getTime()) return;

          const conversation = conversationById.get(id);
          const belongsToStore = Boolean(conversation?.source_id) && ownBusinessIds.has(String(conversation.source_id));
          if (belongsToStore) storeCount += 1;
          else exploreCount += 1;
        });

        if (!cancelled) {
          setUnreadExploreCount(exploreCount);
          setUnreadStoreCount(storeCount);
        }
      } catch (countError) {
        console.warn('Não foi possível atualizar os avisos de mensagens não lidas:', countError);
      }
    }

    refreshUnreadCounts();
    const onMessagesRead = () => refreshUnreadCounts();
    window.addEventListener('talaza:messages-read', onMessagesRead);
    const intervalId = window.setInterval(refreshUnreadCounts, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('talaza:messages-read', onMessagesRead);
    };
  }, [router.isReady]);

  // mensagens (guardado / erro) desaparecem sozinhas
  useEffect(() => {
    if (!business || (!notice && !error)) return undefined;
    const timer = setTimeout(() => {
      setNotice('');
      setError('');
    }, 6000);
    return () => clearTimeout(timer);
  }, [notice, error, business]);

  async function sendSellerSupport() {
    const message = supportDraft.trim();
    if (!message || supportSending) return;
    setSupportSending(true);
    setSupportFeedback('');
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData?.user) throw new Error('Entre na sua conta para contactar o Suporte Talaza.');
      const { error: insertError } = await supabase.from('support_messages').insert({
        user_id: authData.user.id,
        message,
        status: 'pending',
      });
      if (insertError) throw insertError;
      setSupportDraft('');
      setSupportFeedback('Mensagem enviada ao Suporte Talaza.');
    } catch (err) {
      setSupportFeedback(err.message || 'Não foi possível enviar a mensagem.');
    } finally {
      setSupportSending(false);
    }
  }

  async function loadBusiness() {
    setLoading(true);
    setError('');

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.replace('/login');
      return;
    }

    const { data: mainAdmin, error: mainAdminError } = await supabase
      .from('admin_users').select('id').eq('id', session.user.id).maybeSingle();
    if (mainAdminError) {
      setError('Não foi possível confirmar o tipo da conta. Por segurança, o painel de vendedor foi bloqueado.');
      setLoading(false);
      return;
    }
    if (mainAdmin?.id) {
      await router.replace('/explore');
      setLoading(false);
      return;
    }

    const { data: refreshedAuthData, error: refreshedAuthError } = await supabase.auth.getUser();
    if (refreshedAuthError) console.warn('Não foi possível atualizar os dados de autenticação:', refreshedAuthError);
    let authUser = refreshedAuthData?.user || session.user;
    let authMetadata = authUser.user_metadata || {};
    // new_email é disponibilizado pelo GoTrue enquanto o pedido antigo
    // ainda está pendente; pending_email cobre os pedidos criados pela UI atual.
    const pendingEmail = String(authMetadata.pending_email || authUser.new_email || '').trim().toLowerCase();
    const currentAuthEmail = String(authUser.email || '').trim().toLowerCase();

    // Recupera pedidos pendentes feitos pela versão anterior da interface:
    // GoTrue expõe new_email enquanto a confirmação ainda está por concluir.
    // Remove o timestamp incorreto gravado no pedido antigo, sem iniciar o prazo.
    if (pendingEmail && currentAuthEmail !== pendingEmail && !authMetadata.pending_email) {
      const pendingMetadata = { ...authMetadata };
      delete pendingMetadata.last_email_changed_at;
      pendingMetadata.pending_email = pendingEmail;
      pendingMetadata.pending_email_requested_at = authUser.email_change_sent_at || null;
      const { data: pendingMetadataUpdate, error: pendingMetadataError } = await supabase.auth.updateUser({ data: pendingMetadata });
      if (pendingMetadataError) {
        console.warn('Não foi possível guardar o estado do pedido pendente:', pendingMetadataError);
      } else if (pendingMetadataUpdate?.user) {
        authUser = pendingMetadataUpdate.user;
        authMetadata = authUser.user_metadata || pendingMetadata;
      } else {
        authMetadata = pendingMetadata;
      }
    }

    // O período de seis meses só começa quando o Supabase já apresenta
    // o novo endereço como e-mail principal (confirmação concluída).
    if (pendingEmail && currentAuthEmail === pendingEmail) {
      const confirmedAt = new Date().toISOString();
      const { data: metadataUpdate, error: metadataError } = await supabase.auth.updateUser({
        data: {
          ...authMetadata,
          last_email_changed_at: confirmedAt,
          pending_email: null,
          pending_email_requested_at: null
        }
      });
      if (metadataError) {
        console.warn('O e-mail foi confirmado, mas não foi possível guardar a data da troca:', metadataError);
      } else if (metadataUpdate?.user) {
        authUser = metadataUpdate.user;
        authMetadata = authUser.user_metadata || {};
      } else {
        authMetadata = { ...authMetadata, last_email_changed_at: confirmedAt, pending_email: null, pending_email_requested_at: null };
      }
    }

    setUser(authUser);
    setPendingLoginEmail(pendingEmail && currentAuthEmail !== pendingEmail ? pendingEmail : '');
    setLastEmailChangedAt(pendingEmail && currentAuthEmail !== pendingEmail
      ? null
      : (authMetadata.last_email_changed_at || null));

    const { data, error: businessError } =
      await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (businessError) {
      console.error(businessError);
      setError('Não foi possível carregar o seu negócio.');
      setLoading(false);
      return;
    }

    if (!data) {
      setError(
        'Não encontramos um negócio associado à sua conta nesta localização.'
      );
      setLoading(false);
      return;
    }

    setBusiness(data);
    setShowEmail(data.show_email === true);
    // Total apresentado: Guardados reais + adicionais da Administração.
    // Consultas com null/erro ficam em zero e não bloqueiam o painel.
    const [{ data: realSavedRows, error: realSavedError }, { data: additionalSavedRows, error: additionalSavedError }] = await Promise.all([
      supabase.from('saved_businesses').select('id').eq('business_id', data.id),
      supabase.from('admin_saved_business_boosts').select('amount').eq('business_id', data.id)
    ]);
    if (realSavedError) console.warn('Guardados reais indisponíveis:', realSavedError);
    if (additionalSavedError) console.warn('Guardados adicionais indisponíveis:', additionalSavedError);
    const realCount = Array.isArray(realSavedRows) ? realSavedRows.length : 0;
    const additionalCount = Array.isArray(additionalSavedRows) ? additionalSavedRows.reduce((sum, item) => {
      const amount = Number(item?.amount ?? 0);
      return sum + (Number.isFinite(amount) && amount > 0 ? amount : 0);
    }, 0) : 0;
    setSavedTotalCount(realCount + additionalCount);
    const { data: reviewStatus, error: reviewStatusError } = await supabase.from('seller_status').select('seller_id,status,reject_reason,created_at').eq('seller_id', session.user.id).maybeSingle();
    if (reviewStatusError) console.warn('Não foi possível carregar o estado da análise:', reviewStatusError);
    setSellerReview(String(data.approval_status || '').toLowerCase() === 'pending' && String(reviewStatus?.status || '').toLowerCase() === 'rejected' ? { ...reviewStatus, status: 'pending' } : (reviewStatus || null));
    setEditName(data.name || '');
    setEditDescription(data.description || '');
    setEditPhone(data.phone || '');
    setEditHours(data.opening_hours || '');
    setEditMunicipality(data.municipality || '');
    setEditNeighborhood(data.neighborhood || '');
    setViewMode(VIEW_MODES.includes(data.panel_view_mode) ? data.panel_view_mode : 'normal');
    await loadImages(data.id);
    await loadBusinessUpdates(data.id);

    const { data: subscriptionRows, error: subscriptionError } = await supabase
      .from('business_subscriptions')
      .select('id,plan_id,starts_at,expires_at,status')
      .eq('business_id', data.id)
      .order('starts_at',{ascending:false})
      .order('created_at',{ascending:false});
    if (subscriptionError) console.warn('Não foi possível consultar a validade da hospedagem:',subscriptionError);
    const latestSubscription = (subscriptionRows || []).find(row=>String(row.status||'').trim().toLowerCase()==='active')
      || (subscriptionRows || [])[0]
      || null;
    const isLifetimeSubscription = String(latestSubscription?.expires_at || '').trim().toLowerCase() === 'lifetime';
    const expiryDate = latestSubscription?.expires_at && !isLifetimeSubscription ? new Date(latestSubscription.expires_at) : null;
    const angolaDateKey = (date) => {
      if (!date || Number.isNaN(date.getTime())) return null;
      const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Luanda',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
      const values = Object.fromEntries(parts.map(part=>[part.type,part.value]));
      return `${values.year}-${values.month}-${values.day}`;
    };
    const todayAngolaKey = angolaDateKey(new Date());
    const expiryAngolaKey = angolaDateKey(expiryDate);
    const remainingDays = todayAngolaKey && expiryAngolaKey
      ? Math.max(0,Math.round((Date.parse(expiryAngolaKey+'T00:00:00Z')-Date.parse(todayAngolaKey+'T00:00:00Z'))/86400000))
      : 0;
    const validHosting = Boolean(latestSubscription && String(latestSubscription.status || '').trim().toLowerCase()==='active' && (isLifetimeSubscription || remainingDays>0));
    if (latestSubscription?.id && !isLifetimeSubscription && remainingDays<=0 && String(latestSubscription.status||'').trim().toLowerCase()==='active') {
      const {error:expireSubscriptionError}=await supabase.from('business_subscriptions').update({status:'expired'}).eq('id',latestSubscription.id).eq('status','active');
      if(expireSubscriptionError) console.warn('Não foi possível marcar a hospedagem como expirada:',expireSubscriptionError);
      const {error:deactivateBusinessError}=await supabase.from('businesses').update({is_active:false}).eq('id',data.id);
      if(deactivateBusinessError) console.warn('Não foi possível desativar o negócio expirado:',deactivateBusinessError);
    }
    setHostingRemainingDays(remainingDays);
    if (latestSubscription?.plan_id) {
      const {data: currentPlan,error: currentPlanError}=await supabase.from('plans').select('name,duration_days').eq('id',latestSubscription.plan_id).maybeSingle();
      if(currentPlanError) console.warn('Não foi possível carregar o nome do plano atual:',currentPlanError);
      setHostingPlanName(currentPlan?.name||'Plano contratado');
    } else setHostingPlanName('Sem plano registado');
    const {data: approvedPlanPayments,error: approvedPaymentsError}=await supabase.from('payment_submissions')
      .select('id,plan_id,created_at').eq('business_id',data.id).eq('status','approved').order('created_at',{ascending:true});
    if(approvedPaymentsError) console.warn('Não foi possível consultar o histórico de renovações:',approvedPaymentsError);
    const previousApprovedPayments=(approvedPlanPayments||[]).filter(item=>item.id!==undefined);
    if(previousApprovedPayments.length>1){
      const lastPayment=previousApprovedPayments[previousApprovedPayments.length-1];
      const {data: lastPlan}=await supabase.from('plans').select('duration_days').eq('id',lastPayment.plan_id).maybeSingle();
      setHostingLastAddedDays(Number(lastPlan?.duration_days)||0);
    } else setHostingLastAddedDays(0);
    setHostingExpiry(expiryDate && !Number.isNaN(expiryDate.getTime()) ? expiryDate : null);
    setHostingExpired(Boolean(latestSubscription && !validHosting));
    setHostingNoPlan(!latestSubscription);
    if (latestSubscription && !validHosting) {
      setRenewalLoading(true);
      const { data: plansData, error: plansError } = await supabase.from('plans')
        .select('id,name,description,price,duration_days,plan_type,category_id,subcategory_id,area,created_at')
        .eq('is_active',true)
        .eq('category_id',data.category_id)
        .order('created_at',{ascending:true});
      if (plansError) console.warn('Não foi possível carregar planos para renovação:',plansError);
      const matchingPlans=(plansData || []).filter(plan =>
        String(plan.plan_type || '').trim().toLowerCase()==='hospedagem' &&
        (!plan.subcategory_id || String(plan.subcategory_id)===String(data.subcategory_id))
      );
      setRenewalPlans(matchingPlans);
      setRenewalLoading(false);
    } else {
      setRenewalPlans([]);
    }

    const { data: pendingRequest, error: pendingRequestError } = await supabase
      .from('payment_submissions')
      .select('id, plan_id, amount, created_at, status')
      .eq('business_id', data.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingRequestError) console.error('Erro ao verificar pagamento pendente:', pendingRequestError);
    const requestStatus = String(pendingRequest?.status || '').toLowerCase();
    const isInVerification = Boolean(pendingRequest && requestStatus === 'pending');
    const paymentWasApproved = Boolean(pendingRequest && requestStatus === 'approved');
    setSubscriptionPending(isInVerification);
    setHostingProofSubmitted(isInVerification);
    setHostingPaymentApproved(paymentWasApproved);
    if (pendingRequest?.plan_id && isInVerification) {
      const { data: selectedPlan, error: selectedPlanError } = await supabase
        .from('plans')
        .select('id, name, title, plan_name, nome, duration_days, price')
        .eq('id', pendingRequest.plan_id)
        .maybeSingle();
      if (selectedPlanError) console.error('Erro ao carregar plano pendente:', selectedPlanError);
      setPendingPlan(selectedPlan ? { ...selectedPlan, request: pendingRequest } : { id: pendingRequest.plan_id, request: pendingRequest });
    } else {
      setPendingPlan(null);
    }
    setLoading(false);
  }

  async function submitPaymentResubmission(event) {
    event.preventDefault();
    if (!user || !business || resubmissionBusy) return;
    const phone = resubmissionPhone.trim(); const file = resubmissionFile;
    if (!phone) { setResubmissionError('Indique o telefone atualizado.'); return; }
    if (!file || !['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type)) { setResubmissionError('Anexe uma imagem JPG, PNG, WebP ou PDF.'); return; }
    if (file.size > 10 * 1024 * 1024) { setResubmissionError('O ficheiro deve ter no máximo 10 MB.'); return; }
    setResubmissionBusy(true); setResubmissionError('');
    try {
      const extension = file.type === 'application/pdf' ? 'pdf' : (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = user.id + '/resubmission-' + Date.now() + '.' + extension;
      const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(path, file, { upsert:false, contentType:file.type, cacheControl:'3600' });
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from('payment_resubmissions').insert({ seller_id:user.id, phone, file_url:path, file_type:file.type === 'application/pdf' ? 'pdf' : 'image', status:'pending' });
      if (insertError) { await supabase.storage.from('payment-proofs').remove([path]); throw insertError; }
      const { error: statusError } = await supabase.from('seller_status').upsert({ seller_id:user.id, status:'pending', updated_at:new Date().toISOString() }, { onConflict:'seller_id' });
      if (statusError) throw statusError;
      setSellerReview({ seller_id:user.id, status:'pending', reject_reason:sellerReview?.reject_reason || null }); setShowRejectionModal(false); setResubmissionPhone(''); setResubmissionFile(null);
      setNotice('A correção foi enviada. A equipa Talaza irá verificar novamente.');
    } catch (err) { console.error('Erro ao reenviar comprovativo:',err); setResubmissionError(err.message || 'Não foi possível enviar o comprovativo.'); }
    finally { setResubmissionBusy(false); }
  }

  async function loadBusinessUpdates(businessId) {
    const { data, error: updatesError } = await supabase.from('business_updates')
      .select('id,media_path,media_type,created_at,expires_at')
      .eq('business_id', businessId).gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending:false });
    if (updatesError) { console.error(updatesError); setUpdateError('Não foi possível carregar as Novidades.'); return; }
    const rows = await Promise.all((data || []).map(async item => {
      const { data: signed, error } = await supabase.storage.from('business-updates').createSignedUrl(item.media_path, 3600);
      return error ? null : { ...item, signedUrl:signed?.signedUrl };
    }));
    setBusinessUpdates(rows.filter(Boolean));
  }

  async function publishBusinessUpdate(file) {
    if (!file || !business || updateBusy || subscriptionPending) return;
    const isVideo = file.type.startsWith('video/');
    if (isVideo && !['video/mp4','video/webm','video/quicktime'].includes(file.type)) { setUpdateError('Use vídeo MP4, WEBM ou MOV.'); return; }
    if (!isVideo && !['image/jpeg','image/png','image/webp'].includes(file.type)) { setUpdateError('Use imagem JPG, PNG ou WebP.'); return; }
    if (file.size > 100 * 1024 * 1024) { setUpdateError('O ficheiro deve ter no máximo 100 MB.'); return; }
    const last = businessUpdates[0];
    if (last && Date.now() - new Date(last.created_at).getTime() < 7 * 86400000) {
      setUpdateError('Só poderá publicar outra Novidade quando completar 7 dias desde a última publicação.');
      return;
    }
    setUpdateBusy(true); setUpdateError('');
    try {
      const ext = (file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg')).toLowerCase().replace(/[^a-z0-9]/g,'');
      const path = business.id + '/update-' + Date.now() + '.' + ext;
      const { error: uploadError } = await supabase.storage.from('business-updates').upload(path,file,{upsert:false,contentType:file.type,cacheControl:'3600'});
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from('business_updates').insert({business_id:business.id,media_path:path,media_type:isVideo?'video':'image'});
      if (insertError) {
        await supabase.storage.from('business-updates').remove([path]);
        throw insertError;
      }
      await loadBusinessUpdates(business.id);
      setNotice('Novidade publicada. Os clientes que guardaram o seu perfil poderão vê-la durante 7 dias.');
    } catch (err) {
      console.error('Erro ao publicar Novidade:',err);
      setUpdateError(err.message || 'Não foi possível publicar a Novidade.');
    } finally { setUpdateBusy(false); }
  }

  async function saveEmailVisibility(nextValue) {
    if (subscriptionPending || emailVisibilitySaving) return;
    setEmailVisibilitySaving(true); setError(''); setNotice('');
    try {
      const visibilityUpdates = { show_email: nextValue };
      // Só copia o e-mail de login para o contacto público quando o vendedor ativa explicitamente a opção.
      if (nextValue && !business.email && user?.email) visibilityUpdates.email = user.email;
      const { error: visibilityError } = await supabase.from('businesses').update(visibilityUpdates).eq('id', business.id);
      if (visibilityError) throw visibilityError;
      setShowEmail(nextValue);
      setBusiness((current) => current ? { ...current, ...visibilityUpdates } : current);
      setNotice(nextValue ? 'O e-mail de contacto ficará visível aos clientes.' : 'O e-mail de contacto ficará oculto aos clientes.');
    } catch (err) {
      console.error('Erro ao guardar preferência de e-mail:', err);
      setError('Não foi possível guardar a preferência de e-mail. Tenta de novo.');
    } finally { setEmailVisibilitySaving(false); }
  }

  function addSixMonths(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + 6);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, lastDay));
    return date;
  }

  function formatEmailChangeDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return 'data indisponível';
    return date.toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  const pendingEmailIsActive = Boolean(pendingLoginEmail && pendingLoginEmail.toLowerCase() !== String(user?.email || '').trim().toLowerCase());

  async function changeLoginEmail(event) {
    event.preventDefault();
    if (emailChangeBusy) return;
    setEmailChangeFeedback('');
    setEmailChangeFeedbackType('');

    const currentEmail = String(user?.email || '').trim().toLowerCase();
    const nextEmail = String(newLoginEmail || '').trim().toLowerCase();
    const confirmation = String(confirmLoginEmail || '').trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!nextEmail || !emailPattern.test(nextEmail)) {
      setEmailChangeFeedback('Coloca um e-mail válido. Verifica se escreveste bem.');
      setEmailChangeFeedbackType('error');
      return;
    }
    if (nextEmail === currentEmail) {
      setEmailChangeFeedback('O novo e-mail tem de ser diferente do e-mail atual.');
      setEmailChangeFeedbackType('error');
      return;
    }
    if (confirmation !== nextEmail) {
      setEmailChangeFeedback('A confirmação tem de ser igual ao novo e-mail.');
      setEmailChangeFeedbackType('error');
      return;
    }

    const lastChanged = lastEmailChangedAt ? new Date(lastEmailChangedAt) : null;
    const nextAllowed = lastChanged && !Number.isNaN(lastChanged.getTime()) ? addSixMonths(lastChanged) : null;
    if (nextAllowed && Date.now() < nextAllowed.getTime()) {
      setEmailChangeFeedback('Só poderás alterar o e-mail novamente em ' + formatEmailChangeDate(nextAllowed) + '.');
      setEmailChangeFeedbackType('error');
      return;
    }

    setEmailChangeBusy(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData?.user || authData.user.id !== user?.id) {
        throw new Error('A sessão expirou. Entra novamente para alterar o e-mail.');
      }

      const requestedAt = new Date().toISOString();
      const existingMetadata = authData.user.user_metadata || {};
      const metadataWithoutLastChange = { ...existingMetadata };
      delete metadataWithoutLastChange.last_email_changed_at;
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        email: nextEmail,
        data: {
          ...metadataWithoutLastChange,
          pending_email: nextEmail,
          pending_email_requested_at: requestedAt
        }
      });

      if (updateError) {
        const message = String(updateError.message || '').toLowerCase();
        if (message.includes('already registered') || message.includes('already been registered') || message.includes('email_exists') || message.includes('duplicate')) {
          throw new Error('Este e-mail já está em uso por outra conta.');
        }
        if (message.includes('invalid') && message.includes('email')) {
          throw new Error('Coloca um e-mail válido. Verifica se escreveste bem.');
        }
        throw updateError;
      }

      const updatedUser = updateData?.user || authData.user;
      const actualPendingEmail = String(updatedUser.user_metadata?.pending_email || nextEmail).trim().toLowerCase();
      setUser(updatedUser);
      setLastEmailChangedAt(null);
      setPendingLoginEmail(actualPendingEmail);
      setNewLoginEmail('');
      setConfirmLoginEmail('');
      setEmailChangeFeedback('Enviámos um link de confirmação para o teu e-mail novo. Vai ao e-mail novo, clica no link, e só depois o e-mail antigo deixa de funcionar. Enquanto não confirmares, continua a entrar com o e-mail antigo.');
      setEmailChangeFeedbackType('success');

      // Fecha todas as sessões para obrigar a autenticação novamente com o e-mail antigo
      // enquanto o pedido estiver pendente.
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
      if (signOutError) {
        throw new Error('O pedido de confirmação foi enviado para ' + actualPendingEmail + ', mas não foi possível terminar a sessão automaticamente. Termina a sessão manualmente.');
      }
      setUser(null);
      setBusiness(null);
      await router.replace('/login');
    } catch (changeError) {
      console.error('Erro ao alterar e-mail de acesso:', changeError);
      setEmailChangeFeedback(changeError.message || 'Não foi possível alterar o e-mail. Tenta novamente.');
      setEmailChangeFeedbackType('error');
    } finally {
      setEmailChangeBusy(false);
    }
  }

  async function saveBusiness(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (subscriptionPending) {
      setEditing(false);
      setError('O perfil está em verificação para aprovação. Edite mais tarde, depois da validação.');
      return;
    }
    if (!editName.trim()) {
      setError('O nome do negócio é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      const updates = {
        name: editName.trim(),
        description: editDescription.trim() || null,
        phone: editPhone.trim() || null,
        opening_hours: editHours.trim() || null,
        municipality: editMunicipality.trim() || null,
        neighborhood: editNeighborhood.trim() || null,
      };
      const stamp = Date.now();
      if (logoFile) {
        if (!logoFile.type.startsWith('image/')) throw new Error('O logo deve ser um ficheiro de imagem.');
        if (logoFile.size > 8 * 1024 * 1024) throw new Error('O logo deve ter no máximo 8 MB.');
        const ext = (logoFile.name.split('.').pop() || 'jpg').toLowerCase();
        const path = business.id + '/logo-edit-' + stamp + '.' + ext;
        const { error: uploadError } = await supabase.storage.from('business-media').upload(path, logoFile, { upsert: true, contentType: logoFile.type, cacheControl: '3600' });
        if (uploadError) throw uploadError;
        updates.logo_url = supabase.storage.from('business-media').getPublicUrl(path).data?.publicUrl || null;
      }
      if (coverFile) {
        if (!coverFile.type.startsWith('image/')) throw new Error('A imagem principal deve ser um ficheiro de imagem.');
        if (coverFile.size > 10 * 1024 * 1024) throw new Error('A imagem principal deve ter no máximo 10 MB.');
        const ext = (coverFile.name.split('.').pop() || 'jpg').toLowerCase();
        const path = business.id + '/cover-edit-' + stamp + '.' + ext;
        const { error: uploadError } = await supabase.storage.from('business-media').upload(path, coverFile, { upsert: true, contentType: coverFile.type, cacheControl: '3600' });
        if (uploadError) throw uploadError;
        updates.cover_url = supabase.storage.from('business-media').getPublicUrl(path).data?.publicUrl || null;
      }
      const { error: saveError } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', business.id)
        .eq('owner_id', user.id);
      if (saveError) throw saveError;

      // Atualiza a interface local sem depender de um SELECT de retorno,
      // que pode ser bloqueado por políticas RLS mesmo quando o UPDATE funciona.
      setBusiness({ ...business, ...updates });
      setLogoFile(null);
      setCoverFile(null);
      setEditing(false);
      setNotice('As alterações do negócio foram guardadas.');
    } catch (saveError) {
      console.error(saveError);
      setError('Não foi possível guardar as alterações. Tenta de novo.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadBrandAsset(file, field) {
    if (!file || !user || !business) return;
    if (!file.type.startsWith('image/')) {
      setError('Escolha um ficheiro de imagem válido.');
      return;
    }
    const limit = field === 'logo_url' ? 8 : 10;
    if (file.size > limit * 1024 * 1024) {
      setError('A imagem deve ter no máximo ' + limit + ' MB.');
      return;
    }
    setAssetUploading(true);
    setError('');
    setNotice('');
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = business.id + '/' + field.replace('_url', '') + '-' + Date.now() + '.' + ext;
      const { error: uploadError } = await supabase.storage.from('business-media').upload(path, file, {
        upsert: false, contentType: file.type, cacheControl: '3600'
      });
      if (uploadError) throw uploadError;
      const url = supabase.storage.from('business-media').getPublicUrl(path).data?.publicUrl;
      if (!url) throw new Error('Não foi possível obter o endereço público da imagem.');
      const { error: updateError } = await supabase.from('businesses').update({ [field]: url }).eq('id', business.id).eq('owner_id', user.id);
      if (updateError) throw updateError;
      setBusiness((previous) => ({ ...previous, [field]: url }));
      setNotice(field === 'logo_url' ? 'Logo atualizada.' : 'Imagem principal atualizada.');
    } catch (uploadError) {
      console.error(uploadError);
      setError('Não foi possível guardar a imagem. ' + (uploadError.message || 'Confirma as permissões do armazenamento.'));
    } finally {
      setAssetUploading(false);
    }
  }

  async function handleLogout() {
    setError('');
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
    if (signOutError) {
      setError('Não foi possível terminar a sessão. Tente novamente.');
      return;
    }
    setUser(null);
    setBusiness(null);
    await router.replace('/');
  }

  /* =====================================================================
     GALERIA · imagens principais (3 lugares) e imagens de painel
     ===================================================================== */

  async function loadImages(businessId) {
    const { data, error: imagesError } = await supabase
      .from('business_images')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (imagesError) {
      console.error('Erro ao carregar a galeria:', imagesError);
      setImages([]);
      setGalleryError('Erro ao carregar a galeria: ' + (imagesError.message || 'erro desconhecido') + (imagesError.code ? ' [' + imagesError.code + ']' : ''));
      return null;
    }
    setGalleryError('');
    setImages(data || []);
    return data || [];
  }

  // Abre a galeria do telemóvel
  function pickImages(multiple, onFiles) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = multiple === 'video' ? 'video/mp4,video/webm,video/quicktime' : multiple === 'media' ? 'image/*,video/mp4,video/webm,video/quicktime' : 'image/*';
    input.multiple = multiple === true || multiple === 'media';
    input.onchange = () => {
      const files = Array.from(input.files || []);
      if (files.length) onFiles(files);
    };
    input.click();
  }

  // Executa uma tarefa da galeria com bloqueio, aviso de erro e respeito pela verificação do plano
  async function runGallery(task) {
    if (subscriptionPending) {
      setError('O perfil está em verificação para aprovação. Edite mais tarde, depois da validação.');
      return false;
    }
    setGalleryBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
      return true;
    } catch (galleryTaskError) {
      console.error(galleryTaskError);
      setError('Não foi possível guardar as alterações. Tenta de novo.');
      return false;
    } finally {
      setGalleryBusy(false);
    }
  }

  async function uploadGalleryFile(file, square) {
    if (file.type.startsWith('video/')) {
      if (square) throw new Error('Os vídeos são adicionados na galeria de painel, não nas três imagens principais.');
      if (!['video/mp4','video/webm','video/quicktime'].includes(file.type)) throw new Error('Use um vídeo MP4, WEBM ou MOV.');
      if (file.size > 100 * 1024 * 1024) throw new Error('O vídeo deve ter no máximo 100 MB.');
      const ext = file.type === 'video/quicktime' ? 'mov' : file.type === 'video/webm' ? 'webm' : 'mp4';
      const path = business.id + '/gallery-video-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
      const { error: uploadError } = await supabase.storage.from('business-media').upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const url = supabase.storage.from('business-media').getPublicUrl(path).data?.publicUrl;
      if (!url) throw new Error('Não foi possível obter o endereço público do vídeo.');
      return { url, path, mediaType: 'video' };
    }
    if (!file.type.startsWith('image/')) throw new Error('Escolha uma imagem ou vídeo válido.');
    if (file.size > 15 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 15 MB.');
    const blob = await prepareImage(file, square ? { square: true, size: 600 } : { max: 1200 });
    const path = business.id + '/gallery-' + (square ? 'main' : 'panel') + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
    const { error: uploadError } = await supabase.storage.from('business-media').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;
    const url = supabase.storage.from('business-media').getPublicUrl(path).data?.publicUrl;
    if (!url) throw new Error('Não foi possível obter o endereço público da imagem.');
    return { url, path, mediaType: 'image' };
  }

  async function removeStored(path) {
    if (!path) return;
    const { error: removeError } = await supabase.storage.from('business-media').remove([path]);
    if (removeError) console.error('Não foi possível apagar o ficheiro antigo:', removeError);
  }

  async function updateRow(id, fields) {
    const { data, error: updateError } = await supabase
      .from('business_images')
      .update(fields)
      .eq('id', id)
      .select('id');
    if (updateError) throw updateError;
    if (!data?.length) throw new Error('Sem permissão para alterar esta imagem.');
  }

  async function saveMainImage(slot, file) {
    await runGallery(async () => {
      if (file.type.startsWith('video/')) throw new Error('As três imagens principais aceitam apenas imagens. Adicione vídeos na galeria do painel.');
      const { url, path } = await uploadGalleryFile(file, true);
      const { error: insertError } = await supabase
        .from('business_images')
        .insert({ business_id: business.id, kind: 'main', slot, image_url: url, storage_path: path });
      if (insertError) {
        await removeStored(path);
        throw insertError;
      }
      await loadImages(business.id);
      setNotice('Imagem principal adicionada.');
    });
  }

  async function addPanelImages(files, metadata = null) {
    const batch = files.slice(0, 10);
    return await runGallery(async () => {
      let done = 0;
      try {
        for (const file of batch) {
          const { url, path, mediaType } = await uploadGalleryFile(file, false);
          const { error: insertError } = await supabase
            .from('business_images')
            .insert({ business_id: business.id, kind: 'panel', image_url: mediaType === 'video' ? null : url, video_url: mediaType === 'video' ? url : null, media_type: mediaType || 'image', storage_path: path, ...(metadata ? { name: metadata.name || null, description: metadata.description || null, price: metadata.price ?? null } : {}) });
          if (insertError) {
            await removeStored(path);
            throw insertError;
          }
          done += 1;
        }
      } finally {
        if (done > 0) await loadImages(business.id);
      }
      setNotice(
        done + (done === 1 ? ' ficheiro adicionado.' : ' ficheiros adicionados.') +
          (files.length > 10 ? ' Só as primeiras 10 foram adicionadas de uma vez.' : '')
      );
    });
  }

  function chooseProductPhotos(files) {
    const selected = Array.from(files || []);
    if (!selected.length) return;
    const invalid = selected.find(file => !file.type.startsWith('image/'));
    if (invalid) { setProductError('Adiciona apenas fotografias do produto.'); return; }
    if (selected.some(file => file.size > 15 * 1024 * 1024)) { setProductError('Cada fotografia deve ter no máximo 15 MB.'); return; }
    setProductError('');
    setProductPhotos(selected.slice(0, 10));
  }

  async function saveProductPhotos(event) {
    event.preventDefault();
    if (!productPhotos.length) { setProductError('Adiciona pelo menos uma fotografia do produto.'); return; }
    const raw = productPrice.trim().replace(/\\s/g, '').replace(',', '.');
    const price = raw === '' ? null : Number(raw);
    if (price !== null && (!Number.isFinite(price) || price < 0)) { setProductError('Indica um preço válido em Kz.'); return; }
    setProductError('');
    const saved = await addPanelImages(productPhotos, { name: productTitle.trim(), description: productDescription.trim(), price });
    if (saved) {
      setProductEditorOpen(false);
      setProductPhotos([]);
      setProductTitle('');
      setProductDescription('');
      setProductPrice('');
    }
  }

  function closeProductEditor() {
    if (galleryBusy) return;
    setProductEditorOpen(false);
    setProductPhotos([]);
    setProductTitle('');
    setProductDescription('');
    setProductPrice('');
    setProductError('');
  }

  async function replaceImage(item, file) {
    await runGallery(async () => {
      const { url, path, mediaType } = await uploadGalleryFile(file, item.kind === 'main');
      try {
        await updateRow(item.id, { image_url: mediaType === 'video' ? null : url, video_url: mediaType === 'video' ? url : null, media_type: mediaType || 'image', storage_path: path });
      } catch (replaceError) {
        await removeStored(path);
        throw replaceError;
      }
      await removeStored(item.storage_path);
      await loadImages(business.id);
      setNotice(mediaType === 'video' ? 'Vídeo atualizado.' : 'Imagem atualizada.');
    });
  }

  async function downloadGalleryItem(item) {
    if (!item) return;
    try {
      let blob = null;
      const url = item.video_url || item.image_url || '';
      if (item.storage_path) {
        const { data, error: storageError } = await supabase.storage.from('business-media').download(item.storage_path);
        if (!storageError && data) blob = data;
      }
      if (!blob && url) {
        const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
        if (!response.ok) throw new Error('Não foi possível obter o ficheiro.');
        blob = await response.blob();
      }
      if (!blob?.size) throw new Error('O ficheiro está indisponível.');
      const objectUrl = URL.createObjectURL(blob);
      const isVideo = item.media_type === 'video' || Boolean(item.video_url);
      const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('quicktime') ? 'mov' : isVideo ? 'mp4' : 'jpg';
      const name = (item.name || (isVideo ? 'video-talaza' : 'imagem-talaza')).replace(/[^a-z0-9-_ ]/gi, '').trim() || 'talaza-media';
      const link = document.createElement('a');
      link.href = objectUrl; link.download = name + '.' + ext; link.rel = 'noopener';
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
      setNotice('Transferência iniciada.');
    } catch (downloadError) {
      setError(downloadError.message || 'Não foi possível transferir o vídeo.');
    }
  }

  async function removeImage(item) {
    if (typeof window !== 'undefined' && !window.confirm('Tens a certeza?')) return;
    await runGallery(async () => {
      const { data: deleted, error: deleteError } = await supabase
        .from('business_images')
        .delete()
        .eq('id', item.id)
        .select('id');
      if (deleteError) throw deleteError;
      if (!deleted?.length) throw new Error('Sem permissão para remover esta imagem.');
      await removeStored(item.storage_path);
      await loadImages(business.id);
      setNotice(item.media_type === 'video' || item.video_url ? 'Vídeo removido.' : 'Imagem removida.');
    });
  }

  async function submitPrice(event) {
    event.preventDefault();
    const item = images.find((i) => i.id === sheet?.id);
    if (!item) return;
    const raw = sheetPrice.replace(/\s/g, '').replace(',', '.');
    let price = null;
    if (raw !== '') {
      price = Number(raw);
      if (!Number.isFinite(price) || price < 0) {
        setError('Indique um preço válido em Kz.');
        return;
      }
    }
    setSheet(null);
    await runGallery(async () => {
      await updateRow(item.id, { price });
      await loadImages(business.id);
      setNotice(price === null ? 'Preço removido.' : 'Preço guardado.');
    });
  }

  async function submitText(event) {
    event.preventDefault();
    const item = images.find((i) => i.id === sheet?.id);
    if (!item) return;
    const name = sheetName.trim() || null;
    const description = sheetDesc.trim() || null;
    setSheet(null);
    await runGallery(async () => {
      await updateRow(item.id, { name, description });
      await loadImages(business.id);
      setNotice('Nome e descrição guardados.');
    });
  }

  async function submitTitle(event) {
    event.preventDefault();
    const item = images.find((i) => i.id === sheet?.id);
    if (!item) return;
    const name = sheetName.trim() || null;
    setSheet(null);
    await runGallery(async () => { await updateRow(item.id, { name }); await loadImages(business.id); setNotice('Título guardado.'); });
  }

  async function submitDescription(event) {
    event.preventDefault();
    const item = images.find((i) => i.id === sheet?.id);
    if (!item) return;
    const description = sheetDesc.trim() || null;
    setSheet(null);
    await runGallery(async () => { await updateRow(item.id, { description }); await loadImages(business.id); setNotice('Descrição guardada.'); });
  }

  async function changeMode(mode) {
    if (!VIEW_MODES.includes(mode)) return;
    setViewMode(mode);
    if (!business || !user || subscriptionPending) return;
    const { error: modeError } = await supabase
      .from('businesses')
      .update({ panel_view_mode: mode })
      .eq('id', business.id)
      .eq('owner_id', user.id);
    if (modeError) {
      console.error(modeError);
      setError('Não foi possível guardar o modo de visualização: ' + (modeError.message || 'erro desconhecido') + (modeError.code ? ' [' + modeError.code + ']' : ''));
    }
  }

  function openPrice(item) {
    setSheetPrice(item.price !== null && item.price !== undefined ? String(item.price) : '');
    setSheet({ type: 'price', id: item.id });
  }

  function openText(item) {
    setSheetName(item.name || '');
    setSheetDesc(item.description || '');
    setSheet({ type: 'text', id: item.id });
  }

  function openTitle(item) {
    setSheetName(item.name || '');
    setSheet({ type: 'title', id: item.id });
  }

  function openDescription(item) {
    setSheetDesc(item.description || '');
    setSheet({ type: 'description', id: item.id });
  }

  function scrollToId(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#F5F7F6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#075B4E',
          fontWeight: 700
        }}
      >
        A preparar o seu painel…
      </div>
    );
  }

  if (error && !business) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#F5F7F6',
          padding: 24
        }}
      >
        <div
          style={{
            maxWidth: 600,
            margin: '80px auto',
            background: '#FFFFFF',
            borderRadius: 24,
            padding: 30,
            textAlign: 'center'
          }}
        >
          <h2 style={{ color: '#075B4E' }}>
            Não foi possível abrir o negócio
          </h2>

          <p style={{ color: '#66736F', lineHeight: 1.6 }}>
            {error}
          </p>

          <Link
            href="/"
            style={{
              display: 'inline-block',
              marginTop: 15,
              padding: '13px 20px',
              background: '#075B4E',
              color: '#FFFFFF',
              borderRadius: 12,
              textDecoration: 'none',
              fontWeight: 800
            }}
          >
            Voltar à Talaza
          </Link>
        </div>
      </div>
    );
  }

  // ---- dados derivados da galeria ----
  const mainImages = [0, 1, 2].map((slot) => images.find((i) => i.kind === 'main' && i.slot === slot) || null);
  const mainCount = mainImages.filter(Boolean).length;
  const panelImages = images.filter((i) => i.kind === 'panel');
  const heroImage = business.cover_url || null;
  const locked = subscriptionPending || galleryBusy || assetUploading;
  const sheetItem = sheet ? images.find((i) => i.id === sheet.id) : null;
  const addressLine = [business.municipality, business.neighborhood].filter(Boolean).join(' · ');
  const profileHostingActive = Boolean(
    business.is_active === true &&
    String(business.approval_status || '').trim().toLowerCase() === 'approved' &&
    hostingExpiry &&
    hostingRemainingDays > 0 &&
    !hostingExpired
  );
  const showHostingPaymentState = !hostingExpired && !profileHostingActive && !hostingProofSubmitted;

  if (hostingExpired) {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'28px 18px',boxSizing:'border-box',background:'radial-gradient(circle at 15% 15%,#DDEFE7 0,transparent 34%),radial-gradient(circle at 85% 80%,#F8E8BD 0,transparent 32%),linear-gradient(145deg,#F7FAF8 0%,#EAF3EE 48%,#F7F0DE 100%)'}}>
        <section style={{width:'100%',maxWidth:560,padding:'38px 28px',boxSizing:'border-box',borderRadius:28,background:'rgba(255,255,255,.94)',border:'1px solid rgba(212,175,55,.45)',boxShadow:'0 24px 70px rgba(7,91,78,.14)',textAlign:'center',color:'#173B35'}}>
          <img src="/icons/talaza-512.png" alt="Talaza" style={{width:112,height:112,objectFit:'contain',display:'block',margin:'0 auto 20px'}} />
          <div style={{fontSize:11,fontWeight:900,letterSpacing:2.5,color:'#A77A13',marginBottom:9}}>TALAZA · HOSPEDAGEM</div>
          <h1 style={{fontSize:'clamp(25px,5vw,34px)',lineHeight:1.15,margin:'0 0 16px',color:'#075B4E'}}>Hospedagem Expirada</h1>
          <p style={{fontSize:15,lineHeight:1.75,margin:'0 auto 13px',maxWidth:455}}>A sua Hospedagem terminou. A sua loja está pausada e não está visível na Vitrine.</p>
          <p style={{fontSize:14,lineHeight:1.75,margin:'0 auto 25px',maxWidth:455,color:'#586C63'}}>Se não renovar dentro de 15 dias, as pessoas que guardaram o seu perfil vão perdê-lo e terão de guardar novamente.</p>
          <Link href={{pathname:'/impulsionar',query:{business:business.id,tab:'hospedagem'}}} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',minHeight:48,padding:'0 24px',borderRadius:13,background:'linear-gradient(135deg,#F6D56C,#D9A51B)',color:'#173B35',fontWeight:900,fontSize:14,textDecoration:'none',boxShadow:'0 8px 20px rgba(190,145,20,.22)'}}>Renovar Hospedagem</Link>
        </section>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F7F6',
        paddingBottom: 50
      }}
    >
      <header
        style={{
          background: '#075B4E',
          color: '#FFFFFF',
          padding: '16px 20px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'visible'
        }}
      >
        <div
          style={{
            maxWidth: 1000,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            minWidth: 0,
            overflow: 'visible'
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                letterSpacing: 2,
                color: '#E6A900',
                fontWeight: 900
              }}
            >
              TALAZA
            </div>

            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                marginTop: 3
              }}
            >
              Painel do negócio
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flexShrink: 0, overflow: 'visible' }}>
            <NotificationsPanel userId={user?.id} audience="seller" />
            <div style={{position:'relative',display:'flex',alignItems:'center'}}>
              <button type="button" onClick={()=>setSavedCountPanelOpen(value=>!value)} aria-label="Ver Guardados" aria-expanded={savedCountPanelOpen} title="Guardados" style={{width:38,height:38,display:'inline-flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(255,255,255,.28)',borderRadius:11,background:'rgba(255,255,255,.10)',color:'#FFFFFF',cursor:'pointer',flexShrink:0}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 4.5h12v16l-6-3.8-6 3.8v-16Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {savedCountPanelOpen && <div role="dialog" aria-label="Total de Guardados" style={{position:'absolute',right:0,top:'calc(100% + 9px)',zIndex:30,minWidth:160,padding:'12px 14px',borderRadius:12,background:'#FFFFFF',color:'#173B35',boxShadow:'0 8px 24px rgba(0,0,0,.22)',border:'1px solid #E4ECE8',whiteSpace:'nowrap'}}><div style={{fontSize:13,lineHeight:1.55,whiteSpace:'normal',maxWidth:260}}><strong style={{display:'block',marginBottom:5}}> {Number(savedTotalCount||0).toLocaleString('pt-AO')} pessoas guardaram o seu perfil.</strong><span>Você pode anunciar diretamente a essas pessoas. Ao adicionar uma Novidade, elas recebem no painel delas.</span></div></div>}
            </div>
            <TalazaMenu
              country={business?.country_id || country}
              province={business?.province_id || province}
              countryName=""
              provinceName=""
              sellerPanelRoute="/seller"
              currentArea="seller"
            />
          </div>
        </div>
      </header>

      <nav
        aria-label="Caixas de mensagens"
        style={{
          position: 'sticky',
          top: 78,
          zIndex: 9,
          background: 'rgba(243,247,244,.96)',
          borderBottom: '1px solid #E2EBE6',
          padding: '8px 18px',
          boxShadow: 'none'
        }}
      >
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <Link href="/mensagens?box=explore" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, boxSizing: 'border-box', padding: '9px 34px 9px 10px', borderRadius: 12, background: '#FFFFFF', border: '1px solid #DCE8E2', color: '#075B4E', boxShadow: 'none', textDecoration: 'none', fontSize: 13, fontWeight: 850, textAlign: 'center' }}>
            <span aria-hidden="true" style={{display:'grid',placeItems:'center',width:25,height:25,borderRadius:8,background:'#E8F3EF',color:'#075B4E'}}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-4-.9L3 21l1.9-5.5a8.4 8.4 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3H13a8.5 8.5 0 0 1 8 8v.5Z"/></svg></span>
            <span>Mensagens do Explorar Talaza</span>
            {unreadExploreCount > 0 && <span aria-label={unreadExploreCount + ' conversas não lidas'} style={{ position: 'absolute', top: -7, right: -5, minWidth: 23, height: 23, padding: '0 6px', borderRadius: 999, boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#D8A319', color: '#30200A', border: '2px solid #FFFFFF', fontSize: 12, fontWeight: 900 }}>{unreadExploreCount}</span>}
          </Link>
          <Link href="/mensagens?box=store" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46, boxSizing: 'border-box', padding: '10px 38px 10px 12px', borderRadius: 12, background: 'linear-gradient(135deg,#F8F3FD,#E9DDF6)', border: '1px solid #D7C3E9', color: '#64358B', boxShadow: '0 4px 12px rgba(100,53,139,.08)', textDecoration: 'none', fontSize: 13, fontWeight: 850, textAlign: 'center' }}>
            <span aria-hidden="true" style={{display:'grid',placeItems:'center',width:25,height:25,borderRadius:8,background:'#E9DDF6',color:'#64358B'}}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-4-.9L3 21l1.9-5.5a8.4 8.4 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3H13a8.5 8.5 0 0 1 8 8v.5Z"/><path d="M8 10h8M8 14h5"/></svg></span>
            <span>Mensagens da minha loja</span>
            {unreadStoreCount > 0 && <span aria-label={unreadStoreCount + ' conversas não lidas'} style={{ position: 'absolute', top: -7, right: -5, minWidth: 23, height: 23, padding: '0 6px', borderRadius: 999, boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#D8A319', color: '#30200A', border: '2px solid #FFFFFF', fontSize: 12, fontWeight: 900 }}>{unreadStoreCount}</span>}
          </Link>
        </div>
      </nav>

      <input id="talaza-logo-upload" type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) uploadBrandAsset(file, 'logo_url'); }} />
      <input id="talaza-cover-upload" type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) uploadBrandAsset(file, 'cover_url'); }} />
      {musicEditorOpen && <MusicEditor initialMediaUrl={musicTargetItem?.video_url || ''} initialMediaName={musicTargetItem?.name ? musicTargetItem.name + '.mp4' : 'video-original.mp4'} videoOnly onClose={() => { setMusicEditorOpen(false); setMusicTargetItem(null); }} onExport={async (file, metadata) => { const saved = await addPanelImages([file], metadata || null); if (!saved) throw new Error('Não foi possível publicar o vídeo.'); setMusicEditorOpen(false); setMusicTargetItem(null); return true; }} />}
      <main
        style={{
          maxWidth: 1000,
          margin: '0 auto',
          padding: '24px 18px'
        }}
      >
        {profileHostingActive && hostingRemainingDays <= 10 && (
          <section role="status" aria-live="polite" style={{marginBottom:18,padding:'16px 18px',borderRadius:16,background:'#FFF4CC',border:'1px solid #E7C65D',boxShadow:'0 5px 16px rgba(150,115,20,.10)',color:'#654B08'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
              <span aria-hidden="true" style={{fontSize:25,lineHeight:1}}>⚠️</span>
              <div style={{flex:1,minWidth:0}}>
                <strong style={{display:'block',fontSize:15,lineHeight:1.45}}>A sua Hospedagem termina em {hostingRemainingDays} {hostingRemainingDays===1?'dia':'dias'}. Renove para não perder a sua loja.</strong>
                <Link href={{pathname:'/impulsionar',query:{business:business.id,tab:'hospedagem'}}} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',marginTop:11,padding:'10px 16px',borderRadius:10,background:'#D8A51C',color:'#253A2F',fontSize:13,fontWeight:900,textDecoration:'none'}}>Renovar Hospedagem</Link>
              </div>
            </div>
          </section>
        )}
        <section style={{ borderRadius: 24, overflow: 'hidden', background: '#075B4E', boxShadow: '0 16px 38px rgba(0,70,60,.14)' }}>
          <div style={{ position: 'relative', minHeight: 260, background: '#0B7563' }}>
            {heroImage ? (
              <img
                src={heroImage}
                alt={business.name ? 'Imagem principal de ' + business.name : 'Imagem principal'}
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                  event.currentTarget.parentElement?.classList.add('talaza-cover-missing');
                }}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.82)', fontWeight: 800, background: 'linear-gradient(135deg,#0B7563,#075B4E)' }}>
                Adicione a imagem principal do negócio
              </div>
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,.04) 15%,rgba(0,0,0,.70) 100%)' }} />
            <div style={{ position: 'absolute', top: 18, left: 18, width: 92, height: 92 }}>
              <div style={{ width: 92, height: 92, borderRadius: '50%', overflow: 'hidden', border: '3px solid #E6A900', background: '#FFFFFF', display: 'grid', placeItems: 'center', color: '#075B4E', fontSize: 30, fontWeight: 900 }}>
                {business.logo_url ? (
                  <img
                    src={business.logo_url}
                    alt={'Logo de ' + business.name}
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                      const fallback = event.currentTarget.parentElement?.querySelector('[data-logo-fallback]');
                      if (fallback) fallback.style.display = 'grid';
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : null}
                <span data-logo-fallback style={{ display: business.logo_url ? 'none' : 'grid', placeItems: 'center', width: '100%', height: '100%' }}>{(business.name || 'T').charAt(0).toUpperCase()}</span>
              </div>
              <button type="button" aria-label="Adicionar ou alterar logo" disabled={assetUploading || subscriptionPending} onClick={() => document.getElementById('talaza-logo-upload')?.click()} style={{ position: 'absolute', right: -5, bottom: -5, width: 32, height: 32, borderRadius: '50%', border: '2px solid #FFFFFF', background: '#E6A900', color: '#075B4E', fontSize: 23, fontWeight: 900, lineHeight: 1, cursor: assetUploading || subscriptionPending ? 'not-allowed' : 'pointer' }}>+</button>
            </div>
            <button type="button" aria-label="Alterar imagem de capa" disabled={locked} onClick={() => document.getElementById('talaza-cover-upload')?.click()} style={{ position: 'absolute', right: 16, top: 16, padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,.85)', background: '#FFFFFF', color: '#075B4E', fontSize: 12, fontWeight: 800, cursor: locked ? 'not-allowed' : 'pointer', boxShadow: '0 3px 12px rgba(0,0,0,.15)' }}>Alterar capa</button>
            <div style={{ position: 'absolute', left: 20, right: 20, bottom: 18, color: '#FFFFFF' }}>
              <div style={{ color: '#FFD04A', fontSize: 11, fontWeight: 900, letterSpacing: 1.5, marginBottom: 5 }}>O SEU NEGÓCIO</div>
              <h1 style={{ margin: 0, fontSize: 'clamp(25px,5vw,36px)', lineHeight: 1.15 }}>{business.name}</h1>
              <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5, maxWidth: 680 }}>{business.description || 'Apresente aqui o seu negócio e explique aos clientes o que oferece.'}</p>
            </div>
          </div>
        </section>

          {String(sellerReview?.status || '').toLowerCase() === 'rejected' && (
            <Link href={{ pathname: '/seller-reenvio', query: { business: business.id } }} style={{ display:'inline-flex', alignItems:'center', marginTop:18, padding:'10px 14px', borderRadius:999, background:'#FCEBED', color:'#A52F3B', border:'1px solid #E9B8BE', fontSize:12, fontWeight:900, cursor:'pointer', textDecoration:'none' }}>Perfil criado · validação recusada →</Link>
          )}
          {profileHostingActive ? (
            <section style={{display:'grid',gap:5,marginTop:18,padding:'13px 16px',borderRadius:14,background:'#E6F5EC',border:'1px solid #B7DCC4',color:'#17643B'}}>
              <strong style={{fontSize:14}}>Perfil Ativo - {hostingRemainingDays} dias restantes</strong>
              <span style={{fontSize:12}}>Data de fim da Hospedagem: {hostingExpiry?.toLocaleDateString('pt-AO',{timeZone:'Africa/Luanda'})}</span>
              {hostingLastAddedDays>0&&<span style={{fontSize:12}}>Última renovação: + {hostingLastAddedDays} dias acrescentados</span>}
            </section>
          ) : hostingNoPlan ? (
            <div role="status" style={{display:'inline-flex',alignItems:'center',marginTop:18,padding:'10px 14px',borderRadius:999,background:'#FFF4D6',color:'#674A00',fontSize:13,fontWeight:900,border:'1px solid #E7C65D'}}>
              Perfil INATIVO · SEM PLANO
            </div>
          ) : hostingPaymentApproved ? (
            <div role="status" style={{display:'inline-flex',alignItems:'center',marginTop:18,padding:'10px 14px',borderRadius:999,background:'#E8F1FF',color:'#174A82',fontSize:13,fontWeight:900,border:'1px solid #B7D0F0'}}>
              Aguarda ativação
            </div>
          ) : hostingProofSubmitted ? (
            <div role="status" style={{display:'inline-flex',alignItems:'center',marginTop:18,padding:'10px 14px',borderRadius:999,background:'#FFF1C2',color:'#5B4300',fontSize:13,fontWeight:900,border:'1px solid #EBD58C'}}>
              Aguarda validação
            </div>
          ) : showHostingPaymentState ? (
            <Link href={{pathname:'/impulsionar',query:{business:business.id,tab:'hospedagem'}}} style={{display:'inline-flex',alignItems:'center',marginTop:18,padding:'11px 15px',borderRadius:999,background:'#FDEFC5',color:'#6A4A00',border:'1px solid #E7C65D',fontSize:13,fontWeight:900,textDecoration:'none'}}>
              Perfil INATIVO · SEM PLANO — ativar Hospedagem <span aria-hidden="true" style={{marginLeft:7}}>→</span>
            </Link>
          ) : null}
          {hostingProofSubmitted && !profileHostingActive && pendingPlan && (
            <div style={{marginTop:10,padding:'12px 14px',background:'#FFF9E8',border:'1px solid #EBD58C',borderRadius:12,color:'#5B4300',fontSize:12}}>
              <strong>Plano enviado:</strong> {pendingPlan.name || pendingPlan.title || pendingPlan.plan_name || pendingPlan.nome || (pendingPlan.duration_days ? pendingPlan.duration_days + ' dias' : 'Plano selecionado')}
            </div>
          )}

        {/* Pré-visualização da loja */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
          <button type="button" onClick={() => setCustomerOpen(true)} style={{ padding: '13px 22px', borderRadius: 13, background: '#E6A900', color: '#17342F', fontWeight: 900, border: 0, cursor: 'pointer', minWidth: 150 }}>▦ Pré-visualizar loja</button>
        </div>

        <details style={{ marginTop:14, border:'1px solid #D9E8E3', borderRadius:16, background:'#FFFFFF', color:'#17342F', overflow:'hidden' }}>
          <summary style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'15px 17px',cursor:'pointer',listStyle:'none',fontWeight:850,color:'#17342F'}}>
            <span style={{display:'flex',alignItems:'center',gap:11}}><span style={{width:38,height:38,borderRadius:12,display:'grid',placeItems:'center',background:'#EAF4F1',color:'#075B4E',fontSize:21}}>⚙</span>Configurações</span>
            <span style={{color:'#075B4E',fontSize:20}}>⌄</span>
          </summary>
          <div style={{padding:'0 17px 17px',borderTop:'1px solid #EDF2EF'}}>
            <div style={{paddingTop:14}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                <div>
                  <strong style={{display:'block',fontSize:13}}>Dados e descrição do negócio</strong>
                  <p style={{margin:'4px 0 0',fontSize:12,color:'#65756E',lineHeight:1.5}}>Atualize a apresentação e os contactos que aparecem no perfil público.</p>
                </div>
                {!editing && <button type="button" disabled={subscriptionPending} onClick={()=>{setEditName(business.name||'');setEditDescription(business.description||'');setEditPhone(business.phone||'');setEditHours(business.opening_hours||'');setEditMunicipality(business.municipality||'');setEditNeighborhood(business.neighborhood||'');setEditing(true);}} style={{padding:'9px 13px',border:0,borderRadius:9,background:subscriptionPending?'#BFC9C5':'#075B4E',color:'#FFFFFF',fontSize:12,fontWeight:850,cursor:subscriptionPending?'not-allowed':'pointer'}}>Editar dados</button>}
              </div>
              {editing && (
                <form onSubmit={saveBusiness} style={{display:'grid',gap:11,marginTop:13}}>
                  <label style={{display:'grid',gap:5,fontSize:12,fontWeight:800,color:'#29443B'}}>
                    Nome do negócio *
                    <input value={editName} onChange={e=>setEditName(e.target.value)} required maxLength={120} style={{width:'100%',boxSizing:'border-box',padding:11,border:'1px solid #D9E5DF',borderRadius:10,font:'inherit',fontSize:13}} />
                  </label>
                  <label style={{display:'grid',gap:5,fontSize:12,fontWeight:800,color:'#29443B'}}>
                    Descrição do negócio
                    <textarea value={editDescription} onChange={e=>setEditDescription(e.target.value)} rows={5} maxLength={1200} placeholder="Apresente o seu negócio, os produtos ou serviços que oferece e o que o distingue." style={{width:'100%',boxSizing:'border-box',padding:11,border:'1px solid #D9E5DF',borderRadius:10,font:'inherit',fontSize:13,resize:'vertical'}} />
                  </label>
                  <label style={{display:'grid',gap:5,fontSize:12,fontWeight:800,color:'#29443B'}}>
                    Telefone
                    <input type="tel" value={editPhone} onChange={e=>setEditPhone(e.target.value)} style={{width:'100%',boxSizing:'border-box',padding:11,border:'1px solid #D9E5DF',borderRadius:10,font:'inherit',fontSize:13}} />
                  </label>
                  <label style={{display:'grid',gap:5,fontSize:12,fontWeight:800,color:'#29443B'}}>
                    Horário de funcionamento
                    <input value={editHours} onChange={e=>setEditHours(e.target.value)} placeholder="Ex.: Segunda a sábado, 08h–18h" style={{width:'100%',boxSizing:'border-box',padding:11,border:'1px solid #D9E5DF',borderRadius:10,font:'inherit',fontSize:13}} />
                  </label>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}>
                    <label style={{display:'grid',gap:5,fontSize:12,fontWeight:800,color:'#29443B'}}>
                      Município
                      <input value={editMunicipality} onChange={e=>setEditMunicipality(e.target.value)} style={{width:'100%',boxSizing:'border-box',padding:11,border:'1px solid #D9E5DF',borderRadius:10,font:'inherit',fontSize:13}} />
                    </label>
                    <label style={{display:'grid',gap:5,fontSize:12,fontWeight:800,color:'#29443B'}}>
                      Bairro
                      <input value={editNeighborhood} onChange={e=>setEditNeighborhood(e.target.value)} style={{width:'100%',boxSizing:'border-box',padding:11,border:'1px solid #D9E5DF',borderRadius:10,font:'inherit',fontSize:13}} />
                    </label>
                  </div>
                  <div style={{display:'flex',gap:9,flexWrap:'wrap'}}>
                    <button type="submit" disabled={saving||subscriptionPending} style={{padding:'11px 16px',border:0,borderRadius:10,background:saving||subscriptionPending?'#BFC9C5':'#075B4E',color:'#FFFFFF',fontSize:12,fontWeight:850,cursor:saving||subscriptionPending?'not-allowed':'pointer'}}>{saving?'A guardar…':'Guardar alterações'}</button>
                    <button type="button" disabled={saving} onClick={()=>{setEditName(business.name||'');setEditDescription(business.description||'');setEditPhone(business.phone||'');setEditHours(business.opening_hours||'');setEditMunicipality(business.municipality||'');setEditNeighborhood(business.neighborhood||'');setEditing(false);}} style={{padding:'11px 16px',border:'1px solid #D9E5DF',borderRadius:10,background:'#FFFFFF',color:'#40564D',fontSize:12,fontWeight:800}}>Cancelar</button>
                  </div>
                </form>
              )}
            </div>
            <div style={{paddingTop:14,borderTop:'1px solid #EDF2EF',marginTop:14}}>
              <strong style={{display:'block',marginBottom:5,fontSize:13}}>Privacidade do e-mail</strong>
              <p style={{margin:'0 0 12px',color:'#65756E',fontSize:12,lineHeight:1.55}}>Escolha se pretende apresentar o e-mail de contacto no perfil público. O e-mail de acesso à sua conta Talaza continua privado.</p>
              <label style={{display:'flex',alignItems:'center',gap:10,cursor:subscriptionPending||emailVisibilitySaving?'not-allowed':'pointer',fontSize:13,lineHeight:1.5}}>
                <input type="checkbox" checked={showEmail} disabled={subscriptionPending||emailVisibilitySaving} onChange={event=>saveEmailVisibility(event.target.checked)} style={{accentColor:'#075B4E'}} />
                <span><strong>{showEmail?'Mostrar e-mail aos clientes':'Ocultar e-mail aos clientes'}</strong></span>
              </label>
              {emailVisibilitySaving&&<p style={{margin:'8px 0 0',fontSize:11,color:'#65756E'}}>A guardar preferência…</p>}
            </div>
            <div style={{marginTop:17,paddingTop:14,borderTop:'1px solid #EDF2EF'}}>
              <strong style={{display:'block',fontSize:13,marginBottom:7}}>E-mail de acesso à conta</strong>
              <p style={{margin:'0 0 9px',fontSize:12,color:'#65756E',lineHeight:1.5}}>Este é o e-mail usado para entrar na sua conta Talaza, tanto como Vendedor como Explorador.</p>
              <div style={{padding:11,borderRadius:10,background:'#FFF7E2',border:'1px solid #E8CF8C',color:'#5D470C',fontSize:12,lineHeight:1.55,marginBottom:11}}>
                <strong>Atenção:</strong> só podes trocar o e-mail 1 vez a cada 6 meses. Se trocares hoje, só vais poder trocar de novo após 6 meses. Verifica bem se o e-mail está correto, não coloques um e-mail inválido.
              </div>
              <label style={{display:'grid',gap:5,fontSize:12,fontWeight:800,color:'#29443B',marginBottom:9}}>
                E-mail atual
                <input type="email" value={user?.email || ''} readOnly disabled style={{width:'100%',boxSizing:'border-box',padding:11,border:'1px solid #D9E5DF',borderRadius:10,background:'#F3F6F4',color:'#64736C',font:'inherit',fontSize:13}} />
              </label>
              {pendingEmailIsActive && (
                <div style={{padding:11,borderRadius:10,background:'#FFF7E2',border:'1px solid #E8CF8C',color:'#674D0A',fontSize:12,lineHeight:1.6,marginBottom:10}}>
                  <strong>Troca pendente para:</strong> {pendingLoginEmail}. <strong>Por confirmar.</strong>
                  <p style={{margin:'6px 0 0'}}>Enquanto não confirmares, continua a entrar com o e-mail atual.</p>
                </div>
              )}
              {lastEmailChangedAt && (() => {
                const nextAllowedDate = addSixMonths(lastEmailChangedAt);
                return nextAllowedDate ? (
                  <div style={{padding:10,borderRadius:10,background:'#F4F1FA',border:'1px solid #DED2EE',color:'#513A70',fontSize:12,lineHeight:1.6,marginBottom:10}}>
                    <strong>Última troca:</strong> {formatEmailChangeDate(lastEmailChangedAt)}.
                    <br />
                    <strong>Próxima troca disponível em:</strong> {formatEmailChangeDate(nextAllowedDate)}.
                  </div>
                ) : null;
              })()}
              <form onSubmit={changeLoginEmail} style={{display:'grid',gap:9}}>
                <label style={{display:'grid',gap:5,fontSize:12,fontWeight:800,color:'#29443B'}}>
                  Novo e-mail
                  <input type="email" value={newLoginEmail} onChange={event=>{setNewLoginEmail(event.target.value);setEmailChangeFeedback('');}} autoComplete="email" placeholder="nome@exemplo.com" required disabled={emailChangeBusy || pendingEmailIsActive || (lastEmailChangedAt && addSixMonths(lastEmailChangedAt) && Date.now() < addSixMonths(lastEmailChangedAt).getTime())} style={{width:'100%',boxSizing:'border-box',padding:11,border:'1px solid #D9E5DF',borderRadius:10,font:'inherit',fontSize:13}} />
                </label>
                <label style={{display:'grid',gap:5,fontSize:12,fontWeight:800,color:'#29443B'}}>
                  Confirmar novo e-mail
                  <input type="email" value={confirmLoginEmail} onChange={event=>{setConfirmLoginEmail(event.target.value);setEmailChangeFeedback('');}} autoComplete="email" placeholder="Repete o novo e-mail" required disabled={emailChangeBusy || pendingEmailIsActive || (lastEmailChangedAt && addSixMonths(lastEmailChangedAt) && Date.now() < addSixMonths(lastEmailChangedAt).getTime())} style={{width:'100%',boxSizing:'border-box',padding:11,border:'1px solid #D9E5DF',borderRadius:10,font:'inherit',fontSize:13}} />
                </label>
                <button type="submit" disabled={emailChangeBusy || pendingEmailIsActive || (lastEmailChangedAt && addSixMonths(lastEmailChangedAt) && Date.now() < addSixMonths(lastEmailChangedAt).getTime())} style={{justifySelf:'start',padding:'11px 16px',border:0,borderRadius:10,background:emailChangeBusy || pendingEmailIsActive || (lastEmailChangedAt && addSixMonths(lastEmailChangedAt) && Date.now() < addSixMonths(lastEmailChangedAt).getTime())?'#BFC9C5':'#075B4E',color:'#FFFFFF',fontSize:12,fontWeight:850,cursor:emailChangeBusy || pendingEmailIsActive || (lastEmailChangedAt && addSixMonths(lastEmailChangedAt) && Date.now() < addSixMonths(lastEmailChangedAt).getTime())?'not-allowed':'pointer'}}>{emailChangeBusy?'A alterar e-mail…':'Alterar e-mail'}</button>
              </form>
              {emailChangeFeedback && <p role="status" style={{margin:'10px 0 0',padding:10,borderRadius:9,background:emailChangeFeedbackType==='success'?'#EAF6F0':'#FFF0EF',border:'1px solid '+(emailChangeFeedbackType==='success'?'#B8DDC9':'#E8BDB8'),color:emailChangeFeedbackType==='success'?'#176244':'#A52F3B',fontSize:12,lineHeight:1.55}}>{emailChangeFeedback}</p>}
            </div>
            <div style={{marginTop:17,paddingTop:14,borderTop:'1px solid #EDF2EF'}}>
              <strong style={{display:'block',fontSize:13,marginBottom:5}}>Suporte Talaza</strong>
              <p style={{margin:'0 0 10px',fontSize:12,color:'#65756E',lineHeight:1.55}}>Precisa de ajuda com a sua loja? Envie uma mensagem à equipa Talaza.</p>
              <textarea value={supportDraft} onChange={event=>{setSupportDraft(event.target.value);setSupportFeedback('');}} rows={3} placeholder="Escreva a sua mensagem…" style={{width:'100%',boxSizing:'border-box',resize:'vertical',border:'1px solid #D9E5DF',borderRadius:11,padding:11,font:'inherit',fontSize:12,color:'#17342F'}} />
              <button type="button" disabled={!supportDraft.trim()||supportSending} onClick={sendSellerSupport} style={{marginTop:8,padding:'10px 15px',border:0,borderRadius:10,background:supportDraft.trim()&&!supportSending?'#075B4E':'#BFC9C5',color:'#fff',fontSize:12,fontWeight:800,cursor:supportDraft.trim()&&!supportSending?'pointer':'not-allowed'}}>{supportSending?'A enviar…':'Enviar ao Suporte Talaza'}</button>
              {supportFeedback&&<p role="status" style={{margin:'8px 0 0',fontSize:12,color:supportFeedback.startsWith('Mensagem enviada')?'#08745F':'#A52F3B'}}>{supportFeedback}</p>}
            </div>
          </div>
        </details>

        <details style={{marginTop:12,border:'1px solid #E1EBE5',borderRadius:13,background:'#FFFFFF',overflow:'hidden'}}>
          <summary style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,padding:'13px 15px',cursor:'pointer',listStyle:'none',color:'#075B4E',fontWeight:850}}>
            <span>Novidades <small style={{fontWeight:500,color:'#718078'}}>· {businessUpdates.length} publicadas</small></span><span aria-hidden="true">⌄</span>
          </summary>
          <div style={{padding:'0 14px 14px',borderTop:'1px solid #EDF2EF'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <div><p style={{margin:0,fontSize:12,color:'#65756E'}}>Publique uma imagem ou vídeo vertical (9:16). Cada publicação fica disponível durante 7 dias.</p></div>
            <label style={{padding:'11px 15px',borderRadius:10,background:subscriptionPending?'#AAB4AF':'#075B4E',color:'#fff',fontWeight:800,fontSize:12,cursor:subscriptionPending?'not-allowed':'pointer'}}>
              {updateBusy?'A publicar…':'＋ Publicar novidade'}
              <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" disabled={subscriptionPending || updateBusy} hidden onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)publishBusinessUpdate(f);}} />
            </label>
          </div>
          <p style={{fontSize:11,lineHeight:1.5,color:'#75847D',margin:'8px 0'}}>Visível para clientes que guardaram a sua loja.</p>
          {updateError && <p role="alert" style={{color:'#A52F3B',fontSize:12}}>{updateError}</p>}
          {businessUpdates.length>0 && <div style={{display:'flex',gap:12,overflowX:'auto',padding:'5px 0'}}>
            {businessUpdates.map(item=><div key={item.id} style={{flex:'0 0 120px',width:120}}>
              {item.media_type==='video'?<video src={item.signedUrl} controls playsInline style={{width:120,aspectRatio:'9/16',objectFit:'cover',borderRadius:12,background:'#111'}}/>:<img src={item.signedUrl} alt="Novidade publicada" style={{width:120,aspectRatio:'9/16',objectFit:'cover',borderRadius:12}}/>}
              <small style={{display:'block',marginTop:5,color:'#65756E'}}>Expira {new Date(item.expires_at).toLocaleDateString('pt-PT')}</small>
            </div>)}
          </div>}
          {!businessUpdates.length && !updateError && <p style={{fontSize:12,color:'#8A9992',marginBottom:0}}>Ainda não publicou novidades.</p>}
          </div>
        </details>

        {/* IMAGENS PRINCIPAIS · 3 lugares · 600x600 */}
        <details id="galeria-principais" className="gal-sec">
          <summary className="gal-summary"><span>Imagens principais</span><small>{mainCount}/3 imagens</small><span aria-hidden="true">⌄</span></summary>
          <div className="gal-content">
          <div className="gal-head">
            <h2>Imagens principais</h2>
            <span className="gal-count">{mainCount}/3</span>
          </div>
          <p className="gal-sub">3 lugares · formato 600×600 px (apenas imagens)</p>
          {galleryError && <div role="alert" className="gal-alert">{galleryError}</div>}
          <div className="mains">
            {mainImages.map((item, slot) =>
              item ? (
                <article key={item.id} className="mc">
                  <img src={item.image_url} alt={'Imagem principal ' + (slot + 1)} />
                  {item.price !== null && item.price !== undefined && item.price !== '' && <span className="pill">{formatKz(item.price)}</span>}
                  {!subscriptionPending && (
                    <button type="button" className="kb" aria-label="Opções da imagem" disabled={galleryBusy} onClick={() => setSheet({ type: 'menu', id: item.id })}>⋮</button>
                  )}
                  {!subscriptionPending && (
                    <div className="mainActions">
                      <button type="button" className="edit" disabled={galleryBusy} onClick={() => openPrice(item)}>✎ Preço</button>
                      <button type="button" className="edit" disabled={galleryBusy} onClick={() => openText(item)}>✎ Descrição</button>
                      <button type="button" className="deleteAction" disabled={galleryBusy} onClick={() => removeImage(item)}>Eliminar</button>
                    </div>
                  )}
                </article>
              ) : (
                <button
                  key={'vazio-' + slot}
                  type="button"
                  className="mc vazio"
                  disabled={locked}
                  onClick={() => pickImages(false, (files) => saveMainImage(slot, files[0]))}
                >
                  <div>
                    <div className="big">+</div>
                    Adicionar imagem
                  </div>
                </button>
              )
            )}
          </div>
          </div>
        </details>

        <details style={{marginTop:12,border:'1px solid #E1EBE5',borderRadius:13,background:'#FFFFFF',overflow:'hidden'}}>
          <summary style={{padding:'13px 15px',cursor:'pointer',listStyle:'none',fontWeight:850,color:'#075B4E'}}>Contactos e localização <span style={{float:'right'}}>⌄</span></summary>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))',gap:10,padding:'0 15px 14px',borderTop:'1px solid #EDF2EF'}}>
          <div style={{ color: '#075B4E', fontSize: 13, lineHeight: 1.7 }}><strong>Telefone</strong><div>{business.phone || 'Não definido'}</div></div>
          <div style={{ color: '#075B4E', fontSize: 13, lineHeight: 1.7 }}><strong>Horário</strong><div>{business.opening_hours || 'Não definido'}</div></div>
          {addressLine && <div style={{ color: '#075B4E', fontSize: 13, lineHeight: 1.7 }}><strong>Endereço</strong><div>{addressLine}</div></div>}
          </div>
        </details>

        {/* IMAGENS DE PAINEL · 3 modos */}
        <details id="galeria-painel" className="gal-sec">
          <summary className="gal-summary"><span>Imagens e vídeos</span><small>{panelImages.length} publicações</small><span aria-hidden="true">⌄</span></summary>
          <div className="gal-content">
          <div className="gal-head">
            <h2>Conteúdo do painel</h2>
            <span className="gal-count">{panelImages.length}</span>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <button type="button" className="gal-add" disabled={locked || galleryBusy} onClick={() => { setProductError(''); setProductEditorOpen(true); }}>＋ Adicionar fotos do produto</button>
              <button type="button" className="gal-add" disabled={locked || galleryBusy} onClick={() => { setMusicTargetItem(null); setMusicEditorOpen(true); }}>＋ Criar vídeo no TALAZA STUDIO</button>
            </div>
          </div>
          <div className="gal-rot">Adiciona fotografias dos produtos aqui. Para criar um vídeo, usa separadamente o TALAZA STUDIO.</div>
          <ProductsView
            items={panelImages}
            mode={viewMode}
            onModeChange={changeMode}
            editable={!subscriptionPending}
            onEdit={(item) => setSheet({ type: 'menu', id: item.id })}
            whatsapp={business.phone}
            businessName={business.name}
          />
          </div>
        </details>

        <button
          type="button"
          onClick={async () => {
            // Navegação completa para a Vitrine, mantendo a mesma sessão de autenticação.
            // A localização principal vem do perfil pessoal, nunca da localização da loja.
            let homeCountry = '';
            let homeProvince = '';
            try {
              const { data: authData, error: authError } = await supabase.auth.getUser();
              if (authError) throw authError;
              if (authData?.user?.id) {
                const { data: profile, error: profileError } = await supabase
                  .from('profiles')
                  .select('country_id, province_id')
                  .eq('id', authData.user.id)
                  .maybeSingle();
                if (profileError) throw profileError;
                homeCountry = profile?.country_id || '';
                homeProvince = profile?.province_id || '';
              }
            } catch (exploreError) {
              console.error('Não foi possível carregar a localização principal do explorador:', exploreError);
            }
            const params = new URLSearchParams();
            if (homeCountry || business.country_id) params.set('country', homeCountry || business.country_id);
            if (homeProvince || business.province_id) params.set('province', homeProvince || business.province_id);
            if (homeCountry || business.country_id) params.set('homeCountry', homeCountry || business.country_id);
            if (homeProvince || business.province_id) params.set('homeProvince', homeProvince || business.province_id);
            window.location.assign('/explore' + (params.toString() ? '?' + params.toString() : ''));
          }}
          style={{ display: 'block', width: '100%', marginTop: 14, padding: 13, borderRadius: 12, border: '1.5px solid #075B4E', background: '#FFFFFF', color: '#075B4E', fontWeight: 800, cursor: 'pointer' }}
        >
          ← Ir para a Vitrine principal como cliente
        </button>
        <button type="button" onClick={() => { if (!subscriptionPending) router.push({ pathname: '/impulsionar', query: { business: business.id } }); }} disabled={subscriptionPending} style={{ position: 'fixed', right: 0, top: '44%', zIndex: 15, writingMode: 'vertical-rl', transform: 'rotate(180deg)', padding: '18px 12px', borderRadius: '18px 0 0 18px', background: 'linear-gradient(160deg,#F7CF45,#E6A900 55%,#C98F00)', color: '#17342F', boxShadow: '-6px 8px 22px rgba(201,143,0,.35)', fontWeight: 900, letterSpacing: 1, border: 0, cursor: subscriptionPending ? 'not-allowed' : 'pointer' }} aria-label="Impulsionar negócio">⚡ Impulsionar</button>

      </main>

      {/* Vista do cliente (botão Produtos) */}
      {customerOpen && (
        <div className="full" role="dialog" aria-modal="true" aria-label="Produtos como o cliente vê">
          <div className="full-cab">
            <button type="button" aria-label="Fechar" onClick={() => setCustomerOpen(false)}>←</button>
            <div>
              <b>{business.name}</b>
              <small>Assim o cliente vê os seus produtos</small>
            </div>
          </div>
          <div className="full-body">
            <ProductsView
              items={panelImages}
              mode={viewMode}
              onModeChange={changeMode}
              editable={false}
              whatsapp={business.whatsapp || business.phone}
              businessName={business.name}
            />
          </div>
        </div>
      )}

      {productEditorOpen && (
        <div className="veu" onClick={(event) => { if (event.target === event.currentTarget) closeProductEditor(); }}>
          <form className="folha" role="dialog" aria-modal="true" aria-label="Adicionar produto" onSubmit={saveProductPhotos}>
            <h3 style={{fontSize:19,marginBottom:6}}>Adicionar produto</h3>
            <p style={{fontSize:12,color:'#65756E',margin:'0 0 14px'}}>As fotografias são obrigatórias. O vídeo é opcional e pode ser criado separadamente no TALAZA STUDIO.</p>
            <label style={{display:'block',fontSize:12,fontWeight:800,color:'#29443B',marginBottom:7}}>Adicionar fotos do produto *</label>
            <input type="file" accept="image/*" multiple required={productPhotos.length===0} onChange={event=>chooseProductPhotos(event.target.files)} style={{width:'100%',boxSizing:'border-box',padding:12,border:'1px dashed #9BB8AA',borderRadius:11,background:'#F7FBF8'}} />
            {productPhotoPreviews.length>0 && <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(82px,1fr))',gap:8,marginTop:12}}>{productPhotoPreviews.map((url,index)=><img key={url} src={url} alt={'Pré-visualização da fotografia '+(index+1)} style={{width:'100%',aspectRatio:'1/1',objectFit:'cover',borderRadius:10,border:'1px solid #D9E5DF'}} />)}</div>}
            <label style={{display:'grid',gap:5,fontSize:12,fontWeight:800,color:'#29443B',marginTop:14}}>Nome do produto<input value={productTitle} onChange={event=>setProductTitle(event.target.value)} maxLength={80} placeholder="Nome do produto" style={{width:'100%',boxSizing:'border-box',padding:11,border:'1px solid #D9E5DF',borderRadius:10,font:'inherit'}} /></label>
            <label style={{display:'grid',gap:5,fontSize:12,fontWeight:800,color:'#29443B',marginTop:10}}>Descrição<textarea value={productDescription} onChange={event=>setProductDescription(event.target.value)} rows={3} maxLength={500} placeholder="Descreve o produto" style={{width:'100%',boxSizing:'border-box',padding:11,border:'1px solid #D9E5DF',borderRadius:10,font:'inherit',resize:'vertical'}} /></label>
            <label style={{display:'grid',gap:5,fontSize:12,fontWeight:800,color:'#29443B',marginTop:10}}>Preço em Kz (opcional)<input type="number" min="0" step="any" value={productPrice} onChange={event=>setProductPrice(event.target.value)} placeholder="Ex.: 15000" style={{width:'100%',boxSizing:'border-box',padding:11,border:'1px solid #D9E5DF',borderRadius:10,font:'inherit'}} /></label>
            {productError && <p role="alert" style={{margin:'10px 0 0',padding:10,borderRadius:9,background:'#FFF0EF',color:'#A52F3B',fontSize:12}}>{productError}</p>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:16}}><button type="button" className="cancelar" onClick={closeProductEditor} disabled={galleryBusy}>Cancelar</button><button type="submit" className="guardar" disabled={galleryBusy || !productPhotos.length}>{galleryBusy?'A guardar…':'Guardar produto'}</button></div>
          </form>
        </div>
      )}

      {/* Folha de opções / preço / nome e descrição */}
      {sheet && sheetItem && (
        <div className="veu" onClick={(event) => { if (event.target === event.currentTarget) setSheet(null); }}>
          <div className="folha" role="dialog" aria-modal="true">
            {sheet.type === 'menu' && (
              <>
                <h3>{sheetItem.kind === 'main' ? 'Imagem principal ' + ((sheetItem.slot ?? 0) + 1) : (sheetItem.name || 'Imagem de painel')}</h3>
                <button type="button" className="op" onClick={() => openTitle(sheetItem)}>Alterar título</button>
                <button type="button" className="op" onClick={() => openDescription(sheetItem)}>Alterar descrição</button>
                <button type="button" className="op" onClick={() => openPrice(sheetItem)}>Alterar preço</button>
                {sheetItem.kind === 'panel' && ((sheetItem.media_type === 'video') || Boolean(sheetItem.video_url)) ? <button type="button" className="op" onClick={() => { const item = sheetItem; setSheet(null); downloadGalleryItem(item); }}>Transferir vídeo</button> : <button type="button" className="op" onClick={() => { const item = sheetItem; setSheet(null); pickImages('media', (files) => replaceImage(item, files[0])); }}>Trocar imagem</button>}
                <button type="button" className="op perigo" onClick={() => { const item = sheetItem; setSheet(null); removeImage(item); }}>Eliminar</button>
              </>
            )}
            {sheet.type === 'price' && (
              <form onSubmit={submitPrice}>
                <h3>{sheetItem.price ? 'Alterar preço' : 'Adicionar preço'}</h3>
                <label htmlFor="talaza-preco">Preço em Kz</label>
                <input id="talaza-preco" type="number" inputMode="decimal" min="0" step="any" placeholder="Ex.: 15000" value={sheetPrice} onChange={(event) => setSheetPrice(event.target.value)} autoFocus />
                <div className="acoes">
                  <button type="button" className="cancelar" onClick={() => setSheet(null)}>Cancelar</button>
                  <button type="submit" className="guardar">Guardar</button>
                </div>
              </form>
            )}
            {sheet.type === 'title' && (
              <form onSubmit={submitTitle}>
                <h3>Alterar título</h3>
                <label htmlFor="talaza-nome">Título</label>
                <input id="talaza-nome" maxLength={80} placeholder="Título do vídeo" value={sheetName} onChange={(event) => setSheetName(event.target.value)} autoFocus />
                <div className="acoes"><button type="button" className="cancelar" onClick={() => setSheet(null)}>Cancelar</button><button type="submit" className="guardar">Guardar</button></div>
              </form>
            )}
            {sheet.type === 'description' && (
              <form onSubmit={submitDescription}>
                <h3>Alterar descrição</h3>
                <label htmlFor="talaza-desc">Descrição</label>
                <textarea id="talaza-desc" maxLength={500} placeholder="Descrição do vídeo" value={sheetDesc} onChange={(event) => setSheetDesc(event.target.value)} autoFocus />
                <div className="acoes"><button type="button" className="cancelar" onClick={() => setSheet(null)}>Cancelar</button><button type="submit" className="guardar">Guardar</button></div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Aviso (guardado / erro) */}
      {(notice || error) && (
        <div className={'toast ' + (error ? 'err' : 'ok')} role={error ? 'alert' : 'status'} onClick={() => { setNotice(''); setError(''); }}>
          {error || notice}
        </div>
      )}

      {galleryBusy && <div className="busy" role="status">A guardar…</div>}

      <style jsx>{`
        button{font:inherit}
        .gal-sec{margin-top:12px;background:#fff;border:1px solid #E1EBE5;border-radius:13px;padding:0;scroll-margin-top:84px;box-shadow:none;overflow:hidden}
        .gal-summary{display:flex;align-items:center;gap:10px;padding:13px 15px;cursor:pointer;list-style:none;color:#075B4E;font-size:14px;font-weight:850}
        .gal-summary::-webkit-details-marker{display:none}.gal-summary small{margin-left:auto;color:#7A8981;font-size:11px;font-weight:600}
        .gal-content{padding:14px;border-top:1px solid #EDF2EF}
        .gal-head{display:flex;align-items:center;gap:10px;margin-bottom:4px}
        .gal-head h2{margin:0;font-size:19px;color:#075B4E;flex:1}
.mainActions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.mainActions .edit{flex:1;min-width:0;padding:8px 7px;font-size:11px}.deleteAction{border:1px solid #c83c35;background:#fff;color:#b42318;border-radius:9px;padding:8px 10px;font-weight:800;font-size:11px;cursor:pointer}.deleteAction:disabled{opacity:.55}
        .gal-count{font-weight:700;color:#5A6A64;font-size:14px}
        .gal-add{background:#075B4E;color:#fff;font-weight:700;font-size:13px;padding:8px 12px;border-radius:10px;border:0;cursor:pointer}
        .gal-add:disabled{opacity:.5;cursor:not-allowed}
        .gal-sub{margin:0 0 12px;font-size:12.5px;color:#5A6A64}
        .gal-rot{font-size:14px;font-weight:700;margin:2px 0 8px;color:#075B4E}
        .gal-alert{margin:0 0 10px;padding:11px 13px;background:#FCEBED;color:#A52F3B;border-radius:12px;font-size:13px}

        .mains{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding-bottom:2px}
        .mains::-webkit-scrollbar{display:none}
        .mc{position:relative;flex:0 0 72%;aspect-ratio:1/1;border-radius:14px;overflow:hidden;scroll-snap-align:center;background:#E8F2EE}
        .mc img{width:100%;height:100%;object-fit:cover;display:block}
        .pill{position:absolute;left:8px;top:8px;background:rgba(15,22,20,.74);color:#fff;font-weight:800;font-size:13px;padding:5px 10px;border-radius:999px}
        .pill.sem{background:rgba(255,255,255,.88);color:#5A6A64;font-weight:600}
        .kb{position:absolute;right:8px;top:8px;width:30px;height:30px;border-radius:50%;border:0;background:rgba(15,22,20,.74);color:#fff;font-size:17px;font-weight:900;line-height:1;display:grid;place-items:center;cursor:pointer}
        .edit{position:absolute;left:8px;right:8px;bottom:8px;background:#fff;border:0;border-radius:10px;padding:10px 8px;font-size:13px;color:#14201C;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.18)}
        .mc.vazio{border:2px dashed #8FBFB1;display:grid;place-items:center;color:#075B4E;font-weight:700;font-size:13px;text-align:center;cursor:pointer}
        .mc.vazio:disabled{opacity:.55;cursor:not-allowed}
        .big{width:46px;height:46px;border-radius:50%;background:#075B4E;color:#fff;display:grid;place-items:center;font-size:28px;margin:0 auto 8px}
        @media (min-width:640px){.mc{flex:1 1 0}}

        .full{position:fixed;inset:0;z-index:70;background:#EEF2F0;overflow-y:auto}
        .full-cab{position:sticky;top:0;z-index:5;background:#075B4E;color:#fff;display:flex;align-items:center;gap:12px;padding:10px 14px}
        .full-cab button{width:36px;height:36px;border-radius:10px;border:0;background:rgba(255,255,255,.14);color:#fff;font-size:18px;cursor:pointer}
        .full-cab b{display:block;font-size:16px}
        .full-cab small{display:block;opacity:.85;font-size:12px}
        .full-body{max-width:560px;margin:0 auto;padding:12px 14px 40px}

        .veu{position:fixed;inset:0;background:rgba(10,20,17,.55);z-index:90;display:flex;align-items:flex-end;justify-content:center}
        .folha{background:#fff;width:100%;max-width:560px;border-radius:20px 20px 0 0;padding:16px 16px calc(18px + env(safe-area-inset-bottom));max-height:92vh;overflow-y:auto}
        .folha h3{margin:0 0 6px;font-size:17px;color:#14201C}
        .op{display:flex;align-items:center;width:100%;text-align:left;padding:14px 4px;font-size:15px;border:0;border-top:1px solid #EDF1EF;background:none;color:#14201C;cursor:pointer}
        .op.perigo{color:#B3261E}
        label{display:block;font-size:12.5px;font-weight:700;color:#5A6A64;margin:12px 0 5px}
        input,textarea{width:100%;box-sizing:border-box;padding:12px;border:2px solid #CFD9D5;border-radius:11px;font:inherit;font-size:15px}
        textarea{min-height:84px;resize:vertical}
        .acoes{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}
        .acoes button{padding:13px;border-radius:11px;font-weight:700;border:0;cursor:pointer}
        .cancelar{background:#E9EEEC;color:#14201C}
        .guardar{background:#075B4E;color:#fff}

        .toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:130;max-width:90%;padding:11px 15px;border-radius:12px;font-size:13.5px;font-weight:700;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.2);cursor:pointer}
        .toast.ok{background:#E8F6F1;color:#075B4E}
        .toast.err{background:#FCEBED;color:#A52F3B}
        .busy{position:fixed;left:50%;top:76px;transform:translateX(-50%);z-index:130;background:#14201C;color:#fff;padding:8px 14px;border-radius:999px;font-size:13px}
      `}</style>
    </div>
  );
}