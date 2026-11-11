import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import TalazaMenu from '../components/TalazaMenu';

const C = {
  green: '#0B3D2E',
  gold: '#D4A017',
  bg: '#F7F5F0',
  ink: '#0B3D2E',
  muted: '#6B7280',
  line: '#EFEDEA',
  white: '#FFFFFF',
  unread: '#FFF9E6',
};

function relativeTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'agora';
  if (seconds < 3600) return Math.floor(seconds / 60) + ' min';
  if (seconds < 86400) return Math.floor(seconds / 3600) + ' h';
  if (seconds < 172800) return 'ontem';
  if (seconds < 604800) return Math.floor(seconds / 86400) + ' d';
  return date.toLocaleDateString('pt-AO', { day: 'numeric', month: 'short' }).replace('.', '');
}

function groupLabel(value) {
  const date = new Date(value);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.floor((startToday - startDate) / 86400000);
  if (days === 0) return 'HOJE';
  if (days === 1) return 'ONTEM';
  if (days >= 2 && days < 7) return 'ESTA SEMANA';
  return 'ANTERIORES';
}

function notificationStyle(type) {
  const value = String(type || '').toLowerCase();
  if (value.includes('motivation')) return { icon: '✦', color: C.green, label: 'Motivação' };
  if (value.includes('week_theme')) return { icon: '🏆', color: C.gold, label: 'Título da Semana' };
  if (value.includes('reaction') || value.includes('like')) return { icon: '❤️', color: '#8B5CF6', label: 'Reação' };
  if (value.includes('comment') || value.includes('reply')) return { icon: '💬', color: '#8B5CF6', label: 'Comentário' };
  if (value.includes('business')) return { icon: '✦', color: C.green, label: 'Negócios' };
  return { icon: '🔔', color: '#8B5CF6', label: 'Atividade' };
}

