// Email-safe HTML (tables + inline styles) matching the site's look.
// Pure rendering so it can be previewed without sending.

export interface EmailButton { label: string; href: string; primary?: boolean }

export interface EmailContent {
  preheader: string;
  photoUrl?: string;
  photoAfterMessage?: boolean; // letter-style: message first, then the photo
  badge?: { text: string; tone: "ok" | "accent" | "muted" };
  title?: string;
  intro?: string;
  paragraphs?: string[]; // free-form body text, e.g. a personal message
  refLabel?: string;
  when?: { eyebrow: string; big: string; sub: string; subHref?: string; struck?: string };
  refCode?: string;
  rows?: { label: string; value: string; href?: string }[];
  buttons?: EmailButton[];
  notes?: { title: string; items: string[] };
  contact?: { text: string; phone?: string; email?: string };
  callout?: { title: string; body: string; button: EmailButton };
  rawLink?: string; // shown under the buttons so people can copy it
  listingCard?: { photoUrl?: string; title: string; button: EmailButton };
  codeNote?: { code: string; text: string }; // small fallback at the bottom
  footer: string;
  reason?: string; // "you applied for a rental unit" -> standard "why you got this" line
}

const C = {
  bg: "#f5f1ea", surface: "#ffffff", soft: "#faf7f2", ink: "#1d1a16", muted: "#6d665c",
  line: "#e6dfd4", accent: "#b24a26", accentSoft: "#f7e4da", ok: "#2f7a4f", okSoft: "#e1f1e6",
};
const BRAND = { name: "Little Italy Rentals", url: "https://little-italy-rentals.mylistingai.co" };
const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const tel = (p: string) => p.replace(/[^\d+]/g, "");

function fullButton(b: EmailButton) {
  const bg = b.primary ? C.accent : C.surface;
  const fg = b.primary ? "#ffffff" : C.ink;
  const border = b.primary ? C.accent : C.line;
  return `<a href="${esc(b.href)}" style="display:block;padding:14px 16px;border-radius:12px;background:${bg};border:1px solid ${border};color:${fg};font-family:${FONT};font-size:15px;font-weight:600;text-align:center;text-decoration:none">${esc(b.label)}</a>`;
}

