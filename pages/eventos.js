import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const BUCKET = 'event-images';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [view, setView] = useState('browse');
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
      let query = supabase.from('events').select('id,user_id,country_id,province_id,title,description,event_type,image_url,location,starts_at,expires_at,status,payment_status,admin_approved,created_at').eq('status', 'published').eq('payment_status', 'paid').eq('admin_approved', true).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(60);
      if (provinceId) query = query.eq('province_id', provinceId);
      if (countryId) query = query.eq('country_id', countryId);
      const { data, error: eventsError } = await query;
      if (eventsError) throw eventsError;
      const rows = data || [];
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

  async function toggleLike(eventId) {
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

    if (!title.trim() || !description.trim()) {
      setError('Preenche o título e a descrição do evento.');
      return;
    }

    if (!planId) {
      setError('Seleciona o plano para a publicação.');
      return;
    }

    if (!image) {
      setError('Carrega uma imagem para o evento.');
      return;
    }

    if (image.size > MAX_IMAGE_SIZE) {
      setError('A imagem deve ter, no máximo, 5 MB.');
      return;
    }

    if (!IMAGE_TYPES.includes(image.type)) {
      setError('Usa uma imagem JPG, PNG ou WEBP.');
      return;
    }

    setSaving(true);

    let uploadedPath = '';

    try {
      const extension = image.name.split('.').pop().toLowerCase();
      const safeExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(
        extension
      )
        ? extension
        : 'jpg';

      const uniqueId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      uploadedPath = `${user.id}/${uniqueId}.${safeExtension}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(uploadedPath, image, {
          contentType: image.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(
          `Não foi possível carregar a imagem. Confirma que o bucket "${BUCKET}" existe e que as políticas de Storage permitem o carregamento.`
        );
      }

      const { data: publicData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(uploadedPath);

      const imageUrl = publicData?.publicUrl;

      if (!imageUrl) {
        throw new Error('Não foi possível obter o endereço da imagem.');
      }

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
            location: location.trim() || null,
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

      const fileInput = document.getElementById('event-image');
      if (fileInput) fileInput.value = '';

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
            <h2 style={styles.sectionTitle}>Eventos aprovados</h2>
            <p style={styles.muted}>Descobre o que está a acontecer na tua província. Podes gostar, comentar e falar com o organizador através das mensagens internas da Talaza.</p>
            {feedError && <div style={styles.error}>{feedError}</div>}
            {feedNotice && <div style={styles.success}>{feedNotice}</div>}
            {feedLoading && <p style={styles.muted}>A carregar eventos...</p>}
            {!feedLoading && events.length === 0 && <div style={styles.notice}>Ainda não existem eventos aprovados e ativos nesta província.</div>}
            <div style={styles.eventList}>
              {events.map(item => (
                <article key={item.id} style={styles.eventCard}>
                  {item.image_url && <img src={item.image_url} alt={item.title} style={styles.eventImage} />}
                  <div style={styles.eventBody}>
                    <div style={styles.eventMeta}>{item.event_type || 'Evento'}{item.location ? ' · ' + item.location : ''}</div>
                    <h3 style={styles.eventTitle}>{item.title}</h3>
                    <p style={styles.eventDescription}>{item.description}</p>
                    {item.starts_at && <p style={styles.eventMeta}>📅 {new Date(item.starts_at).toLocaleString('pt-AO')}</p>}
                    <div style={styles.eventActions}>
                      <button type="button" disabled={interactionBusy === 'like:' + item.id} onClick={() => toggleLike(item.id)} style={{ ...styles.actionButton, ...(likedByMe[item.id] ? styles.likedButton : {}) }}>
                        {likedByMe[item.id] ? '♥ Gostaste' : '♡ Gostar'} · {likesByEvent[item.id] || 0}
                      </button>
                      {user && item.user_id !== user.id && <button type="button" onClick={() => router.push({ pathname: '/mensagens', query: { to: item.user_id, source: 'Eventos', sourceId: item.id } })} style={styles.messageButton}>Enviar mensagem</button>}
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

          <form onSubmit={handleSubmit} style={styles.form}>
            <label htmlFor="event-title" style={styles.label}>
              Título do evento
            </label>
            <input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Feira de Empreendedorismo"
              maxLength={150}
              required
              style={styles.input}
            />

            <label htmlFor="event-description" style={styles.label}>
              Descrição
            </label>
            <textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que vai acontecer neste evento?"
              rows={5}
              required
              style={styles.textarea}
            />

            <label htmlFor="event-type" style={styles.label}>
              Categoria do evento
            </label>
            <select
              id="event-type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              style={styles.input}
            >
              <option>Geral</option>
              <option>Formação</option>
              <option>Negócios</option>
              <option>Cultura</option>
              <option>Desporto</option>
              <option>Entretenimento</option>
              <option>Religião</option>
            </select>

            <label htmlFor="event-location" style={styles.label}>
              Local do evento
            </label>
            <input
              id="event-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Município, bairro ou local"
              style={styles.input}
            />

            <label htmlFor="event-date" style={styles.label}>
              Data e hora (opcional)
            </label>
            <input
              id="event-date"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              style={styles.input}
            />

            <label htmlFor="event-image" style={styles.label}>
              Imagem do evento
            </label>
            <label htmlFor="event-image" style={styles.uploadBox}>
              <span style={styles.uploadIcon}>＋</span>
              <strong>
                {image ? image.name : 'Escolher imagem'}
              </strong>
              <span style={styles.muted}>JPG, PNG ou WEBP · máximo 5 MB</span>
            </label>
            <input
              id="event-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              style={styles.hiddenInput}
            />

            {plans.length > 0 && (
              <>
                <label htmlFor="event-plan" style={styles.label}>
                  Plano de publicação
                </label>
                <select
                  id="event-plan"
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  required
                  style={styles.input}
                >
                  <option value="">Seleciona um plano</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {planLabel(plan)}
                    </option>
                  ))}
                </select>
              </>
            )}

            {!loading && plans.length === 0 && (
              <div style={styles.notice}>
                Ainda não foram encontrados planos compatíveis com Eventos.
                Verifica os registos e as colunas da tabela `plans`.
              </div>
            )}

            <div style={styles.paymentNotice}>
              <strong>Como funciona a publicação?</strong>
              <p>
                Depois de submeteres, o evento fica pendente. A publicação
                só deve ficar ativa após a confirmação do pagamento do plano.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || saving || !user || plans.length === 0}
              style={{
                ...styles.button,
                opacity:
                  loading || saving || !user || plans.length === 0
                    ? 0.6
                    : 1,
              }}
            >
              {saving
                ? 'A guardar evento...'
                : 'Submeter evento'}
            </button>
          </form>
        </section>}
      </div>
    </main>
  );
}

const styles = {
  tabs: { display: 'flex', gap: 10, marginBottom: 18, padding: 5, background: '#EAF1EE', borderRadius: 14 },
  tab: { flex: 1, border: 0, borderRadius: 10, padding: '12px 14px', background: 'transparent', color: '#35534B', fontWeight: 800, cursor: 'pointer' },
  activeTab: { background: '#075B4E', color: '#FFFFFF', boxShadow: '0 3px 10px rgba(7,91,78,.18)' },
  feedSection: { background: '#FFFFFF', border: '1px solid #E5EBE8', borderRadius: 18, padding: 20, marginBottom: 20 },
  eventList: { display: 'grid', gap: 18, marginTop: 18 },
  eventCard: { border: '1px solid #E4EAE7', borderRadius: 16, overflow: 'hidden', background: '#FFFFFF' },
  eventImage: { display: 'block', width: '100%', maxHeight: 360, objectFit: 'cover', background: '#F1F5F3' },
  eventBody: { padding: 18 },
  eventMeta: { color: '#687772', fontSize: 12, lineHeight: 1.5 },
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
