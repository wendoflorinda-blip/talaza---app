import { useState } from 'react';

export default function ChatPanel() {
  const [texto, setTexto] = useState('');
  const [mensagens, setMensagens] = useState([
    {id:1, texto:'Olá! Como posso ajudar?', tipo:'recebida'},
    {id:2, texto:'Esta empresa está agora a usar um serviço seguro da Meta para gerir esta conversa.', tipo:'sistema'},
  ]);

  const enviar = () => {
    if(!texto.trim()) return;
    setMensagens([...mensagens, {id:Date.now(), texto, tipo:'enviada'}]);
    setTexto('');
  };

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100vh', background:'#EFE7DE'}}>
      {/* HEADER igual ao seu print */}
      <div style={{height:64, background:'#FFFFFF', display:'flex', alignItems:'center', padding:'0 12px', gap:12, borderBottom:'1px solid #E0D8CC'}}>
        <span style={{fontSize:24}}>←</span>
        <div style={{width:40, height:40, borderRadius:'50%', background:'#FF8C00', display:'grid', placeItems:'center', color:'#fff', fontWeight:700}}>U</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:700, color:'#111', fontSize:15}}>Apoio ao cliente</div>
          <div style={{fontSize:12, color:'#666'}}>UNITEL, SA • Conta empresarial</div>
        </div>
        <span style={{fontSize:22}}>⋮</span>
      </div>

      {/* ÁREA DAS MENSAGENS com fundo do WhatsApp */}
      <div style={{
        flex:1, 
        overflowY:'auto', 
        padding:'12px',
        backgroundImage:`url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
        backgroundColor:'#E5DDD5'
      }}>
        <div style={{background:'#fff', borderRadius:8, padding:'6px 12px', margin:'12px auto', width:'fit-content', fontSize:12, boxShadow:'0 1px 1px rgba(0,0,0,.1)'}}>
          1 de maio de 2026
        </div>

        <div style={{background:'#DCF8C6', borderRadius:8, padding:'10px 12px', margin:'8px 0', fontSize:14, color:'#333', maxWidth:'85%', boxShadow:'0 1px 1px rgba(0,0,0,.1)'}}>
          Esta empresa usa um serviço seguro da Meta para gerir esta conversa. Toque para saber mais.
        </div>

        <div style={{background:'#fff', borderRadius:8, padding:'6px 12px', margin:'12px auto', width:'fit-content', fontSize:12}}>Hoje</div>

        {mensagens.map(m => (
          <div key={m.id} style={{
            background: m.tipo==='enviada' ? '#DCF8C6' : '#FFFFFF',
            alignSelf: m.tipo==='enviada' ? 'flex-end' : 'flex-start',
            marginLeft: m.tipo==='enviada' ? 'auto' : 0,
            borderRadius:8, padding:'8px 10px', margin:'6px 0',
            maxWidth:'80%', fontSize:14, boxShadow:'0 1px 1px rgba(0,0,0,.1)'
          }}>
            {m.texto}
          </div>
        ))}
      </div>

      {/* BARRA DE DIGITAR igual ao print */}
      <div style={{background:'#F0F0F0', padding:'8px 10px', display:'flex', alignItems:'center', gap:8}}>
        <div style={{flex:1, background:'#fff', borderRadius:24, display:'flex', alignItems:'center', padding:'0 12px', height:44}}>
          <span style={{fontSize:22, marginRight:8}}>☺</span>
          <input 
            value={texto}
            onChange={e=>setTexto(e.target.value)}
            onKeyDown={e=> e.key==='Enter' && enviar()}
            placeholder="Mensagem" 
            style={{flex:1, border:'none', outline:'none', fontSize:15}}
          />
          <span style={{fontSize:20, marginLeft:8}}>📎</span>
          <span style={{fontSize:20, marginLeft:12}}>📷</span>
        </div>
        <div onClick={enviar} style={{width:46, height:46, borderRadius:'50%', background:'#25D366', display:'grid', placeItems:'center', color:'#fff', fontSize:22, cursor:'pointer'}}>
          {texto ? '➤' : '🎤'}
        </div>
      </div>
    </div>
  );
}
