import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const TONES = ['mint', 'sun', 'lilac', 'rose', 'sky'];

const ICONS = {
  sparkle: (
    <>
      <path d="M11 3l1.9 5.3L18 10l-5.1 1.7L11 17l-1.9-5.3L4 10l5.1-1.7L11 3z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </>
  ),
  cap: (
    <>
      <path d="M2 9l10-5 10 5-10 5L2 9z" />
      <path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5" />
    </>
  ),
  building: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-4h4v4" />
    </>
  ),
  ticket: (
    <>
      <path d="M4 7h16v3a2 2 0 000 4v3H4v-3a2 2 0 000-4V7z" />
      <path d="M14 7v10" strokeDasharray="2 2" />
    </>
  ),
  utensils: (
    <>
      <path d="M7 3v8M4 3v5a3 3 0 006 0V3M7 11v10" />
      <path d="M17 21V3c-2.5 1.5-3.5 4.5-3.5 8H17" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8h14l-1 12H6L5 8z" />
      <path d="M9 8V6a3 3 0 016 0v2" />
    </>
  ),
  home: (
    <>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h5v-6h4v6h5V10" />
    </>
  ),
  health: (
    <>
      <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.6-7 10-7 10z" />
      <path d="M12 9v5M9.5 11.5h5" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
    </>
  ),
  truck: (
    <>
      <path d="M2 6h11v10H2zM13 9h4l3 3v4h-7" />
      <circle cx="6.5" cy="17.5" r="1.8" />
      <circle cx="16.5" cy="17.5" r="1.8" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6-5.5-6-10a6 6 0 0112 0c0 4.5-6 10-6 10z" />
      <circle cx="12" cy="11" r="2.2" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
  back: <path d="M15 5l-7 7 7 7" />,
};

