    import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Province() {
  const router = useRouter();
  const { country } = router.query;

  const [countryName, setCountryName] = useState('');
  const [provinces, setProvinces] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    if (!country) {
      router.replace('/country');
      return;
    }

    loadCountryAndProvinces();
  }, [router.isReady, country]);

  async function loadCountryAndProvinces() {
    setLoading(true);
    setError('');

    const { data: countryData, error: countryError } =
      await supabase
        .from('countries')
        .select('id, name')
        .eq('id', country)
        .single();

    if (countryError || !countryData) {
      setError('Não foi possível encontrar este país.');
      setLoading(false);
      return;
    }

    setCountryName(countryData.name);

    const { data: provinceData, error: provinceError } =
      await supabase
        .from('provinces')
        .select('id, name')
        .eq('country_id', country)
        .order('name', { ascending: true });

    if (provinceError) {
      console.error(provinceError);
      setError('Não foi possível carregar as províncias.');
      setLoading(false);
      return;
    }

    setProvinces(provinceData || []);
    setLoading(false);
  }

  function handleProvinceSelect(provinceId) {
    router.push({
      pathname: '/start',
      query: {
        country,
        province: provinceId,
      },
    });
  }

  return (
    <div
      className="container"
      style={{
        maxWidth: 600,
        paddingBottom: 50,
      }}
    >
      <nav className="topnav">
        <Link
          href="/"
          style={{
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div className="logo">T</div>
          <b>Talaza</b>
        </Link>
      </nav>

      <div
        style={{
          textAlign: 'center',
          marginTop: 34,
        }}
      >
        <div
          style={{
            fontSize: 13,
            color: 'var(--ink-faint)',
            marginBottom: 8,
          }}
        >
          {countryName}
        </div>

        <h1
          style={{
            fontSize: 28,
            margin: 0,
          }}
        >
          Escolha a sua província
        </h1>

        <p
          style={{
            color: 'var(--ink-soft)',
            marginTop: 10,
          }}
        >
          Escolha a região onde pretende explorar a Talaza.
        </p>
      </div>

      {loading && (
        <p
          style={{
            textAlign: 'center',
            marginTop: 30,
          }}
        >
          A carregar províncias…
        </p>
      )}

      {error && (
        <p
          style={{
            color: '#D92D20',
            fontSize: 13,
            textAlign: 'center',
            marginTop: 24,
          }}
        >
          {error}
        </p>
      )}

      {!loading && !error && (
        <div
          style={{
            display: 'grid',
            gap: 10,
            marginTop: 28,
          }}
        >
          {provinces.map((province) => (
            <button
              key={province.id}
              type="button"
              className="card"
              onClick={() =>
                handleProvinceSelect(province.id)
              }
              style={{
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                border: '1px solid var(--line)',
                background: 'white',
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {province.name}
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          textAlign: 'center',
          marginTop: 28,
        }}
      >
        <Link
          href="/country"
          style={{
            color: 'var(--brand)',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          ← Voltar aos países
        </Link>
      </div>
    </div>
  );
}
    
        
        
          
        
              
              
          
