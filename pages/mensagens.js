import { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const C = { green:'#08745F', dark:'#06483D', purple:'#64358B', gold:'#D8A319', ink:'#182722', muted:'#66736F', bg:'#F2F4F1', line:'#DDE5E0', white:'#FFFFFF' };
const safe = value => Array.isArray(value) ? value[0] : value;
const sourceNames = ['Vitrine','Contratar','Comunidade Talaza','Oportunidades','Eventos','Ebooks','Outro'];

export default function Mensagens() {
  const router = useRouter();
  const [user,setUser] = useState(null);
  const [profile,setProfile] = useState(null);
  const [conversations,setConversations] = useState([]);
  const [activeId,setActiveId] = useState('');
  const [activePeer,setActivePeer] = useState(null);
  const [messages,setMessages] = useState([]);
  const [message,setMessage] = useState('');
  const [loading,setLoading] = useState(true);
  const [sending,setSending] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [selectedFile,setSelectedFile] = useState(null);
  const [recording,setRecording] = useState(false);
  const [recordingSupported,setRecordingSupported] = useState(false);
  const fileRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const endRef = useRef(null);

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) { setMessages([]); return; }
    const { data, error: queryError } = await supabase
      .from('talaza_messages').select('*')
      .eq('conversation_id', conversationId).order('created_at', { ascending:true }).limit(300);
    if (queryError) { setError('Não foi possível carregar as mensagens. Confirme se a migração de mensagens foi executada no Supabase.'); return; }
    const hydrated = await Promise.all((data || []).map(async item => {
      if (!item.storage_path) return item;
      const { data: signed } = await supabase.storage.from('message-media').createSignedUrl(item.storage_path,3600);
      return { ...item, attachment_url:signed?.signedUrl || '' };
    }));
    setMessages(hydrated);
  }, []);

  const loadConversations = useCallback(async (currentUser) => {
    const { data: memberships, error: memberError } = await supabase
      .from('conversation_participants').select('conversation_id')
      .eq('user_id', currentUser.id);
    if (memberError) { console.error('Erro ao consultar conversation_participants:', memberError); throw new Error('Não foi possível consultar os participantes das conversas: ' + (memberError.message || memberError.code || 'erro desconhecido') + '. Verifique as permissões desta tabela no Supabase.'); }
    const ids = [...new Set((memberships || []).map(row => row.conversation_id))];
    if (!ids.length) { setConversations([]); return []; }
    const { data: rows, error: conversationsError } = await supabase
      .from('conversations').select('id,source,source_id,province_id,created_at,updated_at')
      .in('id', ids).order('updated_at', { ascending:false });
    if (conversationsError) throw conversationsError;
    const { data: participants, error: participantsError } = await supabase
      .from('conversation_participants').select('conversation_id,user_id').in('conversation_id', ids);
    if (participantsError) throw participantsError;
    const peerIds = [...new Set((participants || []).filter(p => p.user_id !== currentUser.id).map(p => p.user_id))];
    let profiles = [];
    if (peerIds.length) {
      const { data, error: profilesError } = await supabase.from('profiles')
        .select('*').in('id', peerIds);
      if (profilesError) throw profilesError;
      profiles = data || [];
    }
    const enriched = (rows || []).map(row => {
      const peer = (participants || []).find(p => p.conversation_id === row.id && p.user_id !== currentUser.id);
      const peerProfile = profiles.find(p => p.id === peer?.user_id);
      return { ...row, peerId:peer?.user_id || '', peerName:peerProfile?.name || peerProfile?.full_name || 'Utilizador Talaza', peerPhoto:peerProfile?.avatar_url || peerProfile?.photo_url || peerProfile?.photo || '' };
    });
    setConversations(enriched);
    return enriched;
  }, []);

  const openConversation = useCallback(async (conversation, peer) => {
    setActiveId(conversation.id);
    setActivePeer(peer || { id:conversation.peerId, name:conversation.peerName, photo:conversation.peerPhoto });
    setError('');
    setNotice('');
    await loadMessages(conversation.id);
    if (router.query.conversation !== conversation.id) {
      router.replace({ pathname:'/mensagens', query:{ conversation:conversation.id } }, undefined, { shallow:true });
    }
  }, [loadMessages, router]);

  useEffect(() => {
    if (!router.isReady) return;
    let cancelled = false;
    async function initialise() {
      setLoading(true); setError(''); setNotice('');
      const { data:{ user:currentUser }, error:authError } = await supabase.auth.getUser();
      if (authError || !currentUser) { router.replace('/login?redirect=' + encodeURIComponent(router.asPath || '/mensagens')); return; }
      if (cancelled) return;
      setUser(currentUser);
      const { data:currentProfile, error:profileError } = await supabase.from('profiles')
        .select('*')
        .eq('id',currentUser.id).maybeSingle();
      if (profileError) { console.error('Falha ao consultar o perfil do utilizador nas mensagens:', profileError); setProfile(null); setNotice('Não foi possível ler o seu perfil pessoal na tabela profiles. A mensagem interna não pode iniciar sem confirmar a sua província principal. Detalhe técnico: ' + (profileError.message || profileError.code || 'erro não identificado') + '.'); }
      setProfile(currentProfile || null);
      let rows = [];
      try { rows = await loadConversations(currentUser); }
      catch (err) {
        console.error(err);
        setError('Não foi possível carregar as conversas: ' + (err?.message || err?.code || 'erro não identificado') + '. Não execute SQL novamente antes de confirmar este erro e as permissões das tabelas.');
      }
      if (cancelled) return;
      const requestedId = safe(router.query.conversation);
      if (requestedId) {
        const found = rows.find(row => row.id === requestedId);
        if (found) {
          setActiveId(found.id);
          setActivePeer({id:found.peerId,name:found.peerName,photo:found.peerPhoto});
          await loadMessages(found.id);
        }
      } else {
        const targetId = safe(router.query.to);
        if (targetId && targetId !== currentUser.id) {
          try {
            if (!currentProfile?.province_id) throw new Error('Não foi possível iniciar a mensagem interna porque o seu perfil pessoal não devolveu a província principal. Confirme se existe a linha em profiles com id igual ao ID desta conta e se province_id está preenchido. Se aparecer erro de permissão, é necessário corrigir a política de leitura do próprio perfil no Supabase.');
            const { data:target, error:targetError } = await supabase.from('profiles')
              .select('*').eq('id',targetId).maybeSingle();
            if (targetError || !target) throw new Error('Não foi possível encontrar este perfil.');
            if (!target.province_id || String(target.province_id) !== String(currentProfile.province_id)) {
              throw new Error('As mensagens estão limitadas à província principal de cada utilizador.');
            }
            const { data:myMemberships, error:myMembershipError } = await supabase.from('conversation_participants')
              .select('conversation_id').eq('user_id',currentUser.id);
            if (myMembershipError) throw myMembershipError;
            const myIds = (myMemberships || []).map(x => x.conversation_id);
            let existing = null;
            if (myIds.length) {
              const { data:theirMemberships, error:theirError } = await supabase.from('conversation_participants')
                .select('conversation_id').eq('user_id',targetId).in('conversation_id',myIds);
              if (theirError) throw theirError;
              const shared = (theirMemberships || []).map(x => x.conversation_id);
              existing = rows.find(row => shared.includes(row.id)) || null;
            }
            if (existing) {
              setActiveId(existing.id);
              setActivePeer({id:target.id,name:target.name || target.full_name || 'Utilizador Talaza',photo:target.avatar_url || target.photo_url || target.photo || ''});
              await loadMessages(existing.id);
            } else {
              const requestedSource = safe(router.query.source) || 'Vitrine';
              const source = sourceNames.includes(requestedSource) ? requestedSource : 'Vitrine';
              const { data:created, error:createError } = await supabase.from('conversations')
                .insert({created_by:currentUser.id,province_id:currentProfile.province_id,source,source_id:safe(router.query.sourceId) || null})
                .select('id,source,source_id,province_id,created_at,updated_at').single();
              if (createError) throw createError;
              const { error:joinError } = await supabase.from('conversation_participants').insert([
                {conversation_id:created.id,user_id:currentUser.id},
                {conversation_id:created.id,user_id:targetId}
              ]);
              if (joinError) throw joinError;
              const newConversation = {...created,peerId:target.id,peerName:target.name || target.full_name || 'Utilizador Talaza',peerPhoto:target.avatar_url || target.photo_url || target.photo || ''};
              setConversations(previous => [newConversation,...previous]);
              setActiveId(created.id);
              setActivePeer({id:target.id,name:newConversation.peerName,photo:newConversation.peerPhoto});
              router.replace({pathname:'/mensagens',query:{conversation:created.id}},undefined,{shallow:true});
              await loadMessages(created.id);
            }
          } catch (err) {
            setError(err.message || 'Não foi possível iniciar esta conversa.');
          }
        }
      }
      if (!cancelled) setLoading(false);
    }
    initialise();
    return () => { cancelled = true; };
  }, [router.isReady, router.query.conversation, router.query.to, router.query.source, router.query.sourceId, loadConversations, loadMessages, router]);

  useEffect(() => {
    setRecordingSupported(typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined');
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({behavior:'smooth',block:'end'});
  }, [messages]);

  useEffect(() => {
    if (!activeId) return;
    const channel = supabase.channel('talaza-messages-'+activeId)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'talaza_messages',filter:'conversation_id=eq.'+activeId}, async payload => {
        let next = payload.new;
        if (next.storage_path) { const { data } = await supabase.storage.from('message-media').createSignedUrl(next.storage_path,3600); next = {...next,attachment_url:data?.signedUrl || ''}; }
        setMessages(previous => previous.some(item => item.id === next.id) ? previous : [...previous,next]);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeId]);

  async function sendMessage(event) {
    event?.preventDefault?.();
    if (!activeId) { setNotice('Para enviar uma mensagem, abra uma conversa existente ou toque em “Enviar mensagem” no perfil da pessoa/negócio. Assim a mensagem chega ao destinatário certo.'); return; }
    if (!user || (!message.trim() && !selectedFile) || sending) return;
    setSending(true); setError(''); setNotice('');
    try {
      let attachmentPath = null;
      let attachmentName = null;
      let messageType = 'text';
      let body = message.trim() || null;
      if (selectedFile) {
        if (selectedFile.size > 15 * 1024 * 1024) throw new Error('O ficheiro excede 15 MB. Escolha um ficheiro menor.');
        const ext = (selectedFile.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g,'') || 'bin';
        attachmentPath = user.id + '/' + activeId + '/' + Date.now() + '.' + ext;
        attachmentName = selectedFile.name;
        messageType = selectedFile.type.startsWith('audio/') ? 'audio' : selectedFile.type.startsWith('image/') ? 'image' : 'file';
        const { error: uploadError } = await supabase.storage.from('message-media').upload(attachmentPath, selectedFile, { upsert:false, contentType:selectedFile.type || 'application/octet-stream' });
        if (uploadError) throw new Error('Não foi possível anexar o ficheiro: ' + uploadError.message + '. Confirme se executou a atualização de supabase_talaza_messaging_safe.sql e se o bucket message-media existe.');
      }
      const { data, error:sendError } = await supabase.from('talaza_messages')
        .insert({conversation_id:activeId,sender_id:user.id,body,storage_path:attachmentPath,attachment_name:attachmentName,message_type:messageType})
        .select('*').single();
      if (sendError) throw new Error('O ficheiro foi carregado, mas a mensagem não foi guardada: ' + sendError.message + '. Confirme a migração supabase_talaza_messaging_safe.sql.');
      let rendered = data;
      if (data.storage_path) {
        const { data: signed } = await supabase.storage.from('message-media').createSignedUrl(data.storage_path,3600);
        rendered = {...data,attachment_url:signed?.signedUrl || ''};
      }
      setMessages(previous => previous.some(item => item.id === rendered.id) ? previous : [...previous,rendered]);
      setMessage(''); setSelectedFile(null);
      await supabase.from('conversations').update({updated_at:new Date().toISOString()}).eq('id',activeId);
    } catch (err) {
      console.error('Falha ao enviar mensagem:',err);
      setError(err.message || 'Não foi possível enviar a mensagem. Verifique a configuração das mensagens no Supabase.');
    } finally { setSending(false); }
  }

  async function startRecording() {
    if (!activeId) { setNotice('Abra primeiro uma conversa para gravar e enviar áudio à pessoa certa.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder; chunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data?.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current,{type:recorder.mimeType || 'audio/webm'});
        const file = new File([blob],'audio-'+Date.now()+'.webm',{type:blob.type});
        setSelectedFile(file); stream.getTracks().forEach(track=>track.stop()); setRecording(false);
        setNotice('Áudio gravado. Toque em Enviar para o partilhar na conversa.');
      };
      recorder.start(); setRecording(true); setError(''); setNotice('A gravar áudio… toque novamente no botão para terminar.');
    } catch (err) {
      console.error(err);
      setError('Não foi possível gravar áudio. Permita o acesso ao microfone no navegador e tente novamente.');
    }
  }

  function toggleRecording() {
    if (recording && recorderRef.current) recorderRef.current.stop();
    else startRecording();
  }

  async function openAttachment(item) {
    if (!item.storage_path) return;
    const { data, error: urlError } = await supabase.storage.from('message-media').createSignedUrl(item.storage_path,3600);
    if (urlError || !data?.signedUrl) { setError('Não foi possível abrir este anexo. Confirme se o bucket message-media e as permissões estão configurados.'); return; }
    window.open(data.signedUrl,'_blank','noopener,noreferrer');
  }

  function backToList() {
    setActiveId(''); setActivePeer(null); setMessages([]);
    router.replace('/mensagens',undefined,{shallow:true});
  }

  if (loading) return <main style={S.center}>A carregar mensagens…</main>;

  return <main style={S.page}>
    <Head><title>Mensagens | Talaza</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
    <header style={S.header}>
      {activeId && <button type="button" onClick={backToList} style={S.back} aria-label="Voltar às conversas">‹</button>}
      <div style={S.brandMark}>T</div>
      <div style={{flex:1,minWidth:0}}>
        <strong style={S.title}>{activeId ? (activePeer?.name || 'Conversa') : 'Mensagens Talaza'}</strong>
        <div style={S.subtitle}>{activeId ? 'Conversa privada' : 'As suas conversas'}</div>
      </div>
      {activeId && activePeer?.photo ? <img src={activePeer.photo} alt="" style={S.headerPhoto}/> : null}
    </header>
    {error && <div role="alert" style={S.error}>{error}</div>}
    {notice && <div role="status" style={S.notice}>{notice}</div>}
    {!activeId ? <section style={S.list}>
      <div style={S.sectionTitle}>As suas conversas</div>
      {conversations.length === 0 ? <div style={S.empty}>
        <div style={S.emptyIcon}>✉</div><h2>Ainda não tem conversas</h2>
        <p>A área de escrita fica disponível em baixo. Para enviar, escolha primeiro a pessoa: abra o perfil de um negócio ou utilizador e toque em “Enviar mensagem”.</p>
        <button type="button" onClick={()=>router.push('/explore')} style={S.primaryButton}>Explorar a Talaza</button>
      </div> : conversations.map(item => <button type="button" key={item.id} onClick={()=>openConversation(item)} style={S.conversationRow}>
        {item.peerPhoto ? <img src={item.peerPhoto} alt="" style={S.avatarPhoto}/> : <div style={S.avatar}>{(item.peerName || 'T').slice(0,1).toUpperCase()}</div>}
        <span style={S.conversationInfo}><strong>{item.peerName}</strong><small>{item.source || 'Talaza'} · abrir conversa</small></span>
        <span style={S.chevron}>›</span>
      </button>)}
    </section> : null}
    <section style={S.chat} aria-label="Mensagens da conversa">
      {!activeId ? <div style={S.emptyChat}>Escolha uma conversa para ver mensagens e enviar texto, ficheiros ou áudio.</div> : messages.length===0 ? <div style={S.emptyChat}>Esta conversa começou agora. Envie a primeira mensagem.</div> : messages.map(item=><div key={item.id} style={{...S.messageRow,justifyContent:item.sender_id===user?.id?'flex-end':'flex-start'}}>
        <div style={{...S.bubble,background:item.sender_id===user?.id?'#E0F4E8':'#FFFFFF',borderRadius:item.sender_id===user?.id?'15px 15px 4px 15px':'15px 15px 15px 4px'}}>
          {item.body && <div style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{item.body}</div>}
          {item.storage_path && <div style={{marginTop:item.body?8:0}}>
            {item.message_type==='audio' && item.attachment_url ? <audio controls src={item.attachment_url} style={{maxWidth:'100%'}}/> : item.message_type==='image' && item.attachment_url ? <a href={item.attachment_url} target="_blank" rel="noreferrer"><img src={item.attachment_url} alt={item.attachment_name || 'Imagem enviada'} style={{maxWidth:220,maxHeight:220,objectFit:'contain',borderRadius:10}}/></a> : <button type="button" onClick={()=>openAttachment(item)} style={S.fileLink}>📎 {item.attachment_name || 'Abrir ficheiro'}</button>}
          </div>}
          <div style={S.time}>{new Date(item.created_at).toLocaleTimeString('pt-AO',{hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      </div>)}
      <div ref={endRef}/>
    </section>
    {activeId && selectedFile && <div style={S.filePreview}>📎 {selectedFile.name} <button type="button" onClick={()=>setSelectedFile(null)} style={S.removeFile}>Remover</button></div>}
    {activeId && <form style={S.composer} onSubmit={sendMessage}>
      <input ref={fileRef} type="file" onChange={event=>setSelectedFile(event.target.files?.[0] || null)} hidden />
      <button type="button" onClick={()=>fileRef.current?.click()} style={S.toolButton} title="Anexar ficheiro" aria-label="Anexar ficheiro">＋</button>
      <button type="button" onClick={toggleRecording} disabled={!recordingSupported} style={{...S.toolButton,color:recording?'#C62828':C.purple}} title={recording?'Terminar gravação':'Gravar áudio'} aria-label={recording?'Terminar gravação':'Gravar áudio'}>{recording?'■':'🎙'}</button>
      <textarea value={message} onChange={event=>setMessage(event.target.value)} placeholder={activeId?'Escreva uma mensagem…':'Escolha uma conversa para escrever…'} rows={1} maxLength={5000} style={S.input} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessage(event);}}}/>
      <button type="submit" style={{...S.send,opacity:(message.trim()||selectedFile)&&activeId&&!sending?1:.5}} disabled={(!message.trim()&&!selectedFile)||!activeId||sending} aria-label="Enviar mensagem">{sending?'…':'➤'}</button>
    </form>}
    {!activeId && <div style={S.hint}>Abra uma conversa para ativar o envio de texto, ficheiros e áudio.</div>}
    {activeId && <div style={S.hint}>Enter para enviar · Shift + Enter para nova linha</div>}
  </main>;
}

