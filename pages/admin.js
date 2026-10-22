 import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

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
  const [subscriptionRequests, setSubscriptionRequests] = useState([]);
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
  const [events, setEvents] = useState([]);
  const [jobPosts, setJobPosts] = useState([]);
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
  const [officialArchive, setOfficialArchive] = useState([]);
  const [notificationAudience, setNotificationAudience] = useState('all');
  const [notificationUserId, setNotificationUserId] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [reviewingPaymentId, setReviewingPaymentId] = useState('');
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
    checkAdmin();
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
    await loadSubscriptionRequests();
    await loadCommunityReports();
    await loadPendingCommunityPosts();
    await loadSupportMessages();
    await loadAdminNotifications();
    await loadProfiles();
    await loadEvents();
    await loadJobPosts();
    await loadOfficialArchive();

    setLoading(false);
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
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setMessage(error.message);
      return;
    }

    // Só entra na fila de aprovação quando o perfil está completo e existe comprovativo de plano.
    const { data: proofRows, error: proofError } = await supabase
      .from('payment_submissions')
      .select('business_id, plan_id, proof_url, status')
      .not('proof_url', 'is', null);
    if (proofError) {
      console.error('Erro ao validar comprovativos dos negócios:', proofError);
      setMessage('Não foi possível validar os comprovativos dos vendedores: ' + proofError.message);
      setBusinesses([]);
      return;
    }
    const readyBusinessIds = new Set((proofRows || [])
      .filter((payment) => payment.business_id && payment.plan_id && String(payment.proof_url || '').trim())
      .map((payment) => payment.business_id));
    setBusinesses((data || []).filter((business) =>
      business.name?.trim() &&
      business.description?.trim() &&
      business.country_id &&
      business.province_id &&
      business.category_id &&
      business.subcategory_id &&
      readyBusinessIds.has(business.id)
    ));
  }

  async function loadSubscriptionRequests() {
    const { data, error } = await supabase
      .from('payment_submissions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Erro ao carregar pagamentos:', error);
      setMessage('Perfis carregados. Não foi possível carregar pedidos de pagamento: ' + error.message);
      setSubscriptionRequests([]);
      return;
    }
    // Comprovativos sem ficheiro não entram em nenhuma fila de aprovação.
    const requests = (data || []).filter((item) => String(item.proof_url || '').trim() && (item.business_id || item.event_id));
    setSubscriptionRequests(requests);

    const businessIds = [...new Set(requests.map(item => item.business_id).filter(Boolean))];
    const planIds = [...new Set(requests.map(item => item.plan_id).filter(Boolean))];

    if (businessIds.length) {
      const { data: businessRows, error: businessNamesError } = await supabase
        .from('businesses').select('id, name').in('id', businessIds);
      if (businessNamesError) console.error('Erro ao carregar nomes dos negócios:', businessNamesError);
      else setBusinessNames(Object.fromEntries((businessRows || []).map(item => [item.id, item.name])));
    } else setBusinessNames({});

    if (planIds.length) {
      const { data: planRows, error: planNamesError } = await supabase
        .from('plans').select('id, name, title, plan_name, nome, duration_days').in('id', planIds);
      if (planNamesError) console.error('Erro ao carregar nomes dos planos:', planNamesError);
      else {
        const namesById = {};
        (planRows || []).forEach((item) => {
          namesById[item.id] =
            item.name ||
            item.title ||
            item.plan_name ||
            item.nome ||
            (item.duration_days ? String(item.duration_days) + ' dias' : 'Plano');
        });
        setPlanNames(namesById);
      }
    } else setPlanNames({});
  }

  async function updateBusiness(id, status) {
    const businessForReview = businesses.find((item) => item.id === id);
    const rejectionReason = status === 'rejected'
      ? window.prompt('Indique o motivo da recusa do cadastro do vendedor:')
      : '';

    if (status === 'rejected' && (!rejectionReason || !rejectionReason.trim())) return;

    let approvedPayment = null;
    let planDuration = 0;
    let endDate = null;

    // A aprovação comercial e a hospedagem são coisas diferentes:
    // o perfil só fica ativo se existir um pagamento aprovado com plano válido.
    if (status === 'approved') {
      const { data: payment, error: paymentError } = await supabase
        .from('payment_submissions')
        .select('id, plan_id, status')
        .eq('business_id', id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (paymentError) {
        alert('Não foi possível confirmar o pagamento: ' + paymentError.message);
        return;
      }

      if (payment?.plan_id) {
        const { data: plan, error: planError } = await supabase
          .from('plans')
          .select('duration_days')
          .eq('id', payment.plan_id)
          .maybeSingle();

        if (planError) {
          alert('Não foi possível confirmar a duração do plano: ' + planError.message);
          return;
        }

        planDuration = Number(plan?.duration_days) || 0;
        if (planDuration > 0) {
          approvedPayment = payment;
          endDate = new Date(Date.now() + planDuration * 86400000).toISOString();
        }
      }
    }

    // Não escrever trial_ends_at em businesses: essa coluna não existe.
    // O período de hospedagem fica registado em business_subscriptions.
    if (status === 'approved' && approvedPayment && endDate) {
      const { data: existingSubscription, error: subscriptionReadError } = await supabase
        .from('business_subscriptions')
        .select('id')
        .eq('business_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subscriptionReadError) {
        alert('Não foi possível consultar a hospedagem atual: ' + subscriptionReadError.message);
        return;
      }

      const subscription = {
        business_id: id,
        plan_id: approvedPayment.plan_id,
        starts_at: new Date().toISOString(),
        status: 'active',
        expires_at: endDate,
      };

      const subscriptionResult = existingSubscription?.id
        ? await supabase
            .from('business_subscriptions')
            .update(subscription)
            .eq('id', existingSubscription.id)
            .select('id')
            .maybeSingle()
        : await supabase
            .from('business_subscriptions')
            .insert(subscription)
            .select('id')
            .maybeSingle();

      if (subscriptionResult.error || !subscriptionResult.data) {
        alert('O pagamento está aprovado, mas não foi possível registar a hospedagem em business_subscriptions: ' + (subscriptionResult.error?.message || 'Nenhuma linha foi alterada.'));
        return;
      }
    }

    const isPaid = status === 'approved' && Boolean(approvedPayment && endDate);
    const updates = {
      approval_status: status,
      is_active: isPaid,
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
              ? 'O seu perfil foi aprovado e a hospedagem está ativa até ' + new Date(endDate).toLocaleDateString('pt-PT') + '.'
              : 'O seu perfil foi aprovado na análise, mas ainda não tem um pagamento aprovado com plano válido. Por isso, não ficará visível na Vitrine até a hospedagem ser confirmada.')
          : 'O seu cadastro de vendedor foi recusado. Motivo: ' + rejectionReason.trim(),
        'seller_review'
      );
    }

    await loadBusinesses();
    alert(status === 'approved'
      ? (isPaid ? 'Perfil aprovado e hospedagem ativada.' : 'Perfil aprovado na análise, mas permanece inativo até existir uma hospedagem paga válida.')
      : 'Cadastro recusado.');
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
    const { data, error } = await supabase.from('job_posts').select('*').order('created_at', { ascending: false });
    if (error) { console.error('Erro ao carregar oportunidades:', error); setMessage('Não foi possível carregar oportunidades: ' + error.message); setJobPosts([]); return; }
    // Contratar é gratuito: uma oportunidade só entra na fila quando o formulário essencial está completo.
    setJobPosts((data || []).filter((item) =>
      item.user_id &&
      item.country_id &&
      item.province_id &&
      item.title?.trim() &&
      item.description?.trim()
    ));
  }

  async function notifyUser(userId, title, body, type = 'admin_review') {
    if (!userId) return;
    const { error } = await supabase.from('notifications').insert({ user_id: userId, title, body, type: 'individual' });
    if (error) console.error('A alteração foi feita, mas a notificação falhou:', error.message);
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
    const reason = approved ? '' : window.prompt('Indique o motivo da recusa da oportunidade:');
    if (!approved && (!reason || !reason.trim())) return;
    // Publicar uma vaga em Contratar é gratuito. O plano pago pertence a quem consulta Oportunidades.
    const patch = approved
      ? { status: 'published', is_active: true, admin_approved: true }
      : { status: 'rejected', is_active: false, admin_approved: false };
    const { data, error } = await supabase.from('job_posts').update(patch).eq('id', post.id).select('id, user_id').maybeSingle();
    if (error || !data) { alert('Não foi possível atualizar a oportunidade: ' + (error?.message || 'Nenhuma linha foi alterada.')); return; }
    await notifyUser(data.user_id || post.user_id, approved ? 'Oportunidade aprovada pela Talaza' : 'Oportunidade recusada', approved ? 'A sua oportunidade foi aprovada e publicada gratuitamente em Contratar. A consulta na área Oportunidades continua reservada a quem tem plano ativo na sua província principal.' : 'A sua oportunidade foi recusada. Motivo: ' + reason.trim(), 'opportunity_review');
    await loadJobPosts();
    alert(approved ? 'Oportunidade aprovada e publicada gratuitamente.' : 'Oportunidade recusada e motivo enviado nas notificações.');
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
    const { error } = recipients.length ? await supabase.from('notifications').insert(recipients.map(profile => ({
      user_id: profile.id,
      title: notificationTitle.trim(),
      content: notificationBody.trim(),
      type: ['user', 'seller_user'].includes(notificationAudience) ? 'individual' : notificationAudience === 'sellers' ? 'sellers' : notificationAudience === 'explorers' ? 'explorers' : 'general',
    }))) : { error: new Error('Não existem destinatários para este filtro.') };
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

    if (request?.event_id || explicitArea.includes('evento')) return 'Eventos';
    if (request?.job_post_id || request?.opportunity_id || explicitArea.includes('oportunidade') || explicitArea.includes('vaga')) return 'Oportunidades';
    if (request?.business_id || explicitArea.includes('vitrine') || explicitArea.includes('hospedagem')) return 'Vitrine / Hospedagem';
    return 'Área por identificar';
  }

  async function reviewPayment(request, approved) {
    const rejectionReason = approved ? '' : window.prompt('Indique o motivo da recusa do comprovativo/pagamento:');
    if (!approved && (!rejectionReason || !rejectionReason.trim())) return;
    if (reviewingPaymentId) return;

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
      .select('id')
      .maybeSingle();

    if (paymentError || !updatedPayment) {
      setReviewingPaymentId('');
      alert('Não foi possível atualizar o pagamento. Confirme as políticas RLS de payment_submissions: ' + (paymentError?.message || 'Nenhuma linha foi alterada.'));
      return;
    }

    let activationMessage = '';
    const areaLabel = getPaymentAreaLabel(request);

    if (approved && request.business_id && request.plan_id) {
      const [{ data: business, error: businessError }, { data: plan, error: planError }] = await Promise.all([
        supabase.from('businesses').select('id, owner_id, approval_status').eq('id', request.business_id).maybeSingle(),
        supabase.from('plans').select('id, duration_days').eq('id', request.plan_id).maybeSingle(),
      ]);

      if (businessError || planError) {
        activationMessage = ' O pagamento foi aprovado, mas não foi possível confirmar o negócio e o plano; verifique os registos.';
      } else if (!business || !plan) {
        activationMessage = ' O pagamento foi aprovado, mas o negócio ou plano não foi encontrado; a hospedagem não foi ativada.';
      } else if (business.approval_status !== 'approved') {
        activationMessage = ' O pagamento foi aprovado. O perfil ainda precisa de aprovação administrativa antes de ficar ativo na Vitrine.';
      } else {
        const durationDays = Number(plan.duration_days) || 0;
        if (durationDays <= 0) {
          activationMessage = ' O pagamento foi aprovado, mas a duração do plano não está configurada; a hospedagem não foi ativada.';
        } else {
          const now = new Date();
          const expiresAt = new Date(now.getTime() + durationDays * 86400000).toISOString();
          const { data: existingSubscription, error: readSubscriptionError } = await supabase
            .from('business_subscriptions')
            .select('id')
            .eq('business_id', request.business_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (readSubscriptionError) {
            activationMessage = ' O pagamento foi aprovado, mas não foi possível consultar a hospedagem: ' + readSubscriptionError.message;
          } else {
            const subscriptionData = {
              business_id: request.business_id,
              plan_id: request.plan_id,
              starts_at: now.toISOString(),
              status: 'active',
              expires_at: expiresAt,
            };
            const subscriptionResult = existingSubscription?.id
              ? await supabase.from('business_subscriptions').update(subscriptionData).eq('id', existingSubscription.id).select('id').maybeSingle()
              : await supabase.from('business_subscriptions').insert(subscriptionData).select('id').maybeSingle();

            if (subscriptionResult.error || !subscriptionResult.data) {
              activationMessage = ' O pagamento foi aprovado, mas a hospedagem não foi ativada: ' + (subscriptionResult.error?.message || 'O Supabase não confirmou o registo.');
            } else {
              const { error: activeError } = await supabase.from('businesses').update({ is_active: true }).eq('id', request.business_id);
              if (activeError) activationMessage = ' A hospedagem foi registada, mas não foi possível ativar o perfil: ' + activeError.message;
              else activationMessage = ' A hospedagem da Vitrine está ativa até ' + new Date(expiresAt).toLocaleDateString('pt-AO') + '.';
            }
          }
        }
      }
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

    if (!approved && request.business_id) {
      const { error: deactivateError } = await supabase.from('businesses').update({ is_active: false }).eq('id', request.business_id);
      if (deactivateError) console.error('O comprovativo foi recusado, mas não foi possível desativar o perfil:', deactivateError.message);
    }

    const notificationTitle = approved ? 'Pagamento aprovado — Talaza' : 'Comprovativo recusado — Talaza';
    const notificationBody = approved
      ? 'O seu pagamento para ' + areaLabel + ' foi aprovado.' + activationMessage
      : 'O comprovativo do seu pagamento para ' + areaLabel + ' foi recusado. Motivo: ' + rejectionReason.trim() + ' Pode corrigir e enviar novamente.';
    await notifyUser(request.user_id, notificationTitle, notificationBody, 'payment_review');

    await loadSubscriptionRequests();
    await loadBusinesses();
    await loadEvents();
    await loadJobPosts();
    setReviewingPaymentId('');
    alert(approved ? 'Pagamento aprovado.' + activationMessage : 'Pagamento recusado e motivo enviado nas notificações.');
  }

  async function refreshAdminData() {
    if (refreshing) return;
    setRefreshing(true);
    await Promise.all([
      loadBusinesses(),
      loadSubscriptionRequests(),
      loadCommunityReports(),
      loadPendingCommunityPosts(),
      loadSupportMessages(),
      loadAdminNotifications(),
      loadProfiles(),
      loadEvents(),
      loadJobPosts(),
    ]);
    setRefreshing(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/login');
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

          <nav aria-label="Secções do painel administrativo" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '0 0 28px' }}>
            {[
              ['vendedores', 'Vendedores'], ['pagamentos', 'Pagamentos e hospedagem'], ['eventos', 'Eventos'], ['oportunidades', 'Oportunidades'], ['conteudo-oficial', 'Motivação e tema do mês'], ['comunidade', 'Comunidade Talaza'], ['notificacoes', 'Notificações'], ['suporte', 'Suporte Talaza'], ['denuncias', 'Denúncias da Comunidade Talaza']
            ].map(([key, label]) => <button key={key} type="button" onClick={() => setActiveAdminSection(key)} aria-pressed={activeAdminSection === key} style={{ padding: '10px 13px', borderRadius: 9, border: activeAdminSection === key ? '2px solid #075B4E' : '1px solid #D5E4DF', background: activeAdminSection === key ? '#075B4E' : '#E4F0ED', color: activeAdminSection === key ? '#FFFFFF' : '#075B4E', fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>{label}</button>)}
          </nav>
          <div style={styles.counter}>
            {businesses.length} pendente
            {businesses.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div style={{ display: activeAdminSection === 'vendedores' ? 'block' : 'none' }}>
        {message && (
          <div style={styles.errorBox}>
            {message}
          </div>
        )}

        {businesses.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>✓</div>

            <h2>Nenhum perfil pendente</h2>

            <p>
              Não existem negócios aguardando validação neste momento.
            </p>
          </div>
        ) : (
          <div style={styles.list}>

            {businesses.map((business) => (

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

                  <span style={styles.pending}>
                    Pendente
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

                <div style={styles.actions}>

                  <button
                    style={styles.reject}
                    onClick={() =>
                      updateBusiness(
                        business.id,
                        'rejected'
                      )
                    }
                  >
                    Recusar
                  </button>

                  <button
                    style={styles.approve}
                    onClick={() =>
                      updateBusiness(
                        business.id,
                        'approved'
                      )
                    }
                  >
                    Aprovar
                  </button>

                </div>

              </article>

            ))}

          </div>
        )}

        </div>

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
                      <span style={pending ? styles.pending : styles.paymentStatus}>{request.status || 'Sem estado'}</span>
                    </div>
                    <div style={styles.details}>
                      <p><strong>Valor:</strong> {Number.isFinite(Number(request.amount)) ? new Intl.NumberFormat('pt-AO').format(Number(request.amount)) + ' Kz' : '—'}</p>
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
          <div style={styles.titleRow}><div><h2 style={styles.title}>Oportunidades</h2><p style={styles.description}>Revise as oportunidades/vagas publicadas e envie o motivo ao responsável se houver recusa.</p></div><div style={styles.counter}>{jobPosts.filter(item => !['rejected','closed','expired'].includes(String(item.status || '').toLowerCase())).length} por analisar · {jobPosts.length} total</div></div>
          {jobPosts.length === 0 ? <div style={styles.empty}><h3>Sem oportunidades registadas</h3><p>As oportunidades enviadas aparecerão aqui.</p></div> : <div style={styles.list}>{jobPosts.map(item => <article key={item.id} style={styles.card}><div style={styles.cardTop}><div style={styles.logoPlaceholder}>OP</div><div style={{ flex: 1 }}><h3 style={styles.businessName}>{item.title || item.position || 'Oportunidade sem título'}</h3><div style={styles.meta}>Estado: {item.status || '—'} · {item.created_at ? new Date(item.created_at).toLocaleString('pt-AO') : ''}</div></div></div><div style={styles.details}><p>{item.description || item.details || 'Sem descrição.'}</p><p><strong>Província:</strong> {item.province_id || '—'}</p><p><strong>Responsável:</strong> {profiles.find(profile => profile.id === (item.user_id || item.employer_id))?.name || 'Nome não disponível'}</p><p><strong>ID interno:</strong> {item.user_id || item.employer_id || '—'}</p></div>{!['published','approved','rejected','closed','expired'].includes(String(item.status || '').toLowerCase()) && <div style={styles.actions}><button type="button" style={styles.reject} onClick={() => moderateJob(item, false)}>Recusar oportunidade</button><button type="button" style={styles.approve} onClick={() => moderateJob(item, true)}>Aprovar oportunidade</button></div>}</article>)}</div>}
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

        <section id="pagamentos" style={{ marginTop: 0, display: activeAdminSection === 'pagamentos' ? 'block' : 'none' }}>
          <div style={styles.titleRow}>
            <div>
              <h2 style={styles.title}>Pagamentos e hospedagem da Vitrine</h2>
              <p style={styles.description}>Esta secção mostra apenas os comprovativos com ficheiro enviados para a hospedagem dos negócios. Os pagamentos de eventos ficam em Eventos; as publicações gratuitas ficam em Oportunidades.</p>
            </div>
            <div style={styles.counter}>{subscriptionRequests.filter(item => item.business_id && String(item.status || '').toLowerCase() === 'pending').length} pagamentos de hospedagem pendentes</div>
          </div>
          {subscriptionRequests.filter(item => item.business_id).length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>◇</div>
              <h2>Sem pedidos de pagamento</h2>
              <p>Os comprovativos enviados para as áreas pagas da Talaza aparecerão aqui quando forem registados.</p>
            </div>
          ) : (
            <div style={styles.list}>
              {subscriptionRequests.filter(item => item.business_id).map(request => {
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
                  </div>}
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
                <div style={styles.actions}>{String(item.status || 'pending') === 'pending' && <button type="button" style={styles.approve} onClick={() => markSupportReviewed(item)}>Marcar como analisada</button>}<button type="button" disabled={deletingSupportId === item.id} style={styles.reject} onClick={() => deleteSupportMessage(item)}>{deletingSupportId === item.id ? 'A eliminar…' : 'Eliminar mensagem'}</button></div>
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
              <label style={styles.formLabel} htmlFor="notification-user">Escolher utilizador</label>
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
            {[[ 'all', 'Todas' ], [ 'general', 'Todos' ], [ 'explorers', 'Exploradores' ], [ 'sellers', 'Vendedores' ], [ 'individual', 'Individuais' ]].map(([value,label]) => <button key={value} type="button" onClick={() => setNotificationHistoryFilter(value)} style={{ padding: '9px 13px', borderRadius: 999, border: notificationHistoryFilter === value ? '1px solid #64358B' : '1px solid #DDE5E0', background: notificationHistoryFilter === value ? 'linear-gradient(135deg,#075B4E,#64358B)' : '#FFFFFF', color: notificationHistoryFilter === value ? '#FFFFFF' : '#244A42', fontWeight: 800, cursor: 'pointer' }}>{label}</button>)}
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
                    <div style={styles.meta}>Publicação: {report.post_id || '—'} · Utilizador: {report.reporter_id || '—'}</div>
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
