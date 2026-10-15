import Link from 'next/link';
import { useRouter } from 'next/router';

export default function MessageDock() {
  const router = useRouter();
  const pathname = router.pathname;

  const isActive = (href) => pathname === href || pathname.startsWith(href + '/');

  const itemStyle = (active) => ({
    textDecoration: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    color: active ? '#0B3B2D' : '#8A9A94',
    fontSize: '13px',
    fontWeight: active ? 700 : 500,
    position: 'relative'
  });

  const badgeStyle = {
    position: 'absolute',
    top: '-8px',
    right: '-12px',
    background: '#E5384F',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    minWidth: '18px',
    height: '18px',
    borderRadius: '9px',
    display: 'grid',
    placeItems: 'center',
    padding: '0 4px',
    lineHeight: 1
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '74px',
      background: '#FFFFFF',
      borderTop: '1px solid #E9E6DE',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      zIndex: 9999,
      paddingBottom: '6px',
      boxShadow: '0 -2px 10px rgba(0,0,0,0.04)'
    }}>
      {/* NOVIDADES */}
      <Link href="/" style={itemStyle(isActive('/'))}>
        <div style={{fontSize:24, position:'relative', lineHeight:1}}>
          <span style={{fontSize:22}}>✦</span>
          {isActive('/') && (
            <span style={{
              position:'absolute', top:'-2px', right:'-4px',
              width:'8px', height:'8px', background:'#E5384F', borderRadius:'50%'
            }}></span>
          )}
        </div>
        Novidades
      </Link>

      {/* MENSAGENS - com badge 2 */}
      <Link href="/mensagens" style={itemStyle(isActive('/mensagens'))}>
        <div style={{fontSize:24, position:'relative', lineHeight:1}}>
          <span style={{fontSize:22}}>💬</span>
          <span style={badgeStyle}>2</span>
        </div>
        Mensagens
      </Link>

      {/* NOTIFICAÇÕES - com badge 3 */}
      <Link href="/notificacoes" style={itemStyle(isActive('/notificacoes'))}>
        <div style={{fontSize:24, position:'relative', lineHeight:1}}>
          <span style={{fontSize:22}}>🔔</span>
          <span style={badgeStyle}>3</span>
        </div>
        Notificações
      </Link>
    </div>
  );
}
