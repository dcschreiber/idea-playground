import { Idea, IdeasData, DimensionsRegistry, DimensionFilters } from '../types';

// API Base URL - switches between local backend and production Cloud Run
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://idea-playground-backend-1038191785150.us-central1.run.app'
  : 'http://localhost:8080';

class DataService {
  private cache: {
    ideas: Record<string, Idea> | null;
    dimensions: DimensionsRegistry | null;
  } = {
    ideas: null,
    dimensions: null,
  };

  async getIdeas(): Promise<Record<string, Idea>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ideas`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: IdeasData = await response.json();
      this.cache.ideas = data.ideas;
      return data.ideas;
    } catch (error) {
      console.error('Error fetching ideas:', error);
      throw error;
    }
  }

  async getDimensions(): Promise<DimensionsRegistry> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dimensions`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: DimensionsRegistry = await response.json();
      this.cache.dimensions = data;
      return data;
    } catch (error) {
      console.error('Error fetching dimensions:', error);
      throw error;
    }
  }

  async createIdea(idea: Idea): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ideas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(idea),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create idea');
      }
      
      const result = await response.json();
      return result.id;
    } catch (error) {
      console.error('Error creating idea:', error);
      throw error;
    }
  }

  async saveIdea(ideaId: string, idea: Idea): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ideas/${ideaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(idea),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update idea');
      }
    } catch (error) {
      console.error('Error saving idea:', error);
      throw error;
    }
  }

  async updateIdea(ideaId: string, updates: Partial<Idea>): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ideas/${ideaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update idea');
      }
    } catch (error) {
      console.error('Error updating idea:', error);
      throw error;
    }
  }

  async deleteIdea(ideaId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ideas/${ideaId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete idea');
      }
    } catch (error) {
      console.error('Error deleting idea:', error);
      throw error;
    }
  }

  async reorderIdeas(reorderedIds: string[]): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ideas/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reorderedIds }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reorder ideas');
      }
    } catch (error) {
      console.error('Error reordering ideas:', error);
      throw error;
    }
  }

  async validateTitle(title: string, excludeId?: string): Promise<{ isUnique: boolean; conflictingId?: string; conflictingTitle?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ideas/validate-title`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, excludeId }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return { isUnique: result.isValid };
    } catch (error) {
      console.error('Error validating title:', error);
      throw error;
    }
  }

  async filterIdeas(filters: DimensionFilters): Promise<Record<string, Idea>> {
    try {
      // Get fresh data for filtering
      const ideas = await this.getIdeas();
      return this.applyFilters(ideas, filters);
    } catch (error) {
      console.error('Error filtering ideas:', error);
      throw error;
    }
  }

  // Clear cache to force refresh
  clearCache(): void {
    this.cache.ideas = null;
    this.cache.dimensions = null;
  }

  // Apply filters to ideas
  private applyFilters(ideas: Record<string, Idea>, filters: DimensionFilters): Record<string, Idea> {
    const filtered: Record<string, Idea> = {};
    
    for (const [id, idea] of Object.entries(ideas)) {
      let include = true;
      
      if (filters.field && idea.dimensions.field !== filters.field) {
        include = false;
      }
      
      if (filters.readiness && idea.dimensions.readiness !== filters.readiness) {
        include = false;
      }
      
      if (filters.complexity && idea.dimensions.complexity !== filters.complexity) {
        include = false;
      }
      
      if (include) {
        filtered[id] = idea;
      }
    }
    
    return filtered;
  }
}

export const dataService = new DataService(); 