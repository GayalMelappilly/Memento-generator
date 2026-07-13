import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import { getOpenCV } from "./opencvWasm";

export const PASSPORT_WIDTH = 500;
export const PASSPORT_HEIGHT = 500;
export const PASSPORT_ASPECT_RATIO = PASSPORT_WIDTH / PASSPORT_HEIGHT;

export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; width: number; height: number }

export interface PhotoState {
  originalSrc: string;
  status: "pending" | "success" | "needs_corners" | "error";
  processedSrc: string | null;
  detectedCorners: Point[] | null;
  cropBox: Rect | null; // Face crop box on the extracted print
}

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

export function loadImage(src: string): Promise<HTMLImageElement> {
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

/**
 * Ensures points are ordered: top-left, top-right, bottom-right, bottom-left
 */
function orderCorners(pts: Point[]): Point[] {
  const center = pts.reduce((acc, p) => ({ x: acc.x + p.x / 4, y: acc.y + p.y / 4 }), { x: 0, y: 0 });
  const sorted = [...pts].sort((a, b) => {
    const angleA = Math.atan2(a.y - center.y, a.x - center.x);
    const angleB = Math.atan2(b.y - center.y, b.x - center.x);
    return angleA - angleB;
  });
  const tl = pts.find(p => p.x < center.x && p.y < center.y);
  const tr = pts.find(p => p.x >= center.x && p.y < center.y);
  const br = pts.find(p => p.x >= center.x && p.y >= center.y);
  const bl = pts.find(p => p.x < center.x && p.y >= center.y);
  
  if (tl && tr && br && bl) return [tl, tr, br, bl];
  return [sorted[0], sorted[1], sorted[2], sorted[3]]; 
}

/**
 * Stage 1: Print boundary detection and perspective warp
 */
export async function extractPrint(img: HTMLImageElement, overrideCorners?: Point[]): Promise<{ canvas: HTMLCanvasElement | null, corners: Point[] | null }> {
  const cv = await getOpenCV();
  
  let srcMat = cv.imread(img);
  let outputCanvas = document.createElement("canvas");
  
  let corners: Point[] = overrideCorners || [];

  if (corners.length !== 4) {
    // Auto-detect using Canny Edge
    let gray = new cv.Mat();
    cv.cvtColor(srcMat, gray, cv.COLOR_RGBA2GRAY, 0);
    
    let blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    
    let edges = new cv.Mat();
    cv.Canny(blurred, edges, 75, 200);
    
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
    
    let maxArea = 0;
    let bestApprox = new cv.Mat();
    
    for (let i = 0; i < contours.size(); ++i) {
      let cnt = contours.get(i);
      let area = cv.contourArea(cnt);
      if (area > (img.width * img.height * 0.1)) {
        let peri = cv.arcLength(cnt, true);
        let approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
        
        if (approx.rows === 4 && area > maxArea) {
          maxArea = area;
          approx.copyTo(bestApprox);
        }
        approx.delete();
      }
      cnt.delete();
    }
    
    if (bestApprox.rows === 4) {
      for (let i = 0; i < 4; i++) {
        corners.push({ x: bestApprox.data32S[i * 2], y: bestApprox.data32S[i * 2 + 1] });
      }
      corners = orderCorners(corners);
    }
    
    gray.delete(); blurred.delete(); edges.delete(); contours.delete(); hierarchy.delete(); bestApprox.delete();
  }

  if (corners.length === 4) {
    const tl = corners[0]; const tr = corners[1]; const br = corners[2]; const bl = corners[3];
    
    const widthA = Math.sqrt(Math.pow(br.x - bl.x, 2) + Math.pow(br.y - bl.y, 2));
    const widthB = Math.sqrt(Math.pow(tr.x - tl.x, 2) + Math.pow(tr.y - tl.y, 2));
    const maxWidth = Math.max(Math.floor(widthA), Math.floor(widthB));
    
    const heightA = Math.sqrt(Math.pow(tr.x - br.x, 2) + Math.pow(tr.y - br.y, 2));
    const heightB = Math.sqrt(Math.pow(tl.x - bl.x, 2) + Math.pow(tl.y - bl.y, 2));
    const maxHeight = Math.max(Math.floor(heightA), Math.floor(heightB));
    
    let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
    let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, maxWidth, 0, maxWidth, maxHeight, 0, maxHeight]);
    
    let M = cv.getPerspectiveTransform(srcTri, dstTri);
    let warped = new cv.Mat();
    let dsize = new cv.Size(maxWidth, maxHeight);
    cv.warpPerspective(srcMat, warped, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
    
    cv.imshow(outputCanvas, warped);
    
    srcTri.delete(); dstTri.delete(); M.delete(); warped.delete(); srcMat.delete();
    return { canvas: outputCanvas, corners };
  }
  
  srcMat.delete();
  return { canvas: null, corners: null };
}

/**
 * Stage 2: Face Detection, Alignment, and Standard Crop
 */
