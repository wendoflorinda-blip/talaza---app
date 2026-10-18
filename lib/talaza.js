export const C = {
  green: '#0F6E5C',
  dark: '#083F35',
  greenDark: '#083F35',
  gold: '#DDA10A',
  goldSoft: '#FFF1C2',
  ink: '#17211F',
  muted: '#596560',
  soft: '#E8F4F0',
  canvas: '#F8F6F3',
  white: '#FFFFFF',
  line: '#E5E9E7',
  red: '#B93845',
};

const COUNTRY_DATA = {
  angola: { flag: '🇦🇴', dial: '+244' },
  brazil: { flag: '🇧🇷', dial: '+55' },
  brasil: { flag: '🇧🇷', dial: '+55' },
  portugal: { flag: '🇵🇹', dial: '+351' },
  mozambique: { flag: '🇲🇿', dial: '+258' },
  'moçambique': { flag: '🇲🇿', dial: '+258' },
  'cabo verde': { flag: '🇨🇻', dial: '+238' },
  'guiné-bissau': { flag: '🇬🇼', dial: '+245' },
  'são tomé e príncipe': { flag: '🇸🇹', dial: '+239' },
  'estados unidos': { flag: '🇺🇸', dial: '+1' }, 'united states': { flag: '🇺🇸', dial: '+1' },
  canadá: { flag: '🇨🇦', dial: '+1' }, canada: { flag: '🇨🇦', dial: '+1' },
  'reino unido': { flag: '🇬🇧', dial: '+44' }, 'united kingdom': { flag: '🇬🇧', dial: '+44' },
  frança: { flag: '🇫🇷', dial: '+33' }, france: { flag: '🇫🇷', dial: '+33' },
  espanha: { flag: '🇪🇸', dial: '+34' }, spain: { flag: '🇪🇸', dial: '+34' },
  alemanha: { flag: '🇩🇪', dial: '+49' }, germany: { flag: '🇩🇪', dial: '+49' },
  namíbia: { flag: '🇳🇦', dial: '+264' }, namibia: { flag: '🇳🇦', dial: '+264' },
  'áfrica do sul': { flag: '🇿🇦', dial: '+27' }, 'south africa': { flag: '🇿🇦', dial: '+27' },
  zâmbia: { flag: '🇿🇲', dial: '+260' }, zambia: { flag: '🇿🇲', dial: '+260' },
  zimbábue: { flag: '🇿🇼', dial: '+263' }, zimbabwe: { flag: '🇿🇼', dial: '+263' },
  congo: { flag: '🇨🇬', dial: '+242' },
  'república democrática do congo': { flag: '🇨🇩', dial: '+243' },
  nigéria: { flag: '🇳🇬', dial: '+234' }, nigeria: { flag: '🇳🇬', dial: '+234' },
  quênia: { flag: '🇰🇪', dial: '+254' }, kenya: { flag: '🇰🇪', dial: '+254' },
  tanzânia: { flag: '🇹🇿', dial: '+255' }, tanzania: { flag: '🇹🇿', dial: '+255' },
  senegal: { flag: '🇸🇳', dial: '+221' }, ghana: { flag: '🇬🇭', dial: '+233' },
  índia: { flag: '🇮🇳', dial: '+91' }, india: { flag: '🇮🇳', dial: '+91' },
  china: { flag: '🇨🇳', dial: '+86' }, japão: { flag: '🇯🇵', dial: '+81' }, japan: { flag: '🇯🇵', dial: '+81' },
  austrália: { flag: '🇦🇺', dial: '+61' }, australia: { flag: '🇦🇺', dial: '+61' },
};

export function countryInfo(country) {
  const value = String(country || '').trim().toLowerCase();
  return COUNTRY_DATA[value] || { flag: '🌍', dial: '' };
}

export function isAngola(country) {
  const value = String(country || '').trim().toLowerCase();
  return value === 'angola' || value === '🇦🇴';
}

