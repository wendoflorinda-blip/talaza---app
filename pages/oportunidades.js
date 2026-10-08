import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const OPPORTUNITY_PLAN_ID =
  '0fff05f6-c619-4c72-ba3e-3a0028eafef7';

const OPPORTUNITY_PLAN_NAME =
  '🔥 Plano Semestral Promocional - Acesso a Oportunidades';

const COLORS = {
  canvas: '#F8F6F3',
  surface: '#FFFFFF',
  brand: '#0F6E5C',
  brandDark: '#083F35',
  brandSoft: '#E8F3F0',
  gold: '#DDA10A',
  goldSoft: '#FBF1D7',
  purple: '#7252B8',
  purpleDark: '#5C438F',
  purpleSoft: '#F1ECFA',
  ink: '#17211F',
  inkSoft: '#596560',
  inkFaint: '#89948F',
  line: '#E5E9E7',
  danger: '#A12626',
  dangerSoft: '#FFF0F0',
};

function Icon({ type, size = 22, color = COLORS.purple }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  const icons = {
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),

    sparkle: (
      <>
        <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
        <path d="M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16z" />
      </>
    ),

    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M3 12h18" />
      </>
    ),

    check: (
      <>
        <path d="M5 12.5l4 4L19 7" />
      </>
    ),

    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="M13 6l6 6-6 6" />
      </>
    ),

    location: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),

    home: (
      <>
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </>
    ),
  };

  return <svg {...common}>{icons[type] || icons.sparkle}</svg>;
}

