
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function getMessagePreview(message) {
  if (message.content) return message.content;

  if (message.message_type === 'image') return 'Fotografia';
  if (message.message_type === 'audio') return 'Mensagem de áudio';
  if (message.message_type === 'video') return 'Vídeo';

  return 'Mensagem';
}

export default function ChatPanel({ userId: suppliedUserId }) {
  const [userId, setUserId] = useState(suppliedUserId || null);
  const [conversations, setConversations] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (suppliedUserId) {
      setUserId(suppliedUserId);
      return;
    }

    let mounted = true;

    async function getUser() {
      const { data, error: authError } = await supabase.auth.getUser();

      if (!mounted) return;

      if (authError || !data?.user) {
        setError('Inicia sessão para consultar as mensagens.');
        setLoading(false);
        return;
      }

      setUserId(data.user.id);
    }

    getUser();

    return () => {
      mounted = false;
    };
  }, [suppliedUserId]);

  const loadConversations = useCallback(async () => {
    if (!userId) return;

    setError('');

    const { data, error: queryError } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(300);

    if (queryError) {
      setError(`Não foi possível carregar as mensagens: ${queryError.message}`);
      setLoading(false);
      return;
    }

    const latestByPartner = new Map();

    for (const message of data || []) {
      const partnerId =
        message.sender_id === userId
          ? message.receiver_id
          : message.sender_id;

      if (!partnerId || partnerId === userId) continue;

      if (!latestByPartner.has(partnerId)) {
        latestByPartner.set(partnerId, {
          partnerId,
          latestMessage: message,
        });
      }
    }

    const partnerIds = [...latestByPartner.keys()];
    let profileMap = new Map();

    if (partnerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', partnerIds);

      profileMap = new Map(
        (profiles || []).map((profile) => [profile.id, profile])
      );
    }

    const result = [...latestByPartner.values()].map((conversation) => {
      const profile = profileMap.get(conversation.partnerId);
      const message = conversation.latestMessage;

      return {
        ...conversation,
        name:
          profile?.name ||
          profile?.full_name ||
          profile?.username ||
          'Utilizador Talaza',
        preview: getMessagePreview(message),
        createdAt: message.created_at,
      };
    });

    setConversations(result);
    setLoading(false);

    if (
      selectedUserId &&
      !partnerIds.includes(selectedUserId)
    ) {
      setSelectedUserId('');
      setMessages([]);
    }
  }, [userId, selectedUserId]);

  const loadMessages = useCallback(async () => {
    if (!userId || !selectedUserId) {
      setMessages([]);
      return;
    }

    const { data, error: queryError } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${userId})`
      )
      .order('created_at', { ascending: true })
      .limit(300);

    if (queryError) {
      setError(`Não foi possível abrir a conversa: ${queryError.message}`);
      return;
    }

    setMessages(data || []);

    const unreadIds = (data || [])
      .filter(
        (message) =>
          message.receiver_id === userId &&
          message.is_read === false
      )
      .map((message) => message.id);

    if (unreadIds.length > 0) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', unreadIds)
        .eq('receiver_id', userId);
    }
  }, [userId, selectedUserId]);

  useEffect(() => {
    if (!userId) return;

    loadConversations();
  }, [userId, loadConversations]);

  useEffect(() => {
    if (!userId || !selectedUserId) return;

    loadMessages();
  }, [userId, selectedUserId, loadMessages]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`talaza-messages-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          loadConversations();

          if (selectedUserId) {
            loadMessages();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, selectedUserId, loadConversations, loadMessages]);

  async function sendMessage(event) {
    event.preventDefault();

    const content = draft.trim();

    if (!content || !userId || !selectedUserId || sending) return;

    setSending(true);
    setError('');

    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        sender_id: userId,
        receiver_id: selectedUserId,
        content,
        message_type: 'text',
        is_read: false,
      });

    setSending(false);

    if (insertError) {
      setError(`Não foi possível enviar: ${insertError.message}`);
      return;
    }

    setDraft('');
    await loadMessages();
    await loadConversations();
  }

  if (!userId) {
    return (
      <div className="talaza-chat">
        <h2>Mensagens</h2>
        <p>{error || 'A verificar a sessão…'}</p>
      </div>
    );
  }

  return (
    <div className="talaza-chat">
      <h2>Mensagens</h2>

      {error && <p className="talaza-feedback-error">{error}</p>}

      {!selectedUserId ? (
        <>
          <p className="talaza-chat-help">
            Escolhe uma conversa para ver as mensagens.
          </p>

          {loading ? (
            <p>A carregar conversas…</p>
          ) : conversations.length === 0 ? (
            <p>Ainda não tens conversas.</p>
          ) : (
            <div className="talaza-conversation-list">
              {conversations.map((conversation) => (
                <button
                  type="button"
                  className="talaza-conversation"
                  key={conversation.partnerId}
                  onClick={() => setSelectedUserId(conversation.partnerId)}
                >
                  <span className="talaza-conversation-avatar">
                    {conversation.name.charAt(0).toUpperCase()}
                  </span>

                  <span className="talaza-conversation-text">
                    <strong>{conversation.name}</strong>
                    <span>{conversation.preview}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            className="talaza-chat-back"
            onClick={() => {
              setSelectedUserId('');
              setMessages([]);
              setError('');
            }}
          >
            ← Todas as conversas
          </button>

          <div className="talaza-chat-messages">
            {messages.length === 0 ? (
              <p>Envia a primeira mensagem desta conversa.</p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.sender_id === userId
                      ? 'talaza-message talaza-message-own'
                      : 'talaza-message'
                  }
                >
                  {message.content && <p>{message.content}</p>}

                  {!message.content && (
                    <p>{getMessagePreview(message)}</p>
                  )}

                  <time>
                    {message.created_at
                      ? new Date(message.created_at).toLocaleString()
                      : ''}
                  </time>
                </div>
              ))
            )}
          </div>

          <form className="talaza-chat-compose" onSubmit={sendMessage}>
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Escreve uma mensagem…"
              aria-label="Mensagem"
              maxLength={5000}
            />

            <button type="submit" disabled={sending || !draft.trim()}>
              {sending ? 'A enviar…' : 'Enviar'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
