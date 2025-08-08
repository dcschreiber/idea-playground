import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, CheckIcon, TrashIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { Idea, Dimensions } from '../types';
import { dataService } from '../services/dataService';
import clsx from 'clsx';

interface IdeaModalProps {
  ideaId: string | null;
  isCreatingNew: boolean;
  onClose: () => void;
  onSave: (ideaId: string | null, idea: Idea) => Promise<string | null>;
  onDelete?: (ideaId: string) => void;
}

type NewIdeaPhase = 'title-validation' | 'editing';

interface TitleValidationState {
  isValidating: boolean;
  isValid: boolean;
  error: string | null;
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
  const [deleting, setDeleting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Single-mode editing with live preview
  const [fieldValues, setFieldValues] = useState<string[]>([]);
  const [allIdeas, setAllIdeas] = useState<Record<string, Idea>>({});
  const turndownRef = useRef(new TurndownService());

  // TipTap editor instance (classic rich-text experience with single mode)
  const editor = useEditor({
    extensions: [StarterKit],
    content: mdToHtml(content),
    onUpdate: ({ editor }) => {
      try {
        const html = editor.getHTML();
        const md = turndownRef.current.turndown(html);
        setContent(md);
      } catch {
        // ignore conversion errors; leave content as-is
      }
    },
  });
  
  // New idea creation state
  const [newIdeaPhase, setNewIdeaPhase] = useState<NewIdeaPhase>('title-validation');
  const [titleValidation, setTitleValidation] = useState<TitleValidationState>({
    isValidating: false,
    isValid: false,
    error: null,
  });
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialDataRef = useRef<{ title: string; content: string; dimensions: Dimensions } | null>(null);

  const availableConnections = Object.entries(allIdeas).filter(([id]) => id !== ideaId);

  useEffect(() => {
    setIdeaId(initialIdeaId);
  }, [initialIdeaId]);

  useEffect(() => {
    loadData();
  }, [ideaId, isCreatingNew]);

  // Title validation effect for new ideas
  useEffect(() => {
    if (!isCreatingNew || newIdeaPhase !== 'title-validation') return;

    // Clear existing timeout
    if (titleValidationTimeoutRef.current) {
      clearTimeout(titleValidationTimeoutRef.current);
    }

    // Reset validation state if title is empty
    if (!title.trim()) {
      setTitleValidation({ isValidating: false, isValid: false, error: null });
      return;
    }

    // Set validation state to loading
    setTitleValidation(prev => ({ ...prev, isValidating: true, error: null }));

    // Debounce validation
    titleValidationTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await dataService.validateTitle(title.trim());
        setTitleValidation({
          isValidating: false,
          isValid: result.isUnique,
          error: result.isUnique ? null : 'title already exists',
        });
      } catch (error) {
        console.error('Title validation error:', error);
        setTitleValidation({
          isValidating: false,
          isValid: false,
          error: 'Unable to validate title. Please try again.',
        });
      }
    }, 500);

