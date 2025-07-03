export interface Idea {
  title: string;
  content: string;
  dimensions: Dimensions;
  sub_ideas: string[];
  order: number;
}

export interface Dimensions {
  field: string;
  readiness: number;
  complexity: number;
  potentially_connected_idea: ConnectedIdea | null;
}

export interface ConnectedIdea {
  idea: string;
  relation_strength: number;
}

export interface IdeasData {
  ideas: Record<string, Idea>;
  metadata: {
    source_documents: string[];
    extraction_date: string;
    total_ideas: number;
    hierarchy_preserved: boolean;
  };
}

export interface DimensionDefinition {
  description: string;
  values?: string[];
  scale?: Record<string, string>;
  structure?: string;
  strength_guide?: Record<string, string>;
}

export interface DimensionsRegistry {
  dimensions_registry: {
    core_dimensions: {
      max_dimensions: number;
      [key: string]: DimensionDefinition | number;
    };
  };
}

export interface DimensionFilters {
  field?: string;
  readiness?: number;
  complexity?: number;
} 