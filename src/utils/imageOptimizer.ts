import { PhotoItem, ColorFilter, FitMode } from '../types';
import heic2any from 'heic2any';

/**
 * Checks if a file is an iPhone HEIC/HEIF image format
 */
export function isHeicFile(file: File): boolean {
  const isHeicExt = /\.(heic|heif)$/i.test(file.name);
  const isHeicMime = file.type === 'image/heic' || file.type === 'image/heif';
  return isHeicExt || isHeicMime;
}

/**
 * Converts HEIC/HEIF file to high-quality JPEG Blob
 */
export async function convertHeicToJpeg(file: File): Promise<Blob> {
  try {
    const result = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.95,
    });
    return Array.isArray(result) ? result[0] : result;
  } catch (err) {
    console.warn('Failed heic2any conversion, falling back to original blob:', err);
    return file;
  }
}

/**
 * Converts an image file/blob to a high-quality data URL.
 * Guarantees that transparent PNGs, SVGs, or any transparent images have a clean
 * pure white background so they never show up black or dark in any format.
 */
export function fileOrBlobToDataUrlWithWhiteBackground(blob: Blob): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const initialSrc = typeof reader.result === 'string' ? reader.result : URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const w = img.naturalWidth || 800;
          const h = img.naturalHeight || 600;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { alpha: false }); // alpha: false ensures pure white background

          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            // Export as high quality JPEG to permanently prevent dark/black transparency artifacts
            const whiteBgDataUrl = canvas.toDataURL('image/jpeg', 0.95);
            resolve({ dataUrl: whiteBgDataUrl, width: w, height: h });
            return;
          }
        } catch {
          // fallback if canvas taint or memory limit
        }
        resolve({ dataUrl: initialSrc, width: img.naturalWidth || 800, height: img.naturalHeight || 600 });
      };

      img.onerror = () => {
        resolve({ dataUrl: initialSrc, width: 800, height: 600 });
      };

      img.src = initialSrc;
    };

    reader.onerror = () => {
      const objUrl = URL.createObjectURL(blob);
      resolve({ dataUrl: objUrl, width: 800, height: 600 });
    };

    reader.readAsDataURL(blob);
  });
}

/**
 * Creates PhotoItem objects efficiently from File objects.
 * Handles JPG, PNG, WEBP, GIF, SVG, BMP, AVIF, TIFF, plus iPhone HEIC/HEIF formats.
 * Enforces pure white backgrounds on all formats to prevent black transparent areas.
 */
export async function processImageFiles(files: FileList | File[]): Promise<PhotoItem[]> {
  const fileArray = Array.from(files);
  const validFiles = fileArray.filter((file) => {
    const validExtensions = /\.(jpe?g|png|webp|gif|bmp|svg|avif|tiff?|ico|heic|heif)$/i;
    return (
      file.type.startsWith('image/') ||
      validExtensions.test(file.name) ||
      file.type === 'image/heic' ||
      file.type === 'image/heif'
    );
  });

  const photoPromises = validFiles.map(async (originalFile) => {
    let processableBlob: Blob = originalFile;
    let fileName = originalFile.name;

    // Convert iPhone HEIC/HEIF to JPEG
    if (isHeicFile(originalFile)) {
      try {
        processableBlob = await convertHeicToJpeg(originalFile);
        fileName = originalFile.name.replace(/\.(heic|heif)$/i, '.jpg');
      } catch (err) {
        console.warn('HEIC conversion skipped:', err);
      }
    }

    // Process image with pure white background to avoid black/dark transparent borders or areas
    const { dataUrl, width, height } = await fileOrBlobToDataUrlWithWhiteBackground(processableBlob);

    return {
      id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file: originalFile,
      name: fileName,
      size: originalFile.size,
      url: dataUrl,
      width,
      height,
      rotation: 0 as 0 | 90 | 180 | 270,
      copies: 1,
      filter: 'none' as ColorFilter,
      offsetX: 0,
      offsetY: 0,
      zoom: 1,
    };
  });

  return Promise.all(photoPromises);
}

/**
 * Revokes an array of Object URLs to prevent browser memory leaks if any were used.
 */
export function cleanupPhotoUrls(photos: PhotoItem[]) {
  photos.forEach((photo) => {
    if (photo.url && photo.url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(photo.url);
      } catch {
        // ignore
      }
    }
  });
}

export async function loadImageSafe(url: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const isLocalOrData = url.startsWith('data:') || url.startsWith('blob:');
    if (!isLocalOrData) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => resolve(img);
    img.onerror = () => {
      if (img.crossOrigin) {
        const fallback = new Image();
        fallback.onload = () => resolve(fallback);
        fallback.onerror = (e) => reject(e);
        fallback.src = url;
      } else {
        reject(new Error(`Failed to load image: ${url.slice(0, 50)}`));
      }
    };
    img.src = url;
  });
}

