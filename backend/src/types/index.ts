export interface Idea {
  title: string;
  content: string;
  content_json?: any; // TipTap/ProseMirror JSON document (new)
  dimensions: {
    field: string;
    readiness: number;
    complexity: number;
    potentially_connected_idea: {
      idea: string;
      relation_strength: number;
    } | null;
  };
  sub_ideas: string[];
  order: number;
  createdAt?: string | Date | any;
  updatedAt?: string | Date | any;
}

export interface DimensionsRegistry {
  dimensions_registry: {
    core_dimensions: {
      max_dimensions: number;
      fields: string[];
    };
    readiness_scale: {
      levels: number;
      labels: string[];
    };
    complexity_scale: {
      levels: number;
      labels: string[];
    };
  };
}

export interface IdeasResponse {
  ideas: Record<string, Idea>;
}

export interface CreateIdeaResponse {
  id: string;
  idea: Idea;
}

export interface ValidationResponse {
  isValid: boolean;
  conflictingId?: string;
  conflictingTitle?: string;
}

export interface ReorderRequest {
  reorderedIds: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    statusCode: number;
  };
} 