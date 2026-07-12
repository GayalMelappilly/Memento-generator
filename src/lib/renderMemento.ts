import { LayoutConfig, Student, TemplateData } from "@/types";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let finalSrc = src;
    
    // Use proxy for external images to prevent canvas tainting and solve CORS issues.
    if (src.startsWith("http")) {
      finalSrc = `/api/proxy-image?url=${encodeURIComponent(src)}`;
      img.crossOrigin = "anonymous";
    }
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = finalSrc;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}

export async function renderMemento(
  template: TemplateData,
  student: Student,
  layout: LayoutConfig
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = template.width;
  canvas.height = template.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2d context");

  // 1. Draw solid white background (for JPEG export if template has transparency)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Draw template image
  ctx.drawImage(template.image, 0, 0, canvas.width, canvas.height);

  // 3. Draw Student Photo
  try {
    const photoImg = await loadImage(student.photo);
    const pb = layout.photoBox;
    
    ctx.save();
    
    // Create clipping path for shape
    ctx.beginPath();
    if (pb.shape === "circle") {
      const radius = Math.min(pb.width, pb.height) / 2;
      const cx = pb.x + pb.width / 2;
      const cy = pb.y + pb.height / 2;
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    } else {
      if (pb.cornerRadius > 0) {
        ctx.roundRect(pb.x, pb.y, pb.width, pb.height, pb.cornerRadius);
      } else {
        ctx.rect(pb.x, pb.y, pb.width, pb.height);
      }
    }
    ctx.clip();

    // Calculate object-fit
    let dx = pb.x, dy = pb.y, dw = pb.width, dh = pb.height;
    const imgRatio = photoImg.width / photoImg.height;
    const boxRatio = pb.width / pb.height;

    if (pb.objectFit === "cover") {
      if (imgRatio > boxRatio) {
        // Image is wider than box
        dw = pb.height * imgRatio;
        dx = pb.x - (dw - pb.width) / 2;
      } else {
        // Image is taller than box
        dh = pb.width / imgRatio;
        dy = pb.y - (dh - pb.height) / 2;
      }
    } else { // contain
      if (imgRatio > boxRatio) {
        dh = pb.width / imgRatio;
        dy = pb.y + (pb.height - dh) / 2;
      } else {
        dw = pb.height * imgRatio;
        dx = pb.x + (pb.width - dw) / 2;
      }
    }

    ctx.drawImage(photoImg, dx, dy, dw, dh);
    ctx.restore();
  } catch (err) {
    console.warn(`Could not load photo for ${student.name}`, err);
    // Continue rendering even if photo fails
  }

  // 4. Draw Student Name
  ctx.save();
  const nb = layout.nameBox;
  
  let currentFontSize = nb.fontSize;
  ctx.textBaseline = "middle"; // Change to top to handle wrapping better, but middle works if single line mostly. Let's use top.
  ctx.textBaseline = "top";
  
  let fontString = `${nb.fontWeight} ${currentFontSize}px ${nb.fontFamily}`;
  ctx.font = fontString;
  
  // Auto-shrink logic
  if (nb.autoShrink) {
    let textWidth = ctx.measureText(student.name).width;
    while (textWidth > nb.width && currentFontSize > 10) {
      currentFontSize -= 2;
      fontString = `${nb.fontWeight} ${currentFontSize}px ${nb.fontFamily}`;
      ctx.font = fontString;
      textWidth = ctx.measureText(student.name).width;
    }
  }

  ctx.fillStyle = nb.color;
  ctx.textAlign = nb.align as CanvasTextAlign;
  
  let startX = nb.x;
  if (nb.align === "center") startX = nb.x + nb.width / 2;
  else if (nb.align === "right") startX = nb.x + nb.width;

  if (!nb.autoShrink) {
    // If auto-shrink is off, we wrap text
    wrapText(ctx, student.name, startX, nb.y, nb.width, currentFontSize * 1.2);
  } else {
    // Single line, centered vertically in the box if we want
    // But textBaseline is top, so we position it at nb.y + (nb.height - currentFontSize)/2
    const yPos = nb.y + (nb.height - currentFontSize) / 2;
    ctx.fillText(student.name, startX, yPos);
  }
  ctx.restore();

  // 5. Export to JPEG
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/jpeg", 0.92);
  });
}
