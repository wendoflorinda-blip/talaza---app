import Head from 'next/head';
import Link from 'next/link';

const C = {
  green: '#0F6E5C',
  dark: '#083F35',
  gold: '#DDA10A',
  ink: '#17211F',
  muted: '#596560',
  bg: '#F8F6F3',
  white: '#FFFFFF',
  line: '#E5E9E7',
};

export default function Start() {
  return (
    <>
      <Head>
        <title>Talaza — Tudo o que procura, num só lugar</title>
        <meta
          name="description"
          content="Encontre negócios, produtos, serviços e oportunidades no Talaza."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>T</div>
          <div style={styles.wordmark}>TALAZA</div>

          <h1>
            Tudo o que procura,
            <br />
            num só lugar.
          </h1>

          <p style={styles.description}>
            Encontre negócios, produtos, serviços, profissionais e
            oportunidades de forma simples e organizada.
          </p>

          <Link href="/signup" style={styles.primary}>
            Criar conta
          </Link>

          <Link href="/login" style={styles.secondary}>
            Já tenho conta
          </Link>

          <p style={styles.footer}>
            Descubra. Conecte-se. Encontre.
          </p>
        </div>
      </main>
    </>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: 20,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: C.bg,
    color: C.ink,
    fontFamily:
      "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: 430,
    background: C.dark,
    borderRadius: 26,
    padding: '38px 24px 30px',
    textAlign: 'center',
    color: C.white,
    boxShadow: '0 18px 45px rgba(8,63,53,0.16)',
  },
  logo: {
    width: 64,
    height: 64,
    margin: '0 auto 9px',
    display: 'grid',
    placeItems: 'center',
    borderRadius: 18,
    background: 'rgba(255,255,255,0.10)',
    border: '1px solid rgba(255,255,255,0.18)',
    color: C.gold,
    fontSize: 35,
    fontWeight: 900,
  },
  wordmark: {
    letterSpacing: '0.22em',
    fontSize: 13,
    fontWeight: 800,
    marginBottom: 30,
  },
  description: {
    color: '#D3E7E0',
    fontSize: 15,
    lineHeight: 1.65,
    margin: '14px 0 28px',
  },
  primary: {
    display: 'block',
    padding: 15,
    borderRadius: 12,
    background: C.gold,
    color: '#2B2000',
    fontWeight: 800,
    textDecoration: 'none',
    marginBottom: 11,
  },
  secondary: {
    display: 'block',
    padding: 14,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.45)',
    color: C.white,
    fontWeight: 700,
    textDecoration: 'none',
  },
  footer: {
    marginTop: 25,
    fontSize: 12,
    color: '#BBD7CE',
  },
};
