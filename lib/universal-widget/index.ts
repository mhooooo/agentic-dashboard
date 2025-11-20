/**
 * UniversalDataWidget System
 *
 * Declarative JSON-based widget system for creating widgets without code.
 *
 * @example
 * ```typescript
 * import { loadWidgetDefinition } from '@/lib/universal-widget';
 * import { UniversalDataWidget } from '@/components/UniversalDataWidget';
 *
 * const definition = loadWidgetDefinition('github-prs-universal');
 * <UniversalDataWidget definition={definition} />
 * ```
 */

export * from './schema';
export * from './transformers';
export * from './loader';

// Re-export component type
export type { UniversalDataWidgetProps } from '@/components/UniversalDataWidget';
