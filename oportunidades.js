import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Oportunidades() {
  const router = useRouter();

  const { country, province } = router.query;

  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [jobs, setJobs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    if (!country || !province) {
      router.replace('/country');
      return;
    }

    loadPage();
  }, [router.isReady, country, province]);

  async function loadPage() {
    setLoading(true);
    setError('');

    try {
      const { data: countryData, error: countryError } =
        await supabase
          .from('countries')
          .select('id, name')
          .eq('id', country)
          .single();

      if (countryError) throw countryError;

      const { data: provinceData, error: provinceError } =
        await supabase
          .from('provinces')
          .select('id, name')
          .eq('id', province)
          .eq('country_id', country)
          .single();

      if (provinceError) throw provinceError;

      const { data: jobsData, error: jobsError } =
        await supabase
          .from('job_posts')
          .select(`
            id,
            created_at,
            title,
            description,
            requirements,
            work_schedule,
            salary,
            whatsapp,
            municipality,
            neighborhood,
            category_id,
            subcategory_id
          `)
          .eq('country_id', country)
          .eq('province_id', province)
          .eq('is_active', true)
          .eq('status', 'published')
          .order('created_at', {
            ascending: false,
          });

      if (jobsError) throw jobsError;

      setCountryName(countryData?.name || '');
      setProvinceName(provinceData?.name || '');
      setJobs(jobsData || []);
    } catch (err) {
      console.error(
        'ERRO OPORTUNIDADES:',
        err
      );

      setError(
        'Não foi possível carregar as oportunidades.'
      );

      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="container"
      style={{
        paddingBottom: 60,
      }}
    >
      <nav
        className="topnav"
        style={{
          padding: '12px 0',
        }}
      >
        <Link
          href={{
            pathname: '/explore',
            query: {
              country,
              province,
            },
          }}
          style={{
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            className="logo"
            style={{
              background: '#075B4E',
              color: '#E6A900',
            }}
          >
            T
          </div>

          <b>Talaza</b>
        </Link>

        <Link
          href={{
            pathname: '/explore',
            query: {
              country,
              province,
            },
          }}
          className="btn btn-ghost"
          style={{
            fontSize: 12,
          }}
        >
          ← Voltar
        </Link>
      </nav>

      <section
        style={{
          marginTop: 20,
          padding: 22,
          borderRadius: 20,
          background:
            'linear-gradient(135deg,#075B4E,#0C7564)',
          color: '#FFFFFF',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            padding: '6px 10px',
            borderRadius: 999,
            background:
              'rgba(255,255,255,0.12)',
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          {countryName} · {provinceName}
        </div>

        <h1
          style={{
            margin: '12px 0 8px',
            fontSize: 29,
            lineHeight: 1.15,
          }}
        >
          Oportunidades
        </h1>

        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.6,
            opacity: 0.94,
          }}
        >
          Encontre vagas e oportunidades publicadas
          por pessoas, empresas e contratantes da sua
          província.
        </p>
      </section>

      <div
        style={{
          marginTop: 22,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
            }}
          >
            Vagas disponíveis
          </h2>

          <p
            style={{
              margin: '5px 0 0',
              fontSize: 12,
              color: 'var(--ink-soft)',
            }}
          >
            {provinceName}
          </p>
        </div>

        <Link
          href={{
            pathname: '/contratar',
            query: {
              country,
              province,
            },
          }}
          className="btn btn-primary"
          style={{
            fontSize: 12,
          }}
        >
          Publicar vaga
        </Link>
      </div>

      {loading && (
        <p
          style={{
            marginTop: 20,
            color: 'var(--ink-faint)',
          }}
        >
          A carregar oportunidades…
        </p>
      )}

      {error && (
        <div
          style={{
            marginTop: 18,
            padding: 14,
            borderRadius: 13,
            background: '#FFF1F0',
            color: '#9B2C2C',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {!loading &&
        !error &&
        jobs.length === 0 && (
          <div
            style={{
              marginTop: 20,
              padding: 20,
              borderRadius: 16,
              background: '#FFFFFF',
              border:
                '1px solid #DCE6E3',
              color: '#7A8986',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            Ainda não existem oportunidades publicadas
            nesta província.
          </div>
        )}

      {!loading &&
        !error &&
        jobs.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit,minmax(260px,1fr))',
              gap: 12,
              marginTop: 18,
            }}
          >
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={{
                  pathname: '/oportunidade',
                  query: {
                    id: job.id,
                    country,
                    province,
                  },
                }}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  background: '#FFFFFF',
                  border:
                    '1px solid #DCE6E3',
                  borderRadius: 16,
                  padding: 16,
                  display: 'block',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: '#075B4E',
                    fontWeight: 800,
                    marginBottom: 7,
                  }}
                >
                  OPORTUNIDADE
                </div>

                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    lineHeight: 1.35,
                  }}
                >
                  {job.title}
                </h3>

                <p
                  style={{
                    margin: '8px 0 0',
                    fontSize: 12,
                    color: 'var(--ink-soft)',
                    lineHeight: 1.5,
                    display:
                      '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient:
                      'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {job.description}
                </p>

                {(job.municipality ||
                  job.neighborhood) && (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 10,
                      color: '#7A8986',
                    }}
                  >
                    {job.municipality}

                    {job.municipality &&
                    job.neighborhood
                      ? ' · '
                      : ''}

                    {job.neighborhood}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}
