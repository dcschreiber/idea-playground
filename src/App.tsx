import { useState, useEffect } from 'react';
import { Idea, DimensionFilters } from './types';
import { dataService } from './services/dataService';
import { FilterPanel } from './components/FilterPanel';
import { KanbanView } from './components/KanbanView';
import { IdeaModal } from './components/IdeaModal';
import { PlusIcon } from '@heroicons/react/24/outline';

function App() {
  const [ideas, setIdeas] = useState<Record<string, Idea>>({});
  const [filteredIdeas, setFilteredIdeas] = useState<Record<string, Idea>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DimensionFilters>({});
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchTitle, setSearchTitle] = useState('');

  useEffect(() => {
    loadIdeas();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [ideas, filters]);

  // Store base filtered ideas (from dimension filters) separately
  const [baseFilteredIdeas, setBaseFilteredIdeas] = useState<Record<string, Idea>>({});

  // Apply search filter in addition to other filters
  useEffect(() => {
    if (!searchTitle.trim()) {
      setFilteredIdeas(baseFilteredIdeas);
      return;
    }
    const lower = searchTitle.trim().toLowerCase();
    setFilteredIdeas(
      Object.fromEntries(
        Object.entries(baseFilteredIdeas).filter(([, idea]) =>
          idea.title.toLowerCase().includes(lower)
        )
      )
    );
  }, [searchTitle, baseFilteredIdeas]);

  const loadIdeas = async () => {
    try {
      setLoading(true);
      const loadedIdeas = await dataService.getIdeas();
      setIdeas(loadedIdeas);
      setError(null);
    } catch (err) {
      setError('Failed to load ideas');
      console.error('Error loading ideas:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    try {
      const filtered: Record<string, Idea> = {};
      Object.entries(ideas).forEach(([id, idea]) => {
        let include = true;
        if (filters.field && idea.dimensions.field !== filters.field) include = false;
        if (filters.readiness && idea.dimensions.readiness !== filters.readiness) include = false;
        if (filters.complexity && idea.dimensions.complexity !== filters.complexity) include = false;
        if (include) filtered[id] = idea;
      });
      setBaseFilteredIdeas(filtered);
    } catch (err) {
      console.error('Error filtering ideas:', err);
    }
  };

  const handleIdeaClick = (ideaId: string) => {
    console.log('Idea clicked:', ideaId);
    setSelectedIdeaId(ideaId);
    setIsCreatingNew(false);
    setIsModalOpen(true);
    console.log('Modal should be open now');
  };

  const handleNewIdea = () => {
    setSelectedIdeaId(null);
    setIsCreatingNew(true);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedIdeaId(null);
    setIsCreatingNew(false);
  };

  const handleIdeaSave = async (ideaId: string | null, idea: Idea): Promise<string | null> => {
    try {
      if (ideaId) {
        await dataService.saveIdea(ideaId, idea);
        setIdeas(prev => ({ ...prev, [ideaId]: idea }));
        return ideaId;
      } else {
        // Set order for new idea
        const maxOrder = Math.max(...Object.values(ideas).map(i => i.order), 0);
        const newIdea = { ...idea, order: maxOrder + 1 };
        
        const newId = await dataService.createIdea(newIdea);
        setIdeas(prev => ({ ...prev, [newId]: newIdea }));
        
        // FIX: Update parent component state when new idea is created
        // This transitions from "creating new" to "editing existing" state
        setSelectedIdeaId(newId);
        setIsCreatingNew(false);
        
        return newId; // Return the new ID so modal can update
      }
      // Don't automatically close modal - let user close it manually
      // This allows auto-save status to be visible
    } catch (err) {
      console.error('Error saving idea:', err);
      throw err; // Re-throw to let the modal handle error display
    }
  };

  const handleReorder = async (orderedIds: string[]) => {
    try {
      await dataService.reorderIdeas(orderedIds);
      // Update local state with new order
      const reorderedIdeas = { ...ideas };
      orderedIds.forEach((id, index) => {
        if (reorderedIdeas[id]) {
          reorderedIdeas[id].order = index + 1;
        }
      });
      setIdeas(reorderedIdeas);
    } catch (err) {
      console.error('Error reordering ideas:', err);
    }
  };

  const handleIdeaUpdate = async (ideaId: string, updates: Partial<Idea>) => {
    try {
      // Optimistically update local state for immediate UI feedback
      setIdeas(prev => {
        const existing = prev[ideaId];
        if (!existing) return prev;
        const merged: Idea = {
          ...existing,
          ...updates,
          dimensions: {
            ...existing.dimensions,
            ...(updates.dimensions || {}),
          },
        };
        return { ...prev, [ideaId]: merged };
      });

      await dataService.updateIdea(ideaId, updates);
      // No reload; keep optimistic state to avoid flicker and to work with mocked tests
    } catch (error) {
      console.error('Error updating idea:', error);
    }
  };

  const handleIdeaDelete = async (ideaId: string) => {
    try {
      await dataService.deleteIdea(ideaId);
      setIdeas(prev => {
        const newIdeas = { ...prev };
        delete newIdeas[ideaId];
        return newIdeas;
      });
    } catch (error) {
      console.error('Error deleting idea:', error);
      throw error; // Re-throw to let the modal handle the error display
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading ideas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
          <button
            onClick={loadIdeas}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">
              Idea Playground
            </h1>
            <button
              onClick={handleNewIdea}
              data-testid="new-idea-button"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              New Idea
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          searchTitle={searchTitle}
          onSearchTitleChange={setSearchTitle}
        />
        <div className="mt-8">
          <KanbanView
            ideas={filteredIdeas}
            onIdeaClick={handleIdeaClick}
            onReorder={handleReorder}
            onIdeaUpdate={handleIdeaUpdate}
          />
        </div>
      </main>

      {isModalOpen && (
        <IdeaModal
          ideaId={selectedIdeaId}
          isCreatingNew={isCreatingNew}
          onClose={handleModalClose}
          onSave={handleIdeaSave}
          onDelete={handleIdeaDelete}
        />
      )}
    </div>
  );
}

export default App; 