/**
 * POST /api/ai/widget-creation/deploy
 *
 * Widget Deployment Endpoint
 *
 * Accepts validated widget definitions from the problem-first wizard
 * and deploys them to the dashboard. Publishes DocumentableEvent to
 * Event Mesh V2 for self-documentation and knowledge graph integration.
 *
 * Week 18: Backend Integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { createClient } from '@supabase/supabase-js';
import { publishDocumentable } from '@/lib/event-mesh';
import type { UniversalWidgetDefinition } from '@/lib/universal-widget/schema';
import { validateWidgetDefinition } from '@/lib/universal-widget/schema';
import type { UserIntent } from '@/lib/event-mesh/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Request body schema
 */
interface DeployWidgetRequest {
  widgetDefinition: UniversalWidgetDefinition;
  userIntent: UserIntent;
}

/**
 * Response schema
 */
interface DeployWidgetResponse {
  widgetId: string;
  success: boolean;
  message?: string;
}

/**
 * Validates widget definition for deployment
 *
 * Checks:
 * - Required fields present
 * - Provider is supported
 * - Layout type is valid
 * - Field mappings are complete
 */
function validateWidgetForDeployment(widget: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check widget definition structure
  const schemaValidation = validateWidgetDefinition(widget);
  if (!schemaValidation.valid) {
    errors.push(...schemaValidation.errors);
  }

  // Validate provider
  const validProviders = ['github', 'jira', 'linear', 'slack', 'calendar'];
  if (!validProviders.includes(widget.dataSource?.provider)) {
    errors.push(`Invalid provider: ${widget.dataSource?.provider}. Must be one of: ${validProviders.join(', ')}`);
  }

  // Validate layout type
  const validLayouts = ['list', 'table', 'cards', 'metric', 'chart'];
  if (!validLayouts.includes(widget.layout?.type)) {
    errors.push(`Invalid layout type: ${widget.layout?.type}. Must be one of: ${validLayouts.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generates a unique widget ID
 */
function generateWidgetId(provider: string, type: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${provider}_${type}_${timestamp}_${random}`;
}

/**
 * POST /api/ai/widget-creation/deploy
 *
 * Deploys a widget to the user's dashboard
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: DeployWidgetRequest = await request.json();
    const { widgetDefinition, userIntent } = body;

    if (!widgetDefinition || !userIntent) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: widgetDefinition, userIntent',
        },
        { status: 400 }
      );
    }

    // Validate widget definition
    const validation = validateWidgetForDeployment(widgetDefinition);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Widget validation failed',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Generate widget ID
    const widgetId = generateWidgetId(
      widgetDefinition.dataSource.provider,
      widgetDefinition.metadata.name.toLowerCase().replace(/\s+/g, '-')
    );

    // Check if Supabase is configured
    const hasSupabase = supabaseUrl && supabaseServiceKey;

    if (hasSupabase) {
      // Production: Insert into database
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data, error } = await supabase
        .from('widget_instances')
        .insert({
          id: widgetId,
          user_id: user.userId,
          template_id: null, // Universal widgets don't use templates
          position: {
            // Default position (will be auto-adjusted by dashboard)
            x: 0,
            y: Infinity, // Place at bottom
            w: 4,
            h: 4,
          },
          config: {
            widget_type: 'universal-data',
            widget_version: widgetDefinition.metadata.version,
            definition: widgetDefinition,
          },
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('[Deploy Widget] Database error:', error);

        // Handle duplicate key error
        if (error.code === '23505') {
          return NextResponse.json(
            {
              success: false,
              error: 'Widget with this ID already exists',
            },
            { status: 409 }
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: 'Failed to save widget to database',
            details: error.message,
          },
          { status: 500 }
        );
      }

      console.log('[Deploy Widget] Widget saved to database:', data);
    } else {
      // Dev mode: Log only (no database)
      console.log('[Deploy Widget] DEV MODE: Would save to database:', {
        widgetId,
        userId: user.userId,
        definition: widgetDefinition,
      });
    }

    // Publish DocumentableEvent to Event Mesh V2
    try {
      const event = await publishDocumentable({
        eventName: 'widget.created',
        source: 'widget_wizard',
        timestamp: Date.now(),
        payload: {
          widgetId,
          widgetType: 'universal-data',
          provider: widgetDefinition.dataSource.provider,
          widgetName: widgetDefinition.metadata.name,
        },
        shouldDocument: true, // Auto-marked for narrative generation
        userIntent: {
          problemSolved: userIntent.problemSolved,
          painPoint: userIntent.painPoint,
          goal: userIntent.goal,
          expectedOutcome: userIntent.expectedOutcome,
          impactMetric: userIntent.impactMetric,
        },
        context: {
          decision: 'User used problem-first wizard to create widget',
          category: 'feature',
        },
        metadata: {
          userId: user.userId,
          sessionId: `session_${Date.now()}`,
          environment: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
        },
      });

      console.log('[Deploy Widget] DocumentableEvent published:', event.id);
    } catch (eventError) {
      // Event publishing is non-critical - log but don't fail the request
      console.error('[Deploy Widget] Failed to publish event:', eventError);
    }

    // Return success response
    return NextResponse.json<DeployWidgetResponse>({
      widgetId,
      success: true,
      message: `Widget "${widgetDefinition.metadata.name}" deployed successfully`,
    });
  } catch (error) {
    console.error('[Deploy Widget] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
