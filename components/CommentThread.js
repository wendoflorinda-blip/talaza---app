import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export default function CommentThread({ type, targetId, comments = [], userId, onRefresh, compact = false }) {
  const [reactions, setReactions] = useState([]);
  const [replyTo, setReplyTo] = useState('');
  const [replyDraft, setReplyDraft] = useState('');
  const [pickerFor, setPickerFor] = useState('');
  const [busy, setBusy] = useState('');

  const commentIds = useMemo(() => comments.map((item) => item.id), [comments]);

  async function loadReactions() {
    if (!commentIds.length) { setReactions([]); return; }
    const { data, error } = await supabase
      .from('comment_reactions')
      .select('id,comment_id,user_id,emoji')
      .eq('comment_type', type)
      .in('comment_id', commentIds);
    if (!error) setReactions(data || []);
  }

  useEffect(() => { loadReactions(); }, [type, targetId, comments.length, commentIds.join(',')]);

  const childrenByParent = useMemo(() => comments.reduce((acc, item) => {
    const key = item.parent_id || 'root';
    (acc[key] ||= []).push(item);
    return acc;
  }, {}), [comments]);

  async function react(comment, emoji) {
    if (!userId) return;
    setBusy('reaction:' + comment.id);
    const mine = reactions.find((item) => item.comment_id === comment.id && item.user_id === userId);
    let result;
    if (mine?.emoji === emoji) {
      result = await supabase.from('comment_reactions').delete().eq('id', mine.id).eq('user_id', userId);
    } else if (mine) {
      result = await supabase.from('comment_reactions').update({ emoji }).eq('id', mine.id).eq('user_id', userId);
    } else {
      result = await supabase.from('comment_reactions').insert({ comment_type: type, comment_id: comment.id, user_id: userId, emoji });
    }
    setBusy('');
    if (result.error) { window.alert('Não foi possível guardar a reação: ' + result.error.message); return; }
    await loadReactions();
  }

  async function sendReply(parent) {
    if (!userId || replyDraft.trim().length < 1) return;
    setBusy('reply:' + parent.id);
    const table = type === 'event' ? 'event_comments' : 'community_comments';
    const payload = type === 'event'
      ? { event_id: targetId, parent_id: parent.id, user_id: userId, content: replyDraft.trim(), status: 'published' }
      : { post_id: targetId, parent_id: parent.id, user_id: userId, content: replyDraft.trim(), status: 'published' };
    const { error } = await supabase.from(table).insert(payload);
    setBusy('');
    if (error) { window.alert('Não foi possível responder: ' + error.message); return; }
    setReplyDraft('');
    setReplyTo('');
    await onRefresh?.();
  }

  function renderComment(comment, nested = false) {
    const ownReactions = reactions.filter((item) => item.comment_id === comment.id);
    const myReaction = ownReactions.find((item) => item.user_id === userId);
    const counts = EMOJIS.map((emoji) => ({ emoji, count: ownReactions.filter((item) => item.emoji === emoji).length })).filter((item) => item.count);
    const replies = childrenByParent[comment.id] || [];
    return <div key={comment.id} style={{ marginLeft: nested ? 22 : 0, padding: '10px 0', borderBottom: '1px solid #E7ECE9' }}>
      <div style={{ background: nested ? '#F7F8F7' : '#FFFFFF', borderRadius: 12, padding: 10 }}>
        <p style={{ margin: 0, color: '#23332E', fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{comment.content}</p>
        <small style={{ color: '#84918B' }}>{comment.created_at ? new Date(comment.created_at).toLocaleString('pt-AO') : ''}</small>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 7 }}>
          <button type="button" disabled={!userId || busy === 'reaction:' + comment.id} onClick={() => setPickerFor(pickerFor === comment.id ? '' : comment.id)} style={{ border: 0, background: 'transparent', color: '#53635D', fontWeight: 700, cursor: userId ? 'pointer' : 'default', padding: '4px 2px' }}>{myReaction ? myReaction.emoji + ' Reagir' : '☺ Reagir'}</button>
          <button type="button" disabled={!userId} onClick={() => { setReplyTo(replyTo === comment.id ? '' : comment.id); setReplyDraft(''); }} style={{ border: 0, background: 'transparent', color: '#53635D', fontWeight: 700, cursor: userId ? 'pointer' : 'default', padding: '4px 2px' }}>↩ Responder</button>
          {counts.map((item) => <span key={item.emoji} style={{ fontSize: 12, color: '#53635D' }}>{item.emoji} {item.count}</span>)}
        </div>
        {pickerFor === comment.id && <div style={{ display: 'flex', gap: 5, padding: '7px 9px', marginTop: 5, width: 'fit-content', background: '#FFFFFF', border: '1px solid #E1E7E3', borderRadius: 99, boxShadow: '0 5px 18px rgba(0,0,0,.08)' }}>
          {EMOJIS.map((emoji) => <button key={emoji} type="button" aria-label={'Reagir com ' + emoji} onClick={() => { setPickerFor(''); react(comment, emoji); }} style={{ border: 0, background: myReaction?.emoji === emoji ? '#E8F3EF' : 'transparent', borderRadius: 99, padding: 4, fontSize: 20, cursor: 'pointer' }}>{emoji}</button>)}
        </div>}
        {replyTo === comment.id && <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
          <input value={replyDraft} onChange={(event) => setReplyDraft(event.target.value)} maxLength={2000} placeholder="Escreve uma resposta…" style={{ minWidth: 0, flex: 1, padding: 9, border: '1px solid #DCE4DF', borderRadius: 9 }} />
          <button type="button" disabled={!replyDraft.trim() || busy === 'reply:' + comment.id} onClick={() => sendReply(comment)} style={{ border: 0, borderRadius: 9, padding: '8px 12px', background: '#0F6E5C', color: '#FFFFFF', fontWeight: 800 }}>{busy === 'reply:' + comment.id ? '…' : 'Enviar'}</button>
        </div>}
      </div>
      {replies.map((reply) => renderComment(reply, true))}
    </div>;
  }

  const roots = childrenByParent.root || [];
  return <div style={{ marginTop: compact ? 4 : 10 }}>
    {roots.length ? roots.map((comment) => renderComment(comment)) : <p style={{ color: '#77847E', fontSize: 12 }}>Ainda não há comentários. Sê a primeira pessoa a comentar.</p>}
  </div>;
}