export function validAngolanPhone(phone, dial = '+244') {
  const digits = String(phone || '').replace(/\D/g, '');
  const prefix = String(dial || '').replace(/\D/g, '');
  const local = prefix && digits.startsWith(prefix) ? digits.slice(prefix.length) : digits;
  return local.length === 9;
}

export function fullPhone(dial, phone) {
  const prefix = String(dial || '').trim();
  const digits = String(phone || '').replace(/\D/g, '');
  const prefixDigits = prefix.replace(/\D/g, '');
  const local = prefixDigits && digits.startsWith(prefixDigits) ? digits.slice(prefixDigits.length) : digits;
  return prefix ? `${prefix} ${local}`.trim() : local;
}

export function cleanText(value) {
  return String(value ?? '').replace(/[<>]/g, '').trim();
}

export function formatKz(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Preço sob consulta';
  return `${new Intl.NumberFormat('pt-AO', { maximumFractionDigits: 0 }).format(amount)} Kz`;
}

export function durationLabel(days) {
  const n = Number(days);
  if (!Number.isFinite(n) || n <= 0) return 'período definido no plano';
  if (n === 1) return '1 dia';
  if (n === 30) return '30 dias';
  if (n === 90) return '90 dias';
  if (n === 180) return '180 dias';
  if (n === 365) return '365 dias';
  return `${n} dias`;
}

export function termName(days) {
  const n = Number(days);
  if (n === 30) return 'Mensal';
  if (n === 90) return 'Trimestral';
  if (n === 180) return 'Semestral';
  if (n === 365) return 'Anual';
  return durationLabel(days);
}

export function parsePlanDescription(description) {
  const text = String(description || '').trim();
  if (!text) return { intro: '', benefits: [] };
  const parts = text.split(/\r?\n|[•;]+/).map(part => part.replace(/^[-*✓✔\s]+/, '').trim()).filter(Boolean);
  if (parts.length <= 1) return { intro: text, benefits: [] };
  return { intro: parts[0], benefits: parts.slice(1) };
}

export function planKind(plan) {
  return String(plan?.plan_type || plan?.type || plan?.name || '').trim().toLowerCase();
}

export function resizeImage(file, { max = 1200, square = false } = {}) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      reject(new Error('A edição de imagens só está disponível no navegador.'));
      return;
    }
    const source = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        let sx = 0, sy = 0, sw = image.width, sh = image.height;
        if (square) {
          const side = Math.min(sw, sh);
          sx = (sw - side) / 2;
          sy = (sh - side) / 2;
          sw = side;
          sh = side;
        }
        const scale = Math.min(1, max / Math.max(sw, sh));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round((square ? sw : image.width) * scale));
        canvas.height = Math.max(1, Math.round((square ? sh : image.height) * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Não foi possível processar a imagem.');
        context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          URL.revokeObjectURL(source);
          if (blob) resolve(blob);
          else reject(new Error('Não foi possível converter a imagem.'));
        }, 'image/jpeg', 0.88);
      } catch (error) {
        URL.revokeObjectURL(source);
        reject(error);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(source);
      reject(new Error('Não foi possível abrir a imagem.'));
    };
    image.src = source;
  });
}

async function uploadFile(supabase, bucket, path, file, contentType) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: contentType || file?.type || 'application/octet-stream',
  });
  if (error) throw error;
  return path;
}

export function uploadPublicImage(supabase, bucket, path, file) {
  return uploadFile(supabase, bucket, path, file, 'image/jpeg').then(async storedPath => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(storedPath);
    return data?.publicUrl || storedPath;
  });
}

export function uploadPrivateFile(supabase, bucket, path, file, contentType) {
  return uploadFile(supabase, bucket, path, file, contentType);
}

export const EXPRESS_NUMBER = process.env.NEXT_PUBLIC_EXPRESS_NUMBER || '944216581';
export const PAYMENT_MESSAGE = process.env.NEXT_PUBLIC_PAYMENT_MESSAGE || 'Talaza Angola';
