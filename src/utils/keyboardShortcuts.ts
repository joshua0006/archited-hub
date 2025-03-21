import { useAnnotationStore } from "../store/useAnnotationStore";
import { showToast } from "./toastUtils";

/**
 * Sets up keyboard shortcuts
 * 
 * @returns {Function} Cleanup function to remove event listeners
 */
export const setupCopyPasteShortcuts = () => {
  // There are no keyboard shortcuts to set up anymore - just return a no-op cleanup function
  return () => {};
};

/**
 * Helper function to get the current page number from the DOM
 */
const getCurrentPageNumber = (): number => {
  const pageElement = document.querySelector('.page-number-display');
  return pageElement ? parseInt(pageElement.textContent?.split('/')[0]?.trim() || '1') : 1;
}; 