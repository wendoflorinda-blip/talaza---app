export function formatKz(value) {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return Math.round(number).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' Kz';
}

export function prepareImage(file, { square = false, size = 600, max = 1200, quality = 0.85 } = {}) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      let width, height;
      if (square) {
        const side = Math.min(sw, sh);
        sx = (sw - side) / 2; sy = (sh - side) / 2; sw = side; sh = side;
        width = size; height = size;
      } else {
        const scale = Math.min(1, max / Math.max(sw, sh));
        width = Math.round(sw * scale); height = Math.round(sh * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) { reject(new Error('Não foi possível preparar a imagem.')); return; }
      context.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Não foi possível preparar a imagem.')), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Não foi possível ler a imagem escolhida.')); };
    img.src = objectUrl;
  });
}
