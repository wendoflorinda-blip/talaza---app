import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const IMAGE_BUCKET = 'event-images';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const C = { green: '#0F6E5C', dark: '#083F35', gold: '#DDA10A', ink: '#17211F', muted: '#596560', bg: '#F8F6F3', line: '#E5E9E7', white: '#FFFFFF', purple: '#7252B8', red: '#B93845' };

const firstValue = (...values) => values.find(v => v !== undefined && v !== null && String(v).trim() !== '');
const safe = value => Array.isArray(value) ? value[0] : value;
const money = value => new Intl.NumberFormat('pt-AO', { maximumFractionDigits: 0 }).format(Number(value) || 0) + ' Kz';
const planLabel = plan => {
  const days = Number(plan.duration_days);
  const term = days === 15 ? 'Quinzenal' : days === 30 ? 'Mensal' : days === 90 ? 'Trimestral' : days + ' dias';
  return term + ' · ' + money(plan.price);
};

export default function Eventos() {
  const router = useRouter();
  const [tab, setTab] = useState('ver');
  const [user, setUser] = useState(null);
  const [countryId, setCountryId] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [events, setEvents] = useState([]);
  const [plans, setPlans] = useState([]);
  const [likes, setLikes] = useState({});
  const [liked, setLiked] = useState({});
  const [comments, setComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('Geral');
  const [location, setLocation] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [image, setImage] = useState(null);
  const [planId, setPlanId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyEvent, setBusyEvent] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadSocial = useCallback(async (rows, currentUser) => {
    const ids = rows.map(row => row.id);
    if (!ids.length) { setLikes({}); setLiked({}); setComments({}); return; }
    const [likeResult, commentResult] = await Promise.all([
      supabase.from('event_likes').select('event_id,user_id').in('event_id', ids),
      supabase.from('event_comments').select('id,event_id,user_id,content,created_at').eq('status', 'published').in('event_id', ids).order('created_at', { ascending: true })
    ]);
    if (likeResult.error) console.error('Gostos dos eventos:', likeResult.error);
    if (commentResult.error) console.error('Comentários dos eventos:', commentResult.error);
    const counts = {}, own = {};
    (likeResult.data || []).forEach(row => {
      counts[row.event_id] = (counts[row.event_id] || 0) + 1;
      if (currentUser && row.user_id === currentUser.id) own[row.event_id] = true;
    });
    const grouped = {};
    (commentResult.data || []).forEach(row => {
      if (!grouped[row.event_id]) grouped[row.event_id] = [];
      grouped[row.event_id].push(row);
    });
    setLikes(counts); setLiked(own); setComments(grouped);
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const currentUser = sessionData?.session?.user || null;
      setUser(currentUser);
      let profile = null;
      if (currentUser) {
        const { data, error: profileError } = await supabase.from('profiles').select('id,country_id,province_id').eq('id', currentUser.id).maybeSingle();
        if (profileError) console.warn('Perfil/localização:', profileError.message);
        profile = data;
      }
      let storedCountry = '', storedProvince = '';
      try {
        storedCountry = localStorage.getItem('talaza_country_id') || '';
        storedProvince = localStorage.getItem('talaza_province_id') || '';
      } catch (_) {}
      const country = firstValue(router.query.country_id, router.query.country, storedCountry, profile?.country_id) || '';
      const province = firstValue(router.query.province_id, router.query.province, storedProvince, profile?.province_id) || '';
      setCountryId(country); setProvinceId(province);
      if (province) {
        const { data } = await supabase.from('provinces').select('id,name,country_id').eq('id', province).maybeSingle();
        setProvinceName(data?.name || (typeof router.query.province === 'string' ? router.query.province : ''));
      } else setProvinceName('');

      const [eventResult, planResult] = await Promise.all([
        supabase.from('events').select('id,user_id,country_id,province_id,plan_id,title,description,event_type,image_url,location,starts_at,expires_at,status,payment_status,admin_approved,created_at').eq('status', 'published').eq('payment_status', 'paid').eq('admin_approved', true).gt('expires_at', new Date().toISOString()).order('starts_at', { ascending: true, nullsFirst: false }).limit(100),
        supabase.from('plans').select('id,name,price,duration_days,plan_type,area,is_active,platform_areas_id')
      ]);
      if (eventResult.error) throw eventResult.error;
      if (planResult.error) throw planResult.error;
      const eventRows = (eventResult.data || []).filter(row => (!province || row.province_id === province) && (!country || row.country_id === country));
      setEvents(eventRows);
      const eventPlans = (planResult.data || []).filter(plan => plan.is_active === true && String(plan.plan_type || '').trim().toLowerCase() === 'publicação ativa' && String(plan.area || '').trim().toLowerCase() === 'eventos área');
      eventPlans.sort((a,b) => Number(a.duration_days) - Number(b.duration_days));
      setPlans(eventPlans);
      setPlanId(current => eventPlans.some(p => p.id === current) ? current : (eventPlans[0]?.id || ''));
      await loadSocial(eventRows, currentUser);
    } catch (e) {
      setError(e.message || 'Não foi possível carregar a área Eventos.');
    } finally { setLoading(false); }
  }, [router.isReady, router.query, loadSocial]);

  useEffect(() => { if (router.isReady) load(); }, [router.isReady, load]);

  async function requireLogin() {
    if (user) return true;
    setError('Inicia sessão na tua conta Talaza para gostar, comentar ou publicar.');
    return false;
  }

  async function toggleLike(eventItem) {
    if (!(await requireLogin()) || busyEvent) return;
    setBusyEvent(eventItem.id); setError('');
    try {
      if (liked[eventItem.id]) {
        const { error: deleteError } = await supabase.from('event_likes').delete().eq('event_id', eventItem.id).eq('user_id', user.id);
        if (deleteError) throw deleteError;
        setLiked(prev => ({ ...prev, [eventItem.id]: false }));
        setLikes(prev => ({ ...prev, [eventItem.id]: Math.max(0, (prev[eventItem.id] || 0) - 1) }));
      } else {
        const { error: insertError } = await supabase.from('event_likes').insert({ event_id: eventItem.id, user_id: user.id });
        if (insertError && insertError.code !== '23505') throw insertError;
        setLiked(prev => ({ ...prev, [eventItem.id]: true }));
        if (!insertError) setLikes(prev => ({ ...prev, [eventItem.id]: (prev[eventItem.id] || 0) + 1 }));
      }
    } catch (e) { setError('Não foi possível registar o gosto: ' + e.message); }
    finally { setBusyEvent(''); }
  }

  async function sendComment(eventItem) {
    if (!(await requireLogin()) || busyEvent) return;
    const content = String(commentDrafts[eventItem.id] || '').trim();
    if (!content) { setError('Escreve o comentário antes de enviar.'); return; }
    if (content.length > 2000) { setError('O comentário pode ter no máximo 2.000 caracteres.'); return; }
    setBusyEvent(eventItem.id); setError('');
    try {
      const { data, error: insertError } = await supabase.from('event_comments').insert({ event_id: eventItem.id, user_id: user.id, content, status: 'published' }).select('id,event_id,user_id,content,created_at').single();
      if (insertError) throw insertError;
      setComments(prev => ({ ...prev, [eventItem.id]: [...(prev[eventItem.id] || []), data] }));
      setCommentDrafts(prev => ({ ...prev, [eventItem.id]: '' }));
    } catch (e) { setError('Não foi possível publicar o comentário: ' + e.message); }
    finally { setBusyEvent(''); }
  }

  async function submitEvent(e) {
    e.preventDefault(); setError(''); setNotice('');
    if (!(await requireLogin())) return;
    if (!countryId || !provinceId) { setError('Seleciona uma província na Vitrine antes de publicar um evento.'); return; }
    if (!title.trim() || !description.trim() || !planId || !image) { setError('Preenche o título, a descrição, escolhe um plano e adiciona uma imagem.'); return; }
    if (!IMAGE_TYPES.includes(image.type) || image.size > MAX_IMAGE_SIZE) { setError('A imagem deve ser JPG, PNG ou WEBP e ter no máximo 5 MB.'); return; }
    setSaving(true);
    let uploadedPath = '';
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData?.session?.user?.id || sessionData.session.user.id !== user.id) throw new Error('A sessão expirou. Inicia sessão novamente.');
      const extension = image.type === 'image/png' ? 'png' : image.type === 'image/webp' ? 'webp' : 'jpg';
      const unique = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      uploadedPath = user.id + '/' + unique + '.' + extension;
      const { error: uploadError } = await supabase.storage.from(IMAGE_BUCKET).upload(uploadedPath, image, { contentType: image.type, upsert: false });
      if (uploadError) throw new Error('Não foi possível carregar a imagem: ' + uploadError.message);
      const { data: publicData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(uploadedPath);
      const chosenPlan = plans.find(p => p.id === planId);
      if (!chosenPlan) throw new Error('O plano escolhido já não está disponível. Atualiza a página.');
      const { data: created, error: insertError } = await supabase.from('events').insert({
        user_id: user.id, country_id: countryId, province_id: provinceId, plan_id: planId,
        title: title.trim(), description: description.trim(), event_type: eventType,
        image_url: publicData?.publicUrl, location: location.trim() || null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        expires_at: null, status: 'pending_payment', payment_status: 'pending', admin_approved: false
      }).select('id').single();
      if (insertError) throw insertError;
      await router.push({ pathname: '/Pagamento', query: { plan: planId, event: created.id, country: countryId, province: provinceId } });
    } catch (e) {
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage.from(IMAGE_BUCKET).remove([uploadedPath]);
        if (cleanupError) console.warn('Não foi possível limpar imagem não associada:', cleanupError.message);
      }
      setError(e.message || 'Não foi possível guardar o evento.');
    } finally { setSaving(false); }
  }

  const eventCountLabel = useMemo(() => events.length + (events.length === 1 ? ' evento disponível' : ' eventos disponíveis'), [events.length]);

  return (
    <main style={S.page}>
      <Head><title>Eventos | Talaza</title><meta name="description" content="Descubra e publique eventos na Talaza." /></Head>
      <div style={S.container}>
        <header style={S.header}>
          <button type="button" onClick={() => router.back()} style={S.back}>← Voltar</button>
          <a href="/explore" style={S.brand}><span style={S.mark}>T</span>Talaza</a>
        </header>
        <section style={S.hero}>
          <span style={S.kicker}>TALAZA · EVENTOS</span>
          <h1 style={S.heading}>Descubra o que está a acontecer.</h1>
          <p style={S.sub}>Eventos, cursos, feiras, lançamentos, livros, shows e atividades perto de si.</p>
          {provinceName && <span style={S.pill}>⌖ {provinceName}</span>}
        </section>
        <nav style={S.tabs} aria-label="Área de eventos">
          <button type="button" onClick={() => { setTab('ver'); setError(''); }} style={{ ...S.tab, ...(tab === 'ver' ? S.activeTab : {}) }}>Ver eventos</button>
          <button type="button" onClick={() => { setTab('publicar'); setError(''); }} style={{ ...S.tab, ...(tab === 'publicar' ? S.activeTab : {}) }}>Publicar eventos</button>
        </nav>
        {error && <div role="alert" style={S.error}>{error}</div>}
        {notice && <div role="status" style={S.notice}>{notice}</div>}

        {tab === 'ver' && <section>
          <div style={S.sectionHead}><div><h2 style={S.h2}>Eventos na sua região</h2><p style={S.muted}>{eventCountLabel}</p></div><button style={S.outline} onClick={load} type="button">Atualizar</button></div>
          {loading ? <div style={S.empty}>A carregar eventos…</div> : events.length === 0 ? <div style={S.empty}><h3>Ainda não há eventos ativos nesta província</h3><p>Quando um anúncio for pago, aprovado e publicado, aparecerá aqui.</p><button type="button" style={S.primary} onClick={() => { setTab('publicar'); setError(''); }}>Publicar um evento</button></div> :
          <div style={S.list}>{events.map(item => <article key={item.id} style={S.eventCard}>
            {item.image_url && <img src={item.image_url} alt={item.title || 'Imagem do evento'} style={S.eventImage} loading="lazy" />}
            <div style={S.eventBody}>
              <div style={S.eventMeta}><span>{item.event_type || 'Evento'}</span>{item.starts_at && <span>{new Date(item.starts_at).toLocaleString('pt-AO', { dateStyle: 'medium', timeStyle: 'short' })}</span>}</div>
              <h3 style={S.eventTitle}>{item.title}</h3>
              <p style={S.description}>{item.description}</p>
              {item.location && <p style={S.location}>⌖ {item.location}</p>}
              <div style={S.socialRow}>
                <button type="button" disabled={busyEvent === item.id} onClick={() => toggleLike(item)} style={{ ...S.socialButton, ...(liked[item.id] ? S.liked : {}) }}>{liked[item.id] ? '♥ Gostaste' : '♡ Gostar'} · {likes[item.id] || 0}</button>
                <span style={S.muted}>{(comments[item.id] || []).length} comentários</span>
                <button type="button" style={S.messageButton} onClick={() => user ? router.push({ pathname: '/mensagens', query: { to: item.user_id, source: 'Eventos', sourceId: item.id } }) : setError('Inicia sessão para enviar uma mensagem ao organizador.')}>Mensagem ao organizador</button>
              </div>
              <div style={S.comments}>
                <h4>Comentários</h4>
                {(comments[item.id] || []).map(comment => <div key={comment.id} style={S.comment}><p>{comment.content}</p><small>{comment.created_at ? new Date(comment.created_at).toLocaleString('pt-AO') : ''}</small></div>)}
                {user ? <div style={S.commentForm}><textarea value={commentDrafts[item.id] || ''} maxLength={2000} rows={2} placeholder="Escreve um comentário respeitoso…" onChange={e => setCommentDrafts(prev => ({ ...prev, [item.id]: e.target.value }))} style={S.textarea} /><button type="button" disabled={busyEvent === item.id} onClick={() => sendComment(item)} style={S.primary}>{busyEvent === item.id ? 'A enviar…' : 'Comentar'}</button></div> : <p style={S.muted}>Inicia sessão para comentar.</p>}
              </div>
            </div>
          </article>)}</div>}
        </section>}

        {tab === 'publicar' && <section style={S.formCard}>
          <h2 style={S.h2}>Publicar eventos</h2>
          <p style={S.sub}>Esta área destina-se a quem tem um evento a anunciar: vendas de livros, shows, atividades, entre outros.</p>
          {!user && <div style={S.notice}>Para publicar um evento, inicia sessão na tua conta Talaza. <a href="/login" style={S.inlineLink}>Entrar</a></div>}
          <form onSubmit={submitEvent} style={S.form}>
            <label style={S.label} htmlFor="event-title">Título do evento</label>
            <input id="event-title" required maxLength={150} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Feira de empreendedorismo" style={S.input} />
            <label style={S.label} htmlFor="event-type">Categoria do evento</label>
            <select id="event-type" value={eventType} onChange={e => setEventType(e.target.value)} style={S.input}>{['Geral','Vendas de livros','Show','Formação','Feira','Atividades','Cultura','Desporto','Negócios','Religião','Outro'].map(v => <option key={v}>{v}</option>)}</select>
            <label style={S.label} htmlFor="event-description">Descrição</label>
            <textarea id="event-description" required maxLength={10000} rows={5} value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreve o que vai acontecer, para quem é e o que as pessoas precisam de saber." style={S.textarea} />
            <label style={S.label} htmlFor="event-location">Local (opcional)</label>
            <input id="event-location" maxLength={250} value={location} onChange={e => setLocation(e.target.value)} placeholder="Município, bairro ou espaço" style={S.input} />
            <label style={S.label} htmlFor="event-date">Data e hora (opcional)</label>
            <input id="event-date" type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} style={S.input} />
            <label style={S.label} htmlFor="event-image">Imagem do evento (JPG, PNG ou WEBP; até 5 MB)</label>
            <input id="event-image" required type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setImage(e.target.files?.[0] || null)} style={S.file} />
            {plans.length > 0 ? <fieldset style={S.plans}><legend style={S.label}>Escolhe o plano de publicação</legend>{plans.map(plan => <label key={plan.id} style={S.planOption}><input type="radio" name="event-plan" value={plan.id} checked={planId === plan.id} onChange={() => setPlanId(plan.id)} /><span><strong>{planLabel(plan)}</strong><small>Publicação por {plan.duration_days} dias</small></span></label>)}</fieldset> : <div style={S.notice}>Não foi possível encontrar os planos de Publicação Ativa de Eventos. Confirma se estão ativos no Supabase.</div>}
            <p style={S.muted}>O anúncio só ficará ativo depois da confirmação do pagamento e da aprovação da equipa Talaza.</p>
            <button type="submit" disabled={saving || loading || !user || !plans.length} style={{ ...S.primary, opacity: saving || loading || !user || !plans.length ? .6 : 1 }}>{saving ? 'A guardar anúncio…' : 'Avançar para pagamento'}</button>
          </form>
        </section>}
        <footer style={S.footer}>Talaza · Eventos • Publicações sujeitas a verificação e aprovação.</footer>
      </div>
    </main>
  );
}

