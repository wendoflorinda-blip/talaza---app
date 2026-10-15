
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import ChatPanel from './ChatPanel';
import NotificationsPanel from './NotificationsPanel';

export default function MessageDock() {
  const router = useRouter();
  const [activePanel, setActivePanel] = useState('');
  const [userId, setUserId] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!error && data?.user) {
        setUserId(data.user.id);
      } else {
        setUserId(null);
      }

      setLoadingUser(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUserId(session?.user?.id || null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function openMessages() {
    if (loadingUser) return;

    if (!userId) {
      router.push('/login?next=%2Fmensagens');
      return;
    }

    setActivePanel((current) =>
      current === 'messages' ? '' : 'messages'
    );
  }

  function openNotifications() {
    if (loadingUser) return;

    if (!userId) {
      router.push('/login?next=%2Fmensagens');
      return;
    }

    setActivePanel((current) =>
      current === 'notifications' ? '' : 'notifications'
    );
  }

  function openNews() {
    setActivePanel('');
    router.push('/explore');
  }

  return (
    <>
      {activePanel && (
        <div className="talaza-dock-overlay">
          <button
            type="button"
            className="talaza-dock-backdrop"
            aria-label="Fechar painel"
            onClick={() => setActivePanel('')}
          />

          <section
            className="talaza-dock-panel"
            role="dialog"
            aria-modal="true"
            aria-label={
              activePanel === 'messages'
                ? 'Mensagens'
                : 'Notificações'
            }
          >
            <button
              type="button"
              className="talaza-dock-close"
              onClick={() => setActivePanel('')}
              aria-label="Fechar"
            >
              ×
            </button>

            {activePanel === 'messages' && (
              <ChatPanel userId={userId} />
            )}

            {activePanel === 'notifications' && (
              <NotificationsPanel userId={userId} />
            )}
          </section>
        </div>
      )}

      <nav className="talaza-message-dock" aria-label="Navegação rápida">
        <button type="button" onClick={openNews}>
          <span className="talaza-dock-icon" aria-hidden="true">⌂</span>
          <span>Novidades</span>
        </button>

        <button
          type="button"
          onClick={openMessages}
          aria-pressed={activePanel === 'messages'}
        >
          <span className="talaza-dock-icon" aria-hidden="true">✉</span>
          <span>Mensagens</span>
        </button>

        <button
          type="button"
          onClick={openNotifications}
          aria-pressed={activePanel === 'notifications'}
        >
          <span className="talaza-dock-icon" aria-hidden="true">♧</span>
          <span>Notificações</span>
        </button>
      </nav>
    </>
  );
}
