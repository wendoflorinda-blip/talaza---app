import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const C = {
  green: '#0F6E5C',
  dark: '#083F35',
  ink: '#17211F',
  muted: '#596560',
  canvas: '#F8F6F3',
  white: '#FFFFFF',
  line: '#E5E9E7',
};

export default function Province() {
  const router = useRouter();
  const countryId = router.query.country;

  const [countryName, setCountryName] = useState('Angola');
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    if (!countryId || Array.isArray(countryId)) {
      setError('Escolha primeiro um país.');
      setLoading(false);
      return;
    }

    let active = true;

    async function loadProvinces() {
      setLoading(true);
      setError('');

      const [countryResult, provinceResult] = await Promise.all([
        supabase
          .from('countries')
          .select('id, name')
          .eq('id', countryId)
          .maybeSingle(),

        supabase
          .from('provinces')
          .select('id, name, country_id')
          .eq('country_id', countryId)
          .order('name', { ascending: true }),
      ]);

      if (!active) return;

      if (countryResult.error || !countryResult.data) {
        setError('Não foi possível identificar o país seleccionado.');
        setProvinces([]);
        setLoading(false);
        return;
      }

      if (provinceResult.error) {
        setError('Não foi possível carregar as províncias.');
        setProvinces([]);
        setLoading(false);
        return;
      }

      setCountryName(countryResult.data.name || 'País seleccionado');
      setProvinces(provinceResult.data || []);
      setLoading(false);
    }

    loadProvinces();

    return () => {
      active = false;
    };
  }, [router.isReady, countryId]);

  function chooseProvince(province) {
    router.push({
      pathname: '/explore',
      query: {
        country: countryId,
        province: province.id,
      },
    });
  }

  return (
    <>
      <Head>
        <title>Escolher província | Talaza</title>
      </Head>

      <main className="page">
        <button className="back" onClick={() => router.push('/country')}>
          ← Voltar aos países
        </button>

        <section className="content">
          <div className="step">PASSO 2 DE 2</div>
          <h1>Escolha a sua província</h1>
          <p className="intro">
            País seleccionado: <strong>{countryName}</strong>. Escolha a
            província para ver os negócios da sua região.
          </p>

          {loading && <p className="status">A carregar províncias…</p>}

          {!loading && error && (
            <div className="error">
              <p>{error}</p>
              <button onClick={() => router.push('/country')}>
                Escolher país novamente
              </button>
            </div>
          )}

          {!loading && !error && provinces.length === 0 && (
            <p className="status">
              Ainda não existem províncias registadas para este país na tabela
              provinces.
            </p>
          )}

          <div className="grid">
            {provinces.map((province) => (
              <button
                key={province.id}
                className="province"
                onClick={() => chooseProvince(province)}
              >
                <span className="pin">⌖</span>
                <span>{province.name}</span>
                <span className="arrow">→</span>
              </button>
            ))}
          </div>
        </section>
      </main>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 25px 7%;
          background: ${C.canvas};
          color: ${C.ink};
          font-family: Arial, Helvetica, sans-serif;
        }

        .back {
          border: 0;
          padding: 0;
          background: transparent;
          color: ${C.green};
          font-weight: 700;
          cursor: pointer;
        }

        .content {
          max-width: 850px;
          margin: 60px auto;
        }

        .step {
          color: ${C.green};
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        h1 {
          margin: 14px 0;
          color: ${C.dark};
          font-size: clamp(30px, 5vw, 42px);
          letter-spacing: -1px;
        }

        .intro {
          color: ${C.muted};
          line-height: 1.7;
          margin-bottom: 28px;
        }

        .intro strong {
          color: ${C.dark};
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .province {
          min-height: 70px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid ${C.line};
          border-radius: 14px;
          background: ${C.white};
          color: ${C.dark};
          text-align: left;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
        }

        .pin {
          color: ${C.green};
          font-size: 23px;
        }

        .province > span:nth-child(2) {
          flex: 1;
        }

        .arrow {
          color: ${C.green};
          font-size: 20px;
        }

        .status {
          color: ${C.muted};
          line-height: 1.6;
        }

        .error {
          padding: 15px;
          border: 1px solid #E8B9BE;
          border-radius: 12px;
          color: #9C2936;
          background: #FFF5F5;
        }

        .error button {
          border: 0;
          background: transparent;
          color: #9C2936;
          font-weight: 800;
          cursor: pointer;
        }

        @media (max-width: 600px) {
          .page {
            padding: 20px;
          }

          .content {
            margin: 50px auto;
          }

          .grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
