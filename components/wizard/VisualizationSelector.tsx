'use client';

/**
 * Visualization Type Selector
 *
 * Stage 3 of the problem-first widget wizard.
 * Allows users to choose how to display their data with visual cards
 * showing examples of each visualization type.
 *
 * Features:
 * - 5 visualization types (list, table, cards, metric, chart)
 * - Visual preview thumbnails
 * - AI recommendation badge
 * - Click to select/override
 * - Clear selected state
 */

import { cn } from '@/lib/utils';
import {
  ListIcon,
  TableIcon,
  LayoutGridIcon,
  GaugeIcon,
  LineChartIcon,
  CheckCircle2Icon,
  SparklesIcon,
} from 'lucide-react';

/**
 * Visualization type options
 * Maps to LayoutType from schema.ts
 */
export type VisualizationType = 'list' | 'table' | 'cards' | 'metric' | 'chart';

/**
 * Visualization type definition
 */
interface VisualizationTypeDefinition {
  type: VisualizationType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  useCase: string;
  examples: string[];
}

/**
 * All visualization types with metadata
 */
const visualizationTypes: VisualizationTypeDefinition[] = [
  {
    type: 'list',
    name: 'List',
    description: 'Sequential items with title, subtitle, and metadata',
    icon: ListIcon,
    useCase: 'Best for: Notifications, activity feeds, sequential data',
    examples: ['GitHub PRs', 'Slack messages', 'Task lists'],
  },
  {
    type: 'table',
    name: 'Table',
    description: 'Structured data with sortable columns',
    icon: TableIcon,
    useCase: 'Best for: Datasets with multiple attributes to compare',
    examples: ['Jira tickets', 'Spreadsheet data', 'User lists'],
  },
  {
    type: 'cards',
    name: 'Cards',
    description: 'Rich content items with images and actions',
    icon: LayoutGridIcon,
    useCase: 'Best for: Visual content with multiple properties',
    examples: ['Linear issues', 'User profiles', 'Product catalog'],
  },
  {
    type: 'metric',
    name: 'Metric',
    description: 'Single KPI value with optional comparison',
    icon: GaugeIcon,
    useCase: 'Best for: Key performance indicators and counts',
    examples: ['Slack mentions', 'Deploy count', 'Response time'],
  },
  {
    type: 'chart',
    name: 'Chart',
    description: 'Time-series data visualized as graphs',
    icon: LineChartIcon,
    useCase: 'Best for: Trends and patterns over time',
    examples: ['Calendar events', 'Analytics', 'Performance metrics'],
  },
];

/**
 * Props for VisualizationSelector
 */
export interface VisualizationSelectorProps {
  /** AI-recommended type (shown with badge) */
  recommendedType: VisualizationType | null;
  /** Currently selected type */
  selectedType: VisualizationType | null;
  /** Callback when user selects a type */
  onSelect: (type: VisualizationType) => void;
}

/**
 * Visualization Type Selector Component
 *
 * Displays 5 visualization types with visual cards.
 * Highlights AI recommendation and allows user override.
 */
