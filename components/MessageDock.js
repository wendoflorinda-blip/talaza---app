import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import ChatPanel from './ChatPanel';
import NotificationsPanel from './NotificationsPanel';

export default function MessageDock() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [panel, setPanel] = useState('');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      const { data } = await supabase.auth.getUser();
      if (active) setUser(data?.user || null);
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      setUnreadNotifications(0);
      return;
    }

    let active = true;

    async function refreshCounts() {
      const [messages, notifications] = await Promise.all([
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false),
      ]);

      if (!active) return;
      setUnreadMessages(messages.count || 0);
      setUnreadNotifications(notifications.count || 0);
    }

    refreshCounts();

    const channel = supabase
      .channel(`talaza-dock-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, refreshCounts)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, refreshCounts)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function openPanel(name) {
    if (!user) {
      const next = encodeURIComponent(router.asPath);
      await router.push(`/login?next=${next}`);
      return;
    }

    setPanel((current) => current === name ? '' : name);
  }

  return (
    <>
      {panel === 'messages' && user && (
        <ChatPanel user={user} onClose={() => setPanel('')} />
      )}

      {panel === 'notifications' && user && (
        <NotificationsPanel user={user} onClose={() => setPanel('')} />
      )}

      <nav className="talaza-dock" aria-label="Navegação rápida">
        <button
          className={panel === 'news' ? 'active' : ''}
          onClick={() => {
            setPanel('');
            router.push('/novidades');
          }}
        >
          <span className="dock-icon">✧</span>
          <span>Novidades</span>
        </button>

        <button
          className={panel === 'messages' ? 'active' : ''}
          onClick={() => openPanel('messages')}
        >
          <span className="dock-icon">▱</span>
          <span>Mensagens</span>
          {unreadMessages > 0 && (
            <b className="dock-badge">
              {unreadMessages > 99 ? '99+' : unreadMessages}
            </b>
          )}
        </button>

        <button
          className={panel === 'notifications' ? 'active' : ''}
          onClick={() => openPanel('notifications')}
        >
          <span className="dock-icon">♧</span>
          <span>Notificações</span>
          {unreadNotifications > 0 && (
            <b className="dock-badge">
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </b>
          )}
        </button>
      </nav>

      <style jsx>{`
        .talaza-dock {
          position: fixed;
          z-index: 1000;
          left: 0;
          right: 0;
          bottom: 0;
          min-height: calc(78px + env(safe-area-inset-bottom));
          padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          background: rgba(255,255,255,.98);
          border-top: 1px solid #e5e9e7;
          box-shadow: 0 -5px 18px #083f3508;
        }
        .talaza-dock button {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 4px;
          min-width: 0;
          border: 0;
          background: transparent;
          color: #596560;
          font: inherit;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .talaza-dock button.active { color: #0f6e5c; }
        .dock-icon {
          font-size: 27px;
          line-height: 1.1;
        }
        .dock-badge {
          position: absolute;
          top: 0;
          left: calc(50% + 10px);
          min-width: 20px;
          padding: 3px 5px;
          border-radius: 99px;
          background: #d83b50;
          color: white;
          font-size: 11px;
          line-height: 1.2;
        }
        @media (min-width: 700px) {
          .talaza-dock {
            left: 50%;
            right: auto;
            width: min(520px, 100%);
            transform: translateX(-50%);
            border: 1px solid #e5e9e7;
            border-bottom: 0;
            border-radius: 18px 18px 0 0;
          }
        }
      `}</style>
    </>
  );
}
