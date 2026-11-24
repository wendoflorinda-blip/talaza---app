import React from 'react';

export const COMMERCIAL_NAME_REQUIRED = 'Configure o seu nome no perfil da Comercial Talaza para continuar.';

export async function hasCommercialName(supabase, user) {
  if (!user) return false;
  const { data, error } = await supabase.from('profiles')
    .select('name,commercial_display_name').eq('id', user.id).maybeSingle();
  if (error) return false;
  return Boolean(String(data?.commercial_display_name || data?.name || '').trim());
}

export function CommercialNameDialog({ open, onClose, onConfigure }) {
  if (!open) return null;
  return <div role="dialog" aria-modal="true" style={{position:'fixed',inset:0,zIndex:10000,background:'rgba(10,20,16,.58)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
    <div style={{background:'#fff',borderRadius:18,padding:24,width:'100%',maxWidth:420,boxShadow:'0 20px 60px rgba(0,0,0,.25)',fontFamily:'inherit'}}>
      <strong style={{display:'block',fontSize:17,color:'#16362B',marginBottom:10}}>Nome obrigatório</strong>
      <p style={{fontSize:14,lineHeight:1.55,color:'#4B5A53',margin:'0 0 20px'}}>{COMMERCIAL_NAME_REQUIRED}</p>
      <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
        <button type="button" onClick={onClose} style={{border:'1px solid #CBD5CE',background:'#fff',color:'#34463D',borderRadius:10,padding:'11px 15px',fontWeight:700}}>Cancelar</button>
        <button type="button" onClick={onConfigure} style={{border:0,background:'#08745F',color:'#fff',borderRadius:10,padding:'11px 15px',fontWeight:800}}>Configurar nome agora</button>
      </div>
    </div>
  </div>;
}
