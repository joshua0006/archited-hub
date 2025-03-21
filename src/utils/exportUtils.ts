import { PDFPageProxy } from "pdfjs-dist";
import { Annotation } from "../types/annotation";
import { drawAnnotation } from "../utils/drawingUtils";
import { jsPDF } from "jspdf";
import { useAnnotationStore } from "../store/useAnnotationStore";

/**
 * Creates a high-resolution canvas for export with PDF content and annotations
 */
export const createExportCanvas = async (
  page: PDFPageProxy,
  scale: number,
  annotations: Annotation[],
  qualityMultiplier: number = 2 // Default to 2x for higher resolution
) => {
  // Create a canvas with higher resolution
  const exportCanvas = document.createElement("canvas");
  
  // Apply the quality multiplier to the viewport scale for higher resolution
  const exportScale = scale * qualityMultiplier;
  const viewport = page.getViewport({ scale: exportScale });
  
  // Set canvas dimensions to the higher resolution
  exportCanvas.width = viewport.width;
  exportCanvas.height = viewport.height;
  
  const ctx = exportCanvas.getContext("2d", { 
    alpha: false,
    willReadFrequently: true // Optimize for potential data reading
  })!;
  
  // Enable high-quality image interpolation
  if (ctx) {
    // @ts-ignore - Some browsers may not support these properties
    ctx.imageSmoothingEnabled = true;
    // @ts-ignore
    ctx.imageSmoothingQuality = 'high';
  }
  
  // Set a white background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

  // Render the PDF page with higher quality
  await page.render({
    canvasContext: ctx,
    viewport,
    intent: "print" // Use print intent for higher quality
  }).promise;

  // Draw annotations in two passes at the higher resolution
  // First pass: Draw all non-highlight annotations
  const regularAnnotations = annotations.filter(a => a.type !== 'highlight');
  regularAnnotations.forEach((annotation) => {
    try {
      drawAnnotation(ctx, annotation, exportScale);
    } catch (error) {
      console.error("Error drawing annotation:", error, annotation);
    }
  });
  
  // Second pass: Draw highlights with proper blending
  const highlightAnnotations = annotations.filter(a => a.type === 'highlight');
  if (highlightAnnotations.length > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    
    highlightAnnotations.forEach((annotation) => {
      try {
        drawAnnotation(ctx, annotation, exportScale);
      } catch (error) {
        console.error("Error drawing highlight:", error, annotation);
      }
    });
    
    ctx.restore();
  }

  // Return both the canvas and viewport dimensions
  return { 
    canvas: exportCanvas, 
    viewport,
    qualityMultiplier
  };
};

/**
 * Exports the canvas as a PNG file
 */
export const exportToPNG = (canvas: HTMLCanvasElement, pageNumber: number) => {
  // Use maximum quality for PNG export
  const dataUrl = canvas.toDataURL("image/png", 1.0);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `page-${pageNumber}.png`;
  a.click();
};

/**
 * Exports the canvas as a PDF file with optimized quality
 */
export const exportToPDF = async (
  canvas: HTMLCanvasElement,
  viewport: { width: number; height: number },
  pageNumber: number,
  qualityMultiplier: number = 2
) => {
  // Create a PDF with dimensions matching the original document (not the scaled-up version)
  const originalWidth = viewport.width / qualityMultiplier;
  const originalHeight = viewport.height / qualityMultiplier;
  
  const pdf = new jsPDF({
    orientation: originalWidth > originalHeight ? "landscape" : "portrait",
    unit: "pt", // Use points for more precise sizing
    format: [originalWidth, originalHeight],
    compress: true // Enable compression for smaller file size
  });

  // Add the high-resolution image to the PDF
  // The image will be automatically scaled down to fit the PDF dimensions
  // while maintaining the higher quality
  pdf.addImage(
    canvas.toDataURL("image/jpeg", 0.95), // Use JPEG with 95% quality for better compression
    "JPEG",
    0,
    0,
    originalWidth,
    originalHeight
  );

  // Save the PDF with a more descriptive name
  pdf.save(`annotated-page-${pageNumber}-high-quality.pdf`);
};

/**
 * Creates a high-quality multi-page PDF with all pages and annotations
 */
export const createHighQualityPDF = async (
  pdf: any,
  pages: number,
  getPageAnnotations: (pageNum: number) => Annotation[],
  qualityMultiplier: number = 2
) => {
  // Create a combined PDF document
  const firstPage = await pdf.getPage(1);
  const viewport = firstPage.getViewport({ scale: 1 });
  
  const combinedPDF = new jsPDF({
    orientation: viewport.width > viewport.height ? "landscape" : "portrait",
    unit: "pt",
    format: [viewport.width, viewport.height],
    compress: true
  });
  
  // Process each page
  for (let pageNum = 1; pageNum <= pages; pageNum++) {
    try {
      // Get the page
      const page = await pdf.getPage(pageNum);
      
      // Get annotations for this page
      const annotations = getPageAnnotations(pageNum);
      
      // Create high-resolution canvas
      const { canvas } = await createExportCanvas(
        page,
        1.0, // Base scale
        annotations,
        qualityMultiplier
      );
      
      // Add a new page for all pages after the first
      if (pageNum > 1) {
        combinedPDF.addPage([viewport.width, viewport.height]);
      }
      
      // Add the high-resolution image to the PDF
      combinedPDF.addImage(
        canvas.toDataURL("image/jpeg", 0.95),
        "JPEG",
        0,
        0,
        viewport.width,
        viewport.height
      );
      
      // Clean up
      canvas.width = 0;
      canvas.height = 0;
      
    } catch (error) {
      console.error(`Error processing page ${pageNum}:`, error);
      throw error;
    }
  }
  
  return combinedPDF;
};

// Export annotations to JSON
export const exportAnnotations = (
  annotations: Annotation[],
  documentId: string
) => {
  const data = JSON.stringify(annotations, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `annotations-${documentId}.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};

// Import annotations from JSON file
export const importAnnotations = async (file: File): Promise<Annotation[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const annotations = JSON.parse(e.target?.result as string);
        resolve(annotations);
      } catch (error) {
        reject(new Error("Failed to parse annotations file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};

// Add function to save annotations separately
export const saveAnnotations = (documentId: string) => {
  const state = useAnnotationStore.getState();
  const document = state.documents[documentId];
  
  if (!document) return;

  try {
    const data = JSON.stringify({
      annotations: document.annotations,
      timestamp: Date.now(),
      version: 1,
    });

    localStorage.setItem(`annotations-${documentId}`, data);
  } catch (error) {
    console.error('Error saving annotations:', error);
  }
};

// Add function to load annotations
export const loadAnnotations = (documentId: string) => {
  try {
    const data = localStorage.getItem(`annotations-${documentId}`);
    if (!data) return null;

    const parsed = JSON.parse(data);
    return parsed.annotations;
  } catch (error) {
    console.error('Error loading annotations:', error);
    return null;
  }
};
