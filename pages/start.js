import Link from 'next/link';

export default function Start() {
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
            href="/"
            style={{
              textDecoration: 'none',
              color: '#075B4E',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            ← Voltar
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
            Criar conta
          </div>

          <h1
            style={{
              margin: '16px 0 8px',
              color: '#17342F',
              fontSize: 'clamp(29px, 6vw, 42px)',
              lineHeight: 1.15,
            }}
          >
            Que conta quer criar?
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
            Escolha se quer simplesmente explorar a Talaza ou criar um
            perfil de vendedor para o seu negócio.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: 18,
          }}
        >
          {/* EXPLORAR TALAZA */}
          <Link
            href="/signup"
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
              Explorar Talaza
            </h2>

            <p
              style={{
                margin: 0,
                color: '#66736F',
                lineHeight: 1.55,
                fontSize: 13,
              }}
            >
              Uma conta para explorar a Talaza: descubra negócios,
              produtos, serviços, profissionais e oportunidades perto de
              si.
            </p>

            <div
              style={{
                marginTop: 18,
                color: '#B88300',
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              Criar conta de explorador →
            </div>
          </Link>

          {/* PERFIL DE VENDEDOR */}
          <Link
            href="/post-business"
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
              Perfil de vendedor
            </h2>

            <p
              style={{
                margin: 0,
                color: 'rgba(255,255,255,.82)',
                lineHeight: 1.55,
                fontSize: 13,
              }}
            >
              Para criar o perfil do seu negócio, loja ou serviço e
              mostrar os seus produtos a quem procura na Talaza.
            </p>

            <div
              style={{
                marginTop: 18,
                color: '#E6A900',
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              Criar perfil de vendedor →
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
            href="/login"
            style={{
              color: '#075B4E',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Já tem conta? Entrar
          </Link>
        </div>
      </div>
    </div>
  );
}
