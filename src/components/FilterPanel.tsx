import React, { useState, useEffect } from 'react';
import { DimensionFilters } from '../types';
import { dataService } from '../services/dataService';
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Listbox, Transition } from '@headlessui/react';
import clsx from 'clsx';

interface FilterPanelProps {
  filters: DimensionFilters;
  onFiltersChange: (filters: DimensionFilters) => void;
  searchTitle: string;
  onSearchTitleChange: (value: string) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ filters, onFiltersChange, searchTitle, onSearchTitleChange }) => {
  const [fieldValues, setFieldValues] = useState<string[]>([]);
  const [readinessScale, setReadinessScale] = useState<Record<string, string>>({});

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const dimensionsData = await dataService.getDimensions();
      
      // Extract field values from the new structure
      const fieldDimension = dimensionsData.dimensions_registry.core_dimensions.field;
      if (fieldDimension?.values && Array.isArray(fieldDimension.values)) {
        setFieldValues(fieldDimension.values);
      }
      
      // Extract readiness scale from the new structure
      const readinessDimension = dimensionsData.dimensions_registry.core_dimensions.readiness;
      if (readinessDimension?.scale) {
        setReadinessScale(readinessDimension.scale);
      } else {
        // Fallback to old structure if available
        const readinessLevels = dimensionsData.dimensions_registry.core_dimensions.readiness_scale?.levels || 10;
        const readinessLabels = dimensionsData.dimensions_registry.core_dimensions.readiness_scale?.labels || [];
        
        const readinessScaleMap: Record<string, string> = {};
        for (let i = 1; i <= readinessLevels; i++) {
          const labelIndex = Math.min(i - 1, readinessLabels.length - 1);
          const label = readinessLabels[labelIndex] || 'level';
          readinessScaleMap[`${i}-${i}`] = label;
        }
        setReadinessScale(readinessScaleMap);
      }
    } catch (err) {
      console.error('Error loading filter options:', err);
    }
  };

  const handleFieldChange = (field: string | null) => {
    onFiltersChange({
      ...filters,
      field: field || undefined,
    });
  };

  const handleReadinessChange = (readiness: number | null) => {
    onFiltersChange({
      ...filters,
      readiness: readiness || undefined,
    });
  };

  const handleComplexityChange = (complexity: number | null) => {
    onFiltersChange({
      ...filters,
      complexity: complexity || undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).some(key => filters[key as keyof DimensionFilters] !== undefined);

  const getReadinessLabel = (value: number): string => {
    const rangeKey = Object.keys(readinessScale).find(key => {
      const [min, max] = key.split('-').map(Number);
      return value >= min && value <= max;
    });
    return rangeKey ? `${value} - ${readinessScale[rangeKey]}` : `${value}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
          >
            <XMarkIcon className="h-4 w-4 mr-1" />
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        {/* Field Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Field
          </label>
          <Listbox value={filters.field || null} onChange={handleFieldChange}>
            <div className="relative">
              <Listbox.Button
                data-testid="filter-field"
                className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <span className="block truncate">
                  {filters.field || 'All fields'}
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                </span>
              </Listbox.Button>
              <Transition
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                  <Listbox.Option
                    value={null}
                    className={({ active }) =>
                      clsx(
                        'cursor-default select-none relative py-2 pl-3 pr-9',
                        active ? 'text-white bg-blue-600' : 'text-gray-900'
                      )
                    }
                  >
                    All fields
                  </Listbox.Option>
                  {fieldValues.map((field) => (
                    <Listbox.Option
                      key={field}
                      value={field}
                      data-testid={`filter-option-${field}`}
                      className={({ active }) =>
                        clsx(
                          'cursor-default select-none relative py-2 pl-3 pr-9',
                          active ? 'text-white bg-blue-600' : 'text-gray-900'
                        )
                      }
                    >
                      {field}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>
        </div>

        {/* Readiness Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Readiness
          </label>
          <Listbox value={filters.readiness || null} onChange={handleReadinessChange}>
            <div className="relative">
              <Listbox.Button className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <span className="block truncate">
                  {filters.readiness ? getReadinessLabel(filters.readiness) : 'All levels'}
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                </span>
              </Listbox.Button>
              <Transition
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                  <Listbox.Option
                    value={null}
                    className={({ active }) =>
                      clsx(
                        'cursor-default select-none relative py-2 pl-3 pr-9',
                        active ? 'text-white bg-blue-600' : 'text-gray-900'
                      )
                    }
                  >
                    All levels
                  </Listbox.Option>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
                    <Listbox.Option
                      key={level}
                      value={level}
                      className={({ active }) =>
                        clsx(
                          'cursor-default select-none relative py-2 pl-3 pr-9',
                          active ? 'text-white bg-blue-600' : 'text-gray-900'
                        )
                      }
                    >
                      {getReadinessLabel(level)}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>
        </div>

        {/* Complexity Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Complexity
          </label>
          <Listbox value={filters.complexity || null} onChange={handleComplexityChange}>
            <div className="relative">
              <Listbox.Button className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <span className="block truncate">
                  {filters.complexity ? `Level ${filters.complexity}` : 'All levels'}
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                </span>
              </Listbox.Button>
              <Transition
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                  <Listbox.Option
                    value={null}
                    className={({ active }) =>
                      clsx(
                        'cursor-default select-none relative py-2 pl-3 pr-9',
                        active ? 'text-white bg-blue-600' : 'text-gray-900'
                      )
                    }
                  >
                    All levels
                  </Listbox.Option>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
                    <Listbox.Option
                      key={level}
                      value={level}
                      className={({ active }) =>
                        clsx(
                          'cursor-default select-none relative py-2 pl-3 pr-9',
                          active ? 'text-white bg-blue-600' : 'text-gray-900'
                        )
                      }
                    >
                      Level {level}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>
        </div>

        {/* Title Search Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Title
          </label>
          <input
            type="text"
            value={searchTitle}
            onChange={e => onSearchTitleChange(e.target.value)}
            placeholder="Search by title..."
            data-testid="search-title-input"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
}; 