    return () => {
      if (titleValidationTimeoutRef.current) {
        clearTimeout(titleValidationTimeoutRef.current);
      }
    };
  }, [title, isCreatingNew, newIdeaPhase]);

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
      let fields: string[] = [];
      if (fieldDimension?.values && Array.isArray(fieldDimension.values)) {
        fields = fieldDimension.values;
        setFieldValues(fields);
      }
      
      setAllIdeas(ideas);

      if (ideaId && !isCreatingNew) {
        // Load existing idea
        const idea = ideas[ideaId];
        if (idea) {
          setTitle(idea.title);
          setContent(idea.content);
          setDimensions(idea.dimensions);
          // Sync editor with loaded content
          setTimeout(() => {
            const html = mdToHtml(idea.content);
            if (editor && editor.getHTML() !== html) {
              editor.commands.setContent(html, { emitUpdate: false });
            }
          }, 0);
          // Store initial data for comparison
          initialDataRef.current = {
            title: idea.title,
            content: idea.content,
            dimensions: idea.dimensions,
          };
        }
      } else if (isCreatingNew) {
        // Reset for new idea
        setTitle('');
        setNewIdeaPhase('title-validation');
        setTitleValidation({ isValidating: false, isValid: false, error: null });
        
        const defaultDimensions = {
          field: '', // Default to no field selected
          readiness: 1,
          complexity: 1,
          potentially_connected_idea: null,
        };
        setDimensions(defaultDimensions);
        // Reset editor content
        setTimeout(() => {
          const html = mdToHtml('');
          if (editor && editor.getHTML() !== html) {
            editor.commands.setContent(html, { emitUpdate: false });
          }
        }, 0);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToEditing = () => {
    if (!titleValidation.isValid || !title.trim()) return;
    
    // Generate default content with the validated title
    const defaultContent = `# ${title.trim()}\n\n## Core Concept\n\n`;
    setContent(defaultContent);
    // Initialize editor with default HTML derived from markdown
    const html = mdToHtml(defaultContent);
    if (editor) {
      editor.commands.setContent(html, { emitUpdate: false });
    }
    
    // Initialize reference for auto-save detection
    initialDataRef.current = {
      title: title.trim(),
      content: defaultContent,
      dimensions,
    };
    
    // Switch to editing phase (single editor mode)
    setNewIdeaPhase('editing');
  };

  // Auto-save function with debouncing (only for editing phase)
  const autoSave = useCallback(async () => {
    if (!title.trim() || (!ideaId && !isCreatingNew) || (isCreatingNew && newIdeaPhase !== 'editing')) {
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
  }, [title, content, dimensions, ideaId, isCreatingNew, onSave, newIdeaPhase]);

  // Check for changes and trigger auto-save (only in editing phase)
  useEffect(() => {
    if (!initialDataRef.current || loading || (isCreatingNew && newIdeaPhase !== 'editing')) return;

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
  }, [title, content, dimensions, autoSave, loading, isCreatingNew, newIdeaPhase]);

  // Keep editor in sync when markdown content changes externally
  useEffect(() => {
    const html = mdToHtml(content);
    if (editor && editor.getHTML() !== html) {
      editor.commands.setContent(html, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);



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

  // Track latest state for flush on close/unmount
  const latestStateRef = useRef({
    title: '',
    content: '',
    dimensions: dimensions as Dimensions,
    hasUnsavedChanges: false,
  });

  useEffect(() => {
    latestStateRef.current = {
      title,
      content,
      dimensions,
      hasUnsavedChanges,
    };
  }, [title, content, dimensions, hasUnsavedChanges]);

  const flushAutoSave = useCallback(async () => {
    // Clear any pending debounce
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    if (latestStateRef.current.hasUnsavedChanges && latestStateRef.current.title.trim()) {
      await autoSave();
    }
  }, [autoSave]);

  // Save on unmount even if dialog closes
  useEffect(() => {
    return () => {
      if (latestStateRef.current.hasUnsavedChanges && latestStateRef.current.title.trim()) {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
          autoSaveTimeoutRef.current = null;
        }
        void autoSave();
      }
    };
  }, [autoSave]);

  const handleDialogClose = async () => {
    await flushAutoSave();
    onClose();
  };

  const handleDelete = async () => {
    if (!ideaId || isCreatingNew || !onDelete || deleting) return;
    
    const confirmed = window.confirm('Are you sure you want to delete this idea? This action cannot be undone.');
    if (confirmed) {
      try {
        setDeleting(true);
        await onDelete(ideaId);
        onClose();
      } catch (err) {
        console.error('Error deleting idea:', err);
        alert('Failed to delete idea. Please try again.');
      } finally {
        setDeleting(false);
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

  // Render title validation phase for new ideas
  if (isCreatingNew && newIdeaPhase === 'title-validation') {
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
          <Dialog.Panel className="w-full bg-white shadow-xl rounded-xl max-w-2xl p-8 relative z-10" data-testid="title-validation-phase">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Create New Idea</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Title Input Section */}
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  Enter a unique title for your idea
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My amazing idea..."
                    data-testid="title-input"
                    className={clsx(
                      "w-full px-4 py-3 text-lg border-2 rounded-lg outline-none transition-colors",
                      titleValidation.error && !titleValidation.isValidating
                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                        : titleValidation.isValid
                        ? "border-green-300 focus:border-green-500 focus:ring-green-200"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                    )}
                    autoFocus
                  />
                  
                  {/* Validation Icons */}
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {titleValidation.isValidating && (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    )}
                    {!titleValidation.isValidating && titleValidation.isValid && (
                      <CheckIcon className="h-5 w-5 text-green-500" data-testid="title-valid" />
                    )}
                    {!titleValidation.isValidating && titleValidation.error && (
                      <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
                
                {/* Error Message */}
                {titleValidation.error && (
                  <p className="mt-2 text-sm text-red-600" data-testid="title-error">
                    {titleValidation.error}
                  </p>
                )}
                
                {/* Success Message */}
                {titleValidation.isValid && !titleValidation.error && (
                  <p className="mt-2 text-sm text-green-600">
                    ✓ Title is available
                  </p>
                )}
              </div>

              {/* Continue Button */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={handleContinueToEditing}
                  disabled={!titleValidation.isValid || titleValidation.isValidating || !title.trim()}
                  data-testid="continue-button"
                  className={clsx(
                    "px-6 py-3 text-lg font-medium rounded-lg transition-all duration-200",
                    titleValidation.isValid && !titleValidation.isValidating && title.trim()
                      ? "bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  )}
                >
                  Continue to Editing
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    );
  }

  // Render main editing interface (for existing ideas or new ideas in editing phase)
  return (
    <Dialog 
      as="div" 
      className="fixed inset-0 z-50 flex items-center justify-center" 
      onClose={handleDialogClose}
      data-testid="idea-modal"
      open={true}
    >
      <div className="fixed inset-0 bg-black bg-opacity-25" />

      <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
        <Dialog.Panel className={clsx(
          "w-full bg-white shadow-xl rounded-xl max-w-5xl max-h-[90vh] overflow-hidden relative z-10",
          isFullscreen && "h-full max-w-none max-h-none rounded-none"
        )} data-testid="editing-phase">
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter idea title..."
              data-testid="modal-title"
              className="text-lg md:text-xl font-semibold text-gray-900 bg-transparent border-none outline-none flex-1 mr-2 md:mr-4"
              readOnly={isCreatingNew && newIdeaPhase === 'editing'} // Title is locked during editing phase for new ideas
            />
            
            <div className="flex items-center space-x-2">
              {/* Fullscreen Toggle */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? 
                  <ArrowsPointingInIcon className="h-5 w-5" /> : 
                  <ArrowsPointingOutIcon className="h-5 w-5" />
                }
              </button>

              {/* Close */}
              <button
                onClick={handleDialogClose}
                className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                title="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
            {/* Main Content */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
              <div
                data-testid="markdown-editor"
                className={clsx(
                  "border border-gray-200 rounded-lg overflow-auto",
                  isFullscreen ? "h-[calc(100vh-8rem)]" : "h-72 md:h-96"
                )}
              >
                <div className="p-3">
                  <Toolbar
                    editor={editor}
                  />
                </div>
                <div className={clsx("px-4 pb-4", "prose prose-sm max-w-none")}
                     style={{ height: isFullscreen ? undefined : undefined }}>
                  <EditorContent editor={editor} />
                </div>
              </div>
            </div>

            {/* Dimensions Form */}
            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-gray-200 p-4 md:p-6 overflow-y-auto bg-gray-50" data-testid="dimensions-form">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Dimensions</h3>
              
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
                    <option value="">Select field...</option>
                    {fieldValues.map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Readiness Level */}
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

                {/* Complexity Level */}
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
                        Relation Strength: {(dimensions.potentially_connected_idea.relation_strength * 100).toFixed(0)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={dimensions.potentially_connected_idea.relation_strength}
                        onChange={(e) => handleConnectionChange(
                          dimensions.potentially_connected_idea!.idea,
                          parseFloat(e.target.value)
                        )}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
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
                  disabled={deleting}
                  className={clsx(
                    "px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center space-x-2",
                    deleting
                      ? "text-gray-400 bg-gray-100 border border-gray-300 cursor-not-allowed"
                      : "text-red-700 bg-white border border-red-300 hover:bg-red-50"
                  )}
                >
                  {deleting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  ) : (
                    <TrashIcon className="h-4 w-4" />
                  )}
                  <span>{deleting ? "Deleting..." : "Delete"}</span>
                </button>
              )}
              <button
                onClick={handleDialogClose}
                disabled={deleting}
                className={clsx(
                  "px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                  deleting
                    ? "text-gray-400 bg-gray-100 border border-gray-300 cursor-not-allowed"
                    : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                )}
              >
                Close
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}; 

// Convert Markdown <-> HTML helpers
const mdToHtml = (markdown: string): string => {
  try {
    return marked.parse(markdown ?? '', { breaks: true }) as string;
  } catch {
    return markdown || '';
  }
};

// Toolbar component for a simple classic rich-text UI
interface ToolbarProps { editor: ReturnType<typeof useEditor> | null }
const Toolbar: React.FC<ToolbarProps> = ({ editor }) => {
  if (!editor) return null;
  const Button = ({ onClick, active, label }: { onClick: () => void; active?: boolean; label: string }) => (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "text-sm px-2 py-1 mr-1 rounded border",
        active ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
      )}
    >
      {label}
    </button>
  );
  return (
    <div className="flex flex-wrap items-center" data-testid="richtext-toolbar">
      <Button label="B" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
      <Button label="I" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <Button label="H1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
      <Button label="H2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <Button label="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
      <Button label="Code" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
      <Button label="UL" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <Button label="OL" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
    </div>
  );
};