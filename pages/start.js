
             import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Start() {
  const router = useRouter();
  const { country, province } = router.query;

  if (!country || !province) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F5F7F6',
          padding: 24,
        }}
      >
        <p style={{ color: '#075B4E', fontWeight: 600 }}>
          A preparar a Talaza…
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F7F6',
        paddingBottom: 50,
      }}
    >
      <div
        className="container"
        style={{
          maxWidth: 820,
          paddingTop: 20,
        }}
      >
        <nav
          className="topnav"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 0',
          }}
        >
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              color: '#075B4E',
              fontWeight: 900,
              fontSize: 24,
              letterSpacing: 1,
            }}
          >
            TALAZA
          </Link>

          <Link
            href="/country"
            style={{
              textDecoration: 'none',
              color: '#075B4E',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Alterar localização
          </Link>
        </nav>

        <div
          style={{
            textAlign: 'center',
            marginTop: 55,
            marginBottom: 35,
          }}
        >
          <div
            style={{
              display: 'inline-block',
              padding: '8px 14px',
              borderRadius: 999,
              background: '#EAF4F1',
              color: '#075B4E',
              fontSize: 13,
              fontWeight: 800,
              marginBottom: 16,
            }}
          >
            A sua região está definida
          </div>

          <h1
            style={{
              margin: 0,
              color: '#17342F',
              fontSize: 'clamp(30px, 6vw, 44px)',
              lineHeight: 1.15,
            }}
          >
            O que você deseja fazer?
          </h1>

          <p
            style={{
              maxWidth: 560,
              margin: '16px auto 0',
              color: '#66736F',
              fontSize: 16,
              lineHeight: 1.6,
            }}
          >
            Escolha como pretende utilizar a Talaza.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: 20,
          }}
        >
          {/* EXPLORAR */}
          <Link
            href={{
              pathname: '/explore',
              query: {
                country,
                province,
              },
            }}
            style={{
              textDecoration: 'none',
              background: '#FFFFFF',
              border: '2px solid #075B4E',
              borderRadius: 24,
              padding: 30,
              color: '#17342F',
              boxShadow: '0 12px 30px rgba(0, 70, 60, 0.08)',
              transition: 'transform 0.2s ease',
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                background: '#075B4E',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 25,
                marginBottom: 20,
              }}
            >
              🔎
            </div>

            <h2
              style={{
                margin: '0 0 10px',
                color: '#075B4E',
                fontSize: 22,
              }}
            >
              Explorar a Talaza
            </h2>

            <p
              style={{
                margin: 0,
                color: '#66736F',
                lineHeight: 1.6,
                fontSize: 14,
              }}
            >
              Entre na Vitrine, descubra negócios, produtos, serviços,
              oportunidades e tudo o que existe na sua região.
            </p>

            <div
              style={{
                marginTop: 22,
                color: '#B88300',
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              Explorar agora →
            </div>
          </Link>

          {/* CRIAR NEGÓCIO */}
          <Link
            href={{
              pathname: '/post-business',
              query: {
                country,
                province,
              },
            }}
            style={{
              textDecoration: 'none',
              background:
                'linear-gradient(145deg, #075B4E 0%, #0B7563 100%)',
              borderRadius: 24,
              padding: 30,
              color: '#FFFFFF',
              boxShadow: '0 12px 30px rgba(0, 70, 60, 0.16)',
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                background: '#E6A900',
                color: '#17342F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 25,
                marginBottom: 20,
              }}
            >
              ✦
            </div>

            <h2
              style={{
                margin: '0 0 10px',
                fontSize: 22,
              }}
            >
              Criar um perfil de negócio
            </h2>

            <p
              style={{
                margin: 0,
                color: 'rgba(255,255,255,0.78)',
                lineHeight: 1.6,
                fontSize: 14,
              }}
            >
              Apresente o seu negócio na Talaza, mostre os seus produtos e
              serviços e seja encontrado por pessoas da sua região.
            </p>

            <div
              style={{
                marginTop: 22,
                color: '#E6A900',
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              Criar perfil →
            </div>
          </Link>
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: 32,
          }}
        >
          <Link
            href="/country"
            style={{
              color: '#075B4E',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            ← Escolher outra localização
          </Link>
        </div>
      </div>
    </div>
  );
}   
              
              
              
              
            
        
          

          
              
            

          
              
          
