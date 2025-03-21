import React, { useEffect, useRef, useState } from "react";
import {
  TOOLS,
  COLORS,
  LINE_WIDTHS,
  OPACITY_LEVELS,
} from "../constants/toolbar";
import { ToolbarSection } from "./Toolbar/ToolbarSection";
import { ToolButton } from "./Toolbar/ToolButton";
import { useKeyboardShortcutGuide } from "../hooks/useKeyboardShortcutGuide";
import { HelpCircle, Type, StickyNote } from "lucide-react";
import { useAnnotationStore } from "../store/useAnnotationStore";
import { useShortcutPopup } from "./KeyboardShortcutPopup";

// Type assertion helper function
const getOptionalShortcut = (tool: any): string | undefined => {
  return tool.shortcut as string | undefined;
};

// Helper function to dispatch annotation change event
const dispatchAnnotationChangeEvent = (pageNumber: number = 1) => {
  // Create the event
  const event = new CustomEvent('annotationChanged', {
    bubbles: true,
    detail: { pageNumber, source: 'toolbar' }
  });
  
  // First try to dispatch to the PDF container
  const pdfContainer = document.querySelector('.pdf-container');
  if (pdfContainer) {
    pdfContainer.dispatchEvent(event);
    console.log('[Toolbar] Dispatched annotationChanged event to PDF container');
  }
  
  // Also try to dispatch directly to annotation canvas
  const annotationCanvas = document.querySelector('.annotation-canvas-container canvas') as HTMLCanvasElement;
  if (annotationCanvas) {
    annotationCanvas.dataset.forceRender = 'true';
    annotationCanvas.dispatchEvent(event);
    console.log('[Toolbar] Set forceRender flag on annotation canvas');
  }
  
  // Set the tool change indicator
  const toolChangeIndicator = document.getElementById('tool-change-indicator') as HTMLDivElement;
  if (toolChangeIndicator) {
    toolChangeIndicator.dataset.toolChanged = 'true';
    console.log('[Toolbar] Set toolChanged flag on indicator');
  }
};

