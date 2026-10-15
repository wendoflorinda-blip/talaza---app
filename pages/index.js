import Link from 'next/link';
import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>Talaza - Tudo num só lugar</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main style={mainStyle}>
        <div style={cardStyle}>
          <div style={logoStyle}>T</div>
          <p style={brandStyle}>TALAZA</p>

          <h1 style={titleStyle}>Tudo o que você procura, num só lugar.</h1>
          
          <p style={subtitleStyle}>
            Encontre negócios, produtos, serviços, profissionais e oportunidades de forma simples, organizada e perto de você.
          </p>

          <Link href="/signup?type=cliente" style={{ textDecoration: 'none', display: 'block' }}>
            <button style={primaryBtn}>Criar conta →</button>
          </Link>

          <Link href="/signup?type=vendedor" style={{ textDecoration: 'none', display: 'block' }}>
            <button style={secondaryBtn}>Quero ser vendedor</button>
          </Link>

          <Link href="/login" style={{ textDecoration: 'none', display: 'block' }}>
            <button style={ghostBtn}>Já tenho conta</button>
          </Link>

          <p style={footerStyle}>Ao continuar, você concorda com os termos da Talaza.</p>
        </div>
      </main>
    </>
  );
}

// STYLES
const mainStyle = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: '#EEF2EF',
  padding: 16,
  fontFamily: 'system-ui, -apple-system, sans-serif'
};

const cardStyle = {
  width: '100%',
  maxWidth: 360,
  background: '#115E4E',
  borderRadius: 32,
  padding: '32px 26px',
  color: 'white',
  textAlign: 'center',
  boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
};

const logoStyle = {
  width: 78,
  height: 78,
  margin: '0 auto',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 20,
  display: 'grid',
  placeItems: 'center',
  fontSize: 44,
  fontWeight: 900,
  color: '#FBBF24'
};

const brandStyle = {
  letterSpacing: 5,
  marginTop: 14,
  fontSize: 12,
  fontWeight: 800,
  opacity: 0.9
};

const titleStyle = {
  fontSize: 30,
  lineHeight: 1.15,
  marginTop: 22,
  fontWeight: 800,
  letterSpacing: -0.5
};

const subtitleStyle = {
  opacity: 0.88,
  marginTop: 14,
  lineHeight: 1.6,
  fontSize: 14,
  padding: '0 4px'
};

const primaryBtn = {
  width: '100%',
  marginTop: 28,
  padding: 16,
  borderRadius: 12,
  border: 0,
  background: '#FBBF24',
  color: '#12211E',
  fontWeight: 800,
  fontSize: 16,
  cursor: 'pointer'
};

const secondaryBtn = {
  width: '100%',
  marginTop: 12,
  padding: 14,
  borderRadius: 12,
  border: '2px solid rgba(255,255,255,0.22)',
  background: 'rgba(255,255,255,0.07)',
  color: 'white',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer'
};

const ghostBtn = {
  width: '100%',
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  border: 0,
  background: 'transparent',
  color: 'rgba(255,255,255,0.75)',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 13
};

const footerStyle = {
  marginTop: 20,
  fontSize: 11,
  opacity: 0.55,
  lineHeight: 1.4
};
