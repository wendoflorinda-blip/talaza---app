
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const C = {
  green: '#0F6E5C',
  dark: '#083F35',
  deep: '#062F29',
  greenSoft: '#E8F3F0',
  gold: '#DDA10A',
  goldSoft: '#FBF1D7',
  purple: '#7252B8',
  purpleSoft: '#F1ECFA',
  ink: '#17211F',
  muted: '#596560',
  faint: '#89948F',
  bg: '#F8F6F3',
  white: '#FFFFFF',
  line: '#E5E9E7',
  red: '#B93845',
  redSoft: '#FCEBED',
};

const AREAS = [
  {
    id: 'question',
    db: 'question',
    name: 'Pergunta',
    description:
      'Apresente a sua questão com clareza e receba contributos, experiências e sugestões de outros membros da comunidade.',
    icon: '❔',
  },
  {
    id: 'search',
    db: 'lost_person',
    name: 'Procura-se',
    description:
      'Divulgue informações úteis sobre uma pessoa desaparecida ou perdida. Uma imagem pode ajudar na identificação, desde que tenha autorização para a partilhar.',
    icon: '🔎',
  },
  {
    id: 'found',
    db: 'found_item',
    name: 'Achei!',
    description:
      'Registe uma pessoa perdida ou um objeto encontrado para facilitar a devolução ao respetivo responsável. Evite expor dados pessoais sensíveis.',
    icon: '💛',
  },
  {
    id: 'motivation',
    name: 'Motivação',
    description:
      'Mensagens editoriais da Talaza, preparadas para promover reflexão, confiança e bem-estar. Apenas a equipa autorizada pode publicar nesta área.',
    icon: '💜',
  },
  {
    id: 'theme',
    name: 'Tema do mês',
    description:
      'Uma conversa orientada por um tema mensal e uma pergunta semanal, para partilhar perspetivas e aprender em conjunto.',
    icon: '🌿',
  },
];

