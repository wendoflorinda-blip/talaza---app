import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function BusinessProfile() {
  const router = useRouter();
  const { id } = router.query;
  const [biz, setBiz] = useState(null);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (!id) return;
    supabase.from('businesses').select('*').eq('id', id).single().then(({ data }) => setBiz(data));
    supabase.from('reviews').select('*').eq('business_id', id).then(({ data }) => setReviews(data || []));
  }, [id]);

  if (!biz) return <div className="container"><p style={{ marginTop: 30 }}>A carregar…</p></div>;

  return (
    <div className="container">
      <Link href="/" style={{ display: 'inline-block', margin: '16px 0', color: 'var(--brand)', fontWeight: 600 }}>← Voltar</Link>
      <div className="card">
        {biz.is_premium && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold-dark)' }}>👑 PREMIUM</span>}
        <h1 style={{ fontSize: 24, margin: '6px 0' }}>{biz.name}</h1>
        <p style={{ color: 'var(--ink-soft)' }}>{biz.category} · {biz.municipality || ''}</p>
        <p style={{ marginTop: 12 }}>{biz.description}</p>
        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          {biz.whatsapp && <a className="btn btn-brand" href={`https://wa.me/${biz.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a>}
          {biz.phone && <a className="btn btn-ghost" href={`tel:${biz.phone}`}>Ligar</a>}
        </div>
      </div>

      <h3 style={{ marginTop: 24 }}>Avaliações</h3>
      {reviews.map(r => (
        <div key={r.id} className="card" style={{ marginTop: 10 }}>
          <div>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{r.comment}</p>
        </div>
      ))}
      {reviews.length === 0 && <p style={{ color: 'var(--ink-faint)' }}>Ainda sem avaliações.</p>}
    </div>
  );
}
