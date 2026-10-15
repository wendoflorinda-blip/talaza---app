import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

export default function RequireAuth({ children, onBlock }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  if (!user) {
    return (
      <div onClick={() => onBlock ? onBlock() : router.push('/signup')}>
        {children}
      </div>
    );
  }
  return children;
}

// MODAL QUE APARECE
export function ModalCriarConta({ aberto, fechar }) {
  const router = useRouter();
  if (!aberto) return null;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:16, padding:24, width:'100%', maxWidth:360, textAlign:'center' }}>
        <div style={{ width:56, height:56, background:'#075B4E', borderRadius:'50%', margin:'0 auto 12px', display:'flex', alignItems:'center', justifyContent:'center', color:'#F7C948', fontWeight:900, fontSize:24 }}>T</div>
        <h3 style={{ fontWeight:800, color:'#075B4E' }}>Crie sua conta para continuar</h3>
        <p style={{ fontSize:14, color:'#667781', margin:'8px 0 16px' }}>Para enviar mensagens, comentar na comunidade ou publicar seu negócio, você precisa ter uma conta Talaza.</p>
        
        <button onClick={() => router.push('/signup?type=cliente')} style={{ width:'100%', background:'#F7C948', color:'#075B4E', fontWeight:800, padding:12, borderRadius:10, border:'none', marginBottom:8 }}>Criar conta - Sou Cliente</button>
        <button onClick={() => router.push('/signup?type=vendedor')} style={{ width:'100%', background:'#075B4E', color:'#fff', fontWeight:700, padding:12, borderRadius:10, border:'none' }}>Criar perfil de negócio</button>
        
        <button onClick={fechar} style={{ marginTop:12, background:'none', border:'none', color:'#667781', fontSize:13 }}>Depois</button>
      </div>
    </div>
  )
}
