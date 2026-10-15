import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

function formatDate(iso) {
  return new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationsPanel({ user, onClose }) {
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      const { data, error: loadError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!active) return;

      if (loadError) {
        console.error(loadError);
        setError('Não foi possível carregar as notificações.');
        setLoading(false);
        return;
      }

      setItems(data || []);
      setLoading(false);

      // Marca como lidas na base de dados; na lista continuam
      // destacadas até fechar o painel.
      if ((data || []).some((item) => !item.is_read)) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [user.id]);

  function openItem(item) {
    if (!item.link) return;
    onClose();
    router.push(item.link);
  }

  return (
    <section className="msd-panel" role="dialog" aria-label="Notificações">
      <header className="msd-head">
        <h2>Notificações</h2>

        <button
          type="button"
          className="msd-hbtn"
          onClick={onClose}
          aria-label="Fechar notificações"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div className="msd-scroll">
        {loading && <div className="msd-empty">A carregar…</div>}

        {!loading && error && <div className="msd-empty">{error}</div>}

        {!loading && !error && items.length === 0 && (
          <div className="msd-empty">
            <b>Sem notificações</b>
            Quando houver novidades para si, elas aparecem aqui.
          </div>
        )}

        {!loading &&
          !error &&
          items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`msd-notif${item.is_read ? '' : ' unread'}`}
              onClick={() => openItem(item)}
              disabled={!item.link}
            >
              <span className="msd-notif-dot" aria-hidden="true" />

              <span className="msd-notif-main">
                <b>{item.title}</b>
                {item.body && <span>{item.body}</span>}
                <small>{formatDate(item.created_at)}</small>
              </span>
            </button>
          ))}
      </div>

      <style jsx global>{`
        .msd-notif {
          width: 100%;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          border: 0;
          border-bottom: 1px solid #d9e5e1;
          background: transparent;
          color: inherit;
          font: inherit;
          text-align: left;
          cursor: pointer;
        }
        .msd-notif:disabled {
          cursor: default;
        }
        .msd-notif.unread {
          background: #ffffff;
        }
        .msd-notif-dot {
          flex: none;
          width: 9px;
          height: 9px;
          margin-top: 7px;
          border-radius: 50%;
          background: transparent;
        }
        .msd-notif.unread .msd-notif-dot {
          background: #e6a900;
        }
        .msd-notif-main {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }
        .msd-notif-main b {
          font-size: 15px;
          line-height: 1.3;
        }
        .msd-notif-main span {
          font-size: 14px;
          line-height: 1.45;
          color: #5e716c;
        }
        .msd-notif-main small {
          font-size: 12.5px;
          color: #8a9a95;
        }
      `}</style>
    </section>
  );
}
