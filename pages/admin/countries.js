import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

const inputStyle={width:'100%',padding:'11px 12px',border:'1px solid #DCE5E0',borderRadius:10,fontSize:14,boxSizing:'border-box',background:'#fff',color:'#18352B'};
const labelStyle={display:'block',fontSize:12,fontWeight:800,color:'#476158',marginBottom:6};
const cardStyle={background:'#fff',border:'1px solid #E1E9E4',borderRadius:16,padding:18,marginBottom:16};
const buttonStyle={border:0,borderRadius:10,padding:'11px 15px',background:'#075B4E',color:'#fff',fontWeight:850,cursor:'pointer'};
const emptyCountry={name:'',iso2:'',iso3:'',currency_code:'',currency_symbol:'',phone_code:'',locale:''};

export default function AdminCountries(){
 const router=useRouter();
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [authorized,setAuthorized]=useState(false);
 const [countries,setCountries]=useState([]);
 const [plans,setPlans]=useState([]);
 const [prices,setPrices]=useState([]);
 const [methods,setMethods]=useState([]);
 const [selectedCountry,setSelectedCountry]=useState('');
 const [countryForm,setCountryForm]=useState(emptyCountry);
 const [priceInputs,setPriceInputs]=useState({});
 const [methodForm,setMethodForm]=useState({method_code:'',name:'',payment_type:'',currency_code:'',method_kind:'manual_proof',provider_code:'manual',instructions:'',requires_proof:true});
 const [notice,setNotice]=useState('');

 async function loadData(){
  setLoading(true);setNotice('');
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.user){router.replace('/login');return;}
  const {data:admin,error:adminError}=await supabase.from('admin_users').select('id').eq('id',session.user.id).maybeSingle();
  if(adminError||!admin){setAuthorized(false);setLoading(false);return;}
  setAuthorized(true);
  const [countryResult,planResult]=await Promise.all([
   supabase.from('countries').select('id,name,iso2,iso3,currency_code,currency_symbol,phone_code,locale,is_enabled,rollout_status').order('name'),
   supabase.from('plans').select('id,name,description,price,duration_days,plan_type,area,is_active').order('plan_type').order('name')
  ]);
  if(countryResult.error||planResult.error){setNotice('Não foi possível carregar países e planos. '+(countryResult.error?.message||planResult.error?.message));setLoading(false);return;}
  const countryRows=countryResult.data||[];setCountries(countryRows);setPlans(planResult.data||[]);
  const activeId=selectedCountry&&countryRows.some(x=>x.id===selectedCountry)?selectedCountry:countryRows[0]?.id||'';
  setSelectedCountry(activeId);
  if(activeId){
   const [priceResult,methodResult]=await Promise.all([
    supabase.from('country_plan_prices').select('id,country_id,plan_id,amount,currency_code,is_active').eq('country_id',activeId),
    supabase.from('payment_options').select('id,country_id,name,payment_type,instructions,is_active,sort_order,method_code,currency_code,method_kind,provider_code,requires_proof').eq('country_id',activeId).order('sort_order')
   ]);
   if(priceResult.error||methodResult.error) setNotice('Países carregados, mas não foi possível consultar preços ou métodos: '+(priceResult.error?.message||methodResult.error?.message));
   setPrices(priceResult.data||[]);setMethods(methodResult.data||[]);
   setPriceInputs(Object.fromEntries((priceResult.data||[]).map(x=>[x.plan_id,String(x.amount)])));
   setMethodForm(v=>({...v,currency_code:countryRows.find(x=>x.id===activeId)?.currency_code||''}));
  }
  setLoading(false);
 }
 useEffect(()=>{loadData();},[]);
 useEffect(()=>{
  if(!selectedCountry||!authorized)return;
  let cancelled=false;
  (async()=>{
   const [p,m]=await Promise.all([
    supabase.from('country_plan_prices').select('id,country_id,plan_id,amount,currency_code,is_active').eq('country_id',selectedCountry),
    supabase.from('payment_options').select('id,country_id,name,payment_type,instructions,is_active,sort_order,method_code,currency_code,method_kind,provider_code,requires_proof').eq('country_id',selectedCountry).order('sort_order')
   ]);
   if(cancelled)return;
   if(!p.error){setPrices(p.data||[]);setPriceInputs(Object.fromEntries((p.data||[]).map(x=>[x.plan_id,String(x.amount)])));}
   if(!m.error)setMethods(m.data||[]);
   const country=countries.find(x=>x.id===selectedCountry);
   if(country)setMethodForm(v=>({...v,currency_code:country.currency_code||''}));
  })();
  return()=>{cancelled=true;};
 },[selectedCountry,authorized]);
 const selected=countries.find(x=>x.id===selectedCountry)||null;
 const priceByPlan=useMemo(()=>Object.fromEntries(prices.map(x=>[x.plan_id,x])),[prices]);

 async function addCountry(e){
  e.preventDefault();setSaving(true);setNotice('');
  const row={...countryForm,name:countryForm.name.trim(),iso2:countryForm.iso2.trim().toUpperCase(),iso3:countryForm.iso3.trim().toUpperCase(),currency_code:countryForm.currency_code.trim().toUpperCase(),is_enabled:false,rollout_status:'preparing'};
  const {data,error}=await supabase.from('countries').insert(row).select('id').single();
  if(error){setNotice('Não foi possível adicionar o país: '+error.message);setSaving(false);return;}
  setCountryForm(emptyCountry);await loadData();setSelectedCountry(data.id);setNotice('País criado como Em preparação. Ainda não está disponível ao público.');
  setSaving(false);
 }
 async function savePrices(){
  if(!selected)return;setSaving(true);setNotice('');
  const rows=plans.filter(p=>priceInputs[p.id]!==undefined&&String(priceInputs[p.id]).trim()!=='').map(p=>({
   country_id:selected.id,plan_id:p.id,amount:Number(String(priceInputs[p.id]).replace(',','.')),currency_code:selected.currency_code,is_active:p.is_active!==false
  }));
  if(rows.some(x=>!Number.isFinite(x.amount)||x.amount<0)){setNotice('Revise os preços: todos devem ser números iguais ou superiores a zero.');setSaving(false);return;}
  const {error}=await supabase.from('country_plan_prices').upsert(rows,{onConflict:'country_id,plan_id'});
  if(error)setNotice('Erro ao guardar preços: '+error.message);
  else {setNotice(rows.length+' preços guardados para '+selected.name+'.');await loadData();}
  setSaving(false);
 }
 async function addMethod(e){
  e.preventDefault();if(!selected)return;setSaving(true);setNotice('');
  const row={country_id:selected.id,...methodForm,method_code:methodForm.method_code.trim().toLowerCase(),name:methodForm.name.trim(),payment_type:methodForm.payment_type.trim(),currency_code:selected.currency_code,public_details:{},is_active:true,sort_order:methods.length+1};
  const {error}=await supabase.from('payment_options').insert(row);
  if(error)setNotice('Não foi possível adicionar o método: '+error.message);
  else {setMethodForm(v=>({...v,method_code:'',name:'',payment_type:'',instructions:''}));setNotice('Método adicionado. Ainda não muda o checkout até a integração do fluxo de pagamento.');await loadData();}
  setSaving(false);
 }
 async function toggleMethod(method){
  const {error}=await supabase.from('payment_options').update({is_active:!method.is_active}).eq('id',method.id);
  if(error)setNotice('Não foi possível alterar o método: '+error.message);else{setNotice('Método atualizado.');await loadData();}
 }
 async function toggleCountry(){
  if(!selected)return;
  if(!selected.is_enabled){
   const [{count:provinceCount,error:provinceError},{count:priceCount,error:priceError},{count:methodCount,error:methodError}]=await Promise.all([
    supabase.from('provinces').select('id',{count:'exact',head:true}).eq('country_id',selected.id),
    supabase.from('country_plan_prices').select('id',{count:'exact',head:true}).eq('country_id',selected.id).eq('is_active',true),
    supabase.from('payment_options').select('id',{count:'exact',head:true}).eq('country_id',selected.id).eq('is_active',true)
   ]);
   if(provinceError||priceError||methodError){setNotice('Não foi possível validar a preparação do país.');return;}
   const activePlanCount=plans.filter(p=>p.is_active!==false).length;
   if(!provinceCount||priceCount<activePlanCount||!methodCount){setNotice('Para ativar este país, configure primeiro as províncias, os preços de todos os planos ativos e pelo menos um método de pagamento.');return;}
  }
  setSaving(true);
  const enabled=!selected.is_enabled;
  const {error}=await supabase.from('countries').update({is_enabled:enabled,rollout_status:enabled?'active':'paused'}).eq('id',selected.id);
  if(error)setNotice('Não foi possível alterar o estado: '+error.message);else{setNotice(enabled?'País ativado.':'País pausado.');await loadData();}
  setSaving(false);
 }
 if(loading)return <main style={{padding:30,fontFamily:'Arial'}}>A verificar acesso e carregar configurações…</main>;
 if(!authorized)return <main style={{padding:30,fontFamily:'Arial'}}><h1>Acesso restrito</h1><p>Esta área é exclusiva para administradores da TALAZA.</p><button style={buttonStyle} onClick={()=>router.push('/admin')}>Voltar ao painel</button></main>;
 return <main style={{minHeight:'100vh',background:'#F5F7F4',padding:'22px 16px 60px',fontFamily:'Arial,sans-serif',color:'#18352B'}}>
  <div style={{maxWidth:1100,margin:'0 auto'}}>
   <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:22}}>
    <div><div style={{fontSize:12,fontWeight:900,letterSpacing:2,color:'#B48718'}}>TALAZA COMERCIAL</div><h1 style={{fontSize:28,margin:'7px 0'}}>Países e pagamentos</h1><p style={{margin:0,color:'#687A72',fontSize:13}}>Cada país tem a sua moeda, os seus preços e os seus métodos de pagamento.</p></div>
    <button style={{...buttonStyle,background:'#E8F0EC',color:'#075B4E'}} onClick={()=>router.push('/admin')}>← Painel administrativo</button>
   </header>
   {notice&&<div role="status" style={{...cardStyle,borderColor:'#D8C28A',background:'#FFFBEB',color:'#664D13'}}>{notice}</div>}
   <section style={cardStyle}>
    <h2 style={{fontSize:18,margin:'0 0 12px'}}>Países cadastrados</h2>
    <label style={labelStyle}>Selecionar país</label>
    <select value={selectedCountry} onChange={e=>setSelectedCountry(e.target.value)} style={inputStyle}>
     {countries.map(c=><option key={c.id} value={c.id}>{c.name} · {c.currency_code||'Moeda por definir'} · {c.is_enabled?'Activo':'Em preparação'}</option>)}
    </select>
    {selected&&<div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center',marginTop:14}}>
     <div style={{flex:1,minWidth:220}}><strong>{selected.name}</strong><div style={{fontSize:12,color:'#708078',marginTop:4}}>{selected.iso2||'ISO por definir'} · {selected.currency_code||'Moeda por definir'} · {selected.phone_code||'Indicativo por definir'} · {selected.rollout_status}</div></div>
     <button type="button" disabled={saving} onClick={toggleCountry} style={{...buttonStyle,background:selected.is_enabled?'#8A3B36':'#075B4E'}}>{selected.is_enabled?'Pausar país':'Activar país'}</button>
    </div>}
   </section>
   <section style={cardStyle}>
    <h2 style={{fontSize:18,margin:'0 0 6px'}}>Adicionar país</h2><p style={{fontSize:12,color:'#718078',margin:'0 0 14px'}}>O país fica em preparação até ter províncias, preços e métodos configurados.</p>
    <form onSubmit={addCountry} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}>
     {[
      ['name','Nome do país','ex.: Portugal'],['iso2','ISO 2','PT'],['iso3','ISO 3','PRT'],['currency_code','Moeda ISO','EUR'],['currency_symbol','Símbolo','€'],['phone_code','Indicativo','+351'],['locale','Idioma/região','pt-PT']
     ].map(([key,label,placeholder])=><label key={key}><span style={labelStyle}>{label}</span><input required value={countryForm[key]} placeholder={placeholder} onChange={e=>setCountryForm(v=>({...v,[key]:e.target.value}))} style={inputStyle}/></label>)}
     <div style={{display:'flex',alignItems:'end'}}><button disabled={saving} style={buttonStyle}>Adicionar país</button></div>
    </form>
   </section>
   {selected&&<section style={cardStyle}>
    <h2 style={{fontSize:18,margin:'0 0 6px'}}>Preços dos planos — {selected.name} ({selected.currency_code})</h2>
    <p style={{fontSize:12,color:'#718078',margin:'0 0 14px'}}>Os valores são introduzidos manualmente por país. Não fazemos conversão cambial automática.</p>
    <div style={{display:'grid',gap:9}}>
     {plans.map(plan=><div key={plan.id} style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(130px,190px)',gap:12,alignItems:'center',padding:'9px 0',borderBottom:'1px solid #EDF1EE'}}>
      <div><strong style={{fontSize:13}}>{plan.name}</strong><div style={{fontSize:11,color:'#718078'}}>{plan.plan_type} · {plan.duration_days} dias · {plan.is_active?'Activo':'Inactivo'} · Base Angola: {Number(plan.price).toLocaleString('pt-AO')} Kz</div></div>
      <input aria-label={'Preço '+plan.name+' em '+selected.currency_code} inputMode="decimal" placeholder={'Preço ('+selected.currency_code+')'} value={priceInputs[plan.id]??''} onChange={e=>setPriceInputs(v=>({...v,[plan.id]:e.target.value}))} style={inputStyle}/>
     </div>)}
    </div>
    <button disabled={saving} onClick={savePrices} style={{...buttonStyle,marginTop:16}}>{saving?'A guardar…':'Guardar preços deste país'}</button>
   </section>}
   {selected&&<section style={cardStyle}>
    <h2 style={{fontSize:18,margin:'0 0 6px'}}>Métodos de pagamento — {selected.name}</h2>
    <p style={{fontSize:12,color:'#718078',margin:'0 0 14px'}}>Nunca introduza chaves secretas nesta área. Credenciais de gateways serão guardadas apenas em variáveis privadas do servidor.</p>
    <form onSubmit={addMethod} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
     {[
      ['method_code','Código único','ex.: bank_transfer'],['name','Nome apresentado','ex.: Transferência bancária'],['payment_type','Tipo legado','ex.: bank'],['provider_code','Fornecedor','manual']
     ].map(([key,label,placeholder])=><label key={key}><span style={labelStyle}>{label}</span><input required value={methodForm[key]} placeholder={placeholder} onChange={e=>setMethodForm(v=>({...v,[key]:e.target.value}))} style={inputStyle}/></label>)}
     <label><span style={labelStyle}>Modelo</span><select value={methodForm.method_kind} onChange={e=>setMethodForm(v=>({...v,method_kind:e.target.value}))} style={inputStyle}><option value="manual_proof">Comprovativo manual</option><option value="bank_transfer">Transferência bancária</option><option value="wallet">Carteira digital</option><option value="hosted_checkout">Checkout do fornecedor</option></select></label>
     <label><span style={labelStyle}>Instruções públicas</span><input value={methodForm.instructions} onChange={e=>setMethodForm(v=>({...v,instructions:e.target.value}))} style={inputStyle}/></label>
     <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13}}><input type="checkbox" checked={methodForm.requires_proof} onChange={e=>setMethodForm(v=>({...v,requires_proof:e.target.checked}))}/> Exige comprovativo</label>
     <div style={{display:'flex',alignItems:'end'}}><button disabled={saving} style={buttonStyle}>Adicionar método</button></div>
    </form>
    <div style={{display:'grid',gap:8,marginTop:16}}>
     {methods.map(method=><div key={method.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',padding:12,border:'1px solid #E7ECE8',borderRadius:12}}>
      <div><strong>{method.name}</strong><div style={{fontSize:11,color:'#718078'}}>{method.method_code||method.payment_type} · {method.method_kind} · {method.currency_code||selected.currency_code}</div></div>
      <button type="button" onClick={()=>toggleMethod(method)} style={{...buttonStyle,background:method.is_active?'#8A3B36':'#075B4E'}}>{method.is_active?'Desactivar':'Activar'}</button>
     </div>)}
    </div>
   </section>}
   <p style={{fontSize:12,color:'#7C8982',lineHeight:1.6}}>A configuração administrativa de países e preços não ativa automaticamente o checkout internacional. O fluxo público só deve ser alterado depois de validar os métodos, as regras de segurança e a confirmação de pagamentos de cada país.</p>
  </div>
 </main>;
}
