                              
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
          boxShadow: '0 20px 50px rgba(0, 60, 50, 0.18)',
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
          <span
            style={{
              fontSize: 44,
              fontWeight: 800,
              color: '#E6A900',
            }}
          >
            T
          </span>
        </div>

        <div
          style={{
            fontSize: 14,
            letterSpacing: 3,
            fontWeight: 700,
            marginBottom: 18,
          }}
        >
          TALAZA
        </div>

        {/* FRASE */}
        <h1
          style={{
            fontSize: 'clamp(32px, 6vw, 48px)',
            lineHeight: 1.12,
            margin: 0,
            maxWidth: 520,
          }}
        >
          Tudo o que você procura,
          <br />
          num só lugar.
        </h1>

        <p
          style={{
            maxWidth: 450,
            margin: '20px auto 34px',
            color: 'rgba(255,255,255,0.78)',
            fontSize: 15,
            lineHeight: 1.6,
          }}
        >
          Encontre negócios, produtos, serviços e oportunidades
          de forma simples, organizada e perto de você.
        </p>

        {/* BOTÕES */}
        <div
          style={{
            display: 'flex',
            gap: 14,
            width: '100%',
            maxWidth: 480,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <Link
            href="/country"
            className="btn"
            style={{
              flex: 1,
              minWidth: 190,
              background: '#E6A900',
              color: '#17342F',
              border: 'none',
              justifyContent: 'center',
              fontWeight: 800,
              padding: '15px 22px',
              textDecoration: 'none',
            }}
          >
            Começar →
          </Link>

          <Link
            href="/login"
            className="btn"
            style={{
              flex: 1,
              minWidth: 190,
              background: 'transparent',
              color: '#FFFFFF',
              border: '2px solid rgba(255,255,255,0.35)',
              justifyContent: 'center',
              fontWeight: 700,
              padding: '15px 22px',
              textDecoration: 'none',
            }}
          >
            Já tenho conta
          </Link>
        </div>

      </main>
    </div>
  );
}
                  

                  
        
        

           
      
        
            

                
                      

                

  
