/**
 * MÍDIA TALAZA — regras puras da campanha de lançamento em Angola.
 *
 * Este módulo calcula elegibilidade e duração; não concede acesso por si só.
 * A concessão definitiva deve ser feita no backend e persistida com unicidade
 * por utilizador, datas de ativação/expiração e trilho de auditoria.
 */

export const MEDIA_LAUNCH_OFFER = Object.freeze({
  code: 'media-angola-launch-3-months',
  durationCalendarMonths: 3,
  automaticRenewal: false,
  claimOncePerIdentity: true,
  scope: 'media',
  countryCode: 'AO',
});

export function addCalendarMonths(value, months = 3) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError('Data de ativação inválida.');
  if (!Number.isInteger(months) || months < 1) throw new TypeError('Número de meses inválido.');

  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date;
}

export function isLaunchCampaignOpen(campaign, now = new Date()) {
  if (!campaign || campaign.status !== 'active' || campaign.countryCode !== MEDIA_LAUNCH_OFFER.countryCode) return false;
  const startsAt = new Date(campaign.startsAt);
  const endsAt = new Date(campaign.endsAt);
  const instant = new Date(now);
  if ([startsAt, endsAt, instant].some((date) => Number.isNaN(date.getTime()))) return false;
  return instant >= startsAt && instant < endsAt;
}

export function buildLaunchGrant({ userId, countryCode, campaign, activatedAt = new Date() }) {
  if (!userId) throw new TypeError('É necessário identificar a conta autenticada.');
  if (countryCode !== MEDIA_LAUNCH_OFFER.countryCode || !isLaunchCampaignOpen(campaign, activatedAt)) return null;

  const activation = new Date(activatedAt);
  const expiration = addCalendarMonths(activation, MEDIA_LAUNCH_OFFER.durationCalendarMonths);

  return Object.freeze({
    userId,
    campaignCode: MEDIA_LAUNCH_OFFER.code,
    area: MEDIA_LAUNCH_OFFER.scope,
    countryCode: MEDIA_LAUNCH_OFFER.countryCode,
    status: 'active',
    activatedAt: activation.toISOString(),
    expiresAt: expiration.toISOString(),
    autoRenew: MEDIA_LAUNCH_OFFER.automaticRenewal,
  });
}

/**
 * A campanha pode fechar sem invalidar concessões já emitidas.
 * A aplicação deve verificar a validade individual do benefício, não
 * exigir que a campanha global continue aberta.
 */
export function isLaunchGrantActive(grant, now = new Date()) {
  if (!grant || grant.status !== 'active') return false;
  const activation = new Date(grant.activatedAt);
  const expiration = new Date(grant.expiresAt);
  const instant = new Date(now);
  if ([activation, expiration, instant].some((date) => Number.isNaN(date.getTime()))) return false;
  return instant >= activation && instant < expiration;
}
