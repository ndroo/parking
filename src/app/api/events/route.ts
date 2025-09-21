import { NextRequest } from "next/server";
import { fetchIcsEvents } from "@/lib/ics";
import { Spot } from "@/lib/types";
import { DateTime } from "luxon";

export const runtime = "nodejs";

function parseRef(summary?: string): string | null {
  if (!summary) return null;
  const m = summary.match(/\bref\s+([A-Z0-9]{4,10})\b/i);
  return m ? m[1].toUpperCase() : null;
}

function parseName(description?: string): string | null {
  if (!description) return null;
  const m = description.match(/Name:\s*([^\n\r]+)/i);
  return m ? m[1].trim() : null;
}

function parsePlate(description?: string, summary?: string): string | null {
  // Try to get plate from description first
  if (description) {
    const m = description.match(/Plate:\s*([^\n\r]+)/i);
    if (m) return m[1].trim();
  }
  
  // Fallback to summary format: [spot] PLATE (ref CODE)
  if (summary) {
    const m = summary.match(/\]\s*([^(]+)\s*\(/);
    if (m) return m[1].trim();
  }
  
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const spotParam = searchParams.get("spot");
    const startIso = searchParams.get("start");
    const endIso = searchParams.get("end");

    const spots: Spot[] = spotParam === "both" || !spotParam
      ? ["northern", "southern"]
      : [spotParam as Spot];

    const start = startIso ? DateTime.fromISO(startIso) : null;
    const end = endIso ? DateTime.fromISO(endIso) : null;

    const results: any[] = [];
    for (const spot of spots) {
      const events = await fetchIcsEvents(spot);
      for (const e of events) {
        const inRange = (!start || e.end >= start.toJSDate()) && (!end || e.start <= end.toJSDate());
        if (!inRange) continue;
        const name = parseName(e.description);
        const ref = parseRef(e.summary);
        const plate = parsePlate(e.description, e.summary);
        results.push({
          id: `${spot}-${e.start.toISOString()}-${e.end.toISOString()}`,
          spot,
          title: `${spot}`,
          start: e.start,
          end: e.end,
          summary: e.summary,
          description: e.description,
          name: name,
          ref: ref,
          plate: plate,
        });
      }
    }
    return new Response(JSON.stringify({ events: results }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "unexpected" }), { status: 500 });
  }
}


