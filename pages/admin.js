import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Admin() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [processing, setProcessing] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    checkAdmin();
  }, [router.isReady]);

  async function checkAdmin() {
    setLoading(true);
    setError('');

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.replace('/login');
      return;
    }

    const { data: admin, error: adminError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle();

    if (adminError) {
      console.error('Erro ao verificar administrador:', adminError);
      setError('Não foi possível verificar o acesso administrativo.');
      setLoading(false);
      return;
    }

    if (!admin) {
      setAuthorized(false);
      setLoading(false);
      return;
    }

    setAuthorized(true);
    await loadBusinesses();
  }

  async function loadBusinesses() {
    setError('');

    const { data, error } = await supabase
      .from('businesses')
      .select(`
        id,
        created_at,
        name,
        description,
        municipality,
        neighborhood,
        address,
        phone,
        whatsapp,
        email,
        logo_url,
        opening_hours,
        approval_status,
        is_active,
        country_id,
        province_id,
        category_id,
        subcategory_id,
        countries (
          id,
          name
        ),
        provinces (
          id,
          name
        ),
        categories (
          id,
          name
        ),
        subcategories (
          id,
          name
        )
      `)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar negócios:', error);
      setError('Não foi possível carregar os negócios pendentes.');
      setLoading(false);
      return;
    }

    setBusinesses(data || []);
    setLoading(false);
  }

  async function updateBusinessStatus(id, status) {
    setProcessing(id);
    setMessage('');
    setError('');

    const { error } = await supabase
      .from('businesses')
      .update({
        approval_status: status,
        is_active: status === 'approved',
      })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar negócio:', error);
      setError('Não foi possível atualizar o perfil.');
      setProcessing(null);
      return;
    }

    if (status === 'approved') {
      setMessage('Perfil aprovado com sucesso.');
    } else {
      setMessage('Perfil recusado.');
    }

    setBusinesses((current) =>
      current.filter((business) => business.id !== id)
    );

    setProcessing(null);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingBox}>
          <div style={styles.logo}>Talaza</div>
          <p>A carregar painel administrativo...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div style={styles.loading}>
        <div style={styles.accessBox}>
          <div style={styles.logo}>Talaza</div>

          <h1 style={styles.accessTitle}>
            Acesso restrito
          </h1>

          <p style={styles.accessText}>
            Esta área é exclusiva para administradores.
          </p>

          <button
            style={styles.primaryButton}
            onClick={() => router.push('/')}
          >
            Voltar à página inicial
          </button>
        </div>
      </div>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.logo}>TALAZA</div>
          <div style={styles.subtitle}>
            Painel Administrativo
          </div>
        </div>

        <button
          style={styles.logoutButton}
          onClick={logout}
        >
          Sair
        </button>
      </header>

      <section style={styles.content}>
        <div style={styles.titleRow}>
          <div>
            <h1 style={styles.title}>
              Validação de negócios
            </h1>

            <p style={styles.description}>
              Analise os perfis antes de serem publicados na Talaza.
            </p>
          </div>

          <div style={styles.counter}>
            <strong>{businesses.length}</strong>
            <span>Pendentes</span>
          </div>
        </div>

        {message && (
          <div style={styles.success}>
            {message}
          </div>
        )}

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {businesses.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>✓</div>

            <h2 style={styles.emptyTitle}>
              Tudo em dia
            </h2>

            <p style={styles.emptyText}>
              Não existem negócios aguardando validação neste momento.
            </p>
          </div>
        ) : (
          <div style={styles.list}>
            {businesses.map((business) => (
              <article
                key={business.id}
                style={styles.card}
              >
                <div style={styles.cardTop}>
                  {business.logo_url ? (
                    <img
                      src={business.logo_url}
                      alt=""
                      style={styles.logoImage}
                    />
                  ) : (
                    <div style={styles.logoPlaceholder}>
                      {business.name
                        ?.charAt(0)
                        ?.toUpperCase() || 'T'}
                    </div>
                  )}

                  <div style={styles.businessTitle}>
                    <h2 style={styles.businessName}>
                      {business.name}
                    </h2>

                    <span style={styles.pending}>
                      Em validação
                    </span>
                  </div>
                </div>

                <div style={styles.info}>
                  {business.categories?.name && (
                    <Info
                      label="Categoria"
                      value={business.categories.name}
                    />
                  )}

                  {business.subcategories?.name && (
                    <Info
                      label="Subcategoria"
                      value={business.subcategories.name}
                    />
                  )}

                  {business.countries?.name && (
                    <Info
                      label="País"
                      value={business.countries.name}
                    />
                  )}

                  {business.provinces?.name && (
                    <Info
                      label="Província"
                      value={business.provinces.name}
                    />
                  )}

                  {business.municipality && (
                    <Info
                      label="Município"
                      value={business.municipality}
                    />
                  )}

                  {business.neighborhood && (
                    <Info
                      label="Bairro"
                      value={business.neighborhood}
                    />
                  )}

                  {business.address && (
                    <Info
                      label="Morada"
                      value={business.address}
                    />
                  )}

                  {business.phone && (
                    <Info
                      label="Telefone"
                      value={business.phone}
                    />
                  )}

                  {business.whatsapp && (
                    <Info
                      label="WhatsApp"
                      value={business.whatsapp}
                    />
                  )}

                  {business.email && (
                    <Info
                      label="Email"
                      value={business.email}
                    />
                  )}

                  {business.opening_hours && (
                    <Info
                      label="Horário"
                      value={business.opening_hours}
                    />
                  )}
                </div>

                {business.description && (
                  <div style={styles.descriptionBox}>
                    <strong>Descrição</strong>
                    <p>{business.description}</p>
                  </div>
                )}

                <div style={styles.actions}>
                  <button
                    style={styles.rejectButton}
                    disabled={processing === business.id}
                    onClick={() =>
                      updateBusinessStatus(
                        business.id,
                        'rejected'
                      )
                    }
                  >
                    Recusar
                  </button>

                  <button
                    style={styles.approveButton}
                    disabled={processing === business.id}
                    onClick={() =>
                      updateBusinessStatus(
                        business.id,
                        'approved'
                      )
                    }
                  >
                    {processing === business.id
                      ? 'A processar...'
                      : 'Aprovar'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Info({ label, value }) {
  return (
    <div style={styles.infoItem}>
      <span style={styles.infoLabel}>
        {label}
      </span>

      <strong style={styles.infoValue}>
        {value}
      </strong>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#F5F7F6',
    color: '#17332E',
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  loading: {
    minHeight: '100vh',
    background: '#F5F7F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    textAlign: 'center',
  },

  loadingBox: {
    background: '#FFFFFF',
    padding: 32,
    borderRadius: 20,
    boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
  },

  accessBox: {
    background: '#FFFFFF',
    padding: 32,
    borderRadius: 22,
    maxWidth: 420,
    width: '100%',
    boxShadow: '0 10px 30px rgba(0,0,0,0.07)',
    textAlign: 'center',
  },

  logo: {
    fontSize: 25,
    fontWeight: 900,
    color: '#E6A900',
    letterSpacing: '1px',
  },

  subtitle: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.85,
    marginTop: 3,
  },

  accessTitle: {
    color: '#17332E',
    fontSize: 28,
    margin: '25px 0 8px',
  },

  accessText: {
    color: '#60736E',
    lineHeight: 1.5,
    margin: 0,
  },

  header: {
    background: '#075B4E',
    color: '#FFFFFF',
    padding: '18px 22px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },

  logoutButton: {
    background: 'rgba(255,255,255,0.12)',
    color: '#FFFFFF',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 10,
    padding: '9px 14px',
    cursor: 'pointer',
    fontWeight: 700,
  },

  content: {
    maxWidth: 1000,
    margin: '0 auto',
    padding: '28px 18px 50px',
  },

  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
    marginBottom: 24,
  },

  title: {
    margin: 0,
    fontSize: 28,
    color: '#06483E',
  },

  description: {
    margin: '7px 0 0',
    color: '#60736E',
    lineHeight: 1.5,
  },

  counter: {
    minWidth: 88,
    background: '#FFFFFF',
    borderRadius: 14,
    padding: '12px 15px',
    textAlign: 'center',
    boxShadow: '0 5px 20px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },

  success: {
    background: '#E8F6EF',
    color: '#17633D',
    padding: 13,
    borderRadius: 10,
    marginBottom: 18,
  },

  error: {
    background: '#FDECEC',
    color: '#9B2C2C',
    padding: 13,
    borderRadius: 10,
    marginBottom: 18,
  },

  list: {
    display: 'grid',
    gap: 18,
  },

  card: {
    background: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    boxShadow: '0 7px 25px rgba(0,0,0,0.06)',
  },

  cardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },

  logoImage: {
    width: 62,
    height: 62,
    borderRadius: 14,
    objectFit: 'cover',
    border: '1px solid #E5EAE8',
  },

  logoPlaceholder: {
    width: 62,
    height: 62,
    borderRadius: 14,
    background: '#075B4E',
    color: '#E6A900',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: 800,
    flexShrink: 0,
  },

  businessTitle: {
    minWidth: 0,
  },

  businessName: {
    margin: 0,
    fontSize: 22,
    color: '#17332E',
  },

  pending: {
    display: 'inline-block',
    marginTop: 5,
    background: '#FFF5D6',
    color: '#8A6500',
    padding: '4px 8px',
    borderRadius: 7,
    fontSize: 11,
    fontWeight: 700,
  },

  info: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(190px, 1fr))',
    gap: 10,
  },

  infoItem: {
    background: '#F5F7F6',
    borderRadius: 10,
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },

  infoLabel: {
    fontSize: 11,
    color: '#71817D',
  },

  infoValue: {
    fontSize: 14,
    color: '#17332E',
    wordBreak: 'break-word',
  },

  descriptionBox: {
    marginTop: 15,
    background: '#F8FAF9',
    borderRadius: 12,
    padding: 13,
    lineHeight: 1.5,
  },

  descriptionBoxP: {
    marginBottom: 0,
  },

  actions: {
    display: 'flex',
    gap: 10,
    marginTop: 18,
  },

  approveButton: {
    flex: 1,
    border: 0,
    borderRadius: 11,
    padding: '13px 16px',
    background: '#075B4E',
    color: '#FFFFFF',
    fontWeight: 700,
    cursor: 'pointer',
  },

  rejectButton: {
    flex: 1,
    border: 0,
    borderRadius: 11,
    padding: '13px 16px',
    background: '#F1E8E8',
    color: '#8A3030',
    fontWeight: 700,
    cursor: 'pointer',
  },

  primaryButton: {
    marginTop: 20,
    width: '100%',
    border: 0,
    borderRadius: 11,
    padding: 13,
    background: '#075B4E',
    color: '#FFFFFF',
    fontWeight: 700,
    cursor: 'pointer',
  },

  empty: {
    background: '#FFFFFF',
    borderRadius: 18,
    padding: '50px 25px',
    textAlign: 'center',
    boxShadow: '0 7px 25px rgba(0,0,0,0.05)',
  },

  emptyIcon: {
    width: 52,
    height: 52,
    margin: '0 auto 15px',
    borderRadius: '50%',
    background: '#E8F6EF',
    color: '#17633D',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 25,
    fontWeight: 800,
  },

  emptyTitle: {
    margin: '0 0 8px',
  },

  emptyText: {
    color: '#60736E',
    margin: 0,
    lineHeight: 1.5,
  },
};        
