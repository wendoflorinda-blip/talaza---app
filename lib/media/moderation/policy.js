/**
 * MÍDIA TALAZA — International moderation policy registry.
 *
 * This module defines platform policy and normalizes decisions. It does NOT
 * perform AI inference, transcription, OCR, or legal review. Detection services
 * must provide evidence assessments before evaluateModeration() is called.
 *
 * Keep this module isolated from TALAZA Comercial.
 */

export const MEDIA_POLICY_VERSION = '1.0.0';

export const MEDIA_POLICY_SCOPES = Object.freeze({
  GLOBAL: 'global',
  COUNTRY: 'country',
  LANGUAGE: 'language',
});

export const MEDIA_MODERATION_STATES = Object.freeze({
  PENDING_ANALYSIS: 'pending_analysis',
  PUBLISHED: 'published',
  LIMITED: 'limited_recommendation',
  REVIEW: 'human_review',
  BLOCKED: 'blocked',
  URGENT: 'urgent_escalation',
});

export const MEDIA_POLICY_CATEGORIES = Object.freeze({
  CHILD_SAFETY: 'child_safety',
  SEXUAL_EXPLOITATION: 'sexual_exploitation',
  HATE_XENOPHOBIA: 'hate_xenophobia',
  HARASSMENT_THREATS: 'harassment_threats',
  VIOLENCE: 'violence',
  FRAUD_SCAMS: 'fraud_scams',
  JOB_VISA_FRAUD: 'job_visa_fraud',
  FINANCIAL_DECEPTION: 'financial_deception',
  HEALTH_MISINFORMATION: 'health_misinformation',
  DANGEROUS_SUBSTANCES: 'dangerous_substances',
  WEAPONS_CRIME: 'weapons_crime',
  PRIVACY_DOXXING: 'privacy_doxxing',
  SPAM_MANIPULATION: 'spam_manipulation',
  DECEPTIVE_ADVERTISING: 'deceptive_advertising',
});

const category = (id, severity, guidance, exceptions = []) => Object.freeze({
  id, severity, guidance, contextualExceptions: exceptions,
});

export const GLOBAL_MEDIA_POLICIES = Object.freeze([
  category('child_safety', 'critical', 'Proteger menores contra exploração, abuso, aliciamento e sexualização. Casos credíveis exigem encaminhamento urgente.'),
  category('sexual_exploitation', 'critical', 'Bloquear exploração sexual, coerção e conteúdo íntimo não consentido.'),
  category('hate_xenophobia', 'high', 'Não permitir ataques, desumanização ou incitação contra pessoas por nacionalidade, origem, etnia ou outras características protegidas.'),
  category('harassment_threats', 'high', 'Não permitir perseguição, intimidação, ameaças credíveis ou campanhas de assédio.'),
  category('violence', 'high', 'Não permitir incentivo operacional à violência; distinguir reportagem, prevenção e documentação de interesse público.'),
  category('fraud_scams', 'high', 'Não permitir burlas, falsos prémios, pedidos fraudulentos de transferência ou esquemas enganosos.'),
  category('job_visa_fraud', 'high', 'Não permitir promessas falsas de emprego, salário, visto ou imigração garantidos, nem cobranças fraudulentas por oportunidades inexistentes.'),
  category('financial_deception', 'high', 'Não permitir ganhos garantidos, ausência de risco falsa, pirâmides ou enriquecimento instantâneo enganoso.'),
  category('health_misinformation', 'high', 'Não permitir curas milagrosas garantidas, diagnósticos falsos ou incentivo perigoso a abandonar tratamentos. Permitir educação, prevenção e relatos pessoais contextualizados.'),
  category('dangerous_substances', 'high', 'Não permitir promoção, venda ou instruções perigosas relativas a substâncias proibidas. Permitir prevenção e informação contextualizada.'),
  category('weapons_crime', 'high', 'Não permitir comércio ilegal, instruções operacionais de crime ou facilitação de violência. Permitir jornalismo e prevenção contextualizados.'),
  category('privacy_doxxing', 'high', 'Não permitir divulgação de moradas, contactos privados ou dados pessoais para intimidar, perseguir ou expor alguém.'),
  category('spam_manipulation', 'medium', 'Limitar spam, interação artificial, contas coordenadas e manipulação de distribuição.'),
  category('deceptive_advertising', 'high', 'Não permitir publicidade que oculte condições essenciais, imite entidades oficiais ou prometa resultados garantidos sem fundamento.'),
]);

/**
 * Locale packs are contextual aids, not keyword blacklists. Detection must
 * understand meaning, dialect, code-switching, slang, irony and quoted speech.
 */
export const MEDIA_LANGUAGE_PACKS = Object.freeze({
  'pt-AO': { language: 'pt', region: 'AO', label: 'Português de Angola', status: 'initial' },
  'pt-BR': { language: 'pt', region: 'BR', label: 'Português do Brasil', status: 'initial' },
  'pt-PT': { language: 'pt', region: 'PT', label: 'Português de Portugal', status: 'initial' },
  'en': { language: 'en', region: null, label: 'English', status: 'initial' },
  'fr': { language: 'fr', region: null, label: 'Français', status: 'initial' },
  'it': { language: 'it', region: null, label: 'Italiano', status: 'initial' },
});

