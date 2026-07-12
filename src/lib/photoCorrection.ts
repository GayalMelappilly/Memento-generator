import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

let faceDetector: FaceDetector | null = null;

export async function initFaceDetector() {
  if (faceDetector) return;
  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    faceDetector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
        delegate: "CPU"
      },
      runningMode: "IMAGE"
    });
  } catch (err) {
    console.error("Failed to initialize face detector", err);
    throw err;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    if (src.startsWith("http")) {
      img.src = `/api/proxy-image?url=${encodeURIComponent(src)}`;
    } else {
      img.src = src;
    }
  });
}

export async function autoCorrectPhoto(src: string): Promise<string> {
  await initFaceDetector();
  if (!faceDetector) throw new Error("Face Detector failed to initialize");

  const img = await loadImage(src);
  
  // Downscale image if it's too large to prevent browser freeze
  const MAX_DIM = 1200;
  let scale = 1;
  if (img.width > MAX_DIM || img.height > MAX_DIM) {
    scale = Math.min(MAX_DIM / img.width, MAX_DIM / img.height);
  }

  let canvas = document.createElement("canvas");
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  let ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // STEP 1: Face Detection & Alignment
  let detections = faceDetector.detect(canvas);
  if (detections.detections.length > 0) {
    const face = detections.detections[0];
    const keypoints = face.keypoints;
    if (keypoints && keypoints.length >= 2) {
      let rightEye = keypoints[0];
      let leftEye = keypoints[1];
      
      let rx = rightEye.x * canvas.width;
      let ry = rightEye.y * canvas.height;
      let lx = leftEye.x * canvas.width;
      let ly = leftEye.y * canvas.height;

      let dy = ly - ry;
      let dx = lx - rx;
      let angle = Math.atan2(dy, dx) * (180 / Math.PI);

      if (Math.abs(angle) > 2 && Math.abs(angle) < 45) {
        let rotatedCanvas = document.createElement("canvas");
        rotatedCanvas.width = canvas.width;
        rotatedCanvas.height = canvas.height;
        let rotCtx = rotatedCanvas.getContext("2d")!;
        
        let cx = canvas.width / 2;
        let cy = canvas.height / 2;
        
        rotCtx.translate(cx, cy);
        rotCtx.rotate(angle * (Math.PI / 180));
        rotCtx.translate(-cx, -cy);
        rotCtx.drawImage(canvas, 0, 0);
        
        canvas = rotatedCanvas;
        ctx = rotCtx;
      }
    }
  }

  // STEP 2: Smart Face Centering & Crop
  // Run detection again on straightened image
  detections = faceDetector.detect(canvas);
  if (detections.detections.length > 0) {
    const face = detections.detections[0];
    const bbox = face.boundingBox;
    if (bbox) {
      const targetRatio = 1.0; // 1:1 Aspect Ratio
      const faceHeight = bbox.height;
      // Face takes up roughly 50% of the total height, leaving room for hair/head top and neck/shoulders.
      let cropHeight = faceHeight / 0.50; 
      let cropWidth = cropHeight * targetRatio;

      const faceCenterX = bbox.originX + bbox.width / 2;
      const faceCenterY = bbox.originY + bbox.height / 2;

      // Position the crop so the face is slightly above the vertical center (45% down from top)
      let cropX = faceCenterX - cropWidth / 2;
      let cropY = faceCenterY - cropHeight * 0.45;

      if (cropX < 0) {
        cropWidth += cropX * 2;
        cropX = 0;
      }
      if (cropY < 0) {
        cropHeight += cropY;
        cropY = 0;
      }
      if (cropX + cropWidth > canvas.width) {
        let diff = (cropX + cropWidth) - canvas.width;
        cropWidth -= diff * 2;
        cropX = canvas.width - cropWidth;
      }
      if (cropY + cropHeight > canvas.height) {
        cropHeight = canvas.height - cropY;
        cropWidth = cropHeight * targetRatio;
        cropX = faceCenterX - cropWidth / 2;
      }

      if (cropWidth > 0 && cropHeight > 0) {
        let finalCanvas = document.createElement("canvas");
        finalCanvas.width = cropWidth;
        finalCanvas.height = cropHeight;
        let finalCtx = finalCanvas.getContext("2d")!;
        
        finalCtx.filter = "contrast(1.05) brightness(1.02)";
        finalCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        canvas = finalCanvas;
      }
    }
  }

  return canvas.toDataURL("image/jpeg", 0.95);
}
