import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const C = { green:'#08745F', dark:'#06483D', purple:'#64358B', gold:'#D8A319', ink:'#182722', muted:'#66736F', bg:'#F2F4F1', line:'#DDE5E0', white:'#FFFFFF' };

export default function Mensagens() {
  const router = useRouter();
  const [user,setUser] = useState(null);
  const [message,setMessage] = useState('');
  const [messages,setMessages] = useState([]);
  const [attachment,setAttachment] = useState(null);
  const [recording,setRecording] = useState(false);
  const [recordedAudio,setRecordedAudio] = useState(null);
  const [error,setError] = useState('');
  const [sending,setSending] = useState(false);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const endRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({data}) => {
      if (data?.user) setUser(data.user);
      else router.replace('/login');
    });
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({behavior:'smooth'}); }, [messages]);

  function selectAttachment(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setError('O ficheiro deve ter no máximo 15 MB.');
      event.target.value = '';
      return;
    }
    setError('');
    setAttachment(file);
    setRecordedAudio(null);
    event.target.value = '';
  }

  async function toggleRecording() {
    setError('');
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Este navegador não permite gravar áudio. Tente um navegador atualizado e autorize o microfone.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data?.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current,{type:recorder.mimeType || 'audio/webm'});
        setRecordedAudio(blob);
        setAttachment(null);
        stream.getTracks().forEach(track=>track.stop());
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      setError('Não foi possível aceder ao microfone. Verifique a permissão do navegador.');
    }
  }

  function sendMessage(event) {
    event?.preventDefault?.();
    if (!message.trim() && !attachment && !recordedAudio) return;
    setSending(true);
    const item = {
      id: Date.now(),
      text: message.trim(),
      file: attachment ? {name:attachment.name,type:attachment.type,url:attachment.type.startsWith('image/') ? URL.createObjectURL(attachment) : ''} : null,
      audioUrl: recordedAudio ? URL.createObjectURL(recordedAudio) : '',
      createdAt: new Date().toLocaleTimeString('pt-AO',{hour:'2-digit',minute:'2-digit'})
    };
    setMessages(current=>[...current,item]);
    setMessage('');
    setAttachment(null);
    setRecordedAudio(null);
    setSending(false);
  }

  return <main style={S.page}>
    <Head><title>Mensagens | Talaza</title></Head>
    <header style={S.header}>
      <button type="button" onClick={()=>router.back()} style={S.back} aria-label="Voltar">‹</button>
      <div style={S.avatar}>T</div>
      <div style={{flex:1,minWidth:0}}><strong style={S.title}>Mensagens Talaza</strong><div style={S.subtitle}>Converse com clientes e vendedores</div></div>
      <LinkIcon onClick={()=>router.push('/perfil')} />
    </header>
    <div style={S.notice}><span style={S.noticeMark}>i</span><span>As conversas terão etiquetas de origem — Vitrine, Contratar ou Comunidade Talaza — quando forem ligadas às conversas reais.</span></div>
    <section style={S.chat}>
      {messages.length===0 ? <div style={S.empty}>
        <div style={S.emptyIcon}>✉</div><h2>As suas conversas</h2>
        <p>Quando receber ou iniciar uma conversa, ela aparecerá aqui. Pode experimentar o campo de mensagem, anexos e áudio nesta interface.</p>
      </div> : messages.map(item=><div key={item.id} style={S.messageRow}><div style={S.bubble}>
        {item.text && <div style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{item.text}</div>}
        {item.file?.url && <img src={item.file.url} alt={item.file.name} style={S.attachmentImage}/>}
        {item.file && !item.file.url && <div style={S.fileChip}>📎 {item.file.name}</div>}
        {item.audioUrl && <audio controls src={item.audioUrl} style={{maxWidth:'100%'}}/>}
        <div style={S.time}>{item.createdAt} · rascunho local</div>
      </div></div>)}
      <div ref={endRef}/>
    </section>
    <form style={S.composer} onSubmit={sendMessage}>
      <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf" onChange={selectAttachment} hidden/>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={selectAttachment} hidden/>
      <button type="button" onClick={()=>fileRef.current?.click()} style={S.tool} aria-label="Anexar imagem ou ficheiro" title="Anexar imagem ou ficheiro">＋</button>
      <button type="button" onClick={()=>cameraRef.current?.click()} style={S.tool} aria-label="Tirar fotografia" title="Tirar fotografia">▧</button>
      <div style={S.inputWrap}>
        {attachment && <div style={S.selectedFile}>📎 {attachment.name}<button type="button" onClick={()=>setAttachment(null)} style={S.removeFile}>×</button></div>}
        {recordedAudio && <div style={S.selectedFile}>🎙 Áudio gravado<button type="button" onClick={()=>setRecordedAudio(null)} style={S.removeFile}>×</button></div>}
        <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Escreva uma mensagem" rows={1} style={S.input} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage(e);}}}/>
      </div>
      {message.trim() || attachment || recordedAudio ? <button type="submit" style={S.send} disabled={sending} aria-label="Enviar">➤</button> :
        <button type="button" onClick={toggleRecording} style={{...S.send,background:recording?'#B93845':C.green}} aria-label={recording?'Parar gravação':'Gravar áudio'}>{recording?'■':'🎙'}</button>}
    </form>
    {recording && <div style={S.recording}>● A gravar áudio… toque no quadrado para terminar.</div>}
    {error && <div role="alert" style={S.error}>{error}</div>}
    <div style={S.footer}>A sincronização das mensagens entre utilizadores será ligada ao esquema de conversas do Supabase.</div>
  </main>;
}
function LinkIcon({onClick}) { return <button type="button" onClick={onClick} style={S.profileButton} aria-label="Abrir perfil">♙</button>; }
const S={
 page:{height:'100dvh',minHeight:520,display:'flex',flexDirection:'column',background:C.bg,color:C.ink,fontFamily:'Arial,Helvetica,sans-serif',overflow:'hidden'},
 header:{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:C.dark,color:C.white,boxShadow:'0 3px 12px rgba(0,0,0,.08)'},
 back:{border:0,background:'transparent',color:'#fff',fontSize:31,cursor:'pointer',lineHeight:1},
 avatar:{display:'grid',placeItems:'center',width:43,height:43,borderRadius:'50%',background:'linear-gradient(135deg,'+C.purple+','+C.gold+')',color:'#fff',fontWeight:900,fontSize:20},
 title:{display:'block',fontSize:15},
 subtitle:{marginTop:4,fontSize:11,color:'rgba(255,255,255,.72)'},
 profileButton:{width:38,height:38,border:'1px solid rgba(255,255,255,.3)',borderRadius:'50%',background:'transparent',color:'#fff',fontSize:20,cursor:'pointer'},
 notice:{display:'flex',gap:10,alignItems:'flex-start',padding:'10px 15px',background:C.purpleSoft||'#F2EAF9',color:C.purple,fontSize:11,lineHeight:1.5},
 noticeMark:{display:'grid',placeItems:'center',flex:'0 0 18px',height:18,borderRadius:'50%',background:C.purple,color:'#fff',fontWeight:900},
 chat:{flex:1,overflowY:'auto',padding:'24px 16px 20px',backgroundColor:'#F4F0E8',backgroundImage:'radial-gradient(rgba(100,53,139,.055) .8px,transparent .8px)',backgroundSize:'17px 17px'},
 empty:{maxWidth:420,margin:'8vh auto 0',padding:25,borderRadius:20,background:'rgba(255,255,255,.94)',textAlign:'center',boxShadow:'0 7px 25px rgba(30,40,35,.05)'},
 emptyIcon:{margin:'0 auto',display:'grid',placeItems:'center',width:56,height:56,borderRadius:18,background:'#F2EAF9',color:C.purple,fontSize:27},
 emptyTitle:{fontSize:18},
 messageRow:{display:'flex',justifyContent:'flex-end',margin:'9px 0'},
 bubble:{maxWidth:'min(78%,520px)',padding:'11px 13px',borderRadius:'15px 15px 4px 15px',background:'#E2F5E9',boxShadow:'0 1px 2px rgba(0,0,0,.06)',fontSize:14,lineHeight:1.5},
 time:{textAlign:'right',fontSize:9,color:C.muted,marginTop:6},
 attachmentImage:{display:'block',maxWidth:'100%',maxHeight:250,borderRadius:10,marginTop:6},
 fileChip:{padding:9,background:'rgba(255,255,255,.6)',borderRadius:9,marginTop:5,fontSize:12},
 composer:{display:'flex',alignItems:'flex-end',gap:7,padding:'10px 12px',background:'#fff',borderTop:'1px solid '+C.line},
 tool:{flex:'0 0 37px',width:37,height:42,border:0,borderRadius:12,background:'#F2EAF9',color:C.purple,fontSize:23,fontWeight:800,cursor:'pointer'},
 inputWrap:{flex:1,minWidth:0,border:'1px solid '+C.line,borderRadius:17,padding:'6px 12px',background:'#FBFCFB'},
 input:{width:'100%',resize:'none',border:0,outline:0,background:'transparent',fontSize:14,lineHeight:1.5,maxHeight:110,color:C.ink},
 send:{flex:'0 0 43px',width:43,height:43,border:0,borderRadius:'50%',background:C.green,color:'#fff',fontSize:20,fontWeight:900,cursor:'pointer'},
 selectedFile:{display:'flex',alignItems:'center',gap:8,fontSize:11,color:C.purple,marginBottom:5,overflowWrap:'anywhere'},
 removeFile:{border:0,background:'transparent',color:C.purple,fontSize:18,cursor:'pointer',marginLeft:'auto'},
 recording:{padding:'8px 15px',background:'#FFF0F0',color:'#B93845',fontSize:12,fontWeight:800},
 error:{margin:8,padding:10,borderRadius:9,background:'#FFF0F0',color:'#A52F3B',fontSize:12},
 footer:{padding:'6px 12px',textAlign:'center',fontSize:9,color:C.muted,background:'#fff'}
};
