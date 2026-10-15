import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

export default function Mensagens() {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState(false);

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getSession();
      setAuth(!!data?.session?.user);
      setLoading(false);
    }
    check();
  }, []);

  if (loading) return <div style={{padding:40,textAlign:'center'}}>A verificar...</div>;

  // SE NÃO ESTÁ LOGADO - MOSTRA A CAIXINHA COM 2 BOTÕES
  if (!auth) {
    return (
      <main style={{minHeight:'100vh', background:'#F8F6F3', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px 20px 100px'}}>
        <div style={{maxWidth:380, width:'100%', background:'#fff', borderRadius:24, padding:28, border:'1px solid #E7E3D8', textAlign:'center', boxShadow:'0 4px 20px rgba(11,59,45,0.06)'}}>
          <h1 style={{color:'#0B3B2D', fontSize:28, margin:'0 0 12px'}}>Talaza</h1>
          <p style={{color:'#66726D', fontSize:15, margin:'0 0 24px', lineHeight:1.5}}>
            Inicie sessão para acessar às suas conversas. Você pode explorar tudo, mas para conversar precisa de uma conta.
          </p>
          
          <Link href="/login" style={{textDecoration:'none'}}>
            <button style={{width:'100%', height:48, borderRadius:12, background:'#0B4A3A', color:'#fff', border:'none', fontWeight:700, fontSize:15, cursor:'pointer'}}>
              Iniciar sessão
            </button>
          </Link>

          <Link href="/register" style={{textDecoration:'none'}}>
            <button style={{width:'100%', height:48, borderRadius:12, background:'#fff', color:'#0B4A3A', border:'1px solid #0B4A3A', fontWeight:700, fontSize:15, cursor:'pointer', marginTop:12}}>
              Criar conta
            </button>
          </Link>

          <Link href="/" style={{display:'block', marginTop:16, color:'#8A9A94', fontSize:13, textDecoration:'none'}}>
            Continuar explorando →
          </Link>
        </div>
      </main>
    );
  }

  // SE ESTÁ LOGADO - PAINEL WHATSAPP
  return (
    <div style={{display:'flex', flexDirection:'column', height:'100vh', background:'#E5DDD5'}}>
      <div style={{background:'#fff', height:60, display:'flex', alignItems:'center', padding:'0 12px'}}>
        <div style={{width:38, height:38, background:'#0B4A3A', borderRadius:'50%', display:'grid', placeItems:'center', color:'#fff', fontWeight:700}}>T</div>
        <div style={{marginLeft:10}}><b style={{fontSize:14}}>Talaza</b><div style={{fontSize:11, color:'#666'}}>Online</div></div>
      </div>
      <div style={{flex:1, padding:20, textAlign:'center', color:'#555'}}>
        Suas conversas aparecerão aqui 💬
      </div>
    </div>
  );
}

Mensagens.showMessageDock = false;
