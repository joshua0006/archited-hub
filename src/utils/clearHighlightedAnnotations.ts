import { useAnnotationStore } from "../store/useAnnotationStore";
import { showToast } from "./toastUtils";

/**
 * Clears all highlighted annotations in the current document.
 * This function finds all annotations of type "highlight" and removes them from the document.
 * 
 * @returns {number} The number of highlighted annotations that were removed
 */
export const clearHighlightedAnnotations = (): number => {
  const annotationStore = useAnnotationStore.getState();
  const { currentDocumentId, documents } = annotationStore;
  
  if (!currentDocumentId || !documents[currentDocumentId]) {
    console.log('[clearHighlightedAnnotations] No current document');
    return 0;
  }
  
  const document = documents[currentDocumentId];
  const annotations = document.annotations;
  
  // Find all highlight annotations
  const highlightedAnnotations = annotations.filter(
    annotation => annotation.type === 'highlight'
  );
  
  if (highlightedAnnotations.length === 0) {
    console.log('[clearHighlightedAnnotations] No highlighted annotations found');
    return 0;
  }
  
  console.log(`[clearHighlightedAnnotations] Removing ${highlightedAnnotations.length} highlighted annotations`);
  
  // Get IDs of highlighted annotations
  const highlightedIds = highlightedAnnotations.map(annotation => annotation.id);
  
  // Remove each highlighted annotation
  highlightedIds.forEach(id => {
    annotationStore.deleteAnnotation(currentDocumentId, id);
  });
  
  // Also clear any selected highlights
  annotationStore.clearSelection();
  
  return highlightedIds.length;
};

/**
 * Sets up an event listener for the ESC key to clear highlighted annotations.
 * This should be called once during app initialization.
 */
export const setupEscKeyHighlightClear = () => {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Only proceed if ESC key is pressed
    if (event.key !== 'Escape') return;
    
    // Don't trigger if an input element is focused
    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement instanceof HTMLSelectElement
    ) {
      return;
    }
    
    const removed = clearHighlightedAnnotations();
    if (removed > 0) {
      console.log(`[ESC] Removed ${removed} highlighted annotations`);
      
      // Show feedback toast
      showToast(`Cleared ${removed} highlight${removed > 1 ? 's' : ''}`);
      
      // Prevent other ESC handlers from firing if we removed highlights
      event.preventDefault();
      event.stopPropagation();
    }
  };
  
  // Add event listener
  document.addEventListener('keydown', handleKeyDown);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
};

export default clearHighlightedAnnotations; 