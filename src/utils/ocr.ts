export async function extractTextFromImages(
  files: File[],
  onProgress?: (current: number, total: number, status: string) => void
): Promise<string> {
  // Dynamic import — tesseract.js is large (~800KB) and only needed in image mode
  const Tesseract = await import('tesseract.js');

  const texts: string[] = [];

  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length, '正在识别中...');

    const result = await Tesseract.recognize(files[i], 'chi_sim+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const pct = Math.round(m.progress * 100);
          onProgress?.(i + 1, files.length, `图片 ${i + 1}/${files.length} — ${pct}%`);
        }
      },
    });

    const text = result.data.text.trim();
    if (text) {
      texts.push(`--- 图片 ${i + 1} ---\n${text}`);
    }
  }

  return texts.join('\n\n');
}
