import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { loadProfileSectionBadgeCounts } from '../lib/profileBadges';

export default function MessageDock() {
  const router = useRouter();
  const [notifCount, setNotifCount] = useState(0);
  const [profileHasUpdates, setProfileHasUpdates] = useState(false);

  const isActive = (href) => router.pathname === href || (href === '/perfil' && router.pathname.startsWith('/perfil'));

  useEffect(() => {
    let cancelled = false;

    async function loadCounts() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) {
          if (!cancelled) { setNotifCount(0); setProfileHasUpdates(false); }
          return;
        }

        const [{ count: unreadNotifications, error: notificationsError }, { data: profileRow, error: profileError }] = await Promise.all([
          supabase.from('notifications').select('id', { count: 'exact', head: true })
            .eq('user_id', user.id).eq('audience', 'explorer').eq('is_read', false),
          supabase.from('profiles').select('province_id,country_id').eq('id', user.id).maybeSingle()
        ]);
        if (notificationsError) throw notificationsError;
        if (profileError) throw profileError;

        const sectionCounts = await loadProfileSectionBadgeCounts(supabase, user.id, profileRow);
        const hasUpdates = Boolean((unreadNotifications || 0) + sectionCounts.novidades + sectionCounts.eventos + sectionCounts.parasi > 0);
        if (!cancelled) {
          setNotifCount(unreadNotifications || 0);
          setProfileHasUpdates(hasUpdates);
        }
      } catch (error) {
        console.warn('Não foi possível atualizar os indicadores do Perfil:', error);
      }
    }

    loadCounts();
    const intervalId = window.setInterval(loadCounts, 15000);
    const onFocus = () => loadCounts();
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onFocus);
    window.addEventListener('talaza:profile-sections-seen', onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onFocus);
      window.removeEventListener('talaza:profile-sections-seen', onFocus);
    };
  }, []);

  const badge = (count) => count > 0 ? (
    <span style={{
      position:'absolute', top:-8, right:-10,
      background:'#E5384F', color:'#fff', fontSize:11, fontWeight:700,
      minWidth:18, height:18, borderRadius:9, display:'grid', placeItems:'center', padding:'0 4px'
    }}>{count > 9 ? '9+' : count}</span>
  ) : null;

  const dot = profileHasUpdates ? <span aria-label="Há novidades por ver" style={{
    position:'absolute', top:-2, right:-5, width:9, height:9, borderRadius:'50%',
    background:'#E5384F', border:'1.5px solid #FFFFFF'
  }} /> : null;

  return (
    <div style={{
      position:'fixed', bottom:0, left:0, right:0, height:74,
      background:'#fff', borderTop:'1px solid #E9E6DE',
      display:'flex', justifyContent:'space-around', alignItems:'center', zIndex:9999
    }}>
      <Link href="/perfil" style={{textDecoration:'none', display:'flex', flexDirection:'column', alignItems:'center', color: isActive('/perfil') ? '#64358B' : '#8A9A94', fontSize:13, fontWeight: isActive('/perfil') ? 700 : 500}}>
        <div style={{position:'relative'}}><span style={{fontSize:22}}>♙</span>{dot}</div>Perfil
      </Link>

      <Link href="/mensagens" style={{textDecoration:'none', display:'flex', flexDirection:'column', alignItems:'center', color: isActive('/mensagens') ? '#0B3B2D' : '#8A9A94', fontSize:13, fontWeight: isActive('/mensagens') ? 700 : 500}}>
        <div style={{position:'relative'}}><span style={{fontSize:22}}>💬</span></div>
        Mensagens
      </Link>

      <Link href="/notificacoes" style={{textDecoration:'none', display:'flex', flexDirection:'column', alignItems:'center', color: isActive('/notificacoes') ? '#0B3B2D' : '#8A9A94', fontSize:13, fontWeight: isActive('/notificacoes') ? 700 : 500, position:'relative'}}>
        <div style={{position:'relative'}}><span style={{fontSize:22}}>🔔</span>{badge(notifCount)}</div>
        Notificações
      </Link>
    </div>
  );
}
