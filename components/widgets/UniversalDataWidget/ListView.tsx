/**
 * ListView Component for UniversalDataWidget
 *
 * Renders data as a vertical list of items.
 * Supports field styling, badges, dates, and click actions.
 */

import { DataItem, DisplayConfig } from '@/lib/widgets/universal-config';
import { evaluateCondition } from '@/lib/widgets/universal-transformer';

interface ListViewProps {
  data: DataItem[];
  config: DisplayConfig;
  selectedItem: DataItem | null;
  onItemClick?: (item: DataItem) => void;
}

export function ListView({ data, config, selectedItem, onItemClick }: ListViewProps) {
  const { fields, layout } = config;
  const emptyState = layout?.emptyState || 'No data available';

  // Check if item click is enabled
  const hasClickAction = config.actions?.some((a) => a.trigger === 'click');

  /**
   * Format field value based on type
   */
  const formatValue = (value: any, field: typeof fields[0]): React.ReactNode => {
    if (value == null) return '-';

    switch (field.type) {
      case 'date':
        if (field.format === 'relative-time') {
          return formatRelativeTime(value);
        }
        return new Date(value).toLocaleDateString();

      case 'badge':
        return (
          <span
            className={getBadgeStyle(value, field)}
          >
            {value}
          </span>
        );

      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;

      case 'text':
      default:
        return String(value);
    }
  };

  /**
   * Get badge styling based on conditions
   */
  const getBadgeStyle = (value: any, field: typeof fields[0]): string => {
    const baseStyle = 'text-xs px-2 py-0.5 rounded';

    // Check if any style conditions match
    if (field.style) {
      const item = { [field.key]: value }; // Create minimal item for condition eval
      for (const styleRule of field.style) {
        // Apply style if no condition (always apply) OR condition evaluates to true
        if (!styleRule.condition || evaluateCondition(styleRule.condition, item)) {
          return `${baseStyle} ${styleRule.className || ''}`;
        }
      }
    }

    // Default badge style
    return `${baseStyle} bg-gray-100 text-gray-800`;
  };

  /**
   * Format relative time (matching hardcoded widget behavior)
   */
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    return `${diffInDays} days ago`;
  };

  /**
   * Check if item is selected
   */
  const isSelected = (item: DataItem): boolean => {
    if (!selectedItem) return false;
    // Simple comparison - assumes items have unique 'id' field
    return item.id === selectedItem.id;
  };

  // Empty state
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        {emptyState}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto space-y-2">
      {data.map((item, index) => {
        const selected = isSelected(item);
        const clickable = hasClickAction && onItemClick;

        // Separate fields by type for smart layout
        const titleField = fields.find(f => f.key === 'title' || f.type === 'text' && !f.label);
        const badgeFields = fields.filter(f => f.type === 'badge');
        const metadataFields = fields.filter(
          f => f.type !== 'badge' && f.key !== 'title'
        );

        return (
          <div
            key={item.id || index}
            onClick={() => clickable && onItemClick(item)}
            className={`p-3 rounded-lg border transition-all ${
              selected
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border hover:border-primary/50 hover:bg-accent'
            } ${clickable ? 'cursor-pointer' : ''}`}
          >
            {/* Title + Primary Badge Row */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="font-medium text-sm line-clamp-1">
                {titleField ? item[titleField.key] : '-'}
              </span>
              {badgeFields.length > 0 && (
                <span className="shrink-0">
                  {formatValue(item[badgeFields[0].key], badgeFields[0])}
                </span>
              )}
            </div>

            {/* Metadata Row - compact horizontal layout */}
            {metadataFields.length > 0 && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {metadataFields.map((field, idx) => {
                  const value = item[field.key];
                  if (value == null) return null;

                  return (
                    <span key={field.key} className="flex items-center gap-3">
                      {formatValue(value, field)}
                      {idx < metadataFields.length - 1 && <span>•</span>}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Additional Badges Row (if more than one badge) */}
            {badgeFields.length > 1 && (
              <div className="flex items-center gap-2 mt-2 text-xs">
                {badgeFields.slice(1).map((field) => {
                  const value = item[field.key];
                  if (value == null) return null;

                  return (
                    <span key={field.key}>
                      {formatValue(value, field)}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
