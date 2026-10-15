import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Mensagens() {
  const [mensagem, setMensagem] = useState('');
  const [user, setUser] = useState(null);
  const [conversas, setConversas] = useState([]);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  function enviarMensagem(e) {
    e.preventDefault();
    if (!mensagem.trim()) return;
    // aqui entra sua lógica de enviar para supabase
    console.log('Enviando:', mensagem);
    setMensagem('');
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'#E5DDD5' }}>
      {/* HEADER */}
      <div style={{ height:60, background:'#F0F2F5', display:'flex', alignItems:'center', padding:'0 16px', borderBottom:'1px solid #E0E0E0' }}>
        <div style={{ width:40, height:40, borderRadius:'50%', background:'#075B4E', color:'#F7C948', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900 }}>T</div>
        <div style={{ marginLeft:12 }}>
          <div style={{ fontWeight:700, fontSize:14, color:'#111B21' }}>Mensagens - {user?.user_metadata?.full_name || 'Bem-vinda'}</div>
          <div style={{ fontSize:11, color:'#667781' }}>Online</div>
        </div>
      </div>

      {/* ÁREA DO CHAT - COM SEU FUNDO */}
      <div style={{ 
        flex:1, 
        backgroundColor:'#E5DDD5',
        backgroundImage:`url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d1d7db' fill-opacity='0.4'%3E%3Cpath d='M20 20c0-5 4-9 9-9s9 4 9 9-4 9-9 9-9-4-9-9z'/%3E%3C/g%3E%3C/svg%3E")`,
        display:'flex', 
        flexDirection:'column', 
        alignItems:'center', 
        justifyContent: conversas.length === 0 ? 'center' : 'flex-start',
        padding:20,
        overflowY:'auto'
      }}>
        {conversas.length === 0 ? (
          <div style={{ textAlign:'center', background:'#fff', padding:20, borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,.1)' }}>
            <div style={{ fontSize:32 }}>💬</div>
            <p style={{ color:'#667781', fontSize:13, marginTop:8 }}>Bem-vindo! Suas conversas aparecerão aqui.</p>
            <p style={{ color:'#8696A0', fontSize:11, marginTop:6 }}>Vendedor ou cliente, você já está liberado.</p>
          </div>
        ) : (
          conversas.map(c => <div key={c.id}>{c.text}</div>)
        )}
      </div>

      {/* BARRA DE BAIXO - ESSA QUE SUMIU - AGORA SEMPRE VISÍVEL */}
      <div style={{ 
        background:'#F0F2F5', 
        padding:'8px 12px', 
        display:'flex', 
        alignItems:'center', 
        gap:8 
      }}>
        <div style={{ 
          flex:1, 
          background:'#fff', 
          borderRadius:24, 
          display:'flex', 
          alignItems:'center', 
          padding:'6px 12px',
          gap:8
        }}>
          <button type="button" style={iconBtn}>☺</button>
          <input
            value={mensagem}
            onChange={e=>setMensagem(e.target.value)}
            placeholder="Mensagem"
            style={{ flex:1, border:'none', outline:'none', fontSize:15, padding:'6px 0' }}
            onKeyDown={e=>{ if(e.key==='Enter') enviarMensagem(e) }}
          />
          <button type="button" onClick={()=>fileInputRef.current?.click()} style={iconBtn}>📎</button>
          <button type="button" onClick={()=>cameraInputRef.current?.click()} style={iconBtn}>📷</button>
        </div>
        
        <button 
          onClick={enviarMensagem}
          style={{ 
            width:48, height:48, borderRadius:'50%', background:'#075B4E', 
            border:'none', color:'#fff', fontSize:22, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center'
          }}
        >
          {mensagem.trim() ? '➤' : '🎤'}
        </button>

        {/* inputs escondidos */}
        <input ref={fileInputRef} type="file" hidden />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden />
      </div>
    </div>
  );
}

const iconBtn = { border:'none', background:'transparent', fontSize:20, cursor:'pointer', color:'#54656F', width:32, height:32 };
