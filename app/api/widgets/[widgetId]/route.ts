import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * DELETE /api/widgets/[widgetId]
 * Delete a widget for the current user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ widgetId: string }> }
) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { widgetId } = await params;

    if (!widgetId) {
      return NextResponse.json({ error: 'Missing widgetId' }, { status: 400 });
    }

    // Delete widget from database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabase
      .from('widget_instances')
      .delete()
      .eq('id', widgetId)
      .eq('user_id', user.userId); // Ensure user owns the widget

    if (error) {
      console.error(`[DELETE /api/widgets/${widgetId}] Database error:`, error);
      return NextResponse.json({ error: 'Failed to delete widget' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[DELETE /api/widgets/[widgetId]] Error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/widgets/[widgetId]
 * Update a widget's layout or config
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ widgetId: string }> }
) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { widgetId } = await params;
    const body = await request.json();
    const { layout, config } = body;

    if (!widgetId) {
      return NextResponse.json({ error: 'Missing widgetId' }, { status: 400 });
    }

    // Update widget in database
    // Store layout in position column
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const updateData: any = {};
    if (layout) updateData.position = layout;
    if (config) updateData.config = config;

    const { data, error } = await supabase
      .from('widget_instances')
      .update(updateData)
      .eq('id', widgetId)
      .eq('user_id', user.userId) // Ensure user owns the widget
      .select()
      .single();

    if (error) {
      console.error(`[PATCH /api/widgets/${widgetId}] Database error:`, error);
      return NextResponse.json({ error: 'Failed to update widget' }, { status: 500 });
    }

    return NextResponse.json({ widget: data });
  } catch (error) {
    console.error(`[PATCH /api/widgets/[widgetId]] Error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
