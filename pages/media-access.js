import Head from 'next/head';
import Link from 'next/link';

export default function MediaAccess() {
  return <>
    <Head><title>MÍDIA TALAZA · Criar conta</title><meta name="viewport" content="width=device-width, initial-scale=1"/></Head>
    <main style={{minHeight:'100vh',padding:'32px 16px 56px',background:'radial-gradient(circle at top,#34466F 0,#17233F 48%,#10172A 100%)',fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",display:'grid',placeItems:'center'}}>
      <div style={{width:'100%',maxWidth:560}}>
        <Link href="/start" style={{color:'#E8C66A',textDecoration:'none',fontWeight:800}}>← Voltar</Link>
        <section style={{marginTop:28,background:'#FFFFFF',borderRadius:24,padding:'clamp(24px,5vw,40px)',boxShadow:'0 24px 70px rgba(0,0,0,.28)',textAlign:'center'}}>
          <div style={{fontSize:11,letterSpacing:3,fontWeight:900,color:'#B98B2E'}}>PLATAFORMA INTERNACIONAL</div>
          <h1 style={{fontSize:34,color:'#182238',margin:'12px 0 8px'}}>MÍDIA TALAZA</h1>
          <p style={{fontSize:14,color:'#687386',lineHeight:1.65,margin:'0 0 24px'}}>Crie o seu perfil de criador e faça parte de uma comunidade internacional de conteúdos.</p>
          <Link href="/media-creator-signup" style={{display:'block',padding:16,borderRadius:13,background:'linear-gradient(100deg,#D5B15A,#F1D98F)',color:'#1B2540',fontWeight:900,textDecoration:'none'}}>Criar conta de Criador</Link>
          <p style={{fontSize:13,color:'#687386',margin:'22px 0 8px'}}>Já tem uma conta de Criador?</p>
          <Link href="/login?next=/media" style={{color:'#155B49',fontWeight:900,textDecoration:'none'}}>Entrar na MÍDIA TALAZA</Link>
        </section>
      </div>
    </main>
  </>;
}
