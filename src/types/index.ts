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
  metadata?: {
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

export interface ScaleDimension {
  levels: number;
  labels: string[];
}

export interface DimensionsRegistry {
  dimensions_registry: {
    core_dimensions: {
      max_dimensions: number;
      field: DimensionDefinition;
      readiness: DimensionDefinition;
      complexity: DimensionDefinition;
      potentially_connected_idea: DimensionDefinition;
      // Keep the old structure for backward compatibility
      fields?: string[];
      readiness_scale?: ScaleDimension;
      complexity_scale?: ScaleDimension;
      [key: string]: DimensionDefinition | number | string[] | ScaleDimension | undefined;
    };
  };
}

export interface DimensionFilters {
  field?: string;
  readiness?: number;
  complexity?: number;
} 