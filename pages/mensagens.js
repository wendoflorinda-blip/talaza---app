
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const COLORS = {
  brand: '#0F6E5C',
  dark: '#083F35',
  purple: '#7252B8',
  ink: '#17211F',
  muted: '#596560',
  canvas: '#F8F6F3',
  white: '#FFFFFF',
  line: '#E5E9E7',
  softGreen: '#E8F3F0',
  softPurple: '#F1ECFA',
  red: '#B93845',
};

function formatDate(value) {
  if (!value) return '';

  return new Date(value).toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Mensagens() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [receiverId, setReceiverId] = useState('');
  const [draft, setDraft] = useState('');
  const [messageType, setMessageType] = useState('text');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('messages');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const unreadMessages = useMemo(
    () =>
      messages.filter(
        (message) =>
          message.receiver_id === user?.id && message.is_read !== true
      ).length,
    [messages, user]
  );

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const loadMessages = useCallback(async (userId) => {
    if (!userId) return;

    const { data, error: queryError } = await supabase
      .from('messages')
      .select(
        'id, created_at, sender_id, receiver_id, business_id, message_type, content, media_url, media_name, is_read, professional_profile_id'
      )
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true });

    if (queryError) throw queryError;

    setMessages(data || []);
  }, []);

  const loadNotifications = useCallback(async (userId) => {
    if (!userId) return;

    const { data, error: queryError } = await supabase
      .from('notifications')
      .select('id, created_at, type, title, content, reference_id, is_read')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (queryError) throw queryError;

    setNotifications(data || []);
  }, []);

  const refreshData = useCallback(
    async (userId) => {
      try {
        await Promise.all([
          loadMessages(userId),
          loadNotifications(userId),
        ]);
      } catch (refreshError) {
        setError(
          refreshError.message ||
            'Não foi possível atualizar mensagens e notificações.'
        );
      }
    },
    [loadMessages, loadNotifications]
  );

  useEffect(() => {
    if (!router.isReady) return;

    let active = true;
    let channel;

    async function initialize() {
      setLoading(true);
      setError('');

      try {
        const {
          data: { user: currentUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!currentUser) {
          if (active) {
            setUser(null);
            setError('Inicia sessão para consultar as tuas mensagens.');
          }
          return;
        }

        if (!active) return;

        setUser(currentUser);

        const queryReceiver = router.query.receiver_id;
        if (typeof queryReceiver === 'string') {
          setReceiverId(queryReceiver);
        }

        await refreshData(currentUser.id);

        if (!active) return;

        channel = supabase
          .channel(`talaza-inbox-${currentUser.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'messages',
              filter: `receiver_id=eq.${currentUser.id}`,
            },
            () => refreshData(currentUser.id)
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'messages',
              filter: `sender_id=eq.${currentUser.id}`,
            },
            () => refreshData(currentUser.id)
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${currentUser.id}`,
            },
            () => refreshData(currentUser.id)
          )
          .subscribe();
      } catch (initError) {
        if (active) {
          setError(
            initError.message ||
              'Ocorreu um erro ao abrir as mensagens.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();

    return () => {
      active = false;

      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [router.isReady, router.query.receiver_id, refreshData]);

  async function markMessageRead(message) {
    if (
      !user ||
      message.receiver_id !== user.id ||
      message.is_read
    ) {
      return;
    }

    const { error: updateError } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', message.id)
      .eq('receiver_id', user.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessages((current) =>
      current.map((item) =>
        item.id === message.id ? { ...item, is_read: true } : item
      )
    );
  }

  async function markNotificationRead(notification) {
    if (!user || notification.is_read) return;

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notification.id)
      .eq('user_id', user.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item
      )
    );
  }

  async function markAllNotificationsRead() {
    if (!user || unreadNotifications === 0) return;

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setNotifications((current) =>
      current.map((item) => ({ ...item, is_read: true }))
    );
  }

  async function sendMessage(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!user) {
      setError('Inicia sessão para enviar mensagens.');
      return;
    }

    const target = receiverId.trim();

    if (!target) {
      setError('Indica o ID do destinatário para iniciar a conversa.');
      return;
    }

    if (target === user.id) {
      setError('Não podes enviar uma mensagem para a tua própria conta.');
      return;
    }

    if (!draft.trim()) {
      setError('Escreve uma mensagem antes de enviar.');
      return;
    }

    setSending(true);

    try {
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: target,
          message_type: messageType,
          content: draft.trim(),
          is_read: false,
        });

      if (insertError) throw insertError;

      setDraft('');
      setSuccess('Mensagem enviada.');
      await loadMessages(user.id);
    } catch (sendError) {
      setError(
        sendError.message ||
          'Não foi possível enviar a mensagem.'
      );
    } finally {
      setSending(false);
    }
  }

  function openConversation(otherUserId) {
    if (!otherUserId) return;

    setReceiverId(otherUserId);

    router.replace(
      {
        pathname: '/mensagens',
        query: {
          ...router.query,
          receiver_id: otherUserId,
        },
      },
      undefined,
      { shallow: true }
    );
  }

  function openNotification(notification) {
    markNotificationRead(notification);

    if (!notification.reference_id) return;

    const type = String(notification.type || '').toLowerCase();

    if (type.includes('community')) {
      router.push(`/comunidade?post=${notification.reference_id}`);
    } else if (type.includes('event')) {
      router.push(
        `/eventos?event=${notification.reference_id}&country=${router.query.country || ''}&province=${router.query.province || ''}`
      );
    } else if (type.includes('message')) {
      setActiveTab('messages');
    }
  }

  const currentConversation = messages.filter(
    (message) =>
      receiverId &&
      (
        (message.sender_id === user?.id &&
          message.receiver_id === receiverId) ||
        (message.sender_id === receiverId &&
          message.receiver_id === user?.id)
      )
  );

  return (
    <main className="page">
      <div className="container">
        <header className="header">
          <div>
            <p className="eyebrow">TALAZA · COMUNICAÇÃO</p>
            <h1>Mensagens e notificações</h1>
            <p className="subtitle">
              Acompanha as tuas conversas e as novidades importantes da tua conta.
            </p>
          </div>

          <button
            className="backButton"
            type="button"
            onClick={() => router.back()}
          >
            ← Voltar
          </button>
        </header>

        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="notice success" role="status">
            {success}
          </div>
        )}

        {!loading && !user ? (
          <section className="panel empty">
            <h2>Inicia sessão</h2>
            <p>Entra na tua conta para consultar as tuas mensagens.</p>
            <button
              className="primary"
              onClick={() => router.push('/login')}
              type="button"
            >
              Iniciar sessão
            </button>
          </section>
        ) : loading ? (
          <section className="panel empty">A carregar...</section>
        ) : (
          <>
            <nav className="tabs">
              <button
                className={activeTab === 'messages' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('messages')}
                type="button"
              >
                Mensagens
                {unreadMessages > 0 && (
                  <span className="counter">{unreadMessages}</span>
                )}
              </button>

              <button
                className={activeTab === 'notifications' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('notifications')}
                type="button"
              >
                Notificações
                {unreadNotifications > 0 && (
                  <span className="counter">{unreadNotifications}</span>
                )}
              </button>
            </nav>

            {activeTab === 'messages' ? (
              <section className="messagingGrid">
                <div className="panel conversations">
                  <div className="panelHeading">
                    <h2>Conversas</h2>
                    <p>Seleciona uma pessoa para abrir a conversa.</p>
                  </div>

                  {messages.length === 0 ? (
                    <p className="muted emptyText">
                      Ainda não tens mensagens.
                    </p>
                  ) : (
                    <div className="conversationList">
                      {Array.from(
                        new Set(
                          messages.map((message) =>
                            message.sender_id === user.id
                              ? message.receiver_id
                              : message.sender_id
                          )
                        )
                      ).map((otherId) => {
                        const conversationMessages = messages.filter(
                          (message) =>
                            message.sender_id === otherId ||
                            message.receiver_id === otherId
                        );

                        const last =
                          conversationMessages[conversationMessages.length - 1];

                        const unread = conversationMessages.filter(
                          (message) =>
                            message.sender_id === otherId &&
                            message.receiver_id === user.id &&
                            !message.is_read
                        ).length;

                        return (
                          <button
                            className={
                              receiverId === otherId
                                ? 'conversation activeConversation'
                                : 'conversation'
                            }
                            key={otherId}
                            onClick={() => openConversation(otherId)}
                            type="button"
                          >
                            <span className="avatar">
                              {String(otherId).slice(0, 1).toUpperCase()}
                            </span>

                            <span className="conversationText">
                              <strong>
                                Conta {String(otherId).slice(0, 8)}
                              </strong>
                              <small>
                                {last?.content || 'Anexo ou mensagem'}
                              </small>
                              <small>{formatDate(last?.created_at)}</small>
                            </span>

                            {unread > 0 && (
                              <span className="counter">{unread}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="panel chatPanel">
                  {!receiverId ? (
                    <div className="empty chatEmpty">
                      <span className="bigIcon">✉</span>
                      <h2>As tuas conversas</h2>
                      <p>
                        Seleciona uma conversa ou abre o perfil de um utilizador
                        e escolhe Enviar mensagem.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="chatHeader">
                        <div className="avatar">
                          {receiverId.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <strong>
                            Conta {receiverId.slice(0, 8)}
                          </strong>
                          <p>Conversa privada</p>
                        </div>
                      </div>

                      <div className="chatMessages">
                        {currentConversation.length === 0 ? (
                          <p className="muted emptyText">
                            Envia a primeira mensagem desta conversa.
                          </p>
                        ) : (
                          currentConversation.map((message) => {
                            const own = message.sender_id === user.id;

                            return (
                              <button
                                type="button"
                                key={message.id}
                                className={
                                  own ? 'bubble ownBubble' : 'bubble'
                                }
                                onClick={() => markMessageRead(message)}
                                title={
                                  own
                                    ? 'Mensagem enviada'
                                    : 'Tocar para marcar como lida'
                                }
                              >
                                <span>{message.content || 'Anexo'}</span>
                                {message.media_url && (
                                  <a
                                    href={message.media_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    {message.media_name || 'Abrir anexo'}
                                  </a>
                                )}
                                <small>{formatDate(message.created_at)}</small>
                              </button>
                            );
                          })
                        )}
                      </div>

                      <form className="composer" onSubmit={sendMessage}>
                        <label className="srOnly" htmlFor="messageType">
                          Tipo de mensagem
                        </label>
                        <select
                          id="messageType"
                          value={messageType}
                          onChange={(event) =>
                            setMessageType(event.target.value)
                          }
                        >
                          <option value="text">Texto</option>
                        </select>

                        <label className="srOnly" htmlFor="messageDraft">
                          Escrever mensagem
                        </label>
                        <textarea
                          id="messageDraft"
                          rows={2}
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          placeholder="Escreve uma mensagem..."
                          required
                        />

                        <button
                          className="primary"
                          type="submit"
                          disabled={sending}
                        >
                          {sending ? 'A enviar...' : 'Enviar'}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </section>
            ) : (
              <section className="panel notificationPanel">
                <div className="panelHeading notificationHeading">
                  <div>
                    <h2>As tuas notificações</h2>
                    <p>
                      Avisos da tua conta, mensagens e interações no Talaza.
                    </p>
                  </div>

                  <button
                    className="secondaryButton"
                    type="button"
                    onClick={markAllNotificationsRead}
                    disabled={unreadNotifications === 0}
                  >
                    Marcar todas como lidas
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <div className="empty">
                    <span className="bigIcon">♧</span>
                    <h3>Sem notificações por enquanto</h3>
                    <p>Quando houver novos avisos, aparecerão aqui.</p>
                  </div>
                ) : (
                  <div className="notificationList">
                    {notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={
                          item.is_read
                            ? 'notification'
                            : 'notification unread'
                        }
                        onClick={() => openNotification(item)}
                      >
                        <span className="notificationIcon">●</span>
                        <span className="notificationText">
                          <strong>{item.title || 'Notificação Talaza'}</strong>
                          <span>{item.content || ''}</span>
                          <small>{formatDate(item.created_at)}</small>
                        </span>
                        {!item.is_read && <span className="unreadDot" />}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: ${COLORS.canvas};
          color: ${COLORS.ink};
          padding: 32px 18px 50px;
          font-family: Inter, Arial, sans-serif;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 28px;
        }

        .eyebrow {
          color: ${COLORS.brand};
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.3px;
        }

        h1 {
          margin: 8px 0;
          font-size: clamp(28px, 4vw, 42px);
          letter-spacing: -1px;
        }

        h2 {
          font-size: 19px;
          margin: 0 0 8px;
        }

        p {
          line-height: 1.55;
        }

        .subtitle,
        .muted {
          color: ${COLORS.muted};
        }

        .subtitle {
          max-width: 600px;
          margin-bottom: 0;
        }

        .backButton,
        .secondaryButton {
          background: ${COLORS.white};
          color: ${COLORS.ink};
          border: 1px solid ${COLORS.line};
          border-radius: 11px;
          padding: 11px 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 18px;
        }

        .tab {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border: 1px solid ${COLORS.line};
          border-radius: 12px;
          background: ${COLORS.white};
          color: ${COLORS.muted};
          font-weight: 800;
          cursor: pointer;
        }

        .tab.active {
          background: ${COLORS.dark};
          border-color: ${COLORS.dark};
          color: #fff;
        }

        .counter {
          display: inline-grid;
          place-items: center;
          min-width: 21px;
          height: 21px;
          padding: 0 5px;
          box-sizing: border-box;
          border-radius: 20px;
          background: ${COLORS.purple};
          color: white;
          font-size: 11px;
          font-weight: 800;
        }

        .panel {
          background: ${COLORS.white};
          border: 1px solid ${COLORS.line};
          border-radius: 18px;
          overflow: hidden;
        }

        .messagingGrid {
          display: grid;
          grid-template-columns: minmax(250px, 0.75fr) minmax(0, 1.5fr);
          gap: 18px;
          align-items: stretch;
        }

        .panelHeading {
          padding: 20px;
          border-bottom: 1px solid ${COLORS.line};
        }

        .panelHeading p {
          margin: 0;
          font-size: 13px;
          color: ${COLORS.muted};
        }

        .conversationList {
          display: flex;
          flex-direction: column;
        }

        .conversation {
          display: flex;
          align-items: center;
          gap: 11px;
          width: 100%;
          padding: 14px;
          border: 0;
          border-bottom: 1px solid ${COLORS.line};
          background: white;
          text-align: left;
          cursor: pointer;
        }

        .activeConversation {
          background: ${COLORS.softGreen};
        }

        .avatar {
          display: grid;
          place-items: center;
          flex: 0 0 40px;
          width: 40px;
          height: 40px;
          border-radius: 14px;
          background: ${COLORS.softPurple};
          color: ${COLORS.purple};
          font-weight: 800;
        }

        .conversationText {
          display: flex;
          flex: 1;
          min-width: 0;
          flex-direction: column;
          gap: 4px;
        }

        .conversationText strong {
          font-size: 13px;
        }

        .conversationText small {
          color: ${COLORS.muted};
          font-size: 11px;
          overflow-wrap: anywhere;
        }

        .chatPanel {
          display: flex;
          min-height: 530px;
          flex-direction: column;
        }

        .chatHeader {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid ${COLORS.line};
        }

        .chatHeader p {
          color: ${COLORS.muted};
          font-size: 12px;
          margin: 4px 0 0;
        }

        .chatMessages {
          display: flex;
          flex: 1;
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          min-height: 280px;
          max-height: 480px;
          overflow-y: auto;
          padding: 20px;
        }

        .bubble {
          display: flex;
          max-width: 82%;
          flex-direction: column;
          align-items: flex-start;
          gap: 7px;
          padding: 12px 14px;
          border: 1px solid ${COLORS.line};
          border-radius: 14px 14px 14px 4px;
          background: #fff;
          color: ${COLORS.ink};
          text-align: left;
          overflow-wrap: anywhere;
        }

        .ownBubble {
          align-self: flex-end;
          background: ${COLORS.softGreen};
          border-color: #d2e6df;
          border-radius: 14px 14px 4px 14px;
        }

        .bubble small {
          color: ${COLORS.muted};
          font-size: 10px;
        }

        .bubble a {
          color: ${COLORS.brand};
          font-size: 12px;
        }

        .composer {
          display: flex;
          align-items: stretch;
          gap: 9px;
          padding: 14px;
          border-top: 1px solid ${COLORS.line};
        }

        .composer select {
          max-width: 95px;
          border: 1px solid ${COLORS.line};
          border-radius: 10px;
          padding: 8px;
          background: white;
        }

        .composer textarea {
          flex: 1;
          min-width: 0;
          resize: vertical;
          border: 1px solid ${COLORS.line};
          border-radius: 10px;
          padding: 10px;
          font: inherit;
        }

        .primary {
          align-self: center;
          border: 0;
          border-radius: 10px;
          padding: 12px 15px;
          background: ${COLORS.brand};
          color: white;
          font-weight: 800;
          cursor: pointer;
        }

        .primary:disabled,
        .secondaryButton:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .notificationPanel {
          padding-bottom: 5px;
        }

        .notificationHeading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .notificationList {
          display: flex;
          flex-direction: column;
        }

        .notification {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          width: 100%;
          padding: 17px 20px;
          border: 0;
          border-bottom: 1px solid ${COLORS.line};
          background: white;
          text-align: left;
          cursor: pointer;
        }

        .notification.unread {
          background: #f8fbfa;
        }

        .notificationIcon {
          color: ${COLORS.purple};
          font-size: 18px;
        }

        .notificationText {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 5px;
        }

        .notificationText strong {
          font-size: 14px;
        }

        .notificationText span,
        .notificationText small {
          color: ${COLORS.muted};
          font-size: 12px;
          line-height: 1.5;
        }

        .unreadDot {
          width: 8px;
          height: 8px;
          margin-top: 6px;
          border-radius: 50%;
          background: ${COLORS.purple};
        }

        .empty {
          padding: 35px 20px;
          text-align: center;
          color: ${COLORS.muted};
        }

        .chatEmpty {
          display: flex;
          flex: 1;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .emptyText {
          padding: 18px;
          font-size: 13px;
        }

        .bigIcon {
          font-size: 32px;
          color: ${COLORS.purple};
          margin-bottom: 12px;
        }

        .notice {
          margin-bottom: 16px;
          padding: 13px 15px;
          border-radius: 12px;
          font-size: 13px;
          line-height: 1.5;
        }

        .error {
          background: #fcebed;
          color: ${COLORS.red};
        }

        .success {
          background: ${COLORS.softGreen};
          color: ${COLORS.dark};
        }

        .srOnly {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        @media (max-width: 760px) {
          .header {
            align-items: flex-start;
            flex-direction: column;
          }

          .messagingGrid {
            grid-template-columns: 1fr;
          }

          .chatPanel {
            min-height: 440px;
          }

          .composer {
            flex-wrap: wrap;
          }

          .composer textarea {
            flex-basis: 100%;
            order: 1;
          }

          .composer .primary {
            margin-left: auto;
            order: 2;
          }
        }

        @media (max-width: 480px) {
          .page {
            padding: 22px 12px 35px;
          }

          .notificationHeading {
            align-items: flex-start;
            flex-direction: column;
          }

          .tabs {
            width: 100%;
          }

          .tab {
            flex: 1;
            justify-content: center;
            padding: 11px 8px;
            font-size: 12px;
          }
        }
      `}</style>
    </main>
  );
}
