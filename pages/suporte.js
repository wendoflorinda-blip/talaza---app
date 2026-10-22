import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function SuporteTalaza() {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError(''); setNotice('');
    if (!subject.trim() || !message.trim()) { setError('Preencha o assunto e a mensagem.'); return; }
    setSending(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { router.push('/login?redirect=' + encodeURIComponent('/suporte')); return; }
      const { data, error: insertError } = await supabase.from('support_messages')
        .insert({ user_id: user.id, subject: subject.trim(), message: message.trim() })
        .select('id').single();
      if (insertError) throw insertError;
      const { data: admins, error: adminsError } = await supabase.from('admin_users').select('id');
      if (!adminsError && admins?.length) {
        await supabase.from('notifications').insert(admins.map(admin => ({
          user_id: admin.id,
          title: 'Nova mensagem — Suporte Talaza',
          content: 'Recebeste uma nova mensagem de suporte. Abre o painel de administração para responder/analisar.',
          type: 'support',
          reference_id: data.id
        })));
      }
      setSubject(''); setMessage('');
      setNotice('Mensagem enviada ao Suporte Talaza. Podes acompanhar o estado na tua área de suporte.');
    } catch (err) {
      setError('Não foi possível enviar a mensagem. ' + (err?.message || 'Tenta novamente.'));
    } finally { setSending(false); }
  }

  return <main style={{ minHeight:'100vh', background:'#F3F6F3', color:'#173B35', fontFamily:'Arial, sans-serif', padding:'24px 16px' }}>
    <Head><title>Suporte Talaza</title></Head>
    <div style={{ maxWidth:680, margin:'0 auto' }}>
      <button type="button" onClick={() => router.back()} style={{ border:0, background:'transparent', color:'#075B4E', fontWeight:800, cursor:'pointer', padding:'8px 0' }}>← Voltar</button>
      <header style={{ background:'linear-gradient(135deg,#075B4E,#64358B 70%,#D8A319)', color:'#fff', borderRadius:22, padding:24, margin:'12px 0 18px' }}>
        <div style={{ fontWeight:900, letterSpacing:2, color:'#FFE8A3' }}>TALAZA</div>
        <h1 style={{ margin:'12px 0 6px', fontSize:28 }}>Suporte Talaza</h1>
        <p style={{ margin:0, lineHeight:1.5 }}>Envia-nos a tua dúvida ou comunica um problema. A mensagem ficará registada para a equipa administrativa.</p>
      </header>
      <form onSubmit={submit} style={{ background:'#fff', border:'1px solid #E0E8E3', borderRadius:18, padding:22, boxShadow:'0 8px 24px rgba(20,50,40,.06)' }}>
        <label htmlFor="support-subject" style={{ display:'block', fontWeight:800, marginBottom:7 }}>Assunto</label>
        <input id="support-subject" value={subject} onChange={e=>setSubject(e.target.value)} maxLength={120} required placeholder="Ex.: Problema com pagamento" style={{ width:'100%', boxSizing:'border-box', border:'1px solid #D8E2DC', borderRadius:11, padding:13, marginBottom:16, fontSize:15 }} />
        <label htmlFor="support-message" style={{ display:'block', fontWeight:800, marginBottom:7 }}>Mensagem</label>
        <textarea id="support-message" value={message} onChange={e=>setMessage(e.target.value)} maxLength={5000} rows={7} required placeholder="Explica como podemos ajudar…" style={{ width:'100%', boxSizing:'border-box', border:'1px solid #D8E2DC', borderRadius:11, padding:13, resize:'vertical', fontSize:15, lineHeight:1.5 }} />
        {error && <p role="alert" style={{ color:'#A52F3B', background:'#FFF0F0', borderRadius:10, padding:12 }}>{error}</p>}
        {notice && <p role="status" style={{ color:'#075B4E', background:'#E8F3F0', borderRadius:10, padding:12 }}>{notice}</p>}
        <button disabled={sending} type="submit" style={{ marginTop:16, width:'100%', border:0, borderRadius:12, padding:14, background:'linear-gradient(135deg,#075B4E,#64358B)', color:'#fff', fontWeight:900, cursor:'pointer', opacity:sending?.7:1 }}>{sending ? 'A enviar…' : 'Enviar mensagem ao suporte'}</button>
      </form>
    </div>
  </main>;
}
