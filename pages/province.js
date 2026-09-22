import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Province() {
  const router = useRouter();
  const { country } = router.query;

  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    if (!country) {
      router.replace('/country');
      return;
    }

    loadProvinces(country);
  }, [router.isReady, country]);

  async function loadProvinces(countryId) {
    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('provinces')
      .select('id, name')
      .eq('country_id', countryId)
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      setError('Não foi possível carregar as províncias.');
      setLoading(false);
      return;
    }

    setProvinces(data || []);
    setLoading(false);
  }

  async function handleProvinceSelect(provinceId) {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData?.user) {
      router.replace('/login');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        country_id: country,
        province_id: provinceId,
      })
      .eq('id', userData.user.id);

    if (error) {
      console.error(error);
      setError('Não foi possível guardar a sua província.');
      return;
    }

    router.push({
      pathname: '/',
      query: {
        country: country,
        province: provinceId,
      },
    });
  }

  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: 22, marginTop: 30 }}>
        Escolha a sua província
      </h1>

      <p
        style={{
          fontSize: 14,
          color: 'var(--muted)',
          marginTop: 8,
          marginBottom: 20,
        }}
      >
        Escolha a província onde pretende explorar a Talaza.
      </p>

      {loading && (
        <p style={{ fontSize: 14 }}>
          A carregar províncias…
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

      {!loading && !error && provinces.length === 0 && (
        <p style={{ fontSize: 14 }}>
          Não existem províncias disponíveis para este país.
        </p>
      )}

      {!loading && !error && provinces.length > 0 && (
        <div
          style={{
            display: 'grid',
            gap: 10,
          }}
        >
          {provinces.map((province) => (
            <button
              key={province.id}
              type="button"
              className="card"
              onClick={() => handleProvinceSelect(province.id)}
              style={{
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                border: '1px solid var(--line)',
                background: 'white',
              }}
            >
              {province.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
