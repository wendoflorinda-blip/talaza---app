
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function NotificationsPanel({ userId: suppliedUserId }) {
  const [userId, setUserId] = useState(suppliedUserId || null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
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
        setError('Inicia sessão para ver as notificações.');
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

  const loadNotifications = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError('');

    const { data, error: queryError } = await supabase
      .from('notifications')
      .select(
        'id, created_at, user_id, type, title, content, reference_id, is_read'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (queryError) {
      setError(`Não foi possível carregar as notificações: ${queryError.message}`);
      setLoading(false);
      return;
    }

    setNotifications(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadNotifications();
    }
  }, [userId, loadNotifications]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`talaza-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => loadNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadNotifications]);

  async function markAsRead(notification) {
    if (notification.is_read) return;

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notification.id)
      .eq('user_id', userId);

    if (updateError) {
      setError(`Não foi possível marcar como lida: ${updateError.message}`);
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

  async function markAllAsRead() {
    const unreadIds = notifications
      .filter((item) => !item.is_read)
      .map((item) => item.id);

    if (unreadIds.length === 0) return;

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds)
      .eq('user_id', userId);

    if (updateError) {
      setError(`Não foi possível atualizar: ${updateError.message}`);
      return;
    }

    setNotifications((current) =>
      current.map((item) => ({ ...item, is_read: true }))
    );
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  return (
    <div className="talaza-notifications">
      <div className="talaza-notifications-heading">
        <div>
          <h2>Notificações</h2>
          <p>
            {unreadCount === 0
              ? 'Estás em dia.'
              : `${unreadCount} por ler`}
          </p>
        </div>

        {unreadCount > 0 && (
          <button type="button" onClick={markAllAsRead}>
            Marcar todas como lidas
          </button>
        )}
      </div>

      {error && <p className="talaza-feedback-error">{error}</p>}

      {loading ? (
        <p>A carregar notificações…</p>
      ) : notifications.length === 0 ? (
        <p>Ainda não tens notificações.</p>
      ) : (
        <div className="talaza-notification-list">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={
                notification.is_read
                  ? 'talaza-notification'
                  : 'talaza-notification talaza-notification-unread'
              }
            >
              <button
                type="button"
                className="talaza-notification-content"
                onClick={() => markAsRead(notification)}
              >
                <span className="talaza-notification-title">
                  {notification.title || 'Notificação Talaza'}
                </span>

                {notification.content && (
                  <span>{notification.content}</span>
                )}

                <span className="talaza-notification-meta">
                  {notification.type || 'Atualização'}
                  {notification.created_at
                    ? ` · ${new Date(
                        notification.created_at
                      ).toLocaleString()}`
                    : ''}
                </span>
              </button>

              {!notification.is_read && (
                <span
                  className="talaza-notification-dot"
                  aria-label="Não lida"
                />
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
