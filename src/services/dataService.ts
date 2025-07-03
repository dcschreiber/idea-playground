import { Idea, IdeasData, DimensionsRegistry, DimensionFilters } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

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
      const response = await fetch(`${API_BASE_URL}/ideas`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: IdeasData = await response.json();
      this.cache.ideas = data.ideas;
      return data.ideas;
    } catch (error) {
      console.error('Error fetching ideas:', error);
      // Fallback to cached data if available
      if (this.cache.ideas) {
        return this.cache.ideas;
      }
      throw error;
    }
  }

  async getDimensions(): Promise<DimensionsRegistry> {
    try {
      const response = await fetch(`${API_BASE_URL}/dimensions`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: DimensionsRegistry = await response.json();
      this.cache.dimensions = data;
      return data;
    } catch (error) {
      console.error('Error fetching dimensions:', error);
      // Fallback to cached data if available
      if (this.cache.dimensions) {
        return this.cache.dimensions;
      }
      throw error;
    }
  }

  async saveIdea(id: string, idea: Idea): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/ideas/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(idea),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update cache
      if (this.cache.ideas) {
        this.cache.ideas[id] = idea;
      }
    } catch (error) {
      console.error('Error saving idea:', error);
      throw error;
    }
  }

  async updateIdea(id: string, updates: Partial<Idea>): Promise<void> {
    try {
      // Get current idea data and merge with updates
      if (!this.cache.ideas || !this.cache.ideas[id]) {
        await this.getIdeas(); // Refresh cache
      }
      
      const currentIdea = this.cache.ideas![id];
      if (!currentIdea) {
        throw new Error(`Idea ${id} not found`);
      }
      
      const updatedIdea = { ...currentIdea, ...updates };
      
      const response = await fetch(`${API_BASE_URL}/ideas/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedIdea),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update cache
      if (this.cache.ideas) {
        this.cache.ideas[id] = updatedIdea;
      }
    } catch (error) {
      console.error('Error updating idea:', error);
      throw error;
    }
  }

  async createIdea(idea: Idea): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/ideas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(idea),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const newId = result.id;

      // Update cache
      if (this.cache.ideas) {
        this.cache.ideas[newId] = idea;
      }

      return newId;
    } catch (error) {
      console.error('Error creating idea:', error);
      throw error;
    }
  }

  async deleteIdea(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/ideas/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update cache
      if (this.cache.ideas) {
        delete this.cache.ideas[id];
      }
    } catch (error) {
      console.error('Error deleting idea:', error);
      throw error;
    }
  }

  async reorderIdeas(orderedIds: string[]): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/ideas/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderedIds }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update cache order
      if (this.cache.ideas) {
        orderedIds.forEach((id, index) => {
          if (this.cache.ideas![id]) {
            this.cache.ideas![id].order = index + 1;
          }
        });
      }
    } catch (error) {
      console.error('Error reordering ideas:', error);
      throw error;
    }
  }

  async filterIdeas(filters: DimensionFilters): Promise<Record<string, Idea>> {
    try {
      // Get fresh data for filtering
      const ideas = await this.getIdeas();
      
      const filteredIdeas: Record<string, Idea> = {};
      
      Object.entries(ideas).forEach(([id, idea]) => {
        let matches = true;
        
        if (filters.field && idea.dimensions.field !== filters.field) {
          matches = false;
        }
        
        if (filters.readiness && idea.dimensions.readiness !== filters.readiness) {
          matches = false;
        }
        
        if (filters.complexity && idea.dimensions.complexity !== filters.complexity) {
          matches = false;
        }
        
        if (matches) {
          filteredIdeas[id] = idea;
        }
      });
      
      return filteredIdeas;
    } catch (error) {
      console.error('Error filtering ideas:', error);
      throw error;
    }
  }

  // Health check for backend
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }

  // Clear cache (useful for testing)
  clearCache(): void {
    this.cache.ideas = null;
    this.cache.dimensions = null;
  }
}

export const dataService = new DataService(); 