import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Menu() {
  const router = useRouter();

  const { country, province } = router.query;

  const [user, setUser] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;

    loadMenuData();
  }, [router.isReady, country, province]);

  async function loadMenuData() {
    setLoading(true);

    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      setUser(currentUser || null);

      if (currentUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('name, country_id, province_id')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (profileData) {
          setProfileName(profileData.name || '');

          const countryId =
            country || profileData.country_id;

          const provinceId =
            province || profileData.province_id;

          await loadLocationNames(
            countryId,
            provinceId
          );
        } else {
          await loadLocationNames(
            country,
            province
          );
        }
      } else {
        await loadLocationNames(
          country,
          province
        );
      }
    } catch (err) {
      console.error(
        'Erro ao carregar menu:',
        err
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadLocationNames(
    countryId,
    provinceId
  ) {
    try {
      if (countryId) {
        const { data } = await supabase
          .from('countries')
          .select('name')
          .eq('id', countryId)
          .maybeSingle();

        if (data) {
          setCountryName(data.name);
        }
      }

      if (provinceId) {
        const { data } = await supabase
          .from('provinces')
          .select('name')
          .eq('id', provinceId)
          .maybeSingle();

        if (data) {
          setProvinceName(data.name);
        }
      }
    } catch (err) {
      console.error(
        'Erro ao carregar localização do menu:',
        err
      );
    }
  }

  function locationQuery(path) {
    const params = new URLSearchParams();

    if (country) {
      params.set('country', country);
    }

    if (province) {
      params.set('province', province);
    }

    const query = params.toString();

    return query
      ? `${path}?${query}`
      : path;
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      router.push('/start');
    } catch (err) {
      console.error(
        'Erro ao terminar sessão:',
        err
      );

      setLoggingOut(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <button
            type="button"
            onClick={() => router.back()}
            style={styles.backButton}
          >
            ←
          </button>

          <div style={styles.brandArea}>
            <div style={styles.brandMark}>
              T
            </div>

            <div>
              <div style={styles.brand}>
                Talaza
              </div>

              <div style={styles.brandSubtitle}>
                Menu
              </div>
            </div>
          </div>
        </header>

        <section style={styles.profileCard}>
          <div style={styles.avatar}>
            {profileName
              ? profileName
                  .charAt(0)
                  .toUpperCase()
              : 'T'}
          </div>

          <div style={styles.profileInfo}>
            <strong style={styles.profileName}>
              {loading
                ? 'A carregar...'
                : profileName ||
                  (user
                    ? 'Minha conta'
                    : 'Visitante')}
            </strong>

            {(countryName ||
              provinceName) && (
              <span style={styles.location}>
                {countryName}
                {countryName &&
                provinceName
                  ? ' · '
                  : ''}
                {provinceName}
              </span>
            )}
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.sectionLabel}>
            NAVEGAÇÃO
          </div>

          <div style={styles.menuCard}>
            <Link
              href={locationQuery('/explore')}
              style={styles.menuItem}
            >
              <span style={styles.menuIcon}>
                ⌂
              </span>

              <span style={styles.menuText}>
                <strong>Home</strong>
                <small>
                  Voltar à página principal
                </small>
              </span>

              <span style={styles.arrow}>
                →
              </span>
            </Link>

            <Link
              href={locationQuery('/contratar')}
              style={styles.menuItem}
            >
              <span style={styles.menuIcon}>
                ＋
              </span>

              <span style={styles.menuText}>
                <strong>Contratar</strong>
                <small>
                  Publicar uma oportunidade
                </small>
              </span>

              <span style={styles.arrow}>
                →
              </span>
            </Link>

            <Link
              href={locationQuery(
                '/oportunidades'
              )}
              style={styles.menuItem}
            >
              <span style={styles.menuIcon}>
                ✦
              </span>

              <span style={styles.menuText}>
                <strong>
                  Oportunidades
                </strong>
                <small>
                  Ver oportunidades disponíveis
                </small>
              </span>

              <span style={styles.arrow}>
                →
              </span>
            </Link>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.sectionLabel}>
            LOCALIZAÇÃO
          </div>

          <div style={styles.menuCard}>
            <Link
              href={locationQuery('/province')}
              style={styles.menuItem}
            >
              <span style={styles.menuIcon}>
                ◉
              </span>

              <span style={styles.menuText}>
                <strong>
                  Alterar província
                </strong>
                <small>
                  {provinceName
                    ? `Atual: ${provinceName}`
                    : 'Escolher outra província'}
                </small>
              </span>

              <span style={styles.arrow}>
                →
              </span>
            </Link>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.sectionLabel}>
            ÁREA DO VENDEDOR
          </div>

          <div style={styles.sellerCard}>
            <div style={styles.sellerIcon}>
              ◇
            </div>

            <div style={styles.sellerContent}>
              <strong>
                Perfil de vendedor
              </strong>

              <p>
                Voltar ao seu espaço de
                vendedor e gerir o seu
                negócio.
              </p>

              <Link
                href={locationQuery(
                  '/post-business'
                )}
                style={styles.sellerButton}
              >
                Entrar na área do vendedor
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.sectionLabel}>
            TALAZA
          </div>

          <div style={styles.menuCard}>
            <Link
              href={locationQuery(
                '/comunidade'
              )}
              style={styles.menuItem}
            >
              <span style={styles.menuIcon}>
                ◌
              </span>

              <span style={styles.menuText}>
                <strong>
                  Comunidade
                </strong>
                <small>
                  Em breve
                </small>
              </span>

              <span style={styles.comingSoon}>
                Brevemente
              </span>
            </Link>

            <Link
              href={locationQuery(
                '/eventos'
              )}
              style={styles.menuItem}
            >
              <span style={styles.menuIcon}>
                ◫
              </span>

              <span style={styles.menuText}>
                <strong>
                  Eventos
                </strong>
                <small>
                  Descubra o que acontece
                </small>
              </span>

              <span style={styles.arrow}>
                →
              </span>
            </Link>

            <Link
              href={locationQuery(
                '/ebooks'
              )}
              style={styles.menuItem}
            >
              <span style={styles.menuIcon}>
                ▱
              </span>

              <span style={styles.menuText}>
                <strong>
                  Ebooks
                </strong>
                <small>
                  Conteúdos e materiais
                </small>
              </span>

              <span style={styles.comingSoon}>
                Brevemente
              </span>
            </Link>

            <Link
              href="/informacoes"
              style={styles.menuItem}
            >
              <span style={styles.menuIcon}>
                i
              </span>

              <span style={styles.menuText}>
                <strong>
                  Informações
                </strong>
                <small>
                  Sobre o Talaza
                </small>
              </span>

              <span style={styles.arrow}>
                →
              </span>
            </Link>
          </div>
        </section>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          style={styles.logoutButton}
        >
          {loggingOut
            ? 'A terminar sessão...'
            : 'Terminar sessão'}
        </button>

        <p style={styles.footer}>
          Talaza · Tudo o que você procura,
          num só lugar.
        </p>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#FAF7F2',
    color: '#1C2321',
    padding: '18px 16px 50px',
  },

  container: {
    width: '100%',
    maxWidth: '720px',
    margin: '0 auto',
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '22px',
  },

  backButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '1px solid #E7E2D6',
    background: '#fff',
    color: '#1C2321',
    fontSize: '20px',
    cursor: 'pointer',
  },

  brandArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  brandMark: {
    width: '40px',
    height: '40px',
    borderRadius: '11px',
    background: '#C9932E',
    color: '#0A2E27',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '18px',
  },

  brand: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#0A2E27',
  },

  brandSubtitle: {
    marginTop: '1px',
    fontSize: '11px',
    color: '#737B76',
  },

  profileCard: {
    background: '#0A2E27',
    borderRadius: '20px',
    padding: '18px',
    display: 'flex',
    alignItems: 'center',
    gap: '13px',
    marginBottom: '26px',
  },

  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: '#C9932E',
    color: '#0A2E27',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '800',
    flexShrink: 0,
  },

  profileInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
  },

  profileName: {
    color: '#fff',
    fontSize: '15px',
  },

  location: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: '12px',
  },

  section: {
    marginBottom: '24px',
  },

  sectionLabel: {
    fontSize: '10px',
    fontWeight: '800',
    letterSpacing: '1.4px',
    color: '#7A837E',
    marginBottom: '9px',
  },

  menuCard: {
    background: '#fff',
    border: '1px solid #E7E2D6',
    borderRadius: '17px',
    overflow: 'hidden',
  },

  menuItem: {
    minHeight: '68px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 15px',
    textDecoration: 'none',
    color: '#1C2321',
    borderBottom: '1px solid #EEEAE1',
  },

  menuIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '11px',
    background: '#F3F0E9',
    color: '#0F5C4E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '17px',
    fontWeight: '700',
    flexShrink: 0,
  },

  menuText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    flex: 1,
    minWidth: 0,
  },

  menuTextStrong: {
    fontSize: '14px',
  },

  arrow: {
    color: '#9AA19D',
    fontSize: '18px',
  },

  comingSoon: {
    fontSize: '9px',
    fontWeight: '800',
    color: '#8A6A28',
    background: '#F3E6CB',
    padding: '5px 7px',
    borderRadius: '999px',
    whiteSpace: 'nowrap',
  },

  sellerCard: {
    background: '#fff',
    border: '1px solid #E7E2D6',
    borderRadius: '18px',
    padding: '18px',
    display: 'flex',
    gap: '14px',
  },

  sellerIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: '#E7F0EC',
    color: '#0F5C4E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0,
  },

  sellerContent: {
    flex: 1,
  },

  sellerButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
    color: '#0F5C4E',
    fontSize: '13px',
    fontWeight: '800',
    textDecoration: 'none',
  },

  logoutButton: {
    width: '100%',
    border: '1px solid #E5CFCF',
    background: '#fff',
    color: '#9B3434',
    borderRadius: '13px',
    padding: '13px',
    fontSize: '13px',
    fontWeight: '800',
    cursor: 'pointer',
  },

  footer: {
    textAlign: 'center',
    color: '#9A9F9B',
    fontSize: '11px',
    lineHeight: 1.5,
    marginTop: '24px',
  },
};
