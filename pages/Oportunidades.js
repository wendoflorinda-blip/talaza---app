import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Oportunidades() {
  const router = useRouter();

  const { country, province } = router.query;

  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');

  const [opportunities, setOpportunities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    loadLocationNames();
    loadOpportunities();
  }, [router.isReady, country, province]);

  async function loadLocationNames() {
    try {
      if (country) {
        const { data: countryData } = await supabase
          .from('countries')
          .select('name')
          .eq('id', country)
          .single();

        if (countryData) {
          setCountryName(countryData.name);
        }
      }

      if (province) {
        const { data: provinceData } = await supabase
          .from('provinces')
          .select('name')
          .eq('id', province)
          .single();

        if (provinceData) {
          setProvinceName(provinceData.name);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar localização:', err);
    }
  }

  async function loadOpportunities() {
    setLoading(true);
    setError('');

    try {
      if (!country || !province) {
        setOpportunities([]);
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('job_posts')
        .select('*')
        .eq('country_id', country)
        .eq('province_id', province)
        .eq('is_active', true)
        .eq('status', 'published')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (queryError) {
        throw queryError;
      }

      setOpportunities(data || []);
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar as oportunidades.');
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);

    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function openWhatsApp(number) {
    if (!number) return;

    const cleanNumber = number.replace(/[^\d]/g, '');

    if (!cleanNumber) return;

    window.open(
      `https://wa.me/${cleanNumber}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <Link
            href={`/explore?country=${encodeURIComponent(
              country || ''
            )}&province=${encodeURIComponent(province || '')}`}
            style={styles.backButton}
          >
            ← Voltar
          </Link>

          <div>
            <div style={styles.eyebrow}>TALAZA</div>

            <h1 style={styles.title}>Oportunidades</h1>

            {(countryName || provinceName) && (
              <p style={styles.location}>
                {countryName}
                {countryName && provinceName ? ' · ' : ''}
                {provinceName}
              </p>
            )}
          </div>
        </header>

        <div style={styles.topBar}>
          <div>
            <h2 style={styles.heading}>Oportunidades disponíveis</h2>

            <p style={styles.description}>
              Encontre vagas e oportunidades publicadas na sua província.
            </p>
          </div>

          <Link
            href={`/contratar?country=${encodeURIComponent(
              country || ''
            )}&province=${encodeURIComponent(province || '')}`}
            style={styles.publishLink}
          >
            + Publicar
          </Link>
        </div>

        {loading && (
          <div style={styles.emptyBox}>
            <p>Carregando oportunidades...</p>
          </div>
        )}

        {!loading && error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {!loading && !error && opportunities.length === 0 && (
          <div style={styles.emptyBox}>
            <div style={styles.emptyIcon}>⌁</div>

            <h3 style={styles.emptyTitle}>
              Ainda não há oportunidades
            </h3>

            <p style={styles.emptyText}>
              Quando alguém publicar uma oportunidade nesta província,
              ela aparecerá aqui.
            </p>

            <Link
              href={`/contratar?country=${encodeURIComponent(
                country || ''
              )}&province=${encodeURIComponent(province || '')}`}
              style={styles.emptyButton}
            >
              Publicar uma oportunidade
            </Link>
          </div>
        )}

        {!loading && !error && opportunities.length > 0 && (
          <div style={styles.list}>
            {opportunities.map((opportunity) => (
              <article
                key={opportunity.id}
                style={styles.card}
              >
                {opportunity.image_url && (
                  <img
                    src={opportunity.image_url}
                    alt={opportunity.title || 'Oportunidade'}
                    style={styles.cardImage}
                  />
                )}

                <div style={styles.cardContent}>
                  <div style={styles.tags}>
                    {opportunity.area && (
                      <span style={styles.tag}>
                        {opportunity.area}
                      </span>
                    )}

                    {opportunity.profession && (
                      <span style={styles.tagSecondary}>
                        {opportunity.profession}
                      </span>
                    )}
                  </div>

                  <h3 style={styles.cardTitle}>
                    {opportunity.title}
                  </h3>

                  {opportunity.description && (
                    <p style={styles.cardDescription}>
                      {opportunity.description}
                    </p>
                  )}

                  {opportunity.requirements && (
                    <div style={styles.infoBlock}>
                      <strong>Competências / experiência</strong>

                      <p>{opportunity.requirements}</p>
                    </div>
                  )}

                  {opportunity.work_availability && (
                    <div style={styles.infoBlock}>
                      <strong>Disponibilidade</strong>

                      <p>{opportunity.work_availability}</p>
                    </div>
                  )}

                  {opportunity.salary && (
                    <div style={styles.infoBlock}>
                      <strong>Salário</strong>

                      <p>{opportunity.salary}</p>
                    </div>
                  )}

                  {(opportunity.municipality ||
                    opportunity.neighborhood) && (
                    <div style={styles.locationInfo}>
                      <strong>Localização</strong>

                      <span>
                        {opportunity.municipality || ''}
                        {opportunity.municipality &&
                        opportunity.neighborhood
                          ? ' · '
                          : ''}
                        {opportunity.neighborhood || ''}
                      </span>
                    </div>
                  )}

                  <div style={styles.footer}>
                    <span style={styles.date}>
                      Publicado em{' '}
                      {formatDate(opportunity.created_at)}
                    </span>

                    <div style={styles.actions}>
                      {opportunity.whatsapp && (
                        <button
                          type="button"
                          onClick={() =>
                            openWhatsApp(opportunity.whatsapp)
                          }
                          style={styles.whatsappButton}
                        >
                          WhatsApp
                        </button>
                      )}

                      <Link
                        href={`/oportunidade/${opportunity.id}?country=${encodeURIComponent(
                          country || ''
                        )}&province=${encodeURIComponent(
                          province || ''
                        )}`}
                        style={styles.messageButton}
                      >
                        Ver oportunidade
                      </Link>
                    </div>
                  </div>

                  <div style={styles.expiry}>
                    Disponível até{' '}
                    {formatDate(opportunity.expires_at)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f6f7f9',
    color: '#151515',
    padding: '24px 16px 60px',
  },

  container: {
    width: '100%',
    maxWidth: '900px',
    margin: '0 auto',
  },

  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '30px',
  },

  backButton: {
    textDecoration: 'none',
    color: '#111',
    fontSize: '14px',
    fontWeight: '600',
    paddingTop: '10px',
    whiteSpace: 'nowrap',
  },

  eyebrow: {
    fontSize: '11px',
    letterSpacing: '2px',
    fontWeight: '800',
    color: '#777',
    marginBottom: '5px',
  },

  title: {
    margin: 0,
    fontSize: '34px',
    lineHeight: 1.1,
    fontWeight: '800',
  },

  location: {
    margin: '8px 0 0',
    color: '#777',
    fontSize: '14px',
  },

  topBar: {
    background: '#fff',
    borderRadius: '20px',
    padding: '22px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '18px',
    marginBottom: '18px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
  },

  heading: {
    margin: 0,
    fontSize: '21px',
    fontWeight: '800',
  },

  description: {
    margin: '6px 0 0',
    color: '#777',
    fontSize: '14px',
  },

  publishLink: {
    textDecoration: 'none',
    background: '#111',
    color: '#fff',
    padding: '12px 17px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '800',
    whiteSpace: 'nowrap',
  },

  list: {
    display: 'grid',
    gap: '16px',
  },

  card: {
    background: '#fff',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
  },

  cardImage: {
    width: '100%',
    maxHeight: '430px',
    objectFit: 'cover',
    display: 'block',
    background: '#f1f1f1',
  },

  cardContent: {
    padding: '22px',
  },

  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '7px',
    marginBottom: '11px',
  },

  tag: {
    background: '#111',
    color: '#fff',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '11px',
    fontWeight: '700',
  },

  tagSecondary: {
    background: '#f0f0f0',
    color: '#444',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '11px',
    fontWeight: '700',
  },

  cardTitle: {
    margin: 0,
    fontSize: '22px',
    lineHeight: 1.25,
    fontWeight: '800',
  },

  cardDescription: {
    margin: '12px 0 0',
    color: '#555',
    lineHeight: 1.65,
    fontSize: '15px',
    whiteSpace: 'pre-wrap',
  },

  infoBlock: {
    marginTop: '16px',
    paddingTop: '14px',
    borderTop: '1px solid #eee',
    fontSize: '14px',
  },

  infoBlockStrong: {
    fontWeight: '800',
  },

  infoBlockP: {
    margin: '5px 0 0',
    color: '#555',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  },

  locationInfo: {
    marginTop: '16px',
    paddingTop: '14px',
    borderTop: '1px solid #eee',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    fontSize: '14px',
  },

  footer: {
    marginTop: '18px',
    paddingTop: '16px',
    borderTop: '1px solid #eee',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '14px',
    flexWrap: 'wrap',
  },

  date: {
    color: '#888',
    fontSize: '12px',
  },

  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },

  whatsappButton: {
    border: 0,
    background: '#e9f7ed',
    color: '#17652b',
    borderRadius: '10px',
    padding: '10px 13px',
    fontSize: '13px',
    fontWeight: '800',
    cursor: 'pointer',
  },

  messageButton: {
    textDecoration: 'none',
    background: '#111',
    color: '#fff',
    borderRadius: '10px',
    padding: '10px 13px',
    fontSize: '13px',
    fontWeight: '800',
  },

  expiry: {
    marginTop: '12px',
    color: '#999',
    fontSize: '11px',
  },

  emptyBox: {
    background: '#fff',
    borderRadius: '20px',
    padding: '50px 24px',
    textAlign: 'center',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
  },

  emptyIcon: {
    fontSize: '35px',
    color: '#aaa',
    marginBottom: '10px',
  },

  emptyTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '800',
  },

  emptyText: {
    maxWidth: '480px',
    margin: '9px auto 20px',
    color: '#777',
    lineHeight: 1.6,
    fontSize: '14px',
  },

  emptyButton: {
    display: 'inline-block',
    textDecoration: 'none',
    background: '#111',
    color: '#fff',
    padding: '12px 18px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '800',
  },

  error: {
    background: '#fff0f0',
    border: '1px solid #f1caca',
    color: '#a12626',
    borderRadius: '14px',
    padding: '15px',
  },
};

