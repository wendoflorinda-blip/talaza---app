import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const C = {
  green: '#0F6E5C',
  dark: '#083F35',
  ink: '#17211F',
  muted: '#596560',
  canvas: '#F8F6F3',
  white: '#FFFFFF',
  line: '#E5E9E7',
  gold: '#DDA10A',
  purple: '#7252B8',
};

export default function Index() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (!active) return;

      // A sessão é preservada pelo Supabase.
      // Não obrigamos o visitante a iniciar sessão para explorar.
      setChecking(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (active) setChecking(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      <Head>
        <title>Talaza — Tudo num só lugar</title>
        <meta
          name="description"
          content="Encontre negócios, serviços e oportunidades na Talaza."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="page">
        <header className="header">
          <Link href="/" className="brand">
            <span className="brand-mark">T</span>
            <span>talaza</span>
          </Link>

          <Link href="/login" className="login">
            Já tenho conta
          </Link>
        </header>

        <section className="hero">
          <div className="eyebrow">
            <span className="dot" />
            Descubra o que existe à sua volta
          </div>

          <h1>
            Tudo o que procura,
            <br />
            <span>num só lugar.</span>
          </h1>

          <p className="intro">
            Explore negócios, encontre serviços e descubra oportunidades.
            Comece pela sua localização e encontre o que precisa na Talaza.
          </p>

          <div className="actions">
            <button
              className="primary"
              onClick={() => router.push('/country')}
            >
              Começar <span aria-hidden="true">→</span>
            </button>

            <Link href="/login" className="secondary">
              Já tenho conta
            </Link>
          </div>

          <div className="trust">
            <span className="trust-icon">✓</span>
            Explore primeiro. Escolha com atenção.
          </div>
        </section>

        <section className="features">
          <article className="feature">
            <div className="feature-icon green">⌕</div>
            <h2>Encontre negócios</h2>
            <p>Descubra lojas, produtos e serviços por categoria.</p>
          </article>

          <article className="feature">
            <div className="feature-icon gold">◇</div>
            <h2>Conheça as lojas</h2>
            <p>Veja o perfil, as imagens e os produtos de cada negócio.</p>
          </article>

          <article className="feature">
            <div className="feature-icon purple">✦</div>
            <h2>Descubra oportunidades</h2>
            <p>Explore outras áreas disponíveis na Talaza.</p>
          </article>
        </section>

        <footer>
          <span>Talaza</span>
          <span>Descobrir. Conectar. Escolher.</span>
        </footer>
      </main>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 0 7%;
          background: ${C.canvas};
          color: ${C.ink};
          font-family: Arial, Helvetica, sans-serif;
        }

        .header {
          height: 88px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid ${C.line};
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          color: ${C.dark};
          text-decoration: none;
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -1px;
        }

        .brand-mark {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: ${C.green};
          color: white;
          font-size: 22px;
        }

        .login {
          color: ${C.green};
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
        }

        .hero {
          max-width: 800px;
          margin: 0 auto;
          padding: 85px 0 75px;
          text-align: center;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 10px 14px;
          border: 1px solid ${C.line};
          border-radius: 999px;
          background: ${C.white};
          color: ${C.muted};
          font-size: 13px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${C.gold};
        }

        h1 {
          margin: 26px 0 20px;
          color: ${C.dark};
          font-size: clamp(38px, 6vw, 66px);
          line-height: 1.08;
          letter-spacing: -2.5px;
        }

        h1 span {
          color: ${C.green};
        }

        .intro {
          max-width: 600px;
          margin: 0 auto;
          color: ${C.muted};
          font-size: 17px;
          line-height: 1.8;
        }

        .actions {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 13px;
          margin-top: 30px;
        }

        .primary,
        .secondary {
          min-height: 49px;
          padding: 0 23px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 15px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
        }

        .primary {
          border: 1px solid ${C.green};
          background: ${C.green};
          color: white;
        }

        .secondary {
          border: 1px solid ${C.line};
          background: white;
          color: ${C.dark};
        }

        .trust {
          margin-top: 22px;
          color: ${C.muted};
          font-size: 13px;
        }

        .trust-icon {
          color: ${C.green};
          font-weight: 800;
          margin-right: 6px;
        }

        .features {
          max-width: 1050px;
          margin: 0 auto;
          padding: 0 0 75px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .feature {
          padding: 25px;
          border: 1px solid ${C.line};
          border-radius: 18px;
          background: ${C.white};
        }

        .feature-icon {
          width: 45px;
          height: 45px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          font-size: 23px;
          font-weight: 700;
        }

        .green {
          background: #E8F3F0;
          color: ${C.green};
        }

        .gold {
          background: #FBF1D7;
          color: #9A7000;
        }

        .purple {
          background: #F1ECFA;
          color: ${C.purple};
        }

        h2 {
          margin: 18px 0 9px;
          font-size: 18px;
          color: ${C.dark};
        }

        .feature p {
          margin: 0;
          color: ${C.muted};
          line-height: 1.65;
          font-size: 14px;
        }

        footer {
          min-height: 65px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border-top: 1px solid ${C.line};
          color: ${C.muted};
          font-size: 12px;
        }

        footer span:first-child {
          font-weight: 800;
          color: ${C.dark};
        }

        @media (max-width: 700px) {
          .page {
            padding: 0 20px;
          }

          .header {
            height: 72px;
          }

          .hero {
            padding: 65px 0 55px;
          }

          h1 {
            letter-spacing: -1.5px;
          }

          .intro {
            font-size: 15px;
          }

          .features {
            grid-template-columns: 1fr;
            padding-bottom: 45px;
          }

          .feature {
            padding: 22px;
          }

          footer {
            flex-direction: column;
            justify-content: center;
            padding: 17px 0;
          }
        }
      `}</style>
    </>
  );
}