function Icon({ name, size = 22, strokeWidth = 1.8 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

function iconFor(name = '') {
  const n = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (n.includes('transport')) return 'truck';
  if (n.includes('gastron')) return 'utensils';
  if (n.includes('beleza')) return 'sparkle';
  if (n.includes('loja')) return 'bag';
  if (n.includes('servic')) return 'gear';
  if (n.includes('saude')) return 'health';
  if (n.includes('empresa')) return 'building';
  if (n.includes('educa')) return 'cap';
  if (n.includes('evento')) return 'ticket';
  if (n.includes('imobili')) return 'home';
  return 'pin';
}

export default function Category() {
  const router = useRouter();

  const {
    id,
    country,
    province,
  } = router.query;

  const [category, setCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);

  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    if (!id || !country || !province) {
      router.replace('/country');
      return;
    }

    loadData();
  }, [
    router.isReady,
    id,
    country,
    province,
  ]);

  async function loadData() {
    setLoading(true);
    setError('');

    const { data: categoryData, error: categoryError } =
      await supabase
        .from('categories')
        .select('id, name')
        .eq('id', id)
        .single();

    if (categoryError) {
      console.error(categoryError);
      setError('Não foi possível carregar esta categoria.');
      setLoading(false);
      return;
    }

    const { data: provinceData } = await supabase
      .from('provinces')
      .select('id, name, country_id')
      .eq('id', province)
      .eq('country_id', country)
      .single();

    if (!provinceData) {
      setError(
        'Esta província não pertence ao país selecionado.'
      );
      setLoading(false);
      return;
    }

    const { data: countryData } = await supabase
      .from('countries')
      .select('id, name')
      .eq('id', country)
      .single();

    setCategory(categoryData);
    setProvinceName(provinceData.name);
    setCountryName(countryData?.name || '');

    const { data: subcategoryData, error: subcategoryError } =
      await supabase
        .from('subcategories')
        .select('id, name, description')
        .eq('category_id', id)
        .order('name', { ascending: true });

    if (subcategoryError) {
      console.error(subcategoryError);
      setError('Não foi possível carregar as subcategorias.');
      setLoading(false);
      return;
    }

    setSubcategories(subcategoryData || []);
    setLoading(false);
  }

  const exploreHref = {
    pathname: '/explore',
    query: {
      country,
      province,
    },
  };

  const ready = !loading && !error && category;
  const count = subcategories.length;

  return (
    <div className="ctg-page">
      <header className={`ctg-hero${ready ? '' : ' ctg-hero--compact'}`}>
        <div className="ctg-in">
          {ready && (
            <div className="ctg-mark" aria-hidden="true">
              <Icon
                name={iconFor(category.name)}
                size={230}
                strokeWidth={0.6}
              />
            </div>
          )}

          <nav className="ctg-nav">
            <Link href={exploreHref} className="ctg-brand">
              <span className="ctg-logo">T</span>
              Talaza
            </Link>

            <Link href={exploreHref} className="ctg-voltar">
              <Icon name="back" size={20} />
              Voltar
            </Link>
          </nav>

          {loading && !error && (
            <div className="ctg-hero-skl" aria-hidden="true">
              <span className="ctg-skl ctg-skl--chip" />
              <span className="ctg-skl ctg-skl--title" />
              <span className="ctg-skl ctg-skl--text" />
            </div>
          )}

          {ready && (
            <>
              <div className="ctg-chip">
                <i />
                {countryName} · {provinceName}
              </div>

              <h1>{category.name}</h1>

              <p>
                Escolha uma subcategoria para encontrar exatamente
                o que procura.
              </p>
            </>
          )}
        </div>
      </header>

      <main className="ctg-body" aria-busy={loading}>
        {loading && !error && (
          <div className="ctg-grid" aria-label="A carregar">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="ctg-sk" key={i} />
            ))}
          </div>
        )}

        {error && <div className="ctg-error">{error}</div>}

        {ready && (
          <>
            <div className="ctg-bhead">
              <h2>Subcategorias</h2>
              {count > 0 && (
                <span>
                  {count} {count === 1 ? 'subcategoria' : 'subcategorias'}
                </span>
              )}
            </div>

            {count === 0 ? (
              <div className="ctg-empty">
                <div className="ctg-mono ctg-t-mint">
                  <Icon name={iconFor(category.name)} size={28} />
                </div>

                <h3>Nada por aqui ainda</h3>

                <p>
                  Ainda não existem subcategorias nesta categoria.
                </p>

                <Link href={exploreHref} className="ctg-btn">
                  Ver outras categorias
                </Link>
              </div>
            ) : (
              <div className="ctg-grid">
                {subcategories.map((subcategory, i) => (
                  <Link
                    key={subcategory.id}
                    href={{
                      pathname: '/subcategory',
                      query: {
                        id: subcategory.id,
                        country,
                        province,
                      },
                    }}
                    className={`ctg-sub ctg-t-${TONES[i % TONES.length]}`}
                    style={{ '--i': i }}
                  >
                    <span className="ctg-mono">
                      {(subcategory.name || '?').charAt(0).toUpperCase()}
                    </span>

                    <span className="ctg-go">
                      <Icon name="chevron" size={16} />
                    </span>

                    <h3>{subcategory.name}</h3>

                    {subcategory.description && (
                      <p>{subcategory.description}</p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <style jsx global>{`
        .ctg-page {
          --bg: #F6F4EE;
          --card: #FFFFFF;
          --line: #D9E5E1;
          --ink: #17342F;
          --muted: #5E716C;
          --green: #075B4E;
          --gold: #E6A900;
          --cream: #F7F5F0;
          --hero-a: #087262;
          --hero-b: #043D34;
          --chip-bg: rgba(230, 169, 0, 0.2);
          --chip-fg: #F6CD52;
          --shadow: 0 1px 2px rgba(7, 60, 50, 0.06),
            0 10px 22px -10px rgba(7, 60, 50, 0.16);

          --mint-bg: #E3F1EC;  --mint-fg: #12705C;
          --sun-bg: #FBF0D2;   --sun-fg: #9C6E00;
          --lilac-bg: #ECE8F7; --lilac-fg: #5E43A8;
          --rose-bg: #FAE9E4;  --rose-fg: #AE4132;
          --sky-bg: #E4ECF8;   --sky-fg: #2F5CA4;

          min-height: 100vh;
          background: var(--bg);
          color: var(--ink);
          padding-bottom: 50px;
          font-family: 'Avenir Next', 'Segoe UI Variable Display',
            'Segoe UI', Roboto, system-ui, sans-serif;
        }
        .ctg-page *,
        .ctg-page *::before,
        .ctg-page *::after {
          box-sizing: border-box;
        }
        .ctg-page a {
          color: inherit;
          text-decoration: none;
        }
        .ctg-page h1,
        .ctg-page h2,
        .ctg-page h3,
        .ctg-page p {
          margin: 0;
        }
        .ctg-page svg {
          display: block;
        }
        .ctg-page a:focus-visible {
          outline: 2px solid var(--gold);
          outline-offset: 3px;
        }

        .ctg-t-mint { --t-bg: var(--mint-bg); --t-fg: var(--mint-fg); }
        .ctg-t-sun { --t-bg: var(--sun-bg); --t-fg: var(--sun-fg); }
        .ctg-t-lilac { --t-bg: var(--lilac-bg); --t-fg: var(--lilac-fg); }
        .ctg-t-rose { --t-bg: var(--rose-bg); --t-fg: var(--rose-fg); }
        .ctg-t-sky { --t-bg: var(--sky-bg); --t-fg: var(--sky-fg); }

        /* ---------- Topo ---------- */
        .ctg-hero {
          position: relative;
          overflow: hidden;
          padding: calc(14px + env(safe-area-inset-top)) 22px 34px;
          color: var(--cream);
          border-radius: 0 0 36px 36px;
          background:
            radial-gradient(110% 80% at 100% 0%, var(--hero-a) 0%, transparent 62%),
            linear-gradient(165deg, #076152 0%, var(--hero-b) 100%);
        }
        .ctg-hero--compact {
          padding-bottom: 22px;
        }
        .ctg-in {
          position: relative;
          max-width: 720px;
          margin: 0 auto;
        }
        .ctg-mark {
          position: absolute;
          right: -34px;
          bottom: -74px;
          width: 230px;
          height: 230px;
          color: var(--gold);
          opacity: 0.2;
          pointer-events: none;
        }
        .ctg-nav {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ctg-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 19px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .ctg-logo {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: var(--gold);
          font-size: 20px;
          font-weight: 800;
        }
        .ctg-voltar {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 38px;
          padding: 0 14px 0 8px;
          border-radius: 99px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          font-size: 14px;
          font-weight: 700;
        }
        .ctg-chip {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 30px;
          padding: 7px 13px;
          border-radius: 99px;
          background: var(--chip-bg);
          color: var(--chip-fg);
          font-size: 13px;
          font-weight: 700;
        }
        .ctg-chip i {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--gold);
        }
        .ctg-hero h1 {
          position: relative;
          margin-top: 16px;
          max-width: 9.5em;
          font-size: 40px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: -0.04em;
          text-wrap: balance;
        }
        .ctg-hero p {
          position: relative;
          margin-top: 12px;
          max-width: 27ch;
          font-size: 15.5px;
          line-height: 1.5;
          color: rgba(247, 245, 240, 0.78);
        }

        .ctg-hero-skl {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 14px;
          margin-top: 30px;
        }
        .ctg-skl {
          display: block;
          border-radius: 99px;
          background: linear-gradient(
            100deg,
            rgba(255, 255, 255, 0.1) 30%,
            rgba(255, 255, 255, 0.22) 50%,
            rgba(255, 255, 255, 0.1) 70%
          );
          background-size: 220% 100%;
          animation: ctg-shimmer 1.3s linear infinite;
        }
        .ctg-skl--chip { width: 130px; height: 28px; }
        .ctg-skl--title { width: 70%; height: 38px; border-radius: 14px; }
        .ctg-skl--text { width: 55%; height: 16px; margin-bottom: 8px; }

        /* ---------- Conteúdo ---------- */
        .ctg-body {
          max-width: 720px;
          margin: 0 auto;
          padding: 26px 20px 0;
        }
        .ctg-bhead {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .ctg-bhead h2 {
          font-size: 21px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .ctg-bhead span {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--muted);
        }

        .ctg-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 12px;
        }

        .ctg-sub {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-height: 164px;
          padding: 14px 14px 16px;
          border-radius: 22px;
          background: var(--card);
          border: 1px solid var(--line);
          box-shadow: var(--shadow);
          transition: transform 0.18s ease, border-color 0.18s ease;
          animation: ctg-rise 0.45s cubic-bezier(0.2, 0.7, 0.2, 1) both;
          animation-delay: calc(var(--i) * 45ms);
        }
        .ctg-mono {
          width: 46px;
          height: 46px;
          border-radius: 15px;
          display: grid;
          place-items: center;
          background: var(--t-bg);
          color: var(--t-fg);
          font-family: Georgia, 'Iowan Old Style', 'Times New Roman', serif;
          font-size: 24px;
          font-weight: 700;
        }
        .ctg-go {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: var(--muted);
          border: 1px solid var(--line);
          transition: background 0.18s ease, color 0.18s ease,
            border-color 0.18s ease;
        }
        .ctg-sub h3 {
          margin-top: auto;
          padding-top: 18px;
          font-size: 16.5px;
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: -0.015em;
          color: var(--ink);
        }
        .ctg-sub p {
          margin-top: 5px;
          font-size: 13px;
          line-height: 1.42;
          color: var(--muted);
        }
        @media (hover: hover) {
          .ctg-sub:hover {
            transform: translateY(-3px);
            border-color: var(--gold);
          }
          .ctg-sub:hover .ctg-go {
            background: var(--gold);
            border-color: var(--gold);
            color: #1B2A00;
          }
        }
        .ctg-sub:active {
          transform: scale(0.98);
        }

        /* Carregamento */
        .ctg-sk {
          min-height: 164px;
          border-radius: 22px;
          border: 1px solid var(--line);
          background: linear-gradient(
            100deg,
            var(--card) 30%,
            var(--mint-bg) 50%,
            var(--card) 70%
          );
          background-size: 220% 100%;
          animation: ctg-shimmer 1.3s linear infinite;
        }

        /* Erro */
        .ctg-error {
          margin-top: 4px;
          padding: 16px;
          border-radius: 16px;
          background: #FFF1F0;
          border: 1px solid #F3CFCB;
          color: #9B2C2C;
          font-size: 14px;
          line-height: 1.5;
        }

        /* Vazio */
        .ctg-empty {
          text-align: center;
          padding: 28px 18px 10px;
        }
        .ctg-empty .ctg-mono {
          margin: 0 auto 18px;
          width: 64px;
          height: 64px;
          border-radius: 22px;
        }
        .ctg-empty h3 {
          font-size: 19px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .ctg-empty p {
          margin: 8px auto 20px;
          max-width: 28ch;
          color: var(--muted);
          font-size: 14.5px;
          line-height: 1.5;
        }
        .ctg-btn {
          display: inline-flex;
          align-items: center;
          height: 48px;
          padding: 0 22px;
          border-radius: 14px;
          background: var(--green);
          color: #fff !important;
          font-weight: 700;
          font-size: 15px;
          box-shadow: 0 8px 18px -8px rgba(7, 91, 78, 0.6);
        }

        @keyframes ctg-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes ctg-shimmer {
          from { background-position: 120% 0; }
          to { background-position: -120% 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .ctg-sub { animation: none; transition: none; }
          .ctg-sk, .ctg-skl { animation: none; }
        }
      `}</style>
    </div>
  );
}
