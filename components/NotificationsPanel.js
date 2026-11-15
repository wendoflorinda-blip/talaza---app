import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function NotificationsPanel({ userId: suppliedUserId }) {
  const router = useRouter();
  const [userId, setUserId] = useState(suppliedUserId || null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (suppliedUserId) { setUserId(suppliedUserId); return; }
    let mounted = true;
    supabase.auth.getUser().then(({data,error:authError}) => { if(!mounted)return; if(authError || !data?.user){setError('Inicia sessão para ver as notificações.');setLoading(false);return;} setUserId(data.user.id); });
    return () => { mounted = false; };
  },[suppliedUserId]);
  const loadNotifications = useCallback(async () => {
    if(!userId)return;
    const {data,error:queryError}=await supabase.from('notifications').select('id,created_at,user_id,type,title,content,is_read,link').eq('user_id',userId).order('created_at',{ascending:false}).limit(100);
    if(queryError){setError('Não foi possível carregar as notificações: '+queryError.message);setLoading(false);return;}
    setNotifications(data||[]);setError('');setLoading(false);
  },[userId]);
  useEffect(()=>{if(userId)loadNotifications();},[userId,loadNotifications]);
  useEffect(()=>{if(!userId)return;const channel=supabase.channel('talaza-notifications-'+userId).on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:'user_id=eq.'+userId},()=>loadNotifications()).subscribe();return()=>{supabase.removeChannel(channel);};},[userId,loadNotifications]);
  async function openNotification(item){
    if(!item.is_read){const {error:updateError}=await supabase.from('notifications').update({is_read:true}).eq('id',item.id).eq('user_id',userId);if(updateError){setError('Não foi possível marcar como lida: '+updateError.message);return;}setNotifications(rows=>rows.map(row=>row.id===item.id?{...row,is_read:true}:row));}
    setOpen(false);const target=String(item.link||'');if(target.startsWith('/')&&!target.startsWith('//'))router.push(target);
  }
  async function markAllAsRead(){const ids=notifications.filter(item=>!item.is_read).map(item=>item.id);if(!ids.length)return;const {error:updateError}=await supabase.from('notifications').update({is_read:true}).in('id',ids).eq('user_id',userId);if(updateError){setError(updateError.message);return;}setNotifications(rows=>rows.map(row=>({...row,is_read:true})));}
  const unreadCount=notifications.filter(item=>!item.is_read).length;
  return <div style={{position:'relative'}}>
    <button type="button" aria-label="Notificações" aria-expanded={open} onClick={()=>setOpen(value=>!value)} style={{position:'relative',width:40,height:40,border:'1px solid rgba(255,255,255,.3)',borderRadius:12,background:'rgba(255,255,255,.1)',color:'#FFFFFF',display:'grid',placeItems:'center',cursor:'pointer'}}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
      {unreadCount>0&&<span style={{position:'absolute',right:-5,top:-5,minWidth:19,height:19,padding:'0 4px',borderRadius:99,background:'#D8A319',color:'#17211F',border:'2px solid #075B4E',fontSize:10,fontWeight:900,display:'grid',placeItems:'center'}}>{unreadCount>99?'99+':unreadCount}</span>}
    </button>
    {open&&<><button type="button" aria-label="Fechar notificações" onClick={()=>setOpen(false)} style={{position:'fixed',inset:0,zIndex:80,border:0,background:'transparent'}}/>
      <section aria-label="Lista de notificações" style={{position:'absolute',right:0,top:48,zIndex:81,width:'min(360px, calc(100vw - 28px))',maxHeight:440,overflowY:'auto',background:'#FFFFFF',color:'#17211F',border:'1px solid #DCE6E1',borderRadius:15,boxShadow:'0 14px 40px rgba(0,0,0,.22)',padding:14}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:10}}><strong style={{fontSize:14}}>Notificações</strong>{unreadCount>0&&<button type="button" onClick={markAllAsRead} style={{border:0,background:'none',color:'#075B4E',fontWeight:800,fontSize:11,cursor:'pointer'}}>Marcar todas como lidas</button>}</div>
        {error&&<p role="alert" style={{fontSize:12,color:'#A52F3B'}}>{error}</p>}
        {loading?<p style={{fontSize:12,color:'#64756F'}}>A carregar…</p>:notifications.length===0?<p style={{fontSize:12,color:'#64756F'}}>Ainda não tens notificações.</p>:<div style={{display:'grid',gap:7}}>{notifications.map(item=><button key={item.id} type="button" onClick={()=>openNotification(item)} style={{width:'100%',textAlign:'left',padding:11,borderRadius:11,border:'1px solid '+(item.is_read?'#E5EBE8':'#D8B64B'),background:item.is_read?'#FFFFFF':'#FFF9E8',color:'#17211F',display:'grid',gap:5,cursor:'pointer'}}><strong style={{fontSize:12}}>{item.title||'Notificação Talaza'}</strong>{item.content&&<span style={{fontSize:11,lineHeight:1.45,color:'#52635E'}}>{item.content}</span>}<span style={{fontSize:10,color:'#89948F'}}>{item.created_at?new Date(item.created_at).toLocaleString('pt-PT'):''}{item.link?' · Abrir':''}</span></button>)}</div>}
      </section></>}
  </div>;
}