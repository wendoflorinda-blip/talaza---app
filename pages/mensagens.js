
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const COLORS = {
  green: '#0F6E5C',
  darkGreen: '#083F35',
  deepGreen: '#062F29',
  greenSoft: '#E8F3F0',
  purple: '#7252B8',
  purpleSoft: '#F1ECFA',
  ink: '#17211F',
  muted: '#596560',
  canvas: '#F8F6F3',
  white: '#FFFFFF',
  line: '#E5E9E7',
  red: '#B93845',
};

const panelStyle = {
  background: COLORS.white,
  border: `1px solid ${COLORS.line}`,
  borderRadius: 16,
  boxShadow: '0 4px 18px rgba(23,33,31,0.04)',
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 13px',
  border: `1px solid ${COLORS.line}`,
  borderRadius: 10,
  background: COLORS.white,
  color: COLORS.ink,
  fontSize: 15,
};

function firstParam(value) {
  return Array.isArray(value) ? value[0] : value;
}

function shortId(id) {
  if (!id) return 'Utilizador';
  return `Utilizador ${String(id).slice(0, 8)}`;
}

function dateLabel(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Mensagens() {
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('mensagens');
  const [selectedUser, setSelectedUser] = useState('');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const userId = session?.user?.id || '';

  const conversations = useMemo(() => {
    if (!userId) return [];

    const grouped = new Map();

    for (const message of messages) {
      const otherUser =
        message.sender_id === userId
          ? message.receiver_id
          : message.sender_id;

      if (!otherUser || otherUser === userId) continue;

      const existing = grouped.get(otherUser) || {
        userId: otherUser,
        messages: [],
        unread: 0,
        lastMessage: null,
      };

      existing.messages.push(message);

      if (
        message.receiver_id === userId &&
        message.sender_id === otherUser &&
        !message.is_read
      ) {
        existing.unread += 1;
      }

      if (
        !existing.lastMessage ||
        new Date(message.created_at || 0) >
          new Date(existing.lastMessage.created_at || 0)
      ) {
        existing.lastMessage = message;
      }

      grouped.set(otherUser, existing);
    }

    return Array.from(grouped.values()).sort((a, b) => {
      const aTime = new Date(a.lastMessage?.created_at || 0).getTime();
      const bTime = new Date(b.lastMessage?.created_at || 0).getTime();
      return bTime - aTime;
    });
  }, [messages, userId]);

  const currentConversation = useMemo(() => {
    if (!selectedUser) return [];

    return messages
      .filter((message) => (
        (message.sender_id === userId &&
          message.receiver_id === selectedUser) ||
        (message.sender_id === selectedUser &&
          message.receiver_id === userId)
      ))
      .sort((a, b) => (
        new Date(a.created_at || 0) - new Date(b.created_at || 0)
      ));
  }, [messages, selectedUser, userId]);

  const loadMessages = useCallback(async (currentUserId) => {
    if (!currentUserId) {
      setMessages([]);
      return;
    }

    const { data, error: queryError } = await supabase
      .from('messages')
      .select('*')
      .or(
        `sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`
      )
      .order('created_at', { ascending: true });

    if (queryError) {
      console.error('Erro ao carregar mensagens:', queryError);
      throw new Error(
        `Não foi possível carregar as mensagens: ${queryError.message}`
      );
    }

    setMessages(data || []);
  }, []);

  const loadNotifications = useCallback(async (currentUserId) => {
    if (!currentUserId) {
      setNotifications([]);
      return;
    }

    const { data, error: queryError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false });

    if (queryError) {
      console.error('Erro ao carregar notificações:', queryError);
      throw new Error(
        `Não foi possível carregar as notificações: ${queryError.message}`
      );
    }

    setNotifications(data || []);
  }, []);

  const refreshData = useCallback(async (currentUserId) => {
    if (!currentUserId) return;

    setError('');

    try {
      await Promise.all([
        loadMessages(currentUserId),
        loadNotifications(currentUserId),
      ]);
    } catch (err) {
      setError(
        err?.message ||
        'Não foi possível atualizar as mensagens.'
      );
    }
  }, [loadMessages, loadNotifications]);

  useEffect(() => {
    let active = true;
    let messageChannel;
    let notificationChannel;
    let authSubscription;

    async function initialize() {
      setLoading(true);
      setError('');

      try {
        const { data, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(
            `Não foi possível verificar a sessão: ${sessionError.message}`
          );
        }

        if (!active) return;

        const currentSession = data?.session || null;

        setSession(currentSession);
        setAuthChecked(true);

        if (!currentSession?.user?.id) {
          setMessages([]);
          setNotifications([]);
          setLoading(false);
          return;
        }

        const currentUserId = currentSession.user.id;

        await Promise.all([
          loadMessages(currentUserId),
          loadNotifications(currentUserId),
        ]);

        if (!active) return;

        messageChannel = supabase
          .channel(`talaza-messages-${currentUserId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'messages',
              filter: `sender_id=eq.${currentUserId}`,
            },
            () => {
              if (active) loadMessages(currentUserId).catch(console.error);
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'messages',
              filter: `receiver_id=eq.${currentUserId}`,
            },
            () => {
              if (active) loadMessages(currentUserId).catch(console.error);
            }
          )
          .subscribe();

        notificationChannel = supabase
          .channel(`talaza-notifications-${currentUserId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${currentUserId}`,
            },
            () => {
              if (active) {
                loadNotifications(currentUserId).catch(console.error);
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.error('Erro ao iniciar mensagens:', err);

        if (active) {
          setError(
            err?.message ||
            'Não foi possível iniciar a área de mensagens.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();

    const { data: authData } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!active) return;

        setSession(nextSession || null);
        setAuthChecked(true);

        if (!nextSession?.user?.id) {
          setMessages([]);
          setNotifications([]);
          setSelectedUser('');
          return;
        }

        // Não fazer consultas Supabase dentro do callback de autenticação.
        // O carregamento é feito por initialize e pelo botão Atualizar.
      }
    );

    authSubscription = authData?.subscription;

    return () => {
      active = false;
      authSubscription?.unsubscribe();

      if (messageChannel) {
        supabase.removeChannel(messageChannel);
      }

      if (notificationChannel) {
        supabase.removeChannel(notificationChannel);
      }
    };
  }, [loadMessages, loadNotifications]);

  useEffect(() => {
    if (!router.isReady) return;

    const receiverId = firstParam(router.query.receiver_id);

    if (receiverId && receiverId !== userId) {
      setSelectedUser(receiverId);
      setActiveTab('mensagens');
    }
  }, [router.isReady, router.query.receiver_id, userId]);

  useEffect(() => {
    if (!selectedUser || !userId) return;

    const unreadIds = currentConversation
      .filter((message) => (
        message.receiver_id === userId &&
        message.sender_id === selectedUser &&
        !message.is_read
      ))
      .map((message) => message.id);

    if (unreadIds.length === 0) return;

    let cancelled = false;

    async function markRead() {
      const { error: updateError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', unreadIds)
        .eq('receiver_id', userId);

      if (cancelled) return;

      if (updateError) {
        console.error('Não foi possível marcar mensagens como lidas:', updateError);
        return;
      }

      setMessages((current) =>
        current.map((message) =>
          unreadIds.includes(message.id)
            ? { ...message, is_read: true }
            : message
        )
      );
    }

    markRead();

    return () => {
      cancelled = true;
    };
  }, [selectedUser, userId, currentConversation]);

  async function sendMessage(event) {
    event.preventDefault();

    setError('');
    setNotice('');

    if (!userId) {
      setError('Inicia sessão na tua conta Talaza para enviar mensagens.');
      return;
    }

    if (!selectedUser) {
      setError('Seleciona uma conversa antes de enviar uma mensagem.');
      return;
    }

    if (selectedUser === userId) {
      setError('Não podes enviar uma mensagem para a tua própria conta.');
      return;
    }

    const content = draft.trim();

    if (!content) {
      setError('Escreve uma mensagem antes de enviar.');
      return;
    }

    setSending(true);

    try {
      const { data, error: insertError } = await supabase
        .from('messages')
        .insert({
          sender_id: userId,
          receiver_id: selectedUser,
          message_type: 'text',
          content,
          is_read: false,
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      setMessages((current) => {
        if (current.some((item) => item.id === data.id)) return current;
        return [...current, data];
      });

      setDraft('');
      setNotice('Mensagem enviada.');
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);

      setError(
        err?.message ||
        'Não foi possível enviar a mensagem. Confirma as políticas RLS.'
      );
    } finally {
      setSending(false);
    }
  }

  async function markNotificationRead(notification) {
    if (!userId || notification.is_read) return;

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notification.id)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Erro ao marcar notificação:', updateError);
      setError('Não foi possível marcar a notificação como lida.');
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? { ...item, is_read: true }
          : item
      )
    );
  }

  async function markAllNotificationsRead() {
    if (!userId) return;

    const unread = notifications.filter((item) => !item.is_read);

    if (unread.length === 0) {
      setNotice('Não há notificações por ler.');
      return;
    }

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (updateError) {
      console.error('Erro ao atualizar notificações:', updateError);
      setError('Não foi possível marcar todas as notificações como lidas.');
      return;
    }

    setNotifications((current) =>
      current.map((item) => ({ ...item, is_read: true }))
    );

    setNotice('Todas as notificações foram marcadas como lidas.');
  }

  async function openNotification(notification) {
    await markNotificationRead(notification);

    const type = String(notification.type || '').toLowerCase();

    if (type.includes('event')) {
      router.push('/eventos');
      return;
    }

    if (type.includes('message')) {
      setActiveTab('mensagens');
      return;
    }

    if (type.includes('community') || type.includes('comunidade')) {
      const postId = notification.reference_id;

      router.push(
        postId
          ? `/comunidade?post=${encodeURIComponent(postId)}`
          : '/comunidade'
      );
      return;
    }

    if (notification.reference_id) {
      setNotice(
        'Notificação aberta. O destino específico depende do tipo de referência.'
      );
    }
  }

  const unreadMessages = messages.filter(
    (message) => message.receiver_id === userId && !message.is_read
  ).length;

  const unreadNotifications = notifications.filter(
    (item) => !item.is_read
  ).length;

  if (!authChecked || loading) {
    return (
      <main style={{
        minHeight: '100vh',
        background: COLORS.canvas,
        color: COLORS.ink,
        padding: 24,
        fontFamily: 'Arial, sans-serif',
      }}>
        <div style={{
          ...panelStyle,
          maxWidth: 720,
          margin: '30px auto',
          padding: 24,
        }}>
          <h1 style={{ color: COLORS.darkGreen }}>Mensagens Talaza</h1>
          <p style={{ color: COLORS.muted }}>
            A verificar a sessão e a carregar as mensagens…
          </p>
        </div>
      </main>
    );
  }

  if (!userId) {
    return (
      <main style={{
        minHeight: '100vh',
        background: COLORS.canvas,
        color: COLORS.ink,
        padding: 24,
        fontFamily: 'Arial, sans-serif',
      }}>
        <div style={{
          ...panelStyle,
          maxWidth: 600,
          margin: '30px auto',
          padding: 24,
        }}>
          <div style={{
            display: 'inline-block',
            padding: '6px 10px',
            background: COLORS.purpleSoft,
            color: COLORS.purple,
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
          }}>
            TALAZA
          </div>

          <h1 style={{ color: COLORS.darkGreen }}>
            Inicia sessão para aceder às mensagens
          </h1>

          <p style={{ color: COLORS.muted, lineHeight: 1.6 }}>
            Não existe uma sessão autenticada neste navegador. Inicia sessão
            na tua conta Talaza e abre novamente esta página.
          </p>

          {error && (
            <p role="alert" style={{ color: COLORS.red }}>{error}</p>
          )}

          <button
            type="button"
            onClick={() => router.push('/')}
            style={{
              border: 'none',
              borderRadius: 10,
              background: COLORS.green,
              color: COLORS.white,
              padding: '12px 16px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Voltar ao Talaza
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: COLORS.canvas,
      color: COLORS.ink,
      padding: '24px 14px 40px',
      fontFamily: 'Arial, sans-serif',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{
          ...panelStyle,
          background: COLORS.deepGreen,
          color: COLORS.white,
          padding: 24,
          marginBottom: 18,
          border: 'none',
        }}>
          <div style={{
            color: '#BDE3D9',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.5,
          }}>
            TALAZA · COMUNICAÇÃO
          </div>

          <h1 style={{
            fontSize: 'clamp(27px, 5vw, 38px)',
            margin: '10px 0 8px',
          }}>
            Mensagens
          </h1>

          <p style={{
            color: '#E1ECE8',
            lineHeight: 1.5,
            margin: 0,
          }}>
            Conversas e notificações da tua conta, num só lugar.
          </p>
        </header>

        {error && (
          <div role="alert" style={{
            ...panelStyle,
            background: '#FFF0F0',
            color: COLORS.red,
            borderColor: '#F0CACA',
            padding: 14,
            marginBottom: 14,
          }}>
            {error}
          </div>
        )}

        {notice && (
          <div role="status" style={{
            ...panelStyle,
            background: COLORS.greenSoft,
            color: COLORS.darkGreen,
            borderColor: '#C7E4DB',
            padding: 14,
            marginBottom: 14,
          }}>
            {notice}
          </div>
        )}

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 16,
        }}>
          <button
            type="button"
            onClick={() => {
              setActiveTab('mensagens');
              setError('');
              setNotice('');
            }}
            style={{
              border: `1px solid ${activeTab === 'mensagens' ? COLORS.green : COLORS.line}`,
              borderRadius: 12,
              padding: '12px 15px',
              background: activeTab === 'mensagens' ? COLORS.greenSoft : COLORS.white,
              color: activeTab === 'mensagens' ? COLORS.darkGreen : COLORS.ink,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Mensagens ({unreadMessages} por ler)
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('notificacoes');
              setError('');
              setNotice('');
            }}
            style={{
              border: `1px solid ${activeTab === 'notificacoes' ? COLORS.purple : COLORS.line}`,
              borderRadius: 12,
              padding: '12px 15px',
              background: activeTab === 'notificacoes' ? COLORS.purpleSoft : COLORS.white,
              color: activeTab === 'notificacoes' ? COLORS.purple : COLORS.ink,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Notificações ({unreadNotifications} por ler)
          </button>

          <button
            type="button"
            onClick={() => refreshData(userId)}
            style={{
              border: `1px solid ${COLORS.line}`,
              borderRadius: 12,
              padding: '12px 15px',
              background: COLORS.white,
              color: COLORS.ink,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Atualizar
          </button>
        </div>

        {activeTab === 'mensagens' ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            gap: 16,
            alignItems: 'start',
          }}>
            <section style={{ ...panelStyle, padding: 18 }}>
              <h2 style={{ fontSize: 19, marginTop: 0 }}>
                Conversas
              </h2>

              {conversations.length === 0 ? (
                <p style={{
                  color: COLORS.muted,
                  lineHeight: 1.6,
                }}>
                  Ainda não tens conversas. Abre o perfil de um vendedor ou
                  profissional e utiliza a opção de mensagem para iniciar
                  uma conversa.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {conversations.map((conversation) => (
                    <button
                      key={conversation.userId}
                      type="button"
                      onClick={() => {
                        setSelectedUser(conversation.userId);
                        setError('');
                        setNotice('');
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border: `1px solid ${
                          selectedUser === conversation.userId
                            ? COLORS.green
                            : COLORS.line
                        }`,
                        borderRadius: 12,
                        padding: 12,
                        background:
                          selectedUser === conversation.userId
                            ? COLORS.greenSoft
                            : COLORS.white,
                        cursor: 'pointer',
                        color: COLORS.ink,
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                        alignItems: 'center',
                      }}>
                        <strong>{shortId(conversation.userId)}</strong>

                        {conversation.unread > 0 && (
                          <span style={{
                            background: COLORS.purple,
                            color: COLORS.white,
                            borderRadius: 999,
                            padding: '3px 7px',
                            fontSize: 11,
                          }}>
                            {conversation.unread}
                          </span>
                        )}
                      </div>

                      <p style={{
                        color: COLORS.muted,
                        fontSize: 13,
                        lineHeight: 1.45,
                        margin: '8px 0',
                        overflowWrap: 'anywhere',
                      }}>
                        {conversation.lastMessage?.content || 'Mensagem'}
                      </p>

                      <span style={{
                        color: COLORS.muted,
                        fontSize: 11,
                      }}>
                        {dateLabel(conversation.lastMessage?.created_at)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section style={{
              ...panelStyle,
              padding: 18,
              minWidth: 0,
            }}>
              {!selectedUser ? (
                <div style={{
                  minHeight: 220,
                  display: 'grid',
                  placeItems: 'center',
                  textAlign: 'center',
                  color: COLORS.muted,
                  lineHeight: 1.6,
                }}>
                  Seleciona uma conversa para ver as mensagens.
                </div>
              ) : (
                <>
                  <div style={{
                    borderBottom: `1px solid ${COLORS.line}`,
                    paddingBottom: 12,
                    marginBottom: 14,
                  }}>
                    <h2 style={{ fontSize: 18, margin: '0 0 5px' }}>
                      {shortId(selectedUser)}
                    </h2>
                    <span style={{ color: COLORS.muted, fontSize: 12 }}>
                      Conversa privada
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    minHeight: 180,
                    maxHeight: 420,
                    overflowY: 'auto',
                    padding: '4px 2px 16px',
                  }}>
                    {currentConversation.length === 0 ? (
                      <p style={{ color: COLORS.muted }}>
                        Ainda não há mensagens nesta conversa.
                      </p>
                    ) : (
                      currentConversation.map((message) => {
                        const mine = message.sender_id === userId;

                        return (
                          <div
                            key={message.id}
                            style={{
                              display: 'flex',
                              justifyContent: mine ? 'flex-end' : 'flex-start',
                            }}
                          >
                            <div style={{
                              maxWidth: '85%',
                              borderRadius: mine
                                ? '14px 14px 4px 14px'
                                : '14px 14px 14px 4px',
                              padding: '11px 13px',
                              background: mine ? COLORS.green : COLORS.purpleSoft,
                              color: mine ? COLORS.white : COLORS.ink,
                              overflowWrap: 'anywhere',
                              whiteSpace: 'pre-wrap',
                            }}>
                              {message.content || (
                                <span style={{ fontStyle: 'italic' }}>
                                  Mensagem sem texto
                                </span>
                              )}

                              <div style={{
                                marginTop: 7,
                                fontSize: 10,
                                opacity: 0.8,
                                textAlign: 'right',
                              }}>
                                {dateLabel(message.created_at)}
                                {mine && message.is_read ? ' · Lida' : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={sendMessage} style={{
                    display: 'grid',
                    gap: 10,
                    borderTop: `1px solid ${COLORS.line}`,
                    paddingTop: 14,
                  }}>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={3}
                      maxLength={5000}
                      placeholder="Escreve a tua mensagem…"
                      style={{
                        ...inputStyle,
                        resize: 'vertical',
                        lineHeight: 1.5,
                      }}
                    />

                    <button
                      type="submit"
                      disabled={sending || !draft.trim()}
                      style={{
                        border: 'none',
                        borderRadius: 10,
                        background: sending ? '#89948F' : COLORS.green,
                        color: COLORS.white,
                        padding: 13,
                        fontWeight: 700,
                        cursor: sending ? 'wait' : 'pointer',
                      }}
                    >
                      {sending ? 'A enviar…' : 'Enviar mensagem'}
                    </button>
                  </form>
                </>
              )}
            </section>
          </div>
        ) : (
          <section style={{ ...panelStyle, padding: 18 }}>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 16,
            }}>
              <h2 style={{ fontSize: 19, margin: 0 }}>
                As tuas notificações
              </h2>

              <button
                type="button"
                onClick={markAllNotificationsRead}
                style={{
                  border: `1px solid ${COLORS.purple}`,
                  borderRadius: 10,
                  background: COLORS.purpleSoft,
                  color: COLORS.purple,
                  padding: '10px 12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Marcar todas como lidas
              </button>
            </div>

            {notifications.length === 0 ? (
              <p style={{ color: COLORS.muted, lineHeight: 1.6 }}>
                Ainda não tens notificações.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => openNotification(notification)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      border: `1px solid ${
                        notification.is_read ? COLORS.line : '#D8C9F4'
                      }`,
                      borderRadius: 12,
                      padding: 15,
                      background: notification.is_read
                        ? COLORS.white
                        : COLORS.purpleSoft,
                      color: COLORS.ink,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 10,
                      alignItems: 'start',
                    }}>
                      <strong>
                        {notification.title || 'Notificação Talaza'}
                      </strong>

                      {!notification.is_read && (
                        <span style={{
                          color: COLORS.purple,
                          fontSize: 11,
                          fontWeight: 700,
                        }}>
                          NOVA
                        </span>
                      )}
                    </div>

                    {notification.content && (
                      <p style={{
                        color: COLORS.muted,
                        lineHeight: 1.5,
                        margin: '8px 0',
                        overflowWrap: 'anywhere',
                      }}>
                        {notification.content}
                      </p>
                    )}

                    <span style={{
                      color: COLORS.muted,
                      fontSize: 11,
                    }}>
                      {dateLabel(notification.created_at)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
