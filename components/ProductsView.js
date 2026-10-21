import { useState } from 'react';
import { formatKz } from '../lib/imageTools';

export const VIEW_MODES = ['vertical', 'deslize', 'normal'];

const MODES = [
  { id: 'vertical', title: 'Ver produtos', hint: 'Opção 1 · vertical 9:16' },
  { id: 'deslize', title: 'Deslize', hint: 'Opção 2 · quadrado 1:1' },
  { id: 'normal', title: 'Normal', hint: 'Opção 3 · grade' }
];

export default function ProductsView({ items = [], mode = 'normal', onModeChange, editable = false, onEdit, showNextCard = true }) {
  const [open, setOpen] = useState(null);
  const current = VIEW_MODES.includes(mode) ? mode : 'normal';
  const openItem = open ? items.find((item) => item.id === open) : null;

  return (
    <div className="pv">
      {onModeChange && <div className="modes" role="group" aria-label="Como quer ver os produtos do painel">
        {MODES.map((item) => <button key={item.id} type="button" className={'mode' + (current === item.id ? ' on' : '')} aria-pressed={current === item.id} onClick={() => onModeChange(item.id)}>
          <b>{item.title}</b><small>{item.hint}</small><span className="ck" aria-hidden="true">✓</span>
        </button>)}
      </div>}
      {!items.length && <div className="empty">Ainda não há imagens de painel.</div>}
      {items.length > 0 && current === 'vertical' && <div className="vert">
        {items.map((item) => <article key={item.id}>
          <div className="row"><span className="price">{item.price !== null && item.price !== undefined && item.price !== '' ? formatKz(item.price) : 'Sem preço'}</span>{editable && <button type="button" className="more" onClick={() => onEdit?.(item)} aria-label="Opções do produto">⋮</button>}</div>
          <button type="button" className="im r916" onClick={() => setOpen(item.id)} aria-label={'Ampliar ' + (item.name || 'imagem')}><img src={item.image_url} alt={item.name || 'Produto'} loading="lazy" /></button>
          <div className="cap"><span className="dash">–</span><span><b>{item.name || 'Imagem'}</b>{item.description ? ' · ' + item.description : ''}</span></div>
        </article>)}
      </div>}
      {items.length > 0 && current === 'deslize' && <>
        <div className="hint">Desliza e vê outro negócio ›</div>
        <div className="slide">{items.map((item) => <article key={item.id}>
          <div className="row"><span className="price">{item.price !== null && item.price !== undefined && item.price !== '' ? formatKz(item.price) : 'Sem preço'}</span>{editable && <button type="button" className="more" onClick={() => onEdit?.(item)} aria-label="Opções do produto">⋮</button>}</div>
          <button type="button" className="im r11" onClick={() => setOpen(item.id)} aria-label={'Ampliar ' + (item.name || 'imagem')}><img src={item.image_url} alt={item.name || 'Produto'} loading="lazy" /></button>
          <div className="cap"><span className="dash">–</span><span><b>{item.name || 'Imagem'}</b>{item.description ? ' · ' + item.description : ''}</span></div>
        </article>)}{showNextCard && <div className="next">Próximo negócio<small>Continue a deslizar</small></div>}</div>
      </>}
      {items.length > 0 && current === 'normal' && <div className="grid">{items.map((item) => <div className="cell" key={item.id}>
        <button type="button" className="open" onClick={() => setOpen(item.id)} aria-label={'Ampliar ' + (item.name || 'imagem')}><img src={item.image_url} alt={item.name || 'Produto'} loading="lazy" /></button>
        {item.price !== null && item.price !== undefined && item.price !== '' && <span className="tag">{formatKz(item.price)}</span>}
        {editable && <button type="button" className="more abs" onClick={() => onEdit?.(item)} aria-label="Opções do produto">⋮</button>}
      </div>)}</div>}
      {openItem && <div className="veu" onClick={(event) => { if (event.target === event.currentTarget) setOpen(null); }}>
        <div className="sheet" role="dialog" aria-modal="true" aria-label={openItem.name || 'Produto'}>
          <img className="big" src={openItem.image_url} alt={openItem.name || 'Produto'} />
          <div className="bigprice">{openItem.price ? formatKz(openItem.price) : 'Sem preço'}</div>
          <h3>{openItem.name || 'Sem nome'}</h3><p>{openItem.description || 'Sem descrição'}</p>
          <div className="acts"><button type="button" className="close" onClick={() => setOpen(null)}>Fechar</button></div>
        </div>
      </div>}
      <style jsx>{`
        .pv button{font:inherit;color:inherit;border:0;background:none;cursor:pointer;padding:0}
        .modes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:14px}
        .mode{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:5px;text-align:left;padding:11px 9px!important;border-radius:13px;border:2px solid #DBE4E0!important;background:#F8FAF9!important;min-height:80px;color:#075B4E}
        .mode b{font-size:13px;line-height:1.1}.mode small{color:#5A6A64;font-size:10.5px;line-height:1.2}
        .mode .ck{display:none;position:absolute;right:5px;top:5px}.mode.on{border-color:#075B4E!important;background:#EAF4F1!important;color:#075B4E}.mode.on .ck{display:block}
        .empty{padding:28px 14px;text-align:center;color:#5A6A64;font-size:14px;border:2px dashed #DBE4E0;border-radius:14px}
        .row{display:flex;align-items:center;justify-content:space-between;min-height:30px;margin-bottom:5px}.price{font-weight:800;color:#075B4E;font-size:14px}
        .more{width:30px;height:30px;border-radius:50%!important;background:#E7EEEB!important;font-size:18px;display:grid;place-items:center}.more.abs{position:absolute;right:3px;top:3px;background:#fff!important}
        .im{display:block;width:100%;border-radius:14px!important;overflow:hidden;background:#E8F2EE!important}.im img{width:100%;height:100%;object-fit:cover;display:block}.r916{aspect-ratio:9/16}.r11{aspect-ratio:1/1}
        .cap{display:flex;gap:8px;margin-top:7px;font-size:13px;line-height:1.4;color:#14201C}.dash{color:#075B4E;font-weight:800}.vert{display:grid;gap:20px}
        .hint{font-size:13px;font-weight:700;color:#075B4E;margin-bottom:8px}.slide{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding-bottom:4px}.slide article,.next{flex:0 0 84%;scroll-snap-align:center}.next{aspect-ratio:1/1;border-radius:14px;background:linear-gradient(135deg,#075B4E,#075B4E);color:#fff;display:grid;place-items:center;text-align:center;font-weight:700;padding:20px}.next small{display:block;font-weight:400;opacity:.85;margin-top:4px}
        .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}.cell{position:relative;aspect-ratio:1/1;border-radius:7px;overflow:hidden;background:#E8F2EE}.open{display:block;width:100%;height:100%}.open img{width:100%;height:100%;object-fit:cover;display:block}.tag{position:absolute;left:4px;bottom:4px;background:rgba(15,22,20,.74);color:#fff;font-weight:800;font-size:10px;padding:2px 6px;border-radius:999px}
        .veu{position:fixed;inset:0;background:rgba(10,20,17,.55);z-index:120;display:flex;align-items:flex-end;justify-content:center}.sheet{background:#fff;width:100%;max-width:560px;border-radius:20px 20px 0 0;padding:16px 16px calc(18px + env(safe-area-inset-bottom));max-height:92vh;overflow-y:auto}.big{width:100%;max-height:52vh;object-fit:contain;background:#E8F2EE;border-radius:14px;display:block;margin:0 0 10px}.bigprice{font-weight:800;color:#075B4E;font-size:18px}.sheet h3{margin:2px 0;font-size:17px;color:#14201C}.sheet p{margin:2px 0 12px;font-size:13px;color:#5A6A64;line-height:1.5;white-space:pre-wrap}.acts{display:grid;grid-template-columns:1fr;gap:8px}.acts .close{padding:13px;border-radius:11px;font-weight:700;text-align:center;text-decoration:none}.acts .close{background:#E9EEEC;color:#14201C}
      `}</style>
    </div>
  );
}
