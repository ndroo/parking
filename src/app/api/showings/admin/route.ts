import { NextRequest } from "next/server";
import { cancelShowing, isAdmin, listShowings } from "@/lib/showings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

export async function GET(req: NextRequest) {
  if (!isAdmin(req.headers.get("x-admin-key"))) return json({ error: "Unauthorized" }, 401);
  try {
    return json({ bookings: await listShowings() });
  } catch (e: any) {
    console.error("GET /api/showings/admin", e);
    return json({ error: e.message }, 500);
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req.headers.get("x-admin-key"))) return json({ error: "Unauthorized" }, 401);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return json({ error: "id required" }, 400);
  try {
    await cancelShowing(id);
    return json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /api/showings/admin", e);
    return json({ error: e.message }, 500);
  }
}
