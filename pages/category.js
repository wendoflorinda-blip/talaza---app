import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const COLORS = {
  green: '#0F6E5C',
  darkGreen: '#083F35',
  gold: '#DDA10A',
  purple: '#7252B8',
  purpleSoft: '#F1ECFA',
  background: '#F8F6F3',
  white: '#FFFFFF',
  ink: '#17211F',
  muted: '#596560',
  line: '#E5E9E7',
  mint: '#E8F3F0',
  goldSoft: '#FBF1D7',
};

const TONES = [
  { background: '#E8F3F0', color: '#0F6E5C' },
  { background: '#FBF1D7', color: '#8A6607' },
  { background: '#F1ECFA', color: '#7252B8' },
  { background: '#FAE9E4', color: '#AE4132' },
  { background: '#E4ECF8', color: '#2F5CA4' },
];

function getInitial(name) {
  const text = String(name || '').normalize('NFC').trim();
  return text ? text.charAt(0).toLocaleUpperCase('pt-AO') : '?';
}

function Icon({ type, size = 22 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  const paths = {
    back: <path d="M15 5l-7 7 7 7" />,
    next: <path d="M9 6l6 6-6 6" />,
    food: (
      <>
        <path d="M7 3v8M4 3v5a3 3 0 006 0V3M7 11v10" />
        <path d="M17 21V3c-2.5 1.5-3.5 4.5-3.5 8H17" />
      </>
    ),
    beauty: (
      <>
        <path d="M12 3v7M8.5 3v4a3.5 3.5 0 007 0V3" />
        <path d="M12 10v11" />
      </>
    ),
    education: (
      <>
        <path d="m3 9 9-5 9 5-9 5-9-5Z" />
        <path d="M7 11.5V16c3 2 7 2 10 0v-4.5M21 9v7" />
      </>
    ),
    health: (
      <>
        <path d="M12 21s-7-4.5-7-11a4 4 0 017-2.4A4 4 0 0119 10c0 6.5-7 11-7 11Z" />
        <path d="M9 12h6M12 9v6" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    transport: (
      <>
        <path d="M3 6h12v11H3zM15 10h4l3 3v4h-7" />
        <circle cx="7" cy="18" r="1.5" />
        <circle cx="18" cy="18" r="1.5" />
      </>
    ),
    services: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
      </>
    ),
    other: (
      <>
        <circle cx="5" cy="12" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="19" cy="12" r="1.5" />
      </>
    ),
  };

  return <svg {...common}>{paths[type] || paths.other}</svg>;
}

function getCategoryIcon(name = '') {
  const value = String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (/aliment|restaur|comida|bebida|gastronom|confeitaria|pastelaria/.test(value)) {
    return 'food';
  }
  if (/beleza|estetica|cabeleire|barbear|tranca/.test(value)) return 'beauty';
  if (/saude|medic|farmac/.test(value)) return 'health';
  if (/educa|escola|formacao/.test(value)) return 'education';
  if (/imove|habitacao|casa|construcao/.test(value)) return 'home';
  if (/transport|logistica|automov|carro/.test(value)) return 'transport';
  if (/servic|profission|manutenc|tecnologia/.test(value)) return 'services';

  return 'other';
}

export default function Category() {
  const router = useRouter();
  const { id, country, province } = router.query;

  const [category, setCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    if (!id || Array.isArray(id)) {
      setError('Categoria inválida. Volte à Vitrine e escolha uma categoria.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError('');

      try {
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('id, name')
          .eq('id', id)
          .single();

        if (categoryError || !categoryData) {
          throw new Error('Não foi possível carregar esta categoria do Supabase.');
        }

        let loadedCountryName = '';
        let loadedProvinceName = '';

        if (country && province) {
          const { data: provinceData, error: provinceError } = await supabase
            .from('provinces')
            .select('id, name, country_id')
            .eq('id', province)
            .eq('country_id', country)
            .single();

          if (provinceError || !provinceData) {
            throw new Error('A província não pertence ao país selecionado.');
          }

          const { data: countryData } = await supabase
            .from('countries')
            .select('id, name')
            .eq('id', country)
            .single();

          loadedCountryName = countryData?.name || '';
          loadedProvinceName = provinceData.name || '';
        }

        const { data: subcategoryData, error: subcategoryError } = await supabase
          .from('subcategories')
          .select('id, name, description')
          .eq('category_id', id)
          .order('name', { ascending: true });

        if (subcategoryError) {
          throw new Error('Não foi possível carregar as subcategorias do Supabase.');
        }

        if (!cancelled) {
          setCategory(categoryData);
          setSubcategories(subcategoryData || []);
          setCountryName(loadedCountryName);
          setProvinceName(loadedProvinceName);
        }
      } catch (loadError) {
        console.error('Erro em category.js:', loadError);
        if (!cancelled) setError(loadError.message || 'Ocorreu um erro ao carregar a categoria.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, id, country, province]);

  const exploreHref = {
    pathname: '/explore',
    query: {
      ...(country ? { country } : {}),
      ...(province ? { province } : {}),
    },
  };

  return (
    <div className="category-page">
      <header className="category-hero">
        <nav className="category-nav">
          <Link href={exploreHref} className="brand">
            <span className="brand-mark">T</span>
            <span>Talaza</span>
          </Link>

          <Link href={exploreHref} className="back-link">
            <Icon type="back" size={19} />
            Voltar
          </Link>
        </nav>

        {(countryName || provinceName) && (
          <div className="location-chip">
            <span className="location-dot" />
            {[countryName, provinceName].filter(Boolean).join(' · ')}
          </div>
        )}

        <p className="eyebrow">VITRINE TALAZA</p>
        <h1>{category?.name || (loading ? 'A carregar categoria…' : 'Categoria')}</h1>
        <p className="hero-description">
          Escolha uma subcategoria para encontrar os negócios e serviços que procura.
        </p>
        <div className="hero-decoration" aria-hidden="true">
          <Icon type={getCategoryIcon(category?.name)} size={150} />
        </div>
      </header>

      <main className="category-content">
        <div className="section-heading">
          <div>
            <span className="section-kicker">EXPLORE</span>
            <h2>Subcategorias</h2>
          </div>
          {!loading && !error && (
            <span className="count">
              {subcategories.length} {subcategories.length === 1 ? 'opção' : 'opções'}
            </span>
          )}
        </div>

        {loading && (
          <div className="status-card">
            <span className="spinner" />
            A carregar os dados do Supabase…
          </div>
        )}

        {error && (
          <div className="error-card">
            <strong>Não foi possível abrir esta categoria</strong>
            <p>{error}</p>
            <Link href={exploreHref} className="primary-button">Voltar à Vitrine</Link>
          </div>
        )}

        {!loading && !error && subcategories.length === 0 && (
          <div className="empty-card">
            <div className="empty-icon"><Icon type="other" size={28} /></div>
            <h3>Ainda não há subcategorias</h3>
            <p>Esta categoria ainda não tem subcategorias registadas no Supabase.</p>
            <Link href={exploreHref} className="primary-button">Ver outras categorias</Link>
          </div>
        )}

        {!loading && !error && subcategories.length > 0 && (
          <div className="subcategory-grid">
            {subcategories.map((subcategory, index) => {
              const tone = TONES[index % TONES.length];

              return (
                <Link
                  key={subcategory.id}
                  href={{
                    pathname: '/subcategory',
                    query: {
                      id: subcategory.id,
                      ...(country ? { country } : {}),
                      ...(province ? { province } : {}),
                    },
                  }}
                  className="subcategory-card"
                  style={{
                    '--tone-bg': tone.background,
                    '--tone-color': tone.color,
                    '--card-index': index,
                  }}
                >
                  <span className="initial-box">{getInitial(subcategory.name)}</span>
                  <span className="card-arrow"><Icon type="next" size={17} /></span>
                  <h3>{subcategory.name}</h3>
                  {subcategory.description && <p>{subcategory.description}</p>}
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <style jsx>{`
        .category-page {
          min-height: 100vh;
          background: ${COLORS.background};
          color: ${COLORS.ink};
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
          padding-bottom: 48px;
        }
        .category-page * { box-sizing: border-box; }
        .category-hero {
          position: relative;
          overflow: hidden;
          padding: 22px max(20px, calc((100% - 920px) / 2)) 38px;
          background: ${COLORS.darkGreen};
          color: white;
          border-radius: 0 0 30px 30px;
        }
        .category-nav {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          max-width: 920px;
          margin: 0 auto;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          color: white;
          font-size: 19px;
          font-weight: 800;
          text-decoration: none;
        }
        .brand-mark {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: ${COLORS.darkGreen};
          background: ${COLORS.gold};
          font-size: 21px;
          font-weight: 900;
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 9px 13px;
          border: 1px solid rgba(255,255,255,.2);
          border-radius: 99px;
          color: white;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
          background: rgba(255,255,255,.07);
        }
        .location-chip {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 28px;
          padding: 7px 12px;
          border-radius: 99px;
          background: rgba(221,161,10,.16);
          color: #F8D977;
          font-size: 12px;
          font-weight: 700;
        }
        .location-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: ${COLORS.gold};
        }
        .eyebrow {
          position: relative;
          z-index: 1;
          margin: 30px 0 8px;
          color: #EAC55B;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .16em;
        }
        h1 {
          position: relative;
          z-index: 1;
          max-width: 650px;
          margin: 0;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(32px, 6vw, 48px);
          line-height: 1.05;
          letter-spacing: -.035em;
        }
        .hero-description {
          position: relative;
          z-index: 1;
          max-width: 460px;
          margin: 13px 0 0;
          color: rgba(255,255,255,.78);
          font-size: 14px;
          line-height: 1.65;
        }
        .hero-decoration {
          position: absolute;
          right: max(10px, calc((100% - 980px) / 2));
          bottom: -35px;
          color: ${COLORS.gold};
          opacity: .13;
          transform: rotate(-9deg);
        }
        .category-content {
          max-width: 960px;
          margin: 0 auto;
          padding: 30px 20px 0;
        }
        .section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }
        .section-kicker {
          color: ${COLORS.purple};
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .15em;
        }
        .section-heading h2 {
          margin: 5px 0 0;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 25px;
          letter-spacing: -.025em;
        }
        .count { color: ${COLORS.muted}; font-size: 12px; }
        .subcategory-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
          gap: 12px;
        }
        .subcategory-card {
          position: relative;
          display: flex;
          min-height: 165px;
          flex-direction: column;
          align-items: flex-start;
          padding: 15px;
          border: 1px solid ${COLORS.line};
          border-radius: 20px;
          background: ${COLORS.white};
          color: ${COLORS.ink};
          text-decoration: none;
          box-shadow: 0 6px 20px rgba(23,33,31,.035);
          transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
          animation: rise .35s ease both;
          animation-delay: calc(var(--card-index) * 25ms);
        }
        .subcategory-card:hover {
          transform: translateY(-3px);
          border-color: ${COLORS.purple};
          box-shadow: 0 10px 25px rgba(114,82,184,.10);
        }
        .initial-box {
          display: grid;
          place-items: center;
          width: 46px;
          height: 46px;
          border-radius: 15px;
          background: var(--tone-bg);
          color: var(--tone-color);
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 25px;
          font-weight: 800;
        }
        .card-arrow {
          position: absolute;
          top: 15px;
          right: 15px;
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border: 1px solid ${COLORS.line};
          border-radius: 50%;
          color: ${COLORS.purple};
        }
        .subcategory-card h3 {
          margin: auto 0 0;
          padding-top: 20px;
          font-size: 15px;
          line-height: 1.3;
          font-weight: 800;
        }
        .subcategory-card p {
          margin: 6px 0 0;
          color: ${COLORS.muted};
          font-size: 12px;
          line-height: 1.45;
        }
        .status-card, .empty-card, .error-card {
          padding: 24px;
          border: 1px solid ${COLORS.line};
          border-radius: 18px;
          background: ${COLORS.white};
          color: ${COLORS.muted};
          font-size: 13px;
          line-height: 1.6;
        }
        .status-card { display: flex; align-items: center; gap: 12px; }
        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid ${COLORS.mint};
          border-top-color: ${COLORS.green};
          border-radius: 50%;
          animation: spin .8s linear infinite;
        }
        .empty-card { text-align: center; padding: 35px 20px; }
        .empty-icon {
          display: grid;
          place-items: center;
          width: 58px;
          height: 58px;
          margin: 0 auto 14px;
          border-radius: 18px;
          background: ${COLORS.purpleSoft};
          color: ${COLORS.purple};
        }
        .empty-card h3, .error-card strong { color: ${COLORS.ink}; }
        .empty-card p, .error-card p { margin: 8px 0 18px; }
        .error-card { background: #FFF5F4; border-color: #F3D0CC; color: #9B2C2C; }
        .primary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 11px 16px;
          border-radius: 12px;
          background: ${COLORS.green};
          color: white;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
        }
        @keyframes rise {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 480px) {
          .category-hero { padding-left: 18px; padding-right: 18px; }
          .category-content { padding-left: 14px; padding-right: 14px; }
          .subcategory-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
          .subcategory-card { min-height: 150px; padding: 12px; border-radius: 17px; }
          .subcategory-card h3 { font-size: 13.5px; }
          .hero-decoration { right: -45px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .subcategory-card, .spinner { animation: none; transition: none; }
        }
      `}</style>
    </div>
  );
}
