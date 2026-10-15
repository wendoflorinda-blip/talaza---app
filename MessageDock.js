import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function MessageDock() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [unread, setUnread] = useState(0);

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

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }

    let active = true;

    async function countUnread() {
      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (active && !error) {
        setUnread(count || 0);
      }
    }

    countUnread();

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
        () => countUnread()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const openMessages = () => {
    router.push(user ? '/mensagens' : '/login?next=%2Fmensagens');
  };

  return (
    <button
      type="button"
      onClick={openMessages}
      aria-label={
        unread > 0
          ? `Abrir mensagens. ${unread} mensagens não lidas`
          : 'Abrir mensagens'
      }
      style={{
        position: 'fixed',
        right: 18,
        bottom: 18,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '13px 17px',
        border: '2px solid #FFFFFF',
        borderRadius: 30,
        background: '#083F35',
        color: '#FFFFFF',
        boxShadow: '0 5px 22px rgba(0,0,0,0.2)',
        fontWeight: 700,
        fontSize: 14,
        cursor: 'pointer',
      }}
    >
      <span aria-hidden="true">✉</span>
      <span>Mensagens</span>

      {unread > 0 && (
        <span
          style={{
            minWidth: 23,
            height: 23,
            padding: '0 5px',
            boxSizing: 'border-box',
            borderRadius: 20,
            display: 'grid',
            placeItems: 'center',
            background: '#B93845',
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}
