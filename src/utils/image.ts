export async function compressImage(file: File, maxWidth: number = 800, quality: number = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建画布上下文'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    reader.readAsDataURL(file);
  });
}

export function getImageSizeInBytes(dataUrl: string): number {
  const base64Data = dataUrl.split(',')[1];
  return Math.round((base64Data.length * 3) / 4);
}

// 从拖拽事件中提取图片文件（过滤掉非图片类型）
export function getDroppedImageFiles(dataTransfer: DataTransfer | null): File[] {
  const files = Array.from(dataTransfer?.files || []);
  return files.filter((f) => f.type.startsWith('image/'));
}