/**
 * Draws an image to an off-screen canvas applying fitMode (contain, cover, stretch),
 * rotation, pan offsets, and color filters (grayscale, contrast, eco) at high DPI.
 * Always draws a solid white background first so transparent parts remain pure white.
 */
export async function renderProcessedImageToCanvas(
  photo: PhotoItem,
  targetWidthPx: number,
  targetHeightPx: number,
  fitMode: FitMode,
  filter: ColorFilter = 'none',
  cellOverrides?: { offsetX?: number; offsetY?: number; zoom?: number; rotation?: number }
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, targetWidthPx);
  canvas.height = Math.max(1, targetHeightPx);
  const ctx = canvas.getContext('2d', { alpha: false });

  if (!ctx) return canvas;

  // Solid white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let img: HTMLImageElement;
  try {
    img = await loadImageSafe(photo.url);
  } catch (err) {
    console.warn('Could not load image for canvas render, using fallback:', err);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(photo.name.slice(0, 24), canvas.width / 2, canvas.height / 2);
    return canvas;
  }

  // Setup filters
  const activeFilter = filter !== 'none' ? filter : 'none';
  if (activeFilter === 'grayscale') {
    ctx.filter = 'grayscale(100%)';
  } else if (activeFilter === 'contrast') {
    ctx.filter = 'contrast(130%) brightness(105%)';
  } else if (activeFilter === 'eco') {
    ctx.filter = 'brightness(115%) saturate(85%)';
  } else if (activeFilter === 'scanner') {
    // Escáner Inteligente: fondo blanco puro y texto/tinta de alto contraste nítido
    ctx.filter = 'grayscale(100%) contrast(180%) brightness(115%)';
  }

  // Handle rotation
  const rotation = cellOverrides?.rotation !== undefined ? cellOverrides.rotation : (photo.rotation || 0);
  const isRotated90or270 = rotation === 90 || rotation === 270;
  const sourceWidth = Math.max(1, isRotated90or270 ? img.naturalHeight : img.naturalWidth);
  const sourceHeight = Math.max(1, isRotated90or270 ? img.naturalWidth : img.naturalHeight);

  let drawWidth = targetWidthPx;
  let drawHeight = targetHeightPx;
  let offsetX = 0;
  let offsetY = 0;

  if (fitMode === 'contain') {
    const scale = Math.min(targetWidthPx / sourceWidth, targetHeightPx / sourceHeight);
    drawWidth = sourceWidth * scale;
    drawHeight = sourceHeight * scale;
  } else if (fitMode === 'cover') {
    const scale = Math.max(targetWidthPx / sourceWidth, targetHeightPx / sourceHeight);
    drawWidth = sourceWidth * scale;
    drawHeight = sourceHeight * scale;
  }

  // Apply user manual pan offsets (-100 to 100%) and zoom
  const offX = cellOverrides?.offsetX !== undefined ? cellOverrides.offsetX : 0;
  const offY = cellOverrides?.offsetY !== undefined ? cellOverrides.offsetY : 0;
  
  const panShiftX = (offX / 100) * (targetWidthPx - drawWidth);
  const panShiftY = (offY / 100) * (targetHeightPx - drawHeight);

  offsetX = (targetWidthPx - drawWidth) / 2 + panShiftX;
  offsetY = (targetHeightPx - drawHeight) / 2 + panShiftY;

  ctx.save();
  // Clip to cell bounds
  ctx.beginPath();
  ctx.rect(0, 0, targetWidthPx, targetHeightPx);
  ctx.clip();

  // Apply photo zoom if present (centered zoom matching preview)
  const zoom = cellOverrides?.zoom !== undefined ? cellOverrides.zoom : 1;
  const effectiveZoom = zoom > 0 ? zoom : 1;
  if (effectiveZoom !== 1) {
    ctx.translate(targetWidthPx / 2, targetHeightPx / 2);
    ctx.scale(effectiveZoom, effectiveZoom);
    ctx.translate(-targetWidthPx / 2, -targetHeightPx / 2);
  }

  // Center rotation transformation
  const cellCenterX = offsetX + drawWidth / 2;
  const cellCenterY = offsetY + drawHeight / 2;

  ctx.translate(cellCenterX, cellCenterY);
  ctx.rotate((rotation * Math.PI) / 180);

  const finalImgW = isRotated90or270 ? drawHeight : drawWidth;
  const finalImgH = isRotated90or270 ? drawWidth : drawHeight;

  ctx.drawImage(img, -finalImgW / 2, -finalImgH / 2, finalImgW, finalImgH);
  ctx.restore();

  // If binary threshold filter was requested, apply post-processing pixel binarization
  if (activeFilter === 'binary') {
    try {
      const imgData = ctx.getImageData(0, 0, targetWidthPx, targetHeightPx);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        // Luminance calculation
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const val = lum > 145 ? 255 : 0;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }
      ctx.putImageData(imgData, 0, 0);
    } catch {
      // ignore if canvas tainted
    }
  }

  return canvas;
}
