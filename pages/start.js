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
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 0',
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
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Alterar localização
          </Link>
        </nav>

        <div
          style={{
            textAlign: 'center',
            marginTop: 48,
            marginBottom: 30,
          }}
        >
          <div
            style={{
              display: 'inline-block',
              padding: '7px 13px',
              borderRadius: 999,
              background: '#EAF4F1',
              color: '#075B4E',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            Localização definida
          </div>

          <h1
            style={{
              margin: '16px 0 8px',
              color: '#17342F',
              fontSize: 'clamp(29px, 6vw, 42px)',
              lineHeight: 1.15,
            }}
          >
            Como deseja utilizar a Talaza?
          </h1>

          <p
            style={{
              maxWidth: 540,
              margin: '0 auto',
              color: '#66736F',
              fontSize: 15,
              lineHeight: 1.6,
            }}
          >
            Escolha se quer simplesmente explorar a Talaza ou criar um perfil
            para o seu negócio.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: 18,
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
              border: '1px solid #D9E5E1',
              borderRadius: 20,
              padding: 25,
              color: '#17342F',
              boxShadow: '0 10px 26px rgba(0,70,60,.06)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: '#075B4E',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                marginBottom: 16,
              }}
            >
              🔎
            </div>

            <h2
              style={{
                margin: '0 0 8px',
                color: '#075B4E',
                fontSize: 20,
              }}
            >
              Explorar a Talaza
            </h2>

            <p
              style={{
                margin: 0,
                color: '#66736F',
                lineHeight: 1.55,
                fontSize: 13,
              }}
            >
              Entre na Vitrine e descubra negócios, produtos, serviços,
              oportunidades e outras soluções disponíveis na sua região.
            </p>

            <div
              style={{
                marginTop: 18,
                color: '#B88300',
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              Explorar agora →
            </div>
          </Link>

          {/* NEGÓCIO */}
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
              background: 'linear-gradient(145deg,#075B4E,#0B7563)',
              borderRadius: 20,
              padding: 25,
              color: '#FFFFFF',
              boxShadow: '0 12px 30px rgba(0,70,60,.13)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: '#E6A900',
                color: '#17342F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                marginBottom: 16,
              }}
            >
              ✦
            </div>

            <h2
              style={{
                margin: '0 0 8px',
                fontSize: 20,
              }}
            >
              Criar um perfil de negócio
            </h2>

            <p
              style={{
                margin: 0,
                color: 'rgba(255,255,255,.82)',
                lineHeight: 1.55,
                fontSize: 13,
              }}
            >
              Para quem quer divulgar uma empresa, loja, serviço, produtos
              ou outras atividades na Talaza.
            </p>

            <div
              style={{
                marginTop: 18,
                color: '#E6A900',
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              Criar perfil →
            </div>
          </Link>
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: 28,
          }}
        >
          <Link
            href="/country"
            style={{
              color: '#075B4E',
              textDecoration: 'none',
              fontSize: 13,
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
                                   
          

          
              
            

          
              
          
