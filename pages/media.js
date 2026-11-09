import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function MediaHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [application, setApplication] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) { await router.replace('/login?next=/media'); return; }
    const userId = authData.user.id;
    const [{ data: creator, error: profileError }, { data: app, error: appError }] = await Promise.all([
      supabase.from('media_profiles').select('user_id,display_name,country_id,content_category,languages,bio,status,activated_at').eq('user_id', userId).maybeSingle(),
      supabase.from('media_applications').select('id,display_name,application_status,review_notes,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (profileError || appError) setError((profileError || appError).message);
    setProfile(creator || null);
    setApplication(app || null);
    if (creator) {
      const { data: plan, error: planError } = await supabase.from('media_subscriptions').select('status,starts_at,expires_at,media_plans(name)').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (planError) setError(planError.message);
      setSubscription(plan || null);
    }
    setLoading(false);
  }

  const active = profile?.status === 'active' && subscription?.status === 'active' && new Date(subscription.expires_at).getTime() > Date.now();

  if (loading) return <main style={{ padding: 30, color: '#243' }}>A carregar MÍDIA TALAZA…</main>;

  return (
    <>
      <Head><title>MÍDIA TALAZA</title></Head>
      <main style={{ minHeight: '100vh', padding: '28px 16px 60px', background: 'linear-gradient(150deg,#11182F,#24395D)', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ maxWidth: 950, margin: '0 auto' }}>
          <Link href="/" style={{ color: '#F2D77F', textDecoration: 'none', fontWeight: 800 }}>← TALAZA</Link>
          <header style={{ margin: '30px 0 22px', color: '#FFF' }}>
            <div style={{ color: '#E7C66D', letterSpacing: 2, fontSize: 12, fontWeight: 900 }}>PLATAFORMA INTERNACIONAL DE CRIADORES</div>
            <h1 style={{ margin: '8px 0', fontSize: 36 }}>MÍDIA TALAZA</h1>
            <p style={{ color: 'rgba(255,255,255,.75)', maxWidth: 600, lineHeight: 1.6 }}>O espaço independente para criadores, conteúdos e audiências de vários países.</p>
          </header>

          {active ? <section style={{ background: '#FFF', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'inline-block', padding: '6px 10px', borderRadius: 99, background: '#E8F5EF', color: '#17664F', fontWeight: 900, fontSize: 12 }}>CRIADOR ATIVO</div>
            <h2 style={{ color: '#1B2744', fontSize: 28, margin: '12px 0 5px' }}>Bem-vindo, {profile.display_name}</h2>
            <p style={{ color: '#647080', marginTop: 0 }}>{profile.content_category} · {(profile.languages || []).join(', ')}</p>
            <div style={{ border: '1px solid #E4E8ED', borderRadius: 14, padding: 16, marginTop: 18 }}>
              <b style={{ color: '#1B2744' }}>Plano anual</b>
              <p style={{ color: '#647080', fontSize: 13 }}>Válido até {new Date(subscription.expires_at).toLocaleDateString('pt-PT')}</p>
            </div>
            <h3 style={{ color: '#1B2744', marginTop: 28 }}>O seu espaço de criador</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
              {['Publicações e vídeos','EN LIVE','Estreias','O Povo Fala','Rede de parcerias'].map((item) => <div key={item} style={{ borderRadius: 13, background: '#F4F6F9', padding: 17, color: '#566276', fontWeight: 800 }}>{item}<div style={{ marginTop: 6, fontSize: 11, fontWeight: 500 }}>Área em preparação</div></div>)}
            </div>
          </section> : <section style={{ background: '#FFF', borderRadius: 20, padding: 24 }}>
            <h2 style={{ color: '#1B2744', marginTop: 0 }}>A sua candidatura</h2>
            {application ? <>
              <p style={{ color: '#647080' }}>Estado: <b>{application.application_status}</b></p>
              {application.review_notes && <p style={{ color: '#A12B36' }}>Observação: {application.review_notes}</p>}
              <p style={{ color: '#647080', fontSize: 13 }}>O perfil de criador só será ativado após a confirmação do pagamento e a aprovação da candidatura.</p>
              {application.application_status === 'submitted' && <Link href={'/media-payment?application=' + application.id} style={{ display: 'inline-block', marginTop: 12, background: '#1B3158', color: '#FFF', textDecoration: 'none', borderRadius: 10, padding: '12px 16px', fontWeight: 900 }}>Ver plano e pagamento</Link>}
            </> : <>
              <p style={{ color: '#647080' }}>Ainda não existe uma candidatura de Criador associada a esta conta.</p>
              <Link href="/media-creator-signup" style={{ display: 'inline-block', marginTop: 12, background: '#1B3158', color: '#FFF', textDecoration: 'none', borderRadius: 10, padding: '12px 16px', fontWeight: 900 }}>Candidatar-me</Link>
            </>}
          </section>}
          {error && <p role="alert" style={{ color: '#FFE0E0', marginTop: 14 }}>{error}</p>}
        </div>
      </main>
    </>
  );
}
