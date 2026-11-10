import Head from 'next/head';
import Link from 'next/link';
const card={display:'block',padding:22,borderRadius:18,textDecoration:'none',background:'#FFFFFF',border:'1px solid #E3E8EF',color:'#182238'};
export default function AccountEntry(){return <>
<Head><title>Já tenho conta | TALAZA</title><meta name="viewport" content="width=device-width, initial-scale=1"/></Head>
<main style={{minHeight:'100vh',padding:'32px 16px',background:'#F5F7F8',fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif'}}>
<div style={{maxWidth:760,margin:'0 auto'}}><Link href="/" style={{color:'#075B4E',fontWeight:800,textDecoration:'none'}}>← Voltar</Link>
<header style={{textAlign:'center',margin:'34px 0 28px'}}><div style={{fontSize:12,fontWeight:900,letterSpacing:2,color:'#B88300'}}>BEM-VINDO DE VOLTA</div><h1 style={{fontSize:'clamp(28px,5vw,38px)',color:'#17342F',margin:'10px 0'}}>Onde pretende entrar?</h1><p style={{color:'#66736F',fontSize:14,lineHeight:1.6}}>Escolha a área que pretende abrir. A mesma conta TALAZA pode dar acesso às diferentes áreas, sem as misturar.</p></header>
<div style={{display:'grid',gap:14}}>
<Link href="/login?account=explorer" style={card}><strong style={{color:'#075B4E',fontSize:18}}>Explorador TALAZA</strong><p style={{margin:'7px 0 0',fontSize:13,color:'#66736F',lineHeight:1.5}}>Entrar na Vitrine da sua província principal.</p></Link>
<Link href="/login?account=seller" style={{...card,background:'linear-gradient(145deg,#075B4E,#0B7563)',color:'#FFFFFF',border:0}}><strong style={{fontSize:18}}>Vendedor TALAZA</strong><p style={{margin:'7px 0 0',fontSize:13,color:'rgba(255,255,255,.82)',lineHeight:1.5}}>Entrar no painel de gestão do seu negócio.</p></Link>
<Link href="/login?account=creator" style={{...card,background:'linear-gradient(145deg,#151C35,#293C68)',color:'#FFFFFF',border:'1px solid #B99A4A'}}><strong style={{fontSize:18,color:'#F5D77A'}}>Criador de Conteúdos</strong><p style={{margin:'7px 0 0',fontSize:13,color:'rgba(255,255,255,.82)',lineHeight:1.5}}>Entrar no Feed da MÍDIA TALAZA.</p></Link>
</div></div></main></>;}
