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
        background: '#F5F7F8',
      }}
    >
      <main
        style={{
          width: '100%',
          maxWidth: 620,
          borderRadius: 32,
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          background: 'linear-gradient(145deg, #075B4E 0%, #0B7563 55%, #06483E 100%)',
          boxShadow: '0 20px 50px rgba(0, 60, 50, 0.18)',
          color: '#FFFFFF',
        }}
      >
        {/* LOGO */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            border: '1px solid rgba(255,255,255,0.25)',
            background: 'rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 40, fontWeight: 800, color: '#E6A900' }}>T</span>
        </div>

        <div style={{ fontSize: 13, letterSpacing: 3, fontWeight: 700, marginBottom: 14 }}>
          TALAZA
        </div>

        <h1 style={{ fontSize: 32, lineHeight: 1.15, margin: 0, maxWidth: 500 }}>
          Tudo o que você procura,<br />num só lugar.
        </h1>

        <p style={{ maxWidth: 420, margin: '14px auto 22px', color: 'rgba(255,255,255,0.78)', fontSize: 14, lineHeight: 1.5 }}>
          Encontre negócios, produtos e serviços perto de você. Ou cadastre seu negócio.
        </p>

        {/* BOTÕES VITRINES */}
        <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 460, justifyContent: 'center' }}>
          <Link
            href="/vitrine"
            style={{
              flex: 1,
              background: '#E6A900',
              color: '#17342F',
              fontWeight: 800,
              padding: '14px 12px',
              borderRadius: 12,
              textDecoration: 'none',
              textAlign: 'center',
              fontSize: 14
            }}
          >
            Explorar a Talaza
            <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2, opacity: 0.8 }}>Vitrine do Cliente</div>
          </Link>

          <Link
            href="/painel"
            style={{
              flex: 1,
              background: 'transparent',
              color: '#FFFFFF',
              border: '2px solid rgba(255,255,255,0.35)',
              fontWeight: 700,
              padding: '14px 12px',
              borderRadius: 12,
              textDecoration: 'none',
              textAlign: 'center',
              fontSize: 14
            }}
          >
            Criar Perfil
            <div style={{ fontSize: 10, fontWeight: 500, marginTop: 2, opacity: 0.8 }}>Vitrine do Vendedor</div>
          </Link>
        </div>

        {/* AQUI ESTÁ O CRIAR CONTA QUE NÃO APARECIA */}
        <div
          style={{
            marginTop: 20,
            width: '100%',
            maxWidth: 460,
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 16,
            padding: 14,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: '#fff' }}>
            Ainda não tem conta no Talaza?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link
              href="/signup?type=cliente"
              style={{
                flex: 1,
                background: '#FFFFFF',
                color: '#075B4E',
                padding: '11px 6px',
                borderRadius: 10,
                textDecoration: 'none',
                fontWeight: 800,
                fontSize: 13,
                textAlign: 'center',
              }}
            >
              Sou Cliente
            </Link>
            <Link
              href="/signup?type=vendedor"
              style={{
                flex: 1,
                background: 'transparent',
                color: '#FFFFFF',
                border: '1px solid #FFFFFF',
                padding: '11px 6px',
                borderRadius: 10,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 13,
                textAlign: 'center',
              }}
            >
              Sou Vendedor
            </Link>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
            Uma conta só serve para tudo. Pode mudar de província sem criar de novo.
          </div>
        </div>

        <Link href="/login" style={{ marginTop: 14, color: 'rgba(255,255,255,0.7)', fontSize: 12, textDecoration: 'underline' }}>
          Já tenho conta - Entrar
        </Link>
      </main>
    </div>
  );
}
