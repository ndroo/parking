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

### Showings

- `/showings`: lists every unit (bookable ones first; rented ones shown with their ListingAI status).
- `/showings/<unit>` (e.g. `/showings/unit-3`): booking page for one unit. Units, windows, listing links and the "good to know" cards live in `src/lib/showingUnits.ts`.
- Visitors see only which times are open, never who booked them. One booking per email per unit.
- After booking, visitors get a ticket with a reference code. It is remembered in their browser (localStorage) so they can come back to move or cancel; on another device they use "Manage my booking" with reference + email.
- `/showings/admin?key=...`: every unit's bookings with full details and cancel.
- Listing details (photos, price, beds/baths, highlights, contact phone/email) are pulled live from the ListingAI public API (`src/lib/listingai.ts`, cached 5 minutes), so edits on ListingAI show up automatically.
- Set `bookable: false` on a unit to show it without bookable times (e.g. while it's rented).
- Shared site header (`src/components/SiteHeader.tsx`) and the parking page theme (`src/app/parking-theme.css`) keep parking and showings visually consistent at one content width (960px).
- Env: `CALENDAR_ID_SHOWINGS` (one calendar for all units, shared with the service account), `SHOWINGS_ADMIN_KEY`.
- Double-booking is prevented by giving each unit + slot a deterministic event id (`u<code>d<yyyymmdd>t<hhmm>`); a second insert returns 409.
