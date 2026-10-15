import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function NotificationsPanel({ user, onClose }) {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      const { data, error } = await supabase
        .from('notifications')
        .select('id,title,body,link,is_read,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!active) return;

      if (error) {
        setError('Não foi possível carregar as notificações.');
      } else {
        setItems(data || []);

        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
      }

      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, [user.id]);

  async function openItem(item) {
    if (item.link) {
      onClose();
      await router.push(item.link);
    }
  }

  return (
    <section className="talaza-notifications" role="dialog" aria-label="Notificações">
      <header>
        <strong>Notificações</strong>
        <button onClick={onClose} aria-label="Fechar">×</button>
      </header>

      <div className="talaza-notifications-list">
        {loading && <p>A carregar…</p>}
        {error && <p>{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p>Ainda não tem notificações.</p>
        )}

        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => openItem(item)}
            disabled={!item.link}
          >
            <span className={!item.is_read ? 'unread-dot' : 'read-dot'} />
            <span>
              <strong>{item.title}</strong>
              {item.body && <small>{item.body}</small>}
              <small>
                {new Date(item.created_at).toLocaleString('pt-PT', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </small>
            </span>
          </button>
        ))}
      </div>

      <style jsx>{`
        .talaza-notifications {
          position: fixed;
          z-index: 1001;
          right: 16px;
          bottom: 92px;
          width: min(390px, calc(100vw - 24px));
          max-height: min(600px, calc(100dvh - 120px));
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid #e5e9e7;
          border-radius: 20px;
          background: white;
          color: #17211f;
          box-shadow: 0 12px 44px #083f3526;
        }
        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #083f35;
          color: white;
        }
        header button {
          border: 0;
          background: transparent;
          color: white;
          font-size: 25px;
          cursor: pointer;
        }
        .talaza-notifications-list {
          overflow-y: auto;
          padding: 8px;
        }
        .talaza-notifications-list > button {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          width: 100%;
          padding: 14px 10px;
          border: 0;
          border-bottom: 1px solid #e5e9e7;
          background: white;
          color: #17211f;
          text-align: left;
        }
        .talaza-notifications-list > button span:last-child {
          display: grid;
          gap: 5px;
        }
        .talaza-notifications-list small {
          color: #596560;
        }
        .unread-dot, .read-dot {
          flex: none;
          width: 9px;
          height: 9px;
          margin-top: 5px;
          border-radius: 50%;
          background: #dda10a;
        }
        .read-dot { background: #e5e9e7; }
        @media (max-width: 600px) {
          .talaza-notifications {
            inset: 0;
            width: 100%;
            max-height: 100dvh;
            border-radius: 0;
          }
        }
      `}</style>
    </section>
  );
}
