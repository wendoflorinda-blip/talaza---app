import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

const C = {
  bg: '#F8F6F3',
  card: '#FFFFFF',
  ink: '#17211F',
  muted: '#596560',
  line: '#E5E9E7',
  green: '#0F6E5C',
  purple: '#7252B8',
  soft: '#F1ECFA',
};

export default function OportunidadeDetalhe() {
  const router = useRouter();
  const { id, country, province } = router.query;
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const backHref = useMemo(() => {
    const params = new URLSearchParams();
    if (country) params.set('country', String(country));
    if (province) params.set('province', String(province));
    return '/oportunidades' + (params.toString() ? '?' + params.toString() : '');
  }, [country, province]);

  useEffect(() => {
    if (!router.isReady || !id) return;
    let cancelled = false;
    async function loadOpportunity() {
      setLoading(true);
      setError('');
      const { data, error: queryError } = await supabase
        .from('job_posts')
        .select('id,title,description,requirements,area,profession,municipality,neighborhood,salary,work_availability,professional_competence,image_url,created_at,expires_at,country_id,province_id,is_active,status,payment_status,admin_approved')
        .eq('id', id)
        .eq('is_active', true)
        .eq('status', 'published')
        .eq('country_id', country || '')
        .eq('province_id', province || '')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      if (cancelled) return;
      if (queryError || !data || data.admin_approved === false || (data.payment_status && data.payment_status !== 'approved')) {
        setError('Esta oportunidade já não está disponível ou não foi possível encontrá-la nesta província.');
        setOpportunity(null);
      } else {
        setOpportunity(data);
      }
      setLoading(false);
    }
    loadOpportunity();
    return () => { cancelled = true; };
  }, [router.isReady, id, country, province]);

  function date(value) {
    if (!value) return '';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  return (
    <main style={S.page}>
      <Head><title>{opportunity?.title ? opportunity.title + ' | Oportunidades Talaza' : 'Oportunidade | Talaza'}</title></Head>
      <div style={S.container}>
        <header style={S.header}>
          <Link href={backHref} style={S.back}>← Voltar às Oportunidades</Link>
          <span style={S.brand}>TALAZA</span>
        </header>
        {loading ? <section style={S.state}>A carregar oportunidade…</section> : error ? (
          <section style={S.state}>
            <h1 style={S.title}>Oportunidade indisponível</h1>
            <p>{error}</p>
            <Link href={backHref} style={S.button}>Voltar às Oportunidades</Link>
          </section>
        ) : opportunity ? (
          <article style={S.card}>
            {opportunity.image_url ? <img src={opportunity.image_url} alt={opportunity.title} style={S.image} /> : null}
            <div style={S.content}>
              <div style={S.tags}>
                {opportunity.area ? <span style={S.tag}>{opportunity.area}</span> : null}
                {opportunity.profession ? <span style={S.tagAlt}>{opportunity.profession}</span> : null}
              </div>
              <h1 style={S.title}>{opportunity.title}</h1>
              <p style={S.meta}>Publicado em {date(opportunity.created_at)}{opportunity.expires_at ? ' · Disponível até ' + date(opportunity.expires_at) : ''}</p>
              <section style={S.section}><h2>Descrição</h2><p>{opportunity.description}</p></section>
              {opportunity.requirements ? <section style={S.section}><h2>Competências e experiência</h2><p>{opportunity.requirements}</p></section> : null}
              {opportunity.professional_competence ? <section style={S.section}><h2>Competências profissionais</h2><p>{opportunity.professional_competence}</p></section> : null}
              {opportunity.work_availability ? <section style={S.section}><h2>Disponibilidade</h2><p>{opportunity.work_availability}</p></section> : null}
              {opportunity.salary ? <section style={S.section}><h2>Remuneração</h2><p>{opportunity.salary}</p></section> : null}
              {(opportunity.municipality || opportunity.neighborhood) ? <section style={S.section}><h2>Localização</h2><p>{[opportunity.municipality, opportunity.neighborhood].filter(Boolean).join(' · ')}</p></section> : null}
              <Link href={backHref} style={S.button}>← Voltar às Oportunidades</Link>
            </div>
          </article>
        ) : null}
      </div>
    </main>
  );
}

const S = {
  page: { minHeight: '100vh', background: C.bg, color: C.ink, padding: '20px 16px 60px', fontFamily: 'Arial, Helvetica, sans-serif' },
  container: { width: '100%', maxWidth: 880, margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 },
  back: { color: C.purple, textDecoration: 'none', fontWeight: 800, fontSize: 13, padding: '10px 12px', borderRadius: 10, background: C.soft, border: '1px solid #D9C6E9' },
  brand: { color: C.green, fontWeight: 900, letterSpacing: 2, fontSize: 13 },
  card: { overflow: 'hidden', border: '1px solid ' + C.line, borderRadius: 22, background: C.card, boxShadow: '0 10px 35px rgba(23,33,31,.06)' },
  image: { display: 'block', width: '100%', maxHeight: 420, objectFit: 'cover', background: '#E8EEEA' },
  content: { padding: 'clamp(18px, 4vw, 34px)' },
  tags: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tag: { padding: '6px 10px', borderRadius: 999, background: '#E8F3F0', color: C.green, fontSize: 11, fontWeight: 800 },
  tagAlt: { padding: '6px 10px', borderRadius: 999, background: C.soft, color: C.purple, fontSize: 11, fontWeight: 800 },
  title: { margin: '8px 0 10px', fontSize: 'clamp(24px, 4vw, 34px)', lineHeight: 1.15 },
  meta: { color: C.muted, fontSize: 12, marginBottom: 24 },
  section: { borderTop: '1px solid ' + C.line, padding: '17px 0 4px', lineHeight: 1.7 },
  state: { padding: 28, borderRadius: 18, background: C.card, border: '1px solid ' + C.line, lineHeight: 1.6 },
  button: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 16, padding: '12px 16px', borderRadius: 12, background: C.green, color: '#FFFFFF', fontWeight: 800, textDecoration: 'none' },
};
