/**
 * MÍDIA TALAZA — catálogo de áreas e funcionalidades.
 * Funcionalidades planeadas ficam desativadas até a respetiva especificação.
 */

export const MEDIA_AREAS = Object.freeze({
  MEDIA: 'media',
});

export const MEDIA_FEATURES = Object.freeze({
  CHALLENGE: Object.freeze({
    code: 'desafio',
    name: 'Desafio',
    area: MEDIA_AREAS.MEDIA,
    status: 'planned',
    enabled: false,
    implementation: 'pending_product_specification',
  }),
});
