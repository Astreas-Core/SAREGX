export async function getAverageColor(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // Sample the center 50% of the image to completely avoid the black letterbox bars on YouTube thumbnails
        const sx = img.width * 0.25;
        const sy = img.height * 0.25;
        const sWidth = img.width * 0.5;
        const sHeight = img.height * 0.5;
        
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 1, 1);
        
        const imageData = ctx.getImageData(0, 0, 1, 1).data;
        const r = imageData[0];
        const g = imageData[1];
        const b = imageData[2];
        
        // Calculate brightness
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        let finalR = r;
        let finalG = g;
        let finalB = b;

        // Boost saturation and brightness heavily so it looks like a glowing neon theme
        if (brightness < 80) {
           finalR = Math.min(255, r + 80);
           finalG = Math.min(255, g + 80);
           finalB = Math.min(255, b + 80);
        }
        
        // Find the dominant color channel and boost it further for vibrancy
        const max = Math.max(finalR, finalG, finalB);
        if (max === finalR) finalR = Math.min(255, finalR + 40);
        else if (max === finalG) finalG = Math.min(255, finalG + 40);
        else if (max === finalB) finalB = Math.min(255, finalB + 40);

        const hex = rgbToHex(finalR, finalG, finalB);
        resolve({
          hex: hex,
          rgb: `${Math.round(finalR)}, ${Math.round(finalG)}, ${Math.round(finalB)}`
        });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => reject(err);
    img.src = imageUrl;
  });
}

function rgbToHex(r, g, b) {
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}
