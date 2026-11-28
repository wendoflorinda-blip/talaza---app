import { requireMainAdmin } from '../../../lib/adminStoreAccess';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  const auth = await requireMainAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  try {
    const [{ data: businesses, error: businessError }, { data: conversations, error: conversationError }] = await Promise.all([
      auth.supabase.from('businesses').select('id,name,owner_id,country_id,province_id').order('name').limit(1000),
      auth.supabase.from('conversations').select('id,source,source_id,publisher_business_id,created_at,updated_at').order('updated_at',{ascending:false}).limit(1000),
    ]);
    if (businessError) throw businessError;
    if (conversationError) throw conversationError;
    const businessRows=businesses||[];
    const businessIds=new Set(businessRows.map(row=>String(row.id)));
    const relevant=(conversations||[]).filter(row=>businessIds.has(String(row.publisher_business_id||'')) || businessIds.has(String(row.source_id||'')));
    const ids=relevant.map(row=>row.id);
    if(!ids.length) return res.status(200).json({ businesses: businessRows, threads: [] });
    const [{data:messages,error:messagesError},{data:participants,error:participantsError}] = await Promise.all([
      auth.supabase.from('talaza_messages').select('id,conversation_id,sender_id,body,message_type,created_at,attachment_name,storage_path').in('conversation_id',ids).order('created_at',{ascending:true}).limit(5000),
      auth.supabase.from('conversation_participants').select('conversation_id,user_id,joined_at').in('conversation_id',ids),
    ]);
    if(messagesError) throw messagesError;
    if(participantsError) throw participantsError;
    const userIds=[...new Set((participants||[]).map(row=>row.user_id).filter(Boolean))];
    const {data:profiles,error:profilesError}=userIds.length
      ? await auth.supabase.from('profiles_public').select('id,display_name,avatar').in('id',userIds)
      : {data:[],error:null};
    if(profilesError) throw profilesError;
    const profileMap=new Map((profiles||[]).map(row=>[String(row.id),row]));
    const businessMap=new Map(businessRows.map(row=>[String(row.id),row]));
    const threads=relevant.map(conversation=>{
      const businessId=conversation.publisher_business_id||conversation.source_id;
      const business=businessMap.get(String(businessId));
      return {
        conversationId:conversation.id,
        businessId,
        businessName:business?.name||'Loja Talaza',
        source:conversation.source||'',
        created_at:conversation.created_at,
        updated_at:conversation.updated_at,
        participants:(participants||[]).filter(row=>row.conversation_id===conversation.id).map(row=>({user_id:row.user_id,name:profileMap.get(String(row.user_id))?.display_name||'Utilizador Talaza',avatar_url:profileMap.get(String(row.user_id))?.avatar||null})),
        messages:(messages||[]).filter(row=>row.conversation_id===conversation.id).map(row=>({...row,sender_name:profileMap.get(String(row.sender_id))?.display_name||'Utilizador Talaza'})),
      };
    }).filter(thread=>thread.messages.length>0);
    return res.status(200).json({ businesses:businessRows, threads });
  } catch(error) {
    console.error('Admin all-store conversations error:',JSON.stringify({code:error?.code||null,message:error?.message||null,details:error?.details||null}));
    return res.status(500).json({error:'Não foi possível carregar as conversas das lojas.'});
  }
}
