import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  useAnnotationStore,
  initialDocumentState,
} from "../store/useAnnotationStore";
import {
  drawAnnotation,
  drawResizeHandles,
  isPointInStamp,
  isPointInHighlight,
  getShapeBounds,
  drawSelectionOutline,
  isPointInsideCircle,
  drawLine,
  drawRectangle,
  drawCircle,
  drawTriangle,
  drawStar,
  drawArrow,
  drawSmoothFreehand,
} from "../utils/drawingUtils";
import { 
  renderTextPreview, 
  handleTextToolCompletion, 
  isPointInTextAnnotation 
} from "../utils/textToolsUtils";
import { Point, Annotation, AnnotationType } from "../types/annotation";
import { TextInput } from "./TextInput";
import { ContextMenu } from "./ContextMenu";
import {
  ResizeHandle,
  getResizeHandle,
  getResizeCursor,
  getResizedPoints,
  isValidResize,
} from "../utils/resizeUtils";

interface AnnotationCanvasProps {
  documentId: string;
  pageNumber: number;
  scale: number;
  width: number;
  height: number;
  onPaste?: (pageNumber: number) => void;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  documentId,
  pageNumber,
  scale,
  width,
  height,
  onPaste,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [selectedAnnotations, setSelectedAnnotations] = useState<Annotation[]>(
    []
  );
  const [activeHandle, setActiveHandle] = useState<ResizeHandle>(null);
  const lastPointRef = useRef<Point | null>(null);
  const [isEditingText, setIsEditingText] = useState<boolean>(false);
  const [textInputPosition, setTextInputPosition] = useState<Point | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [stickyNoteScale, setStickyNoteScale] = useState<number>(1);
  const [selectionBox, setSelectionBox] = useState<{ start: Point; end: Point } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
  } | null>(null);
  const [isCircleCenterMode, setIsCircleCenterMode] = useState<boolean>(false);
  const [moveOffset, setMoveOffset] = useState<Point | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [textDragStart, setTextDragStart] = useState<Point | null>(null);
  const [textDragEnd, setTextDragEnd] = useState<Point | null>(null);
  const [isTextDragging, setIsTextDragging] = useState(false);
  const [textDimensions, setTextDimensions] = useState<{ width: number; height: number } | null>(null);
  const [cursorPosition, setCursorPosition] = useState<Point | null>(null);

  const store = useAnnotationStore();
  const { currentTool, currentStyle, currentDrawMode } = store;
  const documentState = store.documents[documentId] || initialDocumentState();

  const dispatchAnnotationChangeEvent = useCallback(
    (source: string, forceRender: boolean = false) => {
      // Create a custom event with the annotation change details
      const event = new CustomEvent("annotationChanged", {
        detail: {
          pageNumber,
          source,
          forceRender,
          timestamp: Date.now(),
        },
      });

      // Dispatch the event to both the canvas element and the PDF container
      // This ensures that all components that need to know about the annotation change will be notified
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.dispatchEvent(event);
        console.log(`[AnnotationCanvas] Dispatched annotation event to canvas: page ${pageNumber}`);
      }

      // Also try to dispatch to the PDF container for broader notification
      try {
        const pdfContainer = document.querySelector(".pdf-container, .pdf-container-fixed");
        if (pdfContainer) {
          pdfContainer.dispatchEvent(event);
          console.log(`[AnnotationCanvas] Dispatched annotation event to container: page ${pageNumber}`);
        } else {
          console.warn("[AnnotationCanvas] Could not find PDF container to dispatch event");
        }
      } catch (err) {
        console.error("[AnnotationCanvas] Error dispatching event:", err);
      }
    },
    [pageNumber]
  );

  const getCanvasPoint = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scrollContainer = canvas.parentElement?.parentElement;

    if (!scrollContainer) return { x: 0, y: 0 };

    // Get scroll offsets
    const scrollLeft = scrollContainer.scrollLeft;
    const scrollTop = scrollContainer.scrollTop;

    // Calculate the actual position considering scroll and zoom
    const x = (e.clientX - rect.left + scrollLeft) / scale;
    const y = (e.clientY - rect.top + scrollTop) / scale;

    return { x, y };
  };

  const getResizeHandle = (
    point: Point,
    annotation: Annotation
  ): ResizeHandle => {
    if (!annotation.points || annotation.points.length < 2) return null;

    const [start, end] = annotation.points;
    const handleSize = 8 / scale; // Resize handle hit area

    const bounds = {
      left: Math.min(start.x, end.x),
      right: Math.max(start.x, end.x),
      top: Math.min(start.y, end.y),
      bottom: Math.max(start.y, end.y),
    };

    // Check corners first
    if (
      Math.abs(point.x - bounds.left) <= handleSize &&
      Math.abs(point.y - bounds.top) <= handleSize
    )
      return "topLeft";
    if (
      Math.abs(point.x - bounds.right) <= handleSize &&
      Math.abs(point.y - bounds.top) <= handleSize
    )
      return "topRight";
    if (
      Math.abs(point.x - bounds.left) <= handleSize &&
      Math.abs(point.y - bounds.bottom) <= handleSize
    )
      return "bottomLeft";
    if (
      Math.abs(point.x - bounds.right) <= handleSize &&
      Math.abs(point.y - bounds.bottom) <= handleSize
    )
      return "bottomRight";

    // Then check edges
    if (Math.abs(point.x - bounds.left) <= handleSize) return "left";
    if (Math.abs(point.x - bounds.right) <= handleSize) return "right";
    if (Math.abs(point.y - bounds.top) <= handleSize) return "top";
    if (Math.abs(point.y - bounds.bottom) <= handleSize) return "bottom";

    return null;
  };

  const isPointInAnnotation = (point: Point, annotation: Annotation): boolean => {
    if (!annotation.points.length) return false;

    if (annotation.type === "stamp" || annotation.type === "stampApproved" || 
        annotation.type === "stampRejected" || annotation.type === "stampRevision") {
      return isPointInStamp(point, annotation);
    } else if (annotation.type === "highlight") {
      return isPointInHighlight(point, annotation);
    } else if (annotation.type === "circle") {
      return isPointInsideCircle(point, annotation, scale);
    } else if (annotation.type === "text" || annotation.type === "stickyNote") {
      return isPointInTextAnnotation(point, annotation, scale);
    }

    // Handle rectangles, lines, and other shapes with bounding box approach
    if (annotation.points.length < 2) return false;
    
    const bounds = getShapeBounds(annotation.points);
    
    // Add a small buffer for selection (scaled by the lineWidth)
    const buffer = Math.max(annotation.style.lineWidth, 5) / scale;
    
    return (
      point.x >= bounds.left - buffer &&
      point.x <= bounds.right + buffer &&
      point.y >= bounds.top - buffer &&
      point.y <= bounds.bottom + buffer
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent default behavior to avoid selections
    e.preventDefault();
    
    const point = getCanvasPoint(e);
    
    // Handle text and sticky note tools differently
    if (currentTool === "text" || currentTool === "stickyNote") {
      setTextDragStart(point);
      setTextDragEnd(point); // Initialize with same point
      setIsTextDragging(true); // Start dragging
      return;
    }
    
    if (currentTool === "select") {
      // Check if we're clicking on a selected annotation
      const clickedAnnotation = selectedAnnotations.find(
        (annotation) => isPointInAnnotation(point, annotation)
      );
      
      if (clickedAnnotation) {
        // For circles, we need to check for resize handles first before allowing move
        if (clickedAnnotation.type === "circle") {
          // Check if clicking on a resize handle
          const handle = getResizeHandleForCircle(point, clickedAnnotation);
          
          if (handle) {
            // Start resizing operation
            setIsResizing(true);
            setActiveHandle(handle);
            return;
          }
          
          // If not on a handle, then allow moving
          setMoveOffset(point);
          return;
        }
        
        // For other shapes, check for resize handles first
        const handle = getResizeHandle(point, clickedAnnotation);
        
        if (handle) {
          // Start resizing operation
          setIsResizing(true);
          setActiveHandle(handle);
        } else {
          // Start moving operation
          setMoveOffset(point);
        }
        return;
      }
      
      // If not clicking on a selected annotation, check if clicking on any annotation
      const clickedOnAny = documentState.annotations.find(
        (annotation) =>
          annotation.pageNumber === pageNumber &&
          isPointInAnnotation(point, annotation)
      );
      
      if (clickedOnAny) {
        // Select this annotation and prepare to move it
        store.selectAnnotations([clickedOnAny]);
        setMoveOffset(point);
        return;
      }
      
      // If not clicking on any annotation, start a selection box
      setSelectionBox({ start: point, end: point });
      return;
    } else {
      setIsDrawing(true);
      lastPointRef.current = point;

      if (currentTool === "freehand") {
        // For freehand, we start with just the initial point
        // More points will be added during mouse move
        setCurrentPoints([point]);
      } else {
        // For other shapes, initialize with start and end at the same point
        // End point will be updated during mouse move
        setCurrentPoints([
          { x: point.x, y: point.y },
          { x: point.x, y: point.y },
        ]);
      }
    }
  };

  const handleFreehandDraw = (point: Point) => {
    if (!isDrawing || currentTool !== "freehand") return;
    
    // For freehand drawing, we need to collect all points as the user moves the cursor
    // This provides a continuous path rather than just start and end points
    setCurrentPoints((prev) => [...prev, point]);
    
    // Force a render to show the drawing in real-time
    render();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const point = getCanvasPoint(e);
    
    // Update cursor position for tool indicators
    setCursorPosition(point);

    // Handle text tool dragging
    if (isTextDragging && textDragStart) {
      setTextDragEnd(point);
      render(); // Render drag preview
      return;
    }

    if (selectionBox) {
      // Update selection box end point
      setSelectionBox((prev) => (prev ? { ...prev, end: point } : null));

      // Find annotations within selection box
      const annotations = documentState.annotations.filter((annotation) => {
        if (annotation.pageNumber !== pageNumber) return false;
        return isAnnotationInSelectionBox(
          annotation,
          selectionBox.start,
          point
        );
      });

      // Update selected annotations
      store.selectAnnotations(annotations);
      return;
    }

    if (currentTool === "select") {
      // Handle circle center mode
      if (isCircleCenterMode && moveOffset && selectedAnnotations.length === 1) {
        const annotation = selectedAnnotations[0];
        if (annotation.type === "circle") {
          const dx = point.x - moveOffset.x;
          const dy = point.y - moveOffset.y;
          
          // Create new points by moving both points by the same offset
          const newPoints = annotation.points.map(p => ({
            x: p.x + dx,
            y: p.y + dy
          }));
          
          // Update the annotation
          const updatedAnnotation = {
            ...annotation,
            points: newPoints
          };
          
          store.updateAnnotation(documentId, updatedAnnotation);
          setSelectedAnnotations([updatedAnnotation]);
          setMoveOffset(point);
          return;
        }
      }
      
      // Handle resizing
      if (isResizing && selectedAnnotations.length === 1) {
        const annotation = selectedAnnotations[0];

        if (!isValidResize(annotation, activeHandle!)) {
          return;
        }

        const newPoints = getResizedPoints(
          annotation.points,
          activeHandle!,
          point,
          e.shiftKey,
          10,
          annotation
        );

        const updatedAnnotation = {
          ...annotation,
          points: newPoints,
        };

        store.updateAnnotation(documentId, updatedAnnotation);
        setSelectedAnnotations([updatedAnnotation]);
        return;
      }

      // Handle moving
      if (moveOffset && selectedAnnotations.length > 0) {
        const dx = point.x - moveOffset.x;
        const dy = point.y - moveOffset.y;

        const updatedAnnotations = selectedAnnotations.map((annotation) => {
          const newPoints = annotation.points.map((p) => ({
            x: p.x + dx,
            y: p.y + dy,
          }));

          return {
            ...annotation,
            points: newPoints,
          };
        });

        updatedAnnotations.forEach((annotation) => {
          store.updateAnnotation(documentId, annotation);
        });

        setSelectedAnnotations(updatedAnnotations);
        setMoveOffset(point);
        return;
      }

      // Update cursor based on hover
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Update cursor for selected circles
      if (selectedAnnotations.length === 1 && selectedAnnotations[0].type === "circle") {
        const circleAnnotation = selectedAnnotations[0];
        const handle = getResizeHandleForCircle(point, circleAnnotation);
        
        if (handle) {
          // Show resize cursor based on the handle position
          canvas.style.cursor = getResizeCursor(handle);
          return;
        } else if (isPointInsideCircle(point, circleAnnotation)) {
          // Show move cursor when inside the circle but not on a handle
          canvas.style.cursor = "move";
          return;
        }
      }

      // For other annotations, use the existing code
      if (selectedAnnotations.length === 1) {
        const handle = getResizeHandle(point, selectedAnnotations[0]);
        if (handle) {
          canvas.style.cursor = getResizeCursor(handle);
          return;
        }
      }

      const isOverSelected = selectedAnnotations.some((annotation) =>
        isPointInAnnotation(point, annotation)
      );
      canvas.style.cursor = isOverSelected ? "move" : "default";
    } else if (isDrawing) {
      if (currentTool === "freehand") {
        // Use the dedicated freehand drawing handler
        handleFreehandDraw(point);
      } else {
        // For other tools, just update end point while keeping start point fixed
        setCurrentPoints((prev) => [prev[0], { x: point.x, y: point.y }]);
        render();
      }
    } else if (currentTool === "select" as AnnotationType) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Check for resize handles first when a single annotation is selected
      if (selectedAnnotations.length === 1) {
        const handle = getResizeHandle(point, selectedAnnotations[0]);
        if (handle) {
          canvas.style.cursor = getResizeCursor(handle);
          return;
        }
      }

      // Check if hovering over any selected annotation
      const hoverSelected = selectedAnnotations.some((annotation) =>
        isPointInAnnotation(point, annotation)
      );

      if (hoverSelected) {
        canvas.style.cursor = "move";
        return;
      }

      // Check if hovering over any annotation
      const hoverAnnotation = documentState.annotations.find(
        (annotation) =>
          annotation.pageNumber === pageNumber &&
          isPointInAnnotation(point, annotation)
      );

      canvas.style.cursor = hoverAnnotation ? "move" : "default";
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    // Handle text tool dragging completion
    if (isTextDragging && textDragStart && textDragEnd) {
      // Calculate the rectangle dimensions
      const left = Math.min(textDragStart.x, textDragEnd.x);
      const top = Math.min(textDragStart.y, textDragEnd.y);
      const width = Math.abs(textDragEnd.x - textDragStart.x);
      const height = Math.abs(textDragEnd.y - textDragStart.y);
      
      // Only open the text input if the drag distance is significant
      // Minimum dimensions to prevent accidental drags
      const MIN_DIMENSIONS = 5 / scale;
      
      if (width > MIN_DIMENSIONS || height > MIN_DIMENSIONS) {
        // For significant drags, use the area as a constraint for the text input
        setTextInputPosition({ x: left, y: top });
        setEditingAnnotation(null);
        setIsEditingText(true);
        
        // Store dimensions to use for the text layout
        setTextDimensions({ width, height });
        
        // Set if we're in sticky note mode
        setStickyNoteScale(currentTool === "stickyNote" ? 1 : 0);
      } else {
        // For clicks or very small drags, revert to simple click behavior
        setTextInputPosition(textDragStart);
        setEditingAnnotation(null);
        setIsEditingText(true);
        setTextDimensions(null);
        setStickyNoteScale(currentTool === "stickyNote" ? 1 : 0);
      }
      
      // Reset drag state
      setIsTextDragging(false);
      setTextDragStart(null);
      setTextDragEnd(null);
      return;
    }

    // Reset circle center mode
    setIsCircleCenterMode(false);

    if (isDrawing) {
      if (currentTool === "freehand") {
        // Only create freehand annotation if we have enough points
        if (currentPoints.length >= 2) {
          const newAnnotation: Annotation = {
            id: Date.now().toString(),
            type: "freehand",
            points: currentPoints,
            style: currentStyle,
            pageNumber,
            timestamp: Date.now(),
            userId: "current-user",
          };

          store.addAnnotation(documentId, newAnnotation);
          
          // Dispatch the annotation change event to ensure it's rendered immediately
          dispatchAnnotationChangeEvent('userDrawing', true);
        }
      } else if (currentPoints.length === 2) {
        // For non-freehand tools with 2 points (like line, rectangle, etc.)
        const [start, end] = currentPoints;

        // Check if the shape has a minimum size
        const dx = Math.abs(end.x - start.x);
        const dy = Math.abs(end.y - start.y);

        // Only create annotation if the shape has a minimum size
        if (dx >= 5 || dy >= 5) {
          // For rectangle-like shapes, ensure we have four corner points
          let annotationPoints = currentPoints;
          
          // Special handling for highlight: create a polygon with 4 points
          if (currentTool === "highlight") {
            // Create a rectangle/polygon for highlights
            annotationPoints = [
              { x: start.x, y: start.y },
              { x: end.x, y: start.y },
              { x: end.x, y: end.y },
              { x: start.x, y: end.y }
            ];
          }
          
          const newAnnotation: Annotation = {
            id: Date.now().toString(),
            type: currentTool,
            points: annotationPoints,
            style: {
              ...currentStyle,
              // Ensure opacity is appropriate for highlights
              opacity: currentTool === "highlight" ? 0.3 : currentStyle.opacity,
              // Ensure line width is appropriate for highlights
              lineWidth: currentTool === "highlight" ? 12 : currentStyle.lineWidth
            },
            pageNumber,
            timestamp: Date.now(),
            userId: "current-user",
          };

          store.addAnnotation(documentId, newAnnotation);

          // Clear selection to prevent immediate resizing
          store.clearSelection();
          setSelectedAnnotations([]);
          
          // Dispatch the annotation change event
          dispatchAnnotationChangeEvent('userDrawing', true);
        }
      }
    }

    // Always clean up states
    setIsDrawing(false);
    setCurrentPoints([]);
    lastPointRef.current = null;
    setMoveOffset(null);
    setActiveHandle(null);
    setSelectionBox(null);
    setIsResizing(false);

    // Force render to clear any preview
    render();
  };

  const handleMouseLeave = () => {
    if (isDrawing && currentTool === "freehand" && currentPoints.length >= 2) {
      // Save the drawing if we have points
      // For freehand drawings, we just use the raw points since there's no smoothPoints function
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: "freehand",
        points: currentPoints,
        style: currentStyle,
        pageNumber,
        timestamp: Date.now(),
        userId: "current-user",
      };

      store.addAnnotation(documentId, newAnnotation);
    }

    // Clean up all states
    setIsDrawing(false);
    setCurrentPoints([]);
    lastPointRef.current = null;
    setMoveOffset(null);
    setActiveHandle(null);
    setSelectionBox(null);
    setIsResizing(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isEditingText) return;
    
    const point = getCanvasPoint(e);
    const annotations = documentState.annotations.filter(
      (a) => a.pageNumber === pageNumber
    );
    
    // Find if user clicked on an existing text or sticky note annotation
    const textAnnotation = annotations.find(
      (a) => 
        (a.type === "text" || a.type === "stickyNote") && 
        isPointInTextAnnotation(point, a, scale)
    );
    
    if (textAnnotation) {
      setEditingAnnotation(textAnnotation);
      setTextInputPosition(textAnnotation.points[0]);
      setIsEditingText(true);
      setStickyNoteScale(textAnnotation.type === "stickyNote" ? 1 : 0);
    }
  };

  const handleTextComplete = (text: string) => {
    setIsEditingText(false);
    
    if (editingAnnotation) {
      // Handle editing existing text annotation
      const updatedAnnotation = {
        ...editingAnnotation,
        text,
        style: {
          ...editingAnnotation.style,
          text,
        },
      };
      store.updateAnnotation(documentId, updatedAnnotation);
    } else if (textInputPosition) {
      // Handle creating new text annotation
      const isSticky = stickyNoteScale > 0;
      
      // For regular text, preserve user style. Sticky notes use fixed style.
      const textStyle = isSticky 
        ? { color: '#FFD700', lineWidth: 1, opacity: 1 } // Minimal style - the createStickyNoteAnnotation will replace it
        : { ...currentStyle };
      
      // Use the exact position from the preview
      // This ensures the annotation appears exactly where the preview was shown
      handleTextToolCompletion(
        textInputPosition,
        text,
        isSticky,
        textStyle,
        pageNumber,
        "current-user", // Replace with actual user ID when available
        documentId,
        store.addAnnotation
      );
      
      // Reset tool to select after adding text/sticky note
      store.setCurrentTool("select");
    }
    
    setTextInputPosition(null);
    setEditingAnnotation(null);
    setTextDimensions(null);
    dispatchAnnotationChangeEvent("textComplete");
  };

  const handleTextCancel = () => {
    setTextInputPosition(null);
    setIsEditingText(false);
    setEditingAnnotation(null);
  };

  const isAnnotationInSelectionBox = (
    annotation: Annotation,
    start: Point,
    end: Point
  ): boolean => {
    const bounds = getShapeBounds(annotation.points);
    const selectionBounds = {
      left: Math.min(start.x, end.x),
      right: Math.max(start.x, end.x),
      top: Math.min(start.y, end.y),
      bottom: Math.max(start.y, end.y),
    };

    // For text and sticky notes, use center point
    if (annotation.type === "text" || annotation.type === "stickyNote") {
      const center = {
        x: bounds.left + (bounds.right - bounds.left) / 2,
        y: bounds.top + (bounds.bottom - bounds.top) / 2,
      };
      return (
        center.x >= selectionBounds.left &&
        center.x <= selectionBounds.right &&
        center.y >= selectionBounds.top &&
        center.y <= selectionBounds.bottom
      );
    }

    // For stamps, require full containment
    if (annotation.type === "stamp" || annotation.type === "stampApproved" || 
        annotation.type === "stampRejected" || annotation.type === "stampRevision") {
      return (
        bounds.left >= selectionBounds.left &&
        bounds.right <= selectionBounds.right &&
        bounds.top >= selectionBounds.top &&
        bounds.bottom <= selectionBounds.bottom
      );
    }

    // For other shapes, check if any corner is inside the selection box
    // or if the selection box intersects with any edge
    const corners = [
      { x: bounds.left, y: bounds.top },
      { x: bounds.right, y: bounds.top },
      { x: bounds.left, y: bounds.bottom },
      { x: bounds.right, y: bounds.bottom },
    ];

    // Check if any corner is inside selection box
    const anyCornerInside = corners.some(
      (corner) =>
        corner.x >= selectionBounds.left &&
        corner.x <= selectionBounds.right &&
        corner.y >= selectionBounds.top &&
        corner.y <= selectionBounds.bottom
    );

    if (anyCornerInside) return true;

    // Check for intersection with selection box edges
    const edges = [
      [corners[0], corners[1]], // Top
      [corners[1], corners[3]], // Right
      [corners[2], corners[3]], // Bottom
      [corners[0], corners[2]], // Left
    ];

    const selectionEdges = [
      [
        { x: selectionBounds.left, y: selectionBounds.top },
        { x: selectionBounds.right, y: selectionBounds.top },
      ],
      [
        { x: selectionBounds.right, y: selectionBounds.top },
        { x: selectionBounds.right, y: selectionBounds.bottom },
      ],
      [
        { x: selectionBounds.left, y: selectionBounds.bottom },
        { x: selectionBounds.right, y: selectionBounds.bottom },
      ],
      [
        { x: selectionBounds.left, y: selectionBounds.top },
        { x: selectionBounds.left, y: selectionBounds.bottom },
      ],
    ];

    return edges.some((edge) =>
      selectionEdges.some((selEdge) =>
        doLinesIntersect(edge[0], edge[1], selEdge[0], selEdge[1])
      )
    );
  };

  // Helper function to check if two line segments intersect
  const doLinesIntersect = (
    p1: Point,
    p2: Point,
    p3: Point,
    p4: Point
  ): boolean => {
    const denominator =
      (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    if (denominator === 0) return false;

    const ua =
      ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) /
      denominator;
    const ub =
      ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) /
      denominator;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();

    const point = getCanvasPoint(e);

    // Check if clicking on a selected annotation
    const clickedAnnotation = documentState.annotations.find(
      (annotation) =>
        annotation.pageNumber === pageNumber &&
        isPointInAnnotation(point, annotation)
    );

    if (clickedAnnotation) {
      // If clicking on an unselected annotation, select it
      if (!selectedAnnotations.some((a) => a.id === clickedAnnotation.id)) {
        store.selectAnnotation(clickedAnnotation, e.shiftKey);
      }

      // Show context menu
      setContextMenu({
        position: { x: e.clientX, y: e.clientY },
      });
    } else {
      // Clear selection if clicking outside annotations
      store.clearSelection();
      setContextMenu(null);
    }
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get annotations for this page
    const annotations = documentState.annotations.filter(
      (a) => a.pageNumber === pageNumber
    );

    // Draw all annotations
    annotations.forEach((annotation) => {
      // Skip drawing the annotation being edited
      if (editingAnnotation?.id === annotation.id) return;
      
      // Use custom rendering for text and sticky notes
      if (annotation.type === "text") {
        // Draw the text annotation using our custom renderer
        drawTextAnnotation(ctx, annotation, scale);
      } else if (annotation.type === "stickyNote") {
        // Draw the sticky note using our custom renderer
        drawStickyNoteAnnotation(ctx, annotation, scale);
      } else {
        // Draw other annotation types with the standard renderer
        drawAnnotation(ctx, annotation, scale);
      }

      // Draw selection indicator if selected
      if (
        annotation.selected ||
        selectedAnnotations.some((a) => a.id === annotation.id)
      ) {
        // Check if it's a text or sticky note annotation
        if (annotation.type === "text" || annotation.type === "stickyNote") {
          // Call our custom text selection outline function
          drawTextSelectionOutline(ctx, annotation, scale, selectedAnnotations.length > 1);
        } else {
          // For other annotation types, use the regular outline
          drawSelectionOutline(
            ctx,
            annotation,
            scale,
            selectedAnnotations.length > 1
          );
        }
        
        // Draw resize handles for shapes if only one selected
        if (selectedAnnotations.length <= 1 && 
            annotation.type !== "text" && annotation.type !== "stickyNote") {
          drawResizeHandles(
            ctx,
            annotation,
            scale,
            annotation.type === "highlight"
          );
        }
      }
    });

    // Draw tool cursor indicators when tool is selected but not yet drawing
    if (cursorPosition && !isDrawing && !isTextDragging && 
        (currentTool === "text" || currentTool === "stickyNote")) {
      ctx.save();
      
      const isSticky = currentTool === "stickyNote";
      const x = cursorPosition.x * scale;
      const y = cursorPosition.y * scale;
      
      // Get text options from current style
      const { textOptions = {} } = currentStyle;
      const fontSize = (textOptions.fontSize || 14) * scale;
      
      // Draw the tool indicator
      if (isSticky) {
        // Show sticky note preview with fixed style
        ctx.fillStyle = '#FFD700'; // Fixed yellow color
        ctx.globalAlpha = 0.5; // More transparent for preview
        
        // Draw rectangle with folded corner - show exactly where it will be placed
        const width = 200 * scale; // Match actual sticky note size
        const height = 150 * scale;
        
        // Draw main rectangle exactly at cursor position (will be top-left)
        ctx.fillRect(x, y, width, height);
        
        // Draw folded corner
        ctx.beginPath();
        ctx.moveTo(x + width - 20*scale, y);
        ctx.lineTo(x + width, y + 20*scale);
        ctx.lineTo(x + width, y);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fill();
        
        // Draw placeholder text lines with proper padding to match actual rendering
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#000000";
        const padding = 10 * scale; // Match padding in drawStickyNoteAnnotation
        const lineY = y + padding;
        const lineHeight = 16 * scale; // Match line height in drawStickyNoteAnnotation
        
        for (let i = 0; i < 3; i++) {
          const lineWidth = (150 - i*25) * scale;
          ctx.fillRect(x + padding, lineY + (i*lineHeight), lineWidth, 2*scale);
        }
        
        // Add subtle border without positioning indicators
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 0.5 * scale;
        ctx.setLineDash([]);
        ctx.strokeRect(x, y, width, height);
      } else {
        // Show text tool indicator - position it exactly where text will appear
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // Semi-transparent background
        
        // Calculate size based on average text
        const width = 120 * scale;
        const height = 60 * scale;
        
        // Draw background for text
        ctx.fillRect(x, y, width, height);
        
        // Draw border
        ctx.strokeStyle = currentStyle.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x, y, width, height);
        
        // Draw text preview with proper padding (8px) to match actual text rendering
        const padding = 8 * scale; // Match padding in drawTextAnnotation
        
        // Draw sample text
        ctx.fillStyle = currentStyle.color;
        let fontStyle = '';
        if (textOptions.bold) fontStyle += 'bold ';
        if (textOptions.italic) fontStyle += 'italic ';
        const fontFamily = textOptions.fontFamily || 'Arial';
        ctx.font = `${fontStyle}${fontSize}px ${fontFamily}`;
        ctx.fillText('Text', x + padding, y + padding + fontSize * 0.8);
        
        // Draw placeholder lines with exact same padding as real text
        const lineY = y + padding + fontSize * 1.2;
        const lineHeight = fontSize * 1.2; // Match line height in drawTextAnnotation
        
        for (let i = 0; i < 2; i++) {
          const lineWidth = (90 - i*30) * scale;
          ctx.fillRect(x + padding, lineY + (i*lineHeight), lineWidth, 1*scale);
        }
      }
      
      ctx.restore();
    }

    // Draw current annotation being created (preview)
    if (isDrawing && currentPoints.length > 0) {
      ctx.save();
      ctx.strokeStyle = currentStyle.color;
      ctx.fillStyle = currentStyle.color;
      ctx.lineWidth = currentStyle.lineWidth * scale;
      ctx.globalAlpha = currentStyle.opacity;

      // Handle different drawing modes
      if (currentTool === "freehand") {
        drawSmoothFreehand(ctx, currentPoints, scale, currentStyle);
      } else if (currentTool === "line") {
        drawLine(ctx, currentPoints, scale);
      } else if (currentTool === "rectangle") {
        drawRectangle(ctx, currentPoints, scale);
      } else if (currentTool === "circle") {
        drawCircle(ctx, currentPoints, scale);
      } else if (currentTool === "triangle") {
        drawTriangle(ctx, currentPoints, scale);
      } else if (currentTool === "star") {
        drawStar(ctx, currentPoints, scale);
      } else if (currentTool === "highlight") {
        // For highlight tool, use special rendering with different opacity
        const originalAlpha = ctx.globalAlpha;
        ctx.globalAlpha = 0.3; // Highlights are semi-transparent
        ctx.lineWidth = 12 * scale; // Highlights are thicker
        
        // Draw the highlight as a rectangle to match the final shape
        if (currentPoints.length >= 2) {
          const [start, end] = currentPoints;
          
          // Calculate rectangle dimensions
          const x = Math.min(start.x, end.x) * scale;
          const y = Math.min(start.y, end.y) * scale;
          const width = Math.abs(end.x - start.x) * scale;
          const height = Math.abs(end.y - start.y) * scale;
          
          // Fill highlight rectangle with color
          ctx.fillStyle = currentStyle.color;
          ctx.fillRect(x, y, width, height);
        }
        
        // Restore original alpha
        ctx.globalAlpha = originalAlpha;
      } else if (currentTool === "arrow" || currentTool === "doubleArrow") {
        // Draw arrow preview
        drawArrow(ctx, currentPoints, scale, currentTool === "doubleArrow");
      }
      
      ctx.restore();
    }
    
    // Draw text dragging preview
    if (isTextDragging && textDragStart && textDragEnd) {
      ctx.save();
      const isSticky = currentTool === "stickyNote";
      
      // Calculate rectangle dimensions - use consistent naming with the rest of the code
      const left = Math.min(textDragStart.x, textDragEnd.x);
      const top = Math.min(textDragStart.y, textDragEnd.y);
      const width = Math.abs(textDragEnd.x - textDragStart.x);
      const height = Math.abs(textDragEnd.y - textDragStart.y);
      
      // Scale coordinates for rendering
      const x = left * scale;
      const y = top * scale;
      const w = width * scale;
      const h = height * scale;
      
      if (isSticky) {
        // Show sticky note preview with fixed design
        ctx.fillStyle = '#FFD700'; // Match actual sticky note color
        ctx.globalAlpha = 0.6;
        
        // Draw rectangle
        ctx.fillRect(x, y, w, h);
        
        // Draw folded corner
        const cornerSize = Math.min(20 * scale, w/5, h/5); // Responsive corner size
        ctx.beginPath();
        ctx.moveTo(x + w - cornerSize, y);
        ctx.lineTo(x + w, y + cornerSize);
        ctx.lineTo(x + w, y);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fill();
        
        // Add placeholder text lines to visualize content area
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        const padding = 10 * scale; // Match padding in actual sticky note
        const lineHeight = 16 * scale;
        
        // Draw sample lines with exact same padding as real sticky note
        if (w > padding*2 && h > padding*2) {
          for (let i = 0; i < Math.min(5, Math.floor((h - padding*2) / lineHeight)); i++) {
            const lineWidth = Math.min(w - padding*2, (150 - i*20) * scale);
            ctx.fillRect(x + padding, y + padding + (i*lineHeight), lineWidth, 2*scale);
          }
        }
        
        // Draw border to better show boundaries
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.strokeRect(x, y, w, h);
      } else {
        // Show text area preview
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; // Semi-transparent background
        ctx.fillRect(x, y, w, h);
        
        // Draw border
        ctx.strokeStyle = currentStyle.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x, y, w, h);
        
        // Draw placeholder text with proper position and padding
        const padding = 8 * scale; // Match text annotation padding
        ctx.fillStyle = currentStyle.color;
        ctx.font = '14px Arial';
        
        // Only draw placeholder text if enough space is available
        if (w > padding*3 && h > padding*3) {
          // Draw "Text" label
          ctx.fillText('Text', x + padding, y + padding + 14*scale);
          
          // Draw placeholder lines with same padding as in text annotation
          const fontSize = 14 * scale;
          const lineHeight = fontSize * 1.2;
          const lineY = y + padding + lineHeight;
          
          for (let i = 0; i < Math.min(3, Math.floor((h - padding*2 - lineHeight) / lineHeight)); i++) {
            const lineWidth = Math.min(w - padding*2, (90 - i*15) * scale);
            ctx.fillRect(x + padding, lineY + (i*lineHeight), lineWidth, 1*scale);
          }
        }
      }
      
      ctx.restore();
    }

    // Draw selection box if active
    if (selectionBox) {
      ctx.save();
      ctx.strokeStyle = "#0066FF";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      const x = Math.min(selectionBox.start.x, selectionBox.end.x) * scale;
      const y = Math.min(selectionBox.start.y, selectionBox.end.y) * scale;
      const width = Math.abs(selectionBox.end.x - selectionBox.start.x) * scale;
      const height = Math.abs(selectionBox.end.y - selectionBox.start.y) * scale;
      
      ctx.strokeRect(x, y, width, height);
      ctx.fillStyle = "rgba(0, 102, 255, 0.1)";
      ctx.fillRect(x, y, width, height);
      ctx.restore();
    }
    
    // Draw uniform scaling indicator when shift is pressed during resize
    if (isResizing && isShiftPressed && selectedAnnotations.length === 1) {
      const annotation = selectedAnnotations[0];
      if (annotation.type === "circle") {
        ctx.save();
        
        // Find the center of the circle
        const [p1, p2] = annotation.points;
        const diameterMode = annotation.style.circleDiameterMode as boolean || false;
        
        let centerX, centerY;
        
        if (diameterMode) {
          centerX = (p1.x + p2.x) / 2 * scale;
          centerY = (p1.y + p2.y) / 2 * scale;
        } else {
          centerX = p1.x * scale;
          centerY = p1.y * scale;
        }
        
        // Draw uniform scaling indicator
        ctx.fillStyle = 'rgba(37, 99, 235, 0.3)';
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1;
        
        // Draw small "uniform scaling" badge
        const badgeText = "Uniform";
        const textMetrics = ctx.measureText(badgeText);
        const badgeWidth = textMetrics.width + 16;
        const badgeHeight = 24;
        
        ctx.beginPath();
        ctx.roundRect(
          centerX - badgeWidth / 2,
          centerY - badgeHeight / 2,
          badgeWidth,
          badgeHeight,
          4
        );
        ctx.fill();
        ctx.stroke();
        
        // Draw text
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, centerX, centerY);
        
        ctx.restore();
      }
    }
  };

  // Re-render when scale changes or page changes
  useEffect(() => {
    render();
  }, [
    scale,
    width,
    height,
    pageNumber,
    documentState.annotations,
    currentPoints,
    selectedAnnotations,
  ]);

  // Update the useEffect for selection state sync
  useEffect(() => {
    setSelectedAnnotations(store.selectedAnnotations);
  }, [store.selectedAnnotations]);

  // Add useEffect to sync local selection with store
  useEffect(() => {
    if (selectedAnnotations.length > 0) {
      store.selectAnnotations(selectedAnnotations);
    }
  }, [selectedAnnotations, store.selectAnnotations]);

  // Reset selection when changing tools
  useEffect(() => {
    if (currentTool !== "select") {
      setSelectedAnnotations([]);
    }
  }, [currentTool]);

  // Add paste event handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (onPaste) {
        e.preventDefault();
        onPaste(pageNumber);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [pageNumber, onPaste]);

  // Update the keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Track shift key state for uniform scaling
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
      
      // Existing key handler code...
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedAnnotations.length > 0) {
          // Delete all selected annotations one by one
          selectedAnnotations.forEach((annotation) => {
            store.deleteAnnotation(documentId, annotation.id);
          });
          setSelectedAnnotations([]);
        }
      }
      
      // ... rest of key handlers ...
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Reset shift key state
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.addEventListener("keyup", handleKeyUp);
    };
  }, [documentId, selectedAnnotations, store, currentTool]);

  // Add function to detect circle resize handles specifically
  const getResizeHandleForCircle = (point: Point, annotation: Annotation): ResizeHandle => {
    if (annotation.type !== "circle" || annotation.points.length < 2) return null;
    
    const [p1, p2] = annotation.points;
    const diameterMode = annotation.style.circleDiameterMode as boolean || false;
    
    let centerX, centerY, radius;
    
    if (diameterMode) {
      // In diameter mode, center is midpoint between two points
      centerX = (p1.x + p2.x) / 2;
      centerY = (p1.y + p2.y) / 2;
      radius = Math.sqrt(
        Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
      ) / 2;
    } else {
      // In center-radius mode, first point is center
      centerX = p1.x;
      centerY = p1.y;
      radius = Math.sqrt(
        Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
      );
    }
    
    // Check if point is near any of the 8 resize handles on the circle perimeter
    const handleSize = 8 / scale;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const handleX = centerX + Math.cos(angle) * radius;
      const handleY = centerY + Math.sin(angle) * radius;
      
      if (
        Math.abs(point.x - handleX) <= handleSize &&
        Math.abs(point.y - handleY) <= handleSize
      ) {
        // Map the angle to the appropriate resize handle type
        if (i === 0) return "right";
        if (i === 1) return "bottomRight";
        if (i === 2) return "bottom";
        if (i === 3) return "bottomLeft";
        if (i === 4) return "left";
        if (i === 5) return "topLeft";
        if (i === 6) return "top";
        if (i === 7) return "topRight";
      }
    }
    
    return null;
  };

  // Clear selected annotations when page changes
  useEffect(() => {
    // Clear any selected annotations when changing pages
    setSelectedAnnotations([]);
    setActiveHandle(null);
    setIsResizing(false);
    setMoveOffset(null);
    // Force a new render
    render();
  }, [pageNumber]);

  // Add the drawFreehand function back
  const drawSmoothFreehand = (ctx: CanvasRenderingContext2D, points: Point[], scale: number, style: any) => {
    if (!points || points.length < 2) return;
    
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    // Start the path at the first point
    ctx.beginPath();
    ctx.moveTo(points[0].x * scale, points[0].y * scale);
    
    // Draw lines to all subsequent points
    points.slice(1).forEach(point => {
      ctx.lineTo(point.x * scale, point.y * scale);
    });
    
    // Stroke the path
    ctx.stroke();
    ctx.restore();
  };

  // Add useRef for animation frame
  const animationFrameRef = useRef<number | null>(null);

  // Add useEffect to handle cursor animation
  useEffect(() => {
    // Only set up animation if text or sticky note tools are selected
    if (currentTool === "text" || currentTool === "stickyNote") {
      const animate = () => {
        render();
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
      
      // Clean up on unmount or tool change
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [currentTool]);

  // Update cleanup for unmounting
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Final fix for text selection box display
  const drawTextSelectionOutline = (
    ctx: CanvasRenderingContext2D,
    annotation: Annotation,
    scale: number,
    isMultiSelect: boolean = false
  ) => {
    if (annotation.points.length === 0) return;
    const position = annotation.points[0];
    
    ctx.save();
    
    // Use a more visible selection style
    const selectionColor = isMultiSelect ? "#4299e1" : "#3b82f6"; 
    ctx.strokeStyle = selectionColor;
    ctx.lineWidth = 1.5 * scale;
    ctx.setLineDash([4 * scale, 3 * scale]);
    
    // Calculate dimensions based on annotation type
    let width, height;
    
    if (annotation.type === "stickyNote") {
      // Fixed dimensions for sticky notes
      width = 200;
      height = 150;
    } else {
      // For text annotations, calculate based on content
      const text = annotation.text || "";
      const textOptions = annotation.style.textOptions || {};
      const fontSize = textOptions.fontSize || 14;
      
      // Create a temporary canvas to measure text
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");
      
      if (tempCtx) {
        // Set font for measurement
        let fontStyle = "";
        if (textOptions.bold) fontStyle += "bold ";
        if (textOptions.italic) fontStyle += "italic ";
        tempCtx.font = `${fontStyle}${fontSize}px ${textOptions.fontFamily || "Arial"}`;
        
        // Measure each line to find max width
        const lines = text.split("\n");
        let maxWidth = 0;
        
        for (const line of lines) {
          const metrics = tempCtx.measureText(line);
          maxWidth = Math.max(maxWidth, metrics.width);
        }
        
        // Calculate height based on line count
        const lineHeight = fontSize * 1.2;
        const textHeight = lineHeight * lines.length;
        
        // Add padding
        width = Math.max(maxWidth + 20, 100);
        height = Math.max(textHeight + 20, 40);
      } else {
        // Fallback if context not available
        width = 120;
        height = 60;
      }
    }
    
    // Draw selection highlight first (subtle background)
    ctx.fillStyle = `${selectionColor}20`; // 12.5% opacity
    ctx.fillRect(
      position.x * scale,
      position.y * scale,
      width * scale,
      height * scale
    );
    
    // Draw selection rectangle outline
    ctx.beginPath();
    ctx.rect(
      position.x * scale,
      position.y * scale,
      width * scale,
      height * scale
    );
    ctx.stroke();
    
    // Draw resize handles if not multiselect
    if (!isMultiSelect) {
      // Draw circular handles at corners
      const handleSize = 8; // Slightly larger handles
      ctx.fillStyle = "white";
      ctx.strokeStyle = selectionColor;
      ctx.lineWidth = 1 * scale;
      ctx.setLineDash([]);
      
      // Corners only for text
      const handlePositions = [
        { x: position.x, y: position.y }, // top-left
        { x: position.x + width, y: position.y }, // top-right
        { x: position.x, y: position.y + height }, // bottom-left
        { x: position.x + width, y: position.y + height }, // bottom-right
      ];
      
      // Draw the handles
      handlePositions.forEach((point) => {
        ctx.beginPath();
        ctx.arc(
          point.x * scale,
          point.y * scale,
          handleSize / 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
      });
    }
    
    ctx.restore();
  };

  // Render text annotations directly inside the selection box
  const drawTextAnnotation = (
    ctx: CanvasRenderingContext2D,
    annotation: Annotation,
    scale: number
  ): void => {
    if (!annotation.text || annotation.points.length === 0) return;
    
    const position = annotation.points[0];
    const text = annotation.text;
    const textOptions = annotation.style.textOptions || {};
    
    // Set up text rendering styles
    ctx.save();
    
    // Font settings
    let fontStyle = '';
    if (textOptions.bold) fontStyle += 'bold ';
    if (textOptions.italic) fontStyle += 'italic ';
    const fontSize = textOptions.fontSize || 14;
    const fontFamily = textOptions.fontFamily || 'Arial';
    ctx.font = `${fontStyle}${fontSize}px ${fontFamily}`;
    
    // Calculate text dimensions
    const lines = text.split('\n');
    const lineHeight = fontSize * 1.2;
    
    // Color settings
    ctx.fillStyle = annotation.style.color || '#000000';
    ctx.textBaseline = 'top';
    
    // Position inside the bounding box with padding
    const textX = position.x * scale + 8 * scale;
    const textY = position.y * scale + 8 * scale;
    
    // Render each line of text
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      ctx.fillText(line, textX, textY + i * lineHeight * scale);
    }
    
    // Restore context
    ctx.restore();
  };

  // Render sticky note annotations with better positioning
  const drawStickyNoteAnnotation = (
    ctx: CanvasRenderingContext2D,
    annotation: Annotation,
    scale: number
  ): void => {
    if (!annotation.text || annotation.points.length === 0) return;
    
    const position = annotation.points[0];
    const text = annotation.text;
    
    ctx.save();
    
    // Sticky note background
    const width = 200 * scale;
    const height = 150 * scale;
    const x = position.x * scale;
    const y = position.y * scale;
    
    // Draw yellow background
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(x, y, width, height);
    
    // Draw the folded corner
    ctx.beginPath();
    ctx.moveTo(x + width - 20 * scale, y);
    ctx.lineTo(x + width, y + 20 * scale);
    ctx.lineTo(x + width, y);
    ctx.closePath();
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fill();
    
    // Draw text content
    ctx.fillStyle = "#000000";
    ctx.font = `14px Arial`;
    ctx.textBaseline = 'top';
    
    // Split text into lines and render with padding
    const lines = text.split('\n');
    const lineHeight = 16 * scale;
    const padding = 10 * scale;
    
    // Apply text wrapping for sticky notes
    const maxWidth = width - (padding * 2);
    let renderedLines: string[] = [];
    
    for (const line of lines) {
      if (line.length === 0) {
        renderedLines.push('');
        continue;
      }
      
      let testWidth = ctx.measureText(line).width;
      if (testWidth <= maxWidth) {
        renderedLines.push(line);
        continue;
      }
      
      // Need to wrap this line
      let words = line.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        testWidth = ctx.measureText(testLine).width;
        
        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          renderedLines.push(currentLine);
          currentLine = word;
        }
      }
      
      if (currentLine) {
        renderedLines.push(currentLine);
      }
    }
    
    // Render each line
    for (let i = 0; i < renderedLines.length; i++) {
      ctx.fillText(
        renderedLines[i],
        x + padding,
        y + padding + (i * lineHeight)
      );
    }
    
    ctx.restore();
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 z-10"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        style={{
          cursor: getCursor(
            currentTool,
            isResizing,
            activeHandle,
            !!moveOffset
          ),
          width: `${width}px`,
          height: `${height}px`,
        }}
      />
      {isEditingText && textInputPosition && (
        <TextInput
          position={textInputPosition}
          onComplete={handleTextComplete}
          onCancel={handleTextCancel}
          scale={scale}
          isSticky={
            editingAnnotation
              ? editingAnnotation.type === "stickyNote"
              : currentTool === "stickyNote"
          }
          initialText={editingAnnotation?.style.text}
          dimensions={textDimensions}
        />
      )}
      {contextMenu && (
        <ContextMenu
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
};

// Helper function to determine cursor style
const getCursor = (
  tool: string,
  isResizing: boolean,
  activeHandle: ResizeHandle | null,
  isMoving: boolean
): string => {
  if (isMoving) return "move";
  if (isResizing && activeHandle) {
    return getResizeCursor(activeHandle);
  }

  switch (tool) {
    case "select":
      return "default";
    case "freehand":
      return "crosshair";
    case "text":
      return "text";
    case "stickyNote":
      return "cell"; // Cell cursor looks like a plus in a box, good for sticky notes
    default:
      return "crosshair";
  }
};