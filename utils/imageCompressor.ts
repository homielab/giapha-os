const MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1MB

/**
 * Compresses an image File to fit within MAX_SIZE_BYTES (1MB).
 * Non-image files are returned as-is.
 */
export async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= MAX_SIZE_BYTES) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      // Try reducing quality in steps until size fits
      const outputType = file.type === "image/png" ? "image/jpeg" : file.type;
      let quality = 0.9;

      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Image compression failed"));
              return;
            }
            if (blob.size <= MAX_SIZE_BYTES || quality <= 0.1) {
              const ext = outputType === "image/jpeg" ? "jpg" : outputType.split("/")[1];
              const compressedName = file.name.replace(/\.[^.]+$/, `.${ext}`);
              resolve(new File([blob], compressedName, { type: outputType }));
            } else {
              quality = Math.max(quality - 0.1, 0.1);
              tryCompress();
            }
          },
          outputType,
          quality,
        );
      };

      tryCompress();
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}
