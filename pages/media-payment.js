import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const box = { background: '#FFFFFF', border: '1px solid #E3E8E6', borderRadius: 18, padding: 20, marginTop: 16 };
const label = { display: 'block', color: '#34443E', fontSize: 13, fontWeight: 800, margin: '14px 0 7px' };
const input = { width: '100%', boxSizing: 'border-box', border: '1px solid #D7E0DC', borderRadius: 11, padding: 12, fontSize: 14 };

export default function MediaPayment() {
  const router = useRouter();
  const applicationId = typeof router.query.application === 'string' ? router.query.application : '';
  const [user, setUser] = useState(null);
  const [application, setApplication] = useState(null);
  const [plan, setPlan] = useState(null);
  const [settings, setSettings] = useState(null);
  const [payment, setPayment] = useState(null);
  const [proof, setProof] = useState(null);
  const [reference, setReference] = useState('');
  const [signedProof, setSignedProof] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (applicationId) load();
  }, [applicationId]);

  async function load() {
    setLoading(true);
    setError('');
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      await router.replace('/login?next=' + encodeURIComponent('/media-payment?application=' + applicationId));
      return;
    }
    setUser(authData.user);
    const [{ data: app, error: appError }, { data: planRow, error: planError }, { data: settingsRow, error: settingsError }, { data: paymentRow, error: paymentError }] = await Promise.all([
      supabase.from('media_applications').select('id,user_id,display_name,application_status').eq('id', applicationId).eq('user_id', authData.user.id).maybeSingle(),
      supabase.from('media_plans').select('*').eq('code', 'creator-annual-aoa').eq('is_active', true).maybeSingle(),
      supabase.from('media_payment_settings').select('bank_name,account_holder,account_number,iban,transfer_instructions').eq('singleton', true).maybeSingle(),
      supabase.from('media_payment_submissions').select('*').eq('application_id', applicationId).eq('user_id', authData.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (appError || planError || settingsError || paymentError) {
      setError((appError || planError || settingsError || paymentError).message);
    } else if (!app) {
      setError('Candidatura não encontrada para esta conta.');
    } else {
      setApplication(app);
      setPlan(planRow);
      setSettings(settingsRow);
      setPayment(paymentRow);
      if (paymentRow?.proof_path) {
        const { data } = await supabase.storage.from('media-payment-proofs').createSignedUrl(paymentRow.proof_path, 300);
        setSignedProof(data?.signedUrl || '');
      }
    }
    setLoading(false);
  }

  async function submitProof(event) {
    event.preventDefault();
    setError('');
    if (!proof) { setError('Selecione o comprovativo da transferência.'); return; }
    if (!plan || !application || !user) { setError('Não foi possível validar a candidatura e o plano.'); return; }
    if (!['image/jpeg','image/png','image/webp','application/pdf'].includes(proof.type)) {
      setError('Envie uma imagem JPG, PNG, WebP ou um documento PDF.');
      return;
    }
    if (proof.size > 10 * 1024 * 1024) { setError('O comprovativo não pode ultrapassar 10 MB.'); return; }
    if (payment?.status === 'approved') { setError('Este pagamento já foi aprovado.'); return; }
    setSaving(true);
    try {
      const extension = (proof.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
      const path = user.id + '/' + application.id + '/' + Date.now() + '.' + extension;
      const { error: uploadError } = await supabase.storage.from('media-payment-proofs').upload(path, proof, { upsert: false, contentType: proof.type });
      if (uploadError) throw uploadError;

      let result;
      if (payment?.id && payment.status === 'rejected') {
        result = await supabase.from('media_payment_submissions').insert({
          application_id: application.id, user_id: user.id, plan_id: plan.id,
          amount: plan.amount, currency: plan.currency, payment_reference: reference.trim() || null,
          proof_path: path, status: 'pending',
        }).select('*').single();
      } else {
        result = await supabase.from('media_payment_submissions').insert({
          application_id: application.id, user_id: user.id, plan_id: plan.id,
          amount: plan.amount, currency: plan.currency, payment_reference: reference.trim() || null,
          proof_path: path, status: 'pending',
        }).select('*').single();
      }
      if (result.error) throw result.error;
      setPayment(result.data);
      const { data } = await supabase.storage.from('media-payment-proofs').createSignedUrl(path, 300);
      setSignedProof(data?.signedUrl || '');
      setProof(null);
      alert('Comprovativo enviado. O pagamento aguarda validação administrativa.');
    } catch (err) {
      setError(err?.message || 'Não foi possível enviar o comprovativo.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main style={{ minHeight: '100vh', padding: 30, background: '#F5F7F8', color: '#233' }}>A carregar pagamento…</main>;

  return (
    <>
      <Head><title>Plano de Criador | MÍDIA TALAZA</title></Head>
      <main style={{ minHeight: '100vh', padding: '28px 16px 50px', background: '#F3F5F8', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Link href="/start" style={{ color: '#155C4E', textDecoration: 'none', fontWeight: 800 }}>← Voltar</Link>
          <section style={{ ...box, marginTop: 20, border: '1px solid #D8BD73' }}>
            <div style={{ color: '#96701B', fontWeight: 900, letterSpacing: 1, fontSize: 12 }}>MÍDIA TALAZA</div>
            <h1 style={{ margin: '8px 0', color: '#1B2744', fontSize: 28 }}>Plano anual de Criador</h1>
            <div style={{ fontSize: 13, color: '#647080' }}>Candidatura: {application?.display_name || '—'}</div>
            <div style={{ marginTop: 16, fontSize: 34, fontWeight: 950, color: '#182542' }}>{plan ? Number(plan.amount).toLocaleString('pt-PT') + ' Kz' : 'Plano indisponível'}</div>
            <div style={{ color: '#697586', fontSize: 13 }}>12 meses de acesso à MÍDIA TALAZA · Angola · pagamento por transferência bancária</div>
          </section>

          {application?.application_status === 'rejected' && <div style={{ ...box, color: '#9D2936', background: '#FFF2F2' }}>A candidatura foi recusada. Contacte o suporte para esclarecer a situação do pagamento antes de efetuar outra transferência.</div>}
          <section style={box}>
            <h2 style={{ color: '#1B2744', margin: '0 0 12px', fontSize: 19 }}>Dados para transferência</h2>
            {settings && (settings.bank_name || settings.account_holder || settings.account_number || settings.iban) ? <>
              {settings.bank_name && <p><b>Banco:</b> {settings.bank_name}</p>}
              {settings.account_holder && <p><b>Titular:</b> {settings.account_holder}</p>}
              {settings.account_number && <p><b>N.º de conta:</b> {settings.account_number}</p>}
              {settings.iban && <p><b>IBAN:</b> {settings.iban}</p>}
              {settings.transfer_instructions && <p style={{ whiteSpace: 'pre-wrap', color: '#5C6877' }}>{settings.transfer_instructions}</p>}
            </> : <p style={{ color: '#9B6712', lineHeight: 1.6 }}>Os dados bancários ainda não foram configurados pela administração. Aguarde a publicação dos dados antes de fazer a transferência.</p>}
          </section>

          <section style={box}>
            <h2 style={{ color: '#1B2744', margin: '0 0 8px', fontSize: 19 }}>Estado da candidatura e pagamento</h2>
            <p style={{ margin: '8px 0', color: '#5E6B7A', fontSize: 14 }}>Candidatura: <b>{application?.application_status || 'não disponível'}</b></p>
            <p style={{ margin: '8px 0', color: '#5E6B7A', fontSize: 14 }}>Pagamento: <b>{payment?.status || 'a aguardar comprovativo'}</b></p>
            {payment?.status === 'rejected' && payment.review_notes && <p style={{ color: '#A12B36', fontSize: 13 }}>Observação: {payment.review_notes}</p>}
            {payment?.status === 'approved' && <p style={{ color: '#17604E', fontSize: 13 }}>Pagamento confirmado. A candidatura ainda precisa de aprovação administrativa para ativar o perfil.</p>}
            {signedProof && <a href={signedProof} target="_blank" rel="noreferrer" style={{ color: '#155C4E', fontWeight: 800 }}>Ver comprovativo enviado</a>}
          </section>

          {(!payment || payment.status === 'rejected') && application?.application_status !== 'rejected' && settings && (settings.bank_name || settings.account_number || settings.iban) && <section style={box}>
            <h2 style={{ color: '#1B2744', margin: '0 0 8px', fontSize: 19 }}>Enviar comprovativo</h2>
            <form onSubmit={submitProof}>
              <label style={label} htmlFor="reference">Referência da transferência (opcional)</label>
              <input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} style={input} placeholder="Referência ou observação do banco" />
              <label style={label} htmlFor="proof">Comprovativo (imagem ou PDF, até 10 MB)</label>
              <input id="proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setProof(e.target.files?.[0] || null)} style={input} />
              {error && <div role="alert" style={{ marginTop: 12, color: '#A12B36', fontSize: 13 }}>{error}</div>}
              <button type="submit" disabled={saving || !plan} style={{ width: '100%', marginTop: 18, border: 0, borderRadius: 12, padding: 14, background: '#1B3158', color: '#FFFFFF', fontWeight: 900, cursor: 'pointer' }}>{saving ? 'A enviar…' : 'Enviar comprovativo para análise'}</button>
            </form>
          </section>}
          {error && <p role="alert" style={{ color: '#A12B36', marginTop: 12 }}>{error}</p>}
        </div>
      </main>
    </>
  );
}
