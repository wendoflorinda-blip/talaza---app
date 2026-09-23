import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const AREAS = [
  {
    name: 'Encontrar',
    description:
      'Encontre negócios, produtos, serviços e soluções perto de você.',
    color: '#075B4E',
  },
  {
    name: 'Contratar',
    description:
      'Encontre profissionais e pessoas preparadas para realizar o que você precisa.',
    color: '#0B7563',
  },
  {
    name: 'Comunidade',
    description:
      'Partilhe perguntas, recomendações, avisos e ideias.',
    color: '#B88300',
  },
  {
    name: 'Oportunidades',
    description:
      'Encontre oportunidades de trabalho, colaborações e vagas.',
    color: '#9A6D00',
  },
  {
    name: 'Eventos',
    description:
      'Descubra eventos, cursos, feiras, lançamentos e outros momentos.',
    color: '#075B4E',
  },
  {
    name: 'Ebooks',
    description:
      'Descubra ebooks para aprender e desenvolver novas habilidades.',
    color: '#0B7563',
  },
];

export default function Explore() {
  const router = useRouter();

  const { country, province } = router.query;

  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');

  const [categories, setCategories] = useState([]);
  const [businesses, setBusinesses] = useState([]);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady) return;

    if (!country || !province) {
      router.replace('/country');
      return;
    }

    loadLocation();
    loadCategories();
    loadBusinesses();
  }, [router.isReady, country, province]);

  useEffect(() => {
    if (!router.isReady || !country || !province) return;

    loadBusinesses();
  }, [query]);

  async function loadLocation() {
    const { data: countryData } = await supabase
      .from('countries')
      .select('name')
      .eq('id', country)
      .single();

    const { data: provinceData } = await supabase
      .from('provinces')
      .select('name')
      .eq('id', province)
      .single();

    setCountryName(countryData?.name || '');
    setProvinceName(provinceData?.name || '');
  }

  async function loadCategories() {
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .order('name', { ascending: true });

    setCategories(data || []);
  }

  async function loadBusinesses() {
    setLoading(true);

    let request = supabase
      .from('businesses')
      .select(`
        id,
        name,
        description,
        municipality,
        neighborhood,
        logo_url
      `)
      .eq('country_id', country)
      .eq('province_id', province)
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .order('created_at', { ascending: false });

    if (query.trim()) {
      request = request.ilike(
        'name',
        `%${query.trim()}%`
      );
    }

    const { data } = await request;

    setBusinesses(data || []);
    setLoading(false);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F7F6',
      }}
    >
      <div
        className="container"
        style={{
          paddingBottom: 60,
        }}
      >
        {/* CABEÇALHO */}
        <nav className="topnav">
          <Link
            href="/explore"
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

          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              gap: 8,
            }}
          >
            <Link
              href="/login"
              className="btn btn-ghost"
            >
              Entrar
            </Link>
          </div>
        </nav>

        {/* LOCALIZAÇÃO */}
        <div
          style={{
            marginTop: 24,
            padding: '12px 16px',
            borderRadius: 14,
            background: '#EAF4F1',
            color: '#075B4E',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {countryName} · {provinceName}
        </div>

        {/* PESQUISA */}
        <div style={{ marginTop: 24 }}>
          <h1
            style={{
              fontSize: 30,
              marginBottom: 8,
            }}
          >
            Encontre o que procura.
          </h1>

          <p
            style={{
              color: '#596B68',
              lineHeight: 1.5,
            }}
          >
            Pesquise negócios, produtos, serviços e soluções
            na sua região.
          </p>

          <input
            className="input"
            style={{
              width: '100%',
              marginTop: 16,
              marginBottom: 0,
            }}
            placeholder="Pesquisar por nome…"
            value={query}
            onChange={(e) =>
              setQuery(e.target.value)
            }
          />
        </div>

        {/* ÁREAS DA TALAZA */}
        <section style={{ marginTop: 38 }}>
          <h2 style={{ fontSize: 21 }}>
            Talaza
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 12,
              marginTop: 14,
            }}
          >
            {AREAS.map((area) => (
              <div
                key={area.name}
                className="card"
                style={{
                  borderTop: `4px solid ${area.color}`,
                  padding: 18,
                }}
              >
                <h3
                  style={{
                    fontSize: 16,
                    margin: '0 0 7px',
                  }}
                >
                  {area.name}
                </h3>

                <p
                  style={{
                    fontSize: 12,
                    lineHeight: 1.45,
                    color: '#596B68',
                    margin: 0,
                  }}
                >
                  {area.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ENCONTRAR / CATEGORIAS */}
        <section style={{ marginTop: 42 }}>
          <h2 style={{ fontSize: 21 }}>
            Encontrar
          </h2>

          <p
            style={{
              color: '#596B68',
              fontSize: 14,
            }}
          >
            Escolha uma categoria para encontrar exatamente
            o que procura.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 12,
              marginTop: 16,
            }}
          >
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category?id=${category.id}`}
                className="card"
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  padding: 18,
                  border: '1px solid #D9E5E1',
                }}
              >
                <strong
                  style={{
                    fontSize: 15,
                  }}
                >
                  {category.name}
                </strong>

                <div
                  style={{
                    color: '#075B4E',
                    fontSize: 12,
                    marginTop: 9,
                    fontWeight: 700,
                  }}
                >
                  Ver categoria →
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* NEGÓCIOS */}
        <section style={{ marginTop: 42 }}>
          <h2 style={{ fontSize: 21 }}>
            Negócios perto de você
          </h2>

          {loading && (
            <p style={{ color: '#7A8986' }}>
              A carregar…
            </p>
          )}

          {!loading && businesses.length === 0 && (
            <p style={{ color: '#7A8986' }}>
              Ainda não há negócios publicados nesta região.
            </p>
          )}

          {!loading && businesses.length > 0 && (
            <div className="grid">
              {businesses.map((business) => (
                <Link
                  key={business.id}
                  href={`/businesses/${business.id}`}
                  className="card"
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  {business.logo_url && (
                    <img
                      src={business.logo_url}
                      alt={business.name}
                      style={{
                        width: '100%',
                        height: 140,
                        objectFit: 'cover',
                        borderRadius: 8,
                        marginBottom: 8,
                      }}
                    />
                  )}

                  <h3
                    style={{
                      fontSize: 15,
                      margin: '6px 0',
                    }}
                  >
                    {business.name}
                  </h3>

                  {business.description && (
                    <p
                      style={{
                        fontSize: 12,
                        color: '#596B68',
                      }}
                    >
                      {business.description}
                    </p>
                  )}

                  {(business.municipality ||
                    business.neighborhood) && (
                    <div
                      style={{
                        fontSize: 11,
                        color: '#7A8986',
                      }}
                    >
                      {business.municipality}

                      {business.municipality &&
                      business.neighborhood
                        ? ' · '
                        : ''}

                      {business.neighborhood}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* SAIR */}
        <div
          style={{
            textAlign: 'center',
            marginTop: 45,
          }}
        >
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/');
            }}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#075B4E',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Terminar sessão
          </button>
        </div>
      </div>
    </div>
  );
}
