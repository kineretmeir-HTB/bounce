// דחיסת תמונות לפני שמירה, כדי לא לסתום את הזיכרון בטלפון.
// תמונה רגילה מהמצלמה (3-6MB) יוצאת בערך 150-300KB, ועוד תמונה מוקטנת קטנה לציר הזמן.
const PHOTO_MAX = 1280;
const PHOTO_QUALITY = 0.75;
const THUMB_MAX = 320;
const THUMB_QUALITY = 0.7;

async function loadBitmap(file) {
  // createImageBitmap מסובב את התמונה לפי נתוני המצלמה (EXIF), כך שהיא לא תצא על הצד
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { /* ננסה בדרך הישנה */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function resizeToBlob(source, maxSide, quality) {
  const w = source.width, h = source.height;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', quality));
}

async function compressPhoto(file) {
  const bmp = await loadBitmap(file);
  const blob = await resizeToBlob(bmp, PHOTO_MAX, PHOTO_QUALITY);
  const thumb = await resizeToBlob(bmp, THUMB_MAX, THUMB_QUALITY);
  if (bmp.close) bmp.close();
  return { blob, thumb };
}
