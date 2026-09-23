
  import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Start() {
  const router = useRouter();

  const { country, province } = router.query;

  if (!country || !province) {
    return (
      <div
        className="container"
        style={{
          maxWidth: 700,
          textAlign: 'center',
          paddingTop: 60,
        }}
      >
        <p>A preparar a Talaza…</p>
      </div>
    );
  }

  const signupUrl = {
    pathname: '/signup',
    query: {
      country,
      province,
      next: 'explore',
    },
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F7F6',
      }}
    >
      <div
        className="container"
        style={{
          maxWidth: 760,
          paddingBottom: 50,
        }}
      >
        <nav className="topnav">
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              className="logo"
              style={{
                background: '#075B4E',
                color: '#E6A900',
              }}
            >
              T
            </div>

            <b>Talaza</b>
          </Link>
        </nav>

        <div
          style={{
            textAlign: 'center',
            marginTop: 50,
          }}
        >
          <div
            style={{
              display: 'inline-block',
              padding: '7px 14px',
              borderRadius: 30,
              background: '#EAF4F1',
              color: '#075B4E',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            A sua região está definida
          </div>

          <h1
            style={{
              fontSize: 30,
              margin: '18px 0 10px',
            }}
          >
            O que você deseja fazer?
          </h1>

          <p
            style={{
              color: '#596B68',
              maxWidth: 520,
              margin: '0 auto 34px',
              lineHeight: 1.6,
            }}
          >
            Escolha como pretende utilizar a Talaza.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 18,
          }}
        >
          <Link
            href={signupUrl}
            className="card"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              padding: 28,
              minHeight: 230,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              border: '2px solid #075B4E',
              background: '#FFFFFF',
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: '#075B4E',
                color: '#E6A900',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 25,
                marginBottom: 16,
              }}
            >
              T
            </div>

            <h2
              style={{
                fontSize: 21,
                margin: '0 0 8px',
                color: '#102A25',
              }}
            >
              Explorar a Talaza
            </h2>

            <p
              style={{
                color: '#596B68',
                fontSize: 14,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              Encontre negócios, produtos, serviços e
              oportunidades na sua região.
            </p>
          </Link>

          <Link
            href={{
              pathname: '/post-business',
              query: {
                country,
                province,
              },
            }}
            className="card"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              padding: 28,
              minHeight: 230,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              border: '2px solid #E6A900',
              background: '#FFFFFF',
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: '#E6A900',
                color: '#17342F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 25,
                marginBottom: 16,
              }}
            >
              +
            </div>

            <h2
              style={{
                fontSize: 21,
                margin: '0 0 8px',
                color: '#102A25',
              }}
            >
              Criar um perfil de negócio
            </h2>

            <p
              style={{
                color: '#596B68',
                fontSize: 14,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              Apresente o seu negócio, produtos e serviços
              na Talaza.
            </p>
          </Link>
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: 30,
          }}
        >
          <Link
            href="/country"
            style={{
              color: '#075B4E',
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            ← Escolher outra localização
          </Link>
        </div>
      </div>
    </div>
  );
}
      
        
            
        
          

          
              
            

          
              
          
