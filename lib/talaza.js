export const C = {
  green: '#0F6E5C',
  dark: '#083F35',
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

export function countryInfo(country) {
  const value = String(country || '').trim().toLowerCase();
  const flags = {
    angola: '🇦🇴',
    brazil: '🇧🇷',
    brasil: '🇧🇷',
    portugal: '🇵🇹',
    mozambique: '🇲🇿',
    moçambique: '🇲🇿',
  };
  return { flag: flags[value] || '🌍' };
}
