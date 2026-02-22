
/**
 * Processes an image file:
 * 1. Resizes/Crops it to a target 3:4 aspect ratio (900x1200)
 * 2. Converts it to WebP format
 * 
 * @param file The input file object
 * @returns A Promise resolving to the processed WebP File object
 */
export async function processImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Canvas context not available'));
                    return;
                }

                // Target dimensions (3:4 aspect ratio, high quality)
                const TARGET_WIDTH = 900;
                const TARGET_HEIGHT = 1200;

                canvas.width = TARGET_WIDTH;
                canvas.height = TARGET_HEIGHT;

                // Calculate crop
                const sourceAspectRatio = img.width / img.height;
                const targetAspectRatio = TARGET_WIDTH / TARGET_HEIGHT;

                let drawWidth, drawHeight, offsetX, offsetY;

                if (sourceAspectRatio > targetAspectRatio) {
                    // Image is wider than target
                    drawHeight = img.height;
                    drawWidth = img.height * targetAspectRatio;
                    offsetX = (img.width - drawWidth) / 2;
                    offsetY = 0;
                } else {
                    // Image is taller than target
                    drawWidth = img.width;
                    drawHeight = img.width / targetAspectRatio;
                    offsetX = 0;
                    offsetY = (img.height - drawHeight) / 2;
                }

                // Fill background (optional, but good for transparency)
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

                // Draw image with crop
                ctx.drawImage(
                    img,
                    offsetX,
                    offsetY,
                    drawWidth,
                    drawHeight,
                    0,
                    0,
                    TARGET_WIDTH,
                    TARGET_HEIGHT
                );

                // Convert to WebP
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                                type: 'image/webp',
                                lastModified: Date.now(),
                            });
                            resolve(newFile);
                        } else {
                            reject(new Error('Canvas to Blob conversion failed'));
                        }
                    },
                    'image/webp',
                    0.85 // Quality
                );
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
}