export default function Notificacoes() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState('');
  const [swipeOpenId, setSwipeOpenId] = useState('');
  const touchStart = useRef({});

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !data?.user) {
        router.replace('/login');
        return;
      }
      setUser(data.user);
      const { data: rows, error: queryError } = await supabase
        .from('notifications')
        .select('id, title, content, type, created_at, user_id, is_read, reference_id')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false })
        .limit(150);
      if (!active) return;
      if (queryError) {
        setError('Não foi possível carregar as notificações. Tenta novamente.');
      } else {
        setItems(rows || []);
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [router]);

  const unreadCount = items.filter(item => !item.is_read).length;
  const groups = useMemo(() => {
    const result = [];
    const order = ['HOJE', 'ONTEM', 'ESTA SEMANA', 'ANTERIORES'];
    const grouped = items.reduce((acc, item) => {
      const key = groupLabel(item.created_at);
      (acc[key] ||= []).push(item);
      return acc;
    }, {});
    order.forEach(label => { if (grouped[label]?.length) result.push({ label, items: grouped[label] }); });
    return result;
  }, [items]);

  async function markAllRead() {
    if (!user || unreadCount === 0) return;
    const previous = items;
    setItems(current => current.map(item => ({ ...item, is_read: true })));
    const { error: updateError } = await supabase.from('notifications')
      .update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    if (updateError) {
      setItems(previous);
      setError('Não foi possível marcar todas como lidas. ' + updateError.message);
    }
  }

  async function markOneRead(item) {
    if (item.is_read || !user) return;
    setItems(current => current.map(row => row.id === item.id ? { ...row, is_read: true } : row));
    const { error: updateError } = await supabase.from('notifications')
      .update({ is_read: true }).eq('id', item.id).eq('user_id', user.id);
    if (updateError) {
      setItems(current => current.map(row => row.id === item.id ? { ...row, is_read: false } : row));
      setError('Não foi possível atualizar esta notificação. ' + updateError.message);
    }
  }

  async function destinationFor(item) {
    const type = String(item.type || '').toLowerCase();
    const id = item.reference_id;
    if (!id) return null;

    if (type.includes('motivation') || type.includes('week_theme')) {
      return { pathname: '/comunidade', query: { area: type.includes('motivation') ? 'motivation' : 'theme' } };
    }
    if (type.includes('event')) {
      return { pathname: '/eventos', query: { eventId: id } };
    }
    if (type.includes('community_comment')) {
      return { pathname: '/comunidade', query: { postId: id } };
    }
    if (type.includes('comment') || type.includes('reaction') || type.includes('reply')) {
      const { data: communityComment } = await supabase.from('community_comments')
        .select('post_id').eq('id', id).maybeSingle();
      if (communityComment?.post_id) {
        return { pathname: '/comunidade', query: { postId: communityComment.post_id } };
      }
      const { data: eventComment } = await supabase.from('event_comments')
        .select('event_id').eq('id', id).maybeSingle();
      if (eventComment?.event_id) return { pathname: '/eventos', query: { eventId: eventComment.event_id } };
    }
    if (type.includes('business')) {
      return { pathname: '/guardados', query: { business: id } };
    }
    return null;
  }

  async function openNotification(item) {
    await markOneRead(item);
    const destination = await destinationFor(item);
    if (destination) router.push(destination);
    else if (item.type === 'general') router.push('/notificacoes');
  }

  async function deleteNotification(item) {
    if (!user || deleting) return;
    setDeleting(item.id);
    const previous = items;
    setItems(current => current.filter(row => row.id !== item.id));
    const { error: deleteError } = await supabase.from('notifications')
      .delete().eq('id', item.id).eq('user_id', user.id);
    if (deleteError) {
      setItems(previous);
      setError('Não foi possível apagar a notificação. ' + deleteError.message);
    }
    setDeleting('');
  }

  function handleTouchStart(event, id) {
    touchStart.current[id] = event.touches[0]?.clientX || 0;
  }
  function handleTouchEnd(event, item) {
    const start = touchStart.current[item.id];
    const end = event.changedTouches[0]?.clientX || start;
    if (typeof start === 'number' && start - end > 55) setSwipeOpenId(item.id);
    if (typeof start === 'number' && end - start > 35) setSwipeOpenId('');
    delete touchStart.current[item.id];
  }

  return (
    <main style={S.page}>
      <Head><title>Notificações | Talaza</title></Head>
      <header style={S.header}>
        <button type="button" onClick={() => router.back()} style={S.back} aria-label="Voltar">‹</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.brand}>TALAZA</div>
          <div style={S.headingRow}>
            <h1 style={S.heading}>Notificações</h1>
            <div style={S.headerActions}>
              <span style={S.counter}>{unreadCount} por ler</span>
              {unreadCount > 0 && <button type="button" onClick={markAllRead} style={S.markAll}>Marcar todas como lidas</button>}
            </div>
          </div>
          <p style={S.subheading}>Acompanha novidades, comentários e reações na tua atividade Talaza.</p>
        </div>
        <TalazaMenu />
      </header>
      <section style={S.content}>
        {error && <div role="alert" style={S.error}>{error}</div>}
        {loading ? <div style={S.loading}>A carregar notificações…</div> :
          items.length === 0 ? (
            <div style={S.empty}>
              <div style={S.emptyIcon}>🔔</div>
              <h2>Ainda não tens notificações</h2>
              <p>Quando houver novidades, vais ver aqui.</p>
            </div>
          ) : groups.map(group => (
            <section key={group.label} style={S.group}>
              <h2 style={S.groupTitle}>{group.label}</h2>
              <div style={S.list}>
                {group.items.map(item => {
                  const visual = notificationStyle(item.type);
                  return (
                    <div key={item.id} style={{ ...S.row, ...(item.is_read ? {} : S.unread), ...(swipeOpenId === item.id ? S.rowRevealed : {}) }}
                      onTouchStart={event => handleTouchStart(event, item.id)}
                      onTouchEnd={event => handleTouchEnd(event, item)}>
                      <button type="button" onClick={() => openNotification(item)} style={S.rowButton}>
                        <span style={{ ...S.icon, background: visual.color }}>{visual.icon}</span>
                        <span style={S.copy}>
                          <span style={S.title}>{item.title || 'Notificação Talaza'}</span>
                          <span style={S.description}>{item.content || 'Há uma nova atividade na Talaza.'}</span>
                          <span style={S.category}>{visual.label}</span>
                        </span>
                        <span style={S.right}>
                          <time style={S.time}>{relativeTime(item.created_at)}</time>
                          {!item.is_read && <span style={S.unreadDot} aria-label="Não lida" />}
                        </span>
                      </button>
                      {swipeOpenId === item.id && <button type="button" onClick={() => { deleteNotification(item); setSwipeOpenId(''); }} style={S.delete} aria-label="Apagar notificação">Apagar</button>}
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        }
      </section>
    </main>
  );
}

const S = {
  page: { minHeight: '100vh', background: C.bg, color: C.ink, fontFamily: 'Arial, Helvetica, sans-serif' },
  header: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px max(14px, calc((100vw - 900px) / 2))', background: C.green, color: C.white },
  back: { flex: 'none', border: '1px solid rgba(255,255,255,.25)', borderRadius: 10, background: 'transparent', color: C.white, width: 36, height: 36, fontSize: 25, cursor: 'pointer' },
  brand: { color: C.gold, fontSize: 11, fontWeight: 900, letterSpacing: 2 },
  headingRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  heading: { margin: '4px 0 0', fontSize: 25, lineHeight: 1.15, color: C.white },
  headerActions: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 7, flexWrap: 'wrap' },
  counter: { padding: '5px 8px', borderRadius: 999, background: 'rgba(255,255,255,.15)', color: C.white, fontSize: 11, whiteSpace: 'nowrap' },
  markAll: { border: '1px solid rgba(255,255,255,.35)', borderRadius: 9, padding: '7px 9px', background: 'rgba(255,255,255,.16)', color: C.white, fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  subheading: { margin: '5px 0 0', color: 'rgba(255,255,255,.78)', fontSize: 12, lineHeight: 1.4 },
  content: { width: '100%', maxWidth: 900, boxSizing: 'border-box', margin: '0 auto', padding: '10px 14px 24px' },
  group: { marginTop: 13 },
  groupTitle: { margin: '17px 4px 7px', fontSize: 11, letterSpacing: '.07em', color: C.muted, fontWeight: 800 },
  list: { overflow: 'hidden', background: C.white, border: '1px solid ' + C.line, borderRadius: 20 },
  row: { position: 'relative', display: 'flex', alignItems: 'stretch', background: C.white, borderBottom: '1px solid ' + C.line, transition: 'background .15s ease', overflow: 'hidden' },
  unread: { background: C.unread },
  rowButton: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: 0, textAlign: 'left', background: 'transparent', cursor: 'pointer' },
  icon: { width: 44, height: 44, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: '50%', color: C.white, fontSize: 20 },
  copy: { minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 3 },
  title: { color: C.ink, fontSize: 15, lineHeight: 1.25, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  description: { color: C.muted, fontSize: 13, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' },
  category: { color: C.muted, fontSize: 11, lineHeight: 1.2 },
  right: { flex: 'none', minWidth: 42, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch', gap: 8 },
  time: { color: C.muted, fontSize: 11, whiteSpace: 'nowrap' },
  unreadDot: { width: 8, height: 8, borderRadius: '50%', background: C.gold },
  rowRevealed: { background: '#FFF9E6' },
  delete: { flex: 'none', width: 76, border: 0, background: '#B42318', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' },
  loading: { background: C.white, borderRadius: 20, padding: 20, color: C.muted, textAlign: 'center' },
  empty: { marginTop: 10, padding: '36px 20px', borderRadius: 20, background: C.white, textAlign: 'center', color: C.muted },
  emptyIcon: { fontSize: 42, filter: 'grayscale(1)', marginBottom: 10 },
  error: { padding: 12, marginTop: 8, borderRadius: 12, background: '#FCEBED', color: '#B93845', fontSize: 13, lineHeight: 1.5 },
};
