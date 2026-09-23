import { getAccessToken } from "@/lib/google";
import { ShowingUnit } from "@/lib/showingUnits";

// Reads applications from a unit's Google Form responses Sheet and records
// the review status in two extra columns ("Status", "Status updated").
const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const STATUS_HEADERS = ["Status", "Status updated"];

export type ApplicationStatus = "New" | "Approved" | "Declined";

export interface SheetApplication {
  row: number; // 1-based sheet row
  submittedAt: string;
  name: string;
  email: string;
  phone: string;
  occupants: string;
  moveIn: string;
  attracted: string;
  whyMoving: string;
  consentComms: string;
  consentCredit: string;
  pets: string;
  references: string;
  insurance: string;
  other: string;
  status: ApplicationStatus;
  statusUpdated: string;
  detectedIncome: number | null; // rough sum of dollar amounts in the occupants answer
}

// Header text (lowercase prefix) for each field; matches the Google Form questions
const FIELDS: [keyof SheetApplication, string][] = [
  ["submittedAt", "timestamp"],
  ["name", "name of primary contact"],
  ["email", "primary contact email"],
  ["phone", "primary contact phone"],
  ["occupants", "name, date of birth"],
  ["moveIn", "desired date of occupancy"],
  ["attracted", "what attracted you"],
  ["whyMoving", "why are you moving"],
  ["consentComms", "do you consent to receiving"],
  ["consentCredit", "do all occupants consent"],
  ["pets", "do you have any pets"],
  ["references", "please provide at least 1 reference"],
  ["insurance", "do you agree to maintain"],
  ["other", "is there anything else"],
];

const colLetter = (i: number) => {
  let s = "", n = i + 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

async function api(path: string, init?: RequestInit) {
  const token = await getAccessToken(SCOPES);
  const res = await fetch(`${SHEETS}/${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers || {}) }, cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(`Sheets ${res.status}: ${data.error?.message || "error"}`);
  return data;
}

export function detectIncome(text: string): number | null {
  let total = 0, found = false;
  for (const m of text.matchAll(/\$?\s?(\d{1,3}(?:,\d{3})+|\d{4,}|\d{2,3}(?:\.\d)?\s?k)\b/gi)) {
    const raw = m[1].toLowerCase().replace(/[,\s]/g, "");
    const n = raw.endsWith("k") ? parseFloat(raw) * 1000 : parseFloat(raw);
    if (n >= 5000 && n <= 1_000_000 && !(n >= 1900 && n <= 2100 && !m[0].includes("$"))) { total += n; found = true; } // skip bare years
  }
  return found ? Math.round(total) : null;
}

async function readAll(unit: ShowingUnit) {
  const cfg = unit.applicationSheet!;
  const data = await api(`${cfg.spreadsheetId}/values/${encodeURIComponent(cfg.sheetName)}`);
  const rows: string[][] = data.values || [];
  return { cfg, header: rows[0] || [], rows };
}

// Adds the Status columns to the header row if they aren't there yet
async function ensureStatusColumns(unit: ShowingUnit, header: string[]) {
  let statusIdx = header.findIndex(h => h.trim().toLowerCase() === "status");
  if (statusIdx === -1) {
    statusIdx = header.length;
    const cfg = unit.applicationSheet!;
    const range = `${cfg.sheetName}!${colLetter(statusIdx)}1:${colLetter(statusIdx + 1)}1`;
    await api(`${cfg.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ values: [STATUS_HEADERS] }) });
  }
  return statusIdx;
}

export async function listApplications(unit: ShowingUnit): Promise<SheetApplication[]> {
  const { header, rows } = await readAll(unit);
  const idx = (prefix: string) => header.findIndex(h => h.trim().toLowerCase().startsWith(prefix));
  const statusIdx = header.findIndex(h => h.trim().toLowerCase() === "status");
  const emailFallback = idx("email address");
  return rows.slice(1).map((r, i) => {
    const a: any = { row: i + 2 };
    for (const [key, prefix] of FIELDS) { const c = idx(prefix); a[key] = c >= 0 ? (r[c] || "").trim() : ""; }
    if (!a.email && emailFallback >= 0) a.email = (r[emailFallback] || "").trim();
    const st = statusIdx >= 0 ? (r[statusIdx] || "").trim() : "";
    a.status = st === "Approved" || st === "Declined" ? st : "New";
    a.statusUpdated = statusIdx >= 0 ? (r[statusIdx + 1] || "").trim() : "";
    a.detectedIncome = detectIncome(a.occupants);
    return a as SheetApplication;
  }).filter(a => a.name || a.email).reverse();
}

// Appends a new application as a row, matching the Sheet's existing columns.
// Values are written RAW so nothing an applicant types is treated as a formula.
export async function appendApplication(unit: ShowingUnit, values: Partial<Record<keyof SheetApplication, string>>): Promise<void> {
  const { cfg, header } = await readAll(unit);
  if (!header.length) throw new Error("The application sheet has no header row");
  const row = header.map(h => {
    const k = h.trim().toLowerCase();
    if (k === "email address") return values.email || "";
    const match = FIELDS.find(([, prefix]) => k.startsWith(prefix));
    return match ? values[match[0]] || "" : "";
  });
  const range = `${cfg.sheetName}!A1`;
  await api(`${cfg.spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: JSON.stringify({ values: [row] }),
  });
}

// Writes the status for one row, after checking the row still belongs to that email
export async function setApplicationStatus(unit: ShowingUnit, row: number, email: string, status: ApplicationStatus): Promise<void> {
  const { cfg, header, rows } = await readAll(unit);
  const emailCol = header.findIndex(h => h.trim().toLowerCase().startsWith("primary contact email"));
  const rowEmail = (rows[row - 1]?.[emailCol] || "").trim().toLowerCase();
  if (!rowEmail || rowEmail !== email.trim().toLowerCase()) throw new Error("The sheet has changed since this list loaded. Refresh and try again.");
  const statusIdx = await ensureStatusColumns(unit, header);
  const stamp = new Date().toLocaleString("en-CA", { timeZone: "America/Toronto" });
  const range = `${cfg.sheetName}!${colLetter(statusIdx)}${row}:${colLetter(statusIdx + 1)}${row}`;
  await api(`${cfg.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ values: [[status, stamp]] }) });
}
