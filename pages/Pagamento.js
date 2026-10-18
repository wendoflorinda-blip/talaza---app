import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import AuthShell from '../components/AuthShell';
import { Card, ErrorBox } from '../components/Fields';
import {
  C,
  EXPRESS_NUMBER,
  PAYMENT_MESSAGE,
  cleanText,
  durationLabel,
  formatKz,
  planKind,
  termName,
  resizeImage,
  uploadPrivateFile,
} from '../lib/talaza';

const MAX_PDF_MB = 8;

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.warn(err);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      style={{
        padding: '8px 14px',
        border: 'none',
        borderRadius: 10,
        background: 'rgba(255,255,255,.16)',
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}

function UploadBox({ id, icon, title, hint, accept, file, thumb, onPick }) {
  return (
    <label
      htmlFor={id}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        marginTop: 12,
        padding: 16,
        borderRadius: 16,
        background: file ? '#F2FAF7' : '#FFFFFF',
        border: file
          ? `1.5px solid ${C.green}`
          : '1.5px dashed #8FC4B6',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 46,
          height: 46,
          flex: 'none',
          borderRadius: 12,
          background: thumb
            ? `center / cover no-repeat url(${thumb})`
            : C.soft,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
        }}
      >
        {!thumb && (file ? '✅' : icon)}
      </div>

      <div style={{ minWidth: 0 }}>
        <strong style={{ display: 'block', fontSize: 15, color: C.ink }}>
          {file ? 'Ficheiro adicionado' : title}
        </strong>

        <span
          style={{
            fontSize: 13,
            color: C.muted,
            wordBreak: 'break-all',
          }}
        >
          {file ? file.name : hint}
        </span>
      </div>

      <input
        id={id}
        type="file"
        accept={accept}
        onChange={(e) => {
          const picked = e.target.files && e.target.files[0];
          if (picked) onPick(picked);
        }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
        }}
      />
    </label>
  );
}

