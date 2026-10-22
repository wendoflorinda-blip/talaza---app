import { useMemo, useState } from 'react';
import Link from 'next/link';

const DEMO_EVENTS = [
  { id: 'demo-1', title: 'Feira de Livros e Leitura', category: 'Livros', location: 'Benguela', date: 'Sábado · 10h00', description: 'Uma oportunidade para descobrir novos livros, conhecer autores e partilhar o gosto pela leitura.', image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=900&q=80', featured: true },
  { id: 'demo-2', title: 'Noite de Música ao Vivo', category: 'Shows', location: 'Benguela', date: 'Sexta-feira · 19h00', description: 'Uma noite de música, encontro e talento local. Vem viver uma experiência especial com amigos e família.', image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=80', featured: false },
  { id: 'demo-3', title: 'Workshop de Empreendedorismo', category: 'Formação', location: 'Lobito', date: 'Próximo domingo · 09h00', description: 'Atividade prática para aprender, trocar ideias e transformar projetos em oportunidades.', image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80', featured: false },
];

const CATEGORIES = ['Todos', 'Livros', 'Shows', 'Atividades', 'Formação', 'Vendas', 'Outros'];
const PLANS = [
  { id: 'basico', name: 'Evento Essencial', duration: 'Período e alcance a definir', description: 'Para anunciar um evento na Talaza.', price: 'Preço a definir' },
  { id: 'destaque', name: 'Evento Destaque', duration: 'Período e alcance a definir', description: 'Mais destaque visual na área de eventos.', price: 'Preço a definir', popular: true },
  { id: 'premium', name: 'Evento Premium', duration: 'Período e alcance a definir', description: 'Maior visibilidade para o teu anúncio.', price: 'Preço a definir' },
];

export default function EventosPrototipo() {
  const [tab, setTab] = useState('ver');
  const [step, setStep] = useState(0);
  const [filter, setFilter] = useState('Todos');
  const [openedMessage, setOpenedMessage] = useState('');
  const [sentFor, setSentFor] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Atividades');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [proof, setProof] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const visibleEvents = useMemo(() => filter === 'Todos' ? DEMO_EVENTS : DEMO_EVENTS.filter(event => event.category === filter), [filter]);

  function selectImage(file) {
    setImage(file || null);
    setImagePreview(file ? URL.createObjectURL(file) : '');
  }

  function submitMessage(event, eventId) {
    event.preventDefault();
    setSentFor(eventId);
    setOpenedMessage('');
  }

  return (
    <main className="page">
      <header className="top">
        <Link href="/explore" className="brand"><span className="mark">T</span><span><b>Talaza</b><small>Tudo num só lugar</small></span></Link>
        <span className="top-label">EVENTOS</span>
      </header>

      <nav className="tabs" aria-label="Áreas de eventos">
        <button className={tab === 'ver' ? 'active' : ''} onClick={() => setTab('ver')}><span>▣</span> Ver eventos</button>
        <button className={tab === 'publicar' ? 'active gold' : ''} onClick={() => { setTab('publicar'); setStep(0); }}><span>＋</span> Publicar eventos</button>
      </nav>

      {tab === 'ver' ? <section className="content">
        <div className="hero">
          <span className="eyebrow">DESCOBRE · PARTICIPA · VIVE</span>
          <h1>Há sempre algo a acontecer.</h1>
          <p>Descobre feiras, livros, shows, vendas e atividades anunciadas na Talaza.</p>
          <span className="location">📍 Eventos da tua região</span>
        </div>
        <div className="chips" aria-label="Filtrar eventos">
          {CATEGORIES.map(item => <button key={item} className={filter === item ? 'chip chosen' : 'chip'} onClick={() => setFilter(item)}>{item}</button>)}
        </div>
        <div className="feed">
          {visibleEvents.map(event => <article className={openedMessage === event.id ? 'post open' : 'post'} key={event.id}>
            <div className="post-main">
              <div className="tags"><span className="tag">{event.category}</span>{event.featured && <span className="tag gold-tag">Destaque</span>}</div>
              <h2>{event.title}</h2>
              <div className="cover"><img src={event.image} alt={'Imagem ilustrativa: ' + event.title} /></div>
              <p className="description">{event.description}</p>
              <p className="meta">📍 {event.location} <span>·</span> ◷ {event.date}</p>
              <span className="demo-note">Exemplo visual — conteúdo demonstrativo</span>
            </div>
            <aside className="side">
              {openedMessage !== event.id ? <button className="side-button" onClick={() => { setOpenedMessage(event.id); setSentFor(''); }}><span>✉</span><b>Enviar mensagem</b></button> : <form className="message-form" onSubmit={e => submitMessage(e, event.id)}>
                <div className="message-heading">Contactar anunciante <button type="button" className="close" onClick={() => setOpenedMessage('')}>×</button></div>
                {sentFor === event.id ? <p className="sent">Mensagem preparada. O envio real será ligado à caixa de mensagens Talaza.</p> : <><input aria-label="O teu nome" placeholder="O teu nome" required /><input aria-label="O teu contacto" placeholder="Telefone ou e-mail" required /><textarea aria-label="Mensagem" placeholder="Escreve a tua mensagem..." rows={5} required /><button className="send" type="submit">Preparar mensagem</button></>}
              </form>}
            </aside>
          </article>)}
          {visibleEvents.length === 0 && <div className="empty">Ainda não há eventos nesta categoria no exemplo.</div>}
        </div>
      </section> : <section className="content">
        <div className="hero">
          <span className="eyebrow">PUBLICA NA TALAZA</span>
          <h1>O teu evento merece ser encontrado.</h1>
          <p>Esta área destina-se a quem tem um evento para anunciar: venda de livros, shows, atividades, feiras, formações e muito mais.</p>
        </div>

        <div className="steps">
          {['Informação', 'Plano', 'Pagamento'].map((name, i) => <div key={name} className={step === i ? 'step current' : step > i ? 'step done' : 'step'}><span>{step > i ? '✓' : i + 1}</span>{name}</div>)}
        </div>

        {submitted ? <div className="success-card"><div className="success-icon">✓</div><h2>Comprovativo recebido no protótipo</h2><p>O teu anúncio ficará ativo assim que o pagamento for aprovado. Aguarda a confirmação da equipa Talaza.</p><button className="primary" onClick={() => { setSubmitted(false); setTab('ver'); setStep(0); }}>Voltar a ver eventos</button><p className="demo-note">Este protótipo não envia comprovativos nem ativa anúncios reais.</p></div>
        : step === 0 ? <><div className="info-card"><span className="info-icon">✦</span><p><b>Tem algo para anunciar?</b><br/>Publica o teu evento para que mais pessoas o possam descobrir. Prepara uma descrição clara e uma imagem apelativa.</p></div>
          <button className="publish-cta" onClick={() => setStep(1)}><span className="plus">＋</span><span><b>Publicar eventos</b><small>Adicionar descrição, imagem e detalhes</small></span><span className="arrow">→</span></button>
          <div className="form-card">
            <h2>Informações do anúncio</h2>
            <label>Título do evento<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Feira de livros e cultura" maxLength={120}/></label>
            <label>Descrição<textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Conta às pessoas o que vai acontecer..." rows={5}/></label>
            <label>Tipo de evento<select value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.filter(x => x !== 'Todos').map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Local<input value={location} onChange={e => setLocation(e.target.value)} placeholder="Província, município ou local"/></label>
            <label>Data e hora (opcional)<input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}/></label>
            <label>Imagem do evento<div className="upload" onClick={() => document.getElementById('event-prototype-image')?.click()}>{imagePreview ? <img src={imagePreview} alt="Pré-visualização da imagem"/> : <span className="upload-inner"><b>＋</b>Escolher imagem <small>JPG, PNG ou WEBP</small></span>}</div><input id="event-prototype-image" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => selectImage(e.target.files?.[0])}/></label>
            <button className="primary" onClick={() => { if (!title.trim() || !description.trim() || !image) { alert('Preenche o título, a descrição e escolhe uma imagem.'); return; } setStep(1); window.scrollTo({top:0,behavior:'smooth'}); }}>Avançar para planos →</button>
          </div>
        </> : step === 1 ? <><div className="form-card">
            <button className="back" onClick={() => setStep(0)}>← Voltar aos dados</button><h2>Escolhe o plano do teu anúncio</h2><p className="muted">Seleciona uma das opções. Os preços e a duração serão definidos antes de ativar os pagamentos reais.</p>
            <div className="plans">{PLANS.map(plan => <button key={plan.id} className={selectedPlan?.id === plan.id ? 'plan selected' : 'plan'} onClick={() => setSelectedPlan(plan)}><div className="plan-top"><h3>{plan.name}</h3>{plan.popular && <span>Popular</span>}</div><p>{plan.description}</p><strong className="price">{plan.price}</strong><small>{plan.duration}</small><span className="plan-go">{selectedPlan?.id === plan.id ? 'Selecionado ✓' : 'Escolher plano →'}</span></button>)}</div>
            <button className="primary" disabled={!selectedPlan} onClick={() => { setStep(2); window.scrollTo({top:0,behavior:'smooth'}); }}>Continuar para pagamento →</button>
          </div></> : <div className="form-card">
            <button className="back" onClick={() => setStep(1)}>← Voltar aos planos</button><h2>Pagamento e comprovativo</h2>
            <div className="summary"><div><b>{selectedPlan?.name}</b><small>{title}</small></div><strong>{selectedPlan?.price}</strong></div>
            <div className="bank"><h3>Dados bancários</h3><p>Os dados bancários oficiais da Talaza serão apresentados aqui após serem configurados pela administração.</p><div className="bank-row"><span>Banco</span><b>A configurar</b></div><div className="bank-row"><span>Titular</span><b>A configurar</b></div><div className="bank-row"><span>IBAN / Conta</span><b>A configurar</b></div></div>
            <div className="express"><b>Mensagem para o Express</b><div className="code">TALAZA-EVENTO</div><p>Usa esta referência ao realizar o pagamento. A referência definitiva será gerada pelo sistema quando o fluxo de pagamento for integrado.</p></div>
            <label className="proof-label">Enviar comprovativo de pagamento<input type="file" accept="image/*,.pdf" onChange={e => setProof(e.target.files?.[0] || null)}/><small>{proof ? proof.name : 'Seleciona uma imagem ou PDF do comprovativo.'}</small></label>
            <button className="primary" disabled={!proof} onClick={() => { setSubmitted(true); window.scrollTo({top:0,behavior:'smooth'}); }}>Enviar comprovativo</button>
            <p className="notice">O anúncio ficará ativo assim que o pagamento for aprovado. Aguarda a validação.</p>
            <p className="demo-note">Demonstração visual: o ficheiro não é enviado para um servidor nesta versão.</p>
          </div>}
      </section>}

      <footer>Talaza · Eventos <span>Protótipo interativo · não processa pagamentos reais</span></footer>

      <style jsx>{`
        :global(*){box-sizing:border-box} :global(body){margin:0;background:#eef2f0;color:#14201c;font-family:Roboto,system-ui,-apple-system,"Segoe UI",sans-serif}
        .page{max-width:760px;min-height:100vh;margin:0 auto;background:#f5f6f3;padding-bottom:36px}
        .top{height:68px;background:#08584a;color:#fff;display:flex;align-items:center;gap:12px;padding:0 16px}
        .brand{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none;flex:1}.mark{width:42px;height:42px;border-radius:12px;border:2px solid #f5b800;color:#f5b800;display:grid;place-items:center;font-weight:900;font-size:24px}.brand b{display:block;font-size:19px}.brand small{display:block;font-size:11px;opacity:.8;margin-top:2px}.top-label{font-size:11px;letter-spacing:2px;color:#f5b800;font-weight:900}
        .tabs{position:sticky;top:0;z-index:10;display:grid;grid-template-columns:1fr 1fr;gap:9px;padding:11px 12px;background:rgba(245,246,243,.96);backdrop-filter:blur(10px);border-bottom:1px solid #dbe4e0}.tabs button{display:flex;justify-content:center;align-items:center;gap:8px;min-height:47px;border:1px solid #cbdad4;border-radius:13px;background:#fff;color:#08584a;font-size:13px;font-weight:850;padding:9px 7px}.tabs button.active{background:#08584a;color:white;border-color:#08584a}.tabs button.active.gold{background:#f5b800;border-color:#e0a500;color:#302500}
        .content{padding:12px 12px 0}.hero{padding:18px 5px 20px}.eyebrow{font-size:10px;letter-spacing:1.7px;color:#7a3fd1;font-weight:900}.hero h1{font-size:clamp(27px,6vw,39px);letter-spacing:-1.2px;line-height:1.08;color:#083f35;margin:11px 0}.hero p{font-size:14px;line-height:1.65;color:#5a6a64;max-width:570px}.location{display:inline-block;margin-top:12px;padding:8px 11px;border-radius:999px;background:#e8f2ee;color:#08584a;font-size:12px;font-weight:800}
        .chips{display:flex;gap:7px;overflow:auto;padding:0 0 14px;scrollbar-width:none}.chip{flex:0 0 auto;border:1px solid #dbe4e0;border-radius:999px;background:#fff;padding:8px 12px;color:#5a6a64;font-size:12px;font-weight:800}.chip.chosen{background:#7a3fd1;color:#fff;border-color:#7a3fd1}
        .feed{display:grid;gap:12px}.post{display:grid;grid-template-columns:minmax(0,1fr) 54px;border:1px solid #dbe4e0;border-radius:17px;overflow:hidden;background:#fff;box-shadow:0 6px 20px #10261c08}.post.open{grid-template-columns:minmax(0,1fr) 180px}.post-main{padding:12px;min-width:0}.tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.tag{background:#e8f2ee;color:#08584a;padding:4px 9px;border-radius:999px;font-size:10px;font-weight:900}.gold-tag{background:#f5b800;color:#302500}.post h2{font-size:17px;line-height:1.3;margin:0 0 10px;color:#18241f}.cover{width:100%;aspect-ratio:16/10;border-radius:12px;overflow:hidden;background:#e8f2ee}.cover img{width:100%;height:100%;object-fit:cover;display:block}.description{font-size:13px;line-height:1.55;color:#3f4c46;margin:10px 0 0}.meta{font-size:11px;color:#66756e;margin:10px 0 0}.meta span{margin:0 4px}.side{background:#f0e9fb;border-left:1px solid #e3d6f7;min-width:0;display:flex;flex-direction:column}.side-button{height:100%;display:flex;align-items:center;justify-content:center;gap:8px;flex-direction:column;padding:8px 0;color:#7a3fd1;font-size:11px;font-weight:900}.side-button span{font-size:21px}.side-button b{writing-mode:vertical-rl;letter-spacing:.2px}.message-form{display:flex;flex-direction:column;gap:8px;padding:9px;min-height:100%}.message-heading{font-size:12px;font-weight:900;color:#3f1a6e;display:flex;align-items:center;justify-content:space-between}.close{background:#fff;color:#7a3fd1;border-radius:50%;width:24px;height:24px;font-size:18px}.message-form input,.message-form textarea{min-width:0;width:100%;border:1px solid #d9c9f3;border-radius:9px;padding:8px;font-size:12px;background:#fff}.send{padding:9px 5px;background:#7a3fd1;color:white;border-radius:9px;font-size:11px;font-weight:900}.sent{font-size:12px;line-height:1.5;color:#3f1a6e}
        .demo-note{display:block;color:#87918b;font-size:10px;line-height:1.4;margin-top:9px}.empty{background:white;border:1px dashed #cbdad4;border-radius:14px;padding:26px;text-align:center;color:#66756e;font-size:13px}
        .steps{display:flex;gap:8px;align-items:center;margin:0 0 13px;padding:0 4px}.step{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:800;color:#87918b;flex:1}.step span{width:24px;height:24px;display:grid;place-items:center;border-radius:50%;background:#dbe4e0;font-size:11px}.step.current{color:#08584a}.step.current span{background:#08584a;color:white}.step.done span{background:#f5b800;color:#302500}
        .info-card{display:flex;gap:12px;padding:15px;border-radius:16px;background:linear-gradient(135deg,#3f1a6e,#7a3fd1);color:white;margin-bottom:12px}.info-icon{width:38px;height:38px;flex:0 0 auto;border-radius:50%;display:grid;place-items:center;background:#ffffff24;font-size:21px}.info-card p{font-size:13px;line-height:1.6}.info-card b{color:#ffdc76}
        .publish-cta{width:100%;display:flex;align-items:center;gap:12px;padding:16px;border-radius:16px;background:#f5b800;color:#302500;text-align:left;margin-bottom:13px;box-shadow:0 7px 18px #f5b80030}.plus{width:46px;height:46px;display:grid;place-items:center;flex:0 0 auto;border-radius:50%;background:#fff;color:#08584a;font-size:29px}.publish-cta b{display:block;font-size:17px}.publish-cta small{display:block;margin-top:3px;font-size:11px}.arrow{margin-left:auto;font-size:23px}
        .form-card,.success-card{background:#fff;border:1px solid #dbe4e0;border-radius:17px;padding:16px;margin-bottom:12px}.form-card h2,.success-card h2{font-size:19px;color:#08584a;margin:4px 0 12px}.form-card label{display:block;margin:13px 0 0;font-size:12px;font-weight:850;color:#52625a}.form-card input:not([type=file]),.form-card textarea,.form-card select{display:block;width:100%;margin-top:6px;border:1px solid #cfd9d5;border-radius:11px;padding:12px;background:#fff;color:#14201c;font:inherit;font-size:13px}.form-card textarea{resize:vertical}.upload{margin-top:7px;position:relative;aspect-ratio:16/10;border:2px dashed #8fbfb1;border-radius:13px;overflow:hidden;background:#e8f2ee;display:grid;place-items:center;color:#08584a;cursor:pointer}.upload img{position:absolute;width:100%;height:100%;object-fit:cover}.upload-inner{display:flex;align-items:center;flex-direction:column;gap:6px;font-size:13px}.upload-inner b{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#08584a;color:white;font-size:25px}.upload-inner small{font-size:11px;color:#66756e}
        .primary{width:100%;margin-top:16px;padding:14px;border:0;border-radius:12px;background:#08584a;color:#fff;font-weight:900;font-size:14px}.primary:disabled{opacity:.45}.back{color:#7a3fd1;font-weight:850;font-size:12px;margin-bottom:12px}.muted{font-size:12px;line-height:1.6;color:#66756e;margin-bottom:12px}.plans{display:grid;gap:10px;margin-top:14px}.plan{width:100%;text-align:left;display:block;padding:14px;border:2px solid #dbe4e0;border-radius:15px;background:white}.plan.selected{border-color:#7a3fd1;background:#f0e9fb}.plan-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.plan h3{font-size:16px;color:#08584a}.plan-top span{font-size:10px;background:#7a3fd1;color:white;border-radius:999px;padding:4px 8px}.plan p{font-size:12px;color:#66756e;margin:7px 0}.price{display:block;font-size:17px;color:#3f1a6e;margin:8px 0 3px}.plan small{font-size:11px;color:#66756e}.plan-go{display:block;margin-top:12px;padding:9px;border-radius:9px;text-align:center;background:#e8f2ee;color:#08584a;font-size:12px;font-weight:900}
        .summary{display:flex;align-items:center;gap:10px;background:#e8f2ee;border-radius:12px;padding:12px;margin:12px 0}.summary div{flex:1;min-width:0}.summary b,.summary small{display:block}.summary small{font-size:11px;color:#66756e;margin-top:3px}.summary strong{font-size:13px;color:#08584a;text-align:right}.bank,.express{padding:13px;border-radius:13px;background:#f7f9f7;margin-top:12px}.bank h3{font-size:14px;color:#08584a;margin-bottom:8px}.bank p,.express p{font-size:12px;line-height:1.55;color:#66756e;margin-bottom:9px}.bank-row{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid #dbe4e0;font-size:12px}.bank-row span{color:#66756e}.bank-row b{color:#14201c;text-align:right}.express{background:#fff8e1;border:1px dashed #f5b800}.express b{font-size:13px;color:#5b4300}.code{font-size:19px;font-weight:900;letter-spacing:.04em;margin:7px 0;color:#3f1a6e}.proof-label{display:block;margin-top:14px;font-size:12px;font-weight:900;color:#52625a}.proof-label input{display:block;width:100%;margin-top:8px;font-size:12px}.proof-label small{display:block;margin-top:6px;font-weight:500;color:#66756e}.notice{margin-top:12px;padding:12px;border-radius:12px;background:#fff8e1;color:#5b4300;font-size:12px;line-height:1.55}.success-card{text-align:center;padding:25px 17px}.success-icon{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#dff5e8;color:#0a6b3a;font-size:25px;margin:0 auto 12px}.success-card p{font-size:13px;line-height:1.6;color:#66756e;margin:10px 0}
        footer{padding:22px 16px;text-align:center;color:#08584a;font-weight:900;font-size:12px}footer span{display:block;margin-top:5px;color:#87918b;font-weight:500;font-size:10px}
        @media(min-width:640px){.page{border-left:1px solid #dbe4e0;border-right:1px solid #dbe4e0}.post,.post.open{grid-template-columns:minmax(0,1fr) 210px}.side-button{display:none}.message-form{display:flex!important}.close{display:none}}
        @media(max-width:390px){.tabs button{font-size:11px}.post.open{grid-template-columns:minmax(0,1fr) 145px}.post-main{padding:9px}.message-form{padding:7px}}
      `}</style>
    </main>
  );
}
