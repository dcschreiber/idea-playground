import { Idea } from '../../src/types';

export const mockIdeas: Record<string, Idea> = {
  'idea-1': {
    title: 'Test Idea 1',
    content: '# Test Content 1\n\nThis is test content for idea 1.',
    dimensions: {
      field: 'AI Infrastructure',
      readiness: 2,
      complexity: 5,
      potentially_connected_idea: null,
    },
    sub_ideas: [],
    order: 1,
  },
  'idea-2': {
    title: 'Test Idea 2', 
    content: '# Test Content 2\n\nThis is test content for idea 2.',
    dimensions: {
      field: 'Network Security',
      readiness: 4,
      complexity: 7,
      potentially_connected_idea: null,
    },
    sub_ideas: [],
    order: 2,
  },
  'idea-3': {
    title: 'Test Idea 3',
    content: '# Test Content 3\n\nThis is test content for idea 3.',
    dimensions: {
      field: 'Network Security',
      readiness: 6,
      complexity: 3,
      potentially_connected_idea: null,
    },
    sub_ideas: [],
    order: 3,
  },
  'idea-4': {
    title: 'Test Idea 4',
    content: '# Test Content 4\n\nThis is test content for idea 4.',
    dimensions: {
      field: 'DevOps',
      readiness: 8,
      complexity: 4,
      potentially_connected_idea: null,
    },
    sub_ideas: [],
    order: 4,
  },
  'idea-5': {
    title: 'Test Idea 5',
    content: '# Test Content 5\n\nThis is test content for idea 5.',
    dimensions: {
      field: 'EdTech',
      readiness: 9,
      complexity: 6,
      potentially_connected_idea: null,
    },
    sub_ideas: [],
    order: 5,
  },
};

export const mockDimensions = {
  dimensions_registry: {
    core_dimensions: {
      field: {
        description: "The primary field or domain where this idea applies",
        values: [
          "AI Infrastructure",
          "Network Security", 
          "DevOps",
          "EdTech",
          "Philosophy"
        ]
      },
      readiness: {
        description: "How ready this idea is for implementation",
        scale: {
          "1": "Initial concept, needs research",
          "2": "Research phase",
          "3": "Concept defined",
          "4": "Development needed",
          "5": "Design complete",
          "6": "Implementation started",
          "7": "Working prototype",
          "8": "Testing phase", 
          "9": "Ready to deploy",
          "10": "Deployed/Published"
        }
      },
      complexity: {
        description: "The complexity level of implementing this idea",
        scale: {
          "1": "Trivial",
          "5": "Moderate",
          "10": "Fundamental"
        }
      }
    }
  }
}; 