import React, { useState, useEffect } from 'react';
import { Idea } from '../types';
import { IdeaCard } from './IdeaCard';
import { dataService } from '../services/dataService';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import clsx from 'clsx';

interface KanbanViewProps {
  ideas: Record<string, Idea>;
  onIdeaClick: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onIdeaUpdate: (ideaId: string, updates: Partial<Idea>) => void;
}

interface SortableIdeaCardProps {
  id: string;
  idea: Idea;
  onIdeaClick: (id: string) => void;
}

interface KanbanColumnProps {
  title: string;
  range: string;
  description: string;
  ideas: Array<[string, Idea]>;
  onIdeaClick: (id: string) => void;
  testId: string;
  columnKey: string;
  isDropTarget?: boolean;
}

interface ReadinessColumn {
  key: string;
  title: string;
  range: string;
  description: string;
  testId: string;
  minReadiness: number;
  maxReadiness: number;
}

const SortableIdeaCard: React.FC<SortableIdeaCardProps> = ({ id, idea, onIdeaClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 150ms ease',
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={clsx(
        "cursor-grab active:cursor-grabbing transition-all duration-150",
        isDragging && "rotate-2 scale-105 shadow-xl"
      )}
      {...attributes}
      {...listeners}
    >
      <IdeaCard
        id={id}
        idea={idea}
        onClick={onIdeaClick}
        isDragging={isDragging}
        className={clsx(
          "border-2 transition-colors duration-200",
          isDragging ? "border-blue-400 shadow-lg" : "border-transparent hover:border-gray-300"
        )}
      />
    </div>
  );
};

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
  title, 
  range, 
  description, 
  ideas, 
  onIdeaClick, 
  testId, 
  columnKey, 
  isDropTarget = false 
}) => {
  const { setNodeRef } = useDroppable({ id: columnKey });
  return (
    <div 
      className={clsx(
        "rounded-lg p-4 min-h-96 transition-all duration-200 border-2",
        isDropTarget 
          ? "bg-blue-50 border-blue-300 border-dashed" 
          : "bg-gray-50 border-transparent"
      )} 
      data-testid={testId}
      data-column={columnKey}
    >
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{range}</p>
        <p className="text-xs text-gray-400 mt-1">{description}</p>
        <div className="text-xs text-gray-400 mt-1">
          {ideas.length} idea{ideas.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      <SortableContext id={columnKey} items={ideas.map(([id]) => id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={clsx(
          "space-y-3 min-h-40 rounded-lg transition-all duration-200",
          isDropTarget && "bg-blue-100/50 border-dashed border-2 border-blue-300 p-2"
        )}>
          {ideas.length === 0 && isDropTarget && (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Drop ideas here
            </div>
          )}
          {ideas.map(([id, idea]) => (
            <SortableIdeaCard
              key={id}
              id={id}
              idea={idea}
              onIdeaClick={onIdeaClick}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

export const KanbanView: React.FC<KanbanViewProps> = ({ ideas, onIdeaClick, onReorder, onIdeaUpdate }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [columns, setColumns] = useState<ReadinessColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load column definitions from dimensions.json
  useEffect(() => {
    const loadColumns = async () => {
      try {
        const dimensionsData = await dataService.getDimensions();
        const readinessDimension = dimensionsData.dimensions_registry.core_dimensions.readiness;
        
        // Type assertion since we know readiness is a DimensionDefinition with scale
        if (readinessDimension && typeof readinessDimension === 'object' && 'scale' in readinessDimension) {
          const readinessScale = readinessDimension.scale;
          
          if (readinessScale) {
            const dynamicColumns: ReadinessColumn[] = Object.entries(readinessScale).map(([range, description]) => {
              const [min, max] = range.split('-').map(Number);
              return {
                key: range,
                title: getColumnTitle(range),
                range: `Readiness ${range}`,
                description: description as string,
                testId: `kanban-column-${range}`,
                minReadiness: min,
                maxReadiness: max,
              };
            });
            
            setColumns(dynamicColumns);
            return;
          }
        }
        
        throw new Error('Invalid readiness dimension structure');
      } catch (error) {
        console.error('Error loading columns:', error);
        // Fallback to default columns if loading fails
        setColumns([
          { key: '1-2', title: 'Research Phase', range: 'Readiness 1-2', description: 'Research question only', testId: 'kanban-column-1-2', minReadiness: 1, maxReadiness: 2 },
          { key: '3-4', title: 'Concept Development', range: 'Readiness 3-4', description: 'Concept defined, needs development', testId: 'kanban-column-3-4', minReadiness: 3, maxReadiness: 4 },
          { key: '5-6', title: 'Implementation', range: 'Readiness 5-6', description: 'Design complete, implementation started', testId: 'kanban-column-5-6', minReadiness: 5, maxReadiness: 6 },
          { key: '7-8', title: 'Prototype', range: 'Readiness 7-8', description: 'Working prototype/draft', testId: 'kanban-column-7-8', minReadiness: 7, maxReadiness: 8 },
          { key: '9-10', title: 'Ready to Deploy', range: 'Readiness 9-10', description: 'Ready to deploy/publish', testId: 'kanban-column-9-10', minReadiness: 9, maxReadiness: 10 },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadColumns();
  }, []);

  const getColumnTitle = (range: string): string => {
    const titleMap: Record<string, string> = {
      '1-2': 'Research Phase',
      '3-4': 'Concept Development', 
      '5-6': 'Implementation',
      '7-8': 'Prototype',
      '9-10': 'Ready to Deploy',
    };
    return titleMap[range] || `Level ${range}`;
  };

  // Group ideas by readiness level
  const groupedIdeas = columns.reduce((acc, column) => {
    acc[column.key] = Object.entries(ideas)
      .filter(([, idea]) => 
        idea.dimensions.readiness >= column.minReadiness && 
        idea.dimensions.readiness <= column.maxReadiness
      )
      .sort(([, a], [, b]) => a.order - b.order);
    return acc;
  }, {} as Record<string, Array<[string, Idea]>>);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setDragOverColumn(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setDragOverColumn(null);
      return;
    }

    let overColumn: string | null = null;

    // If hovering over a card, find its column
    for (const [columnKey, items] of Object.entries(groupedIdeas)) {
      if (items.find(([id]) => id === over.id)) {
        overColumn = columnKey;
        break;
      }
    }

    // Otherwise, if hovering over a column droppable area
    if (!overColumn && typeof over.id === 'string') {
      const columnMatch = columns.find(col => col.key === over.id);
      if (columnMatch) {
        overColumn = columnMatch.key;
      }
    }

    setDragOverColumn(overColumn);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDragOverColumn(null);

    if (!over) {
      setActiveId(null);
      return;
    }

    // Identify source column
    const activeColumnEntry = Object.entries(groupedIdeas).find(([, items]) =>
      items.find(([id]) => id === active.id)
    );

    // Identify target column
    let targetColumnKey: string | null = null;

    // If dropping over a card, get that card's column
    for (const [columnKey, items] of Object.entries(groupedIdeas)) {
      if (items.find(([id]) => id === over.id)) {
        targetColumnKey = columnKey;
        break;
      }
    }

    // If dropping over a column droppable area
    if (!targetColumnKey && typeof over.id === 'string') {
      const match = columns.find(col => col.key === over.id);
      if (match) {
        targetColumnKey = match.key;
      }
    }

    if (!activeColumnEntry || !targetColumnKey) {
      setActiveId(null);
      return;
    }

    const [activeColumnKey, activeItems] = activeColumnEntry;

    if (activeColumnKey === targetColumnKey) {
      // Reorder within same column if dropping over a card
      if (active.id !== over.id) {
        const oldIndex = activeItems.findIndex(([id]) => id === active.id);
        const newIndex = activeItems.findIndex(([id]) => id === over.id);
        if (newIndex !== -1 && oldIndex !== newIndex) {
          const newOrder = [...activeItems];
          const [movedItem] = newOrder.splice(oldIndex, 1);
          newOrder.splice(newIndex, 0, movedItem);
          onReorder(newOrder.map(([id]) => id));
        }
      }
    } else {
      // Move across columns
      const targetColumn = columns.find(col => col.key === targetColumnKey);
      const activeIdea = ideas[active.id as string];
      if (targetColumn && activeIdea) {
        const newReadiness = targetColumn.minReadiness;
        onIdeaUpdate(active.id as string, {
          dimensions: {
            ...activeIdea.dimensions,
            readiness: newReadiness,
          },
        });
      }
    }

    setActiveId(null);
  };

  const activeIdea = activeId ? ideas[activeId] : null;

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">Loading kanban board...</div>
      </div>
    );
  }

  if (Object.values(groupedIdeas).every(column => column.length === 0)) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">No ideas found</div>
        <p className="text-gray-400 text-sm mt-2">
          Try adjusting your filters or create a new idea
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto">
        <div 
          className="flex space-x-6 min-w-max pb-6"
          data-testid="kanban-board"
        >
          {columns.map((column) => (
            <div key={column.key} className="w-80 flex-shrink-0" data-testid="kanban-column">
              <KanbanColumn
                title={column.title}
                range={column.range}
                description={column.description}
                ideas={groupedIdeas[column.key] || []}
                onIdeaClick={onIdeaClick}
                testId={column.testId}
                columnKey={column.key}
                isDropTarget={dragOverColumn === column.key}
              />
            </div>
          ))}
        </div>
      </div>
      
      <DragOverlay>
        {activeIdea ? (
          <div className="rotate-2 scale-105 shadow-2xl">
            <IdeaCard
              id={activeId!}
              idea={activeIdea}
              onClick={() => {}}
              isDragging
              className="border-2 border-blue-400 shadow-xl"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}; 