const S = {
 page:{height:'100dvh',minHeight:440,display:'flex',flexDirection:'column',background:C.bg,color:C.ink,fontFamily:'Arial,Helvetica,sans-serif',overflow:'hidden',paddingBottom:0},
 center:{minHeight:'100dvh',display:'grid',placeItems:'center',color:C.green,fontWeight:800},
 header:{flex:'0 0 auto',display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:C.dark,color:C.white,boxShadow:'0 3px 12px rgba(0,0,0,.08)'},
 back:{border:0,background:'transparent',color:'#fff',fontSize:31,cursor:'pointer',lineHeight:1},
 brandMark:{display:'grid',placeItems:'center',width:42,height:42,borderRadius:'50%',background:'linear-gradient(135deg,'+C.purple+','+C.gold+')',color:'#fff',fontWeight:900,fontSize:20},
 title:{display:'block',fontSize:15,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'},
 subtitle:{marginTop:4,fontSize:11,color:'rgba(255,255,255,.72)'},
 headerPhoto:{width:40,height:40,objectFit:'cover',borderRadius:'50%'},
 list:{flex:1,overflowY:'auto',padding:'16px 14px 24px'},
 sectionTitle:{fontSize:18,fontWeight:850,color:C.dark,margin:'4px 4px 14px'},
 conversationRow:{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'13px 8px',border:0,borderBottom:'1px solid '+C.line,background:'transparent',textAlign:'left',cursor:'pointer'},
 avatar:{width:46,height:46,flex:'0 0 46px',borderRadius:'50%',display:'grid',placeItems:'center',background:'#E8F3F0',color:C.green,fontWeight:900,fontSize:18},
 avatarPhoto:{width:46,height:46,flex:'0 0 46px',borderRadius:'50%',objectFit:'cover'},
 conversationInfo:{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:5},
 conversationInfoStrong:{fontSize:14},
 conversationInfoSmall:{fontSize:11,color:C.muted},
 chevron:{fontSize:24,color:C.muted},
 empty:{maxWidth:420,margin:'8vh auto 0',padding:25,borderRadius:20,background:'rgba(255,255,255,.94)',textAlign:'center',boxShadow:'0 7px 25px rgba(30,40,35,.05)'},
 emptyIcon:{margin:'0 auto',display:'grid',placeItems:'center',width:56,height:56,borderRadius:18,background:'#F2EAF9',color:C.purple,fontSize:27},
 primaryButton:{border:0,borderRadius:12,padding:'12px 17px',background:C.green,color:'#fff',fontWeight:800,cursor:'pointer'},
 chat:{flex:'1 1 0',minHeight:0,overflowY:'auto',padding:'16px 14px 20px',backgroundColor:'#F4F0E8',backgroundImage:'radial-gradient(rgba(100,53,139,.055) .8px,transparent .8px)',backgroundSize:'17px 17px'},
 emptyChat:{maxWidth:360,margin:'22px auto',padding:16,borderRadius:14,background:'rgba(255,255,255,.9)',textAlign:'center',fontSize:13,color:C.muted,lineHeight:1.5},
 messageRow:{display:'flex',margin:'9px 0'},
 bubble:{maxWidth:'min(82%,520px)',padding:'11px 13px',boxShadow:'0 1px 2px rgba(0,0,0,.06)',fontSize:14,lineHeight:1.5},
 time:{textAlign:'right',fontSize:9,color:C.muted,marginTop:6},
 composer:{flex:'0 0 auto',display:'flex',alignItems:'flex-end',gap:6,padding:'10px 8px',background:'#fff',borderTop:'1px solid '+C.line},
 toolButton:{flex:'0 0 38px',width:38,height:40,border:'1px solid '+C.line,borderRadius:12,background:'#F8F6FB',color:C.purple,fontSize:19,fontWeight:800,cursor:'pointer'},
 filePreview:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'7px 12px',background:'#FFF8E4',fontSize:12,color:C.ink},
 removeFile:{border:0,background:'transparent',color:'#A52F3B',fontWeight:800,cursor:'pointer'},
 fileLink:{border:0,background:'transparent',color:C.purple,textDecoration:'underline',cursor:'pointer',fontSize:13},
 input:{flex:1,minWidth:0,resize:'none',border:'1px solid '+C.line,borderRadius:17,padding:'11px 13px',outline:0,background:'#FBFCFB',fontSize:14,lineHeight:1.5,maxHeight:120,color:C.ink},
 send:{flex:'0 0 43px',width:43,height:43,border:0,borderRadius:'50%',background:C.green,color:'#fff',fontSize:20,fontWeight:900,cursor:'pointer'},
 hint:{flex:'0 0 auto',padding:'4px 12px 6px',textAlign:'center',fontSize:9,color:C.muted,background:'#fff'},
 notice:{margin:8,padding:10,borderRadius:9,background:'#E8F3F0',color:C.green,fontSize:12},
 error:{flex:'0 0 auto',margin:8,padding:10,borderRadius:9,background:'#FFF0F0',color:'#A52F3B',fontSize:12}
};
