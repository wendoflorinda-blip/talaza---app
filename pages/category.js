import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

const COLORS = {
  green: '#0F6E5C',
  darkGreen: '#083F35',
  gold: '#DDA10A',
  purple: '#7252B8',
  purpleSoft: '#F1ECFA',
  ink: '#17211F',
  muted: '#596560',
  canvas: '#F8F6F3',
  white: '#FFFFFF',
  line: '#E5E9E7',
};

function getInitial(name) {
  return (
    String(name || '')
      .normalize('NFC')
      .trim()
      .charAt(0)
      .toLocaleUpperCase('pt-AO') || '?'
  );
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
    if (!router.isReady || !id) return;

    let cancelled = false;

    async function loadPage() {
      setLoading(true);
      setError('');

      try {
        const { data: categoryData, error: categoryError } =
          await supabase
            .from('categories')
            .select('id, name')
            .eq('id', id)
            .single();

        if (categoryError) throw categoryError;

        const { data: subcategoryData, error: subcategoryError } =
          await supabase
            .from('subcategories')
            .select('id, name, description, category_id')
            .eq('category_id', id)
            .order('name', { ascending: true });

        if (subcategoryError) throw subcategoryError;

        let foundCountryName = '';
        let foundProvinceName = '';

        if (country) {
          const { data } = await supabase
            .from('countries')
            .select('id, name')
            .eq('id', country)
            .maybeSingle();

          foundCountryName = data?.name || '';
        }

        if (province) {
          const { data } = await supabase
            .from('provinces')
            .select('id, name, country_id')
            .eq('id', province)
            .maybeSingle();

          if (data && (!country || data.country_id === country)) {
            foundProvinceName = data.name || '';
          }
        }

        if (cancelled) return;

        setCategory(categoryData);
        setSubcategories(subcategoryData || []);
        setCountryName(foundCountryName);
        setProvinceName(foundProvinceName);
      } catch (err) {
        console.error('Erro ao carregar categoria:', err);

        if (!cancelled) {
          setError(
            'Não foi possível carregar esta categoria. Tenta novamente.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, id, country, province]);

  function subcategoryHref(subcategoryId) {
    const params = new URLSearchParams();
    params.set('id', subcategoryId);

    if (country) params.set('country', country);
    if (province) params.set('province', province);

    return `/subcategory?${params.toString()}`;
  }

  return (
    <>
      <Head>
        <title>
          {category?.name ? `${category.name} | Talaza` : 'Categorias | Talaza'}
        </title>
        <meta
          name="description"
          content="Explore subcategorias e encontre negócios na Talaza."
        />
      </Head>

      <main className="page">
        <header className="topbar">
          <Link href="/explore" className="brand">
            <span className="brandMark">T</span>
            <span>talaza</span>
          </Link>

          <Link href="/explore" className="backLink">
            ← Voltar à Vitrine
          </Link>
        </header>

        <section className="hero">
          <span className="eyebrow">VITRINE TALAZA</span>

          <h1>
            {loading ? 'A carregar categoria…' : category?.name || 'Categoria'}
          </h1>

          <p>
            Escolhe uma subcategoria para explorar os negócios e serviços
            disponíveis.
          </p>

          {(countryName || provinceName) && (
            <div className="location">
              {countryName && <span>{countryName}</span>}
              {provinceName && <span>• {provinceName}</span>}
            </div>
          )}
        </section>

        <section className="content">
          <div className="sectionHeading">
            <div>
              <h2>Explorar subcategorias</h2>
              <p>Encontra a área que procuras.</p>
            </div>

            {!loading && (
              <span className="count">
                {subcategories.length}{' '}
                {subcategories.length === 1 ? 'opção' : 'opções'}
              </span>
            )}
          </div>

          {loading && (
            <div className="message">A carregar subcategorias…</div>
          )}

          {!loading && error && (
            <div className="message error">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => router.replace(router.asPath)}
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!loading && !error && subcategories.length === 0 && (
            <div className="message">
              Ainda não existem subcategorias registadas nesta categoria.
            </div>
          )}

          {!loading && !error && subcategories.length > 0 && (
            <div className="grid">
              {subcategories.map((subcategory, index) => (
                <Link
                  href={subcategoryHref(subcategory.id)}
                  key={subcategory.id}
                  className="subcategoryCard"
                >
                  <div
                    className={`letter letter${index % 4}`}
                    aria-hidden="true"
                  >
                    {getInitial(subcategory.name)}
                  </div>

                  <div className="cardText">
                    <h3>{String(subcategory.name || '').trim()}</h3>

                    <p>
                      {String(subcategory.description || '').trim() ||
                        'Explora negócios e serviços desta área.'}
                    </p>

                    <span className="openLink">Explorar →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <footer className="footer">
          <span>Talaza</span>
          <span>Descobre. Compara. Encontra.</span>
        </footer>
      </main>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: ${COLORS.canvas};
          color: ${COLORS.ink};
          font-family: Arial, Helvetica, sans-serif;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px max(5%, calc((100% - 1160px) / 2));
          background: ${COLORS.white};
          border-bottom: 1px solid ${COLORS.line};
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 9px;
          color: ${COLORS.darkGreen};
          font-size: 23px;
          font-weight: 800;
          text-decoration: none;
          letter-spacing: -0.7px;
        }

        .brandMark {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border-radius: 11px;
          background: ${COLORS.green};
          color: white;
        }

        .backLink {
          color: ${COLORS.green};
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
        }

        .hero {
          padding: 48px max(5%, calc((100% - 1160px) / 2)) 42px;
          background: ${COLORS.darkGreen};
          color: white;
        }

        .eyebrow {
          color: #EBCB78;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .hero h1 {
          margin: 12px 0 10px;
          font-size: clamp(28px, 4vw, 43px);
          line-height: 1.12;
          letter-spacing: -1.2px;
        }

        .hero p {
          max-width: 570px;
          margin: 0;
          color: #E1EAE6;
          font-size: 15px;
          line-height: 1.7;
        }

        .location {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 18px;
          color: #EBCB78;
          font-size: 12px;
          font-weight: 700;
        }

        .content {
          max-width: 1160px;
          margin: 0 auto;
          padding: 34px 24px 56px;
        }

        .sectionHeading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 22px;
        }

        .sectionHeading h2 {
          margin: 0 0 6px;
          font-size: 22px;
          letter-spacing: -0.5px;
        }

        .sectionHeading p {
          margin: 0;
          color: ${COLORS.muted};
          font-size: 13px;
        }

        .count {
          flex-shrink: 0;
          padding: 8px 12px;
          border-radius: 20px;
          background: ${COLORS.purpleSoft};
          color: ${COLORS.purple};
          font-size: 12px;
          font-weight: 800;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .subcategoryCard {
          display: flex;
          align-items: flex-start;
          gap: 15px;
          min-width: 0;
          padding: 19px;
          border: 1px solid ${COLORS.line};
          border-radius: 17px;
          background: ${COLORS.white};
          color: inherit;
          text-decoration: none;
          transition: border-color 0.18s, transform 0.18s;
        }

        .subcategoryCard:hover {
          border-color: ${COLORS.green};
          transform: translateY(-2px);
        }

        .letter {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: #E8F3F0;
          color: ${COLORS.green};
          font-size: 23px;
          font-weight: 800;
        }

        .letter1 {
          background: #FBF1D7;
          color: #8B6505;
        }

        .letter2 {
          background: ${COLORS.purpleSoft};
          color: ${COLORS.purple};
        }

        .letter3 {
          background: #F9E8EA;
          color: #A63D4B;
        }

        .cardText {
          min-width: 0;
        }

        .cardText h3 {
          margin: 2px 0 8px;
          font-size: 15px;
          line-height: 1.4;
        }

        .cardText p {
          display: -webkit-box;
          overflow: hidden;
          margin: 0 0 12px;
          color: ${COLORS.muted};
          font-size: 12px;
          line-height: 1.6;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
        }

        .openLink {
          color: ${COLORS.green};
          font-size: 12px;
          font-weight: 800;
        }

        .message {
          padding: 22px;
          border: 1px solid ${COLORS.line};
          border-radius: 14px;
          background: white;
          color: ${COLORS.muted};
          font-size: 14px;
          line-height: 1.6;
        }

        .error {
          border-color: #F0C8CD;
          color: #9C2F3C;
        }

        .error button {
          padding: 9px 13px;
          border: 0;
          border-radius: 9px;
          background: ${COLORS.green};
          color: white;
          cursor: pointer;
          font-weight: 700;
        }

        .footer {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 20px max(5%, calc((100% - 1160px) / 2));
          border-top: 1px solid ${COLORS.line};
          color: ${COLORS.muted};
          font-size: 11px;
        }

        @media (max-width: 900px) {
          .grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 560px) {
          .topbar {
            padding: 15px 18px;
          }

          .brand {
            font-size: 20px;
          }

          .hero {
            padding: 35px 20px;
          }

          .content {
            padding: 27px 16px 40px;
          }

          .grid {
            grid-template-columns: 1fr;
            gap: 11px;
          }

          .subcategoryCard {
            padding: 15px;
          }

          .sectionHeading h2 {
            font-size: 19px;
          }

          .footer {
            padding: 18px;
          }
        }
      `}</style>
    </>
  );
}
