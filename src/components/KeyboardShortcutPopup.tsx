import React, { useState, useRef, useEffect } from 'react';
import { KEYBOARD_SHORTCUTS } from '../constants/toolbar';

// Define animation styles directly
const animationStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes scaleIn {
    from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out forwards;
  }
  
  .animate-scaleIn {
    animation: scaleIn 0.2s ease-out forwards;
  }
`;

interface ShortcutPopupProps {
  shortcut: string;
  description: string;
  isOpen: boolean;
  onClose: () => void;
  position: { x: number, y: number };
}

const ShortcutPopup: React.FC<ShortcutPopupProps> = ({ 
  shortcut, 
  description, 
  isOpen, 
  onClose,
  position 
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <style>{animationStyles}</style>
      {shortcut === '?' ? (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 animate-fadeIn"
            onClick={onClose}
          />
          <div 
            ref={popupRef}
            className="fixed z-50 bg-white rounded-md shadow-lg border border-gray-200 p-4 w-96 max-w-[90vw] max-h-[80vh] overflow-y-auto animate-scaleIn"
            style={{ 
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium text-gray-800 text-lg">Keyboard Shortcuts</span>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 h-6 w-6 flex items-center justify-center rounded-full hover:bg-gray-100">
                &times;
              </button>
            </div>
            
            <div className="divide-y divide-gray-100">
              <div className="pb-3">
                <h3 className="font-medium text-gray-700 mb-2">Tool Shortcuts</h3>
                <div className="space-y-1.5">
                  {Object.entries(KEYBOARD_SHORTCUTS.tools).map(([tool, key]) => (
                    <div key={tool} className="flex justify-between">
                      <span className="text-sm text-gray-600">{tool.charAt(0).toUpperCase() + tool.slice(1)}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{key}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="py-3">
                <h3 className="font-medium text-gray-700 mb-2">Action Shortcuts</h3>
                <div className="space-y-1.5">
                  {Object.entries(KEYBOARD_SHORTCUTS.actions).map(([action, key]) => (
                    <div key={action} className="flex justify-between">
                      <span className="text-sm text-gray-600">{action.charAt(0).toUpperCase() + action.slice(1)}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{key}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 animate-fadeIn"
            onClick={onClose}
          />
          <div 
            ref={popupRef}
            className="fixed z-50 bg-white rounded-md shadow-lg border border-gray-200 p-3 w-64 max-w-[90vw] animate-scaleIn"
            style={{ 
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-700">Keyboard Shortcut</span>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                &times;
              </button>
            </div>
            <div className="mb-2">
              <div className="inline-block bg-gray-100 rounded px-2 py-1 text-sm font-mono">
                {shortcut}
              </div>
            </div>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </>
      )}
    </>
  );
};

// Map of shortcut keys to their descriptions
const shortcutDescriptions: Record<string, string> = {
  [KEYBOARD_SHORTCUTS.tools.select]: "Select tool: Click to select and move annotations",
  [KEYBOARD_SHORTCUTS.tools.freehand]: "Freehand tool: Draw with freehand pencil",
  [KEYBOARD_SHORTCUTS.tools.rectangle]: "Rectangle tool: Draw rectangular shapes",
  [KEYBOARD_SHORTCUTS.tools.circle]: "Circle tool: Draw circular shapes",
  [KEYBOARD_SHORTCUTS.tools.line]: "Line tool: Draw straight lines",
  [KEYBOARD_SHORTCUTS.tools.arrow]: "Arrow tool: Draw arrows",
  [KEYBOARD_SHORTCUTS.tools.text]: "Text tool: Add text annotations",
  [KEYBOARD_SHORTCUTS.tools.highlight]: "Highlight tool: Highlight areas",
  [KEYBOARD_SHORTCUTS.actions.undo]: "Undo the last action",
  [KEYBOARD_SHORTCUTS.actions.redo]: "Redo the last undone action",
  [KEYBOARD_SHORTCUTS.actions.redoAlt]: "Alternative shortcut for redo",
  [KEYBOARD_SHORTCUTS.actions.delete]: "Delete selected elements",
  [KEYBOARD_SHORTCUTS.actions.selectAll]: "Select all annotations",
  [KEYBOARD_SHORTCUTS.actions.escape]: "Cancel current operation or clear all highlighted annotations",
  '?': "View all keyboard shortcuts"
};

export const useShortcutPopup = () => {
  const [popupState, setPopupState] = useState<{
    isOpen: boolean;
    shortcut: string;
    description: string;
    position: { x: number, y: number };
  }>({
    isOpen: false,
    shortcut: '',
    description: '',
    position: { x: 0, y: 0 }
  });

  const showPopup = (shortcut: string, event: React.MouseEvent) => {
    const description = shortcutDescriptions[shortcut] || 'No description available';
    setPopupState({
      isOpen: true,
      shortcut,
      description,
      position: { x: 0, y: 0 }
    });
  };

  const hidePopup = () => {
    setPopupState(prev => ({ ...prev, isOpen: false }));
  };

  return {
    popupState,
    showPopup,
    hidePopup,
    ShortcutPopup
  };
};

export default ShortcutPopup; 