import { Idea } from '../../src/types';

export const mockIdeas: Record<string, Idea> = {
  'human_ai_content_authentication': {
    title: 'Human-AI Content Authentication & Network Effects',
    content: '# Human-AI Content Authentication & Network Effects\n\n## Core Paper: "Statistical Human Verification Networks"\n\n### The Solution\n**One person, one account through statistical sampling**: Just as small random samples can represent large populations, a few random human verifications make maintaining fake accounts impractical.',
    dimensions: {
      field: 'Network Security',
      readiness: 6,
      complexity: 8,
      potentially_connected_idea: {
        idea: 'multi_dimensional_ui_system',
        relation_strength: 0.8
      },
    },
    sub_ideas: [],
    order: 1,
  },
  'generic_model_library': {
    title: 'Generic Model Library',
    content: '# Generic Model Library\n\n## Core Concept\nLibrary that implements a generic model with:\n1. Input API - pull\n2. Output API - push\n3. Scoring function',
    dimensions: {
      field: 'Software Architecture',
      readiness: 6,
      complexity: 5,
      potentially_connected_idea: {
        idea: 'human_ai_content_authentication',
        relation_strength: 0.4
      },
    },
    sub_ideas: [],
    order: 2,
  },
  'multi_dimensional_ui_system': {
    title: 'Updated Test Title',
    content: '# Multi-Dimensional UI System (Idea UI)\n\n## Core Concept\nA UI system to hold and display ideas in a structure like this document.\nEach edge has a dimension array with a short whitelist of keys.\nThen N UIs, each with a different display based on different dimension function.',
    dimensions: {
      field: 'UI/UX Engineering',
      readiness: 1,
      complexity: 7,
      potentially_connected_idea: {
        idea: 'human_ai_content_authentication',
        relation_strength: 0.8
      },
    },
    sub_ideas: [],
    order: 0,
  },
  'educational_app_spaced_learning': {
    title: 'Educational App with Spaced Learning (ושיננתם)',
    content: '# Educational App with Spaced Learning (ושיננתם)\n\n## Core Concept\nEducational app for learning texts by heart (ושיננתם - "and you shall teach them diligently").\nThe chunk size of text the app teaches is variable and adjusts to adapt to the student.\nUses spaced repetition principles.',
    dimensions: {
      field: 'EdTech',
      readiness: 4,
      complexity: 5,
      potentially_connected_idea: null,
    },
    sub_ideas: [],
    order: 5,
  },
  'playwright_repository_split': {
    title: 'Playwright Repository Split',
    content: '# Playwright Repository Split\n\n## Core Concept\nSplit the playwright roll into a new repo.',
    dimensions: {
      field: 'DevOps',
      readiness: 8,
      complexity: 2,
      potentially_connected_idea: null,
    },
    sub_ideas: [],
    order: 6,
  },
};

export const mockDimensions = {
  dimensions_registry: {
    core_dimensions: {
      max_dimensions: 4,
      field: {
        description: "Domain of knowledge/application",
        values: [
          "AI Infrastructure",
          "DevOps",
          "EdTech", 
          "Legal/Policy",
          "Network Security",
          "Philosophy",
          "QA/Testing",
          "Software Architecture",
          "UI/UX Engineering"
        ]
      },
      readiness: {
        description: "How close to implementation (1-10)",
        scale: {
          "1-2": "Research question only",
          "3-4": "Concept defined, needs development",
          "5-6": "Design complete, implementation started",
          "7-8": "Working prototype/draft",
          "9-10": "Ready to deploy/publish"
        }
      },
      complexity: {
        description: "Technical/conceptual difficulty (1-10)",
        scale: {
          "1-2": "Trivial implementation",
          "3-4": "Standard patterns apply",
          "5-6": "Some novel challenges",
          "7-8": "Significant technical/conceptual challenges",
          "9-10": "Fundamental/unsolved problems"
        }
      }
    }
  }
}; 