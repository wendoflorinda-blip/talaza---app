import { useEffect, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

export default function ResendConfirmation() {
  const [email,setEmail] = useState('');
  const [loading,setLoading] = useState(false);
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');

  useEffect(() => {
    try {
      const value = new URLSearchParams(window.location.search).get('email');
      if (value) setEmail(value);
    } catch {}
  }, []);

  async function resend() {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
      setError('Introduz um endereço de e-mail válido.');
      return;
    }
    setLoading(true); setError(''); setMessage('');
    try {
      const { data, error: renewalError } = await supabase.functions.invoke('talaza-signup-proof', {
        body: { action: 'renew', email: normalized },
      });
      if (renewalError || data?.ok !== true || data?.version !== 4) throw new Error('RENEW_FAILED');
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: normalized,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (resendError) throw resendError;
      setMessage('Se existir um cadastro pendente para este e-mail, enviámos um novo link. Renovámos o envelope cifrado completo (país, província, nome, telefone, género, data de nascimento e e-mail) por mais 72 horas.');
    } catch (e) {
      console.error('Erro ao reenviar confirmação:', e);
      setError('Não foi possível reenviar agora. Confirma o endereço e tenta novamente.');
    } finally { setLoading(false); }
  }

  return <>
    <Head><title>Reenviar confirmação | TALAZA</title><meta name="viewport" content="width=device-width, initial-scale=1"/></Head>
    <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:22,background:'#F8F6F3',fontFamily:'Arial,sans-serif'}}>
      <section style={{width:'100%',maxWidth:460,boxSizing:'border-box',padding:30,borderRadius:22,background:'#FFF',boxShadow:'0 16px 48px rgba(8,63,53,.10)'}}>
        <div style={{textAlign:'center',color:'#0F6E5C',fontSize:13,letterSpacing:4,fontWeight:900}}>TALAZA</div>
        <h1 style={{color:'#17211F',fontSize:25,margin:'18px 0 10px'}}>Pedir novo link</h1>
        <p style={{color:'#596560',fontSize:14,lineHeight:1.7}}>Introduz o mesmo e-mail usado no cadastro. Vamos renovar o envelope cifrado com os dados que já preencheste e enviar um novo link.</p>
        <label htmlFor="resend-email" style={{display:'block',fontSize:13,fontWeight:800,color:'#26334C',margin:'18px 0 8px'}}>E-mail</label>
        <input id="resend-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" style={{width:'100%',boxSizing:'border-box',padding:14,border:'1px solid #DDE3EC',borderRadius:12,fontSize:15}}/>
        {error && <div role="alert" style={{marginTop:16,padding:12,borderRadius:11,background:'#FFF0F1',color:'#B93845',fontSize:13,lineHeight:1.6}}>{error}</div>}
        {message && <div role="status" style={{marginTop:16,padding:12,borderRadius:11,background:'#EAF5F0',color:'#155B49',fontSize:13,lineHeight:1.6}}>{message}</div>}
        <button type="button" disabled={loading} onClick={resend} style={{width:'100%',marginTop:18,padding:14,border:0,borderRadius:12,background:'#0F6E5C',color:'#FFF',fontSize:15,fontWeight:800,cursor:loading?'wait':'pointer',opacity:loading?0.65:1}}>{loading?'A enviar…':'Enviar novo link'}</button>
        <button type="button" onClick={()=>window.location.assign('/login')} style={{width:'100%',marginTop:10,padding:13,border:'1px solid #DDE3EC',borderRadius:12,background:'#FFF',color:'#17211F',fontWeight:800}}>Voltar para entrar</button>
      </section>
    </main>
  </>;
}
