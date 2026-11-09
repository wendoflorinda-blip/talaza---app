/**
 * MÍDIA TALAZA — Feed candidate filtering and recommendation ranking.
 *
 * This is a deterministic ranking core, not a trained machine-learning model.
 * Similarity and interest values must be calculated by trusted backend jobs.
 * Only eligible MÍDIA TALAZA content may enter the candidate list.
 */

export const MEDIA_FEED_MODES = Object.freeze({
  GLOBAL: 'global',
  LOCAL: 'local',
  LANGUAGE: 'language',
});

export const MEDIA_RANKING_DEFAULTS = Object.freeze({
  personalInterest: 0.34,
  userCollaborative: 0.20,
  itemCollaborative: 0.18,
  contentSimilarity: 0.14,
  freshness: 0.08,
  exploration: 0.06,
});

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

function isRecommendationSafe(item) {
  return item &&
    item.platformArea === 'media' &&
    item.moderationState === 'published' &&
    item.recommendationEligible === true &&
    item.creatorStatus === 'active' &&
    item.visibility !== 'private' &&
    item.visibility !== 'removed';
}

/**
 * Feed scope is applied before ranking:
 * - global: all countries and languages;
 * - local: creator/content country equals selected country;
 * - language: detected/declared content language equals selected language.
 */
export function filterMediaCandidates(items = [], { mode = 'global', countryCode, languageCode } = {}) {
  if (!Object.values(MEDIA_FEED_MODES).includes(mode)) return [];

  return items.filter((item) => {
    if (!isRecommendationSafe(item)) return false;
    if (mode === 'local') return Boolean(countryCode) && item.countryCode === countryCode;
    if (mode === 'language') return Boolean(languageCode) && item.languageCode === languageCode;
    return true;
  });
}

function weightedSignals(item, weights) {
  const personal = clamp01(item.personalInterestScore);
  const userCollaborative = clamp01(item.userCollaborativeScore);
  const itemCollaborative = clamp01(item.itemCollaborativeScore);
  const contentSimilarity = clamp01(item.contentSimilarityScore);
  const freshness = clamp01(item.freshnessScore);
  const exploration = clamp01(item.explorationScore);

  return (
    personal * weights.personalInterest +
    userCollaborative * weights.userCollaborative +
    itemCollaborative * weights.itemCollaborative +
    contentSimilarity * weights.contentSimilarity +
    freshness * weights.freshness +
    exploration * weights.exploration
  );
}

export function rankMediaCandidates(items = [], options = {}) {
  const weights = { ...MEDIA_RANKING_DEFAULTS, ...(options.weights || {}) };
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0) || 1;
  const normalizedWeights = Object.fromEntries(
    Object.entries(weights).map(([key, value]) => [key, Math.max(0, Number(value) || 0) / totalWeight])
  );

  return filterMediaCandidates(items, options)
    .map((item) => ({
      ...item,
      recommendationScore: weightedSignals(item, normalizedWeights),
      recommendationSignals: {
        personalInterest: clamp01(item.personalInterestScore),
        userCollaborative: clamp01(item.userCollaborativeScore),
        itemCollaborative: clamp01(item.itemCollaborativeScore),
        contentSimilarity: clamp01(item.contentSimilarityScore),
        freshness: clamp01(item.freshnessScore),
        exploration: clamp01(item.explorationScore),
      },
    }))
    .sort((a, b) =>
      b.recommendationScore - a.recommendationScore ||
      new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()
    );
}

/**
 * Produce a small, explainable reason for the feed card. Never expose private
 * neighbor identities or raw behavioral data to the viewer.
 */
export function getMediaRecommendationReason(item) {
  if (!item) return null;
  const signals = item.recommendationSignals || {};
  const top = Object.entries(signals).sort((a, b) => b[1] - a[1])[0];
  const reasons = {
    personalInterest: 'Com base nos teus interesses',
    userCollaborative: 'Pessoas com interesses semelhantes também gostaram',
    itemCollaborative: 'Relacionado com conteúdos que viste',
    contentSimilarity: 'Tema e conteúdo relacionados',
    freshness: 'Conteúdo recente',
    exploration: 'Uma descoberta nova para ti',
  };
  return top && top[1] > 0 ? reasons[top[0]] || 'Recomendado para ti' : 'Uma descoberta para ti';
}
