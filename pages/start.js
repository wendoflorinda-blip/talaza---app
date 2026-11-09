import Link from 'next/link';

export default function Start() {
  const card = {
    textDecoration: 'none',
    background: '#FFFFFF',
    border: '1px solid #D9E5E1',
    borderRadius: 20,
    padding: 25,
    color: '#17342F',
    boxShadow: '0 10px 26px rgba(0,70,60,.06)',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7F6', paddingBottom: 50 }}>
      <div className="container" style={{ maxWidth: 1050, paddingTop: 20 }}>
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
          <Link href="/" style={{ textDecoration: 'none', color: '#075B4E', fontWeight: 900, fontSize: 24, letterSpacing: 1 }}>TALAZA</Link>
          <Link href="/" style={{ textDecoration: 'none', color: '#075B4E', fontSize: 13, fontWeight: 700 }}>← Voltar</Link>
        </nav>

        <div style={{ textAlign: 'center', marginTop: 48, marginBottom: 30 }}>
          <div style={{ display: 'inline-block', padding: '7px 13px', borderRadius: 999, background: '#EAF4F1', color: '#075B4E', fontSize: 12, fontWeight: 800 }}>Criar conta</div>
          <h1 style={{ margin: '16px 0 8px', color: '#17342F', fontSize: 'clamp(29px, 6vw, 42px)', lineHeight: 1.15 }}>Que área quer utilizar?</h1>
          <p style={{ maxWidth: 620, margin: '0 auto', color: '#66736F', fontSize: 15, lineHeight: 1.6 }}>Escolha como pretende participar na Talaza. A MÍDIA TALAZA tem um perfil e uma área independentes, ligados à sua conta de acesso.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 18 }}>
          <Link href="/signup" style={card}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#075B4E', color: '#FFFFFF', display: 'grid', placeItems: 'center', fontSize: 22, marginBottom: 16 }}>🔎</div>
            <h2 style={{ margin: '0 0 8px', color: '#075B4E', fontSize: 20 }}>Explorador TALAZA</h2>
            <p style={{ margin: 0, color: '#66736F', lineHeight: 1.55, fontSize: 13 }}>Descubra negócios, produtos, serviços, profissionais e oportunidades na sua região.</p>
            <div style={{ marginTop: 18, color: '#B88300', fontWeight: 800, fontSize: 13 }}>Criar conta de explorador →</div>
          </Link>

          <Link href="/post-business" style={{ ...card, background: 'linear-gradient(145deg,#075B4E,#0B7563)', border: 0, color: '#FFFFFF' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#E6A900', color: '#17342F', display: 'grid', placeItems: 'center', fontSize: 22, marginBottom: 16 }}>✦</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Perfil de Vendedor</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,.82)', lineHeight: 1.55, fontSize: 13 }}>Crie o perfil do seu negócio, loja ou serviço e apresente os seus produtos na Talaza.</p>
            <div style={{ marginTop: 18, color: '#E6A900', fontWeight: 800, fontSize: 13 }}>Criar perfil de vendedor →</div>
          </Link>

          <Link href="/media-access" style={{ ...card, background: 'linear-gradient(145deg,#151C35,#293C68)', border: '1px solid #B99A4A', color: '#FFFFFF' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#F5D77A,#B8860B)', color: '#1E2945', display: 'grid', placeItems: 'center', fontSize: 22, marginBottom: 16 }}>▶</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Criador de Conteúdos</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,.82)', lineHeight: 1.55, fontSize: 13 }}>Entre na MÍDIA TALAZA para apresentar os seus conteúdos a uma audiência internacional.</p>
            <div style={{ marginTop: 18, color: '#F5D77A', fontWeight: 800, fontSize: 13 }}>Candidatar-me à MÍDIA TALAZA →</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