const S = {
  page: { minHeight: '100vh', background: C.bg, color: C.ink, padding: '16px 16px 70px', fontFamily: "'Inter','Segoe UI',Arial,sans-serif" },
  container: { maxWidth: 900, margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 26 },
  back: { border: '1px solid ' + C.line, background: C.white, borderRadius: 11, padding: '10px 13px', cursor: 'pointer', color: C.ink },
  brand: { display: 'flex', alignItems: 'center', gap: 9, color: C.dark, fontWeight: 900, fontSize: 19, textDecoration: 'none' },
  mark: { display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 12, background: C.dark, color: C.gold },
  hero: { padding: '10px 0 25px' },
  kicker: { color: C.purple, fontWeight: 900, letterSpacing: 1.5, fontSize: 11 },
  heading: { color: C.dark, fontSize: 'clamp(28px,5vw,42px)', lineHeight: 1.12, letterSpacing: '-1px', margin: '12px 0' },
  sub: { color: C.muted, lineHeight: 1.65, maxWidth: 650, marginTop: 7 },
  pill: { display: 'inline-block', marginTop: 8, padding: '8px 12px', borderRadius: 99, background: '#E8F3F0', color: C.dark, fontWeight: 700, fontSize: 13 },
  tabs: { display: 'flex', gap: 8, padding: 6, background: '#ECEFEA', borderRadius: 14, marginBottom: 24 },
  tab: { flex: 1, border: 0, borderRadius: 10, background: 'transparent', padding: '13px 10px', color: C.muted, fontWeight: 800, cursor: 'pointer' },
  activeTab: { background: C.white, color: C.dark, boxShadow: '0 2px 8px rgba(0,0,0,.06)' },
  sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  h2: { color: C.dark, fontSize: 23, margin: '0 0 7px' },
  muted: { color: C.muted, fontSize: 13, lineHeight: 1.55 },
  list: { display: 'grid', gap: 18 },
  eventCard: { overflow: 'hidden', border: '1px solid ' + C.line, background: C.white, borderRadius: 18, boxShadow: '0 8px 25px rgba(23,33,31,.035)' },
  eventImage: { width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block', background: '#E8ECE8' },
  eventBody: { padding: '18px clamp(15px,3vw,25px) 22px' },
  eventMeta: { display: 'flex', flexWrap: 'wrap', gap: 10, color: C.purple, fontSize: 12, fontWeight: 800, marginBottom: 8 },
  eventTitle: { fontSize: 22, color: C.dark, margin: '0 0 9px' },
  description: { whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0 },
  location: { color: C.muted, fontSize: 13 },
  socialRow: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderTop: '1px solid ' + C.line, paddingTop: 15, marginTop: 18 },
  socialButton: { border: '1px solid ' + C.line, background: C.white, color: C.ink, borderRadius: 10, padding: '9px 12px', cursor: 'pointer', fontWeight: 700 },
  liked: { color: '#B42345', background: '#FFF0F3', borderColor: '#FFD0DA' },
  messageButton: { marginLeft: 'auto', border: 0, borderRadius: 10, background: '#E8F3F0', color: C.dark, padding: '10px 13px', fontWeight: 800, cursor: 'pointer' },
  comments: { marginTop: 18, borderTop: '1px solid ' + C.line, paddingTop: 14 },
  comment: { borderBottom: '1px solid #F0F1EE', padding: '8px 0' },
  commentForm: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'end', gap: 8, marginTop: 12 },
  formCard: { background: C.white, border: '1px solid ' + C.line, borderRadius: 18, padding: 'clamp(18px,4vw,30px)' },
  form: { display: 'grid', gap: 10, marginTop: 18 },
  label: { fontSize: 13, fontWeight: 800, color: C.ink, marginTop: 6 },
  input: { width: '100%', boxSizing: 'border-box', border: '1px solid #DCE4E0', borderRadius: 11, padding: 13, color: C.ink, background: C.white, font: 'inherit' },
  textarea: { width: '100%', boxSizing: 'border-box', border: '1px solid #DCE4E0', borderRadius: 11, padding: 13, color: C.ink, background: C.white, font: 'inherit', resize: 'vertical' },
  file: { border: '1px dashed #A7BEB5', padding: 13, borderRadius: 11, width: '100%', background: '#FBFCFA' },
  plans: { border: '1px solid ' + C.line, borderRadius: 12, padding: 14, display: 'grid', gap: 9, margin: '8px 0' },
  planOption: { display: 'flex', gap: 10, alignItems: 'center', padding: 12, borderRadius: 10, background: '#F8FAF7', cursor: 'pointer' },
  primary: { border: 0, borderRadius: 11, background: C.green, color: C.white, padding: '13px 17px', fontWeight: 800, cursor: 'pointer' },
  outline: { border: '1px solid ' + C.line, borderRadius: 10, background: C.white, color: C.dark, padding: '9px 12px', fontWeight: 700, cursor: 'pointer' },
  empty: { padding: 28, border: '1px dashed #C8D3CC', borderRadius: 16, background: C.white, textAlign: 'center', color: C.muted, lineHeight: 1.65 },
  error: { background: '#FFF0EF', color: C.red, border: '1px solid #FFD5D0', padding: 13, borderRadius: 11, marginBottom: 14, lineHeight: 1.5 },
  notice: { background: '#FFF8E6', color: '#765300', border: '1px solid #F0DCA0', padding: 13, borderRadius: 11, margin: '12px 0', lineHeight: 1.5 },
  inlineLink: { color: C.dark, fontWeight: 800 },
  footer: { marginTop: 30, color: C.muted, fontSize: 12, textAlign: 'center' }
};
