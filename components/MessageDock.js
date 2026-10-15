import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import ChatPanel from './ChatPanel';
import NotificationsPanel from './NotificationsPanel';

/**
 * Abre uma conversa diretamente com alguém (ex.: dono de um negócio).
 * Use em qualquer botão "Enviar mensagem":
 *
 *   import { openChat } from '../components/MessageDock';
 *   <button onClick={() => openChat(business.owner_id, business.name)}>Enviar mensagem</button>
 */
export function openChat(userId, name) {
  if (typeof window === 'undefined' || !userId) return;
  window.dispatchEvent(
    new CustomEvent('talaza:open-chat', { detail: { userId, name } })
  );
}

function BellIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 17V11a6 6 0 1112 0v6l1.5 2h-15L6 17z" />
      <path d="M10 21h4" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1H10l-5 4v-4H4a1 1 0 01-1-1V6a1 1 0 011-1z" />
    </svg>
  );
}

export default function MessageDock() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [panel, setPanel] = useState(null); // null | 'messages' | 'notifications'
  const [partner, setPartner] = useState(null);

  /* ---------- Sessão ---------- */
  useEffect(() => {
    let active = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (active) {
        setUser(data?.session?.user || null);
      }
    }

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (active) {
          setUser(session?.user || null);
        }
      }
    );

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  /* ---------- Contadores (mensagens + notificações) ---------- */
  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      setUnreadNotifications(0);
      setPanel(null);
      return;
    }

    let active = true;

    async function countMessages() {
      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (active && !error) {
        setUnreadMessages(count || 0);
      }
    }

    async function countNotifications() {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (active && !error) {
        setUnreadNotifications(count || 0);
      }
    }

    countMessages();
    countNotifications();

    const channel = supabase
      .channel(`message-dock-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => countMessages()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => countNotifications()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  /* ---------- Abrir conversa vinda de outro botão ---------- */
  useEffect(() => {
    function handleOpenChat(event) {
      const { userId, name } = event.detail || {};
      if (!userId) return;

      if (!user) {
        router.push(`/login?next=${encodeURIComponent(router.asPath)}`);
        return;
      }

      if (userId === user.id) return;

      setPartner({ id: userId, name: name || '' });
      setPanel('messages');
    }

    window.addEventListener('talaza:open-chat', handleOpenChat);
    return () =>
      window.removeEventListener('talaza:open-chat', handleOpenChat);
  }, [user, router]);

  /* ---------- Espaço para a barra + bloquear scroll com painel aberto ---------- */
  useEffect(() => {
    document.body.classList.add('msd-has-dock');
    return () => document.body.classList.remove('msd-has-dock');
  }, []);

  useEffect(() => {
    document.body.classList.toggle('msd-lock', Boolean(panel));
    return () => document.body.classList.remove('msd-lock');
  }, [panel]);

  function toggle(name) {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(router.asPath)}`);
      return;
    }

    setPartner(null);
    setPanel((current) => (current === name ? null : name));
  }

  function closePanel() {
    setPanel(null);
    setPartner(null);
  }

  return (
    <>
      {panel === 'messages' && user && (
        <ChatPanel
          user={user}
          initialPartner={partner}
          onClose={closePanel}
        />
      )}

      {panel === 'notifications' && user && (
        <NotificationsPanel user={user} onClose={closePanel} />
      )}

      <nav className="msd-bar" aria-label="Mensagens e notificações">
        <button
          type="button"
          className="msd-tab"
          aria-pressed={panel === 'notifications'}
          onClick={() => toggle('notifications')}
          aria-label={
            unreadNotifications > 0
              ? `Abrir notificações. ${unreadNotifications} não lidas`
              : 'Abrir notificações'
          }
        >
          <span className="msd-ico">
            <BellIcon />
            {unreadNotifications > 0 && (
              <span className="msd-badge">
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </span>
            )}
          </span>
          Notificações
        </button>

        <button
          type="button"
          className="msd-tab"
          aria-pressed={panel === 'messages'}
          onClick={() => toggle('messages')}
          aria-label={
            unreadMessages > 0
              ? `Abrir mensagens. ${unreadMessages} mensagens não lidas`
              : 'Abrir mensagens'
          }
        >
          <span className="msd-ico">
            <ChatIcon />
            {unreadMessages > 0 && (
              <span className="msd-badge">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </span>
            )}
          </span>
          Mensagens
        </button>
      </nav>

      <style jsx global>{`
        body.msd-has-dock {
          padding-bottom: calc(72px + env(safe-area-inset-bottom));
        }
        body.msd-lock {
          overflow: hidden;
        }

        /* ---------- Barra inferior ---------- */
        .msd-bar {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9990;
          display: flex;
          padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
          background: #ffffff;
          border-top: 1px solid #d9e5e1;
          box-shadow: 0 -6px 20px rgba(7, 60, 50, 0.06);
        }
        .msd-tab {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          min-height: 52px;
          border: 0;
          background: none;
          color: #5e716c;
          font: inherit;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
        }
        .msd-tab[aria-pressed='true'] {
          color: #075b4e;
          font-weight: 800;
        }
        .msd-tab:focus-visible {
          outline: 2px solid #e6a900;
          outline-offset: 2px;
          border-radius: 10px;
        }
        .msd-ico {
          position: relative;
          display: block;
        }
        .msd-badge {
          position: absolute;
          top: -6px;
          left: 14px;
          min-width: 19px;
          height: 19px;
          padding: 0 5px;
          box-sizing: border-box;
          border-radius: 99px;
          display: grid;
          place-items: center;
          background: #e5384f;
          color: #ffffff;
          font-size: 11.5px;
          font-weight: 800;
          line-height: 1;
          border: 2px solid #ffffff;
        }

        /* ---------- Painel (estrutura comum) ---------- */
        .msd-panel {
          position: fixed;
          left: 0;
          right: 0;
          top: 0;
          height: 100dvh;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          background: #f3efe6;
          color: #17342f;
          font-family: 'Avenir Next', 'Segoe UI Variable Display',
            'Segoe UI', Roboto, system-ui, sans-serif;
        }
        .msd-panel *,
        .msd-panel *::before,
        .msd-panel *::after {
          box-sizing: border-box;
        }
        @media (min-width: 640px) {
          .msd-panel {
            left: auto;
            right: 24px;
            top: auto;
            bottom: 88px;
            width: 420px;
            height: min(720px, calc(100dvh - 112px));
            border-radius: 22px;
            overflow: hidden;
            box-shadow: 0 24px 60px rgba(7, 60, 50, 0.28),
              0 0 0 1px #d9e5e1;
          }
        }
        .msd-head {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: calc(12px + env(safe-area-inset-top)) 12px 12px;
          background: #075b4e;
          color: #f7f5f0;
        }
        @media (min-width: 640px) {
          .msd-head {
            padding-top: 12px;
          }
        }
        .msd-head h2 {
          flex: 1;
          min-width: 0;
          margin: 0;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .msd-hbtn {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          flex: none;
          border: 0;
          border-radius: 12px;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }
        .msd-hbtn:active {
          background: rgba(255, 255, 255, 0.14);
        }
        .msd-scroll {
          flex: 1;
          overflow-y: auto;
          overscroll-behavior: contain;
        }
        .msd-empty {
          padding: 48px 28px;
          text-align: center;
          color: #5e716c;
          font-size: 15px;
          line-height: 1.5;
        }
        .msd-empty b {
          display: block;
          margin-bottom: 6px;
          color: #17342f;
          font-size: 17px;
        }
        .msd-avatar {
          flex: none;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #e3f1ec;
          color: #12705c;
          font-weight: 800;
          font-size: 15px;
        }
      `}</style>
    </>
  );
}
