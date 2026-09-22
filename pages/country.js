import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Country() {
  const router = useRouter();

  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCountries();
  }, []);

  async function loadCountries() {
    const { data, error } = await supabase
      .from('countries')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      setError('Não foi possível carregar os países.');
      setLoading(false);
      return;
    }

    setCountries(data || []);
    setLoading(false);
  }

  function handleCountrySelect(countryId) {
    router.push({
      pathname: '/province',
      query: { country: countryId },
    });
  }

  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: 22, marginTop: 30 }}>
        Escolha o seu país
      </h1>

      <p
        style={{
          fontSize: 14,
          color: 'var(--muted)',
          marginTop: 8,
          marginBottom: 20,
        }}
      >
        Escolha o país onde pretende explorar a Talaza.
      </p>

      {loading && (
        <p style={{ fontSize: 14 }}>
          A carregar países…
        </p>
      )}

      {error && (
        <p
          style={{
            color: '#D92D20',
            fontSize: 13,
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
          }}
        >
          {countries.map((country) => (
            <button
              key={country.id}
              type="button"
              className="card"
              onClick={() => handleCountrySelect(country.id)}
              style={{
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                border: '1px solid var(--line)',
                background: 'white',
              }}
            >
              {country.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
