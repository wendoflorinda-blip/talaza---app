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
  gold: '#DDA10A',
};

export default function Country() {
  const router = useRouter();
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    let active = true;

    async function loadCountries() {
      setLoading(true);
      setError('');

      const { data, error: queryError } = await supabase
        .from('countries')
        .select('id, name')
        .order('name', { ascending: true });

      if (!active) return;

      if (queryError) {
        setError('Não foi possível carregar os países. Tente novamente.');
        setCountries([]);
        setLoading(false);
        return;
      }

      // Por agora, apenas Angola fica disponível.
      const available = (data || []).filter(
        (country) =>
          String(country.name || '').trim().toLocaleLowerCase('pt-AO') ===
          'angola'
      );

      setCountries(available);
      setLoading(false);
    }

    loadCountries();

    return () => {
      active = false;
    };
  }, [router.isReady]);

  function chooseCountry(country) {
    router.push({
      pathname: '/province',
      query: { country: country.id },
    });
  }

  return (
    <>
      <Head>
        <title>Escolher país | Talaza</title>
      </Head>

      <main className="page">
        <button className="back" onClick={() => router.push('/')}>
          ← Voltar
        </button>

        <div className="content">
          <div className="step">PASSO 1 DE 2</div>
          <h1>Em que país procura?</h1>
          <p className="intro">
            Escolha o país para ver os negócios e serviços disponíveis na sua
            região.
          </p>

          {loading && <p className="status">A carregar países…</p>}

          {!loading && error && (
            <div className="error">
              <p>{error}</p>
              <button onClick={() => router.replace(router.asPath)}>
                Tentar novamente
              </button>
            </div>
          )}

          {!loading && !error && countries.length === 0 && (
            <p className="status">
              Angola ainda não está configurada na tabela de países. Confirme
              se existe um registo com o nome Angola.
            </p>
          )}

          <div className="countries">
            {countries.map((country) => (
              <button
                key={country.id}
                className="country"
                onClick={() => chooseCountry(country)}
              >
                <span className="flag">🇦🇴</span>
                <span className="country-name">{country.name}</span>
                <span className="arrow">→</span>
              </button>
            ))}
          </div>

          <p className="note">
            Outros países poderão ser disponibilizados futuramente.
          </p>
        </div>
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
          background: transparent;
          color: ${C.green};
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
        }

        .content {
          width: 100%;
          max-width: 620px;
          margin: 70px auto;
        }

        .step {
          color: ${C.green};
          font-weight: 800;
          font-size: 12px;
          letter-spacing: 1.5px;
        }

        h1 {
          margin: 14px 0;
          color: ${C.dark};
          font-size: clamp(30px, 5vw, 42px);
          letter-spacing: -1px;
        }

        .intro {
          margin: 0 0 28px;
          color: ${C.muted};
          line-height: 1.7;
        }

        .countries {
          display: grid;
          gap: 12px;
        }

        .country {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 18px;
          border: 1px solid ${C.line};
          border-radius: 15px;
          background: ${C.white};
          text-align: left;
          cursor: pointer;
        }

        .flag {
          font-size: 30px;
        }

        .country-name {
          flex: 1;
          color: ${C.dark};
          font-size: 17px;
          font-weight: 800;
        }

        .arrow {
          color: ${C.green};
          font-size: 22px;
        }

        .status,
        .note {
          color: ${C.muted};
          line-height: 1.6;
          font-size: 14px;
        }

        .note {
          margin-top: 22px;
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
            margin: 55px auto;
          }
        }
      `}</style>
    </>
  );
}
