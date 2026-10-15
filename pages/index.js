import Link from 'next/link';

export default function Home() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--bg, #F5F7F8)',
      }}
    >
      <main
        style={{
          width: '100%',
          maxWidth: 620,
          minHeight: 560,
          borderRadius: 32,
          padding: '56px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          background:
            'linear-gradient(145deg, #075B4E 0%, #0B7563 55%, #06483E 100%)',
          boxShadow:
            '0 20px 50px rgba(0, 60, 50, 0.18)',
          color: '#FFFFFF',
        }}
      >
        {/* LOGO */}
        <div
          style={{
            width: 82,
            height: 82,
            borderRadius: 22,
            border: '1px solid rgba(255,255,255,0.25)',
            background: 'rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 18,
          }}
        >
          <span style={{ fontSize: 44, fontWeight: 800, color: '#E6A900' }}>T</span>
        </div>

        <div style={{ fontSize: 14, letterSpacing: 3, fontWeight: 700, marginBottom: 18 }}>TALAZA</div>

        <h1 style={{ fontSize: 'clamp(28px, 6vw, 42px)', lineHeight: 1.12, margin: 0, maxWidth: 520 }}>
          Tudo o que você procura,<br />num só lugar.
        </h1>

        <p style={{ maxWidth: 450, margin: '16px auto 28px', color: 'rgba(255,255,255,0.78)', fontSize: 14, lineHeight: 1.6 }}>
          Encontre negócios perto de você ou cadastre seu próprio negócio.
        </p>

        {/* 2 BOTÕES PRINCIPAIS - VITRINE CLIENTE E VENDEDOR */}
        <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 480, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            href="/vitrine"
            style={{ flex: 1, minWidth: 180, background: '#E6A900', color: '#17342F', border: 'none', fontWeight: 800, padding: '14px 18px', textDecoration: 'none', borderRadius: 12, textAlign: 'center' }}
          >
            Explorar a Talaza
            <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.8 }}>Vitrine do Cliente</div>
          </Link>

          <Link
            href="/signup?type=vendedor"
            style={{ flex: 1, minWidth: 180, background: 'transparent', color: '#FFFFFF', border: '2px solid rgba(255,255,255,0.35)', fontWeight: 700, padding: '14px 18px', textDecoration: 'none', borderRadius: 12, textAlign: 'center' }}
          >
            Criar Perfil
            <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.8 }}>Vitrine do Vendedor</div>
          </Link>
        </div>

        {/* OPÇÃO ABAIXO CRIAR CONTA QUE VOCÊ PEDIU */}
        <div style={{ marginTop: 28, width: '100%', maxWidth: 480, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Ainda não tem conta?</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/signup?type=cliente" style={{ flex: 1, background: '#fff', color: '#075B4E', padding: '10px', borderRadius: 8, textDecoration: 'none', fontWeight: 800, fontSize: 13, textAlign: 'center' }}>Sou Cliente</Link>
            <Link href="/signup?type=vendedor" style={{ flex: 1, background: 'transparent', color: '#fff', padding: '10px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 13, textAlign: 'center', border: '1px solid rgba(255,255,255,0.4)' }}>Sou Vendedor</Link>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>Uma conta serve para tudo: províncias, mensagens e comunidade.</div>
        </div>

        <Link href="/login" style={{ marginTop: 16, color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'underline' }}>Já tenho conta - Entrar</Link>
      </main>
    </div>
  );
}
