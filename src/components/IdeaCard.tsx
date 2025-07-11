import React from 'react';
import { Idea } from '../types';
import { 
  TagIcon, 
  SignalIcon, 
  AdjustmentsHorizontalIcon,
  LinkIcon 
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface IdeaCardProps {
  id: string;
  idea: Idea;
  onClick: (id: string) => void;
  className?: string;
  isDragging?: boolean;
}

export const IdeaCard: React.FC<IdeaCardProps> = ({ 
  id, 
  idea, 
  onClick, 
  className,
  isDragging = false 
}) => {
  const getComplexityColor = (complexity: number): string => {
    if (complexity <= 3) return 'bg-green-100 text-green-800';
    if (complexity <= 6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getReadinessColor = (readiness: number): string => {
    if (readiness <= 2) return 'bg-gray-100 text-gray-800';
    if (readiness <= 4) return 'bg-blue-100 text-blue-800';
    if (readiness <= 6) return 'bg-purple-100 text-purple-800';
    if (readiness <= 8) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  const truncateContent = (content: string, maxLength: number = 150): string => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  };

  // Extract the first line or paragraph for preview
  const getContentPreview = (content: string): string => {
    // Remove markdown headers and get first meaningful content
    const cleaned = content
      .replace(/^#{1,6}\s+.*$/gm, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
      .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
      .replace(/^\s*[-*+]\s+/gm, '• ') // Convert list items to bullets
      .trim();
    
    const firstParagraph = cleaned.split('\n\n')[0] || cleaned.split('\n')[0] || '';
    return truncateContent(firstParagraph);
  };

  const handleClick = (e: React.MouseEvent) => {
    console.log('IdeaCard clicked:', id);
    e.stopPropagation();
    e.preventDefault();
    onClick(id);
    console.log('onClick called for:', id);
  };

  return (
    <div
      onClick={handleClick}
      data-testid="idea-card"
      className={clsx(
        'bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-gray-300',
        isDragging && 'opacity-50 rotate-1 scale-105',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1 mr-4">
          {idea.title}
        </h3>
        {idea.dimensions.potentially_connected_idea && (
          <LinkIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
        )}
      </div>

      {/* Content Preview */}
      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
        {getContentPreview(idea.content)}
      </p>

      {/* Dimensions */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Field */}
        {idea.dimensions.field && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <TagIcon className="h-3 w-3 mr-1" />
            {idea.dimensions.field}
          </span>
        )}

        {/* Readiness */}
        <span className={clsx(
          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
          getReadinessColor(idea.dimensions.readiness)
        )}>
          <SignalIcon className="h-3 w-3 mr-1" />
          Ready: {idea.dimensions.readiness}
        </span>

        {/* Complexity */}
        <span className={clsx(
          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
          getComplexityColor(idea.dimensions.complexity)
        )}>
          <AdjustmentsHorizontalIcon className="h-3 w-3 mr-1" />
          Complex: {idea.dimensions.complexity}
        </span>
      </div>

      {/* Connection indicator */}
      {idea.dimensions.potentially_connected_idea && (
        <div className="text-xs text-gray-500 flex items-center">
          <LinkIcon className="h-3 w-3 mr-1" />
          Connected to: {idea.dimensions.potentially_connected_idea.idea.replace(/_/g, ' ')}
          <span className="ml-2 font-medium">
            ({Math.round(idea.dimensions.potentially_connected_idea.relation_strength * 100)}% strength)
          </span>
        </div>
      )}
    </div>
  );
}; 