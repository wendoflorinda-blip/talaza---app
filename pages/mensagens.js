import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Mensagens() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadMessages = useCallback(async (userId) => {
    if (!userId) return;

    const { data, error: queryError } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true });

    if (queryError) {
      setError(`Não foi possível carregar as mensagens: ${queryError.message}`);
      return;
    }

    setMessages(data || []);
  }, []);

  const loadNotifications = useCallback(async (userId) => {
    if (!userId) return;

    const { data, error: queryError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (!queryError) {
      setNotifications(data || []);
    }
  }, []);

  const refresh = useCallback(async (userId) => {
    if (!userId) return;

    setLoading(true);
    setError('');

    await Promise.all([
      loadMessages(userId),
      loadNotifications(userId),
    ]);

    setLoading(false);
  }, [loadMessages, loadNotifications]);

  useEffect(() => {
    let alive = true;

    async function initialise() {
      const { data } = await supabase.auth.getSession();

      if (!alive) return;

      setUser(data?.session?.user || null);
      setAuthChecked(true);
    }

    initialise();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (alive) {
          setUser(session?.user || null);
          setAuthChecked(true);
        }
      }
    );

    return () => {
      alive = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setMessages([]);
      setNotifications([]);
      return;
    }

    refresh(user.id);

    const channel = supabase
      .channel(`mensagens-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          refresh(user.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`,
        },
        () => {
          refresh(user.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadNotifications(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh, loadNotifications]);

  useEffect(() => {
    if (!router.isReady || !router.query.receiver_id) return;

    const id = String(router.query.receiver_id);
    setReceiverId(id);
    setSelectedId(id);
  }, [router.isReady, router.query.receiver_id]);

  const conversations = useMemo(() => {
    if (!user) return [];

    const groups = new Map();

    for (const message of messages) {
      const otherId =
        message.sender_id === user.id
          ? message.receiver_id
          : message.sender_id;

      if (!otherId) continue;

      const previous = groups.get(otherId);

      if (!previous || new Date(message.created_at) >
          new Date(previous.lastMessage.created_at)) {
        groups.set(otherId, {
          otherId,
          lastMessage: message,
        });
      }
    }

    return Array.from(groups.values()).sort(
      (a, b) =>
        new Date(b.lastMessage.created_at) -
        new Date(a.lastMessage.created_at)
    );
  }, [messages, user]);

  const unreadCount = useMemo(() => {
    if (!user) return 0;

    return messages.filter(
      (message) =>
        message.receiver_id === user.id &&
        message.is_read === false
    ).length;
  }, [messages, user]);

  const visibleMessages = useMemo(() => {
    if (!user || !selectedId) return [];

    return messages.filter(
      (message) =>
        (message.sender_id === user.id &&
          message.receiver_id === selectedId) ||
        (message.sender_id === selectedId &&
          message.receiver_id === user.id)
    );
  }, [messages, selectedId, user]);

  useEffect(() => {
    if (!user || !selectedId) return;

    const unreadIds = visibleMessages
      .filter(
        (message) =>
          message.receiver_id === user.id &&
          message.is_read === false
      )
      .map((message) => message.id);

    if (unreadIds.length === 0) return;

    async function markRead() {
      const { error: updateError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', unreadIds)
        .eq('receiver_id', user.id);

      if (!updateError) {
        setMessages((current) =>
          current.map((message) =>
            unreadIds.includes(message.id)
              ? { ...message, is_read: true }
              : message
          )
        );
      }
    }

    markRead();
  }, [user, selectedId, visibleMessages]);

  async function sendMessage(event) {
    event.preventDefault();
    setError('');

    const targetId = selectedId || receiverId;

    if (!user) {
      setError('Inicia sessão para enviar mensagens.');
      return;
    }

    if (!targetId) {
      setError('Seleciona uma conversa ou introduz o ID do destinatário.');
      return;
    }

    if (targetId === user.id) {
      setError('Não podes enviar uma mensagem para a tua própria conta.');
      return;
    }

    if (!draft.trim()) {
      setError('Escreve uma mensagem antes de enviar.');
      return;
    }

    setSending(true);

    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: targetId,
        message_type: 'text',
        content: draft.trim(),
        is_read: false,
      });

    setSending(false);

    if (insertError) {
      setError(`Não foi possível enviar: ${insertError.message}`);
      return;
    }

    setSelectedId(targetId);
    setReceiverId(targetId);
    setDraft('');

    await refresh(user.id);
  }

  async function markNotificationRead(id) {
    if (!user) return;

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user.id);

    if (!updateError) {
      setNotifications((current) =>
        current.filter((item) => item.id !== id)
      );
    }
  }

  if (!authChecked) {
    return <main style={styles.page}>A preparar as mensagens...</main>;
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.heading}>Mensagens</h1>
          <p style={styles.muted}>
            Acompanha as tuas conversas no Talaza.
          </p>
        </div>

        <div style={styles.counter} aria-label={`${unreadCount} mensagens não lidas`}>
          {unreadCount}
        </div>
      </header>

      {error && <p style={styles.error}>{error}</p>}

      {!user ? (
        <section style={styles.card}>
          <h2>As tuas mensagens</h2>
          <p>Inicia sessão para consultar conversas e enviar mensagens.</p>
          <button
            style={styles.button}
            onClick={() =>
              router.push(
                `/login?next=${encodeURIComponent('/mensagens')}`
              )
            }
          >
            Iniciar sessão
          </button>
        </section>
      ) : (
        <div style={styles.layout}>
          <section style={styles.sidebar}>
            <h2 style={styles.subheading}>Conversas</h2>

            {conversations.length === 0 && (
              <p style={styles.muted}>
                Ainda não tens conversas. Quando alguém te escrever,
                a conversa aparecerá aqui.
              </p>
            )}

            {conversations.map((conversation) => {
              const id = conversation.otherId;
              const unread = messages.filter(
                (message) =>
                  message.sender_id === id &&
                  message.receiver_id === user.id &&
                  !message.is_read
              ).length;

              return (
                <button
                  key={id}
                  style={{
                    ...styles.conversation,
                    ...(selectedId === id ? styles.selected : {}),
                  }}
                  onClick={() => {
                    setSelectedId(id);
                    setReceiverId(id);
                  }}
                >
                  <strong>Conta {id.slice(0, 8)}</strong>
                  <span style={styles.preview}>
                    {conversation.lastMessage.content || 'Mensagem'}
                  </span>
                  {unread > 0 && (
                    <span style={styles.badge}>{unread}</span>
                  )}
                </button>
              );
            })}
          </section>

          <section style={styles.chat}>
            <div style={styles.chatHeader}>
              <h2 style={styles.subheading}>
                {selectedId
                  ? `Conversa com ${selectedId.slice(0, 8)}`
                  : 'Nova conversa'}
              </h2>
              <button
                style={styles.secondaryButton}
                onClick={() => refresh(user.id)}
                disabled={loading}
              >
                {loading ? 'A atualizar...' : 'Atualizar'}
              </button>
            </div>

            {!selectedId && (
              <div style={styles.receiverBox}>
                <label htmlFor="receiver-id" style={styles.label}>
                  ID do destinatário
                </label>
                <input
                  id="receiver-id"
                  value={receiverId}
                  onChange={(e) => setReceiverId(e.target.value.trim())}
                  placeholder="ID da conta que receberá a mensagem"
                  style={styles.input}
                />
                <p style={styles.muted}>
                  Este campo usa o ID da conta. Para mostrar nomes e fotos
                  dos contactos, será necessário ligar as conversas aos
                  dados de perfil existentes no projeto.
                </p>
              </div>
            )}

            <div style={styles.messageList}>
              {selectedId && visibleMessages.length === 0 && (
                <p style={styles.muted}>
                  Ainda não existem mensagens nesta conversa. Envia a primeira.
                </p>
              )}

              {visibleMessages.map((message) => {
                const mine = message.sender_id === user.id;

                return (
                  <div
                    key={message.id}
                    style={{
                      ...styles.message,
                      ...(mine ? styles.mine : styles.theirs),
                    }}
                  >
                    <div>{message.content || 'Conteúdo não textual'}</div>
                    <small style={styles.messageTime}>
                      {message.created_at
                        ? new Date(message.created_at).toLocaleString()
                        : ''}
                    </small>
                  </div>
                );
              })}
            </div>

            <form onSubmit={sendMessage} style={styles.composer}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Escreve a tua mensagem..."
                rows={2}
                style={styles.textarea}
              />
              <button
                type="submit"
                style={styles.button}
                disabled={sending}
              >
                {sending ? 'A enviar...' : 'Enviar'}
              </button>
            </form>
          </section>
        </div>
      )}

      {user && (
        <section style={styles.card}>
          <h2 style={styles.subheading}>Notificações</h2>

          {notifications.length === 0 ? (
            <p style={styles.muted}>Não tens notificações novas.</p>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} style={styles.notification}>
                <div>
                  <strong>{notification.title || 'Notificação'}</strong>
                  <p style={styles.muted}>
                    {notification.content || ''}
                  </p>
                </div>
                <button
                  style={styles.secondaryButton}
                  onClick={() => markNotificationRead(notification.id)}
                >
                  Marcar como lida
                </button>
              </div>
            ))
          )}
        </section>
      )}
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#F8F6F3',
    color: '#17211F',
    padding: '24px 16px 100px',
  },
  header: {
    maxWidth: 1100,
    margin: '0 auto 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heading: { color: '#083F35', margin: '0 0 6px' },
  muted: { color: '#596560', fontSize: 14, lineHeight: 1.5 },
  counter: {
    minWidth: 38,
    height: 38,
    borderRadius: 20,
    display: 'grid',
    placeItems: 'center',
    background: '#7252B8',
    color: '#FFFFFF',
    fontWeight: 800,
  },
  layout: {
    maxWidth: 1100,
    margin: '0 auto 20px',
    display: 'grid',
    gridTemplateColumns: 'minmax(220px, 0.75fr) minmax(0, 1.5fr)',
    gap: 16,
  },
  card: {
    maxWidth: 1100,
    margin: '0 auto 20px',
    padding: 20,
    background: '#FFFFFF',
    border: '1px solid #E5E9E7',
    borderRadius: 16,
  },
  sidebar: {
    padding: 16,
    background: '#FFFFFF',
    border: '1px solid #E5E9E7',
    borderRadius: 16,
    minWidth: 0,
  },
  chat: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 460,
    padding: 16,
    background: '#FFFFFF',
    border: '1px solid #E5E9E7',
    borderRadius: 16,
  },
  subheading: { margin: '0 0 12px', fontSize: 18, color: '#083F35' },
  conversation: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    width: '100%',
    textAlign: 'left',
    border: '1px solid #E5E9E7',
    borderRadius: 10,
    background: '#FFFFFF',
    padding: 12,
    marginBottom: 8,
    cursor: 'pointer',
    color: '#17211F',
  },
  selected: { borderColor: '#0F6E5C', background: '#E8F3F0' },
  preview: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: '#596560',
    fontSize: 13,
  },
  badge: {
    position: 'absolute',
    right: 10,
    top: 10,
    background: '#B93845',
    color: '#FFFFFF',
    borderRadius: 20,
    padding: '2px 7px',
    fontSize: 12,
  },
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  receiverBox: { margin: '12px 0' },
  label: { display: 'block', fontWeight: 600, marginBottom: 6 },
  input: {
    boxSizing: 'border-box',
    width: '100%',
    padding: 12,
    border: '1px solid #D5DEDA',
    borderRadius: 9,
  },
  messageList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    flex: 1,
    overflowY: 'auto',
    padding: '16px 0',
    minHeight: 220,
  },
  message: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 12,
    overflowWrap: 'anywhere',
  },
  mine: { alignSelf: 'flex-end', background: '#E8F3F0' },
  theirs: { alignSelf: 'flex-start', background: '#F1ECFA' },
  messageTime: {
    display: 'block',
    marginTop: 6,
    color: '#596560',
    fontSize: 11,
  },
  composer: { display: 'flex', gap: 8, alignItems: 'stretch' },
  textarea: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    border: '1px solid #D5DEDA',
    borderRadius: 9,
    font: 'inherit',
    resize: 'vertical',
  },
  button: {
    padding: '12px 16px',
    border: 0,
    borderRadius: 9,
    background: '#0F6E5C',
    color: '#FFFFFF',
    fontWeight: 700,
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '8px 12px',
    border: '1px solid #D5DEDA',
    borderRadius: 8,
    background: '#FFFFFF',
    color: '#17211F',
    cursor: 'pointer',
  },
  error: {
    maxWidth: 1100,
    margin: '0 auto 16px',
    padding: 12,
    borderRadius: 8,
    background: '#FBEAEC',
    color: '#B93845',
  },
  notification: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 0',
    borderTop: '1px solid #E5E9E7',
  },
};
