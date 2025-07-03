import React, { useState, useEffect } from 'react';
import { Idea } from '../types';
import { IdeaCard } from './IdeaCard';
import { dataService } from '../services/dataService';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  DragOverEvent,
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
import { Bars3Icon } from '@heroicons/react/24/outline';

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
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <IdeaCard
        id={id}
        idea={idea}
        onClick={onIdeaClick}
        isDragging={isDragging}
      />
      <div 
        {...attributes} 
        {...listeners}
        className="absolute top-2 right-2 p-1 bg-gray-100 hover:bg-gray-200 rounded cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
        title="Drag to reorder"
      >
        <Bars3Icon className="h-4 w-4 text-gray-600" />
      </div>
    </div>
  );
};

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, range, description, ideas, onIdeaClick, testId }) => {
  return (
    <div className="bg-gray-50 rounded-lg p-4 min-h-96" data-testid={testId}>
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{range}</p>
        <p className="text-xs text-gray-400 mt-1">{description}</p>
        <div className="text-xs text-gray-400 mt-1">
          {ideas.length} idea{ideas.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      <SortableContext items={ideas.map(([id]) => id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
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
  };

  const handleDragOver = (event: DragOverEvent) => {
    // This will be used for cross-column dragging
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    if (active.id !== over.id) {
      // Find source and target columns
      const activeColumn = Object.entries(groupedIdeas).find(([, items]) =>
        items.find(([id]) => id === active.id)
      );
      
      const overColumn = Object.entries(groupedIdeas).find(([, items]) =>
        items.find(([id]) => id === over.id)
      );

      if (activeColumn && overColumn) {
        const [activeColumnKey, activeItems] = activeColumn;
        const [overColumnKey, overItems] = overColumn;

        if (activeColumnKey === overColumnKey) {
          // Reordering within the same column
          const oldIndex = activeItems.findIndex(([id]) => id === active.id);
          const newIndex = activeItems.findIndex(([id]) => id === over.id);

          if (oldIndex !== newIndex) {
            const newOrder = [...activeItems];
            const [movedItem] = newOrder.splice(oldIndex, 1);
            newOrder.splice(newIndex, 0, movedItem);
            
            onReorder(newOrder.map(([id]) => id));
          }
        } else {
          // Moving between columns - update readiness level
          const sourceColumn = columns.find(col => col.key === activeColumnKey);
          const targetColumn = columns.find(col => col.key === overColumnKey);
          
          if (sourceColumn && targetColumn) {
            const activeIdea = ideas[active.id as string];
            if (activeIdea) {
              // Update the idea's readiness to match the target column
              const newReadiness = targetColumn.minReadiness;
              const updatedIdea = {
                ...activeIdea,
                dimensions: {
                  ...activeIdea.dimensions,
                  readiness: newReadiness,
                },
              };
              
              onIdeaUpdate(active.id as string, updatedIdea);
            }
          }
        }
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
      collisionDetection={closestCenter}
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
              />
            </div>
          ))}
        </div>
      </div>
      
      <DragOverlay>
        {activeIdea ? (
          <IdeaCard
            id={activeId!}
            idea={activeIdea}
            onClick={() => {}}
            isDragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}; 