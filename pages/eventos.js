import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import CommentThread from '../components/CommentThread';

const BUCKET = 'event-images';
const EVENT_PAGE_SIZE = 12;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm'];
const EVENT_TYPES = ['Geral', 'Formação', 'Sessão de Lançamento e Venda', 'Show', 'Fórum', 'Conferência', 'Workshop', 'Palestra', 'Cinema'];
const EVENT_FILTERS = [
  { label: 'Todas', icon: 'all', filter: 'Todas' },
  { label: 'Geral', icon: 'globe', filter: 'Geral' },
  { label: 'Formação', icon: 'training', filter: 'Formação' },
  { label: 'Sessão de Lançamento e Venda', icon: 'book', filter: 'Sessão de Lançamento e Venda' },
  { label: 'Show', icon: 'show', filter: 'Show' },
  { label: 'Fórum', icon: 'forum', filter: 'Fórum' },
  { label: 'Conferência', icon: 'conference', filter: 'Conferência' },
  { label: 'Workshop', icon: 'tools', filter: 'Workshop' },
  { label: 'Palestra', icon: 'lecture', filter: 'Palestra' },
  { label: 'Cinema', icon: 'cinema', filter: 'Cinema' },
];

function EventFilterIcon({ type, active = false }) {
  const common = { fill: active ? '#0A3D2A' : '#E8C979', stroke: 'none' };
  let art = null;
  switch (type) {
    case 'all':
      art = <><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></>;
      break;
    case 'globe':
      art = <><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2.1c1.2 1.4 2 4.1 2.1 7H9.9c.1-2.9.9-5.6 2.1-7ZM4.1 13h3.7c.1 2.5.7 4.7 1.6 6.3A8.05 8.05 0 0 1 4.1 13Zm3.7-2H4.1a8.05 8.05 0 0 1 5.3-6.3c-.9 1.6-1.5 3.8-1.6 6.3Zm4.2 9c-1.2-1.4-2-4.1-2.1-7h4.2c-.1 2.9-.9 5.6-2.1 7Zm4.2-.7c.9-1.6 1.5-3.8 1.6-6.3h3.7a8.05 8.05 0 0 1-5.3 6.3ZM15.9 11c-.1-2.5-.7-4.7-1.6-6.3a8.05 8.05 0 0 1 5.3 6.3h-3.7Z"/></>;
      break;
    case 'training':
      art = <><rect x="9" y="3" width="12" height="9" rx="1.2"/><path d="M14 12h2v2h-2zM12 14h6v1.5h-6zM4.5 5.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm.8 5H4a3 3 0 0 0-3 3v2h5v-2a4.5 4.5 0 0 1 1.2-3Zm4.2 1.2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-.8 4.8a3 3 0 0 0-3 3V21h8v-1.5a3 3 0 0 0-3-3Zm8-4.8a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-.8 4.8a3 3 0 0 0-3 3V21h8v-1.5a3 3 0 0 0-3-3Z"/><path d="m7 8 3-2v3L7 11z"/></>;
      break;
    case 'book':
      art = <><path d="M2.5 5.5c3.6-1.5 6.6-.8 9.5 1v14c-2.9-1.8-5.9-2.5-9.5-1v-14Zm19 0c-3.6-1.5-6.6-.8-9.5 1v14c2.9-1.8 5.9-2.5 9.5-1v-14Z"/><path d="m15.5 3 2-1 4 4-1 2-4-4-1  -1Z"/><path d="m14.8 4.2 4 4-4.5 4.5-2.2.7.7-2.2z"/></>;
      break;
    case 'show':
      art = <><path d="M3 17h18v2H3zM5 14h14v2H5zM7 11h10v2H7z"/><path d="M3 3h3l2 6H6L3 3Zm18 0h-3l-2 6h2l3-6ZM10 3h4v6h-4z"/><circle cx="5" cy="21" r="1.5"/><circle cx="12" cy="21" r="1.5"/><circle cx="19" cy="21" r="1.5"/></>;
      break;
    case 'forum':
      art = <><circle cx="12" cy="7" r="3.2"/><circle cx="4.8" cy="9" r="2.4"/><circle cx="19.2" cy="9" r="2.4"/><path d="M5.5 20v-2.2a6.5 6.5 0 0 1 13 0V20h-13ZM.8 18a4 4 0 0 1 5.4-3.7A7.5 7.5 0 0 0 4 19.5v.5H.8V18Zm22.4 0a4 4 0 0 0-5.4-3.7 7.5 7.5 0 0 1 2.2 5.2v.5h3.2V18Z"/></>;
      break;
    case 'conference':
      art = <><circle cx="12" cy="5" r="2.8"/><path d="M7 12a5 5 0 0 1 10 0v2H7v-2ZM2 17h20v2H2zM4 14.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm16 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM1 21h22v1H1z"/></>;
      break;
    case 'tools':
      art = <><path d="M21.2 6.2a5.2 5.2 0 0 1-6.8 6.8L7 20.4a2.1 2.1 0 0 1-3-3l7.4-7.4a5.2 5.2 0 0 1 6.8-6.8l-3 3 .8 2.2 2.2.8 3-3Z"/><path d="m3 3 2.1-.8 5.8 5.8-2.1 2.1L3 4.3V3Zm12.2 10.1 2.1-2.1 5.2 5.2v2.1h-2.1l-5.2-5.2Z"/></>;
      break;
    case 'lecture':
      art = <><circle cx="12" cy="4.5" r="2.8"/><path d="M8 9h8l2 5h-3v3h-6v-3H6l2-5ZM3 17h18v2H3zM5 19h14v3H5z"/></>;
      break;
    case 'cinema':
      art = <><rect x="2" y="8" width="20" height="14" rx="2"/><path d="M2 8 5 2h4L6 8H2Zm7 0 3-6h4l-3 6H9Zm7 0 3-6h3l-3 6h-3Z"/><rect x="5" y="12" width="3" height="3" rx=".5" fill="#0A3D2A"/><rect x="11" y="12" width="3" height="3" rx=".5" fill="#0A3D2A"/><rect x="17" y="12" width="3" height="3" rx=".5" fill="#0A3D2A"/></>;
      break;
  }
  return <svg width="19" height="19" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{width:19,height:19,flexShrink:0}} {...common} aria-hidden="true">{art}</svg>;
}
const PLAN_DETAILS = {
  Quinzenal: 'Ideal para divulgar eventos de curta duração e alcançar o público durante 15 dias.',
  Mensal: 'Mais tempo para promover o evento, gerar interesse e receber mensagens durante 30 dias.',
  Trimestral: 'Maior período de divulgação para eventos recorrentes, grandes iniciativas e campanhas de longo prazo.'
};