export const Toolbar = () => {
  const { setIsShortcutGuideOpen } = useKeyboardShortcutGuide();
  const { 
    currentStyle, 
    setCurrentStyle, 
    currentTool, 
    setCurrentTool,
    currentDocumentId,
    documents
  } = useAnnotationStore();
  const { popupState, showPopup, hidePopup, ShortcutPopup } = useShortcutPopup();

  // New state for text tool options
  const [textFontSize, setTextFontSize] = useState(14);
  const [textFontFamily, setTextFontFamily] = useState('Arial');
  const [showTextOptions, setShowTextOptions] = useState(false);
  
  // Get current page number from the DOM if available
  const getCurrentPageNumber = (): number => {
    const pageElement = document.querySelector('.page-number-display');
    return pageElement ? parseInt(pageElement.textContent?.split('/')[0]?.trim() || '1') : 1;
  };

  // Keep track of the last time we dispatched an event to prevent too many renders
  const lastDispatchTimeRef = useRef<number>(0);
  const dispatchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debounced dispatch function
  const debouncedDispatch = () => {
    // Clear any existing timeout
    if (dispatchTimeoutRef.current) {
      clearTimeout(dispatchTimeoutRef.current);
    }
    
    // Don't dispatch more than once every 300ms
    const now = Date.now();
    const timeSinceLastDispatch = now - lastDispatchTimeRef.current;
    
    if (timeSinceLastDispatch < 300) {
      // Schedule a dispatch after the debounce period
      dispatchTimeoutRef.current = setTimeout(() => {
        const currentPage = getCurrentPageNumber();
        dispatchAnnotationChangeEvent(currentPage);
        lastDispatchTimeRef.current = Date.now();
      }, 300 - timeSinceLastDispatch);
    } else {
      // Dispatch immediately
      const currentPage = getCurrentPageNumber();
      dispatchAnnotationChangeEvent(currentPage);
      lastDispatchTimeRef.current = now;
    }
  };

  // Trigger re-render when tool changes, but debounced
  useEffect(() => {
    if (currentDocumentId) {
      debouncedDispatch();
    }
    
    // Cleanup
    return () => {
      if (dispatchTimeoutRef.current) {
        clearTimeout(dispatchTimeoutRef.current);
      }
    };
  }, [currentTool, currentStyle, currentDocumentId]);

  // Toggle text options when text or sticky note tool is selected
  useEffect(() => {
    if (currentTool === 'text' || currentTool === 'stickyNote') {
      setShowTextOptions(true);
    } else {
      setShowTextOptions(false);
    }
  }, [currentTool]);

  // Handle font size change
  const handleFontSizeChange = (size: number) => {
    setTextFontSize(size);
    setCurrentStyle({ 
      ...currentStyle,
      textOptions: {
        ...currentStyle.textOptions,
        fontSize: size
      }
    });
  };

  // Handle font family change
  const handleFontFamilyChange = (family: string) => {
    setTextFontFamily(family);
    setCurrentStyle({ 
      ...currentStyle,
      textOptions: {
        ...currentStyle.textOptions,
        fontFamily: family
      }
    });
  };

  const renderStyleSection = () => (
    <div className="space-y-4 p-2">
      {/* Color Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Color
        </label>
        <div className="grid grid-cols-8 gap-1.5">
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setCurrentStyle({ color })}
              className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                currentStyle.color === color
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Line Width */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Line Width
        </label>
        <div className="flex gap-1.5">
          {LINE_WIDTHS.map((width) => (
            <button
              key={width}
              onClick={() => setCurrentStyle({ lineWidth: width })}
              className={`h-8 flex-1 flex items-center justify-center border rounded-md transition-colors ${
                currentStyle.lineWidth === width
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div
                className="rounded-full"
                style={{
                  backgroundColor: currentStyle.color,
                  width: `${width * 4}px`,
                  height: `${width * 4}px`,
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Opacity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Opacity
        </label>
        <div className="flex gap-1.5">
          {OPACITY_LEVELS.map((opacity) => (
            <button
              key={opacity}
              onClick={() => setCurrentStyle({ opacity })}
              className={`h-8 flex-1 border rounded-md transition-colors ${
                currentStyle.opacity === opacity
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div
                className="w-full h-full rounded-md"
                style={{
                  backgroundColor: currentStyle.color,
                  opacity: opacity,
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTextOptions = () => {
    if (!showTextOptions) return null;
    
    const fontFamilies = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];
    const fontSizes = [10, 12, 14, 16, 18, 20, 24, 28, 32];
    
    return (
      <ToolbarSection title="Text Options">
        <div className="space-y-4 p-2">
          {/* Font Family */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Font Family
            </label>
            <select 
              value={textFontFamily}
              onChange={(e) => handleFontFamilyChange(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {fontFamilies.map(font => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>
          
          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Font Size
            </label>
            <div className="grid grid-cols-3 gap-1">
              {fontSizes.map(size => (
                <button
                  key={size}
                  onClick={() => handleFontSizeChange(size)}
                  className={`p-2 text-sm border rounded-md flex items-center justify-center transition-colors ${
                    textFontSize === size
                      ? "border-blue-500 bg-blue-50 text-blue-600"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          
          {/* Sticky Note Preview */}
          {currentTool === 'stickyNote' && (
            <div className="mt-4 bg-yellow-100 border border-yellow-200 rounded-md p-3">
              <div className="text-xs text-gray-500 mb-1">Sticky Note Preview</div>
              <div 
                className="bg-yellow-200 border border-yellow-300 rounded shadow-sm p-2"
                style={{ 
                  fontSize: `${textFontSize}px`,
                  fontFamily: textFontFamily
                }}
              >
                Sample text
              </div>
            </div>
          )}
        </div>
      </ToolbarSection>
    );
  };

  return (
    <div className="toolbar-fixed bg-white border-r border-gray-200 overflow-y-auto" style={{ flexShrink: 0, minWidth: '16rem' }}>
      <ToolbarSection title="Basic Tools" defaultExpanded>
        {TOOLS.basic.map((tool) => (
          <ToolButton
            key={tool.tool}
            tool={tool.tool}
            icon={tool.icon}
            label={tool.label}
            shortcut={getOptionalShortcut(tool)}
          />
        ))}
      </ToolbarSection>
      <ToolbarSection title="Shapes">
        {TOOLS.shapes.map((tool) => (
          <ToolButton
            key={tool.tool}
            tool={tool.tool}
            icon={tool.icon}
            label={tool.label}
            shortcut={getOptionalShortcut(tool)}
          />
        ))}
      </ToolbarSection>
      <ToolbarSection title="Lines & Arrows">
        {TOOLS.lines.map((tool) => (
          <ToolButton
            key={tool.tool}
            tool={tool.tool}
            icon={tool.icon}
            label={tool.label}
            shortcut={getOptionalShortcut(tool)}
          />
        ))}
      </ToolbarSection>
      <ToolbarSection title="Text & Notes" defaultExpanded={currentTool === 'text' || currentTool === 'stickyNote'}>
        {TOOLS.text.map((tool) => (
          <ToolButton
            key={tool.tool}
            tool={tool.tool}
            icon={tool.icon}
            label={tool.label}
            shortcut={getOptionalShortcut(tool)}
          />
        ))}
      </ToolbarSection>
      
      {/* Conditionally render text options section */}
      {renderTextOptions()}
      
      <ToolbarSection title="Style">{renderStyleSection()}</ToolbarSection>
      <div className="mt-auto border-t border-gray-200 p-2 space-y-2">
        <button
          onClick={(e) => showPopup('?', e)}
          className="w-full flex items-center justify-between gap-1 p-2 rounded hover:bg-gray-50 text-gray-600 hover:text-gray-700"
          title="Show keyboard shortcuts (?)"
        >
          <div className="flex items-center gap-1">
            <HelpCircle size={16} />
            <span className="text-sm">Keyboard Shortcuts</span>
          </div>
          <span className="text-xs text-gray-400">?</span>
        </button>
        <ShortcutPopup
          shortcut="?"
          description="View all keyboard shortcuts for the annotation tools"
          isOpen={popupState.isOpen && popupState.shortcut === '?'}
          onClose={hidePopup}
          position={popupState.position}
        />
      </div>
    </div>
  );
};
