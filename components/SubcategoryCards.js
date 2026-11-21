import React from 'react';

const PALETTE = [
  '#496A63', '#6C647E', '#8A6D4F', '#526C8A',
  '#65764E', '#8A5F66', '#66727B', '#7C7054',
];

function NeutralIcon({ color = '#0B5A4A' }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{display:'block'}}>
    <path d="M4.5 7.5h15v12h-15zM8 7.5V5.7a4 4 0 0 1 8 0v1.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9.5 12h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>;
}

function Chevron({ selected }) {
  if (selected) return <span className="subcatCheck" aria-label="Selecionada">✓</span>;
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="subcatChevron">
    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}

export default function SubcategoryCards({ items = [], value = '', onChange, idPrefix = 'subcat' }) {
  return <div className="subcatCardsWrap" id={idPrefix}>
    <style>{`
      .subcatCardsWrap {
        --green: #0B5A4A; --gold: #C9A24B; --soft: #F3F6F2;
        --sel: #EAF2EC; --ink: #10261F; --muted: #5E6F68; --line: #DDE5DF;
        display:flex; flex-direction:column; gap:8px; width:100%; max-width:520px;
      }
      .subcatCard {
        width:100%; box-sizing:border-box; display:flex; align-items:flex-start; gap:12px;
        padding:14px; border:1.5px solid var(--line); border-radius:12px; background:#FFFFFF;
        color:var(--ink); text-align:left; cursor:pointer; transition:border-color .15s,background .15s;
      }
      .subcatCardSelected { border:2px solid var(--green); background:var(--sel); }
      .subcatIcon {
        width:40px; height:40px; flex:0 0 40px; display:grid; place-items:center;
        border-radius:10px; background:var(--soft); color:var(--green);
      }
      .subcatCardSelected .subcatIcon { background:var(--green); color:#FFFFFF; }
      .subcatText { min-width:0; flex:1; display:flex; flex-direction:column; gap:3px; text-align:center; }
      .subcatTitle { font-size:14px; line-height:1.35; font-weight:700; color:var(--ink); }
      .subcatSubtitle { font-size:12px; line-height:1.35; color:var(--muted); }
      .subcatDescription { margin-top:9px; border-left:3px solid var(--gold); padding-left:10px; font-size:13px; line-height:1.45; color:var(--muted); text-align:left; }
      .subcatChevron { flex:0 0 18px; color:var(--muted); margin-top:10px; }
      .subcatCheck { flex:0 0 18px; display:flex; align-items:center; justify-content:center; color:var(--green); font-size:19px; font-weight:800; margin-top:8px; }
      @media (prefers-color-scheme: dark) {
        .subcatCardsWrap { --green:#66B5A1; --gold:#C9A24B; --soft:#25342F; --sel:#1E3831; --ink:#E8F1EC; --muted:#AABBB3; --line:#3A4B43; }
        .subcatCard { background:#18231F; color:var(--ink); }
        .subcatCardSelected { background:var(--sel); }
        .subcatIcon { background:var(--soft); color:var(--green); }
        .subcatCardSelected .subcatIcon { background:var(--green); color:#10261F; }
      }
    `}</style>
    {items.map((item,index)=>{
      const selected=String(item.id)===String(value);
      const accent=item.color || PALETTE[index%PALETTE.length];
      const iconAvailable=Boolean(item.icon);
      return <button key={item.id} type="button" aria-pressed={selected} className={`subcatCard${selected?' subcatCardSelected':''}`} onClick={()=>onChange(item.id)}>
        <span className="subcatIcon" style={iconAvailable ? undefined : {color:'inherit'}}>{iconAvailable ? <span aria-hidden="true">{item.icon}</span> : <NeutralIcon color={accent}/>}</span>
        <span className="subcatText">
          <span className="subcatTitle">{String(item.name||'').trim()}</span>
          <span className="subcatSubtitle">Selecionar esta subcategoria</span>
          {selected && <span className="subcatDescription">{String(item.description||'').trim()||'Sem descrição disponível'}</span>}
        </span>
        <Chevron selected={selected}/>
      </button>;
    })}
  </div>;
}
