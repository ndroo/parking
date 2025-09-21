import ical from "node-ical";
import { DateTime } from "luxon";
import { getIcsUrl, APP_TZ } from "@/lib/config";
import { Spot } from "@/lib/types";

export interface EventWindow { start: Date; end: Date; summary?: string; description?: string; };

export async function fetchIcsEvents(spot: Spot): Promise<EventWindow[]> {
  const url = getIcsUrl(spot);
  console.log(`fetchIcsEvents for ${spot}:`, url);
  
  if (!url) {
    console.error(`ICS URL not configured for spot: ${spot}`);
    throw new Error(`ICS URL not configured for spot: ${spot}`);
  }
  
  try {
    const data = await ical.async.fromURL(url);
    console.log(`ICS data keys for ${spot}:`, Object.keys(data).length);
    
    const events: EventWindow[] = [];
    for (const k of Object.keys(data)) {
      const v = data[k] as any;
      if (v.type === 'VEVENT') {
        const start = v.start as Date;
        const end = v.end as Date;
        if (start && end) {
          events.push({ 
            start, 
            end, 
            summary: v.summary || '',
            description: v.description || ''
          });
        }
      }
    }
    console.log(`Parsed ${events.length} events for ${spot}`);
    return events;
  } catch (error) {
    console.error(`Error fetching ICS for ${spot}:`, error);
    throw error;
  }
}

export function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && startB < endA;
}

export async function isAvailable(spot: Spot, startIso: string, endIso: string, excludeRef?: string | null): Promise<{ available: boolean; conflicts: EventWindow[] }>{
  console.log('isAvailable called:', { spot, startIso, endIso, excludeRef });
  
  const events = await fetchIcsEvents(spot);
  console.log(`Found ${events.length} events for ${spot}:`, events.map(e => ({ start: e.start, end: e.end, summary: e.summary })));
  
  const start = DateTime.fromISO(startIso, { zone: APP_TZ }).toJSDate();
  const end = DateTime.fromISO(endIso, { zone: APP_TZ }).toJSDate();
  console.log('Parsed dates:', { start, end, startIso, endIso, timezone: APP_TZ });
  
  // Filter out the booking we're modifying (if excludeRef is provided)
  const filteredEvents = excludeRef 
    ? events.filter(e => {
        // Check if this event contains the reference code we want to exclude
        const eventRef = parseRefFromEvent(e.summary, e.description);
        return eventRef !== excludeRef.toUpperCase();
      })
    : events;
  
  console.log(`After filtering (excludeRef: ${excludeRef}):`, filteredEvents.length, 'events');
  
  const conflicts = filteredEvents.filter(e => overlaps(start, end, e.start, e.end));
  console.log('Conflicts found:', conflicts.map(c => ({ start: c.start, end: c.end, summary: c.summary })));
  
  const result = { available: conflicts.length === 0, conflicts };
  console.log('Final availability result:', result);
  return result;
}

// Helper function to parse reference code from event data
function parseRefFromEvent(summary?: string, description?: string): string | null {
  // Try to get ref from summary first: [spot] PLATE (ref CODE)
  if (summary) {
    const summaryMatch = summary.match(/\(ref\s+([A-Z0-9]{4,10})\)/i);
    if (summaryMatch) return summaryMatch[1].toUpperCase();
  }
  
  // Try to get ref from description: Reference: CODE
  if (description) {
    const descMatch = description.match(/Reference:\s*([A-Z0-9]{4,10})/i);
    if (descMatch) return descMatch[1].toUpperCase();
  }
  
  return null;
}


