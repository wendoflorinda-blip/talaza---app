import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const BUCKET = 'event-images';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm'];
const EVENT_TYPES = ['Geral', 'Formação', 'Show', 'Atividades', 'Sessão de Lançamento e Venda', 'Conferência', 'Fórum', 'Workshop', 'Palestra', 'Cinema'];
const PLAN_DETAILS = {
  Quinzenal: 'Ideal para divulgar eventos de curta duração e alcançar o público durante 15 dias.',
  Mensal: 'Mais tempo para promover o evento, gerar interesse e receber mensagens durante 30 dias.',
  Trimestral: 'Maior período de divulgação para eventos recorrentes, grandes iniciativas e campanhas de longo prazo.'
};

function categoryTheme(type) {
  const palette = [
    { color: '#08745F', soft: '#E3F4ED' },
    { color: '#64358B', soft: '#F0E7F7' },
    { color: '#A77912', soft: '#FBF2D7' },
    { color: '#2167A5', soft: '#E5F1FC' },
    { color: '#B33B5A', soft: '#FCE9EF' },
    { color: '#0C7C86', soft: '#E1F5F6' },
    { color: '#5C6B24', soft: '#F0F4DD' },
    { color: '#9A4F16', soft: '#FCEBDD' },
    { color: '#5146A5', soft: '#EEECFF' },
    { color: '#47606A', soft: '#E8F0F2' }
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
  const [likesByEvent, setLikesByEvent] = useState({});
  const [likedByMe, setLikedByMe] = useState({});
  const [commentsByEvent, setCommentsByEvent] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [feedLoading, setFeedLoading] = useState(false);
  const [interactionBusy, setInteractionBusy] = useState('');
  const [feedError, setFeedError] = useState('');
  const [feedNotice, setFeedNotice] = useState('');

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('talaza_history_events');
      if (saved) setHistoryItems(JSON.parse(saved));
    } catch {
      setHistoryItems([]);
    }
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

        const resolvedCountry = firstValue(
          router.query.country_id,
          router.query.country,
          storedCountry,
          profile?.country_id
        );

        const resolvedProvince = firstValue(
          router.query.province_id,
          router.query.province,
          storedProvince,
          profile?.province_id
        );

        if (cancelled) return;

        setCountryId(resolvedCountry || '');
        setProvinceId(resolvedProvince || '');

        if (resolvedProvince) {
          const { data: province } = await supabase
            .from('provinces')
            .select('id, name')
            .eq('id', resolvedProvince)
            .maybeSingle();

          if (!cancelled) {
            setProvinceName(
              province?.name ||
              (typeof router.query.province === 'string'
                ? router.query.province
                : '')
            );
          }
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

  async function loadEvents() {
    setFeedLoading(true);
    setFeedError('');
    try {
      let query = supabase.from('events').select('id,user_id,country_id,province_id,title,description,event_type,image_url,video_url,location,starts_at,expires_at,status,payment_status,admin_approved,created_at').eq('status', 'published').eq('payment_status', 'paid').eq('admin_approved', true).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(60);
      if (provinceId) query = query.eq('province_id', provinceId);
      if (countryId) query = query.eq('country_id', countryId);
      const { data, error: eventsError } = await query;
      if (eventsError) throw eventsError;
      let rows = data || [];
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
      setEvents(rows);
      if (!rows.length) {
        setLikesByEvent({});
        setLikedByMe({});
        setCommentsByEvent({});
        return;
      }
      const ids = rows.map(row => row.id);
      const [{ data: likes, error: likesError }, { data: comments, error: commentsError }] = await Promise.all([
        supabase.from('event_likes').select('event_id,user_id').in('event_id', ids),
        supabase.from('event_comments').select('id,event_id,user_id,content,created_at').in('event_id', ids).eq('status', 'published').order('created_at', { ascending: true })
      ]);
      if (likesError) throw likesError;
      if (commentsError) throw commentsError;
      const counts = {};
      const mine = {};
      (likes || []).forEach(row => {
        counts[row.event_id] = (counts[row.event_id] || 0) + 1;
        if (user && row.user_id === user.id) mine[row.event_id] = true;
      });
      setLikesByEvent(counts);
      setLikedByMe(mine);
      setCommentsByEvent((comments || []).reduce((acc, row) => {
        (acc[row.event_id] ||= []).push(row);
        return acc;
      }, {}));
    } catch (err) {
      setFeedError(err.message || 'Não foi possível carregar os eventos. Confirme as políticas RLS.');
    } finally {
      setFeedLoading(false);
    }
  }

  useEffect(() => {
    if (!router.isReady || loading) return;
    loadEvents();
  }, [router.isReady, loading, provinceId, countryId, user?.id]);

  function trackEventAction(item) {
    if (!item?.id) return;
    setHistoryItems(previous => {
      const next = [{
        id: item.id,
        title: item.title,
        event_type: item.event_type,
        image_url: item.image_url || null,
        at: new Date().toISOString()
      }, ...previous.filter(entry => entry.id !== item.id)].slice(0, 100);
      try {
        sessionStorage.setItem('talaza_history_events', JSON.stringify(next));
      } catch {}
      return next;
    });
    setEvents(previous => {
      const selected = previous.find(event => event.id === item.id);
      if (!selected) return previous;
      return [...previous.filter(event => event.id !== item.id), selected];
    });
  }

  const visibleEvents = selectedCategory === 'Todas'
    ? events
    : events.filter(event => (event.event_type || 'Geral') === selectedCategory);

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
      const { error: insertError } = await supabase.from('event_comments').insert({ event_id: eventId, user_id: user.id, content, status: 'published' });
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
            onClick={() => router.back()}
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
              <button type="button" onClick={() => setShowHistory(value => !value)} style={styles.historyButton}>◷ Ver histórico ({historyItems.length})</button>
            </div>
            {showHistory && <div style={styles.historyPanel}><strong>Eventos que consultaste nesta sessão</strong>{historyItems.length === 0 ? <p style={styles.muted}>Ainda não consultaste nenhum evento. Ao gostar, comentar ou contactar o organizador, ele aparece aqui.</p> : historyItems.map(entry => <button key={entry.id} type="button" onClick={() => { setSelectedCategory('Todas'); setShowHistory(false); const selected = events.find(event => event.id === entry.id); if (selected) trackEventAction(selected); }} style={styles.historyItem}>{entry.image_url ? <img src={entry.image_url} alt="" style={styles.historyThumb} /> : <span style={styles.historyThumbFallback}>▣</span>}<span><strong>{entry.title}</strong><small>{entry.event_type}</small></span></button>)}</div>}
            <div style={styles.categoryChips} aria-label="Filtrar eventos por categoria">
              {['Todas', ...EVENT_TYPES].map(category => <button key={category} type="button" onClick={() => setSelectedCategory(category)} style={{ ...styles.categoryChip, ...(selectedCategory === category ? styles.categoryChipActive : {}) }}>{category}</button>)}
            </div>
            <p style={styles.muted}>Descobre o que está a acontecer na tua província. Podes gostar, comentar e falar com o organizador através das mensagens internas da Talaza.</p>
            {feedError && <div style={styles.error}>{feedError}</div>}
            {feedNotice && <div style={styles.success}>{feedNotice}</div>}
            {feedLoading && <p style={styles.muted}>A carregar eventos...</p>}
            {!feedLoading && events.length === 0 && <div style={styles.notice}>Ainda não existem eventos aprovados e ativos nesta província.</div>}
            {!feedLoading && events.length > 0 && visibleEvents.length === 0 && <div style={styles.notice}>Ainda não há eventos nesta categoria. Escolhe outra categoria ou «Todas».</div>}
            <div style={styles.eventList}>
              {visibleEvents.map(item => (
                <article key={item.id} style={styles.eventCard} onClick={() => trackEventAction(item)}>
                  {(item.video_url || item.image_url) && <div style={styles.eventMedia}>
                    {item.video_url
                      ? <video src={item.video_url} controls playsInline preload="metadata" poster={item.image_url || undefined} style={styles.eventVideo} aria-label={'Vídeo do evento: ' + item.title} />
                      : <img src={item.image_url} alt={item.title} style={styles.eventImage} />}
                  </div>}
                  <div style={styles.eventBody}>
                    <div style={styles.eventMeta}><span style={{ ...styles.eventCategoryBadge, color: categoryTheme(item.event_type).color, background: categoryTheme(item.event_type).soft }}>{item.event_type || 'Geral'}</span>{item.location ? <span style={styles.eventLocation}>📍 {item.location}</span> : null}</div>
                    <h3 style={styles.eventTitle}>{item.title}</h3>
                    <p style={styles.eventDescription}>{item.description}</p>
                    {item.starts_at && <p style={styles.eventMeta}>📅 {new Date(item.starts_at).toLocaleString('pt-AO')}</p>}
                    <div style={styles.eventActions}>
                      <button type="button" disabled={interactionBusy === 'like:' + item.id} onClick={() => toggleLike(item.id)} style={{ ...styles.actionButton, ...(likedByMe[item.id] ? styles.likedButton : {}) }}>
                        {likedByMe[item.id] ? '♥ Gostaste' : '♡ Gostar'} · {likesByEvent[item.id] || 0}
                      </button>
                      {user && item.user_id !== user.id && <button type="button" onClick={(event) => { event.stopPropagation(); trackEventAction(item); router.push({ pathname: '/mensagens', query: { to: item.user_id, source: 'Eventos', sourceId: item.id } }); }} style={styles.messageButton}>Enviar mensagem</button>}
                    </div>
                    <div style={styles.comments}>
                      <strong>Comentários ({(commentsByEvent[item.id] || []).length})</strong>
                      {(commentsByEvent[item.id] || []).map(comment => (
                        <div key={comment.id} style={styles.comment}>
                          <p style={styles.commentText}>{comment.content}</p>
                          <span style={styles.eventMeta}>{new Date(comment.created_at).toLocaleString('pt-AO')}</span>
                        </div>
                      ))}
                      <form onSubmit={(e) => { e.preventDefault(); submitComment(item.id); }} style={styles.commentForm}>
                        <input aria-label="Escrever comentário" maxLength={2000} value={commentDrafts[item.id] || ''} onChange={e => setCommentDrafts(previous => ({ ...previous, [item.id]: e.target.value }))} placeholder={user ? 'Escreve um comentário...' : 'Inicia sessão para comentar'} style={styles.commentInput} />
                        <button type="submit" disabled={!user || interactionBusy === 'comment:' + item.id || !String(commentDrafts[item.id] || '').trim()} style={styles.messageButton}>{interactionBusy === 'comment:' + item.id ? 'A enviar…' : 'Comentar'}</button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}
            </div>
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
  categoryChips: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 },
  categoryChip: { border: '1px solid #D8E3DD', borderRadius: 999, padding: '8px 12px', background: '#FFFFFF', color: '#35534B', fontWeight: 700, fontSize: 12, cursor: 'pointer' },
  categoryChipActive: { borderColor: '#075B4E', background: '#075B4E', color: '#FFFFFF' },
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
  mediaPreview: { display: 'block', width: '100%', maxWidth: '100%', height: 'auto', maxHeight: 280, aspectRatio: '16 / 9', objectFit: 'contain', borderRadius: 12, background: '#10221D', boxSizing: 'border-box' },
  eventVideo: { display: 'block', width: '100%', maxWidth: '100%', height: 'auto', aspectRatio: '16 / 9', maxHeight: 420, objectFit: 'contain', background: '#10221D', boxSizing: 'border-box' },
  tab: { flex: 1, border: 0, borderRadius: 10, padding: '12px 14px', background: 'transparent', color: '#35534B', fontWeight: 800, cursor: 'pointer' },
  activeTab: { background: '#075B4E', color: '#FFFFFF', boxShadow: '0 3px 10px rgba(7,91,78,.18)' },
  feedSection: { background: '#FFFFFF', border: '1px solid #E5EBE8', borderRadius: 18, padding: 20, marginBottom: 20 },
  eventList: { display: 'grid', gap: 18, marginTop: 18 },
  eventCard: { border: '1px solid #E4EAE7', borderRadius: 16, overflow: 'hidden', background: '#FFFFFF' },
  eventMedia: { display: 'block', width: '100%', aspectRatio: '16 / 9', maxHeight: 460, overflow: 'hidden', background: '#10221D', boxSizing: 'border-box' },
  eventImage: { display: 'block', width: '100%', height: '100%', aspectRatio: '16 / 9', objectFit: 'cover', background: '#10221D' },
  eventBody: { padding: 18 },
  eventMeta: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, color: '#687772', fontSize: 12, lineHeight: 1.5 },
  eventCategoryBadge: { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '6px 10px', fontSize: 11, fontWeight: 900 },
  eventLocation: { color: '#687772', fontSize: 12 },
  eventTitle: { margin: '6px 0 8px', fontSize: 22, color: '#12332D' },
  eventDescription: { whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: '8px 0 14px', color: '#344C45' },
  eventActions: { display: 'flex', flexWrap: 'wrap', gap: 10, margin: '14px 0' },
  actionButton: { border: '1px solid #D6E3DD', borderRadius: 10, padding: '9px 13px', background: '#FFFFFF', color: '#075B4E', fontWeight: 800, cursor: 'pointer' },
  likedButton: { background: '#FFF0F0', borderColor: '#F3C4C4', color: '#B42332' },
  messageButton: { border: 0, borderRadius: 10, padding: '10px 14px', background: '#075B4E', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' },
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
