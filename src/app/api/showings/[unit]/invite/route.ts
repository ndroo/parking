import { NextRequest } from "next/server";
import { getUnit } from "@/lib/showingUnits";
import { resolveInvite } from "@/lib/invites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ unit: string }> };

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

// POST { token } or { code, email } -> { invite: { email, name, phone } }
export async function POST(req: NextRequest, { params }: Ctx) {
  const unit = getUnit((await params).unit);
  if (!unit) return json({ error: "Unknown unit" }, 404);
  const { token, code, email } = await req.json().catch(() => ({}));
  const inv = resolveInvite(unit.slug, { token, code, email });
  if (!inv) {
    return json({ error: token ? "That invite link isn't valid for this unit." : "That code and email don't match an invite. Check your approval email, or get in touch." }, 403);
  }
  return json({ invite: { email: inv.email, name: inv.name, phone: inv.phone } });
}
