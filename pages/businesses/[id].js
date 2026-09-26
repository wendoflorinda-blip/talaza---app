import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function BusinessProfile() {
  const router = useRouter();
  const { id } = router.query;

  const [biz, setBiz] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function loadBusiness() {
      setLoading(true);

      const { data: business } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', id)
        .single();

      if (!business) {
        setBiz(null);
        setLoading(false);
        return;
      }

      setBiz(business);

      const { data: businessPhotos } = await supabase
        .from('business_photos')
        .select('*')
        .eq('business_id', id)
        .order('sort_order', { ascending: true });

      setPhotos(businessPhotos || []);

      const { data: businessReviews } = await supabase
        .from('reviews')
        .select('*')
        .eq('business_id', id);

      setReviews(businessReviews || []);

      setLoading(false);
    }

    loadBusiness();
  }, [id]);

  if (loading) {
    return (
      <div className="container">
        <p style={{ marginTop: 30 }}>A carregar perfil…</p>
      </div>
    );
  }

  if (!biz) {
    return (
      <div className="container">
        <p style={{ marginTop: 30 }}>Negócio não encontrado.</p>
        <Link href="/" className="btn btn-brand">
          Voltar à página inicial
        </Link>
      </div>
    );
  }

  const status = biz.status || biz.approval_status;

  const approved =
    status === 'approved' ||
    status === 'aprovado' ||
    status === 'active' ||
    status === 'ativo';

  if (!approved) {
    return (
      <div className="container">
        <Link
          href="/"
          style={{
            display: 'inline-block',
            margin: '16px 0',
            color: 'var(--brand)',
            fontWeight: 600
          }}
        >
          ← Voltar
        </Link>

        <div className="card" style={{ textAlign: 'center', marginTop: 30 }}>
          <div style={{ fontSize: 42 }}>⏳</div>

          <h1 style={{ marginTop: 10 }}>
            Perfil em validação
          </h1>

          <p style={{ color: 'var(--ink-soft)', lineHeight: 1.6 }}>
            Este perfil ainda está a ser analisado pela equipa Talaza.
            Assim que for aprovado, ficará disponível publicamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">

      <Link
        href="/"
        style={{
          display: 'inline-block',
          margin: '16px 0',
          color: 'var(--brand)',
          fontWeight: 600
        }}
      >
        ← Voltar
      </Link>

      {/* GALERIA */}
      {photos.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
            marginBottom: 18
          }}
        >
          {photos.map((photo) => (
            <img
              key={photo.id}
              src={photo.url}
              alt={biz.name}
              style={{
                width: '100%',
                height: 210,
                objectFit: 'cover',
                borderRadius: 16,
                display: 'block'
              }}
            />
          ))}
        </div>
      )}

      <div className="card">

        {biz.is_premium && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--gold-dark)'
            }}
          >
            👑 PREMIUM
          </span>
        )}

        <h1 style={{ fontSize: 28, margin: '8px 0' }}>
          {biz.name}
        </h1>

        <p style={{ color: 'var(--ink-soft)' }}>
          {biz.category}
          {biz.subcategory ? ` · ${biz.subcategory}` : ''}
        </p>

        {(biz.country || biz.province) && (
          <p style={{ color: 'var(--ink-soft)' }}>
            📍 {biz.country || ''}
            {biz.province ? ` · ${biz.province}` : ''}
          </p>
        )}

        {biz.municipality && (
          <p style={{ color: 'var(--ink-soft)' }}>
            Município: {biz.municipality}
          </p>
        )}

        {biz.neighborhood && (
          <p style={{ color: 'var(--ink-soft)' }}>
            Bairro: {biz.neighborhood}
          </p>
        )}

        {biz.description && (
          <p style={{ marginTop: 18, lineHeight: 1.6 }}>
            {biz.description}
          </p>
        )}

        <div
          style={{
            marginTop: 20,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10
          }}
        >
          {biz.whatsapp && (
            <a
              className="btn btn-brand"
              href={`https://wa.me/${String(biz.whatsapp).replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          )}

          {biz.phone && (
            <a
              className="btn btn-ghost"
              href={`tel:${biz.phone}`}
            >
              Ligar
            </a>
          )}
        </div>
      </div>

      {/* AVALIAÇÕES */}
      <h3 style={{ marginTop: 24 }}>
        Avaliações
      </h3>

      {reviews.map((review) => (
        <div
          key={review.id}
          className="card"
          style={{ marginTop: 10 }}
        >
          <div>
            {'★'.repeat(review.rating || 0)}
            {'☆'.repeat(5 - (review.rating || 0))}
          </div>

          {review.comment && (
            <p
              style={{
                fontSize: 13,
                color: 'var(--ink-soft)'
              }}
            >
              {review.comment}
            </p>
          )}
        </div>
      ))}

      {reviews.length === 0 && (
        <p style={{ color: 'var(--ink-faint)' }}>
          Ainda sem avaliações.
        </p>
      )}

    </div>
  );
}
