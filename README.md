## Parking Booking (Next.js, Vercel)

Calendar-only booking for two spots (Northern, Southern) using Google Calendar. No DB.

### Setup

1. Enable Google Calendar API in a Google Cloud project.
2. Create a Service Account; generate a JSON key.
3. Share both calendars with the service account email with "Make changes to events".
4. In Vercel Project Settings → Environment Variables, add:
   - `GOOGLE_CLIENT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (paste with line breaks; Vercel will keep formatting)
   - `CALENDAR_ID_NORTHERN` = 5d49c9...42bc@group.calendar.google.com
   - `CALENDAR_ID_SOUTHERN` = 1ee843...9456@group.calendar.google.com
   - `ICS_URL_NORTHERN` = https://calendar.google.com/calendar/ical/5d49c9294e9d6dd30f488ce0070b1d6b7714d3886bf2d34978c522b7613542bc%40group.calendar.google.com/private-9dbf7bb9b25feab029ce3708a590a836/basic.ics
   - `ICS_URL_SOUTHERN` = https://calendar.google.com/calendar/ical/1ee843883fb437c6ca407dcbb754f481a739775e2f2cf97d0863de3529ab9456%40group.calendar.google.com/private-79c21fb86f0727c51ddfa7e5660fde57/basic.ics

### API

- `POST /api/book` { spot, startIso, endIso, plate } → { ref, eventId, priceCents }
- `PATCH /api/booking/[ref]` { spot, startIso, endIso } → { ok }
- `DELETE /api/booking/[ref]?spot=...` → { ok }
- `GET /api/availability?spot=...&start=...&end=...` → { available, conflicts }

All times are in America/Toronto.

### Pricing

- $15 per 24 hours, $50 per week, $100 per month. UI shows the cheapest combination.

### Notes

- Availability is verified against ICS feeds:
  - Northern: https://calendar.google.com/calendar/ical/5d49c9294e9d6dd30f488ce0070b1d6b7714d3886bf2d34978c522b7613542bc%40group.calendar.google.com/private-9dbf7bb9b25feab029ce3708a590a836/basic.ics
  - Southern: https://calendar.google.com/calendar/ical/1ee843883fb437c6ca407dcbb754f481a739775e2f2cf97d0863de3529ab9456%40group.calendar.google.com/private-79c21fb86f0727c51ddfa7e5660fde57/basic.ics
- Bookings create a Google Calendar event with summary `[spot] PLATE (ref CODE)` and private extendedProperties `{ ref, plate, spot }`.
- Tenants are shown the e-transfer address `andrewjohnmcgrath@gmail.com` after booking.

### Showings (Unit 3)

- `/showings`: public booking page, 15-min slots in the windows set in `src/lib/showings.ts` (`SHOWING_CONFIG`). Other visitors see first names only. One booking per email.
- `/showings/admin?key=...`: full name/email/phone/pet with cancel.
- Env: `CALENDAR_ID_SHOWINGS` (new calendar shared with the service account), `SHOWINGS_ADMIN_KEY`.
- Double-booking is prevented by giving each slot a deterministic event id (`slotYYYYMMDDtHHMM`); a second insert returns 409.
