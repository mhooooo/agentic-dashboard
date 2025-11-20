import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/widgets
 * Get all widgets for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's widgets from database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: widgets, error } = await supabase
      .from('widget_instances')
      .select('*')
      .eq('user_id', user.userId)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[GET /api/widgets] Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch widgets' }, { status: 500 });
    }

    // Transform database format to frontend format
    const frontendWidgets = widgets.map((widget: any) => ({
      id: widget.id,
      type: widget.config?.widget_type || 'unknown',
      version: widget.config?.widget_version || 1,
      config: widget.config || {},
      layout: widget.position || {},
    }));

    return NextResponse.json({ widgets: frontendWidgets });
  } catch (error) {
    console.error('[GET /api/widgets] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/widgets
 * Save a new widget for the current user
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { id, type, version, config, layout } = body;

    if (!id || !type) {
      return NextResponse.json({ error: 'Missing required fields: id, type' }, { status: 400 });
    }

    // Save widget to database
    // Store widget_type and widget_version inside config object
    // Store layout position in the position column
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from('widget_instances')
      .insert({
        id,
        user_id: user.userId,
        template_id: null, // No template for hardcoded widgets
        position: layout || {},
        config: {
          ...config,
          widget_type: type,
          widget_version: version || 1,
        },
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /api/widgets] Database error:', error);

      // Handle duplicate key error
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Widget already exists' }, { status: 409 });
      }

      return NextResponse.json({ error: 'Failed to save widget' }, { status: 500 });
    }

    return NextResponse.json({ widget: data });
  } catch (error) {
    console.error('[POST /api/widgets] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
