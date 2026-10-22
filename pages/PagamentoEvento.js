import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import AuthShell from '../components/AuthShell';
import { Card, ErrorBox } from '../components/Fields';
import { C, formatKz, durationLabel, uploadPrivateFile, resizeImage } from '../lib/talaza';

const EXPRESS_NUMBER = process.env.NEXT_PUBLIC_EXPRESS_NUMBER || '';
const PAYMENT_MESSAGE = process.env.NEXT_PUBLIC_PAYMENT_MESSAGE || '';
const MAX_PDF_SIZE = 8 * 1024 * 1024;

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch (_) { setCopied(false); }
  }
  return <button type="button" onClick={copy} style={{ border: 0, borderRadius: 8, padding: '8px 12px', background: 'rgba(255,255,255,.16)', color: '#fff', fontWeight: 800 }}>{copied ? 'Copiado' : 'Copiar'}</button>;
}

export default function PagamentoEvento() {
  const router = useRouter();
  const eventId = Array.isArray(router.query.event) ? router.query.event[0] : router.query.event;
  const planId = Array.isArray(router.query.plan) ? router.query.plan[0] : router.query.plan;
  const [user, setUser] = useState(null);
  const [eventItem, setEventItem] = useState(null);
  const [plan, setPlan] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    if (!eventId || !planId) { setError('Falta identificar o evento ou o plano. Volta à área Eventos e tenta novamente.'); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session?.user) { await router.replace('/login?next=/eventos'); return; }
        if (cancelled) return;
        setUser(session.user);
        const [eventResult, planResult, previousResult] = await Promise.all([
          supabase.from('events').select('id,user_id,title,description,plan_id,status,payment_status').eq('id', eventId).eq('user_id', session.user.id).maybeSingle(),
          supabase.from('plans').select('id,name,price,duration_days,plan_type,area,is_active').eq('id', planId).maybeSingle(),
          supabase.from('payment_submissions').select('id,status').eq('event_id', eventId).eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
        ]);
        if (eventResult.error) throw eventResult.error;
        if (!eventResult.data) throw new Error('Não foi encontrado um evento seu com este identificador.');
        if (planResult.error) throw planResult.error;
        const selectedPlan = planResult.data;
        if (!selectedPlan || selectedPlan.is_active !== true || String(selectedPlan.plan_type || '').trim().toLowerCase() !== 'publicação ativa' || String(selectedPlan.area || '').trim().toLowerCase() !== 'eventos área') {
          throw new Error('O plano de publicação escolhido não está ativo ou não pertence à área Eventos.');
        }
        if (eventResult.data.plan_id !== selectedPlan.id) throw new Error('O plano não corresponde ao plano guardado no anúncio. Volta a Eventos e tenta novamente.');
        if (previousResult.data && ['pending','approved'].includes(String(previousResult.data.status || '').toLowerCase())) {
          throw new Error('Já existe um comprovativo enviado para este evento. Aguarde a verificação da equipa Talaza.');
        }
        if (!cancelled) { setEventItem(eventResult.data); setPlan(selectedPlan); }
      } catch (e) { if (!cancelled) setError(e.message || 'Não foi possível preparar o pagamento.'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [router.isReady, eventId, planId]);

  async function submit() {
    setError('');
    if (!user?.id || !eventItem?.id || !plan?.id) { setError('Não foi possível confirmar a sessão, o evento ou o plano.'); return; }
    if (!EXPRESS_NUMBER.trim() || !PAYMENT_MESSAGE.trim()) { setError('O pagamento ainda não está configurado com os dados oficiais da Talaza. Não faça a transferência; contacte a administração para configurar o número Express e a mensagem corretos.'); return; }
    if (!file) { setError('Adiciona o comprovativo de pagamento em imagem ou PDF.'); return; }
    if (!(file.type.startsWith('image/') || file.type === 'application/pdf')) { setError('O comprovativo deve ser uma imagem ou PDF.'); return; }
    if (file.type === 'application/pdf' && file.size > MAX_PDF_SIZE) { setError('O PDF deve ter no máximo 8 MB.'); return; }
    if (file.type.startsWith('image/') && file.size > 10 * 1024 * 1024) { setError('A imagem deve ter no máximo 10 MB.'); return; }
    setSending(true);
    let uploadedPath = '';
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (session?.user?.id !== user.id) throw new Error('A sessão expirou. Entra novamente e tenta enviar o comprovativo.');
      const unique = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      const extension = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = user.id + '/event-' + eventItem.id + '-' + unique + '.' + extension;
      const payload = file.type.startsWith('image/') ? await resizeImage(file, { max: 1600 }) : file;
      uploadedPath = await uploadPrivateFile(supabase, 'payment-proofs', path, payload, file.type.startsWith('image/') ? 'image/jpeg' : 'application/pdf');
      const { error: insertError } = await supabase.from('payment_submissions').insert({
        user_id: user.id, event_id: eventItem.id, business_id: null, plan_id: plan.id,
        amount: Number(plan.price), currency: 'Kz', payment_method: 'Express',
        proof_url: uploadedPath, proof_type: file.type === 'application/pdf' ? 'pdf' : 'image', status: 'pending'
      });
      if (insertError) throw insertError;
      setDone(true);
    } catch (e) {
      if (uploadedPath) {
        const { error: removeError } = await supabase.storage.from('payment-proofs').remove([uploadedPath]);
        if (removeError) console.warn('Limpeza do comprovativo incompleto:', removeError.message);
      }
      setError('Não foi possível enviar o comprovativo: ' + (e.message || 'erro desconhecido'));
    } finally { setSending(false); }
  }

  return <AuthShell backHref="/eventos" backLabel="← Eventos">
    <Head><title>Pagamento do evento | Talaza</title></Head>
    {loading && <p style={{ color: C.muted, marginTop: 30 }}>A carregar evento e plano…</p>}
    {!loading && done && <Card><div style={{ textAlign: 'center', padding: '18px 4px' }}><div style={{ fontSize: 52, color: C.green }}>✓</div><h1 style={{ color: C.dark }}>Comprovativo enviado</h1><p style={{ color: C.muted, lineHeight: 1.7 }}>O seu anúncio ficará ativo assim que o seu pagamento for aprovado. Aguarde.</p><Link href="/eventos" style={{ display: 'inline-block', marginTop: 16, padding: 13, background: C.green, color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 800 }}>Voltar aos eventos</Link></div></Card>}
    {!loading && !done && <Card>
      <h1 style={{ color: C.dark, marginTop: 0 }}>Pagamento do evento</h1>
      {eventItem && <div style={{ padding: 14, borderRadius: 12, background: C.soft, marginBottom: 14 }}><strong>{eventItem.title}</strong><p style={{ marginBottom: 0, color: C.muted }}>Plano: {plan?.name} · {durationLabel(plan?.duration_days)}<br/>Valor: <strong>{formatKz(plan?.price)}</strong></p></div>}
      {error && <ErrorBox>{error}</ErrorBox>}
      {plan && <><div style={{ padding: 18, borderRadius: 15, background: 'linear-gradient(145deg,#075B4E,#0B7563)', color: '#fff' }}>
        {EXPRESS_NUMBER && PAYMENT_MESSAGE ? <><small>Número Multicaixa Express</small><div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}><strong style={{ fontSize: 24 }}>{EXPRESS_NUMBER}</strong><CopyButton value={EXPRESS_NUMBER}/></div><small style={{ display: 'block', marginTop: 14 }}>Mensagem do pagamento</small><div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}><strong>{PAYMENT_MESSAGE}</strong><CopyButton value={PAYMENT_MESSAGE}/></div><div style={{ fontSize: 30, fontWeight: 900, color: C.gold, marginTop: 16 }}>{formatKz(plan.price)}</div></> : <p>Os dados oficiais de pagamento ainda não estão configurados. Não efetue pagamento até a administração configurar os dados corretos.</p>}
      </div>
      <label style={{ display: 'block', fontWeight: 800, margin: '18px 0 8px' }} htmlFor="event-proof">Comprovativo (imagem ou PDF)</label>
      <input id="event-proof" type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
      <p style={{ color: C.muted, fontSize: 13 }}>O comprovativo fica privado e só deve ser consultado pela equipa autorizada.</p>
      <button type="button" disabled={sending || !EXPRESS_NUMBER || !PAYMENT_MESSAGE} onClick={submit} style={{ width: '100%', marginTop: 18, padding: 15, border: 0, borderRadius: 12, background: C.green, color: '#fff', fontWeight: 900, opacity: sending || !EXPRESS_NUMBER || !PAYMENT_MESSAGE ? .6 : 1 }}>{sending ? 'A enviar comprovativo…' : 'Enviar comprovativo'}</button>
      </>}
    </Card>}
  </AuthShell>;
}
