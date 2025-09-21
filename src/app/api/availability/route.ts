import { NextRequest } from "next/server";
import { isAvailable } from "@/lib/ics";
import { Spot } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const spot = searchParams.get("spot") as Spot;
    const startIso = searchParams.get("start");
    const endIso = searchParams.get("end");
    const excludeRef = searchParams.get("exclude"); // Optional: exclude a specific booking by reference
    
    console.log('Availability API called:', { spot, startIso, endIso, excludeRef });
    
    if (!spot || !startIso || !endIso) {
      console.log('Missing required parameters:', { spot, startIso, endIso });
      return new Response(JSON.stringify({ error: "spot, start, end required" }), { status: 400 });
    }
    
    const result = await isAvailable(spot, startIso, endIso, excludeRef);
    console.log('Availability result:', result);
    
    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error('Availability API error:', e);
    return new Response(JSON.stringify({ error: e.message || "unexpected" }), { status: 500 });
  }
}


