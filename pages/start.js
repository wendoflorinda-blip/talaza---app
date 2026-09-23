import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Start() {
  const router = useRouter();

  const { country, province } = router.query;

  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady) return;

    if (!country || !province) {
      router.replace('/country');
      return;
    }

    loadLocation();
  }, [router.isReady, country, province]);

  async function loadLocation() {
    const { data: countryData } = await supabase
      .from('countries')
      .select('id, name')
      .eq('id', country)
      .single();

    const { data: provinceData } = await supabase
      .from('provinces')
      .select('id, name')
      .eq('id', province)
      .single();

    if (!countryData || !provinceData) {
      router.replace('/country');
      return;
    }

    setCountryName(countryData.name);
    setProvinceName(provinceData.name);
    setLoading(false);
  }

  if (loading) {
    return (
      <div
        className="container"
        style={{
          maxWidth: 700,
          textAlign: 'center',
          paddingTop: 60,
        }}
      >
        <p>A preparar a Talaza…</p>
      </div>
    );
  }

  return (
    <div
      className="container"
      style={{
        maxWidth: 760,
        paddingBottom: 50,
      }}
    >
      {/* CABEÇALHO */}
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

      {/* LOCALIZAÇÃO */}
      <div
        style={{
          marginTop: 34,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 13,
            color: 'var(--ink-faint)',
            marginBottom: 8,
          }}
        >
          {countryName} · {provinceName}
        </div>

        <h1
          style={{
            fontSize: 30,
            margin: 0,
          }}
        >
          O que você deseja fazer?
        </h1>

        <p
          style={{
            color: 'var(--ink-soft)',
            maxWidth: 520,
            margin: '12px auto 30px',
            lineHeight: 1.5,
          }}
        >
          Escolha como pretende utilizar a Talaza.
        </p>
      </div>

      {/* OPÇÕES */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
        }}
      >

        {/* EXPLORAR */}
        <Link
          href={{
            pathname: '/explore',
            query: {
              country,
              province,
            },
          }}
          className="card"
          style={{
            textDecoration: 'none',
            color: 'inherit',
            padding: 24,
            minHeight: 210,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            border: '2px solid var(--brand)',
          }}
        >
          <div
            style={{
              fontSize: 30,
              marginBottom: 12,
            }}
          >
            🔎
          </div>

          <h2
            style={{
              fontSize: 21,
              margin: '0 0 8px',
            }}
          >
            Explorar a Talaza
          </h2>

          <p
            style={{
              color: 'var(--ink-soft)',
              fontSize: 14,
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Encontre negócios, produtos, serviços e
            oportunidades na sua região.
          </p>
        </Link>

        {/* CRIAR NEGÓCIO */}
        <Link
          href={{
            pathname: '/post-business',
            query: {
              country,
              province,
            },
          }}
          className="card"
          style={{
            textDecoration: 'none',
            color: 'inherit',
            padding: 24,
            minHeight: 210,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            border: '2px solid var(--gold)',
          }}
        >
          <div
            style={{
              fontSize: 30,
              marginBottom: 12,
            }}
          >
            🏪
          </div>

          <h2
            style={{
              fontSize: 21,
              margin: '0 0 8px',
            }}
          >
            Criar um perfil de negócio
          </h2>

          <p
            style={{
              color: 'var(--ink-soft)',
              fontSize: 14,
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Apresente o seu negócio, produtos e serviços
            na Talaza.
          </p>
        </Link>

      </div>

      {/* TROCAR LOCALIZAÇÃO */}
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
          ← Escolher outro país ou província
        </Link>
      </div>

    </div>
  );
}
