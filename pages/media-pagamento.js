import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import { EXPRESS_NUMBER, PAYMENT_MESSAGE, formatKz } from '../lib/talaza';

const PLAN_ID = 'f8dae010-62c6-439c-985f-8053bf168dfd';

export default function MediaPayment() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [plan, setPlan] = useState(null);
  const [senderPhone, setSenderPhone] = useState('');
  const [proof, setProof] = useState(null);
  const [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const [{ data: auth }, { data: planData, error: planError }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('plans').select('id,name,price,duration_days,plan_type,is_active')
          .eq('id', PLAN_ID).eq('plan_type','talaza_midia').eq('is_active',true).maybeSingle()
      ]);
      if (!active) return;
      if (!auth?.user) {
        await router.replace('/login?next=/media');
        return;
      }
      if (planError) setError('Não foi possível carregar o plano: ' + planError.message);
      setUser(auth.user);
      setPlan(planData || null);
      if (planData) {
        const { data: existing, error: existingError } = await supabase.from('payment_submissions')
          .select('id,status,created_at,amount,proof_url,express_sender_phone')
          .eq('user_id',auth.user.id).eq('plan_id',PLAN_ID)
          .is('business_id',null).is('event_id',null).is('job_post_id',null).is('premium_promotion_id',null)
          .in('status',['pending','submitted']).order('created_at',{ascending:false}).limit(1).maybeSingle();
        if (existingError) console.error('Erro ao consultar pagamento pendente da Mídia:',existingError);
        if (active) setPending(existing || null);
      }
      if (active) setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [router]);

  async function submitPayment(event) {
    event.preventDefault();
    setError('');
    if (!user || !plan || !proof) {
      setError('Seleciona o comprovativo da transferência.');
      return;
    }
    const normalizedPhone = senderPhone.replace(/[^0-9]/g,'');
    if (normalizedPhone.length < 7 || normalizedPhone.length > 15) {
      setError('Introduz o número Express que fez a transferência.');
      return;
    }
    if (!['image/jpeg','image/png','application/pdf'].includes(proof.type)) {
      setError('O comprovativo deve ser uma imagem JPG/PNG ou um PDF.');
      return;
    }
    if (proof.size > 8 * 1024 * 1024) {
      setError('O comprovativo não pode ultrapassar 8 MB.');
      return;
    }
    setSending(true);
    try {
      const extension = proof.type === 'application/pdf' ? 'pdf' : proof.type === 'image/png' ? 'png' : 'jpg';
      const path = user.id + '/' + Date.now() + '.' + extension;
      const { error: uploadError } = await supabase.storage.from('media-payment-proofs').upload(path,proof,{
        contentType:proof.type, upsert:false
      });
      if (uploadError) throw uploadError;
      const { data: inserted, error: insertError } = await supabase.rpc('submit_media_professional_payment',{
        p_amount:Number(plan.price),
        p_express_sender_phone:normalizedPhone,
        p_proof_path:path,
        p_proof_type:extension
      });
      if (insertError) {
        await supabase.storage.from('media-payment-proofs').remove([path]);
        throw insertError;
      }
      setPending(inserted);
      setDone(true);
    } catch (submitError) {
      console.error('Erro ao enviar comprovativo do Perfil Profissional:',submitError);
      setError(submitError.message || 'Não foi possível enviar o comprovativo.');
    } finally {
      setSending(false);
    }
  }

  if (loading) return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',fontFamily:'system-ui'}}>A carregar pagamento…</main>;

  return <>
    <Head><title>Pagamento Perfil Profissional | MÍDIA TALAZA</title><meta name="viewport" content="width=device-width, initial-scale=1"/></Head>
    <main style={{minHeight:'100vh',background:'#F7F5F8',color:'#17121C',padding:'max(18px,env(safe-area-inset-top)) 16px 32px',fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif"}}>
      <div style={{maxWidth:540,margin:'0 auto'}}>
        <button type="button" onClick={()=>router.push('/media')} style={{border:0,borderRadius:12,padding:'10px 14px',background:'#ECE8EF',color:'#25152E',fontWeight:900}}>‹ Voltar à Mídia</button>
        <h1 style={{fontSize:26,fontWeight:950,margin:'22px 0 8px'}}>Perfil Profissional 👑</h1>
        {!plan ? <p>O plano não está disponível neste momento.</p> : <>
          <div style={{padding:18,borderRadius:18,background:'#FFFFFF',border:'1px solid #E9DFEA'}}>
            <div style={{fontSize:26,fontWeight:950}}>{formatKz(plan.price)}</div>
            <div style={{fontSize:14,color:'#68606D',marginTop:4}}>{plan.duration_days} dias</div>
            <p style={{fontSize:13,lineHeight:1.6,color:'#5F5864'}}>O perfil profissional só será ativado depois da validação do pagamento e da aprovação da Administração.</p>
          </div>
          {done ? <div role="status" style={{marginTop:16,padding:18,borderRadius:16,background:'#E9F5EF',color:'#145B3D'}}>
            <strong>Comprovativo enviado.</strong>
            <p style={{marginBottom:0}}>O pagamento está pendente de análise. O perfil continua normal até a Administração aprovar.</p>
          </div> : pending ? <div style={{marginTop:16,padding:18,borderRadius:16,background:'#FFF5DC',color:'#6D4A00'}}>
            <strong>Já existe um pagamento pendente.</strong>
            <p style={{marginBottom:0}}>Enviado em {new Date(pending.created_at).toLocaleString('pt-AO')}. Aguarda a análise da Administração. Não precisas enviar outro comprovativo.</p>
          </div> : <form onSubmit={submitPayment} style={{marginTop:18,padding:18,borderRadius:18,background:'#FFFFFF',border:'1px solid #E9DFEA'}}>
            <div style={{fontSize:13,color:'#69616D',fontWeight:800}}>Express de pagamento</div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginTop:6}}>
              <strong style={{fontSize:26,letterSpacing:1}}>{EXPRESS_NUMBER}</strong>
              <button type="button" onClick={()=>navigator.clipboard?.writeText(EXPRESS_NUMBER)} style={{border:0,borderRadius:10,padding:'9px 12px',background:'#F1EDF3',fontWeight:800}}>Copiar</button>
            </div>
            <div style={{fontSize:12,color:'#69616D',marginTop:14}}>Mensagem</div>
            <strong style={{display:'block',fontSize:18,marginTop:4}}>{PAYMENT_MESSAGE}</strong>
            <div style={{fontSize:12,color:'#69616D',marginTop:14}}>Valor a pagar</div>
            <strong style={{display:'block',fontSize:28,color:'#A56B00',marginTop:4}}>{formatKz(plan.price)}</strong>
            <label style={{display:'block',fontSize:13,fontWeight:850,marginTop:18}}>Número Express que fez a transferência</label>
            <input value={senderPhone} onChange={e=>setSenderPhone(e.target.value.replace(/[^0-9]/g,''))} inputMode="numeric" placeholder="Número do remetente" style={{width:'100%',boxSizing:'border-box',padding:13,border:'1px solid #DDD4E2',borderRadius:12,marginTop:7,fontSize:16}}/>
            <label style={{display:'block',fontSize:13,fontWeight:850,marginTop:16}}>Comprovativo (JPG, PNG ou PDF · máximo 8 MB)</label>
            <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={e=>setProof(e.target.files?.[0]||null)} style={{display:'block',width:'100%',marginTop:8}}/>
            {proof && <p style={{fontSize:12,color:'#69616D'}}>{proof.name}</p>}
            {error && <p role="alert" style={{color:'#B42318',fontSize:13}}>{error}</p>}
            <button type="submit" disabled={sending} style={{width:'100%',marginTop:16,padding:14,border:0,borderRadius:13,background:'#FF2E7A',color:'#fff',fontWeight:950,fontSize:15}}>{sending?'A enviar…':'Enviar comprovativo'}</button>
          </form>}
        </>}
      </div>
    </main>
  </>;
}
