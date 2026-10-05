import { NextRequest } from "next/server";
import { fetchIcsEvents } from "@/lib/ics";
import { Spot } from "@/lib/types";
import { DateTime } from "luxon";

export const runtime = "nodejs";

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
        // Public endpoint: only when each spot is taken. Names, plates, codes and contact
        // details stay in the calendar.
        results.push({
          id: `${spot}-${e.start.toISOString()}-${e.end.toISOString()}`,
          spot,
          start: e.start,
          end: e.end,
          reserved: /^reserved\b/i.test(e.summary || ""),
        });
      }
    }
    return new Response(JSON.stringify({ events: results }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "unexpected" }), { status: 500 });
  }
}


