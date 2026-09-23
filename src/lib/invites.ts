import { createHmac, timingSafeEqual } from "crypto";

// Showing invites for approved applicants. Nothing is stored: a code is an
// HMAC of (unit + email), so the server can re-derive and check it. The
// emailed link carries a signed token that also holds name/phone to prefill.
const SECRET = (process.env.SHOWINGS_INVITE_SECRET || "").trim();
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export interface Invite {
  unit: string; // unit slug
  email: string;
  name: string;
  phone: string;
}

const norm = (email: string) => email.trim().toLowerCase();

function hmac(data: string): Buffer {
  if (!SECRET) throw new Error("SHOWINGS_INVITE_SECRET is not set");
  return createHmac("sha256", SECRET).update(data).digest();
}

export function inviteCode(unit: string, email: string): string {
  const d = hmac(`code|${unit}|${norm(email)}`);
  let out = "";
  for (let i = 0; i < 8; i++) out += ALPHABET[d[i] % ALPHABET.length];
  return out;
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkCode(unit: string, email: string, code: string): boolean {
  const clean = (code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return !!email && clean.length === 8 && safeEqual(clean, inviteCode(unit, email));
}

export function makeToken(inv: Invite): string {
  const payload = Buffer.from(JSON.stringify({ u: inv.unit, e: norm(inv.email), n: inv.name, p: inv.phone })).toString("base64url");
  const sig = hmac(`token|${payload}`).subarray(0, 16).toString("base64url");
  return `${payload}.${sig}`;
}

export function readToken(token: string): Invite | null {
  const [payload, sig] = (token || "").split(".");
  if (!payload || !sig) return null;
  try {
    if (!safeEqual(sig, hmac(`token|${payload}`).subarray(0, 16).toString("base64url"))) return null;
    const d = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return { unit: d.u, email: d.e, name: d.n || "", phone: d.p || "" };
  } catch {
    return null;
  }
}

export function inviteLink(origin: string, inv: Invite): string {
  return `${origin}/showings/${inv.unit}?invite=${makeToken(inv)}`;
}

// Accepts either the emailed token, or a typed code + email
export function resolveInvite(unit: string, input: { token?: string; code?: string; email?: string }): Invite | null {
  if (input.token) {
    const inv = readToken(input.token);
    return inv && inv.unit === unit ? inv : null;
  }
  if (input.code && input.email && checkCode(unit, input.email, input.code)) {
    return { unit, email: norm(input.email), name: "", phone: "" };
  }
  return null;
}
