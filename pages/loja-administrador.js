import { useEffect, useState } from 'react';
import Head from 'next/head';
import ProductsView from '../components/ProductsView';

const panel = { width: '100%', maxWidth: 900, margin: '0 auto', padding: '28px 16px 60px', boxSizing: 'border-box' };
const field = { width: '100%', boxSizing: 'border-box', border: '1px solid #D8E2DC', borderRadius: 10, padding: 12, font: 'inherit' };

export default function AdminPublicStore({ slug }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [inactiveMessage, setInactiveMessage] = useState('');

  useEffect(() => {
    if (slug === undefined) {
      fetch('/api/admin-store/public').then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Loja indisponível.');
        setData(result); setProvinceId(result.provinces?.[0]?.id || ''); setInactiveMessage(result.hostingActive ? '' : 'Esta loja está INATIVA / SEM PLANO DE HOSPEDAGEM ativo. Os produtos e informações estão disponíveis nesta página, mas a loja não aparece na Vitrine até ativar um plano.'); setInactiveMessage(result.hostingActive ? '' : 'Esta loja está INATIVA / SEM PLANO DE HOSPEDAGEM ativo. Os produtos e informações estão disponíveis nesta página, mas a loja não aparece na Vitrine até ativar um plano.'); setInactiveMessage(result.hostingActive ? '' : 'Esta loja está INATIVA / SEM PLANO DE HOSPEDAGEM ativo. Os produtos e informações estão disponíveis nesta página, mas a loja não aparece na Vitrine até ativar um plano.');
      }).catch(err => setError(err.message)).finally(() => setLoading(false));
      return;
    }
    if (!slug) return;
    fetch('/api/admin-store/public?slug='+encodeURIComponent(slug)).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Loja indisponível.');
      setData(result); setProvinceId(result.provinces?.[0]?.id || '');
    }).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, [slug]);

  async function sendMessage(event) {
    event.preventDefault(); setSending(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin-store/public', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: data.store.id, nome: name, provinceId, mensagem: message }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível enviar a mensagem.');
      setNotice(result.message || 'Mensagem enviada.');
      setMessage('');
    } catch (err) { setError(err.message); }
    finally { setSending(false); }
  }

  return <>
    <Head><title>{data?.store?.nome_da_loja || 'Loja do Administrador'} | Talaza</title><meta name="description" content={data?.store?.descricao || 'Loja oficial do Talaza'} /></Head>
    <main style={{ minHeight: '100vh', background: '#F4F8F5', color: '#173B35', fontFamily: 'Arial,sans-serif' }}>
      <header style={{ background: '#075B4E', color: '#fff', padding: '17px 20px' }}><div style={{ ...panel, padding: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><strong style={{ color: '#D4AF37', letterSpacing: 2 }}>TALAZA</strong><a href="/" style={{ color: '#fff' }}>Início</a></div></header>
      <div style={panel}>
        {loading && <p>A carregar a loja…</p>}
        {error && <p role="alert" style={{ background: '#FFF0EE', color: '#9C3027', padding: 12, borderRadius: 10 }}>{error}</p>}
        {data && inactiveMessage && <p role="status" style={{background:'#FFF4D6',color:'#674A00',border:'1px solid #E7C65D',padding:13,borderRadius:10,fontWeight:700}}>{inactiveMessage}</p>}
        {data && <>
          <section style={{position:'relative',minHeight:260,borderRadius:18,overflow:'hidden',background:'#075B4E',padding:22,boxSizing:'border-box',display:'flex',alignItems:'flex-end'}}>
            {data.business?.cover_url&&<img src={data.business.cover_url} alt="Capa da loja oficial" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>}
            <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.7))'}}/>
            <div style={{position:'relative',zIndex:1,display:'flex',alignItems:'center',gap:14,color:'#fff',flexWrap:'wrap'}}>
              {data.store.foto_url&&<img src={data.store.foto_url} alt="Logótipo da loja" style={{width:92,height:92,objectFit:'cover',borderRadius:18,border:'2px solid #D4AF37'}}/>}
              <div><h1 style={{margin:0}}>{data.store.nome_da_loja}</h1><p style={{color:'#F2D78D',margin:'6px 0 0'}}>{data.store.country} · Loja oficial Talaza</p><p style={{margin:'7px 0 0',fontSize:14,lineHeight:1.6}}>{data.store.descricao||''}</p></div>
            </div>
          </section>
          {data.mainImages?.length>0&&<section style={{marginTop:18,display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8}}>{[0,1,2].map(slot=>{const item=data.mainImages.find(row=>Number(row.slot)===slot);return item?.image_url?<img key={slot} src={item.image_url} alt={'Imagem da loja '+(slot+1)} style={{width:'100%',aspectRatio:'1/1',objectFit:'cover',borderRadius:12}}/>:<div key={slot} style={{aspectRatio:'1/1',borderRadius:12,background:'#EAF2EC'}}/>})}</section>}
          <section style={{marginTop:18,background:'#fff',border:'1px solid #DCE6E0',borderRadius:18,padding:20,display:'grid',gap:8}}>
            {data.store.telefone&&<p style={{margin:0}}><strong>Telefone:</strong> {data.store.telefone}</p>}
            {data.business?.whatsapp&&<p style={{margin:0}}><strong>WhatsApp:</strong> {data.business.whatsapp}</p>}
            {data.business?.opening_hours&&<p style={{margin:0}}><strong>Horário:</strong> {data.business.opening_hours}</p>}
            {[data.business?.address,data.business?.municipality,data.business?.neighborhood].filter(Boolean).length>0&&<p style={{margin:0}}><strong>Localização:</strong> {[data.business?.address,data.business?.municipality,data.business?.neighborhood].filter(Boolean).join(' · ')}</p>}
          </section>

          <section style={{ marginTop: 24 }}>
            <h2>Produtos</h2>
            <ProductsView items={data.products || []} mode="normal" editable={false} businessName={data.store.nome_da_loja} businessId={data.store.business_id || ''} />
          </section>

          <section style={{ marginTop: 28, background: '#fff', border: '1px solid #DCE6E0', borderRadius: 18, padding: 22 }}>
            <h2 style={{ marginTop: 0 }}>Enviar mensagem à Loja do Administrador</h2>
            <p style={{ color: '#66756F', fontSize: 13 }}>A sua mensagem será recebida diretamente no Painel de Mensagens do Administrador.</p>
            <form onSubmit={sendMessage}>
              <label style={{ display: 'block', fontWeight: 800, fontSize: 13, margin: '13px 0 6px' }}>O seu nome *</label><input required maxLength={100} value={name} onChange={e => setName(e.target.value)} style={field} />
              <label style={{ display: 'block', fontWeight: 800, fontSize: 13, margin: '13px 0 6px' }}>Província onde está *</label><select required value={provinceId} onChange={e => setProvinceId(e.target.value)} style={field}><option value="">Escolher província</option>{data.provinces.map(item => <option key={item.id} value={item.id}>{item.province}</option>)}</select>
              <label style={{ display: 'block', fontWeight: 800, fontSize: 13, margin: '13px 0 6px' }}>Mensagem *</label><textarea required minLength={5} maxLength={1500} rows={4} value={message} onChange={e => setMessage(e.target.value)} style={{ ...field, resize: 'vertical' }} />
              {notice && <p role="status" style={{ color: '#17633A' }}>{notice}</p>}
              <button disabled={sending} type="submit" style={{ marginTop: 14, border: 0, borderRadius: 10, padding: '12px 18px', color: '#fff', background: '#075B4E', fontWeight: 800 }}>{sending ? 'A enviar…' : 'Enviar mensagem'}</button>
            </form>
          </section>
        </>}
      </div>
    </main>
  </>;
}
