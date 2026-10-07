import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Oportunidades() {
  const router = useRouter();

  const { country, province } = router.query;

  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');

  const [opportunities, setOpportunities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    initialize();
  }, [router.isReady, country, province]);

  async function initialize() {
    setLoading(true);
    setCheckingAccess(true);
    setError('');

    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      setUser(currentUser || null);

      await loadLocationNames();

      if (!currentUser) {
        setHasAccess(false);
        setOpportunities([]);
        return;
      }

      const access = await checkOpportunityAccess(currentUser.id);

      setHasAccess(access);

      if (!access) {
        setOpportunities([]);
        return;
      }

      await loadOpportunities();
    } catch (err) {
      console.error('Erro ao inicializar oportunidades:', err);
      setError('Não foi possível carregar as oportunidades.');
      setOpportunities([]);
    } finally {
      setCheckingAccess(false);
      setLoading(false);
    }
  }

  async function loadLocationNames() {
    try {
      if (country) {
        const { data: countryData, error: countryError } =
          await supabase
            .from('countries')
            .select('name')
            .eq('id', country)
            .single();

        if (countryError) {
          console.error('Erro ao carregar país:', countryError);
        }

        if (countryData) {
          setCountryName(countryData.name);
        }
      }

      if (province) {
        const { data: provinceData, error: provinceError } =
          await supabase
            .from('provinces')
            .select('name')
            .eq('id', province)
            .single();

        if (provinceError) {
          console.error('Erro ao carregar província:', provinceError);
        }

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
      const now = new Date().toISOString();

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
          province_id,
          plans (
            id,
            name,
            plan_type,
            area,
            is_active
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .gt('expires_at', now)
        .order('expires_at', { ascending: false });

      if (subscriptionError) {
        console.error(
          'Erro ao verificar assinatura:',
          subscriptionError
        );

        return false;
      }

      if (!data || data.length === 0) {
        return false;
      }

      const validSubscription = data.find((subscription) => {
        const plan = subscription.plans;

        if (!plan) {
          return false;
        }

        const isOpportunityPlan =
          plan.plan_type === 'opportunities' ||
          plan.area === 'Oportunidades';

        if (!isOpportunityPlan) {
          return false;
        }

        if (plan.is_active === false) {
          return false;
        }

        /*
         * Se a assinatura tiver país ou província definidos,
         * ela deve respeitar a localização escolhida.
         *
         * Se estiverem vazios, a assinatura continua válida.
         */
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
      });

      return Boolean(validSubscription);
    } catch (err) {
      console.error('Erro inesperado ao verificar acesso:', err);
      return false;
    }
  }

  async function loadOpportunities() {
    try {
      if (!country || !province) {
        setOpportunities([]);
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
      console.error('Erro ao carregar oportunidades:', err);

      setError(
        'Não foi possível carregar as oportunidades.'
      );

      setOpportunities([]);
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

  function goToPlans() {
    const query = new URLSearchParams();

    if (country) {
      query.set('country', country);
    }

    if (province) {
      query.set('province', province);
    }

    query.set('area', 'Oportunidades');

    router.push(`/planos?${query.toString()}`);
  }

  function goToLogin() {
    const query = new URLSearchParams();

    if (country) {
      query.set('country', country);
    }

    if (province) {
      query.set('province', province);
    }

    router.push(`/login?${query.toString()}`);
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <Link
            href={`/explore?country=${encodeURIComponent(
              country || ''
            )}&province=${encodeURIComponent(
              province || ''
            )}`}
            style={styles.backButton}
          >
            ← Voltar
          </Link>

          <div>
            <div style={styles.eyebrow}>TALAZA</div>

            <h1 style={styles.title}>
              Oportunidades
            </h1>

            {(countryName || provinceName) && (
              <p style={styles.location}>
                {countryName}
                {countryName && provinceName ? ' · ' : ''}
                {provinceName}
              </p>
            )}
          </div>
        </header>

        {checkingAccess && (
          <div style={styles.emptyBox}>
            <div style={styles.loadingCircle}>
              …
            </div>

            <h3 style={styles.emptyTitle}>
              A verificar o seu acesso
            </h3>

            <p style={styles.emptyText}>
              Aguarde enquanto verificamos o seu acesso às
              oportunidades.
            </p>
          </div>
        )}

        {!checkingAccess && !user && (
          <div style={styles.accessBox}>
            <div style={styles.accessIcon}>🔐</div>

            <div style={styles.accessBadge}>
              ACESSO NECESSÁRIO
            </div>

            <h2 style={styles.accessTitle}>
              Descubra novas oportunidades
            </h2>

            <p style={styles.accessText}>
              Para acompanhar as oportunidades publicadas
              na sua província, entre na sua conta.
            </p>

            <button
              type="button"
              onClick={goToLogin}
              style={styles.primaryButton}
            >
              Entrar na minha conta
            </button>
          </div>
        )}

        {!checkingAccess && user && !hasAccess && (
          <div style={styles.accessBox}>
            <div style={styles.accessIcon}>✦</div>

            <div style={styles.accessBadge}>
              TALAZA OPORTUNIDADES
            </div>

            <h2 style={styles.accessTitle}>
              A sua próxima oportunidade pode estar aqui
            </h2>

            <p style={styles.accessText}>
              Novas vagas podem ser publicadas todos os dias.
              Desbloqueie o acesso às oportunidades da sua
              província e acompanhe as novas oportunidades
              publicadas no Talaza.
            </p>

            <button
              type="button"
              onClick={goToPlans}
              style={styles.primaryButton}
            >
              Ver planos de acesso
            </button>

            <p style={styles.smallNote}>
              O acesso é válido durante o período indicado
              no plano escolhido.
            </p>
          </div>
        )}

        {!checkingAccess &&
          hasAccess &&
          loading && (
            <div style={styles.emptyBox}>
              <p>Carregando oportunidades...</p>
            </div>
          )}

        {!checkingAccess &&
          hasAccess &&
          !loading &&
          error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

        {!checkingAccess &&
          hasAccess &&
          !loading &&
          !error &&
          opportunities.length === 0 && (
            <div style={styles.emptyBox}>
              <div style={styles.emptyIcon}>
                ⌁
              </div>

              <h3 style={styles.emptyTitle}>
                Ainda não há oportunidades
              </h3>

              <p style={styles.emptyText}>
                Quando alguém publicar uma oportunidade
                nesta província, ela aparecerá aqui.
              </p>

              <Link
                href={`/contratar?country=${encodeURIComponent(
                  country || ''
                )}&province=${encodeURIComponent(
                  province || ''
                )}`}
                style={styles.emptyButton}
              >
                Publicar uma oportunidade
              </Link>
            </div>
          )}

        {!checkingAccess &&
          hasAccess &&
          !loading &&
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
                          style={
                            styles.tagSecondary
                          }
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
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f6f7f9',
    color: '#151515',
    padding: '24px 16px 60px',
  },

  container: {
    width: '100%',
    maxWidth: '900px',
    margin: '0 auto',
  },

  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '30px',
  },

  backButton: {
    textDecoration: 'none',
    color: '#111',
    fontSize: '14px',
    fontWeight: '600',
    paddingTop: '10px',
    whiteSpace: 'nowrap',
  },

  eyebrow: {
    fontSize: '11px',
    letterSpacing: '2px',
    fontWeight: '800',
    color: '#777',
    marginBottom: '5px',
  },

  title: {
    margin: 0,
    fontSize: '34px',
    lineHeight: 1.1,
    fontWeight: '800',
  },

  location: {
    margin: '8px 0 0',
    color: '#777',
    fontSize: '14px',
  },

  accessBox: {
    background: '#0A2E27',
    color: '#fff',
    borderRadius: '24px',
    padding: '42px 24px',
    textAlign: 'center',
    boxShadow:
      '0 14px 40px rgba(10,46,39,0.16)',
    marginBottom: '18px',
  },

  accessIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },

  accessBadge: {
    display: 'inline-block',
    background: '#C9932E',
    color: '#0A2E27',
    borderRadius: '999px',
    padding: '6px 11px',
    fontSize: '10px',
    fontWeight: '800',
    letterSpacing: '0.7px',
    marginBottom: '15px',
  },

  accessTitle: {
    margin: '0 auto',
    maxWidth: '560px',
    fontSize: '27px',
    lineHeight: 1.2,
    fontWeight: '800',
  },

  accessText: {
    maxWidth: '560px',
    margin: '14px auto 22px',
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 1.65,
    fontSize: '14px',
  },

  primaryButton: {
    border: 0,
    background: '#C9932E',
    color: '#0A2E27',
    borderRadius: '12px',
    padding: '13px 20px',
    fontSize: '14px',
    fontWeight: '800',
    cursor: 'pointer',
  },

  smallNote: {
    margin: '15px 0 0',
    color: 'rgba(255,255,255,0.55)',
    fontSize: '11px',
  },

  list: {
    display: 'grid',
    gap: '16px',
  },

  card: {
    background: '#fff',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow:
      '0 8px 30px rgba(0,0,0,0.05)',
  },

  cardImage: {
    width: '100%',
    maxHeight: '430px',
    objectFit: 'cover',
    display: 'block',
    background: '#f1f1f1',
  },

  cardContent: {
    padding: '22px',
  },

  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '7px',
    marginBottom: '11px',
  },

  tag: {
    background: '#111',
    color: '#fff',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '11px',
    fontWeight: '700',
  },

  tagSecondary: {
    background: '#f0f0f0',
    color: '#444',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '11px',
    fontWeight: '700',
  },

  cardTitle: {
    margin: 0,
    fontSize: '22px',
    lineHeight: 1.25,
    fontWeight: '800',
  },

  cardDescription: {
    margin: '12px 0 0',
    color: '#555',
    lineHeight: 1.65,
    fontSize: '15px',
    whiteSpace: 'pre-wrap',
  },

  infoBlock: {
    marginTop: '16px',
    paddingTop: '14px',
    borderTop: '1px solid #eee',
    fontSize: '14px',
  },

  infoBlockP: {
    margin: '5px 0 0',
    color: '#555',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  },

  locationInfo: {
    marginTop: '16px',
    paddingTop: '14px',
    borderTop: '1px solid #eee',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    fontSize: '14px',
  },

  footer: {
    marginTop: '18px',
    paddingTop: '16px',
    borderTop: '1px solid #eee',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '14px',
    flexWrap: 'wrap',
  },

  date: {
    color: '#888',
    fontSize: '12px',
  },

  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },

  whatsappButton: {
    border: 0,
    background: '#e9f7ed',
    color: '#17652b',
    borderRadius: '10px',
    padding: '10px 13px',
    fontSize: '13px',
    fontWeight: '800',
    cursor: 'pointer',
  },

  messageButton: {
    textDecoration: 'none',
    background: '#111',
    color: '#fff',
    borderRadius: '10px',
    padding: '10px 13px',
    fontSize: '13px',
    fontWeight: '800',
  },

  expiry: {
    marginTop: '12px',
    color: '#999',
    fontSize: '11px',
  },

  emptyBox: {
    background: '#fff',
    borderRadius: '20px',
    padding: '50px 24px',
    textAlign: 'center',
    boxShadow:
      '0 8px 30px rgba(0,0,0,0.04)',
  },

  loadingCircle: {
    fontSize: '28px',
    marginBottom: '8px',
    color: '#777',
  },

  emptyIcon: {
    fontSize: '35px',
    color: '#aaa',
    marginBottom: '10px',
  },

  emptyTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '800',
  },

  emptyText: {
    maxWidth: '480px',
    margin: '9px auto 20px',
    color: '#777',
    lineHeight: 1.6,
    fontSize: '14px',
  },

  emptyButton: {
    display: 'inline-block',
    textDecoration: 'none',
    background: '#111',
    color: '#fff',
    padding: '12px 18px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '800',
  },

  error: {
    background: '#fff0f0',
    border: '1px solid #f1caca',
    color: '#a12626',
    borderRadius: '14px',
    padding: '15px',
  },
};
                  
  
    
        
    
