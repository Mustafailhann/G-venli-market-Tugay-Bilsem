/**
 * Resmi belirtilen boyuta küçültüp JPEG olarak sıkıştırır, base64 data URL döner.
 * Firestore'da saklanabilecek boyutta olur (~50-150KB).
 */
export function compressImage(
    file: File,
    maxWidth = 400,
    maxHeight = 400,
    quality = 0.7
): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');

                let { width, height } = img;

                // Oranı koruyarak küçült
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context oluşturulamadı'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // JPEG olarak sıkıştır ve base64 data URL döndür
                const dataURL = canvas.toDataURL('image/jpeg', quality);
                resolve(dataURL);
            };
            img.onerror = () => reject(new Error('Resim yüklenemedi'));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Dosya okunamadı'));
        reader.readAsDataURL(file);
    });
}
