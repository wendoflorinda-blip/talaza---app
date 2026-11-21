import React from 'react';

const PALETTE = [
  { accent: '#496A63', soft: '#F0F5F3' },
  { accent: '#6C647E', soft: '#F4F1F7' },
  { accent: '#8A6D4F', soft: '#F7F3EE' },
  { accent: '#526C8A', soft: '#F0F3F7' },
  { accent: '#65764E', soft: '#F3F5EF' },
  { accent: '#8A5F66', soft: '#F7F1F2' },
  { accent: '#66727B', soft: '#F2F4F5' },
  { accent: '#7C7054', soft: '#F6F4EF' },
];

function NeutralIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{display:'block'}}>
    <path d="M4.5 7.5h15v12h-15zM8 7.5V5.7a4 4 0 0 1 8 0v1.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9.5 12h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>;
}

export default function SubcategoryCards({ items = [], value = '', onChange, idPrefix = 'subcat' }) {
  const selected = items.find(item => String(item.id) === String(value));
  return <div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:10,marginTop:10}}>
      {items.map((item,index)=>{
        const tone=PALETTE[index%PALETTE.length];
        const active=String(item.id)===String(value);
        return <button key={item.id} type="button" aria-pressed={active} onClick={()=>onChange(item.id)} style={{textAlign:'left',display:'flex',gap:10,alignItems:'center',minHeight:68,padding:12,borderRadius:13,border:'1px solid '+(active?tone.accent:'#E0E7E3'),background:active?tone.soft:'#FFFFFF',color:'#243B35',boxShadow:active?'0 0 0 2px '+tone.accent+'20':'0 2px 7px rgba(25,55,45,.035)',cursor:'pointer',transition:'border-color .15s,background .15s'}}>
          <span style={{width:38,height:38,flex:'0 0 38px',display:'grid',placeItems:'center',borderRadius:11,background:tone.soft,color:tone.accent}}><NeutralIcon/></span>
          <span style={{fontSize:13,fontWeight:800,lineHeight:1.35}}>{String(item.name||'').trim()}</span>
        </button>;
      })}
    </div>
    {selected && (() => {const idx=items.findIndex(item=>String(item.id)===String(selected.id));const tone=PALETTE[idx%PALETTE.length];return <div id={idPrefix+'-description'} role="status" style={{marginTop:12,padding:15,border:'1px solid '+tone.accent+'55',borderLeft:'4px solid '+tone.accent,borderRadius:12,background:tone.soft,color:'#33433D'}}>
      <div style={{fontSize:13,fontWeight:800,marginBottom:5,color:tone.accent}}>{selected.name}</div>
      <p style={{margin:0,fontSize:13,lineHeight:1.65}}>{String(selected.description||'').trim()||'Sem descrição disponível'}</p>
    </div>;})()}
  </div>;
}
