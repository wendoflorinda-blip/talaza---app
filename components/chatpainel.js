import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ChatPanel({ user, onClose }) {
  const [conversations, setConversations] = useState([]);
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadConversations = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('id,sender_id,receiver_id,content,message_type,is_read,created_at')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(300);

    if (error) {
      setError('Não foi possível carregar as conversas.');
      setLoading(false);
      return;
    }

    const latest = new Map();

    for (const message of data || []) {
      const other =
        message.sender_id === user.id
          ? message.receiver_id
          : message.sender_id;

      if (other && !latest.has(other)) {
        latest.set(other, {
          id: other,
          last: message,
          unread: 0,
        });
      }

      if (
        other &&
        message.receiver_id === user.id &&
        !message.is_read
      ) {
        latest.get(other).unread += 1;
      }
    }

    setConversations([...latest.values()]);
    setLoading(false);
  }, [user.id]);

  const loadThread = useCallback(async (otherId) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true })
      .limit(300);

    if (error) {
      setError('Não foi possível abrir esta conversa.');
      return;
    }

    setMessages(data || []);

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', otherId)
      .eq('receiver_id', user.id)
      .eq('is_read', false);

    loadConversations();
  }, [user.id, loadConversations]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!partner) return;

    loadThread(partner.id);

    const channel = supabase
      .channel(`talaza-chat-${user.id}-${partner.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (event) => {
          const message = event.new;

          if (
            message.sender_id === partner.id &&
            message.receiver_id === user.id
          ) {
            setMessages((previous) =>
              previous.some((item) => item.id === message.id)
                ? previous
                : [...previous, message]
            );

            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', message.id)
              .eq('receiver_id', user.id);
          }

          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partner, user.id, loadThread, loadConversations]);

  async function sendMessage(event) {
    event.preventDefault();

    const content = text.trim();
    if (!content || !partner || sending) return;

    setSending(true);
    setError('');

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: partner.id,
      content,
      message_type: 'text',
    });

    if (error) {
      setError('Não foi possível enviar. Tente novamente.');
    } else {
      setText('');
      await loadThread(partner.id);
      await loadConversations();
    }

    setSending(false);
  }

  return (
    <section className="talaza-panel" role="dialog" aria-label="Mensagens">
      <header className="talaza-panel-head">
        {partner && (
          <button onClick={() => {
            setPartner(null);
            setMessages([]);
            loadConversations();
          }}>
            ←
          </button>
        )}
        <strong>{partner ? 'Conversa' : 'Mensagens'}</strong>
        <button onClick={onClose} aria-label="Fechar">×</button>
      </header>

      {!partner ? (
        <div className="talaza-panel-list">
          {loading && <p>A carregar conversas…</p>}
          {!loading && conversations.length === 0 && (
            <p>Ainda não tem conversas. Abra um perfil e escolha enviar mensagem.</p>
          )}
          {conversations.map((item) => (
            <button
              className="talaza-conversation"
              key={item.id}
              onClick={() => {
                setPartner({ id: item.id });
                setError('');
              }}
            >
              <span className="talaza-avatar">T</span>
              <span>
                <strong>Conversa Talaza</strong>
                <small>
                  {item.last.message_type === 'image'
                    ? '📷 Fotografia'
                    : item.last.message_type === 'audio'
                    ? '🎤 Áudio'
                    : item.last.content || 'Mensagem'}
                </small>
              </span>
              {item.unread > 0 && (
                <b className="talaza-count">{item.unread}</b>
              )}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="talaza-chat-body">
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.sender_id === user.id
                    ? 'talaza-bubble mine'
                    : 'talaza-bubble'
                }
              >
                {message.content}
                <small>
                  {new Date(message.created_at).toLocaleTimeString('pt-PT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </small>
              </div>
            ))}
          </div>

          <form className="talaza-chat-form" onSubmit={sendMessage}>
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Escreva uma mensagem…"
              aria-label="Mensagem"
            />
            <button disabled={sending || !text.trim()}>
              {sending ? '…' : 'Enviar'}
            </button>
          </form>
        </>
      )}

      {error && <p className="talaza-chat-error">{error}</p>}

      <style jsx>{`
        .talaza-panel {
          position: fixed;
          z-index: 1001;
          right: 16px;
          bottom: 92px;
          width: min(390px, calc(100vw - 24px));
          height: min(600px, calc(100dvh - 120px));
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #fff;
          color: #17211f;
          border: 1px solid #e5e9e7;
          border-radius: 20px;
          box-shadow: 0 12px 44px #083f3526;
        }
        .talaza-panel-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #083f35;
          color: white;
        }
        .talaza-panel-head button {
          border: 0;
          background: transparent;
          color: inherit;
          font-size: 25px;
          cursor: pointer;
        }
        .talaza-panel-list, .talaza-chat-body {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 12px;
        }
        .talaza-conversation {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          text-align: left;
          border: 0;
          border-bottom: 1px solid #e5e9e7;
          background: white;
          cursor: pointer;
        }
        .talaza-conversation span:nth-child(2) {
          flex: 1;
          display: grid;
          gap: 4px;
          min-width: 0;
        }
        .talaza-conversation small { color: #596560; }
        .talaza-avatar {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #e8f3f0;
          color: #0f6e5c;
          font-weight: 700;
        }
        .talaza-count {
          background: #b93845;
          color: white;
          border-radius: 99px;
          padding: 3px 7px;
        }
        .talaza-chat-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: #f8f6f3;
        }
        .talaza-bubble {
          align-self: flex-start;
          max-width: 85%;
          padding: 10px 12px;
          border-radius: 14px;
          background: white;
          overflow-wrap: anywhere;
        }
        .talaza-bubble.mine {
          align-self: flex-end;
          background: #e8f3f0;
        }
        .talaza-bubble small {
          display: block;
          margin-top: 5px;
          color: #596560;
          font-size: 11px;
          text-align: right;
        }
        .talaza-chat-form {
          display: flex;
          gap: 8px;
          padding: 10px;
          border-top: 1px solid #e5e9e7;
        }
        .talaza-chat-form input {
          flex: 1;
          min-width: 0;
          border: 1px solid #e5e9e7;
          border-radius: 24px;
          padding: 12px;
        }
        .talaza-chat-form button {
          border: 0;
          border-radius: 24px;
          padding: 0 15px;
          background: #0f6e5c;
          color: white;
        }
        .talaza-chat-error {
          margin: 0;
          padding: 10px;
          color: #b93845;
          font-size: 13px;
        }
        @media (max-width: 600px) {
          .talaza-panel {
            inset: 0;
            width: 100%;
            height: 100dvh;
            border-radius: 0;
          }
        }
      `}</style>
    </section>
  );
}