function Panel({ children, style = {} }) {
  return (
    <section
      style={{
        background: C.white,
        border: `1px solid ${C.line}`,
        borderRadius: 20,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function Pill({ children, color = C.greenSoft, textColor = C.green }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 10px',
        borderRadius: 999,
        background: color,
        color: textColor,
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {children}
    </span>
  );
}

export default function Comunidade() {
  const router = useRouter();

  const countryParam = router.query.country;
  const provinceParam = router.query.province;

  const [user, setUser] = useState(null);
  const [countryId, setCountryId] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');

  const [panel, setPanel] = useState('province');
  const [area, setArea] = useState('question');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('province');
  const [duration, setDuration] = useState(7);
  const [showComposer, setShowComposer] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [extras, setExtras] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [officialContent, setOfficialContent] = useState([]);
  const [officialLoading, setOfficialLoading] = useState(false);
  const [officialInteractions, setOfficialInteractions] = useState({});
  const [officialCommentDrafts, setOfficialCommentDrafts] = useState({});

  const currentArea = AREAS.find((item) => item.id === area);

  useEffect(() => {
    if (!router.isReady) return;

    let cancelled = false;

    async function loadContext() {
      setLoading(true);
      setMessage('');

      const { data: authData } = await supabase.auth.getUser();

      if (cancelled) return;

      setUser(authData?.user || null);

      if (countryParam) {
        const { data } = await supabase
          .from('countries')
          .select('id, name')
          .or(`id.eq.${countryParam},name.eq.${countryParam}`)
          .limit(1)
          .maybeSingle();

        if (!cancelled && data) {
          setCountryId(data.id);
          setCountryName(data.name);
        }
      }

      if (provinceParam) {
        const { data } = await supabase
          .from('provinces')
          .select('id, name, country_id')
          .or(`id.eq.${provinceParam},name.eq.${provinceParam}`)
          .limit(1)
          .maybeSingle();

        if (!cancelled && data) {
          setProvinceId(data.id);
          setProvinceName(data.name);

          if (!countryParam && data.country_id) {
            const { data: country } = await supabase
              .from('countries')
              .select('id, name')
              .eq('id', data.country_id)
              .maybeSingle();

            if (!cancelled && country) {
              setCountryId(country.id);
              setCountryName(country.name);
            }
          }
        }
      }

      // A Comunidade Talaza pertence sempre à província principal do perfil,
      // mesmo quando o explorador está a navegar noutra província na Vitrine.
      if (authData?.user) {
        const { data: homeProfile, error: homeProfileError } = await supabase
          .from('profiles')
          .select('country_id, province_id')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (!cancelled && !homeProfileError && homeProfile?.country_id && homeProfile?.province_id) {
          const [{ data: homeCountry }, { data: homeProvince }] = await Promise.all([
            supabase.from('countries').select('id, name').eq('id', homeProfile.country_id).maybeSingle(),
            supabase.from('provinces').select('id, name, country_id').eq('id', homeProfile.province_id).maybeSingle(),
          ]);
          if (!cancelled) {
            setCountryId(homeProfile.country_id);
            setProvinceId(homeProfile.province_id);
            setCountryName(homeCountry?.name || '');
            setProvinceName(homeProvince?.name || '');
          }
        }
      }

      setLoading(false);
    }

    loadContext();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, countryParam, provinceParam]);

  const loadPosts = useCallback(async () => {
    if (!countryId || !area || area === 'motivation' || area === 'theme') {
      setPosts([]);
      return;
    }

    setLoading(true);
    setMessage('');

    let query = supabase
      .from('community_posts')
      .select(
        'id, created_at, user_id, country_id, province_id, post_type, title, content, image_url, scope, duration_days, expires_at, status, moderation_status'
      )
      .eq('country_id', countryId)
      .eq('post_type', currentArea?.db)
      .eq('status', 'published')
      .eq('moderation_status', 'approved')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (panel === 'province') {
      if (!provinceId) {
        setPosts([]);
        setLoading(false);
        return;
      }

      query = query.eq('scope', 'province').eq('province_id', provinceId);
    } else {
      query = query.eq('scope', 'country');
    }

    const { data, error } = await query;

    if (error) {
      setMessage(
        'Não foi possível carregar as publicações. Confirma as tabelas e as políticas de segurança no Supabase.'
      );
      setPosts([]);
    } else {
      const visiblePosts = data || [];
      setPosts(visiblePosts);

      if (visiblePosts.length) {
        const ids = visiblePosts.map((post) => post.id);

        const [likesResult, favoritesResult, commentsResult] =
          await Promise.all([
            supabase
              .from('community_likes')
              .select('id, post_id, user_id')
              .in('post_id', ids),

            user
              ? supabase
                  .from('community_favorites')
                  .select('id, post_id')
                  .eq('user_id', user.id)
                  .in('post_id', ids)
              : Promise.resolve({ data: [], error: null }),

            supabase
              .from('community_comments')
              .select('id, post_id, user_id, content, created_at')
              .in('post_id', ids)
              .eq('status', 'published')
              .order('created_at', { ascending: true }),
          ]);

        const nextExtras = {};

        visiblePosts.forEach((post) => {
          const postLikes = (likesResult.data || []).filter(
            (item) => item.post_id === post.id
          );

          nextExtras[post.id] = {
            likes: postLikes.length,
            liked: Boolean(
              user && postLikes.some((item) => item.user_id === user.id)
            ),
            favorite: Boolean(
              user &&
                (favoritesResult.data || []).some(
                  (item) => item.post_id === post.id
                )
            ),
            comments: (commentsResult.data || []).filter(
              (item) => item.post_id === post.id
            ),
          };
        });

        setExtras((previous) => ({ ...previous, ...nextExtras }));
      } else {
        setExtras({});
      }
    }

    setLoading(false);
  }, [countryId, provinceId, panel, area, currentArea?.db, user]);

  useEffect(() => {
    if (router.isReady) loadPosts();
  }, [router.isReady, loadPosts]);

  // Conteúdos oficiais são publicados pela administração em tabelas próprias.
  // Carregá-los diretamente daqui faz com que apareçam na Comunidade Talaza.
  useEffect(() => {
    if (!router.isReady || (area !== 'motivation' && area !== 'theme')) return;

    let cancelled = false;

    async function loadOfficialContent() {
      setOfficialLoading(true);
      setOfficialContent([]);
      setMessage('');

      if (area === 'motivation') {
        const { data, error } = await supabase
          .from('community_motivation')
          .select('id, created_at, title, content, image_url, background_color, background_gradient, background_image_url, text_color, font_family, aspect_ratio, duration_days, expires_at')
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });

        if (cancelled) return;

        if (error) {
          setOfficialContent([]);
          setMessage('Não foi possível carregar a motivação oficial: ' + error.message);
        } else {
          const items = data || [];
          setOfficialContent(items);
          await loadOfficialInteractions(items, 'motivation');
        }
      } else {
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from('community_monthly_themes')
          .select('id, created_at, month_title, month_description, week_title, week_description, week_number, starts_at, ends_at, background_color, background_gradient, background_image_url, text_color, font_family, duration_days')
          .eq('is_active', true)
          .lte('starts_at', now)
          .gt('ends_at', now)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          setOfficialContent([]);
          setMessage('Não foi possível carregar o tema oficial: ' + error.message);
        } else {
          const items = data ? [data] : [];
          setOfficialContent(items);
          await loadOfficialInteractions(items, 'theme');
        }
      }

      if (!cancelled) setOfficialLoading(false);
    }

    loadOfficialContent();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, area, user?.id]);

  function openArea(nextArea) {
    setArea(nextArea);
    setShowComposer(false);
    setContent('');
    setTitle('');
    setImageFile(null);
    setMessage('');
  }

  async function publishPost(event) {
    event.preventDefault();
    setMessage('');

    if (!user) {
      const next = `/comunidade?country=${encodeURIComponent(
        countryParam || countryId
      )}&province=${encodeURIComponent(provinceParam || provinceId)}`;

      router.push(`/login?redirect=${encodeURIComponent(next)}`);
      return;
    }

    if (!countryId) {
      setMessage('Não foi possível identificar o país desta Comunidade.');
      return;
    }

    if (scope === 'province' && !provinceId) {
      setMessage('Não foi possível identificar a província atual.');
      return;
    }

    if (content.trim().length < 8) {
      setMessage('Escreva uma descrição um pouco mais completa.');
      return;
    }

    if (area !== 'question' && !title.trim()) {
      setMessage('Preencha o título da publicação.');
      return;
    }

    if (
      imageFile &&
      (!imageFile.type.startsWith('image/') ||
        imageFile.size > 5 * 1024 * 1024)
    ) {
      setMessage('Escolha uma imagem válida com tamanho máximo de 5 MB.');
      return;
    }

    setSending(true);

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + duration * 24 * 60 * 60 * 1000
    );

    let imageUrl = null;

    try {
      imageUrl = await uploadCommunityImage();
    } catch (uploadError) {
      setSending(false);
      setMessage(
        'Não foi possível carregar a imagem. Confirma se o bucket community-posts existe e permite este envio.'
      );
      return;
    }

    const { error } = await supabase.from('community_posts').insert({
      user_id: user.id,
      country_id: countryId,
      province_id: scope === 'province' ? provinceId : null,
      post_type: currentArea.db,
      title: title.trim() || null,
      content: content.trim(),
      image_url: imageUrl,
      scope,
      duration_days: duration,
      expires_at: expiresAt.toISOString(),
      status: 'published',
      moderation_status: 'pending',
    });

    setSending(false);

    if (error) {
      setMessage(
        'Não foi possível enviar. Confirma se as colunas e as políticas de segurança já estão configuradas.'
      );
      return;
    }

    setMessage(
      'A publicação foi enviada para análise da equipa Talaza. Aparecerá no painel depois de aprovada.'
    );

    setContent('');
    setTitle('');
    setImageFile(null);
    setShowComposer(false);
    await loadPosts();
  }

  async function uploadCommunityImage() {
    if (!imageFile) return null;

    const safeName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `${user.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('community-posts')
      .upload(path, imageFile, {
        upsert: false,
        contentType: imageFile.type,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('community-posts')
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async function toggleLike(post) {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    const state = extras[post.id] || {};

    if (state.liked) {
      const { error } = await supabase
        .from('community_likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);

      if (error) {
        setMessage(
          'Não foi possível retirar o gosto. Confirma as policies de community_likes.'
        );
        return;
      }
    } else {
      const { error } = await supabase.from('community_likes').insert({
        post_id: post.id,
        user_id: user.id,
      });

      if (error) {
        setMessage(
          'Não foi possível gostar da publicação. Confirma as policies de community_likes.'
        );
        return;
      }
    }

    setExtras((previous) => ({
      ...previous,
      [post.id]: {
        ...state,
        liked: !state.liked,
        likes: Math.max(
          0,
          (state.likes || 0) + (state.liked ? -1 : 1)
        ),
      },
    }));
  }

  async function toggleFavorite(post) {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    const state = extras[post.id] || {};

    if (state.favorite) {
      const { error } = await supabase
        .from('community_favorites')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);

      if (error) {
        setMessage(
          'Não foi possível remover dos favoritos. Confirma as policies de community_favorites.'
        );
        return;
      }
    } else {
      const { error } = await supabase.from('community_favorites').insert({
        post_id: post.id,
        user_id: user.id,
      });

      if (error) {
        setMessage(
          'Não foi possível guardar nos favoritos. Confirma as policies de community_favorites.'
        );
        return;
      }
    }

    setExtras((previous) => ({
      ...previous,
      [post.id]: {
        ...state,
        favorite: !state.favorite,
      },
    }));
  }

  async function submitComment(post) {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    const draft = (commentDrafts[post.id] || '').trim();

    if (draft.length < 2) {
      setMessage('Escreva um comentário antes de enviar.');
      return;
    }

    const { data, error } = await supabase
      .from('community_comments')
      .insert({
        post_id: post.id,
        user_id: user.id,
        content: draft,
        status: 'published',
      })
      .select('id, post_id, user_id, content, created_at')
      .single();

    if (error) {
      setMessage(
        'Não foi possível publicar o comentário. Confirma as policies de community_comments.'
      );
      return;
    }

    setExtras((previous) => ({
      ...previous,
      [post.id]: {
        ...(previous[post.id] || {}),
        comments: [
          ...((previous[post.id] || {}).comments || []),
          data,
        ],
      },
    }));

    setCommentDrafts((previous) => ({
      ...previous,
      [post.id]: '',
    }));
  }

  async function loadOfficialInteractions(items, kind) {
    if (!items || !items.length) { setOfficialInteractions({}); return; }
    const ids = items.map((item) => item.id);
    const [likesResult, commentsResult] = await Promise.all([
      supabase.from('community_official_likes').select('id, official_id, user_id').eq('official_type', kind).in('official_id', ids),
      supabase.from('community_official_comments').select('id, official_type, official_id, user_id, content, created_at').eq('official_type', kind).in('official_id', ids).order('created_at', { ascending: true }),
    ]);
    if (likesResult.error || commentsResult.error) {
      setMessage('Não foi possível carregar os gostos ou comentários oficiais: ' + (likesResult.error?.message || commentsResult.error?.message || 'erro de acesso'));
      setOfficialInteractions({});
      return;
    }
    const next = {};
    items.forEach((item) => {
      const likes = (likesResult.data || []).filter((like) => like.official_id === item.id);
      next[item.id] = { likes: likes.length, liked: Boolean(user && likes.some((like) => like.user_id === user.id)), comments: (commentsResult.data || []).filter((comment) => comment.official_id === item.id) };
    });
    setOfficialInteractions(next);
  }

  async function toggleOfficialLike(item, kind) {
    if (!user) { router.push('/login?redirect=' + encodeURIComponent(router.asPath)); return; }
    const state = officialInteractions[item.id] || {};
    if (state.liked) {
      const { error } = await supabase.from('community_official_likes').delete().eq('official_type', kind).eq('official_id', item.id).eq('user_id', user.id);
      if (error) { setMessage('Não foi possível retirar o gosto da publicação oficial: ' + error.message); return; }
      setOfficialInteractions((previous) => ({ ...previous, [item.id]: { ...state, liked: false, likes: Math.max(0, (state.likes || 0) - 1) } }));
    } else {
      const { error } = await supabase.from('community_official_likes').insert({ official_type: kind, official_id: item.id, user_id: user.id });
      if (error) { setMessage('Não foi possível gostar da publicação oficial: ' + error.message); return; }
      setOfficialInteractions((previous) => ({ ...previous, [item.id]: { ...state, liked: true, likes: (state.likes || 0) + 1 } }));
    }
  }

  async function submitOfficialComment(item, kind) {
    if (!user) { router.push('/login?redirect=' + encodeURIComponent(router.asPath)); return; }
    const draft = (officialCommentDrafts[item.id] || '').trim();
    if (draft.length < 2) { setMessage('Escreva um comentário com pelo menos 2 caracteres.'); return; }
    const { data, error } = await supabase.from('community_official_comments').insert({ official_type: kind, official_id: item.id, user_id: user.id, content: draft }).select('id, official_type, official_id, user_id, content, created_at').single();
    if (error) { setMessage('Não foi possível publicar o comentário: ' + error.message); return; }
    setOfficialInteractions((previous) => ({ ...previous, [item.id]: { ...(previous[item.id] || {}), comments: [...((previous[item.id] || {}).comments || []), data] } }));
    setOfficialCommentDrafts((previous) => ({ ...previous, [item.id]: '' })); setMessage('');
  }
  async function reportPost(post) {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    const reason = window.prompt(
      'Indique o motivo da denúncia (ex.: informação falsa, conteúdo inadequado, risco para alguém):'
    );

    if (!reason || !reason.trim()) return;

    const { error } = await supabase.from('community_reports').insert({
      post_id: post.id,
      comment_id: null,
      reporter_id: user.id,
      reason: reason.trim().slice(0, 200),
      status: 'pending',
    });

    setMessage(
      error
        ? 'Não foi possível enviar a denúncia. Confirma as policies de community_reports.'
        : 'Denúncia enviada para análise da equipa Talaza.'
    );
  }

  const buttonStyle = {
    border: 0,
    borderRadius: 999,
    padding: '11px 15px',
    fontWeight: 800,
    cursor: 'pointer',
    fontSize: 13,
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        width: '100%',
        background: C.bg,
        color: C.ink,
        fontFamily:
          'Inter, Manrope, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <style jsx global>{`
        html,
        body,
        #__next {
          margin: 0;
          padding: 0;
          min-height: 100%;
          width: 100%;
          background: ${C.bg};
        }

        * {
          box-sizing: border-box;
        }

        button,
        input,
        textarea,
        select {
          font: inherit;
        }

        button:focus-visible,
        input:focus-visible,
        textarea:focus-visible,
        select:focus-visible {
          outline: 3px solid ${C.purple};
          outline-offset: 2px;
        }
      `}</style>

      <div
        style={{
          maxWidth: 850,
          width: '100%',
          margin: '0 auto',
          padding: '18px 16px 50px',
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <Link
            href={`/explore?country=${encodeURIComponent(
              countryParam || countryId
            )}&province=${encodeURIComponent(provinceParam || provinceId)}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '14px 14px 14px 5px',
                  background: C.green,
                  color: C.gold,
                  fontWeight: 900,
                  fontSize: 25,
                }}
              >
                T
              </div>

              <div>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 22,
                    color: C.dark,
                    letterSpacing: '-0.7px',
                  }}
                >
                  Talaza
                </div>

                <div style={{ color: C.muted, fontSize: 12 }}>
                  Comunidade
                </div>
              </div>
            </div>
          </Link>

          <Pill color={C.purpleSoft} textColor={C.purple}>
            {panel === 'province'
              ? provinceName || 'Província'
              : countryName || 'Painel nacional'}
          </Pill>
          <Link
            href={`/explore?country=${encodeURIComponent(countryParam || countryId || '')}&province=${encodeURIComponent(provinceParam || provinceId || '')}`}
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '9px 12px',
              borderRadius: 10,
              border: '1px solid #D9C6E9',
              background: '#F1ECFA',
              color: '#7252B8',
              fontSize: 12,
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            ← Voltar à Vitrine
          </Link>
        </header>

        <section
          style={{
            background: C.dark,
            color: C.white,
            borderRadius: 22,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: C.gold }}>
            PERGUNTAR · PARTILHAR · AJUDAR
          </div>

          <h1
            style={{
              fontSize: 'clamp(25px, 5vw, 34px)',
              lineHeight: 1.15,
              letterSpacing: '-1px',
              margin: '9px 0',
            }}
          >
            Comunidade Talaza
          </h1>

          <p
            style={{
              color: '#E0EBE7',
              fontSize: 14,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Uma comunidade para esclarecer dúvidas, ajudar quem precisa e
            partilhar palavras que fazem bem.
          </p>

          <button
            type="button"
            onClick={() =>
              setPanel((current) =>
                current === 'province' ? 'country' : 'province'
              )
            }
            style={{
              ...buttonStyle,
              marginTop: 16,
              background: panel === 'province' ? C.gold : C.purple,
              color: C.white,
            }}
          >
            {panel === 'province'
              ? '🌍 Ir ao painel nacional →'
              : `← Voltar a ${provinceName || 'minha província'}`}
          </button>
        </section>

        <nav
          aria-label="Espaços da Comunidade"
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 12,
            marginBottom: 4,
          }}
        >
          {AREAS.map((item) => {
            const selected = area === item.id;

            return (
              <button
                type="button"
                key={item.id}
                onClick={() => openArea(item.id)}
                style={{
                  ...buttonStyle,
                  whiteSpace: 'nowrap',
                  background: selected ? C.purple : C.white,
                  color: selected ? C.white : C.muted,
                  border: `1px solid ${selected ? C.purple : C.line}`,
                }}
              >
                {item.icon} {item.name}
              </button>
            );
          })}
        </nav>

        <Panel
          style={{
            background: area === 'motivation' ? C.purpleSoft : C.white,
            marginBottom: 14,
          }}
        >
          <div style={{ color: C.purple, fontSize: 13, fontWeight: 900 }}>
            {currentArea?.icon} {currentArea?.name.toUpperCase()}
          </div>

          <h2
            style={{
              fontSize: 22,
              lineHeight: 1.25,
              color: C.dark,
              margin: '8px 0',
            }}
          >
            {area === 'question'
              ? 'A sua pergunta pode ajudar mais alguém.'
              : area === 'search'
              ? 'Vamos ajudar a encontrar.'
              : area === 'found'
              ? 'Ajude algo ou alguém a voltar ao seu responsável.'
              : area === 'motivation'
              ? 'Uma palavra pode mudar o dia.'
              : 'Um tema para conversarmos juntos.'}
          </h2>

          <p
            style={{
              color: C.muted,
              fontSize: 14,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {currentArea?.description}
          </p>

          {area === 'search' && (
            <div
              style={{
                marginTop: 13,
                padding: 12,
                borderRadius: 12,
                background: C.goldSoft,
                color: '#674B10',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <strong>Utilização responsável</strong>
              <br />
              Esta área destina-se a pessoas desaparecidas ou perdidas. Não
              serve para procurar médicos, clínicas, produtos ou serviços.
              Evite publicar documentos, moradas particulares ou outros dados
              sensíveis.
            </div>
          )}

          {area === 'found' && (
            <div
              style={{
                marginTop: 13,
                padding: 12,
                borderRadius: 12,
                background: C.goldSoft,
                color: '#674B10',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <strong>Ajude com segurança</strong>
              <br />
              Não publique dados pessoais sensíveis. Se encontrou uma criança
              ou pessoa vulnerável, procure ajuda das autoridades competentes.
            </div>
          )}
        </Panel>

        {(area === 'question' ||
          area === 'search' ||
          area === 'found') &&
          panel === 'province' && (
            <Panel style={{ marginBottom: 16 }}>
              {!showComposer ? (
                <>
                  <div style={{ fontWeight: 850, color: C.dark }}>
                    Quer publicar nesta área?
                  </div>

                  <p
                    style={{
                      fontSize: 13,
                      color: C.muted,
                      lineHeight: 1.5,
                    }}
                  >
                    Escolha o alcance da publicação e durante quanto tempo
                    ficará visível.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setScope('province');
                      setShowComposer(true);
                      setMessage('');
                    }}
                    style={{
                      ...buttonStyle,
                      background: C.green,
                      color: C.white,
                    }}
                  >
                    + Criar publicação
                  </button>
                </>
              ) : (
                <form onSubmit={publishPost}>
                  <label
                    htmlFor="community-title"
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 800,
                      marginBottom: 7,
                    }}
                  >
                    {area === 'question' ? 'Título (opcional)' : 'Título'}
                  </label>

                  <input
                    id="community-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={140}
                    placeholder={
                      area === 'question'
                        ? 'Resuma a sua pergunta'
                        : area === 'search'
                        ? 'Quem está à procura?'
                        : 'O que encontrou?'
                    }
                    style={{
                      width: '100%',
                      padding: 12,
                      border: `1px solid ${C.line}`,
                      borderRadius: 12,
                      marginBottom: 12,
                      background: C.bg,
                    }}
                  />

                  <label
                    htmlFor="community-content"
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 800,
                      marginBottom: 7,
                    }}
                  >
                    Descrição
                  </label>

                  <textarea
                    id="community-content"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    required
                    minLength={8}
                    maxLength={5000}
                    rows={4}
                    placeholder={
                      area === 'question'
                        ? 'Escreva a sua pergunta…'
                        : area === 'search'
                        ? 'Descreva a situação sem divulgar dados sensíveis…'
                        : 'Descreva o que encontrou…'
                    }
                    style={{
                      width: '100%',
                      padding: 12,
                      border: `1px solid ${C.line}`,
                      borderRadius: 12,
                      marginBottom: 14,
                      resize: 'vertical',
                      background: C.bg,
                    }}
                  />

                  {(area === 'search' || area === 'found') && (
                    <div
                      style={{
                        marginBottom: 14,
                        padding: 13,
                        background: C.purpleSoft,
                        border: `1px dashed ${C.purple}`,
                        borderRadius: 14,
                      }}
                    >
                      <label
                        htmlFor="community-image"
                        style={{
                          display: 'block',
                          fontSize: 13,
                          fontWeight: 800,
                          color: C.dark,
                          marginBottom: 7,
                        }}
                      >
                        Fotografia (opcional, recomendada quando for segura e
                        autorizada)
                      </label>

                      <input
                        id="community-image"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) =>
                          setImageFile(event.target.files?.[0] || null)
                        }
                        style={{ width: '100%', fontSize: 13 }}
                      />

                      <small
                        style={{
                          display: 'block',
                          color: C.muted,
                          marginTop: 6,
                          lineHeight: 1.5,
                        }}
                      >
                        Não carregue documentos, contactos, moradas privadas ou
                        imagens que possam colocar alguém em risco.
                      </small>

                      {imageFile && (
                        <small
                          style={{
                            display: 'block',
                            color: C.green,
                            marginTop: 5,
                          }}
                        >
                          Imagem selecionada: {imageFile.name}
                        </small>
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 850,
                      marginBottom: 8,
                    }}
                  >
                    Onde pretende publicar?
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: 8,
                    }}
                  >
                    {[
                      {
                        value: 'province',
                        label: '📍 Minha província',
                        sub: provinceName || 'Província atual',
                      },
                      {
                        value: 'country',
                        label: '🌍 Nacional',
                        sub: countryName || 'Todo o país',
                      },
                    ].map((option) => (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => setScope(option.value)}
                        style={{
                          padding: 12,
                          textAlign: 'left',
                          borderRadius: 13,
                          border: `2px solid ${
                            scope === option.value ? C.purple : C.line
                          }`,
                          background:
                            scope === option.value ? C.purpleSoft : C.white,
                          color: C.ink,
                          cursor: 'pointer',
                        }}
                      >
                        <strong
                          style={{ display: 'block', fontSize: 13 }}
                        >
                          {option.label}
                        </strong>
                        <small style={{ color: C.muted }}>
                          {option.sub}
                        </small>
                      </button>
                    ))}
                  </div>

                  <label
                    htmlFor="community-duration"
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 850,
                      margin: '16px 0 7px',
                    }}
                  >
                    Duração da publicação
                  </label>

                  <select
                    id="community-duration"
                    value={duration}
                    onChange={(event) =>
                      setDuration(Number(event.target.value))
                    }
                    style={{
                      width: '100%',
                      padding: 12,
                      borderRadius: 12,
                      border: `1px solid ${C.line}`,
                      background: C.white,
                    }}
                  >
                    <option value={7}>7 dias</option>
                    <option value={15}>15 dias</option>
                    <option value={30}>30 dias</option>
                  </select>

                  <div
                    style={{
                      marginTop: 12,
                      padding: 11,
                      borderRadius: 12,
                      background: C.goldSoft,
                      color: '#674B10',
                      fontSize: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    A publicação será enviada para análise antes de aparecer
                    publicamente.
                  </div>

                  {message && (
                    <p
                      role="status"
                      style={{
                        color: C.muted,
                        fontSize: 13,
                        lineHeight: 1.5,
                      }}
                    >
                      {message}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    style={{
                      ...buttonStyle,
                      width: '100%',
                      marginTop: 14,
                      background: C.green,
                      color: C.white,
                      opacity: sending ? 0.65 : 1,
                    }}
                  >
                    {sending ? 'A enviar…' : 'Enviar publicação ↑'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowComposer(false);
                      setImageFile(null);
                    }}
                    style={{
                      ...buttonStyle,
                      width: '100%',
                      marginTop: 6,
                      background: 'transparent',
                      color: C.muted,
                    }}
                  >
                    Cancelar
                  </button>
                </form>
              )}
            </Panel>
          )}

        {area === 'motivation' || area === 'theme' ? (
          <section style={{ marginTop: 18 }}>
            <h2 style={{ fontSize: 18, margin: '0 0 12px', color: C.dark }}>
              {area === 'motivation' ? 'Motivação Talaza' : 'Tema do mês e título da semana'}
            </h2>

            {message ? (
              <Panel style={{ marginBottom: 12 }}>
                <p role="status" style={{ color: C.red, margin: 0, lineHeight: 1.6 }}>{message}</p>
              </Panel>
            ) : null}

            {officialLoading ? (
              <Panel><p style={{ color: C.muted, margin: 0 }}>A carregar conteúdo oficial…</p></Panel>
            ) : area === 'motivation' ? (
              officialContent.length === 0 ? (
                <Panel><p style={{ color: C.muted, margin: 0 }}>Ainda não foi publicada uma motivação oficial.</p></Panel>
              ) : officialContent.map((item) => (
                <Panel key={item.id} style={{ marginBottom: 12, padding: 0, overflow: 'hidden', aspectRatio: '16 / 9', minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.text_color || '#FFFFFF', fontFamily: item.font_family || 'Georgia', backgroundColor: item.background_color || '#173B35', backgroundImage: item.background_image_url ? 'linear-gradient(rgba(0,0,0,.12),rgba(0,0,0,.12)),url(' + item.background_image_url + ')' : (item.background_gradient || undefined), backgroundSize: 'cover', backgroundPosition: 'center' }}>
                  <div style={{ width: '100%', height: '100%', minHeight: 180, boxSizing: 'border-box', padding: 'clamp(16px,4vw,32px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 'clamp(18px,3vw,30px)', lineHeight: 1.35, overflowWrap: 'anywhere' }}>{item.title || item.content}</h3>
                    <small style={{ opacity: .85 }}>{new Date(item.created_at).toLocaleDateString('pt-PT')}</small>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                    <button type="button" onClick={() => toggleOfficialLike(item, 'motivation')} style={{ ...buttonStyle, background: officialInteractions[item.id]?.liked ? C.purpleSoft : 'rgba(255,255,255,.92)', color: officialInteractions[item.id]?.liked ? C.purple : C.ink, border: '1px solid rgba(255,255,255,.6)' }}>{officialInteractions[item.id]?.liked ? '♥ Gostaste' : '♡ Gostar'} · {officialInteractions[item.id]?.likes || 0}</button>
                  </div>
                </Panel>
              ))
            ) : (
              officialContent.length === 0 ? (
                <Panel><p style={{ color: C.muted, margin: 0 }}>Ainda não há um tema oficial publicado pela administração.</p></Panel>
              ) : officialContent.map((item) => (
                <Panel key={item.id} style={{ marginBottom: 12, overflow: 'hidden', padding: 0 }}>
                  <div style={{ padding: 'clamp(18px,4vw,28px)', color: item.text_color || '#FFFFFF', fontFamily: item.font_family || 'Georgia', backgroundColor: item.background_color || '#173B35', backgroundImage: item.background_image_url ? 'linear-gradient(rgba(0,0,0,.12),rgba(0,0,0,.12)),url(' + item.background_image_url + ')' : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8, opacity: .9 }}>TEMA DO MÊS</div>
                    <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.3 }}>{item.month_title}</h3>
                  </div>
                  <div style={{ padding: '16px clamp(14px,3vw,24px) 22px' }}>
                  <div style={{ borderBottom: '1px solid ' + C.line, paddingBottom: 14 }}>
                    <div style={{ fontSize: 12, color: C.green, fontWeight: 800, marginBottom: 7 }}>TEMA DA SEMANA · SEMANA {item.week_number}</div>
                    <h3 style={{ color: C.dark, margin: '0 0 8px', fontSize: 18 }}>{item.week_title}</h3>
                    {item.week_description ? <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, margin: 0, color: C.ink }}>{item.week_description}</p> : null}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid ' + C.line, marginTop: 12, paddingTop: 12 }}>
                    <button type="button" onClick={() => toggleOfficialLike(item, 'theme')} style={{ ...buttonStyle, background: officialInteractions[item.id]?.liked ? C.purpleSoft : C.bg, color: officialInteractions[item.id]?.liked ? C.purple : C.ink, border: '1px solid ' + C.line }}>{officialInteractions[item.id]?.liked ? '♥ Gostaste' : '♡ Gostar'} · {officialInteractions[item.id]?.likes || 0}</button>
                    <button type="button" onClick={() => setOpenComments((prev) => ({ ...prev, [item.id]: !prev[item.id] }))} style={{ ...buttonStyle, background: C.bg, color: C.ink, border: '1px solid ' + C.line }}>💬 Comentar · {(officialInteractions[item.id]?.comments || []).length}</button>
                  </div>
                  {openComments[item.id] ? <div style={{ marginTop: 12 }}>
                    {(officialInteractions[item.id]?.comments || []).map((comment) => <div key={comment.id} style={{ background: C.bg, borderRadius: 12, padding: 10, marginBottom: 8 }}><p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: 13 }}>{comment.content}</p><small style={{ color: C.faint }}>{new Date(comment.created_at).toLocaleDateString('pt-PT')}</small></div>)}
                    <textarea value={officialCommentDrafts[item.id] || ''} onChange={(event) => setOfficialCommentDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))} rows={2} maxLength={2000} placeholder="Escreva o seu comentário…" style={{ width: '100%', padding: 11, border: '1px solid ' + C.line, borderRadius: 12, resize: 'vertical' }} />
                    <button type="button" onClick={() => submitOfficialComment(item, 'theme')} style={{ ...buttonStyle, marginTop: 8, background: C.green, color: C.white }}>Enviar comentário</button>
                  </div> : null}
                  </div>
                </Panel>
              ))
            )}
          </section>
        ) : (
          <section style={{ marginTop: 18 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                marginBottom: 10,
              }}
            >
              <h2 style={{ fontSize: 18, margin: 0, color: C.dark }}>
                {panel === 'province'
                  ? `Publicações de ${provinceName || 'esta província'}`
                  : `Publicações nacionais${
                      countryName ? ` · ${countryName}` : ''
                    }`}
              </h2>

              <Pill color={C.purpleSoft} textColor={C.purple}>
                {posts.length}
              </Pill>
            </div>

            {message && (
              <Panel style={{ marginBottom: 12 }}>
                <p
                  role="status"
                  style={{
                    margin: 0,
                    color: C.muted,
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {message}
                </p>
              </Panel>
            )}

            {loading ? (
              <Panel>
                <p style={{ color: C.muted, margin: 0 }}>
                  A carregar publicações…
                </p>
              </Panel>
            ) : posts.length === 0 ? (
              <Panel style={{ textAlign: 'center', padding: 28 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>

                <h3 style={{ color: C.dark, margin: '0 0 7px' }}>
                  Ainda não há publicações aprovadas
                </h3>

                <p
                  style={{
                    color: C.muted,
                    fontSize: 13,
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  Quando houver publicações aprovadas para este painel, elas
                  aparecerão aqui.
                </p>
              </Panel>
            ) : (
              posts.map((post) => (
                <Panel key={post.id} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <Pill
                      color={
                        post.scope === 'country'
                          ? C.purpleSoft
                          : C.greenSoft
                      }
                      textColor={
                        post.scope === 'country' ? C.purple : C.green
                      }
                    >
                      {post.scope === 'country'
                        ? '🌍 Nacional'
                        : `📍 ${provinceName || 'Província'}`}
                    </Pill>

                    <span style={{ fontSize: 11, color: C.faint }}>
                      {post.duration_days} dias
                    </span>
                  </div>

                  {post.title && (
                    <h3
                      style={{
                        color: C.dark,
                        fontSize: 17,
                        margin: '0 0 8px',
                      }}
                    >
                      {post.title}
                    </h3>
                  )}

                  <p
                    style={{
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                      fontSize: 14,
                      lineHeight: 1.65,
                      margin: 0,
                    }}
                  >
                    {post.content}
                  </p>

                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="Imagem da publicação"
                      style={{
                        display: 'block',
                        width: '100%',
                        maxHeight: 360,
                        objectFit: 'cover',
                        borderRadius: 14,
                        marginTop: 12,
                      }}
                    />
                  )}

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginTop: 14,
                      paddingTop: 12,
                      borderTop: `1px solid ${C.line}`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleLike(post)}
                      style={{
                        ...buttonStyle,
                        background: extras[post.id]?.liked
                          ? C.purpleSoft
                          : C.bg,
                        color: extras[post.id]?.liked ? C.purple : C.ink,
                        border: `1px solid ${C.line}`,
                      }}
                    >
                      {extras[post.id]?.liked ? '♥ Gostaste' : '♡ Gostar'} ·{' '}
                      {extras[post.id]?.likes || 0}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleFavorite(post)}
                      style={{
                        ...buttonStyle,
                        background: extras[post.id]?.favorite
                          ? C.goldSoft
                          : C.bg,
                        color: extras[post.id]?.favorite
                          ? '#674B10'
                          : C.ink,
                        border: `1px solid ${C.line}`,
                      }}
                    >
                      {extras[post.id]?.favorite
                        ? '★ Guardado'
                        : '☆ Favoritar'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setOpenComments((previous) => ({
                          ...previous,
                          [post.id]: !previous[post.id],
                        }))
                      }
                      style={{
                        ...buttonStyle,
                        background: C.greenSoft,
                        color: C.dark,
                        border: `1px solid ${C.line}`,
                      }}
                    >
                      💬 Comentar ·{' '}
                      {(extras[post.id]?.comments || []).length}
                    </button>

                    <button
                      type="button"
                      onClick={() => reportPost(post)}
                      style={{
                        ...buttonStyle,
                        background: C.redSoft,
                        color: C.red,
                        border: `1px solid ${C.line}`,
                      }}
                    >
                      ⚑ Denunciar
                    </button>
                  </div>

                  {openComments[post.id] && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 12,
                        borderRadius: 14,
                        background: C.bg,
                      }}
                    >
                      <strong
                        style={{
                          display: 'block',
                          color: C.dark,
                          fontSize: 13,
                          marginBottom: 10,
                        }}
                      >
                        Comentários
                      </strong>

                      {(extras[post.id]?.comments || []).length === 0 ? (
                        <p
                          style={{
                            color: C.muted,
                            fontSize: 12,
                            margin: '0 0 10px',
                          }}
                        >
                          Ainda não há comentários. Pode iniciar a conversa
                          com respeito.
                        </p>
                      ) : (
                        (extras[post.id]?.comments || []).map((comment) => (
                          <div
                            key={comment.id}
                            style={{
                              padding: '9px 0',
                              borderBottom: `1px solid ${C.line}`,
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                fontSize: 13,
                                lineHeight: 1.5,
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {comment.content}
                            </p>

                            <small style={{ color: C.faint }}>
                              {new Date(comment.created_at).toLocaleString(
                                'pt-PT'
                              )}
                            </small>
                          </div>
                        ))
                      )}

                      <textarea
                        value={commentDrafts[post.id] || ''}
                        onChange={(event) =>
                          setCommentDrafts((previous) => ({
                            ...previous,
                            [post.id]: event.target.value,
                          }))
                        }
                        rows={2}
                        maxLength={1500}
                        placeholder="Escreva um comentário construtivo…"
                        style={{
                          width: '100%',
                          marginTop: 10,
                          padding: 11,
                          border: `1px solid ${C.line}`,
                          borderRadius: 12,
                          background: C.white,
                          resize: 'vertical',
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => submitComment(post)}
                        style={{
                          ...buttonStyle,
                          marginTop: 8,
                          background: C.green,
                          color: C.white,
                        }}
                      >
                        Publicar comentário
                      </button>
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 12,
                      color: C.muted,
                      fontSize: 12,
                    }}
                  >
                    Publicação válida até{' '}
                    {new Date(post.expires_at).toLocaleDateString('pt-PT')}
                  </div>
                </Panel>
              ))
            )}
          </section>
        )}

        <footer
          style={{
            padding: '25px 4px 0',
            textAlign: 'center',
            color: C.faint,
            fontSize: 12,
          }}
        >
          Talaza · Uma comunidade para aproximar pessoas.
        </footer>
      </div>
    </main>
  );
}