export default function Pagamento() {
  const router = useRouter();
  const { plan: planId, business: businessId } = router.query;

  const [user, setUser] = useState(null);
  const [plan, setPlan] = useState(null);
  const [business, setBusiness] = useState(null);

  const [imageFile, setImageFile] = useState(null);
  const [imageThumb, setImageThumb] = useState('');
  const [pdfFile, setPdfFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [pendingPaymentReference, setPendingPaymentReference] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    if (!planId || !businessId) {
      router.replace('/impulsionar');
      return;
    }

    load();
  }, [router.isReady, planId, businessId]);

  async function load() {
    setLoading(true);
    setError('');

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.replace('/login');
      return;
    }

    setUser(session.user);

    const [planResult, businessResult] = await Promise.all([
      supabase.from('plans').select('*').eq('id', planId).maybeSingle(),
      supabase
        .from('businesses')
        .select('id, name, country_id, province_id, is_active, approval_status')
        .eq('id', businessId)
        .eq('owner_id', session.user.id)
        .maybeSingle(),
    ]);

    if (planResult.error || !planResult.data) {
      console.error(planResult.error);
      setError('Não foi possível encontrar este plano.');
      setLoading(false);
      return;
    }

    if (businessResult.error || !businessResult.data) {
      console.error(businessResult.error);
      setError('Não foi possível encontrar o seu negócio.');
      setLoading(false);
      return;
    }

    setPlan(planResult.data);
    setBusiness(businessResult.data);

    const { data: pendingPayment, error: pendingPaymentError } = await supabase
      .from('subscription_requests')
      .select('id, plan_id, status, created_at')
      .eq('business_id', businessResult.data.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pendingPaymentError) console.error('Erro ao verificar comprovativo já enviado:', pendingPaymentError);
    const latestPaymentStatus = String(pendingPayment?.status || '').toLowerCase();
    if (
      pendingPayment &&
      (latestPaymentStatus === 'pending' ||
        (latestPaymentStatus === 'approved' &&
          (!businessResult.data.is_active ||
            String(businessResult.data.approval_status || '').toLowerCase() !== 'approved')))
    ) {
      setAlreadySubmitted(true);
      if (pendingPayment.plan_id && String(pendingPayment.plan_id) !== String(planResult.data.id)) {
        const { data: requestedPlan, error: requestedPlanError } = await supabase
          .from('plans').select('*').eq('id', pendingPayment.plan_id).maybeSingle();
        if (requestedPlanError) console.error('Erro ao carregar o plano do pedido enviado:', requestedPlanError);
        if (requestedPlan) setPlan(requestedPlan);
      }
      setPendingPaymentReference(pendingPayment);
    }
    setLoading(false);
  }

  function pickImage(file) {
    if (!file.type.startsWith('image/')) {
      setError('Escolha uma imagem (JPG ou PNG).');
      return;
    }

    setError('');
    setImageFile(file);
    setImageThumb(URL.createObjectURL(file));
  }

  function pickPdf(file) {
    if (file.type !== 'application/pdf') {
      setError('O comprovativo em ficheiro tem de ser um PDF.');
      return;
    }

    if (file.size > MAX_PDF_MB * 1024 * 1024) {
      setError(`O PDF deve ter no máximo ${MAX_PDF_MB} MB.`);
      return;
    }

    setError('');
    setPdfFile(file);
  }

  async function handleSend() {
    setError('');

    if (!imageFile && !pdfFile) {
      setError('Carregue o comprovativo em imagem ou em PDF.');
      return;
    }

    setSending(true);

    try {
      const folder = user.id;
      const stamp = Date.now();

      let imagePath = null;
      let pdfPath = null;

      if (imageFile) {
        const blob = await resizeImage(imageFile, { max: 1600 });

        imagePath = await uploadPrivateFile(
          supabase,
          'payment-proofs',
          `${folder}/${stamp}-comprovativo.jpg`,
          blob,
          'image/jpeg'
        );
      }

      if (pdfFile) {
        pdfPath = await uploadPrivateFile(
          supabase,
          'payment-proofs',
          `${folder}/${stamp}-comprovativo.pdf`,
          pdfFile,
          'application/pdf'
        );
      }

      const { error: insertError } = await supabase
        .from('subscription_requests')
        .insert({
          business_id: business.id,
          plan_id: plan.id,
          plan_type: planKind(plan),
          amount: Number(plan.price),
          proof_image_path: imagePath,
          proof_pdf_path: pdfPath,
          status: 'pending',
        });

      if (insertError) throw insertError;

      setDone(true);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error(err);
      setError('Não foi possível enviar o comprovativo. Tente novamente.');
    }

    setSending(false);
  }

  const panelHref = business
    ? {
        pathname: '/seller',
        query: { country: business.country_id, province: business.province_id },
      }
    : '/seller';

  /* Comprovativo enviado */
  if (done) {
    return (
      <AuthShell backHref={panelHref} backLabel="Painel">
        <Head>
          <title>Comprovativo enviado | Talaza</title>
        </Head>

        <Card>
          <div style={{ textAlign: 'center', padding: '16px 0 4px' }}>
            <div
              aria-hidden="true"
              style={{
                width: 96,
                height: 96,
                margin: '0 auto 24px',
                borderRadius: '50%',
                background: C.green,
                boxShadow: `0 0 0 10px ${C.soft}`,
                color: '#FFFFFF',
                fontSize: 46,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✓
            </div>

            <h1 style={{ margin: '0 0 10px', color: C.ink, fontSize: 25 }}>
              Comprovativo enviado
            </h1>

            <p
              style={{
                margin: 0,
                color: C.muted,
                fontSize: 16,
                lineHeight: 1.6,
              }}
            >
              O seu perfil foi criado, mas ainda não está visível para os clientes. A visibilidade só será ativada depois de a equipa Talaza verificar o comprovativo, confirmar o pagamento e aprovar o negócio.
            </p>

            <Link
              href={panelHref}
              style={{
                display: 'block',
                marginTop: 28,
                padding: 16,
                borderRadius: 14,
                background: C.green,
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: 800,
                textDecoration: 'none',
              }}
            >
              Ir para o painel
            </Link>
          </div>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      backHref={{
        pathname: '/impulsionar',
        query: businessId ? { business: businessId } : {},
      }}
      backLabel="← Planos"
    >
      <Head>
        <title>Pagamento | Talaza</title>
      </Head>

      {loading && (
        <p style={{ marginTop: 40, color: C.muted }}>A carregar…</p>
      )}

      {!loading && !plan && <ErrorBox>{error}</ErrorBox>}

      {!loading && plan && (
        <div style={{ marginTop: 22 }}>
          {alreadySubmitted ? (
            <Card>
              <div style={{ padding: '5px 0 8px' }}>
                <div style={{ display: 'inline-block', padding: '7px 11px', borderRadius: 999, background: '#FFF1C2', color: '#5B4300', fontSize: 11, fontWeight: 900, marginBottom: 12 }}>PAGAMENTO EM VERIFICAÇÃO</div>
                <h1 style={{ margin: '0 0 10px', color: C.ink, fontSize: 25 }}>O seu negócio está em verificação</h1>
                <p style={{ color: C.muted, lineHeight: 1.65 }}>O comprovativo já foi enviado. Esta página mostra os dados do plano escolhido para sua consulta. Não precisa enviar novamente e não pode mudar de plano nem editar o perfil enquanto a equipa Talaza verifica o pagamento e a ativação.</p>
              </div>
              <div style={{ marginTop: 12, padding: 16, borderRadius: 14, background: C.soft, border: `1px solid ${C.line}` }}>
                <p style={{ margin: '0 0 7px', color: C.muted, fontSize: 12 }}>NEGÓCIO</p>
                <strong style={{ display: 'block', color: C.ink, marginBottom: 14 }}>{cleanText(business?.name)}</strong>
                <p style={{ margin: '0 0 7px', color: C.muted, fontSize: 12 }}>PLANO ESCOLHIDO</p>
                <strong style={{ display: 'block', color: C.ink, marginBottom: 14 }}>Plano {termName(plan.duration_days)} · {durationLabel(plan.duration_days)}</strong>
                <p style={{ margin: '0 0 7px', color: C.muted, fontSize: 12 }}>VALOR DO PLANO</p>
                <strong style={{ display: 'block', color: C.ink, fontSize: 23, marginBottom: 14 }}>{formatKz(plan.price)}</strong>
                <p style={{ margin: '0 0 7px', color: C.muted, fontSize: 12 }}>REFERÊNCIA DO PEDIDO</p>
                <strong style={{ display: 'block', color: C.ink, overflowWrap: 'anywhere' }}>{pendingPaymentReference?.id || 'Pedido registado'}</strong>
              </div>
              <div style={{ marginTop: 14, padding: 18, borderRadius: 16, background: 'linear-gradient(145deg,#075B4E,#0B7563)', color: '#FFFFFF' }}>
                <p style={{ margin: '0 0 6px', color: '#CDE8DF', fontSize: 12 }}>REFERÊNCIA MULTICAIXA EXPRESS</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 24, letterSpacing: 1 }}>{EXPRESS_NUMBER}</strong>
                  <CopyButton text={EXPRESS_NUMBER} />
                </div>
                <p style={{ margin: '14px 0 5px', color: '#CDE8DF', fontSize: 12 }}>MENSAGEM DO PAGAMENTO</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <strong>{PAYMENT_MESSAGE}</strong>
                  <CopyButton text={PAYMENT_MESSAGE} />
                </div>
              </div>
              <p style={{ margin: '14px 0 0', color: C.muted, fontSize: 13, lineHeight: 1.6 }}>Não envie outro comprovativo nem faça um novo pagamento por causa desta mensagem. Aguarde a verificação da equipa Talaza.</p>
              <Link href={panelHref} style={{ display: 'block', marginTop: 20, padding: 15, borderRadius: 12, background: C.green, color: '#fff', textAlign: 'center', textDecoration: 'none', fontWeight: 800 }}>Ir para o meu painel de negócio</Link>
            </Card>
          ) : <>
          <h1 style={{ margin: '0 0 6px', color: C.ink, fontSize: 28 }}>
            Pagamento
          </h1>

          <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>
            Pague por Express e envie o comprovativo.
          </p>

          {/* Resumo do plano */}
          <div
            style={{
              marginTop: 20,
              padding: '14px 16px',
              borderRadius: 14,
              background: '#FFFFFF',
              border: `1px solid ${C.line}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ color: C.muted, fontSize: 14 }}>
              Plano escolhido
            </span>

            <strong style={{ color: C.ink, textAlign: 'right' }}>
              Plano {termName(plan.duration_days)} ·{' '}
              {durationLabel(plan.duration_days)}
            </strong>
          </div>

          {business && (
            <p
              style={{
                margin: '8px 4px 0',
                color: C.muted,
                fontSize: 13,
              }}
            >
              Para: {cleanText(business.name)}
            </p>
          )}

          {/* Dados de pagamento */}
          <div
            style={{
              marginTop: 16,
              padding: 20,
              borderRadius: 20,
              background: 'linear-gradient(145deg,#075B4E,#0B7563)',
              color: '#FFFFFF',
            }}
          >
            <small style={{ display: 'block', color: '#CDE8DF', fontSize: 13 }}>
              Express de pagamento
            </small>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                margin: '2px 0 16px',
              }}
            >
              <span
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                }}
              >
                {EXPRESS_NUMBER}
              </span>

              <CopyButton text={EXPRESS_NUMBER} />
            </div>

            <small style={{ display: 'block', color: '#CDE8DF', fontSize: 13 }}>
              Mensagem
            </small>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                margin: '2px 0 16px',
              }}
            >
              <span style={{ fontSize: 22, fontWeight: 800 }}>
                {PAYMENT_MESSAGE}
              </span>

              <CopyButton text={PAYMENT_MESSAGE} />
            </div>

            <small style={{ display: 'block', color: '#CDE8DF', fontSize: 13 }}>
              Valor a pagar
            </small>

            <div
              style={{
                marginTop: 2,
                fontSize: 36,
                fontWeight: 800,
                color: C.gold,
              }}
            >
              {formatKz(plan.price)}
            </div>
          </div>

          {/* Comprovativos */}
          <UploadBox
            id="proof-image"
            icon="📷"
            title="Enviar comprovativo"
            hint="Carregue uma imagem (captura de ecrã ou foto)"
            accept="image/*"
            file={imageFile}
            thumb={imageThumb}
            onPick={pickImage}
          />

          <UploadBox
            id="proof-pdf"
            icon="📄"
            title="Enviar comprovativo em ficheiro"
            hint="Carregue o comprovativo em PDF"
            accept="application/pdf,.pdf"
            file={pdfFile}
            onPick={pickPdf}
          />

          <ErrorBox>{error}</ErrorBox>

          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            style={{
              width: '100%',
              marginTop: 24,
              padding: 16,
              border: 'none',
              borderRadius: 14,
              background: sending ? '#8CAFA8' : C.green,
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 800,
              cursor: sending ? 'default' : 'pointer',
            }}
          >
            {sending ? 'A enviar…' : 'Enviar'}
          </button>
          </>}
        </div>
      )}
    </AuthShell>
  );
}
