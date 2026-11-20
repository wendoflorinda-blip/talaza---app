export function normalizeAdminUsername(value) {
  return String(value || '').trim().toLowerCase();
}

export function isValidAdminUsername(value) {
  return /^[a-z0-9][a-z0-9._-]{2,29}$/.test(value);
}

export function adminInternalEmail(username) {
  return `${normalizeAdminUsername(username)}@admin.talaza.internal`;
}

export function safeText(value, max = 180) {
  return String(value ?? '').replace(/[<>]/g, '').trim().slice(0, max);
}
