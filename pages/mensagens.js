import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Mensagens() {
  const router = useRouter();
  const { country, province } = router.query;

  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getSession();
      const isAuth = !!data?.session?.user;
      setAuth(isAuth);
      
      if (isAuth) {
        const { data: profile } = await supabase.from('profiles').select('name').eq('id', data.session.user.id).maybeSingle();
        if (profile?.name) setUserName(profile.name);
      }
      setLoading(false);
    }
    check();
  }, []);

  if (loading) return <div style={{padding:40,textAlign:'center', color:'#075B4E'}}>A verificar...</div>;

  // NÃO LOGADO - COM BOTÕES CERTOS
  if (!auth) {
    return (
      <main style={{minHeight:'100vh', background:'#F8F6F3', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px 20px 100px'}}>
        <div style={{maxWidth:380, width:'100%', background:'#fff', borderRadius:24, padding:28, border:'1px solid #E7E3D8', textAlign:'center'}}>
          <div style={{width:56,height:56, background:'#EAF4F1', borderRadius:16, display:'grid', placeItems:'center', margin:'0 auto 16px', fontSize:28}}>💬</div>
          <h1 style={{color:'#075B4E', fontSize:22, margin:'0 0 8px'}}>Talaza</h1>
          <p style={{color:'#66726D', fontSize:15, margin:'0 0 24px', lineHeight:1.5}}>
            Inicie sessão para acessar às suas conversas.
          </p>
          
          <Link href="/login" style={{textDecoration:'none'}}>
            <button style={{width:'100%', height:48, borderRadius:12, background:'#075B4E', color:'#fff', border:'none', fontWeight:800, fontSize:15, cursor:'pointer'}}>
              Iniciar sessão
            </button>
          </Link>

          <Link href={{ pathname: '/signup', query: { country, province, next: 'mensagens' } }} style={{textDecoration:'none'}}>
            <button style={{width:'100%', height:48, borderRadius:12, background:'#fff', color:'#075B4E', border:'1px solid #075B4E', fontWeight:800, fontSize:15, cursor:'pointer', marginTop:12}}>
              Criar conta
            </button>
          </Link>
        </div>
      </main>
    );
  }

  // LOGADO - LIBERA TANTO CLIENTE QUANTO VENDEDOR
  return (
    <div style={{display:'flex', flexDirection:'column', height:'100vh', background:'#E5DDD5'}}>
      <div style={{background:'#fff', height:60, display:'flex', alignItems:'center', padding:'0 12px', gap:10, borderBottom:'1px solid #e0d8cc'}}>
        <Link href={country ? `/explore?country=${country}&province=${province}` : '/'} style={{fontSize:20, textDecoration:'none'}}>←</Link>
        <div style={{width:38, height:38, background:'#075B4E', borderRadius:'50%', display:'grid', placeItems:'center', color:'#fff', fontWeight:700}}>T</div>
        <div>
          <div style={{fontWeight:700, fontSize:14}}>Mensagens {userName ? `- ${userName}` : ''}</div>
          <div style={{fontSize:11, color:'#666'}}>Online</div>
        </div>
      </div>
      <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, padding:20}}>
        <div style={{fontSize:40}}>💬</div>
        <p style={{color:'#555'}}>Bem-vindo! Suas conversas aparecerão aqui.</p>
        <p style={{color:'#8A9A94', fontSize:12}}>Vendedor ou cliente, você já está liberado.</p>
      </div>
    </div>
  );
}

Mensagens.showMessageDock = false;
