export interface CompressedProblemPhoto {
  index: number;
  dataUrl: string;
  mimeType: 'image/jpeg' | 'image/webp';
  width: number;
  height: number;
  sizeBytes: number;
}

const MAX_DIMENSION = 900;
const TARGET_MAX_DATA_URL_LENGTH = 180_000;
const HARD_MAX_DATA_URL_LENGTH = 205_000;

interface DecodedImageSource {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  cleanup: () => void;
}

async function decodeImageFile(file: File): Promise<DecodedImageSource> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fallback to HTMLImageElement below
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('تعذر قراءة ملف الصورة.'));
      el.src = objectUrl;
    });

    return {
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  mimeType: 'image/webp' | 'image/jpeg',
  quality: number
): { dataUrl: string; mimeType: 'image/webp' | 'image/jpeg' } {
  if (mimeType === 'image/webp') {
    const webpUrl = canvas.toDataURL('image/webp', quality);
    if (webpUrl.startsWith('data:image/webp;base64,')) {
      return { dataUrl: webpUrl, mimeType: 'image/webp' };
    }
  }
  const jpegUrl = canvas.toDataURL('image/jpeg', quality);
  return { dataUrl: jpegUrl, mimeType: 'image/jpeg' };
}

export async function compressProblemPhoto(
  file: File,
  index: number
): Promise<CompressedProblemPhoto> {
  if (!file.type.startsWith('image/')) {
    throw new Error('يرجى اختيار ملفات صور صالحة فقط.');
  }

  const source = await decodeImageFile(file);
  try {
    if (source.width < 1 || source.height < 1) {
      throw new Error('أبعاد الصورة غير صالحة.');
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('المتصفح لا يدعم معالجة الصور.');
    }

    const dimensionSteps = [MAX_DIMENSION, 760, 620, 480];
    const qualitySteps = [0.74, 0.6, 0.48, 0.36];
    const formats: Array<'image/webp' | 'image/jpeg'> = ['image/webp', 'image/jpeg'];

    let bestCandidate: CompressedProblemPhoto | null = null;

    for (const maxDim of dimensionSteps) {
      const scale = Math.min(1, maxDim / Math.max(source.width, source.height));
      const targetWidth = Math.max(1, Math.min(MAX_DIMENSION, Math.round(source.width * scale)));
      const targetHeight = Math.max(1, Math.min(MAX_DIMENSION, Math.round(source.height * scale)));

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Paint white background so transparent PNGs compress cleanly to JPEG/WebP
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      source.draw(ctx, targetWidth, targetHeight);

      for (const fmt of formats) {
        for (const q of qualitySteps) {
          const encoded = encodeCanvas(canvas, fmt, q);
          const len = encoded.dataUrl.length;

          if (
            len >= 50 &&
            (!bestCandidate || len < bestCandidate.sizeBytes)
          ) {
            bestCandidate = {
              index,
              dataUrl: encoded.dataUrl,
              mimeType: encoded.mimeType,
              width: targetWidth,
              height: targetHeight,
              sizeBytes: len,
            };
          }

          if (len >= 50 && len <= TARGET_MAX_DATA_URL_LENGTH) {
            return {
              index,
              dataUrl: encoded.dataUrl,
              mimeType: encoded.mimeType,
              width: targetWidth,
              height: targetHeight,
              sizeBytes: len,
            };
          }
        }
      }
    }

    if (bestCandidate && bestCandidate.sizeBytes <= HARD_MAX_DATA_URL_LENGTH) {
      return bestCandidate;
    }

    throw new Error(
      `تعذر ضغط الصورة رقم ${index + 1} ضمن الحد الآمن لقاعدة البيانات. يرجى اختيار صورة أخرى أصغر حجماً.`
    );
  } finally {
    source.cleanup();
  }
}
