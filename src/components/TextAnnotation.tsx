import React, { useState } from 'react';
import { Edit2, Trash2, X, Check } from 'lucide-react';
import { Annotation } from '../types/annotation';

interface TextAnnotationProps {
  annotation: Annotation;
  scale: number;
  isSelected: boolean;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onSelect: (annotation: Annotation) => void;
}

const TextAnnotation: React.FC<TextAnnotationProps> = ({
  annotation,
  scale,
  isSelected,
  onEdit,
  onDelete,
  onSelect
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(annotation.text || '');
  const [isHovered, setIsHovered] = useState(false);
  
  const { type, points, style } = annotation;
  const isSticky = type === 'stickyNote';
  
  const position = points[0];
  const { textOptions = {} } = style;
  
  // Default font styles if not specified
  const fontSize = textOptions.fontSize || 14;
  const fontFamily = textOptions.fontFamily || 'Arial';
  
  // Dimensions
  const width = isSticky ? 200 : 'auto';
  const minHeight = isSticky ? 150 : 'auto';
  
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };
  
  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editText.trim()) {
      onEdit(annotation.id, editText);
    }
    setIsEditing(false);
  };
  
  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditText(annotation.text || '');
    setIsEditing(false);
  };
  
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this note?')) {
      onDelete(annotation.id);
    }
  };
  
  return (
    <div 
      className={`absolute transition-all`}
      style={{
        left: `${position.x * scale}px`, 
        top: `${position.y * scale}px`,
        zIndex: isSelected ? 999 : 1,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}
      onClick={() => onSelect(annotation)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className={`relative group ${
          isSticky 
            ? 'bg-yellow-200 border border-yellow-400 shadow-md' 
            : 'bg-transparent'
        } ${
          isSelected ? 'ring-2 ring-blue-500' : isHovered ? 'ring-1 ring-blue-300' : ''
        } rounded`}
        style={{ 
          width,
          minHeight,
          paddingTop: isSticky ? '24px' : '0',
        }}
      >
        {/* Controls shown when selected or hovered */}
        {!isEditing && (isSelected || isHovered) && (
          <div className="absolute -top-8 right-0 flex gap-1 bg-white rounded-full shadow-md border border-gray-200 p-1">
            <button 
              onClick={handleEditClick}
              className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
            <button 
              onClick={handleDeleteClick}
              className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
        
        {/* Folded corner decoration for sticky notes */}
        {isSticky && (
          <div className="absolute top-0 right-0 w-5 h-5 bg-yellow-300 rounded-bl-sm" style={{
            clipPath: 'polygon(100% 0, 0 0, 100% 100%)'
          }}></div>
        )}
        
        {/* Sticky note header */}
        {isSticky && (
          <div className="absolute top-0 left-0 right-0 h-6 px-2 flex items-center justify-between">
            <div className="text-xs text-gray-700 font-medium overflow-hidden text-ellipsis whitespace-nowrap">
              Note
            </div>
          </div>
        )}
        
        {/* Content area */}
        {isEditing ? (
          <div className="p-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full min-h-[100px] p-2 border border-blue-300 focus:ring-2 focus:ring-blue-500 rounded text-gray-800 outline-none resize-none"
              style={{ fontSize: `${fontSize}px`, fontFamily }}
              autoFocus
            />
            <div className="flex justify-end gap-1 mt-2">
              <button 
                onClick={handleCancelClick}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
              >
                <X size={12} />
                Cancel
              </button>
              <button 
                onClick={handleSaveClick}
                className="flex items-center gap-1 px-2 py-1 text-xs text-white bg-blue-500 hover:bg-blue-600 rounded"
              >
                <Check size={12} />
                Save
              </button>
            </div>
          </div>
        ) : (
          <div 
            className={`p-3 whitespace-pre-wrap ${isSticky ? 'text-gray-800' : ''}`}
            style={{ 
              fontSize: `${fontSize}px`,
              fontFamily,
              fontWeight: textOptions.bold ? 'bold' : 'normal',
              fontStyle: textOptions.italic ? 'italic' : 'normal',
              textDecoration: textOptions.underline ? 'underline' : 'none',
              color: isSticky ? '#000000' : style.color,
            }}
          >
            {annotation.text || ''}
          </div>
        )}
      </div>
    </div>
  );
};

export default TextAnnotation; 