/**
 * Shows a toast notification
 * This is a simple implementation since we don't have direct access to the toast context
 * 
 * @param message The message to display
 * @param type The type of notification ('success' or 'error')
 */
export const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  // Try to find existing toast container
  let toastContainer = document.querySelector('.toast-container') as HTMLDivElement;
  
  // Create toast container if it doesn't exist
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container fixed top-4 right-4 z-50 flex flex-col gap-2';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `px-4 py-3 rounded-md shadow-md text-sm font-medium 
    ${type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
    animate-toast flex items-center`;
  toast.innerHTML = message;
  
  // Add animation styles if not already in the document
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes toastIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes toastOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-10px); }
      }
      .animate-toast {
        animation: toastIn 0.3s ease forwards;
      }
      .animate-toast-out {
        animation: toastOut 0.3s ease forwards;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Remove after timeout
  setTimeout(() => {
    toast.classList.add('animate-toast-out');
    setTimeout(() => {
      toast.remove();
      
      // Remove container if empty
      if (toastContainer.children.length === 0) {
        toastContainer.remove();
      }
    }, 300);
  }, 3000);
}; 