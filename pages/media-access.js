import Head from 'next/head';
import Link from 'next/link';

const page = {
  minHeight: '100vh',
  padding: '28px 16px 60px',
  background: 'linear-gradient(145deg,#10172D,#26395F)',
  fontFamily: 'system-ui,sans-serif',
};
const card = {
  display: 'block',
  padding: 20,
  borderRadius: 17,
  background: 'rgba(255,255,255,.08)',
  border: '1px solid rgba(245,215,122,.35)',
  color: '#FFFFFF',
  textDecoration: 'none',
};
const button = {
  display: 'inline-block',
  marginTop: 13,
  padding: '12px 16px',
  borderRadius: 11,
  background: 'linear-gradient(100deg,#D9B65C,#F1D88D)',
  color: '#1B2540',
  fontWeight: 900,
  textDecoration: 'none',
};

export default function MediaAccess() {
  return (
    <>
      <Head>
        <title>Entrar na MÍDIA TALAZA</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main style={page}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <Link href="/start" style={{ color: '#F4D77D', textDecoration: 'none', fontWeight: 800 }}>← Voltar</Link>
          <header style={{ textAlign: 'center', color: '#FFFFFF', margin: '38px 0 28px' }}>
            <div style={{ color: '#F4D77D', fontSize: 12, fontWeight: 900, letterSpacing: 2 }}>PLATAFORMA INTERNACIONAL</div>
            <h1 style={{ fontSize: 34, margin: '10px 0' }}>MÍDIA TALAZA</h1>
            <p style={{ color: 'rgba(255,255,255,.76)', lineHeight: 1.6, maxWidth: 570, margin: '0 auto' }}>
              Escolha a opção correspondente à sua situação. A conta TALAZA Comercial e o perfil de Criador continuam separados, mesmo quando utiliza o mesmo acesso.
            </p>
          </header>

          <div style={{ display: 'grid', gap: 14 }}>
            <section style={card}>
              <div style={{ color: '#F4D77D', fontSize: 12, fontWeight: 900 }}>PRIMEIRA VEZ</div>
              <h2 style={{ margin: '7px 0', fontSize: 20 }}>Quero candidatar-me como Criador</h2>
              <p style={{ color: 'rgba(255,255,255,.75)', lineHeight: 1.55, fontSize: 14, margin: 0 }}>
                Para quem ainda não tem candidatura. Pode criar uma conta TALAZA ou utilizar uma conta existente.
              </p>
              <Link href="/media-creator-signup" style={button}>Criar candidatura</Link>
            </section>

            <section style={card}>
              <div style={{ color: '#F4D77D', fontSize: 12, fontWeight: 900 }}>JÁ TENHO PERFIL DE CRIADOR</div>
              <h2 style={{ margin: '7px 0', fontSize: 20 }}>Já sou Criador de Conteúdos</h2>
              <p style={{ color: 'rgba(255,255,255,.75)', lineHeight: 1.55, fontSize: 14, margin: 0 }}>
                Entre com o e-mail e a palavra-passe que utilizou na candidatura. Será encaminhado para o seu painel ou para o estado da candidatura.
              </p>
              <Link href="/login?next=/media" style={button}>Entrar na MÍDIA TALAZA</Link>
            </section>

            <section style={card}>
              <div style={{ color: '#F4D77D', fontSize: 12, fontWeight: 900 }}>TENHO CONTA COMERCIAL</div>
              <h2 style={{ margin: '7px 0', fontSize: 20 }}>Tenho conta de Vendedor ou Explorador</h2>
              <p style={{ color: 'rgba(255,255,255,.75)', lineHeight: 1.55, fontSize: 14, margin: 0 }}>
                Entre com a sua conta TALAZA existente e continue para a candidatura de Criador. Não precisa criar outro utilizador nem usar outro e-mail.
              </p>
              <Link href="/login?next=/media-creator-signup" style={button}>Entrar e continuar candidatura</Link>
            </section>
          </div>

          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.62)', fontSize: 12, lineHeight: 1.5, marginTop: 22 }}>
            O painel de Criador só é disponibilizado depois da aprovação da candidatura e da confirmação do pagamento anual.
          </p>
        </div>
      </main>
    </>
  );
}
