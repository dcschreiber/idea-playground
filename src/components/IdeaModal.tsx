import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, PencilIcon, EyeIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline';
import MarkdownEditor from '@uiw/react-markdown-editor';
import '@uiw/react-markdown-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { Idea, Dimensions, ConnectedIdea } from '../types';
import { dataService } from '../services/dataService';
import clsx from 'clsx';

interface IdeaModalProps {
  ideaId: string | null;
  isCreatingNew: boolean;
  onClose: () => void;
  onSave: (ideaId: string | null, idea: Idea) => Promise<string | null>;
  onDelete?: (ideaId: string) => void;
}

export const IdeaModal: React.FC<IdeaModalProps> = ({ 
  ideaId: initialIdeaId, 
  isCreatingNew, 
  onClose, 
  onSave,
  onDelete
}) => {
  const [ideaId, setIdeaId] = useState<string | null>(initialIdeaId);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [dimensions, setDimensions] = useState<Dimensions>({
    field: '',
    readiness: 1,
    complexity: 1,
    potentially_connected_idea: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [fieldValues, setFieldValues] = useState<string[]>([]);
  const [allIdeas, setAllIdeas] = useState<Record<string, Idea>>({});
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialDataRef = useRef<{ title: string; content: string; dimensions: Dimensions } | null>(null);

  const availableConnections = Object.entries(allIdeas).filter(([id]) => id !== ideaId);

  useEffect(() => {
    setIdeaId(initialIdeaId);
  }, [initialIdeaId]);

  useEffect(() => {
    loadData();
  }, [ideaId, isCreatingNew]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load dimensions and all ideas for connections
      const [dimensionsData, ideas] = await Promise.all([
        dataService.getDimensions(),
        dataService.getIdeas(),
      ]);
      
      // Extract field values from dimensions
      const fieldDimension = dimensionsData.dimensions_registry.core_dimensions.field;
      if (typeof fieldDimension === 'object' && fieldDimension.values) {
        setFieldValues(fieldDimension.values);
      }
      
      setAllIdeas(ideas);

      if (ideaId && !isCreatingNew) {
        // Load existing idea
        const idea = ideas[ideaId];
        if (idea) {
          setTitle(idea.title);
          setContent(idea.content);
          setDimensions(idea.dimensions);
          // Store initial data for comparison
          initialDataRef.current = {
            title: idea.title,
            content: idea.content,
            dimensions: idea.dimensions,
          };
        }
      } else {
        // Reset for new idea
        setTitle('');
        setContent('# New Idea\n\n## Core Concept\n\n');
        const defaultField = fieldDimension && typeof fieldDimension === 'object' && fieldDimension.values 
          ? fieldDimension.values[0] 
          : '';
        const defaultDimensions = {
          field: defaultField,
          readiness: 1,
          complexity: 1,
          potentially_connected_idea: null,
        };
        setDimensions(defaultDimensions);
        
        // Initialize reference for new ideas so auto-save can detect changes
        initialDataRef.current = {
          title: '',
          content: '# New Idea\n\n## Core Concept\n\n',
          dimensions: defaultDimensions,
        };
        
        // New ideas start in edit mode
        setIsEditMode(true);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-save function with debouncing
  const autoSave = useCallback(async () => {
    if (!title.trim() || (!ideaId && !isCreatingNew)) {
      return;
    }

    try {
      setSaving(true);
      const idea: Idea = {
        title: title.trim(),
        content,
        dimensions,
        sub_ideas: [],
        order: 0, // Will be set by the parent component
      };
      
      const returnedId = await onSave(ideaId, idea);
      
      // If we got a new ID back (for new ideas), update our state
      if (!ideaId && returnedId) {
        setIdeaId(returnedId);
      }
      
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      
      // Update initial data reference after successful save
      initialDataRef.current = {
        title: title.trim(),
        content,
        dimensions,
      };
    } catch (err) {
      console.error('Error auto-saving idea:', err);
    } finally {
      setSaving(false);
    }
  }, [title, content, dimensions, ideaId, isCreatingNew, onSave]);

  // Check for changes and trigger auto-save
  useEffect(() => {
    if (!initialDataRef.current || loading) return;

    const hasChanges = 
      title.trim() !== initialDataRef.current.title ||
      content !== initialDataRef.current.content ||
      JSON.stringify(dimensions) !== JSON.stringify(initialDataRef.current.dimensions);

    setHasUnsavedChanges(hasChanges);

    if (hasChanges && title.trim()) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout for auto-save (2 seconds after last change)
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSave();
      }, 2000);
    }

    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [title, content, dimensions, autoSave, loading]);

  const handleSave = async () => {
    // Manual save for immediate save (keeping for compatibility)
    await autoSave();
  };

  const handleDimensionChange = (key: keyof Dimensions, value: any) => {
    setDimensions(prev => ({ ...prev, [key]: value }));
  };

  const handleConnectionChange = (ideaKey: string, strength: number) => {
    if (!ideaKey) {
      setDimensions(prev => ({ ...prev, potentially_connected_idea: null }));
    } else {
      setDimensions(prev => ({
        ...prev,
        potentially_connected_idea: { idea: ideaKey, relation_strength: strength }
      }));
    }
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  const handleDelete = async () => {
    if (!ideaId || isCreatingNew || !onDelete) return;
    
    const confirmed = window.confirm('Are you sure you want to delete this idea? This action cannot be undone.');
    if (confirmed) {
      try {
        await onDelete(ideaId);
        onClose();
      } catch (err) {
        console.error('Error deleting idea:', err);
        alert('Failed to delete idea. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <Dialog as="div" className="fixed inset-0 z-50 flex items-center justify-center" onClose={onClose} open={true}>
        <div className="fixed inset-0 bg-black bg-opacity-25" />
        <div className="bg-white p-8 rounded-lg">
          <div className="text-center">Loading...</div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog 
      as="div" 
      className="fixed inset-0 z-50 flex items-center justify-center" 
      onClose={onClose}
      data-testid="idea-modal"
      open={true}
    >
      <div className="fixed inset-0 bg-black bg-opacity-25" />

      <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
        <Dialog.Panel className={clsx(
          "w-full bg-white shadow-xl rounded-xl max-w-5xl max-h-[90vh] overflow-hidden relative z-10",
          isFullscreen && "h-full max-w-none max-h-none rounded-none"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter idea title..."
              data-testid="modal-title"
              className="text-xl font-semibold text-gray-900 bg-transparent border-none outline-none flex-1 mr-4"
            />
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleEditMode}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
                data-testid="edit-toggle"
              >
                {isEditMode ? (
                  <EyeIcon className="h-5 w-5" />
                ) : (
                  <PencilIcon className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
              >
                {isFullscreen ? (
                  <ArrowsPointingInIcon className="h-5 w-5" />
                ) : (
                  <ArrowsPointingOutIcon className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className={clsx(
            "grid",
            isFullscreen ? "grid-cols-3 h-[calc(100vh-73px)]" : "grid-cols-1 lg:grid-cols-3 max-h-[calc(90vh-73px)]"
          )}>
            {/* Content - Takes up 2 columns */}
            <div className="col-span-2 p-6 border-r border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Content</h3>
                <span className="text-sm text-gray-500">
                  {isEditMode ? 'Edit Mode' : 'Preview Mode'}
                </span>
              </div>
              
              {isEditMode ? (
                <div 
                  className={clsx(
                    "border border-gray-300 rounded-lg overflow-hidden",
                    isFullscreen ? "h-[calc(100%-4rem)]" : "h-96"
                  )}
                  data-testid="markdown-editor"
                >
                  <MarkdownEditor
                    value={content}
                    onChange={(value) => setContent(value || '')}
                    height={isFullscreen ? '100%' : '384px'}
                    visible={true}
                  />
                </div>
              ) : (
                <div 
                  className={clsx(
                    "border border-gray-200 rounded-lg p-6 overflow-y-auto bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors",
                    isFullscreen ? "h-[calc(100%-4rem)]" : "h-96"
                  )}
                  onClick={() => setIsEditMode(true)}
                  data-testid="markdown-preview"
                >
                  <div className="prose prose-sm max-w-none">
                    <MarkdownEditor.Markdown source={content} />
                  </div>
                  {!content.trim() && (
                    <div className="text-gray-400 italic">
                      Click here to start writing your idea...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dimensions Form */}
            <div className="p-6 overflow-y-auto" data-testid="dimensions-form">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Dimensions</h3>
              
              <div className="space-y-6">
                {/* Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Field
                  </label>
                  <select
                    value={dimensions.field}
                    onChange={(e) => handleDimensionChange('field', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {fieldValues.map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Readiness */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Readiness Level: {dimensions.readiness}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={dimensions.readiness}
                    onChange={(e) => handleDimensionChange('readiness', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Research</span>
                    <span>Ready to Deploy</span>
                  </div>
                </div>

                {/* Complexity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Complexity Level: {dimensions.complexity}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={dimensions.complexity}
                    onChange={(e) => handleDimensionChange('complexity', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Trivial</span>
                    <span>Fundamental</span>
                  </div>
                </div>

                {/* Connected Idea */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Connected Idea
                  </label>
                  <select
                    value={dimensions.potentially_connected_idea?.idea || ''}
                    onChange={(e) => handleConnectionChange(
                      e.target.value, 
                      dimensions.potentially_connected_idea?.relation_strength || 0.5
                    )}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 mb-2"
                  >
                    <option value="">No connection</option>
                    {availableConnections.map(([id, idea]) => (
                      <option key={id} value={id}>
                        {idea.title}
                      </option>
                    ))}
                  </select>
                  
                  {dimensions.potentially_connected_idea && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Connection Strength: {Math.round(dimensions.potentially_connected_idea.relation_strength * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={dimensions.potentially_connected_idea.relation_strength}
                        onChange={(e) => handleConnectionChange(
                          dimensions.potentially_connected_idea!.idea,
                          parseFloat(e.target.value)
                        )}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Loose</span>
                        <span>Strong</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Auto-save Status */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-sm">
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-gray-600">Saving...</span>
                    </>
                  ) : hasUnsavedChanges ? (
                    <>
                      <div className="h-2 w-2 bg-orange-400 rounded-full"></div>
                      <span className="text-gray-600">Unsaved changes</span>
                    </>
                  ) : lastSaved ? (
                    <>
                      <CheckIcon className="h-4 w-4 text-green-500" />
                      <span className="text-gray-600">
                        Saved {lastSaved.toLocaleTimeString()}
                      </span>
                    </>
                  ) : null}
                </div>
                <div className="flex space-x-3">
                  {!isCreatingNew && ideaId && onDelete && (
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center space-x-2"
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}; 