import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Seller() {
  const router = useRouter();

  const { country, province } = router.query;

  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    loadBusiness();
  }, [router.isReady, country, province]);

  async function loadBusiness() {
    setLoading(true);
    setError('');

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.replace('/login');
      return;
    }

    setUser(session.user);

    const { data, error: businessError } =
      await supabase
        .from('businesses')
        .select(`
          id,
          name,
          description,
          municipality,
          neighborhood,
          address,
          phone,
          whatsapp,
          email,
          opening_hours,
          country_id,
          province_id,
          category_id,
          subcategory_id,
          logo_url,
          is_active,
          approval_status
        `)
        .eq('owner_id', session.user.id)
        .eq('country_id', country)
        .eq('province_id', province)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (businessError) {
      console.error(businessError);
      setError('Não foi possível carregar o seu negócio.');
      setLoading(false);
      return;
    }

    if (!data) {
      setError(
        'Não encontramos um negócio associado à sua conta nesta localização.'
      );
      setLoading(false);
      return;
    }

    setBusiness(data);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#F5F7F6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#075B4E',
          fontWeight: 700
        }}
      >
        A preparar o seu painel…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#F5F7F6',
          padding: 24
        }}
      >
        <div
          style={{
            maxWidth: 600,
            margin: '80px auto',
            background: '#FFFFFF',
            borderRadius: 24,
            padding: 30,
            textAlign: 'center'
          }}
        >
          <h2 style={{ color: '#075B4E' }}>
            Não foi possível abrir o negócio
          </h2>

          <p style={{ color: '#66736F', lineHeight: 1.6 }}>
            {error}
          </p>

          <Link
            href="/"
            style={{
              display: 'inline-block',
              marginTop: 15,
              padding: '13px 20px',
              background: '#075B4E',
              color: '#FFFFFF',
              borderRadius: 12,
              textDecoration: 'none',
              fontWeight: 800
            }}
          >
            Voltar à Talaza
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F7F6',
        paddingBottom: 50
      }}
    >
      <header
        style={{
          background: '#075B4E',
          color: '#FFFFFF',
          padding: '16px 20px',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}
      >
        <div
          style={{
            maxWidth: 1000,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                letterSpacing: 2,
                color: '#E6A900',
                fontWeight: 900
              }}
            >
              TALAZA
            </div>

            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                marginTop: 3
              }}
            >
              Painel do negócio
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              border: '1px solid rgba(255,255,255,.3)',
              background: 'transparent',
              color: '#FFFFFF',
              padding: '9px 12px',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            Sair
          </button>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1000,
          margin: '0 auto',
          padding: '24px 18px'
        }}
      >
        <div
          style={{
            background: 'linear-gradient(145deg,#075B4E,#0B7563)',
            color: '#FFFFFF',
            borderRadius: 24,
            padding: 25,
            boxShadow: '0 15px 40px rgba(0,70,60,.13)'
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: '#E6A900',
              fontWeight: 900,
              letterSpacing: 1
            }}
          >
            O SEU NEGÓCIO
          </div>

          <h1
            style={{
              margin: '8px 0',
              fontSize: 'clamp(26px,5vw,38px)'
            }}
          >
            {business.name}
          </h1>

          <p
            style={{
              margin: 0,
              color: 'rgba(255,255,255,.78)',
              lineHeight: 1.5
            }}
          >
            {business.municipality || 'Município não definido'}
            {business.neighborhood
              ? ` · ${business.neighborhood}`
              : ''}
          </p>

          <div
            style={{
              display: 'inline-flex',
              marginTop: 18,
              padding: '7px 11px',
              borderRadius: 999,
              background: 'rgba(255,255,255,.12)',
              fontSize: 12,
              fontWeight: 700
            }}
          >
            {business.approval_status === 'pending'
              ? 'Em preparação'
              : business.is_active
              ? 'Ativo'
              : 'Inativo'}
          </div>
        </div>

        <section
          style={{
            marginTop: 22,
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit,minmax(210px,1fr))',
            gap: 14
          }}
        >
          {[
            ['✎', 'Editar negócio'],
            ['▣', 'Fotos e logo'],
            ['◫', 'Produtos'],
            ['◉', 'Mensagens'],
            ['●', 'Notificações'],
            ['◆', 'Plano e destaque']
          ].map(([icon, title]) => (
            <button
              key={title}
              style={{
                border: '1px solid #DDE7E3',
                background: '#FFFFFF',
                borderRadius: 18,
                padding: 20,
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: '#EAF4F1',
                  color: '#075B4E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  marginBottom: 12
                }}
              >
                {icon}
              </div>

              <strong style={{ color: '#17342F' }}>
                {title}
              </strong>
            </button>
          ))}
        </section>

        <div
          style={{
            marginTop: 25,
            background: '#FFFFFF',
            borderRadius: 20,
            padding: 22
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: '#075B4E'
            }}
          >
            Informações do negócio
          </h3>

          <p style={{ color: '#66736F', lineHeight: 1.6 }}>
            {business.description ||
              'Ainda não adicionou uma descrição.'}
          </p>

          <div
            style={{
              marginTop: 15,
              display: 'grid',
              gap: 9,
              color: '#52615D',
              fontSize: 14
            }}
          >
            <div>
              <strong>WhatsApp:</strong>{' '}
              {business.whatsapp || 'Não definido'}
            </div>

            <div>
              <strong>Telefone:</strong>{' '}
              {business.phone || 'Não definido'}
            </div>

            <div>
              <strong>Endereço:</strong>{' '}
              {business.address || 'Não definido'}
            </div>

            <div>
              <strong>Horário:</strong>{' '}
              {business.opening_hours || 'Não definido'}
            </div>
          </div>
        </div>

        <Link
          href={{
            pathname: '/explore',
            query: {
              country,
              province
            }
          }}
          style={{
            display: 'block',
            marginTop: 22,
            textAlign: 'center',
            padding: 15,
            borderRadius: 14,
            border: '2px solid #075B4E',
            color: '#075B4E',
            textDecoration: 'none',
            fontWeight: 800,
            background: '#FFFFFF'
          }}
        >
          ← Explorar a Talaza como cliente
        </Link>
      </main>
    </div>
  );
}