export async function alignAndCropFace(canvas: HTMLCanvasElement): Promise<{ canvas: HTMLCanvasElement | null, cropBox: Rect | null }> {
  await initFaceDetector();
  if (!faceDetector) throw new Error("Face Detector not ready");
  
  let detections = faceDetector.detect(canvas);
  if (detections.detections.length === 0) return { canvas: null, cropBox: null };
  
  const face = detections.detections[0];
  const keypoints = face.keypoints;
  
  let resultCanvas = canvas;
  
  // 1. Align (Rotate)
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
    
    if (Math.abs(angle) > 2) {
      let rotatedCanvas = document.createElement("canvas");
      rotatedCanvas.width = canvas.width;
      rotatedCanvas.height = canvas.height;
      let rotCtx = rotatedCanvas.getContext("2d")!;
      let cx = canvas.width / 2;
      let cy = canvas.height / 2;
      
      let rad = Math.abs(angle) * (Math.PI / 180);
      let scale = Math.cos(rad) + Math.sin(rad) * Math.max(canvas.width / canvas.height, canvas.height / canvas.width);
      
      rotCtx.translate(cx, cy);
      rotCtx.rotate(angle * (Math.PI / 180));
      rotCtx.scale(scale, scale);
      rotCtx.translate(-cx, -cy);
      rotCtx.drawImage(canvas, 0, 0);
      resultCanvas = rotatedCanvas;
      
      // Re-detect on rotated canvas
      detections = faceDetector.detect(resultCanvas);
    }
  }
  
  if (detections.detections.length === 0) return { canvas: resultCanvas, cropBox: null };
  
  // 2. Compute Crop Box (1:1 Aspect Ratio)
  const finalFace = detections.detections[0];
  const bbox = finalFace.boundingBox;
  if (!bbox) return { canvas: resultCanvas, cropBox: null };
  
  // Head is ~60% of the image height.
  const targetCropHeight = bbox.height / 0.60; 
  const targetCropWidth = targetCropHeight * PASSPORT_ASPECT_RATIO;
  
  const faceCenterX = bbox.originX + bbox.width / 2;
  const faceCenterY = bbox.originY + bbox.height / 2;
  
  let cropX = faceCenterX - targetCropWidth / 2;
  let cropY = faceCenterY - targetCropHeight * 0.45; // slightly above center vertically
  
  const cropBox = { x: cropX, y: cropY, width: targetCropWidth, height: targetCropHeight };
  
  // 3. Draw final crop to standardized output
  let outCanvas = document.createElement("canvas");
  outCanvas.width = PASSPORT_WIDTH;
  outCanvas.height = PASSPORT_HEIGHT;
  let outCtx = outCanvas.getContext("2d")!;
  
  outCtx.drawImage(resultCanvas, cropBox.x, cropBox.y, cropBox.width, cropBox.height, 0, 0, PASSPORT_WIDTH, PASSPORT_HEIGHT);
  
  return { canvas: outCanvas, cropBox };
}

/**
 * Stage 3: Histogram Normalization (Brightness/Contrast)
 */
export function normalizeBrightness(canvas: HTMLCanvasElement): HTMLCanvasElement {
  let ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  let min = 255, max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const luma = data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114;
    if (luma < min) min = luma;
    if (luma > max) max = luma;
  }
  
  const range = max - min;
  if (range > 0 && range < 255) {
    const scale = 255 / range;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, (data[i] - min) * scale));
      data[i+1] = Math.min(255, Math.max(0, (data[i+1] - min) * scale));
      data[i+2] = Math.min(255, Math.max(0, (data[i+2] - min) * scale));
    }
    ctx.putImageData(imageData, 0, 0);
  }
  
  return canvas;
}

export async function processPhotoPipeline(src: string, overrideCorners?: Point[]): Promise<PhotoState> {
  const state: PhotoState = {
    originalSrc: src,
    status: "pending",
    processedSrc: null,
    detectedCorners: null,
    cropBox: null
  };
  
  try {
    const img = await loadImage(src);
    
    // Stage 1: Try to extract a warped print if corners are found or provided
    let faceInputCanvas: HTMLCanvasElement;
    const { canvas: printCanvas, corners } = await extractPrint(img, overrideCorners);
    
    if (printCanvas && corners && corners.length === 4) {
      faceInputCanvas = printCanvas;
      state.detectedCorners = corners;
    } else {
      // If Stage 1 failed (no clear print rectangle found), just proceed to Stage 2 with the original image!
      const rawCanvas = document.createElement("canvas");
      rawCanvas.width = img.width;
      rawCanvas.height = img.height;
      const ctx = rawCanvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      faceInputCanvas = rawCanvas;
    }
    
    // Stage 2: Align face, rotate, and crop to 1:1 ratio
    const { canvas: faceCanvas, cropBox } = await alignAndCropFace(faceInputCanvas);
    if (!faceCanvas) {
      // If Face Detection fails, then we truly need manual intervention
      state.status = "needs_corners"; 
      return state;
    }
    state.cropBox = cropBox;
    
    // Stage 3: Normalize
    const finalCanvas = normalizeBrightness(faceCanvas);
    
    state.processedSrc = finalCanvas.toDataURL("image/jpeg", 0.95);
    state.status = "success";
    return state;
  } catch (err) {
    console.error("Pipeline error", err);
    state.status = "error";
    return state;
  }
}
