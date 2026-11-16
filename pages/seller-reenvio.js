import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function SellerResubmissionPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [review, setReview] = useState(null);
  const [phone, setPhone] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    let alive = true;
    (async () => {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth?.user) { router.replace('/login'); return; }
      const currentUser = auth.user;
      const { data: shop, error: shopError } = await supabase.from('businesses')
        .select('id,owner_id,name,phone,approval_status')
        .eq('owner_id', currentUser.id)
        .eq('id', router.query.business || '')
        .maybeSingle();
      if (!alive) return;
      if (shopError || !shop) {
        setError(shopError?.message || 'Não foi possível localizar o seu negócio.');
        setLoading(false);
        return;
      }
      const { data: status, error: statusError } = await supabase.from('seller_status')
        .select('seller_id,status,reject_reason,created_at')
        .eq('seller_id', currentUser.id).maybeSingle();
      if (!alive) return;
      if (statusError) setError(statusError.message);
      setUser(currentUser);
      setBusiness(shop);
      setReview(status || null);
      setPhone(shop.phone ? (shop.phone.replace(/\D/g, '').length === 9 ? '+244' + shop.phone.replace(/\D/g, '') : shop.phone) : '');
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [router.isReady, router.query.business]);

  async function submit(event) {
    event.preventDefault();
    if (!user || !business || busy) return;
    const cleanPhone = phone.trim();
    if (!cleanPhone) { setError('Indique o número de telefone que fez a transferência Express.'); return; }
    const phoneDigits = cleanPhone.replace(/\D/g, '');
    const expressPhone = phoneDigits.length === 9 ? '+244' + phoneDigits : phoneDigits.startsWith('244') ? '+' + phoneDigits : cleanPhone;
    if (!file || !['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type)) {
      setError('Anexe um comprovativo em PDF, JPG, PNG ou WebP.'); return;
    }
    if (file.size > 10 * 1024 * 1024) { setError('O ficheiro deve ter no máximo 10 MB.'); return; }
    setBusy(true); setError(''); setNotice('');
    let uploadedPath = '';
    try {
      const ext = file.type === 'application/pdf' ? 'pdf' : (file.name.split('.').pop() || 'jpg').toLowerCase();
      uploadedPath = user.id + '/resubmission-' + Date.now() + '.' + ext;
      const { error: uploadError } = await supabase.storage.from('payment-proofs')
        .upload(uploadedPath, file, { upsert:false, contentType:file.type, cacheControl:'3600' });
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from('payment_resubmissions').insert({
        seller_id:user.id, phone:expressPhone, file_url:uploadedPath,
        file_type:file.type === 'application/pdf' ? 'pdf' : 'image', status:'pending'
      });
      if (insertError) throw insertError;
      uploadedPath = '';
      const { error: businessError } = await supabase.from('businesses')
        .update({ approval_status:'pending' }).eq('id',business.id).eq('owner_id',user.id);
      if (businessError) throw businessError;
      setBusiness(current => ({ ...current, approval_status:'pending' }));
      setReview({ ...(review || {}), status:'pending' });
      setNotice('A correção foi enviada. A equipa Talaza irá verificar novamente.');
      setFile(null);
    } catch (err) {
      if (uploadedPath) await supabase.storage.from('payment-proofs').remove([uploadedPath]);
      setError(err.message || 'Não foi possível enviar o comprovativo.');
    } finally { setBusy(false); }
  }

  if (loading) return <main style={{maxWidth:640,margin:'40px auto',padding:20,color:'#075B4E'}}>A carregar os dados do vendedor…</main>;
  if (!business) return <main style={{maxWidth:640,margin:'40px auto',padding:20}}><h1>Correção do perfil</h1><p role="alert" style={{color:'#A52F3B'}}>{error || 'Negócio não encontrado.'}</p><Link href="/seller">Voltar ao painel do vendedor</Link></main>;

  return <main style={{minHeight:'100vh',background:'#F3F7F4',padding:'28px 16px',boxSizing:'border-box'}}>
    <section style={{maxWidth:620,margin:'0 auto',background:'#FFFFFF',border:'1px solid #DCE8E2',borderRadius:20,padding:24,boxShadow:'0 12px 34px rgba(10,40,30,.08)'}}>
      <div style={{fontSize:11,fontWeight:900,letterSpacing:2,color:'#B8860B'}}>TALAZA · ÁREA DO VENDEDOR</div>
      <h1 style={{fontSize:26,color:'#075B4E',margin:'8px 0'}}>Corrigir e reenviar comprovativo</h1>
      <p style={{color:'#52635E',lineHeight:1.6}}>Negócio: <strong>{business.name}</strong></p>
      <div style={{background:'#FCEBED',border:'1px solid #E9B8BE',color:'#7E2630',padding:14,borderRadius:12,margin:'18px 0'}}>
        <strong>{String(business.approval_status || '').toLowerCase() === 'pending' ? 'Comprovativo reenviado · em análise' : 'Perfil criado · validação recusada'}</strong>
        <p style={{margin:'8px 0 0',lineHeight:1.55}}>{review?.reject_reason || 'A equipa Talaza recusou a validação. Consulte a equipa de suporte se o motivo não estiver disponível.'}</p>
      </div>
      {(String(business?.approval_status || '').toLowerCase() === 'pending' || String(review?.status || '').toLowerCase() === 'pending') && <p style={{color:'#805D00',background:'#FFF5D6',padding:12,borderRadius:10}}>Já existe uma correção em análise.</p>}
      {error && <p role="alert" style={{color:'#A52F3B',background:'#FCEBED',padding:12,borderRadius:10}}>{error}</p>}
      {notice && <p role="status" style={{color:'#17643B',background:'#E6F5EC',padding:12,borderRadius:10}}>{notice}</p>}
      <form onSubmit={submit}>
        <label htmlFor="express-phone" style={{display:'block',fontWeight:800,color:'#34453E',margin:'18px 0 7px'}}>Número Express que fez a transferência (telefone)</label>
        <input id="express-phone" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} required placeholder="+244 9XX XXX XXX" style={{width:'100%',boxSizing:'border-box',padding:13,border:'1px solid #C9D8D1',borderRadius:10,fontSize:16}}/>
        <label htmlFor="proof-file" style={{display:'block',fontWeight:800,color:'#34453E',margin:'18px 0 7px'}}>Novo comprovativo (PDF ou imagem)</label>
        <input id="proof-file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0] || null)} required style={{width:'100%',padding:10,border:'1px solid #C9D8D1',borderRadius:10}}/>
        <p style={{fontSize:12,color:'#718079'}}>PDF, JPG, PNG ou WebP · Máximo 10 MB.</p>
        <button type="submit" disabled={busy || String(business?.approval_status || '').toLowerCase()==='pending' || String(review?.status || '').toLowerCase()==='pending'} style={{width:'100%',padding:14,border:0,borderRadius:12,background:'#075B4E',color:'#FFFFFF',fontWeight:900,fontSize:15,opacity:busy || String(business?.approval_status || '').toLowerCase()==='pending' || String(review?.status || '').toLowerCase()==='pending' ? 0.55 : 1,cursor:'pointer',marginTop:12}}>{busy?'A enviar…':(String(business?.approval_status || '').toLowerCase()==='pending' || String(review?.status || '').toLowerCase()==='pending')?'Em análise':'Enviar correção'}</button>
      </form>
      <Link href="/seller" style={{display:'inline-block',marginTop:20,color:'#075B4E',fontWeight:800}}>← Voltar ao painel do vendedor</Link>
    </section>
  </main>;
}