export default function Oportunidades() {
  const router = useRouter();

  const { country, province } = router.query;

  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');

  const [user, setUser] = useState(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  const [opportunities, setOpportunities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    initialize();
  }, [router.isReady, country, province]);

  async function initialize() {
    setCheckingAccess(true);
    setLoading(true);
    setError('');

    await loadLocationNames();

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    setUser(currentUser || null);

    if (!currentUser) {
      setHasAccess(false);
      setCheckingAccess(false);
      setLoading(false);
      return;
    }

    const access = await checkOpportunityAccess(currentUser.id);

    setHasAccess(access);

    if (access) {
      await loadOpportunities();
    } else {
      setOpportunities([]);
    }

    setCheckingAccess(false);
    setLoading(false);
  }

  async function loadLocationNames() {
    try {
      if (country) {
        const { data: countryData } = await supabase
          .from('countries')
          .select('name')
          .eq('id', country)
          .single();

        if (countryData) {
          setCountryName(countryData.name);
        }
      }

      if (province) {
        const { data: provinceData } = await supabase
          .from('provinces')
          .select('name')
          .eq('id', province)
          .single();

        if (provinceData) {
          setProvinceName(provinceData.name);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar localização:', err);
    }
  }

  async function checkOpportunityAccess(userId) {
    try {
      const { data, error: subscriptionError } = await supabase
        .from('user_plan_subscriptions')
        .select(`
          id,
          user_id,
          plan_id,
          status,
          starts_at,
          expires_at,
          country_id,
          province_id
        `)
        .eq('user_id', userId)
        .eq('plan_id', OPPORTUNITY_PLAN_ID)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1);

      if (subscriptionError) {
        console.error(
          'Erro ao verificar acesso:',
          subscriptionError
        );

        return false;
      }

      if (!data || data.length === 0) {
        return false;
      }

      const subscription = data[0];

      if (
        subscription.country_id &&
        country &&
        String(subscription.country_id) !== String(country)
      ) {
        return false;
      }

      if (
        subscription.province_id &&
        province &&
        String(subscription.province_id) !== String(province)
      ) {
        return false;
      }

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  async function loadOpportunities() {
    setLoading(true);
    setError('');

    try {
      if (!country || !province) {
        setOpportunities([]);
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('job_posts')
        .select('*')
        .eq('country_id', country)
        .eq('province_id', province)
        .eq('is_active', true)
        .eq('status', 'published')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (queryError) {
        throw queryError;
      }

      setOpportunities(data || []);
    } catch (err) {
      console.error(err);
      setError(
        'Não foi possível carregar as oportunidades.'
      );
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);

    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function openWhatsApp(number) {
    if (!number) return;

    const cleanNumber = number.replace(/[^\d]/g, '');

    if (!cleanNumber) return;

    window.open(
      `https://wa.me/${cleanNumber}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  function goToPlan() {
    const query = new URLSearchParams();

    query.set('planId', OPPORTUNITY_PLAN_ID);

    if (country) {
      query.set('country', country);
    }

    if (province) {
      query.set('province', province);
    }

    router.push(`/planos?${query.toString()}`);
  }

  const exploreUrl = `/explore?country=${encodeURIComponent(
    country || ''
  )}&province=${encodeURIComponent(province || '')}`;

  const contratarUrl = `/contratar?country=${encodeURIComponent(
    country || ''
  )}&province=${encodeURIComponent(province || '')}`;

  if (!router.isReady || checkingAccess) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          <div style={styles.loadingIcon}>
            <Icon
              type="sparkle"
              size={25}
              color={COLORS.purple}
            />
          </div>

          <span>A preparar as oportunidades...</span>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <Link href={exploreUrl} style={styles.backButton}>
            ← Voltar
          </Link>

          <div style={styles.headerContent}>
            <span style={styles.eyebrow}>TALAZA</span>

            <h1 style={styles.title}>
              Oportunidades
            </h1>

            {(countryName || provinceName) && (
              <div style={styles.locationPill}>
                <Icon
                  type="location"
                  size={14}
                  color={COLORS.purple}
                />

                <span>
                  {countryName}
                  {countryName && provinceName ? ' · ' : ''}
                  {provinceName}
                </span>
              </div>
            )}
          </div>
        </header>

        {!hasAccess && (
          <>
            <section style={styles.exclusiveCard}>
              <div style={styles.exclusiveGlow} />

              <div style={styles.lockCircle}>
                <Icon
                  type="lock"
                  size={26}
                  color={COLORS.purple}
                />
              </div>

              <span style={styles.exclusiveLabel}>
                ÁREA EXCLUSIVA
              </span>

              <h2 style={styles.exclusiveTitle}>
                As próximas oportunidades
                <br />
                podem começar aqui.
              </h2>

              <p style={styles.exclusiveText}>
                Esta área reúne oportunidades publicadas para a sua
                província. Desbloqueie o acesso para acompanhar novas vagas
                e descobrir oportunidades que podem combinar consigo.
              </p>

              <div style={styles.planPreview}>
                <div style={styles.planIcon}>
                  <span>🔥</span>
                </div>

                <div style={styles.planInfo}>
                  <span style={styles.planSmall}>
                    PLANO DE ACESSO
                  </span>

                  <strong>
                    Plano Semestral Promocional
                  </strong>

                  <span>
                    Acesso a Oportunidades
                  </span>
                </div>

                <div style={styles.planArrow}>
                  <Icon
                    type="arrow"
                    size={18}
                    color={COLORS.purple}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={goToPlan}
                style={styles.unlockButton}
              >
                <span>
                  {user
                    ? 'Desbloquear oportunidades'
                    : 'Ver plano de acesso'}
                </span>

                <Icon
                  type="arrow"
                  size={17}
                  color="#fff"
                />
              </button>

              {!user && (
                <p style={styles.loginNote}>
                  Ao continuar, poderá entrar na sua conta Talaza e
                  prosseguir com a ativação.
                </p>
              )}
            </section>

            <section style={styles.bottomMessage}>
              <div style={styles.bottomIcon}>
                <Icon
                  type="briefcase"
                  size={20}
                  color={COLORS.purple}
                />
              </div>

              <div>
                <h3>
                  Ainda não encontrou o que procura?
                </h3>

                <p>
                  As oportunidades são publicadas continuamente. Ative o
                  acesso e volte sempre para acompanhar as novidades.
                </p>
              </div>
            </section>
          </>
        )}

        {hasAccess && (
          <>
            <section style={styles.accessHeader}>
              <div>
                <span style={styles.sectionEyebrow}>
                  ACESSO ATIVO
                </span>

                <h2 style={styles.accessTitle}>
                  Oportunidades disponíveis
                </h2>

                <p style={styles.accessDescription}>
                  Veja as oportunidades publicadas na sua província.
                </p>
              </div>

              <Link
                href={contratarUrl}
                style={styles.publishLink}
              >
                + Publicar
              </Link>
            </section>

            {loading && (
              <div style={styles.emptyBox}>
                <div style={styles.loadingSmall}>
                  <Icon
                    type="sparkle"
                    size={19}
                    color={COLORS.purple}
                  />
                </div>

                <p>
                  A carregar oportunidades...
                </p>
              </div>
            )}

            {!loading && error && (
              <div style={styles.error}>
                {error}
              </div>
            )}

            {!loading &&
              !error &&
              opportunities.length === 0 && (
                <div style={styles.emptyBox}>
                  <div style={styles.emptyIcon}>
                    <Icon
                      type="briefcase"
                      size={28}
                      color={COLORS.purple}
                    />
                  </div>

                  <h3 style={styles.emptyTitle}>
                    Ainda não há oportunidades
                  </h3>

                  <p style={styles.emptyText}>
                    Quando alguém publicar uma oportunidade nesta
                    província, ela aparecerá aqui.
                  </p>

                  <Link
                    href={contratarUrl}
                    style={styles.emptyButton}
                  >
                    Publicar uma oportunidade
                  </Link>
                </div>
              )}

            {!loading &&
              !error &&
              opportunities.length > 0 && (
                <div style={styles.list}>
                  {opportunities.map((opportunity) => (
                    <article
                      key={opportunity.id}
                      style={styles.card}
                    >
                      {opportunity.image_url && (
                        <img
                          src={opportunity.image_url}
                          alt={
                            opportunity.title ||
                            'Oportunidade'
                          }
                          style={styles.cardImage}
                        />
                      )}

                      <div style={styles.cardContent}>
                        <div style={styles.tags}>
                          {opportunity.area && (
                            <span style={styles.tag}>
                              {opportunity.area}
                            </span>
                          )}

                          {opportunity.profession && (
                            <span
                              style={styles.tagSecondary}
                            >
                              {opportunity.profession}
                            </span>
                          )}
                        </div>

                        <h3 style={styles.cardTitle}>
                          {opportunity.title}
                        </h3>

                        {opportunity.description && (
                          <p
                            style={
                              styles.cardDescription
                            }
                          >
                            {opportunity.description}
                          </p>
                        )}

                        {opportunity.requirements && (
                          <div style={styles.infoBlock}>
                            <strong>
                              Competências / experiência
                            </strong>

                            <p>
                              {opportunity.requirements}
                            </p>
                          </div>
                        )}

                        {opportunity.work_availability && (
                          <div style={styles.infoBlock}>
                            <strong>
                              Disponibilidade
                            </strong>

                            <p>
                              {opportunity.work_availability}
                            </p>
                          </div>
                        )}

                        {opportunity.salary && (
                          <div style={styles.infoBlock}>
                            <strong>
                              Salário
                            </strong>

                            <p>
                              {opportunity.salary}
                            </p>
                          </div>
                        )}

                        {(opportunity.municipality ||
                          opportunity.neighborhood) && (
                          <div
                            style={
                              styles.locationInfo
                            }
                          >
                            <strong>
                              Localização
                            </strong>

                            <span>
                              {opportunity.municipality ||
                                ''}

                              {opportunity.municipality &&
                              opportunity.neighborhood
                                ? ' · '
                                : ''}

                              {opportunity.neighborhood ||
                                ''}
                            </span>
                          </div>
                        )}

                        <div style={styles.footer}>
                          <span style={styles.date}>
                            Publicado em{' '}
                            {formatDate(
                              opportunity.created_at
                            )}
                          </span>

                          <div style={styles.actions}>
                            {opportunity.whatsapp && (
                              <button
                                type="button"
                                onClick={() =>
                                  openWhatsApp(
                                    opportunity.whatsapp
                                  )
                                }
                                style={
                                  styles.whatsappButton
                                }
                              >
                                WhatsApp
                              </button>
                            )}

                            <Link
                              href={`/oportunidade/${opportunity.id}?country=${encodeURIComponent(
                                country || ''
                              )}&province=${encodeURIComponent(
                                province || ''
                              )}`}
                              style={
                                styles.messageButton
                              }
                            >
                              Ver oportunidade
                            </Link>
                          </div>
                        </div>

                        <div style={styles.expiry}>
                          Disponível até{' '}
                          {formatDate(
                            opportunity.expires_at
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
          </>
        )}
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: COLORS.canvas,
    color: COLORS.ink,
    padding: '20px 16px 70px',
  },

  container: {
    width: '100%',
    maxWidth: '920px',
    margin: '0 auto',
  },

  loading: {
    minHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    color: COLORS.inkSoft,
    fontSize: '14px',
  },

  loadingIcon: {
    width: '50px',
    height: '50px',
    borderRadius: '16px',
    background: COLORS.purpleSoft,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '18px',
    marginBottom: '25px',
  },

  backButton: {
    textDecoration: 'none',
    color: COLORS.inkSoft,
    fontSize: '13px',
    fontWeight: 800,
    paddingTop: '9px',
    whiteSpace: 'nowrap',
  },

  headerContent: {
    flex: 1,
  },

  eyebrow: {
    display: 'block',
    color: COLORS.brand,
    fontSize: '10px',
    letterSpacing: '2px',
    fontWeight: 900,
    marginBottom: '5px',
  },

  title: {
    margin: 0,
    color: COLORS.brandDark,
    fontSize: 'clamp(30px, 6vw, 42px)',
    lineHeight: 1.04,
    letterSpacing: '-0.045em',
    fontWeight: 900,
  },

  locationPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    marginTop: '11px',
    padding: '7px 11px',
    borderRadius: '999px',
    background: COLORS.brandSoft,
    color: COLORS.brandDark,
    fontSize: '11px',
    fontWeight: 800,
  },

  exclusiveCard: {
    position: 'relative',
    overflow: 'hidden',
    textAlign: 'center',
    background: COLORS.surface,
    border: '1px solid #DDD4ED',
    borderRadius: '28px',
    padding: '38px 25px 30px',
    boxShadow: '0 18px 50px rgba(114,82,184,.10)',
  },

  exclusiveGlow: {
    position: 'absolute',
    width: '330px',
    height: '330px',
    borderRadius: '50%',
    background: 'rgba(114,82,184,.10)',
    filter: 'blur(5px)',
    top: '-220px',
    left: '50%',
    transform: 'translateX(-50%)',
  },

  lockCircle: {
    position: 'relative',
    zIndex: 2,
    width: '63px',
    height: '63px',
    borderRadius: '21px',
    background: COLORS.purpleSoft,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },

  exclusiveLabel: {
    position: 'relative',
    zIndex: 2,
    display: 'block',
    color: COLORS.purple,
    fontSize: '9px',
    letterSpacing: '2px',
    fontWeight: 900,
    marginBottom: '8px',
  },

  exclusiveTitle: {
    position: 'relative',
    zIndex: 2,
    margin: 0,
    color: COLORS.brandDark,
    fontSize: 'clamp(24px, 5vw, 34px)',
    lineHeight: 1.12,
    letterSpacing: '-0.035em',
    fontWeight: 900,
  },

  exclusiveText: {
    position: 'relative',
    zIndex: 2,
    maxWidth: '610px',
    margin: '13px auto 22px',
    color: COLORS.inkSoft,
    fontSize: '13.5px',
    lineHeight: 1.7,
  },

  planPreview: {
    position: 'relative',
    zIndex: 2,
    maxWidth: '570px',
    margin: '0 auto 16px',
    padding: '14px',
    background: '#FAF8FD',
    border: '1px solid #E1D9EF',
    borderRadius: '17px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textAlign: 'left',
  },

  planIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '14px',
    background: COLORS.goldSoft,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '21px',
    flexShrink: 0,
  },

  planInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },

  planSmall: {
    color: COLORS.purple,
    fontSize: '8px',
    letterSpacing: '1.2px',
    fontWeight: 900,
  },

  planArrow: {
    width: '35px',
    height: '35px',
    borderRadius: '11px',
    background: COLORS.purpleSoft,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  unlockButton: {
    position: 'relative',
    zIndex: 2,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '9px',
    border: 0,
    borderRadius: '14px',
    background: COLORS.brand,
    color: '#fff',
    padding: '14px 21px',
    fontSize: '13px',
    fontWeight: 900,
    cursor: 'pointer',
    boxShadow: '0 9px 24px rgba(15,110,92,.18)',
  },

  loginNote: {
    position: 'relative',
    zIndex: 2,
    margin: '11px 0 0',
    color: COLORS.inkFaint,
    fontSize: '10.5px',
  },

  bottomMessage: {
    marginTop: '16px',
    background: COLORS.brandSoft,
    border: '1px solid #D3E7E2',
    borderRadius: '19px',
    padding: '17px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },

  bottomIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '13px',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  accessHeader: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.line}`,
    borderRadius: '20px',
    padding: '21px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '17px',
  },

  sectionEyebrow: {
    display: 'block',
    color: COLORS.purple,
    fontSize: '9px',
    letterSpacing: '1.6px',
    fontWeight: 900,
    marginBottom: '5px',
  },

  accessTitle: {
    margin: 0,
    color: COLORS.brandDark,
    fontSize: '22px',
    fontWeight: 900,
  },

  accessDescription: {
    margin: '5px 0 0',
    color: COLORS.inkSoft,
    fontSize: '13px',
  },

  publishLink: {
    textDecoration: 'none',
    background: COLORS.brand,
    color: '#fff',
    padding: '11px 15px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 900,
    whiteSpace: 'nowrap',
  },

  list: {
    display: 'grid',
    gap: '15px',
  },

  card: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.line}`,
    borderRadius: '21px',
    overflow: 'hidden',
    boxShadow: '0 9px 30px rgba(23,33,31,.045)',
  },

  cardImage: {
    width: '100%',
    maxHeight: '430px',
    objectFit: 'cover',
    display: 'block',
    background: COLORS.canvas,
  },

  cardContent: {
    padding: '21px',
  },

  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '7px',
    marginBottom: '10px',
  },

  tag: {
    background: COLORS.purpleSoft,
    color: COLORS.purpleDark,
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '10px',
    fontWeight: 800,
  },

  tagSecondary: {
    background: COLORS.brandSoft,
    color: COLORS.brandDark,
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '10px',
    fontWeight: 800,
  },

  cardTitle: {
    margin: 0,
    color: COLORS.ink,
    fontSize: '21px',
    lineHeight: 1.25,
    fontWeight: 900,
  },

  cardDescription: {
    margin: '11px 0 0',
    color: COLORS.inkSoft,
    lineHeight: 1.65,
    fontSize: '14px',
    whiteSpace: 'pre-wrap',
  },

  infoBlock: {
    marginTop: '15px',
    paddingTop: '13px',
    borderTop: `1px solid ${COLORS.line}`,
    fontSize: '13px',
  },

  locationInfo: {
    marginTop: '15px',
    paddingTop: '13px',
    borderTop: `1px solid ${COLORS.line}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    fontSize: '13px',
  },

  footer: {
    marginTop: '17px',
    paddingTop: '15px',
    borderTop: `1px solid ${COLORS.line}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },

  date: {
    color: COLORS.inkFaint,
    fontSize: '11px',
  },

  actions: {
    display: 'flex',
    gap: '7px',
    flexWrap: 'wrap',
  },

  whatsappButton: {
    border: 0,
    background: '#E9F7ED',
    color: '#17652B',
    borderRadius: '10px',
    padding: '9px 12px',
    fontSize: '12px',
    fontWeight: 900,
    cursor: 'pointer',
  },

  messageButton: {
    textDecoration: 'none',
    background: COLORS.purple,
    color: '#fff',
    borderRadius: '10px',
    padding: '9px 12px',
    fontSize: '12px',
    fontWeight: 900,
  },

  expiry: {
    marginTop: '10px',
    color: COLORS.inkFaint,
    fontSize: '10px',
  },

  emptyBox: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.line}`,
    borderRadius: '21px',
    padding: '45px 22px',
    textAlign: 'center',
  },

  loadingSmall: {
    marginBottom: '8px',
  },

  emptyIcon: {
    width: '54px',
    height: '54px',
    borderRadius: '17px',
    background: COLORS.purpleSoft,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
  },

  emptyTitle: {
    margin: 0,
    color: COLORS.brandDark,
    fontSize: '20px',
    fontWeight: 900,
  },

  emptyText: {
    maxWidth: '470px',
    margin: '8px auto 19px',
    color: COLORS.inkSoft,
    lineHeight: 1.6,
    fontSize: '13px',
  },

  emptyButton: {
    display: 'inline-block',
    textDecoration: 'none',
    background: COLORS.brand,
    color: '#fff',
    padding: '11px 16px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 900,
  },

  error: {
    background: COLORS.dangerSoft,
    border: '1px solid #F1CACA',
    color: COLORS.danger,
    borderRadius: '14px',
    padding: '14px',
    fontSize: '13px',
  },
};