export function VisualizationSelector({
  recommendedType,
  selectedType,
  onSelect,
}: VisualizationSelectorProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          How should I display your data?
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose a visualization type or use the AI recommendation
        </p>
      </div>

      {/* Visualization Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {visualizationTypes.map((viz) => {
          const isRecommended = viz.type === recommendedType;
          const isSelected = viz.type === selectedType;

          return (
            <VisualizationCard
              key={viz.type}
              visualization={viz}
              isRecommended={isRecommended}
              isSelected={isSelected}
              onSelect={() => onSelect(viz.type)}
            />
          );
        })}
      </div>

      {/* Help Text */}
      {recommendedType && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-primary/5 border border-primary/20 rounded-md p-3">
          <SparklesIcon className="w-4 h-4 text-primary" />
          <span>
            AI recommends <strong>{visualizationTypes.find(v => v.type === recommendedType)?.name}</strong> based on your problem description
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Individual Visualization Card
 */
interface VisualizationCardProps {
  visualization: VisualizationTypeDefinition;
  isRecommended: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

function VisualizationCard({
  visualization,
  isRecommended,
  isSelected,
  onSelect,
}: VisualizationCardProps) {
  const Icon = visualization.icon;

  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative group w-full text-left rounded-lg border-2 p-3 md:p-4 transition-all duration-200 cursor-pointer',
        'hover:shadow-md hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        isSelected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-border bg-background hover:border-primary/50'
      )}
    >
      {/* Recommended Badge */}
      {isRecommended && (
        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] md:text-xs font-medium px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
          <SparklesIcon className="w-3 h-3" />
          <span className="whitespace-nowrap">Recommended</span>
        </div>
      )}

      {/* Selected Checkmark */}
      {isSelected && (
        <div className="absolute top-3 right-3">
          <CheckCircle2Icon className="w-5 h-5 text-primary" />
        </div>
      )}

      {/* Card Content */}
      <div className="space-y-3">
        {/* Icon & Name */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-8 h-8 md:w-10 md:h-10 rounded-md flex items-center justify-center transition-colors',
              isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-primary/10'
            )}
          >
            <Icon className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <h4 className="text-sm md:text-base font-semibold text-foreground">
            {visualization.name}
          </h4>
        </div>

        {/* Description */}
        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed line-clamp-2 md:line-clamp-3">
          {visualization.description}
        </p>

        {/* Visual Thumbnail */}
        <VisualizationThumbnail type={visualization.type} />

        {/* Use Case */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground font-medium">
            {visualization.useCase}
          </p>
        </div>

        {/* Examples */}
        <div className="flex flex-wrap gap-1">
          {visualization.examples.map((example) => (
            <span
              key={example}
              className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded"
            >
              {example}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

/**
 * Visual Thumbnail Preview
 *
 * Shows a simple SVG preview of what each visualization type looks like
 */
interface VisualizationThumbnailProps {
  type: VisualizationType;
}

function VisualizationThumbnail({ type }: VisualizationThumbnailProps) {
  return (
    <div className="bg-muted/50 rounded-md p-2 md:p-3 h-20 md:h-24 flex items-center justify-center">
      {type === 'list' && <ListThumbnail />}
      {type === 'table' && <TableThumbnail />}
      {type === 'cards' && <CardsThumbnail />}
      {type === 'metric' && <MetricThumbnail />}
      {type === 'chart' && <ChartThumbnail />}
    </div>
  );
}

/**
 * List Thumbnail - Shows stacked items
 */
function ListThumbnail() {
  return (
    <svg width="120" height="60" viewBox="0 0 120 60" className="text-muted-foreground/40">
      {/* Item 1 */}
      <rect x="4" y="4" width="112" height="14" rx="2" fill="currentColor" />
      {/* Item 2 */}
      <rect x="4" y="22" width="112" height="14" rx="2" fill="currentColor" />
      {/* Item 3 */}
      <rect x="4" y="40" width="112" height="14" rx="2" fill="currentColor" />
    </svg>
  );
}

/**
 * Table Thumbnail - Shows grid layout
 */
function TableThumbnail() {
  return (
    <svg width="120" height="60" viewBox="0 0 120 60" className="text-muted-foreground/40">
      {/* Header */}
      <rect x="4" y="4" width="34" height="10" rx="1" fill="currentColor" />
      <rect x="42" y="4" width="34" height="10" rx="1" fill="currentColor" />
      <rect x="80" y="4" width="36" height="10" rx="1" fill="currentColor" />
      {/* Row 1 */}
      <rect x="4" y="18" width="34" height="8" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="42" y="18" width="34" height="8" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="80" y="18" width="36" height="8" rx="1" fill="currentColor" opacity="0.6" />
      {/* Row 2 */}
      <rect x="4" y="30" width="34" height="8" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="42" y="30" width="34" height="8" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="80" y="30" width="36" height="8" rx="1" fill="currentColor" opacity="0.6" />
      {/* Row 3 */}
      <rect x="4" y="42" width="34" height="8" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="42" y="42" width="34" height="8" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="80" y="42" width="36" height="8" rx="1" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

/**
 * Cards Thumbnail - Shows card grid
 */
function CardsThumbnail() {
  return (
    <svg width="120" height="60" viewBox="0 0 120 60" className="text-muted-foreground/40">
      {/* Card 1 */}
      <rect x="4" y="4" width="34" height="52" rx="2" fill="currentColor" />
      {/* Card 2 */}
      <rect x="42" y="4" width="34" height="52" rx="2" fill="currentColor" />
      {/* Card 3 */}
      <rect x="80" y="4" width="36" height="52" rx="2" fill="currentColor" />
    </svg>
  );
}

/**
 * Metric Thumbnail - Shows large number
 */
function MetricThumbnail() {
  return (
    <svg width="120" height="60" viewBox="0 0 120 60" className="text-muted-foreground/40">
      {/* Large number */}
      <rect x="30" y="10" width="60" height="30" rx="2" fill="currentColor" />
      {/* Label */}
      <rect x="40" y="45" width="40" height="6" rx="1" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

/**
 * Chart Thumbnail - Shows line graph
 */
function ChartThumbnail() {
  return (
    <svg width="120" height="60" viewBox="0 0 120 60" className="text-muted-foreground/40">
      {/* Axes */}
      <line x1="10" y1="50" x2="110" y2="50" stroke="currentColor" strokeWidth="1" />
      <line x1="10" y1="10" x2="10" y2="50" stroke="currentColor" strokeWidth="1" />
      {/* Line graph */}
      <polyline
        points="10,40 30,30 50,35 70,20 90,25 110,15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.8"
      />
    </svg>
  );
}