// First button full width; any others share the next row equally
function buttonBlock(buttons: EmailButton[]) {
  const [first, ...rest] = buttons;
  const row = rest.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px"><tr>${rest
        .map((b, i) => `<td width="${Math.floor(100 / rest.length)}%" style="${i > 0 ? "padding-left:8px" : ""}">${fullButton(b)}</td>`)
        .join("")}</tr></table>`
    : "";
  return `<div style="margin:4px 0 12px">${fullButton(first)}${row}</div>`;
}

export function renderEmail(e: EmailContent): { html: string; text: string } {
  const badgeColors = { ok: [C.okSoft, C.ok], accent: [C.accentSoft, C.accent], muted: [C.soft, C.muted] } as const;
  const parts: string[] = [];

  if (e.badge) {
    const [bg, fg] = badgeColors[e.badge.tone];
    parts.push(`<div style="margin:0 0 14px"><span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${bg};color:${fg};font-size:13px;font-weight:600">${esc(e.badge.text)}</span></div>`);
  }
  if (e.title) parts.push(`<h1 style="margin:0 0 10px;font-size:26px;line-height:1.2;letter-spacing:-0.02em;font-weight:700;color:${C.ink}">${esc(e.title)}</h1>`);
  if (e.intro) parts.push(`<p style="margin:0 0 20px;font-size:16px;line-height:1.55;color:${C.muted}">${esc(e.intro)}</p>`);
  if (e.paragraphs?.length) {
    parts.push(e.paragraphs.map(t => `<p style="margin:0 0 14px;font-size:15.5px;line-height:1.6;color:${C.ink}">${esc(t).replace(/\n/g, "<br>")}</p>`).join(""));
  }
  if (e.photoUrl && e.photoAfterMessage) {
    parts.push(`<div style="margin:6px 0 18px;line-height:0"><img src="${esc(e.photoUrl)}" width="504" alt="" style="display:block;width:100%;max-width:504px;height:auto;border-radius:14px"></div>`);
  }

  if (e.when) {
    parts.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border-radius:16px;background:${C.accent}"><tr><td style="padding:20px 22px;color:#ffffff;font-family:${FONT}">
      <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85">${esc(e.when.eyebrow)}</div>
      ${e.when.struck ? `<div style="font-size:15px;opacity:0.75;text-decoration:line-through;margin-top:6px">${esc(e.when.struck)}</div>` : ""}
      <div style="font-size:28px;font-weight:700;letter-spacing:-0.02em;line-height:1.15;margin-top:4px">${esc(e.when.big)}</div>
      <div style="font-size:15px;margin-top:6px;color:#ffffff">${e.when.subHref
        // An explicit white link stops Gmail auto-linking the address in blue
        ? `<a href="${esc(e.when.subHref)}" style="color:#ffffff !important;text-decoration:none"><span style="color:#ffffff">${esc(e.when.sub)}</span></a>`
        : `<span style="color:#ffffff">${esc(e.when.sub)}</span>`}</div>
    </td></tr></table>`);
  }

  if (e.refCode) {
    parts.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border:1px dashed ${C.line};border-radius:14px;background:${C.soft}"><tr><td style="padding:14px 18px;font-family:${FONT}">
      <div style="font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${C.muted}">${esc(e.refLabel || "Reference code")}</div>
      <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:26px;font-weight:700;letter-spacing:0.16em;color:${C.ink};margin-top:4px">${esc(e.refCode)}</div>
    </td></tr></table>`);
  }

  if (e.rows?.length) {
    parts.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border-top:1px solid ${C.line}">${e.rows
      .map(r => `<tr><td style="padding:10px 12px 10px 0;border-bottom:1px solid ${C.line};font-size:14px;color:${C.muted};width:90px;vertical-align:top">${esc(r.label)}</td><td style="padding:10px 0;border-bottom:1px solid ${C.line};font-size:15px;color:${C.ink}">${r.href ? `<a href="${esc(r.href)}" style="color:${C.accent};text-decoration:none">${esc(r.value)}</a>` : esc(r.value).replace(/\n/g, "<br>")}</td></tr>`)
      .join("")}</table>`);
  }

  if (e.buttons?.length) parts.push(buttonBlock(e.buttons));
  if (e.rawLink) {
    parts.push(`<p style="margin:-2px 0 18px;font-size:12.5px;line-height:1.5;color:${C.muted};word-break:break-all">Or copy this link: <a href="${esc(e.rawLink)}" style="color:${C.muted}">${esc(e.rawLink)}</a></p>`);
  }
  if (e.listingCard) {
    const lc = e.listingCard;
    parts.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 6px;border:1px solid ${C.line};border-radius:16px;overflow:hidden"><tr><td style="font-family:${FONT}">
      ${lc.photoUrl ? `<a href="${esc(lc.button.href)}" style="display:block;line-height:0"><img src="${esc(lc.photoUrl)}" width="504" alt="" style="display:block;width:100%;max-width:504px;height:200px;object-fit:cover"></a>` : ""}
      <div style="padding:14px 16px">
        <div style="font-size:14px;font-weight:600;color:${C.ink};margin:0 0 10px">${esc(lc.title)}</div>
        ${fullButton(lc.button)}
      </div>
    </td></tr></table>`);
  }

  if (e.callout) {
    parts.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 6px;border-radius:16px;background:${C.accentSoft}"><tr><td style="padding:18px 20px;font-family:${FONT}">
      <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${C.accent}">Before your visit</div>
      <div style="font-size:18px;font-weight:700;color:${C.ink};margin:4px 0 6px">${esc(e.callout.title)}</div>
      <div style="font-size:14.5px;line-height:1.55;color:${C.ink};margin:0 0 14px">${esc(e.callout.body)}</div>
      ${fullButton({ ...e.callout.button, primary: true })}
    </td></tr></table>`);
  }

  const codeNote = e.codeNote
    ? `<p style="margin:14px 0 0;padding-top:14px;border-top:1px solid ${C.line};font-size:13px;line-height:1.55;color:${C.muted}">${esc(e.codeNote.text)} <b style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:14px;letter-spacing:0.12em;color:${C.ink}">${esc(e.codeNote.code)}</b></p>`
    : "";

  if (e.notes?.items.length) {
    parts.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 6px;border-radius:14px;background:${C.soft};border:1px solid ${C.line}"><tr><td style="padding:16px 18px;font-family:${FONT}">
      <div style="font-size:14px;font-weight:700;color:${C.ink};margin-bottom:8px">${esc(e.notes.title)}</div>
      ${e.notes.items.map(i => `<div style="font-size:14px;line-height:1.5;color:${C.muted};margin:0 0 8px;padding-left:16px;position:relative"><span style="color:${C.accent};font-weight:700">&#8226;</span>&nbsp; ${esc(i)}</div>`).join("")}
    </td></tr></table>`);
  }

  const contact = e.contact
    ? `<tr><td style="padding:18px 28px;border-top:1px solid ${C.line};background:${C.soft};font-family:${FONT};font-size:14px;line-height:1.55;color:${C.muted}">
        ${esc(e.contact.text)}
        <div style="margin-top:8px">
          ${e.contact.phone ? `<a href="tel:${tel(e.contact.phone)}" style="color:${C.ink};font-size:18px;font-weight:700;text-decoration:none">${esc(e.contact.phone)}</a>
          <span style="color:${C.line}">&nbsp;|&nbsp;</span><a href="sms:${tel(e.contact.phone)}" style="color:${C.accent};font-weight:600;text-decoration:none">Text</a>` : ""}
          ${e.contact.email ? `<span style="color:${C.line}">&nbsp;|&nbsp;</span><a href="mailto:${esc(e.contact.email)}" style="color:${C.accent};font-weight:600;text-decoration:none">Email</a>` : ""}
        </div>
      </td></tr>`
    : "";

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:${C.bg}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(e.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:28px 14px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td style="background:${C.surface};border:1px solid ${C.line};border-radius:22px;overflow:hidden">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${e.photoUrl && !e.photoAfterMessage ? `<tr><td style="border-radius:22px 22px 0 0;overflow:hidden;line-height:0"><img src="${esc(e.photoUrl)}" width="560" alt="" style="display:block;width:100%;max-width:560px;height:220px;object-fit:cover;border-radius:22px 22px 0 0"></td></tr>` : ""}
        <tr><td style="padding:26px 28px 18px;font-family:${FONT}">${parts.join("\n")}${codeNote}</td></tr>
        ${contact}
      </table>
    </td></tr>
    <tr><td style="padding:18px 8px 0;text-align:center;font-family:${FONT};font-size:12.5px;line-height:1.5;color:${C.muted}">${esc(e.footer)}${e.reason ? `<br><br>You received this email because ${esc(e.reason)} with <a href="${BRAND.url}" style="color:${C.muted};text-decoration:underline">${BRAND.name}</a>.` : ""}</td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const text = [
    e.title,
    e.intro,
    e.paragraphs?.join("\n\n"),
    e.when && `${e.when.eyebrow}: ${e.when.big}${e.when.struck ? ` (was ${e.when.struck})` : ""}\n${e.when.sub}`,
    e.refCode && `Reference code: ${e.refCode}`,
    e.rows?.map(r => `${r.label}: ${r.value}`).join("\n"),
    e.buttons?.map(b => `${b.label}: ${b.href}`).join("\n"),
    e.listingCard && `${e.listingCard.title}: ${e.listingCard.button.href}`,
    e.callout && `${e.callout.title}\n${e.callout.body}\n${e.callout.button.href}`,
    e.notes && `${e.notes.title}\n${e.notes.items.map(i => `- ${i}`).join("\n")}`,
    e.contact && `${e.contact.text} ${[e.contact.phone, e.contact.email].filter(Boolean).join(" / ")}`,
    e.codeNote && `${e.codeNote.text} ${e.codeNote.code}`,
    e.footer,
    e.reason && `You received this email because ${e.reason} with ${BRAND.name}: ${BRAND.url}`,
  ].filter(Boolean).join("\n\n");

  return { html, text };
}
