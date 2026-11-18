const KEYS = {
  province: 'talaza_province',
  provinceId: 'talaza_province_id',
  country: 'talaza_country',
  countryId: 'talaza_country_id',
};

export function getTalazaLocation() {
  if (typeof window === 'undefined') return { country: '', countryId: '', province: '', provinceId: '' };
  const context = window.__TALAZA_LOCATION__ || {};
  const read = (key) => {
    try { return window.localStorage.getItem(key) || ''; } catch (_) { return ''; }
  };
  return {
    country: context.country || read(KEYS.country) || '',
    countryId: context.countryId || read(KEYS.countryId) || '',
    province: context.province || read(KEYS.province) || '',
    provinceId: context.provinceId || read(KEYS.provinceId) || '',
  };
}

export function setTalazaLocation({ country = '', countryId = '', province = '', provinceId = '' } = {}) {
  if (typeof window === 'undefined') return;
  const value = { country, countryId, province, provinceId };
  window.__TALAZA_LOCATION__ = value;
  try {
    window.localStorage.setItem(KEYS.country, String(country || ''));
    window.localStorage.setItem(KEYS.countryId, String(countryId || ''));
    window.localStorage.setItem(KEYS.province, String(province || ''));
    window.localStorage.setItem(KEYS.provinceId, String(provinceId || ''));
  } catch (_) { /* navegação continua mesmo se o armazenamento estiver indisponível */ }
  window.dispatchEvent(new CustomEvent('talaza:location-change', { detail: value }));
}