export const MEDIA_COUNTRY_POLICY_BASELINE = Object.freeze({
  default: {
    policyVersion: MEDIA_POLICY_VERSION,
    additionalRestrictions: [],
    legalReviewRequiredFor: ['elections', 'regulated_financial_services', 'regulated_health_services'],
  },
  AO: { countryCode: 'AO', label: 'Angola', additionalRestrictions: [], legalReviewRequiredFor: ['financial_services', 'health_services'] },
  BR: { countryCode: 'BR', label: 'Brasil', additionalRestrictions: [], legalReviewRequiredFor: ['financial_services', 'health_services', 'consumer_advertising'] },
  PT: { countryCode: 'PT', label: 'Portugal', additionalRestrictions: [], legalReviewRequiredFor: ['financial_services', 'health_services', 'consumer_advertising'] },
});

/**
 * A detection result has:
 * { category, confidence: 0..1, severity: low|medium|high|critical,
 *   evidenceType, context, recommendedAction? }
 */
export function evaluateModeration({ detections = [], credibleReports = [], contentContext = {} } = {}) {
  const valid = detections.filter((item) =>
    item && Object.values(MEDIA_POLICY_CATEGORIES).includes(item.category) &&
    Number.isFinite(Number(item.confidence)) && Number(item.confidence) >= 0 &&
    Number(item.confidence) <= 1
  );

  const urgentReport = credibleReports.some((report) =>
    report && report.credible === true &&
    (report.category === 'child_safety' || report.category === 'sexual_exploitation' ||
      report.severity === 'critical')
  );

  if (urgentReport || valid.some((item) =>
    (item.category === 'child_safety' || item.category === 'sexual_exploitation') &&
    Number(item.confidence) >= 0.55
  )) {
    return {
      state: MEDIA_MODERATION_STATES.URGENT,
      recommendationEligible: false,
      requiresHumanReview: true,
      reasonCode: 'urgent_safety_risk',
      policyVersion: MEDIA_POLICY_VERSION,
      evidence: valid,
    };
  }

  const critical = valid.some((item) =>
    item.severity === 'critical' && Number(item.confidence) >= 0.85
  );
  if (critical) {
    return {
      state: MEDIA_MODERATION_STATES.BLOCKED,
      recommendationEligible: false,
      requiresHumanReview: true,
      reasonCode: 'high_confidence_critical_violation',
      policyVersion: MEDIA_POLICY_VERSION,
      evidence: valid,
    };
  }

  const highRisk = valid.some((item) =>
    ['high', 'critical'].includes(item.severity) && Number(item.confidence) >= 0.78
  );
  if (highRisk) {
    return {
      state: MEDIA_MODERATION_STATES.REVIEW,
      recommendationEligible: false,
      requiresHumanReview: true,
      reasonCode: 'high_risk_requires_review',
      policyVersion: MEDIA_POLICY_VERSION,
      evidence: valid,
    };
  }

  const uncertain = valid.some((item) => Number(item.confidence) >= 0.42);
  if (uncertain) {
    return {
      state: MEDIA_MODERATION_STATES.LIMITED,
      recommendationEligible: false,
      requiresHumanReview: true,
      reasonCode: 'context_or_confidence_uncertain',
      policyVersion: MEDIA_POLICY_VERSION,
      evidence: valid,
    };
  }

  return {
    state: MEDIA_MODERATION_STATES.PUBLISHED,
    recommendationEligible: true,
    requiresHumanReview: false,
    reasonCode: 'no_policy_signal_detected',
    policyVersion: MEDIA_POLICY_VERSION,
    evidence: valid,
    contentContext,
  };
}

export function getPolicyContext({ creatorCountry, contentLanguage, viewerCountry } = {}) {
  const languagePack = MEDIA_LANGUAGE_PACKS[contentLanguage] || null;
  const countryPack = MEDIA_COUNTRY_POLICY_BASELINE[creatorCountry] ||
    MEDIA_COUNTRY_POLICY_BASELINE.default;

  return {
    globalPolicyVersion: MEDIA_POLICY_VERSION,
    creatorCountry: creatorCountry || null,
    viewerCountry: viewerCountry || null,
    contentLanguage: contentLanguage || null,
    languagePack,
    countryPolicy: countryPack,
    note: 'O idioma do conteúdo, o país do criador e o país do público são dimensões distintas.',
  };
}

export function canAppealModerationDecision(decision) {
  return Boolean(decision && [
    MEDIA_MODERATION_STATES.LIMITED,
    MEDIA_MODERATION_STATES.REVIEW,
    MEDIA_MODERATION_STATES.BLOCKED,
  ].includes(decision.state));
}
