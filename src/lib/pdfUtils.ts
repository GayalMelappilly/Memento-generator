import * as pdfjsLib from "pdfjs-dist";

// Use unpkg to load the worker, matching the exact version installed
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export async function renderPdfToImage(url: string): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ url });
  const pdf = await loadingTask.promise;
  
  // Render the first page
  const page = await pdf.getPage(1);
  
  // Choose a scale that gives a high-quality image (e.g., 2.0 or 3.0)
  const scale = 3.0; 
  const viewport = page.getViewport({ scale });
  
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  
  if (!context) {
    throw new Error("Could not get canvas context");
  }
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  const renderContext: any = {
    canvasContext: context,
    viewport: viewport,
  };
  
  await page.render(renderContext).promise;
  
  // Return the high-quality image data URL
  return canvas.toDataURL("image/png");
}
