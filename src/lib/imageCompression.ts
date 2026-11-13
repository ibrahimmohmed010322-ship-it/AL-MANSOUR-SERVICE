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
const MAX_INPUT_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

interface DecodedImageSource {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  cleanup: () => void;
}

function inferMimeFromExtension(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.jpe')) {
    return 'image/jpeg';
  }
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  if (lower.endsWith('.avif')) return 'image/avif';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  return null;
}

function readAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('تعذر قراءة بيانات ملف الصورة.'));
      }
    };
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة من الجهاز.'));
    reader.onabort = () => reject(new Error('تم إلغاء قراءة ملف الصورة.'));
    reader.readAsArrayBuffer(blob);
  });
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result.startsWith('data:')) {
        resolve(reader.result);
      } else {
        reject(new Error('تعذر تحويل ملف الصورة للقراءة.'));
      }
    };
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة من الجهاز.'));
    reader.onabort = () => reject(new Error('تم إلغاء قراءة ملف الصورة.'));
    reader.readAsDataURL(blob);
  });
}

function detectMimeFromMagicBytes(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return 'image/gif';
  }
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return 'image/bmp';
  }
  if (bytes.length >= 12) {
    const boxType = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (
      boxType === 'ftyp' &&
      (brand === 'heic' ||
        brand === 'heix' ||
        brand === 'hevc' ||
        brand === 'hevx' ||
        brand === 'mif1' ||
        brand === 'msf1')
    ) {
      return 'image/heic';
    }
    if (boxType === 'ftyp' && brand === 'avif') {
      return 'image/avif';
    }
  }
  return null;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if ((img.naturalWidth || img.width) > 0 && (img.naturalHeight || img.height) > 0) {
        resolve(img);
      } else {
        reject(new Error('أبعاد الصورة غير صالحة أو الملف تالف.'));
      }
    };
    img.onerror = () => reject(new Error('تعذر فك تشفير الصورة في المتصفح.'));
    img.src = src;
  });
}

async function prepareTypedImageBlob(file: File): Promise<{ blob: Blob; mime: string }> {
  if (file.size <= 0) {
    throw new Error('ملف الصورة المختار فارغ أو تالف.');
  }
  if (file.size > MAX_INPUT_FILE_BYTES) {
    throw new Error('حجم الصورة كبير جداً (الحد الأقصى للملف 25 ميجابايت).');
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await readAsArrayBuffer(file);
  } catch {
    throw new Error('تعذر قراءة ملف الصورة من الجهاز. تأكد من صلاحية الملف وحاول مجدداً.');
  }

  if (buffer.byteLength === 0) {
    throw new Error('تعذر قراءة محتوى الصورة أو الملف فارغ.');
  }

  const head = new Uint8Array(buffer, 0, Math.min(16, buffer.byteLength));
  const magicMime = detectMimeFromMagicBytes(head);
  const declaredMime = file.type && file.type.startsWith('image/') ? file.type.toLowerCase() : null;
  const extMime = inferMimeFromExtension(file.name);
  const resolvedMime = magicMime || declaredMime || extMime;

  if (!resolvedMime) {
    throw new Error('الملف المختار ليس صورة صالحة. الصيغ المدعومة: JPEG و PNG و WebP.');
  }

  if (resolvedMime === 'image/svg+xml') {
    throw new Error('صيغة SVG غير مدعومة. يرجى اختيار صورة بصيغة JPEG أو PNG أو WebP.');
  }

  if (resolvedMime === 'image/heic' || resolvedMime === 'image/heif') {
    throw new Error(
      'صيغة الصورة (HEIC) غير مدعومة مباشرة في المتصفح. يرجى اختيار صورة بصيغة JPEG أو PNG أو WebP.'
    );
  }

  return {
    blob: new Blob([buffer], { type: resolvedMime }),
    mime: resolvedMime,
  };
}

async function decodeImageBlob(blob: Blob): Promise<DecodedImageSource> {
  // 1. Primary path: FileReader -> DataURL -> HTMLImageElement (most reliable across Android Chrome, WebViews, and iframes)
  try {
    const dataUrl = await readAsDataUrl(blob);
    const img = await loadImageElement(dataUrl);
    return {
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
      cleanup: () => {
        img.src = '';
      },
    };
  } catch {
    // Fallback below
  }

  // 2. Fallback: createImageBitmap (handles large camera images natively)
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fallback below
    }
  }

  // 3. Final fallback: ObjectURL -> HTMLImageElement
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await loadImageElement(objectUrl);
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
  const { blob } = await prepareTypedImageBlob(file);

  let source: DecodedImageSource;
  try {
    source = await decodeImageBlob(blob);
  } catch {
    throw new Error(
      'تعذر قراءة ملف الصورة. تأكد من أن الصورة صالحة وبصيغة JPEG أو PNG أو WebP.'
    );
  }

  try {
    if (source.width < 1 || source.height < 1) {
      throw new Error('أبعاد الصورة غير صالحة.');
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('المتصفح الحالي لا يدعم معالجة وضغط الصور.');
    }

    const dimensionSteps = [MAX_DIMENSION, 760, 620, 480, 360];
    const qualitySteps = [0.74, 0.6, 0.48, 0.36, 0.28];
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
      `تعذر ضغط الصورة رقم ${index + 1} ضمن الحد الآمن لقاعدة البيانات. يرجى اختيار صورة أخرى.`
    );
  } finally {
    source.cleanup();
  }
}
