import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

const card = { background: '#FFFFFF', border: '1px solid #E1E6E4', borderRadius: 16, padding: 18, marginBottom: 14 };
const field = { width: '100%', boxSizing: 'border-box', border: '1px solid #D5DEDA', borderRadius: 10, padding: 11, fontSize: 14, marginTop: 6 };

export default function AdminMedia() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [applications, setApplications] = useState([]);
  const [payments, setPayments] = useState([]);
  const [proofUrls, setProofUrls] = useState({});
  const [settings, setSettings] = useState({ bank_name: '', account_holder: '', account_number: '', iban: '', transfer_instructions: '' });
  const [savingSettings, setSavingSettings] = useState(false);
  const [busy, setBusy] = useState('');
  const [filter, setFilter] = useState('all');
  const [message, setMessage] = useState('');

  useEffect(() => { checkAdmin(); }, []);

  async function checkAdmin() {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) { await router.replace('/login?next=/admin/media'); return; }
    const { data: admin, error } = await supabase.from('admin_users').select('id').eq('id', authData.user.id).maybeSingle();
    if (error || !admin) { setAuthorized(false); setLoading(false); return; }
    setAuthorized(true);
    await loadAll();
    setLoading(false);
  }

  async function loadAll() {
    setMessage('');
    const [apps, pays, bank] = await Promise.all([
      supabase.from('media_applications').select('id,user_id,display_name,country_id,content_category,languages,bio,social_links,application_status,review_notes,created_at,countries(name)').order('created_at', { ascending: false }),
      supabase.from('media_payment_submissions').select('id,application_id,user_id,plan_id,amount,currency,payment_reference,proof_path,status,review_notes,created_at').order('created_at', { ascending: false }),
      supabase.from('media_payment_settings').select('bank_name,account_holder,account_number,iban,transfer_instructions').eq('singleton', true).maybeSingle(),
    ]);
    if (apps.error || pays.error || bank.error) {
      setMessage('Não foi possível carregar a área MÍDIA: ' + (apps.error || pays.error || bank.error).message);
      return;
    }
    setApplications(apps.data || []);
    setPayments(pays.data || []);
    setSettings({ bank_name: bank.data?.bank_name || '', account_holder: bank.data?.account_holder || '', account_number: bank.data?.account_number || '', iban: bank.data?.iban || '', transfer_instructions: bank.data?.transfer_instructions || '' });
    const urls = {};
    await Promise.all((pays.data || []).map(async (payment) => {
      const { data } = await supabase.storage.from('media-payment-proofs').createSignedUrl(payment.proof_path, 300);
      if (data?.signedUrl) urls[payment.id] = data.signedUrl;
    }));
    setProofUrls(urls);
  }

  async function saveSettings(event) {
    event.preventDefault();
    setSavingSettings(true);
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase.from('media_payment_settings').upsert({
      singleton: true, ...settings, updated_at: new Date().toISOString(), updated_by: authData?.user?.id,
    }, { onConflict: 'singleton' });
    setSavingSettings(false);
    if (error) { alert('Não foi possível guardar os dados bancários: ' + error.message); return; }
    alert('Dados bancários da MÍDIA TALAZA guardados.');
    await loadAll();
  }

  async function reviewPayment(payment, status) {
    const note = status === 'rejected' ? window.prompt('Indique o motivo da rejeição do comprovativo:') : '';
    if (status === 'rejected' && !note?.trim()) return;
    if (status === 'approved') {
      const { data: plan, error: planError } = await supabase.from('media_plans').select('amount,currency').eq('id', payment.plan_id).maybeSingle();
      if (planError || !plan || Number(plan.amount) !== Number(payment.amount) || plan.currency !== payment.currency) {
        alert('O valor ou a moeda deste comprovativo não corresponde ao plano configurado. Não aprove o pagamento; verifique o registo.');
        return;
      }
      if (!window.confirm('Confirmar que a transferência foi recebida e corresponde ao valor do plano?')) return;
    }
    setBusy(payment.id);
    const { data: authData } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('media_payment_submissions').update({
      status, review_notes: note.trim() || null, reviewed_at: new Date().toISOString(), reviewed_by: authData?.user?.id,
    }).eq('id', payment.id).eq('status', 'pending').select('id').maybeSingle();
    setBusy('');
    if (error || !data) { alert('Não foi possível atualizar o pagamento: ' + (error?.message || 'O pagamento já foi revisto.')); return; }
    await loadAll();
  }

  async function reviewApplication(app, approve) {
    const reason = approve ? '' : window.prompt('Indique o motivo da recusa da candidatura:');
    if (!approve && !reason?.trim()) return;
    const payment = payments.find((item) => item.application_id === app.id && item.status === 'approved');
    if (approve && !payment) { alert('A candidatura só pode ser aprovada depois de um comprovativo ser validado.'); return; }
    if (approve && !window.confirm('Aprovar a candidatura e ativar o perfil de Criador na MÍDIA TALAZA?')) return;
    setBusy(app.id);
    const { data: authData } = await supabase.auth.getUser();
    const reviewedAt = new Date().toISOString();
    const patch = {
      application_status: approve ? 'approved' : 'rejected',
      review_notes: approve ? null : reason.trim(),
      reviewed_at: reviewedAt,
      reviewed_by: authData?.user?.id,
      updated_at: reviewedAt,
    };
    const { data: updated, error: updateError } = await supabase.from('media_applications').update(patch).eq('id', app.id).in('application_status', ['submitted','under_review']).select('id').maybeSingle();
    if (updateError || !updated) { setBusy(''); alert('Não foi possível atualizar a candidatura: ' + (updateError?.message || 'A candidatura já foi analisada.')); return; }

    if (approve) {
      const { data: plan, error: planError } = await supabase.from('media_plans').select('*').eq('id', payment.plan_id).single();
      if (planError || !plan) {
        await supabase.from('media_applications').update({ application_status: 'submitted', reviewed_at: null, reviewed_by: null }).eq('id', app.id);
        setBusy('');
        alert('Não foi possível localizar o plano aprovado. A candidatura voltou para a fila.');
        return;
      }
      const start = new Date();
      const end = new Date(start.getTime() + Number(plan.duration_days) * 86400000);
      const { error: profileError } = await supabase.from('media_profiles').upsert({
        user_id: app.user_id, application_id: app.id, display_name: app.display_name,
        country_id: app.country_id, content_category: app.content_category,
        languages: app.languages || [], bio: app.bio, social_links: app.social_links || {},
        status: 'active', activated_at: start.toISOString(),
      }, { onConflict: 'user_id' });
      if (profileError) {
        await supabase.from('media_applications').update({ application_status: 'submitted', reviewed_at: null, reviewed_by: null }).eq('id', app.id);
        setBusy('');
        alert('A aprovação não foi concluída ao criar o perfil: ' + profileError.message);
        return;
      }
      const { error: subscriptionError } = await supabase.from('media_subscriptions').insert({
        user_id: app.user_id, media_profile_id: app.user_id, plan_id: plan.id,
        starts_at: start.toISOString(), expires_at: end.toISOString(),
        status: 'active', payment_submission_id: payment.id,
      });
      if (subscriptionError) {
        await supabase.from('media_profiles').delete().eq('user_id', app.user_id);
        await supabase.from('media_applications').update({ application_status: 'submitted', reviewed_at: null, reviewed_by: null }).eq('id', app.id);
        setBusy('');
        alert('Não foi possível ativar a subscrição: ' + subscriptionError.message);
        return;
      }
    }
    setBusy('');
    await loadAll();
    alert(approve ? 'Criador aprovado. Perfil e plano anual ativados.' : 'Candidatura recusada. O pagamento não foi apagado; deve ser tratado separadamente.');
  }

  const filteredApps = applications.filter((app) => filter === 'all' || app.application_status === filter);
  if (loading) return <main style={{ padding: 30, color: '#243' }}>A carregar administração MÍDIA TALAZA…</main>;
  if (!authorized) return <main style={{ padding: 30, fontFamily: 'system-ui' }}><h1>Acesso reservado</h1><p>Esta área é exclusiva da administração Talaza.</p><Link href="/">Voltar</Link></main>;

  return (
    <>
      <Head><title>Administração MÍDIA | TALAZA</title></Head>
      <main style={{ minHeight: '100vh', background: '#F2F4F7', padding: '24px 16px 60px', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ maxWidth: 1050, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div><div style={{ color: '#9A741D', fontWeight: 900, letterSpacing: 1, fontSize: 12 }}>TALAZA · ADMINISTRAÇÃO</div><h1 style={{ margin: '6px 0', color: '#1C2945' }}>MÍDIA TALAZA</h1><p style={{ margin: 0, color: '#667080', fontSize: 13 }}>Candidaturas, comprovativos e ativação de criadores.</p></div>
            <Link href="/admin" style={{ color: '#174F45', fontWeight: 800, textDecoration: 'none' }}>← Administração Comercial</Link>
          </div>

          <section style={{ ...card, marginTop: 22 }}>
            <h2 style={{ margin: '0 0 8px', color: '#1C2945', fontSize: 19 }}>Dados bancários para Angola</h2>
            <p style={{ margin: '0 0 12px', color: '#697586', fontSize: 13 }}>Estes dados são apresentados aos candidatos. Não são partilhados com a área Comercial.</p>
            <form onSubmit={saveSettings}>
              <label>Banco<input style={field} value={settings.bank_name} onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })} /></label>
              <label>Titular da conta<input style={field} value={settings.account_holder} onChange={(e) => setSettings({ ...settings, account_holder: e.target.value })} /></label>
              <label>Número de conta<input style={field} value={settings.account_number} onChange={(e) => setSettings({ ...settings, account_number: e.target.value })} /></label>
              <label>IBAN<input style={field} value={settings.iban} onChange={(e) => setSettings({ ...settings, iban: e.target.value })} /></label>
              <label>Instruções adicionais<textarea rows={3} style={field} value={settings.transfer_instructions} onChange={(e) => setSettings({ ...settings, transfer_instructions: e.target.value })} /></label>
              <button disabled={savingSettings} style={{ marginTop: 14, border: 0, borderRadius: 10, padding: '12px 18px', background: '#1B3158', color: '#FFF', fontWeight: 900 }}>{savingSettings ? 'A guardar…' : 'Guardar dados bancários'}</button>
            </form>
          </section>

          <section style={card}>
            <h2 style={{ margin: '0 0 12px', color: '#1C2945', fontSize: 19 }}>Candidaturas de Criadores</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {['all','submitted','under_review','approved','rejected'].map((value) => <button key={value} onClick={() => setFilter(value)} style={{ border: filter === value ? '1px solid #1B3158' : '1px solid #D7DFE5', borderRadius: 99, padding: '8px 12px', background: filter === value ? '#1B3158' : '#FFF', color: filter === value ? '#FFF' : '#35445A', fontWeight: 800, fontSize: 12 }}>{value === 'all' ? 'Todas' : value}</button>)}
              <button onClick={loadAll} style={{ marginLeft: 'auto', border: '1px solid #D7DFE5', borderRadius: 99, padding: '8px 12px', background: '#FFF', color: '#35445A', fontWeight: 800 }}>Atualizar</button>
            </div>
            {filteredApps.length === 0 && <p style={{ color: '#697586' }}>Não há candidaturas nesta categoria.</p>}
            {filteredApps.map((app) => {
              const appPayments = payments.filter((payment) => payment.application_id === app.id);
              const currentPayment = appPayments[0];
              return <article key={app.id} style={{ border: '1px solid #E4E8EC', borderRadius: 14, padding: 15, marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div><h3 style={{ margin: 0, color: '#1C2945' }}>{app.display_name}</h3><p style={{ margin: '5px 0', color: '#657080', fontSize: 13 }}>{app.countries?.name || 'País não indicado'} · {app.content_category} · {(app.languages || []).join(', ')}</p><p style={{ margin: '5px 0', color: '#657080', fontSize: 12 }}>Criado em {new Date(app.created_at).toLocaleString('pt-PT')} · Estado: <b>{app.application_status}</b></p></div>
                  <div style={{ color: '#9A741D', fontWeight: 900, fontSize: 12 }}>{currentPayment ? 'Pagamento: ' + currentPayment.status : 'Sem comprovativo'}</div>
                </div>
                {app.bio && <p style={{ color: '#455366', fontSize: 13, lineHeight: 1.5 }}>{app.bio}</p>}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 13 }}>
                  {Object.entries(app.social_links || {}).map(([network,url]) => <a key={network} href={url} target="_blank" rel="noreferrer" style={{ color: '#175B4D', fontWeight: 800 }}>{network}</a>)}
                </div>
                {appPayments.map((payment) => <div key={payment.id} style={{ marginTop: 12, padding: 12, background: '#F7F8FA', borderRadius: 10 }}>
                  <div style={{ color: '#465368', fontSize: 13 }}>Pagamento: <b>{Number(payment.amount).toLocaleString('pt-PT')} {payment.currency}</b> · {payment.status}{payment.payment_reference ? ' · Ref. ' + payment.payment_reference : ''}</div>
                  {proofUrls[payment.id] && <p style={{ margin: '8px 0' }}><a href={proofUrls[payment.id]} target="_blank" rel="noreferrer" style={{ color: '#175B4D', fontWeight: 900 }}>Abrir comprovativo privado</a></p>}
                  {payment.status === 'pending' && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    <button disabled={!!busy} onClick={() => reviewPayment(payment,'approved')} style={{ border: 0, borderRadius: 9, padding: '9px 13px', background: '#17664F', color: '#FFF', fontWeight: 800 }}>Confirmar pagamento</button>
                    <button disabled={!!busy} onClick={() => reviewPayment(payment,'rejected')} style={{ border: 0, borderRadius: 9, padding: '9px 13px', background: '#A93A45', color: '#FFF', fontWeight: 800 }}>Rejeitar comprovativo</button>
                  </div>}
                  {payment.review_notes && <p style={{ color: '#A12B36', fontSize: 12 }}>{payment.review_notes}</p>}
                </div>)}
                {app.application_status === 'submitted' || app.application_status === 'under_review' ? <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 13 }}>
                  <button disabled={!!busy} onClick={() => reviewApplication(app,true)} style={{ border: 0, borderRadius: 9, padding: '10px 14px', background: '#1B3158', color: '#FFF', fontWeight: 900 }}>Aprovar candidatura e ativar</button>
                  <button disabled={!!busy} onClick={() => reviewApplication(app,false)} style={{ border: 0, borderRadius: 9, padding: '10px 14px', background: '#FFF', color: '#A12B36', border: '1px solid #E2BFC3', fontWeight: 900 }}>Recusar candidatura</button>
                </div> : null}
                {app.review_notes && <p style={{ color: '#A12B36', fontSize: 13 }}>Nota administrativa: {app.review_notes}</p>}
              </article>;
            })}
          </section>
          {message && <p role="alert" style={{ color: '#A12B36' }}>{message}</p>}
        </div>
      </main>
    </>
  );
}
