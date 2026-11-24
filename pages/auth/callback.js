import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();
  const started = useRef(false);
  const [message, setMessage] = useState('A confirmar o teu email…');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady || started.current) return;
    started.current = true;

    async function finishConfirmation() {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('error_description') || params.get('error')) {
          throw new Error('CONFIRMATION_LINK_FAILED');
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const session = sessionData?.session;
        if (!session?.user) throw new Error('SESSION_MISSING');

        const user = session.user;
        const metadata = user.user_metadata || {};
        const signupType = metadata.talaza_pending_signup_type;
        const hasEnvelope = typeof metadata.talaza_dob_proof === 'string' && metadata.talaza_dob_proof.length > 0;
        let payload = null;

        if (hasEnvelope) {
          setMessage('A validar os dados protegidos do cadastro…');
          const { data, error: finalizeError } = await supabase.functions.invoke('talaza-signup-proof', {
            body: { action: 'finalize' },
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (finalizeError || !data?.ok || !data?.stored || !data?.payload) {
            throw new Error('PRIVATE_DETAILS_NOT_FINALIZED');
          }
          payload = data.payload;
          if (payload.email?.toLowerCase() !== user.email?.toLowerCase()) throw new Error('EMAIL_MISMATCH');
          if (!payload.country_id || !payload.province_id || !payload.name || !payload.phone ||
              !['feminino','masculino'].includes(String(payload.gender || '').toLowerCase())) {
            throw new Error('ENVELOPE_INCOMPLETE');
          }
        }

        if (signupType === 'explorer') {
          const pending = metadata.talaza_pending_explorer || {};
          const source = payload || pending;
          if (!source.name || !source.country_id || !source.province_id) throw new Error('EXPLORER_DATA_MISSING');
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: user.id,
            name: source.name,
            country_id: source.country_id,
            province_id: source.province_id,
            phone: source.phone || pending.phone || null,
            gender: String(source.gender || pending.gender || '').toLowerCase() || null,
            account_type: 'explorador',
          }, { onConflict: 'id' });
          if (profileError) throw profileError;

          try {
            localStorage.setItem('talaza_country_id', String(source.country_id));
            localStorage.setItem('talaza_province_id', String(source.province_id));
            localStorage.setItem('talaza_home_country_id', String(source.country_id));
            localStorage.setItem('talaza_home_province_id', String(source.province_id));
          } catch {}

          await finishEnvelopeCleanup(session.access_token);
          setMessage('Email confirmado. A abrir a tua Vitrine Talaza…');
          await router.replace({
            pathname: '/explore',
            query: { country: source.country_id, province: source.province_id, homeCountry: source.country_id, homeProvince: source.province_id },
          });
          return;
        }

        if (signupType === 'seller') {
          const { data: mainAdmin, error: mainAdminError } = await supabase
            .from('admin_users').select('id').eq('id', user.id).maybeSingle();
          if (mainAdminError) throw new Error('ADMIN_ROLE_CHECK_FAILED');
          if (mainAdmin?.id) {
            setMessage('Esta conta é de administrador. A Loja do Administrador é gerida separadamente.');
            await router.replace('/admin/painel');
            return;
          }
          const pending = metadata.talaza_pending_seller || {};
          const source = payload || pending;
          if (!source.name || !source.country_id || !source.province_id || !pending.store_name ||
              !pending.category_id || !pending.subcategory_id) throw new Error('SELLER_DATA_MISSING');

          const { error: profileError } = await supabase.from('profiles').upsert({
            id: user.id,
            name: source.name,
            country_id: source.country_id,
            province_id: source.province_id,
            phone: source.phone || null,
            gender: String(source.gender || '').toLowerCase() || null,
            account_type: 'vendedor',
          }, { onConflict: 'id' });
          if (profileError) throw profileError;

          const { data: existingBusiness, error: existingError } = await supabase.from('businesses')
            .select('id').eq('owner_id', user.id).limit(1).maybeSingle();
          if (existingError) throw existingError;

          let businessId = existingBusiness?.id;
          if (!businessId) {
            const { data: business, error: businessError } = await supabase.from('businesses').insert({
              owner_id: user.id,
              name: pending.store_name,
              description: pending.description || null,
              country_id: source.country_id,
              province_id: source.province_id,
              category_id: pending.category_id,
              subcategory_id: pending.subcategory_id,
              municipality: pending.municipality || null,
              neighborhood: pending.neighborhood || null,
              phone: pending.business_phone || source.phone || null,
              whatsapp: pending.whatsapp || null,
              email: user.email,
              opening_hours: pending.opening_hours || null,
              logo_url: null,
              is_active: false,
              approval_status: 'pending',
            }).select('id').single();
            if (businessError) throw businessError;
            businessId = business.id;
          }

          // Recupera as imagens escolhidas antes da confirmação, apenas neste navegador.
          let mediaUploadWarning = false;
          try {
            const savedMedia = localStorage.getItem('talaza_pending_seller_media');
            if (savedMedia) {
              const media = JSON.parse(savedMedia);
              const updates = {};
              for (const key of ['logo', 'cover']) {
                if (!media[key]) continue;
                const blob = await (await fetch(media[key])).blob();
                const path = `${businessId}/${key === 'logo' ? 'logo' : 'vitrine'}.jpg`;
                const { error: uploadError } = await supabase.storage.from('business-media').upload(path, blob, {
                  contentType: 'image/jpeg', upsert: true,
                });
                if (uploadError) throw uploadError;
                const { data: publicData } = supabase.storage.from('business-media').getPublicUrl(path);
                if (key === 'logo') updates.logo_url = publicData.publicUrl;
                if (key === 'cover') updates.cover_url = publicData.publicUrl;
              }
              if (Object.keys(updates).length) {
                const { error: mediaUpdateError } = await supabase.from('businesses').update(updates).eq('id', businessId);
                if (mediaUpdateError) throw mediaUpdateError;
              }
              localStorage.removeItem('talaza_pending_seller_media');
            }
          } catch (mediaError) {
            console.error('Não foi possível concluir o envio das imagens do negócio:', mediaError);
            mediaUploadWarning = true;
          }

          await finishEnvelopeCleanup(session.access_token);
          setMessage(mediaUploadWarning
            ? 'Email confirmado. O teu negócio foi registado e está pendente de aprovação. Podes adicionar as imagens do negócio no painel.'
            : 'Email confirmado. O teu negócio foi registado e está pendente de aprovação.');
          setMessage('Email confirmado. A abrir os planos de hospedagem da sua categoria…');
          await router.replace({ pathname: '/impulsionar', query: { tab: 'hospedagem' } });
          return;
        }

        if (signupType === 'creator' || metadata.media_creator_onboarding === true) {
          const pending = metadata.talaza_pending_creator || {};
          const source = payload || pending;
          if (!source.country_id || !source.province_id || !source.name) throw new Error('CREATOR_DATA_MISSING');

          const { error: updateError } = await supabase.auth.updateUser({
            data: {
              ...pending,
              media_creator_onboarding: true,
              media_country_id: source.country_id,
              media_province_id: source.province_id,
              media_phone: source.phone,
              media_gender: String(source.gender || '').toLowerCase(),
              media_account_type: 'creator',
            },
          });
          if (updateError) throw updateError;

          // A conta de Criador é gratuita. Após confirmar o email, regista a candidatura
          // para moderação editorial, sem plano, pagamento, comprovativo ou dados bancários.
          const { data: existingApplication, error: lookupError } = await supabase.from('media_applications')
            .select('id').eq('user_id', user.id).maybeSingle();
          if (lookupError) throw lookupError;
          const applicationData = {
            user_id: user.id,
            display_name: source.name,
            country_id: source.country_id,
            content_category: Array.isArray(pending.media_niches) && pending.media_niches.length
              ? pending.media_niches.join(' · ')
              : 'Geral',
            languages: Array.isArray(pending.media_content_languages) ? pending.media_content_languages : [],
            bio: null,
            social_links: {},
            application_status: 'submitted',
            review_notes: null,
            updated_at: new Date().toISOString(),
          };
          if (!existingApplication?.id) {
            const { error: applicationInsertError } = await supabase.from('media_applications').insert(applicationData);
            if (applicationInsertError) throw applicationInsertError;
          }

          await finishEnvelopeCleanup(session.access_token);
          setMessage('Email confirmado. A abrir a MÍDIA TALAZA…');
          await router.replace('/media');
          return;
        }

        throw new Error('SIGNUP_TYPE_MISSING');
      } catch (err) {
        console.error('Erro no callback de confirmação Talaza:', err);
        setError('Não foi possível concluir a confirmação. O link pode ter expirado ou os dados do cadastro precisam de ser reenviados. Solicita um novo link e tenta novamente.');
        setMessage('Não foi possível concluir a confirmação.');
      }
    }

    async function finishEnvelopeCleanup(accessToken) {
      const { data, error: cleanupError } = await supabase.functions.invoke('talaza-signup-proof', {
        body: { action: 'complete' },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (cleanupError || !data?.ok || !data?.proof_removed) throw new Error('ENVELOPE_CLEANUP_FAILED');
    }

    finishConfirmation();
  }, [router.isReady]);

  return (
    <>
      <Head><title>Confirmação de email | TALAZA</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#F8F6F3', fontFamily: 'Arial, sans-serif' }}>
        <section style={{ width: '100%', maxWidth: 460, boxSizing: 'border-box', padding: '38px 30px', borderRadius: 22, background: '#FFFFFF', boxShadow: '0 16px 48px rgba(8,63,53,.10)', textAlign: 'center' }}>
          <div style={{ width: 58, height: 58, margin: '0 auto 18px', borderRadius: 18, display: 'grid', placeItems: 'center', background: '#E8F3EF', color: '#0F6E5C', fontSize: 30, fontWeight: 900 }}>T</div>
          <div style={{ color: '#0F6E5C', fontSize: 13, letterSpacing: 4, fontWeight: 900 }}>TALAZA</div>
          <h1 style={{ color: '#17211F', fontSize: 25, margin: '18px 0 10px' }}>Confirmação de email</h1>
          <p style={{ color: '#596560', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{message}</p>
          {error && <div role="alert" style={{ marginTop: 20, padding: 13, borderRadius: 12, background: '#FFF0F1', color: '#B93845', fontSize: 13, lineHeight: 1.6 }}>{error}</div>}
          {error && <button type="button" onClick={() => router.replace('/resend-confirmation')} style={{ width: '100%', marginTop: 18, padding: 14, border: 0, borderRadius: 12, background: '#0F6E5C', color: '#FFFFFF', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>Pedir novo link de confirmação</button>}
        </section>
      </main>
    </>
  );
}
