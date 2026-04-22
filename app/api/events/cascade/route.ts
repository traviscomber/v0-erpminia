import { NextRequest, NextResponse } from 'next/server';
import { eventEngine } from '@/lib/event-engine';

/**
 * POST /api/events/cascade
 * 
 * Receives an event and triggers cascade rules across modules
 * Example event: { type: 'sensor_alarm', source_module: 'produccion', entity_id: 'eq_001', ... }
 */
export async function POST(request: NextRequest) {
  try {
    const event = await request.json();

    console.log('[API] Cascade event received:', event);

    // Validate event structure
    if (!event.type || !event.source_module || !event.entity_id) {
      return NextResponse.json(
        { error: 'Missing required event fields: type, source_module, entity_id' },
        { status: 400 }
      );
    }

    // Emit event to the engine (which triggers cascade rules)
    await eventEngine.emit({
      type: event.type,
      source_module: event.source_module,
      entity_id: event.entity_id,
      data: event.data || {},
      timestamp: new Date(event.timestamp || Date.now()),
      severity: event.severity || 'info',
      triggered_by: event.triggered_by || 'system',
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Event cascade triggered',
        event_id: event.entity_id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error processing cascade event:', error);
    return NextResponse.json(
      { error: 'Failed to process event cascade', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/events/cascade?limit=100
 * 
 * Returns the event log for audit trail purposes
 */
export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100');
    const events = eventEngine.getEventLog(limit);

    return NextResponse.json(
      {
        success: true,
        count: events.length,
        events,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error retrieving event log:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve event log', details: String(error) },
      { status: 500 }
    );
  }
}