function categoryTheme(type) {
  const palette = [
    { color: '#126E75', soft: '#E4F2F2' },
    { color: '#17365D', soft: '#E9EEF5' },
    { color: '#B47A36', soft: '#F7F0E5' },
    { color: '#C66B35', soft: '#FBEEE5' },
    { color: '#7251A3', soft: '#F0EBF8' },
    { color: '#2F6F8F', soft: '#E8F1F7' },
    { color: '#8A5A44', soft: '#F5ECE7' },
    { color: '#9A7A28', soft: '#F7F2E3' },
    { color: '#27645B', soft: '#E7F1ED' },
    { color: '#48586A', soft: '#ECF0F4' }
  ];
  const index = Math.max(0, EVENT_TYPES.indexOf(type || 'Geral'));
  return palette[index % palette.length];
}

function firstValue(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ''
  );
}

function planLabel(plan) {
  const name = plan.name || plan.title || plan.plan_name || 'Plano';
  const price = plan.price ?? plan.amount ?? plan.valor;

  return price == null ? name : `${name} — ${price} Kz`;
}

export default function Eventos() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [countryId, setCountryId] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [plans, setPlans] = useState([]);
  const [planId, setPlanId] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('Geral');
  const [location, setLocation] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [step, setStep] = useState(1);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [view, setView] = useState('browse');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [historyItems, setHistoryItems] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventsPage, setEventsPage] = useState(0);
  const [hasMoreEvents, setHasMoreEvents] = useState(false);
  const [likesByEvent, setLikesByEvent] = useState({});
  const [likedByMe, setLikedByMe] = useState({});
  const [commentsByEvent, setCommentsByEvent] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentsOpen, setCommentsOpen] = useState({});
  const [feedLoading, setFeedLoading] = useState(false);
  const [interactionBusy, setInteractionBusy] = useState('');
  const [feedError, setFeedError] = useState('');
  const [feedNotice, setFeedNotice] = useState('');

  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem('talaza_event_history') || '[]'); if (Array.isArray(saved)) setHistoryItems(saved.slice(0, 100)); } catch { /* histórico opcional */ }
  }, []);

  useEffect(() => {
    if (!router.isReady) return;

    let cancelled = false;

    async function initialise() {
      setLoading(true);
      setError('');

      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        const currentUser = sessionData?.session?.user || null;

        if (cancelled) return;

        // Não redireciona para o painel de negócio.
        // Se não existir sessão, mantém a página de eventos visível.
        setUser(currentUser);

        let storedCountry = '';
        let storedProvince = '';

        try {
          storedCountry =
            localStorage.getItem('talaza_country_id') || '';
          storedProvince =
            localStorage.getItem('talaza_province_id') || '';
        } catch {
          // O armazenamento do navegador pode estar indisponível.
        }

        let profile = null;

        if (currentUser) {
          const { data } = await supabase
            .from('profiles')
            .select('id, country_id, province_id')
            .eq('id', currentUser.id)
            .maybeSingle();

          profile = data;
        }

        const normalizeParam = (value) =>
          Array.isArray(value) ? value[0] : value;
        const isUuid = (value) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());

        const countryCandidate = String(
          normalizeParam(firstValue(
            router.query.country_id,
            router.query.country,
            storedCountry,
            profile?.country_id
          )) || ''
        ).trim();

        let resolvedCountry = '';
        if (countryCandidate) {
          let countryQuery = supabase.from('countries').select('id, name');
          countryQuery = isUuid(countryCandidate)
            ? countryQuery.eq('id', countryCandidate)
            : countryQuery.ilike('name', countryCandidate);
          const { data: countryRow } = await countryQuery.maybeSingle();
          resolvedCountry = countryRow?.id || '';
        }

        const provinceCandidate = String(
          normalizeParam(firstValue(
            router.query.province_id,
            router.query.province,
            storedProvince,
            profile?.province_id
          )) || ''
        ).trim();

        let provinceRow = null;
        if (provinceCandidate) {
          let provinceQuery = supabase
            .from('provinces')
            .select('id, name, country_id');
          provinceQuery = isUuid(provinceCandidate)
            ? provinceQuery.eq('id', provinceCandidate)
            : provinceQuery.ilike('name', provinceCandidate);
          if (resolvedCountry) provinceQuery = provinceQuery.eq('country_id', resolvedCountry);
          const { data } = await provinceQuery.maybeSingle();
          provinceRow = data || null;
        }

        if (cancelled) return;

        // A província escolhida na navegação tem prioridade. Nunca usar um nome
        // ou um ID não resolvido como se fosse um ID válido no filtro da Vitrine.
        const finalCountryId = provinceRow?.country_id || resolvedCountry;
        const finalProvinceId = provinceRow?.id || '';

        setCountryId(finalCountryId || '');
        setProvinceId(finalProvinceId);
        setProvinceName(provinceRow?.name || '');

        if (provinceCandidate && !provinceRow) {
          setFeedError(
            'Não foi possível identificar a província escolhida. Volta à Vitrine, seleciona a província e abre Eventos novamente.'
          );
        } else if (!finalProvinceId) {
          setFeedError(
            'Seleciona uma província na Vitrine antes de consultar ou publicar eventos.'
          );
        }

        const { data: planRows, error: planError } =
          await supabase.from('plans').select('*');

        if (planError) throw planError;

        const eventPlans = (planRows || []).filter((plan) => {
          if (plan.active === false || plan.is_active === false) {
            return false;
          }

          const area = String(plan.area || '').trim().toLowerCase();
          const type = String(plan.plan_type || '').trim().toLowerCase();
          // Não misturar os planos antigos de hospedagem com publicação de eventos.
          return area === 'eventos área' && type === 'publicação ativa';
        });

        if (!cancelled) setPlans(eventPlans);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message ||
              'Não foi possível carregar os dados de Eventos.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initialise();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.query]);

  useEffect(() => {
    setEventsPage(0);
    setEvents([]);
    setHasMoreEvents(false);
    setLikesByEvent({});
    setLikedByMe({});
    setCommentsByEvent({});
  }, [provinceId, countryId]);

  async function loadEvents() {
    setFeedLoading(true);
    setFeedError('');
    try {
      // Não consultar eventos sem uma província válida: isso evita misturar anúncios
      // de Benguela, Huambo, Kwanza Sul ou qualquer outra província.
      if (!provinceId) {
        setEvents([]);
        setLikesByEvent({});
        setLikedByMe({});
        setCommentsByEvent({});
        setFeedError(
          'Não foi possível identificar a província ativa. Volta à Vitrine, escolhe a província e abre a área Eventos.'
        );
        setFeedLoading(false);
        return;
      }

      let query = supabase
        .from('events')
        .select('id,user_id,country_id,province_id,title,description,event_type,image_url,video_url,location,starts_at,expires_at,status,payment_status,admin_approved,created_at')
        .eq('province_id', provinceId)
        .eq('status', 'published')
        .eq('payment_status', 'paid')
        .eq('admin_approved', true)
        .not('expires_at', 'is', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .range(eventsPage * EVENT_PAGE_SIZE, eventsPage * EVENT_PAGE_SIZE + EVENT_PAGE_SIZE - 1);
      if (countryId) query = query.eq('country_id', countryId);
      const { data, error: eventsError } = await query;
      if (eventsError) throw eventsError;
      let rows = data || [];
      const requestedEventId = typeof router.query.eventId === 'string' ? router.query.eventId : '';
      if (requestedEventId && !rows.some(row => row.id === requestedEventId)) {
        const { data: requestedEvent, error: requestedEventError } = await supabase
          .from('events')
          .select('id,user_id,country_id,province_id,title,description,event_type,image_url,video_url,location,starts_at,expires_at,status,payment_status,admin_approved,created_at')
          .eq('id', requestedEventId)
          .eq('status', 'published')
          .eq('payment_status', 'paid')
          .eq('admin_approved', true)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();
        if (requestedEventError) throw requestedEventError;
        if (requestedEvent) rows = [requestedEvent, ...rows];
      }
      // A ordem é personalizada nesta sessão: eventos já consultados descem para o fim.
      const seenIds = historyItems.map(item => item.id);
      rows = [...rows].sort((a, b) => {
        const ai = seenIds.indexOf(a.id);
        const bi = seenIds.indexOf(b.id);
        if (ai === -1 && bi === -1) return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        if (ai === -1) return -1;
        if (bi === -1) return 1;
        return bi - ai;
      });
      setHasMoreEvents(rows.length === EVENT_PAGE_SIZE);
      setEvents((previous) => eventsPage === 0 ? rows : [...previous, ...rows.filter((row) => !previous.some((item) => item.id === row.id))]);
      if (user?.id && rows.length) {
        try {
          const key = 'talaza_events_seen_ids_' + user.id;
          const previous = JSON.parse(localStorage.getItem(key) || '[]');
          const nextSeen = [...new Set([...(Array.isArray(previous) ? previous.map(String) : []), ...rows.map(item => String(item.id))])].slice(-100);
          localStorage.setItem(key, JSON.stringify(nextSeen));
        } catch (_) { /* a navegação continua mesmo sem armazenamento local */ }
      }
      if (!rows.length) {
        setLikesByEvent({});
        setLikedByMe({});
        setCommentsByEvent({});
        return;
      }
      const ids = rows.map(row => row.id);
      const [{ data: likes, error: likesError }, { data: comments, error: commentsError }] = await Promise.all([
        supabase.from('event_likes').select('event_id,user_id').in('event_id', ids).limit(600),
        supabase.from('event_comments').select('id,event_id,user_id,content,created_at,parent_id').in('event_id', ids).eq('status', 'published').order('created_at', { ascending: true }).limit(180)
      ]);
      if (likesError) throw likesError;
      if (commentsError) throw commentsError;
      const counts = {};
      const mine = {};
      (likes || []).forEach(row => {
        counts[row.event_id] = (counts[row.event_id] || 0) + 1;
        if (user && row.user_id === user.id) mine[row.event_id] = true;
      });
      setLikesByEvent((previous) => ({ ...previous, ...counts }));
      setLikedByMe((previous) => ({ ...previous, ...mine }));
      const nextComments = (comments || []).reduce((acc, row) => {
        (acc[row.event_id] ||= []).push(row);
        return acc;
      }, {});
      setCommentsByEvent((previous) => ({ ...previous, ...nextComments }));
    } catch (err) {
      setFeedError(err.message || 'Não foi possível carregar os eventos. Confirme as políticas RLS.');
    } finally {
      setFeedLoading(false);
    }
  }

  useEffect(() => {
    if (!router.isReady || loading) return;
    loadEvents();
  }, [router.isReady, loading, provinceId, countryId, user?.id, eventsPage]);

  function trackEventAction(item) {
    if (!item?.id) return;
    setHistoryItems(previous => {
      const next = [{
        id: item.id,
        title: item.title,
        event_type: item.event_type,
        province_id: item.province_id || null,
        image_url: item.image_url || null,
        at: new Date().toISOString()
      }, ...previous.filter(entry => entry.id !== item.id)].slice(0, 100);
      try { localStorage.setItem('talaza_event_history', JSON.stringify(next)); } catch { /* mantém histórico da sessão */ }
      return next;
    });
    setEvents(previous => {
      const selected = previous.find(event => event.id === item.id);
      if (!selected) return previous;
      return [...previous.filter(event => event.id !== item.id), selected];
    });
  }

  useEffect(() => {
    if (!router.isReady || loading || !router.query.eventId) return;
    const eventId = String(router.query.eventId);
    setView('browse');
    setSelectedCategory('Todas');
    const timer = setTimeout(() => {
      const target = document.getElementById('evento-' + eventId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.style.outline = '3px solid #B7791F';
        target.style.outlineOffset = '4px';
        setTimeout(() => { target.style.outline = ''; target.style.outlineOffset = ''; }, 2800);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [router.isReady, loading, router.query.eventId, events.length]);

  const normalizeEventCategory = (value) => String(value || 'Geral').trim().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
  const visibleEvents = selectedCategory === 'Todas'
    ? events
    : events.filter(event => normalizeEventCategory(event.event_type) === normalizeEventCategory(selectedCategory));

  function selectEventCategory(filter) {
    setSelectedCategory(filter);
    setView('browse');
    setFeedError('');
    setTimeout(() => {
      document.getElementById('eventos-publicados')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  async function toggleLike(eventId) {
    const selected = events.find(item => item.id === eventId);
    if (selected) trackEventAction(selected);
    if (!user) {
      setFeedError('Inicia sessão na Talaza para gostar de um evento.');
      return;
    }
    setInteractionBusy('like:' + eventId);
    setFeedError('');
    setFeedNotice('');
    try {
      if (likedByMe[eventId]) {
        const { error: removeError } = await supabase.from('event_likes').delete().eq('event_id', eventId).eq('user_id', user.id);
        if (removeError) throw removeError;
      } else {
        const { error: addError } = await supabase.from('event_likes').insert({ event_id: eventId, user_id: user.id });
        if (addError && addError.code !== '23505') throw addError;
      }
      await loadEvents();
    } catch (err) {
      setFeedError(err.message || 'Não foi possível atualizar o gosto.');
    } finally {
      setInteractionBusy('');
    }
  }

  async function submitComment(eventId) {
    const selected = events.find(item => item.id === eventId);
    if (selected) trackEventAction(selected);
    if (!user) {
      setFeedError('Inicia sessão na Talaza para comentar.');
      return;
    }
    const content = String(commentDrafts[eventId] || '').trim();
    if (!content) return;
    setInteractionBusy('comment:' + eventId);
    setFeedError('');
    setFeedNotice('');
    try {
      const { error: insertError } = await supabase.from('event_comments').insert({ event_id: eventId, user_id: user.id, content, status: 'published', parent_id: null });
      if (insertError) throw insertError;
      setCommentDrafts(previous => ({ ...previous, [eventId]: '' }));
      await loadEvents();
      setFeedNotice('Comentário publicado.');
    } catch (err) {
      setFeedError(err.message || 'Não foi possível publicar o comentário.');
    } finally {
      setInteractionBusy('');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!user) {
      setError(
        'Para publicar, entra primeiro na tua conta Talaza. Esta página continuará aberta; não serás enviado automaticamente para o painel de negócio.'
      );
      return;
    }

    if (!countryId || !provinceId) {
      setError(
        'Não foi possível identificar a província ativa. Abre Eventos a partir da província que estás a consultar.'
      );
      return;
    }

    if (!title.trim() || !description.trim()) { setStep(1); setError('Preenche o título e a descrição do evento.'); return; }
    if (!image && !video) { setStep(1); setError('Carrega pelo menos uma imagem ou um vídeo para apresentar o evento.'); return; }
    if (image && (image.size > MAX_IMAGE_SIZE || !IMAGE_TYPES.includes(image.type))) { setStep(1); setError('A imagem deve ser JPG, PNG ou WEBP e ter, no máximo, 5 MB.'); return; }
    if (video && (video.size > MAX_VIDEO_SIZE || !VIDEO_TYPES.includes(video.type))) { setStep(1); setError('O vídeo deve ser MP4 ou WEBM e ter, no máximo, 50 MB.'); return; }
    if (!EVENT_TYPES.includes(eventType)) { setStep(2); setError('Seleciona uma categoria válida para o evento.'); return; }
    if (!location.trim() || !startsAt) { setStep(2); setError('Indica o local, a data e a hora do evento.'); return; }
    if (new Date(startsAt).getTime() < Date.now() - 60000) { setStep(2); setError('A data e hora do evento não podem estar no passado.'); return; }
    if (!planId || !plans.some((plan) => plan.id === planId)) { setStep(3); setError('Seleciona um dos planos de publicação disponíveis.'); return; }

    setSaving(true);

    async function uploadEventMedia(file, prefix) {
      if (!file) return null;
      const extension = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
      const uniqueId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(36).slice(2));
      const path = user.id + '/' + prefix + '-' + uniqueId + '.' + extension;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error('Não foi possível carregar ' + (prefix === 'video' ? 'o vídeo: ' : 'a imagem: ') + uploadError.message);
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      if (!data?.publicUrl) throw new Error('Não foi possível obter o endereço do ficheiro carregado.');
      return data.publicUrl;
    }

    try {
      const imageUrl = await uploadEventMedia(image, 'image');
      const videoUrl = await uploadEventMedia(video, 'video');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        throw new Error(
          'O perfil da conta não foi encontrado na tabela profiles.'
        );
      }

      const { data: createdEvent, error: insertError } =
        await supabase
          .from('events')
          .insert({
            user_id: user.id,
            country_id: countryId,
            province_id: provinceId,
            plan_id: planId,
            title: title.trim(),
            description: description.trim(),
            event_type: eventType,
            image_url: imageUrl,
            video_url: videoUrl,
            location: location.trim(),
            starts_at: startsAt
              ? new Date(startsAt).toISOString()
              : null,
            expires_at: null,
            status: 'pending_payment',
            payment_status: 'pending',
          })
          .select('id')
          .single();

      if (insertError) {
        throw new Error(
          `O evento não foi guardado: ${insertError.message}`
        );
      }

      setSuccess(
        'Evento registado com sucesso. A publicação está pendente de pagamento e ainda não está ativa.'
      );

      setTitle('');
      setDescription('');
      setEventType('Geral');
      setLocation('');
      setStartsAt('');
      setImage(null);
      setVideo(null);
      setStep(1);
      const fileInput = document.getElementById('event-image');
      if (fileInput) fileInput.value = '';
      const videoInput = document.getElementById('event-video');
      if (videoInput) videoInput.value = '';

      // Não marcar como pago nem publicar automaticamente.
      // O fluxo de planos/pagamentos deve validar o pagamento.
      if (createdEvent?.id) {
        await router.push({
          pathname: '/Pagamento',
          query: {
            plan: planId,
            country: countryId,
            province: provinceId,
            area: 'Eventos',
            event_id: createdEvent.id,
          },
        });
      }
    } catch (err) {
      setError(err.message || 'Ocorreu um erro ao guardar o evento.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <button
            type="button"
            onClick={() => router.push({
              pathname: '/explore',
              query: {
                ...(countryId ? { country: countryId } : {}),
                ...(provinceId ? { province: provinceId } : {}),
              },
            })}
            style={styles.backButton}
          >
            ← Voltar
          </button>

          <span style={styles.brand}>
            <span style={styles.brandMark}>T</span>
            Talaza
          </span>
        </header>

        <section style={styles.hero}>
          <span style={styles.eyebrow}>TALAZA · EVENTOS</span>
          <h1 style={styles.heading}>O teu evento merece ser encontrado.</h1>
          <p style={styles.subtitle}>
            Apresenta o teu evento às pessoas da província que estás a consultar.
          </p>

          <div style={styles.locationPill}>
            <span>📍</span>
            <span>
              {provinceName || 'Província ativa não identificada'}
            </span>
          </div>
        </section>

        <nav style={styles.tabs} aria-label="Área de Eventos">
          <button type="button" onClick={() => { setView('browse'); setFeedError(''); setFeedNotice(''); }} style={{ ...styles.tab, ...(view === 'browse' ? styles.activeTab : {}) }}>Ver eventos</button>
          <button type="button" onClick={() => { setView('publish'); setFeedError(''); setFeedNotice(''); }} style={{ ...styles.tab, ...(view === 'publish' ? styles.activeTab : {}) }}>Publicar eventos</button>
        </nav>

        {view === 'browse' && (
          <section style={styles.feedSection}>
            <div style={styles.feedHeading}>
              <div><h2 style={styles.sectionTitle}>Eventos aprovados</h2><p style={styles.muted}>Explora por categoria ou descobre todos os eventos disponíveis.</p></div>
              <button type="button" onClick={() => router.push('/historico?type=eventos')} style={styles.historyButton}>◷ Ver histórico ({historyItems.length})</button>
            </div>
            
            <div style={styles.eventFilterGrid} aria-label="Filtrar eventos por categoria">
              {EVENT_FILTERS.map(({label, icon, filter}) => {
                const active = selectedCategory === filter;
                return (
                  <button key={filter} type="button" onClick={() => selectEventCategory(filter)} aria-pressed={active} style={{...styles.eventFilterButton, ...(active ? styles.eventFilterButtonActive : {})}}>
                    <EventFilterIcon type={icon} active={active} />
                    
                    <span style={{...styles.eventFilterLabel, ...(filter === 'Sessão de Lançamento e Venda' ? { fontSize: 8.5, lineHeight: 1.02 } : {})}}>{filter === 'Sessão de Lançamento e Venda' ? <>Sessão de<br />Lançamento e Venda</> : label}</span>
                  </button>
                );
              })}
            </div>
            <p style={styles.muted}>Descobre o que está a acontecer na tua província. Podes gostar, comentar e falar com o organizador através das mensagens internas da Talaza.</p>
            {feedError && <div style={styles.error}>{feedError}</div>}
            {feedNotice && <div style={styles.success}>{feedNotice}</div>}
            {feedLoading && <p style={styles.muted}>A carregar eventos...</p>}
            {!feedLoading && events.length === 0 && <div style={styles.notice}>Ainda não existem eventos aprovados e ativos nesta província.</div>}
            {!feedLoading && events.length > 0 && visibleEvents.length === 0 && <div style={styles.notice}>Ainda não há eventos nesta categoria. Escolhe outra categoria ou «Todas».</div>}
            <div id="eventos-publicados" style={styles.eventList}>
              {visibleEvents.map(item => (
                <article id={'evento-' + item.id} key={item.id} style={{ ...styles.eventCard, borderColor: categoryTheme(item.event_type).color + '45', background: '#FFFFFF', boxShadow: '0 6px 22px rgba(24,39,34,.07)' }} onClick={() => trackEventAction(item)}>
                  {(item.video_url || item.image_url) && <div style={styles.eventMedia}>
                    {item.video_url
                      ? <video src={item.video_url} controls playsInline preload="none" poster={item.image_url || undefined} style={styles.eventVideo} aria-label={'Vídeo do evento: ' + item.title} />
                      : <img src={item.image_url} alt={item.title} style={styles.eventImage} />}
                  </div>}
                  <div style={styles.eventBody}>
                    <div style={styles.eventMeta}><span style={{ ...styles.eventCategoryBadge, color: categoryTheme(item.event_type).color, background: categoryTheme(item.event_type).soft }}>{item.event_type || 'Geral'}</span>{item.location ? <span style={styles.eventLocation}>📍 {item.location}</span> : null}</div>
                    <h3 style={styles.eventTitle}>{item.title}</h3>
                    <p style={styles.eventDescription}>{item.description}</p>
                    <div style={styles.startDate}><strong>📅 Data de início</strong><span>{item.starts_at ? new Date(item.starts_at).toLocaleString('pt-AO', { dateStyle: 'full', timeStyle: 'short' }) : 'Data de início não indicada pelo organizador'}</span></div>
                    <div style={styles.eventActions}>
                      <button type="button" disabled={interactionBusy === 'like:' + item.id} onClick={() => toggleLike(item.id)} style={{ ...styles.actionButton, ...(likedByMe[item.id] ? styles.likedButton : {}) }}>
                        {likedByMe[item.id] ? '♥ Gostaste' : '♡ Gostar'} · {likesByEvent[item.id] || 0}
                      </button>
                      <button type="button" aria-expanded={Boolean(commentsOpen[item.id])} onClick={(event) => { event.stopPropagation(); setCommentsOpen(previous => ({ ...previous, [item.id]: !previous[item.id] })); trackEventAction(item); }} style={styles.actionButton}>💬 Comentar · {(commentsByEvent[item.id] || []).length}</button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); trackEventAction(item); if (!user) { router.push('/login'); return; } if (item.user_id === user.id) { setFeedNotice('Este é o teu anúncio. Para receber mensagens, consulta a tua área de mensagens.'); return; } router.push({ pathname: '/mensagens', query: { to: item.user_id, source: 'Eventos', sourceId: item.id } }); }} style={styles.messageButton}>✉ Mensagem</button>
                    </div>
                    {commentsOpen[item.id] && <div style={styles.comments}>
                      <div style={{ marginTop: 12 }}>
                        <CommentThread type="event" targetId={item.id} comments={commentsByEvent[item.id] || []} userId={user?.id} onRefresh={loadEvents} />
                        <form onSubmit={(e) => { e.preventDefault(); submitComment(item.id); }} style={styles.commentForm}>
                          <input aria-label="Escrever comentário" maxLength={2000} value={commentDrafts[item.id] || ''} onChange={e => setCommentDrafts(previous => ({ ...previous, [item.id]: e.target.value }))} placeholder={user ? 'Escreve um comentário...' : 'Inicia sessão para comentar'} style={styles.commentInput} />
                          <button type="submit" disabled={!user || interactionBusy === 'comment:' + item.id || !String(commentDrafts[item.id] || '').trim()} style={styles.messageButton}>{interactionBusy === 'comment:' + item.id ? 'A enviar…' : 'Enviar comentário'}</button>
                        </form>
                      </div>
                    </div>}
                  </div>
                </article>
              ))}
            </div>
            {hasMoreEvents && (
              <button type="button" disabled={feedLoading} onClick={() => setEventsPage((page) => page + 1)} style={{ ...styles.historyButton, display: 'block', margin: '18px auto' }}>
                {feedLoading ? 'A carregar…' : 'Carregar mais eventos'}
              </button>
            )}
          </section>
        )}

        {view === 'publish' && <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Publicar eventos</h2>
          <p style={styles.muted}>Esta área destina-se a quem tem um evento a anunciar: vendas de livros, shows, atividades, entre outros.</p>

          {loading && <p style={styles.muted}>A carregar dados...</p>}

          {!loading && !user && (
            <div style={styles.notice}>
              <strong>Consulta os eventos sem sair desta página.</strong>
              <p style={styles.muted}>
                Para publicar, precisas de iniciar sessão na tua conta Talaza.
                Usa a opção de entrada já existente na aplicação e volta aqui.
                Não te vamos encaminhar automaticamente para o painel de negócio.
              </p>
            </div>
          )}

          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}

          <div style={styles.stepsIndicator}>
            {[1, 2, 3].map((number) => <div key={number} style={{ ...styles.stepItem, ...(step === number ? styles.currentStep : step > number ? styles.completedStep : {}) }}><span style={styles.stepNumber}>{step > number ? '✓' : number}</span><span>{number === 1 ? 'Conteúdo' : number === 2 ? 'Detalhes' : 'Plano'}</span></div>)}
          </div>
          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}
          <form onSubmit={handleSubmit} style={styles.form}>
            {step === 1 && <>
              <h3 style={styles.wizardTitle}>Fase 1 — Apresenta o teu evento</h3>
              <p style={styles.muted}>Começa com um título claro, uma descrição atrativa e imagens ou vídeo que mostrem o que as pessoas vão encontrar.</p>
              <label htmlFor="event-title" style={styles.label}>Título do evento</label>
              <input id="event-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Feira de Empreendedorismo" maxLength={150} required style={styles.input} />
              <label htmlFor="event-description" style={styles.label}>Descrição</label>
              <textarea id="event-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explica o que vai acontecer, para quem é e o que torna o evento especial." rows={5} maxLength={5000} required style={styles.textarea} />
              <label htmlFor="event-image" style={styles.label}>Imagem de capa (opcional se carregares vídeo)</label>
              <label htmlFor="event-image" style={styles.uploadBox}><span style={styles.uploadIcon}>▧</span><strong>{image ? image.name : 'Escolher imagem de capa'}</strong><span style={styles.muted}>JPG, PNG ou WEBP · máximo 5 MB</span></label>
              <input id="event-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImage(e.target.files?.[0] || null)} style={styles.hiddenInput} />
              {image && <img src={URL.createObjectURL(image)} alt="Pré-visualização da capa" style={styles.mediaPreview} />}
              <label htmlFor="event-video" style={styles.label}>Vídeo do evento (opcional)</label>
              <label htmlFor="event-video" style={styles.uploadBox}><span style={styles.uploadIcon}>▶</span><strong>{video ? video.name : 'Escolher vídeo'}</strong><span style={styles.muted}>MP4 ou WEBM · máximo 50 MB</span></label>
              <input id="event-video" type="file" accept="video/mp4,video/webm" onChange={(e) => setVideo(e.target.files?.[0] || null)} style={styles.hiddenInput} />
              {video && <video controls src={URL.createObjectURL(video)} style={styles.mediaPreview} />}
              <button type="button" onClick={() => { setError(''); if (!title.trim() || !description.trim()) { setError('Preenche o título e a descrição.'); return; } if (!image && !video) { setError('Carrega pelo menos uma imagem ou um vídeo.'); return; } if (image && (image.size > MAX_IMAGE_SIZE || !IMAGE_TYPES.includes(image.type))) { setError('A imagem deve ser JPG, PNG ou WEBP e ter no máximo 5 MB.'); return; } if (video && (video.size > MAX_VIDEO_SIZE || !VIDEO_TYPES.includes(video.type))) { setError('O vídeo deve ser MP4 ou WEBM e ter no máximo 50 MB.'); return; } setStep(2); }} style={styles.button}>Seguinte: detalhes do evento →</button>
            </>}
            {step === 2 && <>
              <h3 style={styles.wizardTitle}>Fase 2 — Adiciona os detalhes</h3>
              <p style={styles.muted}>Escolhe a categoria e indica onde e quando o evento vai acontecer.</p>
              <label htmlFor="event-type" style={styles.label}>Categoria do evento</label>
              <select id="event-type" value={eventType} onChange={(e) => setEventType(e.target.value)} style={styles.input} required>{EVENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select>
              <label htmlFor="event-location" style={styles.label}>Local do evento</label>
              <input id="event-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Província, município, bairro ou nome do local" maxLength={250} required style={styles.input} />
              <label htmlFor="event-date" style={styles.label}>Data e hora</label>
              <input id="event-date" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required style={styles.input} />
              <div style={styles.wizardActions}><button type="button" onClick={() => { setError(''); setStep(1); }} style={styles.secondaryButton}>← Voltar</button><button type="button" onClick={() => { setError(''); if (!EVENT_TYPES.includes(eventType) || !location.trim() || !startsAt) { setError('Preenche a categoria, o local, a data e a hora.'); return; } if (new Date(startsAt).getTime() < Date.now() - 60000) { setError('A data e hora não podem estar no passado.'); return; } setStep(3); }} style={styles.button}>Seguinte: escolher plano →</button></div>
            </>}
            {step === 3 && <>
              <h3 style={styles.wizardTitle}>Fase 3 — Escolhe como divulgar</h3>
              <p style={styles.muted}>Seleciona o período que melhor corresponde ao teu evento. Depois vais ver as instruções de pagamento e poderás enviar o comprovativo.</p>
              {plans.length > 0 ? <div style={styles.planGrid}>{plans.map((plan) => { const name = String(plan.name || '').toLowerCase(); const key = name.includes('quinzenal') ? 'Quinzenal' : name.includes('trimestral') ? 'Trimestral' : 'Mensal'; const selected = planId === plan.id;
                  const themes = [
                    { color: '#08745F', soft: '#E3F4ED', border: '#B8E0D2', icon: '◈' },
                    { color: '#64358B', soft: '#F0E7F7', border: '#D7C3EA', icon: '✦' },
                    { color: '#A77912', soft: '#FBF2D7', border: '#EBD58C', icon: '♛' }
                  ];
                  const theme = themes[plans.indexOf(plan) % themes.length];
                  const benefits = String(plan.description || '').split(/\r?\n|;|\|/).map(value => value.trim()).filter(value => value && !/^benefícios?$/i.test(value));
                  return <button key={plan.id} type="button" onClick={() => setPlanId(plan.id)} style={{ ...styles.planCard, borderColor: selected ? theme.color : theme.border, background: selected ? theme.soft : '#FFFFFF', ...(selected ? styles.selectedPlanCard : {}) }}>
                    <span style={{ ...styles.planBadge, background: theme.color }}>{theme.icon} {key}</span>
                    <span style={styles.planDuration}>{Number(plan.duration_days || 0)} dias de divulgação</span>
                    <span style={{ ...styles.planPrice, color: theme.color }}>{Number(plan.price || 0).toLocaleString('pt-AO')} Kz</span>
                    <span style={styles.benefitTitle}>O que está incluído</span>
                    <span style={styles.planBenefits}>{benefits.length ? benefits.map((benefit, index) => <span key={index} style={styles.planBenefit}><span style={{ ...styles.benefitCheck, background: theme.color }}>✓</span><span>{benefit}</span></span>) : <span style={styles.planDescription}>{PLAN_DETAILS[key]}</span>}</span>
                    <span style={{ ...styles.planChoose, color: theme.color }}>{selected ? '✓ Plano selecionado' : 'Escolher este plano →'}</span>
                  </button>; })}</div> : <div style={styles.notice}>Não foram encontrados planos de publicação ativos para Eventos.</div>}
              <div style={styles.wizardActions}><button type="button" onClick={() => { setError(''); setStep(2); }} style={styles.secondaryButton}>← Voltar</button><button type="submit" disabled={saving || !user || !planId || plans.length === 0} style={{ ...styles.button, opacity: saving || !user || !planId || plans.length === 0 ? 0.6 : 1 }}>{saving ? 'A guardar anúncio…' : 'Continuar para pagamento →'}</button></div>
            </>}
          </form>
        </section>}
      </div>
    </main>
  );
}

const styles = {
  tabs: { display: 'flex', gap: 10, marginBottom: 18, padding: 5, background: '#EAF1EE', borderRadius: 14 },
  feedHeading: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 },
  historyButton: { border: '1px solid #D7C3EA', background: '#F0E7F7', color: '#64358B', borderRadius: 10, padding: '9px 12px', fontWeight: 800, cursor: 'pointer', fontSize: 12 },
  historyPanel: { display: 'grid', gap: 8, padding: 14, margin: '12px 0', borderRadius: 14, border: '1px solid #D7C3EA', background: '#FBF8FE' },
  historyItem: { display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: 8, border: '1px solid #EAE1F2', borderRadius: 10, background: '#FFFFFF', cursor: 'pointer', color: '#26352F' },
  historyThumb: { width: 42, height: 42, objectFit: 'cover', borderRadius: 8, flexShrink: 0 },
  historyThumbFallback: { width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 8, background: '#F0E7F7', color: '#64358B' },
  eventFilterGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 7, marginTop: 14, width: '100%', boxSizing: 'border-box' },
  eventFilterButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, width: '100%', minWidth: 0, height: 44, minHeight: 44, padding: '5px 3px', borderRadius: 24, border: '1.5px solid #D4AF37', background: '#0A3D2A', color: '#FFFFFF', boxShadow: '0 3px 7px rgba(3,35,24,.18), 0 0 6px rgba(212,175,55,.10)', cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box', overflow: 'hidden' },
  eventFilterButtonActive: { background: '#E8C979', borderColor: '#0A3D2A', color: '#0A3D2A', boxShadow: '0 5px 15px rgba(3,35,24,.24), 0 0 0 2px rgba(232,201,121,.24)' },
  eventFilterDivider: { display: 'none' },
  eventFilterLabel: { color: 'inherit', fontSize: 10, lineHeight: 1.05, fontWeight: 800, minWidth: 0, flex: '0 1 auto', whiteSpace: 'normal', overflow: 'hidden', overflowWrap: 'anywhere', textAlign: 'center' },
  stepsIndicator: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, margin: '8px 0 24px' },
  stepItem: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 5px', borderRadius: 12, background: '#F2F5F3', color: '#718078', fontSize: 12, fontWeight: 800 },
  currentStep: { background: '#DCEFE8', color: '#075B4E', boxShadow: 'inset 0 0 0 1px #8CB7A8' },
  completedStep: { background: '#EAF4E9', color: '#277044' },
  stepNumber: { display: 'grid', placeItems: 'center', width: 24, height: 24, borderRadius: '50%', background: '#FFFFFF', fontSize: 12 },
  wizardTitle: { margin: '0 0 4px', color: '#083F35', fontSize: 20 },
  wizardActions: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginTop: 12 },
  secondaryButton: { border: '1px solid #D5E0DB', background: '#FFFFFF', borderRadius: 12, padding: '13px 16px', color: '#254B40', fontWeight: 800, cursor: 'pointer' },
  planGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, margin: '14px 0' },
  planCard: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, textAlign: 'left', padding: 18, border: '1px solid #DCE6E0', borderRadius: 16, background: '#FFFFFF', color: '#173D32', cursor: 'pointer', minHeight: 220 },
  selectedPlanCard: { border: '2px solid #08745D', background: '#F0FAF5', boxShadow: '0 8px 22px rgba(8,116,93,.12)' },
  planBadge: { display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 999, padding: '7px 11px', color: '#FFFFFF', fontSize: 12, fontWeight: 900 },
  planDuration: { color: '#61756D', fontSize: 12, fontWeight: 800 },
  benefitTitle: { color: '#243A32', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: .6, marginTop: 3 },
  planBenefits: { display: 'grid', gap: 9, width: '100%', flex: 1 },
  planBenefit: { display: 'flex', alignItems: 'flex-start', gap: 8, color: '#364D44', fontSize: 12, lineHeight: 1.45, fontWeight: 500 },
  benefitCheck: { display: 'grid', placeItems: 'center', flex: '0 0 19px', width: 19, height: 19, borderRadius: '50%', color: '#FFFFFF', fontSize: 11, fontWeight: 900 },
  planName: { fontSize: 19 },
  planPrice: { fontSize: 23, fontWeight: 900, color: '#08745D' },
  planDescription: { fontSize: 13, lineHeight: 1.5, color: '#596560', flex: 1 },
  planChoose: { fontSize: 12, fontWeight: 800, color: '#08745D' },
  mediaPreview: { display: 'block', width: '100%', maxWidth: '100%', height: 'auto', maxHeight: 520, aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 12, background: '#10221D', boxSizing: 'border-box' },
  eventVideo: { display: 'block', width: '100%', maxWidth: '100%', height: 'auto', maxHeight: 680, objectFit: 'contain', background: '#FFFFFF', boxSizing: 'border-box', margin: 0 },
  tab: { flex: 1, border: 0, borderRadius: 10, padding: '12px 14px', background: 'transparent', color: '#35534B', fontWeight: 800, cursor: 'pointer' },
  activeTab: { background: '#075B4E', color: '#FFFFFF', boxShadow: '0 3px 10px rgba(7,91,78,.18)' },
  feedSection: { background: '#FFFFFF', border: '1px solid #E5EBE8', borderRadius: 18, padding: 20, marginBottom: 20 },
  eventList: { display: 'grid', gap: 18, marginTop: 18 },
  eventCard: { border: '1px solid #E3E8E5', borderRadius: 16, overflow: 'hidden', background: '#FFFFFF', marginBottom: 4 },
  eventMedia: { display: 'block', width: '100%', aspectRatio: 'auto', maxHeight: 'none', overflow: 'hidden', background: '#FFFFFF', boxSizing: 'border-box' },
  eventImage: { display: 'block', width: '100%', height: 'auto', maxHeight: 680, objectFit: 'contain', background: '#FFFFFF', margin: 0 },
  eventBody: { padding: 18, background: '#FFFFFF' },
  eventMeta: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, color: '#687772', fontSize: 12, lineHeight: 1.5 },
  startDate: { display: 'flex', flexDirection: 'column', gap: 5, padding: '12px 14px', borderRadius: 10, margin: '12px 0', background: '#F7F5EF', border: '1px solid #E9E3D4', color: '#5C4B2D', fontSize: 14, lineHeight: 1.5 },
  eventCategoryBadge: { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '6px 10px', fontSize: 11, fontWeight: 900 },
  eventLocation: { color: '#687772', fontSize: 12 },
  eventTitle: { margin: '6px 0 8px', fontSize: 22, color: '#12332D' },
  eventDescription: { whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: '8px 0 14px', color: '#344C45' },
  eventActions: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', alignItems: 'stretch', gap: 7, margin: '14px 0', width: '100%', boxSizing: 'border-box' },
  actionButton: { border: '1px solid #DCE4DF', borderRadius: 10, padding: '11px 5px', background: '#FFFFFF', color: '#35564A', fontWeight: 800, fontSize: 12, lineHeight: 1.25, whiteSpace: 'normal', overflowWrap: 'anywhere', textAlign: 'center', width: '100%', minWidth: 0, minHeight: 42, boxSizing: 'border-box', cursor: 'pointer', boxShadow: '0 2px 5px rgba(67,40,91,.05)' },
  likedButton: { background: '#FFF0F0', borderColor: '#F3C4C4', color: '#B42332' },
  messageButton: { border: 0, borderRadius: 10, padding: '11px 5px', background: '#176B57', color: '#FFFFFF', fontWeight: 800, fontSize: 12, lineHeight: 1.25, whiteSpace: 'normal', overflowWrap: 'anywhere', textAlign: 'center', width: '100%', minWidth: 0, minHeight: 42, boxSizing: 'border-box', cursor: 'pointer', boxShadow: '0 3px 9px rgba(100,53,139,.2)' },
  comments: { marginTop: 16, borderTop: '1px solid #E8EEEB', paddingTop: 14 },
  comment: { marginTop: 10, padding: 12, background: '#F7F9F8', borderRadius: 10 },
  commentText: { margin: '0 0 5px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
  commentForm: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  commentInput: { flex: '1 1 200px', minWidth: 0, border: '1px solid #D9E3DE', borderRadius: 10, padding: '11px 12px', font: 'inherit' },
  page: {
    minHeight: '100vh',
    background: '#F8F6F3',
    color: '#17211F',
    padding: '18px 16px 100px',
  },
  container: { maxWidth: 760, margin: '0 auto' },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 26,
  },
  backButton: {
    border: '1px solid #E5E9E7',
    background: '#FFFFFF',
    borderRadius: 10,
    padding: '10px 13px',
    color: '#17211F',
    cursor: 'pointer',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    color: '#083F35',
    fontWeight: 800,
    fontSize: 18,
  },
  brandMark: {
    width: 34,
    height: 34,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 11,
    background: '#083F35',
    color: '#DDA10A',
  },
  hero: {
    padding: '8px 0 22px',
  },
  eyebrow: {
    color: '#7252B8',
    fontWeight: 800,
    fontSize: 11,
    letterSpacing: 1.6,
  },
  heading: {
    maxWidth: 580,
    fontSize: 'clamp(27px, 5vw, 42px)',
    lineHeight: 1.12,
    letterSpacing: '-1.2px',
    color: '#083F35',
    margin: '12px 0',
  },
  subtitle: {
    color: '#596560',
    lineHeight: 1.6,
    maxWidth: 550,
  },
  locationPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    marginTop: 8,
    padding: '9px 12px',
    background: '#E8F3F0',
    color: '#083F35',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 700,
  },
  card: {
    padding: 'clamp(18px, 4vw, 30px)',
    borderRadius: 20,
    background: '#FFFFFF',
    border: '1px solid #E5E9E7',
    boxShadow: '0 8px 32px rgba(23,33,31,0.04)',
  },
  sectionTitle: {
    margin: '0 0 18px',
    fontSize: 21,
    color: '#083F35',
  },
  form: { display: 'grid', gap: 10 },
  label: { marginTop: 8, fontSize: 13, fontWeight: 700 },
  input: {
    boxSizing: 'border-box',
    width: '100%',
    padding: 13,
    border: '1px solid #DCE4E0',
    borderRadius: 11,
    background: '#FFFFFF',
    color: '#17211F',
    font: 'inherit',
    outlineColor: '#7252B8',
  },
  textarea: {
    boxSizing: 'border-box',
    width: '100%',
    minHeight: 125,
    padding: 13,
    border: '1px solid #DCE4E0',
    borderRadius: 11,
    background: '#FFFFFF',
    color: '#17211F',
    font: 'inherit',
    resize: 'vertical',
  },
  uploadBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: 25,
    border: '1px dashed #A6BDB5',
    borderRadius: 14,
    background: '#F7FAF8',
    textAlign: 'center',
    cursor: 'pointer',
  },
  uploadIcon: {
    display: 'grid',
    placeItems: 'center',
    width: 42,
    height: 42,
    borderRadius: 14,
    background: '#F1ECFA',
    color: '#7252B8',
    fontSize: 27,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  muted: { color: '#596560', fontSize: 13, lineHeight: 1.6 },
  notice: {
    padding: 14,
    margin: '8px 0',
    borderRadius: 12,
    background: '#F1ECFA',
    color: '#49347B',
    lineHeight: 1.6,
    fontSize: 13,
  },
  paymentNotice: {
    marginTop: 12,
    padding: 15,
    borderRadius: 12,
    background: '#FBF1D7',
    color: '#5D4815',
    fontSize: 13,
    lineHeight: 1.6,
  },
  button: {
    width: '100%',
    marginTop: 12,
    padding: 15,
    border: 0,
    borderRadius: 12,
    background: '#0F6E5C',
    color: '#FFFFFF',
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
  },
  error: {
    padding: 13,
    margin: '12px 0',
    borderRadius: 10,
    background: '#FBEAEC',
    color: '#B93845',
    fontSize: 13,
    lineHeight: 1.5,
  },
  success: {
    padding: 13,
    margin: '12px 0',
    borderRadius: 10,
    background: '#E8F3F0',
    color: '#083F35',
    fontSize: 13,
    lineHeight: 1.5,
  },
};
