import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MessageDock() {
  const router = useRouter();
  const [msgCount, setMsgCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);

  const isActive = (href) => router.pathname === href;

  // AQUI VAI BUSCAR O NÚMERO REAL - por enquanto 0, quando tiver mensagem muda sozinho
  useEffect(() => {
    async function loadCounts() {
      // Exemplo: quando você tiver tabela de mensagens, descomente:
      // const { count } = await supabase.from('messages').select('*', {count:'exact'}).eq('read', false);
      // setMsgCount(count || 0);
      
      // Por enquanto deixa 0 para não mostrar número falso
      setMsgCount(0);
      setNotifCount(0);
    }
    loadCounts();
  }, []);

  const badge = (count) => count > 0 ? (
    <span style={{
      position:'absolute', top:-8, right:-10,
      background:'#E5384F', color:'#fff', fontSize:11, fontWeight:700,
      minWidth:18, height:18, borderRadius:9, display:'grid', placeItems:'center', padding:'0 4px'
    }}>{count > 9 ? '9+' : count}</span>
  ) : null;

  return (
    <div style={{
      position:'fixed', bottom:0, left:0, right:0, height:74,
      background:'#fff', borderTop:'1px solid #E9E6DE',
      display:'flex', justifyContent:'space-around', alignItems:'center', zIndex:9999
    }}>
      <Link href="/" style={{textDecoration:'none', display:'flex', flexDirection:'column', alignItems:'center', color: isActive('/') ? '#0B3B2D' : '#8A9A94', fontSize:13, fontWeight: isActive('/') ? 700 : 500}}>
        <span style={{fontSize:22}}>✦</span>Novidades
      </Link>

      <Link href="/mensagens" style={{textDecoration:'none', display:'flex', flexDirection:'column', alignItems:'center', color: isActive('/mensagens') ? '#0B3B2D' : '#8A9A94', fontSize:13, fontWeight: isActive('/mensagens') ? 700 : 500, position:'relative'}}>
        <div style={{position:'relative'}}><span style={{fontSize:22}}>💬</span>{badge(msgCount)}</div>
        Mensagens
      </Link>

      <Link href="/notificacoes" style={{textDecoration:'none', display:'flex', flexDirection:'column', alignItems:'center', color: isActive('/notificacoes') ? '#0B3B2D' : '#8A9A94', fontSize:13, fontWeight: isActive('/notificacoes') ? 700 : 500, position:'relative'}}>
        <div style={{position:'relative'}}><span style={{fontSize:22}}>🔔</span>{badge(notifCount)}</div>
        Notificações
      </Link>
    </div>
  );
}
