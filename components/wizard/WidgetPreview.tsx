'use client';

/**
 * Stage 4: Widget Preview Panel
 *
 * Two-panel layout showing:
 * - LEFT: Generated JSON schema (editable)
 * - RIGHT: Live widget preview
 *
 * Users can edit schema and see changes reflected in real-time.
 * Final CTA: "Deploy to Dashboard"
 */

import { useState } from 'react';
import { UniversalDataWidget } from '@/components/UniversalDataWidget';
import type { UniversalWidgetDefinition } from '@/lib/universal-widget/schema';
import { validateWidgetDefinition } from '@/lib/universal-widget/schema';
import { cn } from '@/lib/utils';

export interface WidgetPreviewProps {
  /** Widget schema to preview */
  schema: UniversalWidgetDefinition;

  /** Called when schema is edited */
  onSchemaChange: (schema: UniversalWidgetDefinition) => void;

  /** Called when user clicks "Back" */
  onBack: () => void;

  /** Called when user clicks "Deploy to Dashboard" */
  onDeploy: () => void;

  /** Loading state during deployment */
  isDeploying: boolean;
}

export function WidgetPreview({
  schema,
  onSchemaChange,
  onBack,
  onDeploy,
  isDeploying,
}: WidgetPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedJson, setEditedJson] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  /**
   * Open schema editor modal
   */
  const handleEditClick = () => {
    setEditedJson(JSON.stringify(schema, null, 2));
    setValidationError(null);
    setIsEditing(true);
  };

  /**
   * Apply edited schema
   */
  const handleApplyChanges = () => {
    try {
      // Parse JSON
      const parsed = JSON.parse(editedJson);

      // Validate schema
      const validation = validateWidgetDefinition(parsed);

      if (!validation.valid) {
        setValidationError(validation.errors.join('\n'));
        return;
      }

      // Apply changes
      onSchemaChange(parsed);
      setIsEditing(false);
      setValidationError(null);
    } catch (error) {
      if (error instanceof SyntaxError) {
        setValidationError(`Invalid JSON: ${error.message}`);
      } else {
        setValidationError('Failed to parse schema');
      }
    }
  };

  /**
   * Cancel editing
   */
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedJson('');
    setValidationError(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="pb-4 border-b mb-4">
        <h2 className="text-lg lg:text-xl font-bold mb-1">Preview Your Widget</h2>
        <p className="text-xs lg:text-sm text-muted-foreground">
          Review the generated schema and see a live preview. Edit if needed.
        </p>
      </div>

      {/* Two-panel layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 overflow-hidden">
        {/* LEFT PANEL: Schema */}
        <div className="flex flex-col border rounded-lg overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between p-3 border-b bg-muted/30">
            <h3 className="text-xs lg:text-sm font-semibold">Widget Schema</h3>
            <button
              onClick={handleEditClick}
              className="px-3 py-2 min-h-[44px] text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Edit Schema
            </button>
          </div>

          {/* Schema display (syntax highlighted) */}
          <div className="flex-1 overflow-auto p-4 bg-muted/10">
            <pre className="text-xs font-mono">
              <code>{JSON.stringify(schema, null, 2)}</code>
            </pre>
          </div>
        </div>

        {/* RIGHT PANEL: Live Preview */}
        <div className="flex flex-col border rounded-lg overflow-hidden">
          {/* Panel header */}
          <div className="p-3 border-b bg-muted/30">
            <h3 className="text-xs lg:text-sm font-semibold">Live Preview</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              This is how your widget will look on the dashboard
            </p>
          </div>

          {/* Widget preview */}
          <div className="flex-1 overflow-auto p-4">
            <div className="border rounded-lg p-4 bg-background h-full">
              <UniversalDataWidget definition={schema} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t mt-4">
        <button
          onClick={onBack}
          disabled={isDeploying}
          className="px-4 py-2 min-h-[44px] border rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed order-2 sm:order-1"
        >
          Back
        </button>

        <button
          onClick={onDeploy}
          disabled={isDeploying}
          className={cn(
            'px-6 py-2.5 min-h-[44px] rounded-md font-semibold transition-all order-1 sm:order-2',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            'shadow-sm hover:shadow-md',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isDeploying && 'animate-pulse'
          )}
        >
          {isDeploying ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Deploying...
            </span>
          ) : (
            'Deploy to Dashboard'
          )}
        </button>
      </div>

      {/* Schema Editor Modal */}
      {isEditing && (
        <SchemaEditorModal
          json={editedJson}
          validationError={validationError}
          onJsonChange={setEditedJson}
          onApply={handleApplyChanges}
          onCancel={handleCancelEdit}
        />
      )}
    </div>
  );
}

/**
 * Schema Editor Modal
 *
 * Full-screen modal for editing widget schema JSON.
 * Includes JSON validation and error display.
 */
interface SchemaEditorModalProps {
  json: string;
  validationError: string | null;
  onJsonChange: (json: string) => void;
  onApply: () => void;
  onCancel: () => void;
}

function SchemaEditorModal({
  json,
  validationError,
  onJsonChange,
  onApply,
  onCancel,
}: SchemaEditorModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 lg:p-0">
      <div className="bg-background border rounded-lg shadow-2xl w-full max-w-full lg:max-w-4xl h-[95vh] lg:h-[80vh] flex flex-col mx-2 lg:mx-0">
        {/* Modal header */}
        <div className="flex items-center justify-between p-3 lg:p-4 border-b">
          <div className="flex-1 min-w-0">
            <h3 className="text-base lg:text-lg font-bold">Edit Widget Schema</h3>
            <p className="text-xs lg:text-sm text-muted-foreground hidden sm:block">
              Modify the JSON schema and click Apply to update the preview
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ml-2"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Validation error banner */}
        {validationError && (
          <div className="mx-3 lg:mx-4 mt-3 lg:mt-4 p-2 lg:p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-xs lg:text-sm font-semibold text-destructive mb-1">Validation Error</p>
            <pre className="text-xs text-destructive/80 whitespace-pre-wrap font-mono">
              {validationError}
            </pre>
          </div>
        )}

        {/* JSON editor (textarea) */}
        <div className="flex-1 overflow-hidden p-3 lg:p-4">
          <textarea
            value={json}
            onChange={(e) => onJsonChange(e.target.value)}
            className={cn(
              'w-full h-full font-mono text-xs lg:text-sm p-3 lg:p-4 border rounded-md',
              'bg-muted/10 focus:bg-background',
              'focus:outline-none focus:ring-2 focus:ring-primary',
              'resize-none',
              validationError && 'border-destructive'
            )}
            spellCheck={false}
            autoComplete="off"
            placeholder="Enter valid JSON..."
          />
        </div>

        {/* Modal footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 lg:gap-3 p-3 lg:p-4 border-t bg-muted/30">
          <button
            onClick={onCancel}
            className="px-4 py-2 min-h-[44px] border rounded-md hover:bg-accent transition-colors order-2 sm:order-1"
          >
            Cancel
          </button>
          <button
            onClick={onApply}
            className="px-4 py-2 min-h-[44px] bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors order-1 sm:order-2"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}
