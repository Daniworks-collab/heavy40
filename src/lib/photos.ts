/** Reduce una foto a ~1080 px en su lado largo y la guarda como JPEG (≈150-300 KB). */
export async function compressImage(file: Blob, maxSide = 1080, quality = 0.8): Promise<Blob> {
  const src = await loadBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(src.width, src.height));
  const w = Math.round(src.width * scale);
  const h = Math.round(src.height * scale);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(src.image, 0, 0, w, h);
  src.close?.();
  const out = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', quality));
  return out ?? file;
}

interface Loaded {
  image: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
}

async function loadBitmap(file: Blob): Promise<Loaded> {
  if ('createImageBitmap' in window) {
    try {
      // Respeta la orientación EXIF de las fotos del celular
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { image: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      /* se intenta con <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return { image: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
