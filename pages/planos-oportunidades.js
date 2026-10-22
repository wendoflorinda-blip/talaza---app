import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import PlanCards from './Plancards';

const PLAN_ID = '0fff05f6-c619-4c72-ba3e-3a0028eafef7';
const C = {
  bg: '#F8F6F3', card: '#FFFFFF', ink: '#17211F', muted: '#596560',
  line: '#E5E9E7', green: '#0F6E5C', greenSoft: '#E8F3F0',
  purple: '#7252B8', purpleSoft: '#F1ECFA', gold: '#DDA10A',
};

export default function PlanosOportunidades() {
  const router = useRouter();
  const { country, province } = router.query;
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    let cancelled = false;
    async function loadPlan() {
      setLoading(true);
      setError('');
      const { data, error: queryError } = await supabase
        .from('plans')
        .select('id,name,price,duration_days,description,plan_type,area,is_active')
        .eq('id', PLAN_ID)
        .eq('is_active', true)
        .maybeSingle();
      if (cancelled) return;
      if (queryError || !data) {
        setError('Não foi possível carregar os benefícios deste plano. Tente novamente.');
        setPlan(null);
      } else {
        setPlan(data);
      }
      setLoading(false);
    }
    loadPlan();
    return () => { cancelled = true; };
  }, [router.isReady]);

  function choosePlan(selectedPlan) {
    const query = new URLSearchParams();
    query.set('plan', selectedPlan.id);
    query.set('subscription', 'opportunities');
    if (country) query.set('country_id', String(country));
    if (province) query.set('province_id', String(province));
    query.set('returnTo', '/oportunidades' + ((country || province) ? '?' + new URLSearchParams({
      ...(country ? { country: String(country) } : {}),
      ...(province ? { province: String(province) } : {}),
    }).toString() : ''));
    router.push('/Pagamento?' + query.toString());
  }

  const opportunitiesUrl = '/oportunidades' + ((country || province) ? '?' + new URLSearchParams({
    ...(country ? { country: String(country) } : {}),
    ...(province ? { province: String(province) } : {}),
  }).toString() : '');

  return (
    <main style={{ minHeight: '100vh', background: C.bg, color: C.ink, padding: '22px 16px 60px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <Head><title>Plano de Oportunidades | Talaza</title><meta name="description" content="Conheça os benefícios do plano de acesso às Oportunidades Talaza." /></Head>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <Link href={opportunitiesUrl} style={{ textDecoration: 'none', fontWeight: 800, color: C.purple, background: C.purpleSoft, border: '1px solid #D9C6E9', borderRadius: 12, padding: '10px 14px' }}>← Voltar às Oportunidades</Link>
          <strong style={{ letterSpacing: 2, color: C.green }}>TALAZA</strong>
        </header>
        <section style={{ borderRadius: 24, padding: 'clamp(22px,5vw,38px)', background: 'linear-gradient(135deg,#083F35,#0F6E5C)', color: '#FFFFFF', marginBottom: 22 }}>
          <span style={{ display: 'inline-block', background: C.gold, color: '#2B2000', borderRadius: 999, padding: '7px 12px', fontSize: 12, fontWeight: 900, marginBottom: 14 }}>ACESSO A OPORTUNIDADES</span>
          <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(28px,5vw,40px)', lineHeight: 1.1 }}>Escolha o seu plano antes de pagar</h1>
          <p style={{ margin: 0, lineHeight: 1.7, color: '#E5F3EF' }}>Consulte o preço, a duração e todos os benefícios. Só depois de escolher o plano seguirá para a área de pagamento e envio do comprovativo.</p>
        </section>
        {loading ? <div style={{ padding: 24, background: C.card, border: '1px solid ' + C.line, borderRadius: 18 }}>A carregar os benefícios do plano…</div> : error ? (
          <div role="alert" style={{ padding: 24, background: C.card, border: '1px solid #E8B5B5', borderRadius: 18, color: '#8A2525' }}>{error}</div>
        ) : plan ? (
          <section style={{ background: C.card, border: '1px solid ' + C.line, borderRadius: 22, padding: 'clamp(16px,4vw,28px)' }}>
            <PlanCards plans={[plan]} order={['dourado']} onChoose={choosePlan} ctaLabel="Continuar para pagamento" />
            <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.6, margin: '18px 0 0' }}>O acesso é ativado após a confirmação do pagamento. Os benefícios apresentados acima vêm do plano registado no Talaza.</p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
