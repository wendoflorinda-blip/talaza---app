 import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Admin() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    setLoading(true);
    setMessage('');

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
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
      setMessage(adminError.message);
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

    setLoading(false);
  }

  async function loadBusinesses() {
    const { data, error } = await supabase
      .from('businesses')
      .select(`
        id,
        name,
        description,
        municipality,
        neighborhood,
        phone,
        whatsapp,
        email,
        logo_url,
        created_at,
        approval_status,
        is_active,
        countries (
          name
        ),
        provinces (
          name
        ),
        categories (
          name
        ),
        subcategories (
          name
        )
      `)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setMessage(error.message);
      return;
    }

    setBusinesses(data || []);
  }

  async function updateBusiness(id, status) {
    const { error } = await supabase
      .from('businesses')
      .update({
        approval_status: status,
        is_active: status === 'approved',
      })
      .eq('id', id);

    if (error) {
      alert('Erro: ' + error.message);
      return;
    }

    await loadBusinesses();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (loading) {
    return (
      <main style={styles.center}>
        <p>A verificar acesso...</p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main style={styles.center}>
        <div style={styles.restricted}>
          <div style={styles.logo}>T</div>

          <h1>Acesso restrito</h1>

          <p>
            Esta área é exclusiva para administradores da Talaza.
          </p>

          {message && (
            <p style={styles.error}>
              {message}
            </p>
          )}

          <button
            style={styles.button}
            onClick={() => router.push('/')}
          >
            Voltar à Talaza
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>

      <header style={styles.header}>
        <div>
          <div style={styles.brand}>TALAZA</div>
          <div style={styles.subtitle}>
            Painel de administração
          </div>
        </div>

        <button
          onClick={logout}
          style={styles.logout}
        >
          Terminar sessão
        </button>
      </header>

      <section style={styles.content}>

        <div style={styles.titleRow}>
          <div>
            <h1 style={styles.title}>
              Administração
            </h1>

            <p style={styles.description}>
              Gerencie os perfis de negócio enviados para validação.
            </p>
          </div>

          <div style={styles.counter}>
            {businesses.length} pendente
            {businesses.length !== 1 ? 's' : ''}
          </div>
        </div>

        {message && (
          <div style={styles.errorBox}>
            {message}
          </div>
        )}

        {businesses.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>✓</div>

            <h2>Nenhum perfil pendente</h2>

            <p>
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
                      {business.name?.charAt(0)?.toUpperCase() || 'T'}
                    </div>
                  )}

                  <div style={{ flex: 1 }}>
                    <h2 style={styles.businessName}>
                      {business.name}
                    </h2>

                    <div style={styles.meta}>
                      {business.categories?.name || 'Sem categoria'}
                      {' · '}
                      {business.subcategories?.name || 'Sem subcategoria'}
                    </div>
                  </div>

                  <span style={styles.pending}>
                    Pendente
                  </span>

                </div>

                <div style={styles.details}>

                  <p>
                    <strong>Localização:</strong>{' '}
                    {business.countries?.name || '-'}
                    {' · '}
                    {business.provinces?.name || '-'}
                  </p>

                  <p>
                    <strong>Município:</strong>{' '}
                    {business.municipality || '-'}
                  </p>

                  <p>
                    <strong>Bairro:</strong>{' '}
                    {business.neighborhood || '-'}
                  </p>

                  {business.description && (
                    <p>
                      <strong>Descrição:</strong>{' '}
                      {business.description}
                    </p>
                  )}

                  {business.phone && (
                    <p>
                      <strong>Telefone:</strong>{' '}
                      {business.phone}
                    </p>
                  )}

                  {business.whatsapp && (
                    <p>
                      <strong>WhatsApp:</strong>{' '}
                      {business.whatsapp}
                    </p>
                  )}

                  {business.email && (
                    <p>
                      <strong>Email:</strong>{' '}
                      {business.email}
                    </p>
                  )}

                </div>

                <div style={styles.actions}>

                  <button
                    style={styles.reject}
                    onClick={() =>
                      updateBusiness(
                        business.id,
                        'rejected'
                      )
                    }
                  >
                    Recusar
                  </button>

                  <button
                    style={styles.approve}
                    onClick={() =>
                      updateBusiness(
                        business.id,
                        'approved'
                      )
                    }
                  >
                    Aprovar
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

const styles = {
  page: {
    minHeight: '100vh',
    background: '#F5F7F6',
    color: '#12332D',
  },

  center: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F5F7F6',
    padding: 24,
  },

  restricted: {
    width: '100%',
    maxWidth: 420,
    background: '#fff',
    padding: 32,
    borderRadius: 18,
    textAlign: 'center',
    boxShadow: '0 8px 30px rgba(0,0,0,.08)',
  },

  logo: {
    width: 58,
    height: 58,
    margin: '0 auto 18px',
    borderRadius: 16,
    background: '#075B4E',
    color: '#E6A900',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 800,
  },

  header: {
    background: '#075B4E',
    color: '#fff',
    padding: '18px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },

  brand: {
    fontWeight: 800,
    letterSpacing: 2,
    color: '#E6A900',
  },

  subtitle: {
    fontSize: 12,
    opacity: .8,
    marginTop: 4,
  },

  content: {
    width: '100%',
    maxWidth: 1100,
    margin: '0 auto',
    padding: '32px 20px 60px',
  },

  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
    marginBottom: 26,
    flexWrap: 'wrap',
  },

  title: {
    margin: 0,
    fontSize: 28,
  },

  description: {
    marginTop: 8,
    color: '#65736F',
  },

  counter: {
    background: '#FFF3C7',
    color: '#8A6500',
    padding: '9px 14px',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 13,
  },

  list: {
    display: 'grid',
    gap: 18,
  },

  card: {
    background: '#fff',
    borderRadius: 18,
    padding: 20,
    boxShadow: '0 5px 20px rgba(0,0,0,.06)',
    border: '1px solid #E7ECEA',
  },

  cardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },

  logoImage: {
    width: 58,
    height: 58,
    borderRadius: 14,
    objectFit: 'cover',
  },

  logoPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 14,
    background: '#E4F0ED',
    color: '#075B4E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: 22,
  },

  businessName: {
    margin: 0,
    fontSize: 19,
  },

  meta: {
    marginTop: 5,
    color: '#687772',
    fontSize: 13,
  },

  pending: {
    background: '#FFF3C7',
    color: '#8A6500',
    padding: '6px 9px',
    borderRadius: 7,
    fontSize: 11,
    fontWeight: 700,
  },

  details: {
    marginTop: 18,
    paddingTop: 16,
    borderTop: '1px solid #EDF0EF',
    color: '#52635E',
    fontSize: 14,
    lineHeight: 1.55,
  },

  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },

  approve: {
    border: 0,
    background: '#075B4E',
    color: '#fff',
    padding: '10px 18px',
    borderRadius: 9,
    fontWeight: 700,
    cursor: 'pointer',
  },

  reject: {
    border: 0,
    background: '#F0F2F1',
    color: '#8B3027',
    padding: '10px 18px',
    borderRadius: 9,
    fontWeight: 700,
    cursor: 'pointer',
  },

  logout: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,.35)',
    color: '#fff',
    padding: '9px 14px',
    borderRadius: 8,
    cursor: 'pointer',
  },

  button: {
    marginTop: 18,
    border: 0,
    background: '#075B4E',
    color: '#fff',
    padding: '11px 18px',
    borderRadius: 9,
    fontWeight: 700,
    cursor: 'pointer',
  },

  empty: {
    background: '#fff',
    borderRadius: 18,
    padding: 50,
    textAlign: 'center',
    boxShadow: '0 5px 20px rgba(0,0,0,.05)',
  },

  emptyIcon: {
    width: 50,
    height: 50,
    borderRadius: '50%',
    background: '#E4F0ED',
    color: '#075B4E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 15px',
    fontSize: 22,
    fontWeight: 800,
  },

  error: {
    color: '#A33A30',
    fontSize: 13,
  },

  errorBox: {
    background: '#FFF0EE',
    color: '#9C3027',
    padding: 14,
    borderRadius: 10,
    marginBottom: 18,
  },
};       
