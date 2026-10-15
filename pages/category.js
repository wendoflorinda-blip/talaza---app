import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

function getCategoryIcon(name = '') {
  const value = name.toLowerCase();

  const icons = [
    [/trancista|tranças|trança|cabelo|barbe|cabeleire|penteado/, '💇🏾‍♀️'],
    [/escola|educa|ensino|universidade|explica|formação|creche/, '🎓'],
    [/oficina|mecânic|automó|carro|motorizada|pneus/, '🔧'],
    [/decorador|decoraç|interior|mobiliário/, '🛋️'],
    [/beleza|estética|maquilh|maquiag|unhas|manicure|pedicure/, '💅🏽'],
    [/saúde|médic|clínica|enferm|farmácia|dentista/, '🩺'],
    [/constru|pedreiro|canaliza|eletricista|arquitet|engenharia/, '🏗️'],
    [/restaurante|comida|pastel|cozinha|catering|padaria/, '🍽️'],
    [/roupa|moda|costura|alfaiat|boutique|vestuário/, '👗'],
    [/tecnologia|informática|computador|software|programa/, '💻'],
    [/fotograf|vídeo|filmagem|imagem/, '📸'],
    [/evento|festa|casamento|cerimónia|cerimonia/, '🎉'],
    [/casa|imóvel|imobili|alojamento|hospedagem/, '🏠'],
    [/agricult|jardim|plantas|floricultura/, '🌱'],
    [/transporte|entrega|mudança|mudancas|logística/, '🚚'],
    [/limpeza|lavandaria|lavagem/, '🧹'],
    [/advog|juríd|jurid|contabil|consultoria/, '⚖️'],
    [/empresa|negócio|negocio|serviço|servico|profissional/, '💼'],
    [/desporto|ginásio|ginasio|fitness|treino/, '🏋🏽'],
    [/arte|artesanato|pintura|desenho/, '🎨'],
    [/hotel|turismo|viagem|excursão|excursao/, '🧳'],
    [/segurança|seguranca|vigilância|vigilancia/, '🛡️'],
  ];

  const match = icons.find(([pattern]) => pattern.test(value));
  return match ? match[1] : '✦';
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

    if (!id || !country || !province) {
      router.replace('/country');
      return;
    }

    let cancelled = false;

    async function loadData() {
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

        const { data: provinceData, error: provinceError } =
          await supabase
            .from('provinces')
            .select('id, name, country_id')
            .eq('id', province)
            .eq('country_id', country)
            .single();

        if (provinceError || !provinceData) {
          throw new Error(
            'Esta província não pertence ao país selecionado.'
          );
        }

        const { data: countryData, error: countryError } =
          await supabase
            .from('countries')
            .select('id, name')
            .eq('id', country)
            .single();

        if (countryError) throw countryError;

        const { data: subcategoryData, error: subcategoryError } =
          await supabase
            .from('subcategories')
            .select('id, name, description')
            .eq('category_id', id)
            .order('name', { ascending: true });

        if (subcategoryError) throw subcategoryError;

        if (cancelled) return;

        setCategory(categoryData);
        setProvinceName(provinceData.name);
        setCountryName(countryData?.name || '');
        setSubcategories(subcategoryData || []);
      } catch (err) {
        console.error('Erro ao carregar categoria:', err);

        if (!cancelled) {
          setError(
            err.message || 'Não foi possível carregar esta categoria.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, id, country, province, router]);

  const exploreHref = {
    pathname: '/explore',
    query: { country, province },
  };

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.navbar}>
          <Link href={exploreHref} style={styles.brand}>
            <span style={styles.logo}>T</span>
            <span>
              <strong style={styles.brandName}>Talaza</strong>
              <small style={styles.brandTagline}>
                Descobre. Compara. Encontra.
              </small>
            </span>
          </Link>

          <Link href={exploreHref} style={styles.backButton}>
            <span aria-hidden="true">←</span>
            <span>Voltar à Vitrine</span>
          </Link>
        </header>

        <section style={styles.hero}>
          <div style={styles.locationPill}>
            <span aria-hidden="true">📍</span>
            <span>
              {countryName || 'País'} <span style={styles.dot}>·</span>{' '}
              {provinceName || 'Província'}
            </span>
          </div>

          {loading ? (
            <div style={styles.loading}>
              <span style={styles.loadingIcon}>✦</span>
              <p>A preparar as opções para ti...</p>
            </div>
          ) : error ? (
            <div style={styles.errorCard}>
              <span style={styles.errorIcon}>!</span>
              <h2>Não foi possível abrir esta categoria</h2>
              <p>{error}</p>
              <Link href={exploreHref} style={styles.primaryButton}>
                Voltar à Vitrine
              </Link>
            </div>
          ) : category ? (
            <>
              <div style={styles.heroIcon}>
                {getCategoryIcon(category.name)}
              </div>

              <span style={styles.eyebrow}>EXPLORAR TALAZA</span>

              <h1 style={styles.title}>{category.name}</h1>

              <p style={styles.description}>
                Encontra o serviço, profissional ou estabelecimento
                certo para o que precisas.
              </p>

              <div style={styles.countPill}>
                <span style={styles.countNumber}>
                  {subcategories.length}
                </span>
                <span>
                  {subcategories.length === 1
                    ? 'subcategoria disponível'
                    : 'subcategorias disponíveis'}
                </span>
              </div>
            </>
          ) : null}
        </section>

        {!loading && !error && category && (
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <div>
                <span style={styles.sectionEyebrow}>ENCONTRA O QUE PROCURAS</span>
                <h2 style={styles.sectionTitle}>Explora por área</h2>
              </div>
              <span style={styles.sectionDecoration}>✳</span>
            </div>

            {subcategories.length === 0 ? (
              <div style={styles.emptyCard}>
                <span style={styles.emptyIcon}>⌕</span>
                <h3>Ainda estamos a preparar esta área</h3>
                <p>
                  Ainda não existem subcategorias registadas nesta categoria.
                  Volta mais tarde para descobrir novas opções.
                </p>
              </div>
            ) : (
              <div style={styles.grid}>
                {subcategories.map((subcategory, index) => {
                  const icon = getCategoryIcon(subcategory.name);

                  return (
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
                      style={styles.card}
                      aria-label={`Explorar ${subcategory.name}`}
                    >
                      <div
                        style={{
                          ...styles.iconBox,
                          ...(index % 3 === 0
                            ? styles.iconGreen
                            : index % 3 === 1
                              ? styles.iconPurple
                              : styles.iconGold),
                        }}
                      >
                        <span style={styles.cardIcon}>{icon}</span>
                      </div>

                      <div style={styles.cardContent}>
                        <h3 style={styles.cardTitle}>
                          {subcategory.name}
                        </h3>

                        <p style={styles.cardDescription}>
                          {subcategory.description ||
                            `Descobre opções de ${subcategory.name.toLowerCase()} na tua província.`}
                        </p>

                        <span style={styles.cardLink}>
                          Explorar <span aria-hidden="true">↗</span>
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <footer style={styles.footer}>
          <span style={styles.footerMark}>T</span>
          <span>
            <strong>Talaza</strong>
            <span style={styles.footerText}>
              Tudo o que procuras, num só lugar.
            </span>
          </span>
        </footer>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#F8F6F3',
    color: '#17211F',
    padding: '0 18px',
  },
  container: {
    maxWidth: 1120,
    margin: '0 auto',
  },
  navbar: {
    minHeight: 76,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
    borderBottom: '1px solid #E5E9E7',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    color: '#17211F',
    textDecoration: 'none',
  },
  logo: {
    width: 43,
    height: 43,
    borderRadius: 14,
    display: 'grid',
    placeItems: 'center',
    background: '#083F35',
    color: '#DDA10A',
    fontSize: 24,
    fontWeight: 900,
    boxShadow: '0 5px 12px rgba(8,63,53,0.15)',
  },
  brandName: {
    display: 'block',
    color: '#083F35',
    fontSize: 18,
    letterSpacing: '-0.5px',
  },
  brandTagline: {
    display: 'block',
    marginTop: 3,
    fontSize: 10,
    color: '#89948F',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    textDecoration: 'none',
    color: '#083F35',
    background: '#FFFFFF',
    border: '1px solid #E5E9E7',
    borderRadius: 11,
    padding: '10px 13px',
    fontSize: 12,
    fontWeight: 700,
  },
  hero: {
    textAlign: 'center',
    padding: '43px 0 46px',
    borderBottom: '1px solid #E5E9E7',
  },
  locationPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    border: '1px solid #DCE8E3',
    background: '#E8F3F0',
    color: '#083F35',
    borderRadius: 30,
    padding: '9px 14px',
    fontSize: 12,
    fontWeight: 700,
  },
  dot: {
    color: '#DDA10A',
    padding: '0 3px',
  },
  heroIcon: {
    width: 76,
    height: 76,
    margin: '25px auto 17px',
    display: 'grid',
    placeItems: 'center',
    borderRadius: 25,
    background: '#F1ECFA',
    border: '1px solid #E5DDF6',
    fontSize: 37,
    boxShadow: '0 8px 24px rgba(114,82,184,0.08)',
  },
  eyebrow: {
    display: 'block',
    color: '#7252B8',
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: 800,
  },
  title: {
    color: '#083F35',
    fontSize: 'clamp(29px, 5vw, 43px)',
    letterSpacing: '-1.3px',
    lineHeight: 1.15,
    margin: '10px 0',
  },
  description: {
    maxWidth: 480,
    margin: '0 auto',
    color: '#596560',
    fontSize: 14,
    lineHeight: 1.7,
  },
  countPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    fontSize: 12,
    color: '#596560',
  },
  countNumber: {
    display: 'grid',
    placeItems: 'center',
    minWidth: 25,
    height: 25,
    borderRadius: 9,
    padding: '0 5px',
    background: '#FBF1D7',
    color: '#7252B8',
    fontWeight: 900,
  },
  section: {
    padding: '34px 0 50px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 22,
  },
  sectionEyebrow: {
    color: '#89948F',
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: 800,
  },
  sectionTitle: {
    color: '#17211F',
    fontSize: 23,
    letterSpacing: '-0.6px',
    margin: '6px 0 0',
  },
  sectionDecoration: {
    color: '#DDA10A',
    fontSize: 31,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 235px), 1fr))',
    gap: 15,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 15,
    padding: 18,
    minHeight: 205,
    boxSizing: 'border-box',
    textDecoration: 'none',
    color: '#17211F',
    background: '#FFFFFF',
    border: '1px solid #E5E9E7',
    borderRadius: 17,
    boxShadow: '0 4px 15px rgba(23,33,31,0.025)',
    transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
  },
  iconBox: {
    width: 53,
    height: 53,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 16,
  },
  iconGreen: {
    background: '#E8F3F0',
    border: '1px solid #D7EAE3',
  },
  iconPurple: {
    background: '#F1ECFA',
    border: '1px solid #E5DDF6',
  },
  iconGold: {
    background: '#FBF1D7',
    border: '1px solid #F0E4C0',
  },
  cardIcon: {
    fontSize: 27,
    lineHeight: 1,
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  cardTitle: {
    color: '#083F35',
    fontSize: 15,
    lineHeight: 1.4,
    margin: '0 0 7px',
  },
  cardDescription: {
    color: '#596560',
    fontSize: 12,
    lineHeight: 1.6,
    margin: 0,
  },
  cardLink: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 17,
    paddingTop: 12,
    borderTop: '1px solid #EDF0EE',
    color: '#7252B8',
    fontSize: 12,
    fontWeight: 800,
  },
  emptyCard: {
    textAlign: 'center',
    padding: '45px 20px',
    borderRadius: 18,
    border: '1px dashed #D7DEDA',
    background: '#FFFFFF',
  },
  emptyIcon: {
    display: 'grid',
    placeItems: 'center',
    margin: '0 auto 15px',
    width: 56,
    height: 56,
    borderRadius: 18,
    background: '#F1ECFA',
    color: '#7252B8',
    fontSize: 29,
  },
  loading: {
    padding: 40,
    color: '#596560',
  },
  loadingIcon: {
    color: '#7252B8',
    fontSize: 30,
  },
  errorCard: {
    maxWidth: 520,
    margin: '30px auto 0',
    padding: 25,
    border: '1px solid #F1D7D9',
    borderRadius: 18,
    background: '#FFFFFF',
  },
  errorIcon: {
    display: 'grid',
    placeItems: 'center',
    width: 34,
    height: 34,
    borderRadius: 12,
    background: '#FBEAEC',
    color: '#B93845',
    fontWeight: 900,
  },
  primaryButton: {
    display: 'inline-flex',
    marginTop: 12,
    padding: '11px 15px',
    borderRadius: 10,
    background: '#0F6E5C',
    color: '#FFFFFF',
    textDecoration: 'none',
    fontSize: 12,
    fontWeight: 800,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    borderTop: '1px solid #E5E9E7',
    padding: '22px 0 30px',
  },
  footerMark: {
    width: 32,
    height: 32,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 10,
    background: '#083F35',
    color: '#DDA10A',
    fontWeight: 900,
  },
  footerText: {
    display: 'block',
    marginTop: 3,
    color: '#89948F',
    fontSize: 11,
  },
};
