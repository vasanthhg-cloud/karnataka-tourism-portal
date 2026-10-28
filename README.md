# Smart Local Tourism Business Portal – Karnataka (static website)

A complete tourism website for Karnataka that runs in a browser with **no server, no database and
no build step**. Open `index.html` and it works — on a laptop, from a USB stick, or hosted on any
static host (GitHub Pages, Netlify, Cloudflare Pages, S3).

Coverage: all 31 districts, **524 destination records** (183 of them temples), 62 homestay
listings, 31 guide profiles and 12 cultural experiences, with search, filters, an interactive map,
English / हिन्दी / ಕನ್ನಡ interface, light and dark themes, a demo-only payment flow, printable demo
tickets with QR codes, and a booking history with CSV export.

---

## 1. Open it

**Simplest:** double-click `index.html`.

**Better** (recommended for the map and for accurate relative paths):

```bash
cd karnataka-tourism-website
python3 -m http.server 8000
# then open http://127.0.0.1:8000
```

Nothing to install, nothing to configure. Internet access is needed for the photographs
(Wikimedia Commons), the map tiles (OpenStreetMap/CARTO) and the web fonts; everything else works
offline.

### Pages

| File | Page |
|---|---|
| `index.html` | homepage: hero search, counts, featured destinations, popular homestays, experiences, district grid |
| `destinations.html` | district-wise directory with search, district/category/price filters, sorting, pagination |
| `destination.html?id=N` | destination detail: photo gallery, description, hours, fees, season, facilities, accessibility, coordinates, related sites, booking |
| `homestays.html` | homestay directory with district, guests, price and amenity filters |
| `homestay.html?id=N` | homestay detail with rooms, amenities, house rules, host, cancellation policy and booking |
| `guides.html`, `experiences.html` | guide profiles and cultural experiences |
| `map.html` | Leaflet map with district, category and listing-type filters |
| `bookings.html` | booking history: filter by status/type, search by booking ID, CSV export |
| `pay.html?ref=…` | simulated payment screen |
| `booking.html?ref=…` | confirmation with status and transaction ID |
| `ticket.html?ref=…` | printable demo ticket / stay confirmation with QR code |
| `about.html`, `contact.html` | project notes and a (non-sending) contact form |

---

## 2. What to try

1. **Search → book → pay → ticket.** Home → any card with a price → *Book now* → fill the form →
   *Continue to demo payment* → choose a simulated outcome → *Pay (demo)* → *Print / Save as PDF*.
2. **Filters.** `destinations.html` → filter by district and category, sort by price, page through
   the results. The filter state lives in the URL, so a filtered view can be bookmarked or shared.
3. **Map.** `map.html` → filter by district or category; each marker opens a card with a link to the
   detail page.
4. **Language.** The selector in the header switches English / हिन्दी / ಕನ್ನಡ. The choice is
   remembered, including the date and status labels.
5. **Dark mode.** The moon/sun button switches theme; the choice is remembered.
6. **Bookings.** `bookings.html` lists everything you booked in this browser, with status filters
   and a CSV export. Cancel a demo booking from its confirmation page.

---

## 2a. Signing in

Browsing is open to everyone. **Booking needs an account.** *Sign in* sits in the header; a booking
panel shows the same form inline.

Two ways to sign in, both from the same panel:

- **Mobile number + password** (default). Creating an account asks for your name, mobile number and
  a password of at least 6 characters. The password is stored as a salted SHA-256 hash — never in
  clear — and the account is keyed on the normalised 10-digit number, so `+91`, a leading `0` or
  spaces all resolve to the same account.
- **Mobile number + OTP** via the *Use an OTP instead* link: one code at a time, valid 5 minutes,
  resending generates a different code and cancels the previous one, only the newest verifies,
  single use, five wrong attempts lock it, 30-second cooldown.

After either path the header shows your name, booking unlocks, and the session lasts 24 hours.

### Where the accounts live

This is a static site, so accounts and sessions are stored in your browser (`localStorage`). That
makes the flow real but the trust model local: someone with access to the browser can read or alter
it. For real accounts, deploy the OTP service in `otp-service/` and set `window.KT_OTP_API` in
`assets/js/config.js` — the OTP path then runs server-side with SMS, and the Flask project in
`karnataka-tourism.zip` has the full server-side version with hashed passwords and server sessions.

## 3. Honest labelling

- **Demo payments.** No gateway is connected and no network request leaves the page when you "pay".
  Whatever you type into the card or UPI fields is ignored and never stored. Transaction IDs are
  generated in your browser. Every screen carries *DEMO PAYMENT – NO REAL MONEY IS CHARGED*, and
  tickets carry *DEMONSTRATION TICKET – NOT VALID FOR ENTRY*.
- **Bookings live in your browser.** There is no server, so bookings are kept in `localStorage`.
  They are visible only on this device and disappear if you clear site data. They are demonstration
  records, not reservations.
- **Homestays, guides and experiences are demonstration listings.** They are badged DEMO and marked
  `is_demo` in the data. No real property or person is represented.
- **Provenance.** 172 records were written and checked by hand; the other 352 were harvested from
  Wikidata and English Wikipedia (each has a Wikidata item, coordinates from that record, and a
  description from the article lead, with a link back to the source article on the page). Where a
  district was inferred from coordinates rather than read from the administrative record, the page
  says "district estimated from coordinates". Harvested listings show entry fees and hours as
  "not verified" rather than inventing them.
- **Destinations are real, gaps are shown.** Descriptions, districts and categories are compiled from
  public sources; coordinates were checked against OpenStreetMap, and where no reliable match was
  found the page says the coordinate is approximate. Fees and opening hours appear as indicative
  notes with a reminder to confirm at the site — no fee or timing was invented to fill a field.
- **Photos** come from Wikimedia Commons, hot-linked, with author and licence credited under each
  gallery.
- **Translations.** The interface is fully translated. Six headline destination descriptions have
  checked Hindi and Kannada versions; for the rest the page says the translation is not available
  rather than showing English as if it were translated.

---

## 4. Structure

```
karnataka-tourism-website/
├── index.html … contact.html      14 pages (static HTML, content rendered by app.js)
├── assets/
│   ├── css/style.css              design tokens, light + dark themes, responsive, print styles
│   └── js/
│       ├── data.js                generated dataset (destinations, homestays, guides, experiences)
│       ├── i18n.js                interface strings: en, hi, kn
│       ├── content.js             checked Hindi/Kannada descriptions by destination id
│       ├── app.js                 rendering, filters, i18n, theming, booking + payment flow
│       └── qrcode.js              vendored qrcode-generator (MIT, Kazuhiko Arase)
├── data/
│   ├── seed.json                  source dataset
│   └── translations/              en.json, hi.json, kn.json, content.json
└── build_site.py                  regenerates data.js, content.js, i18n.js and the pages
```

### Editing or extending

Everything is driven by `data/seed.json`. To add a destination, append a record to
`destinations` (fields: `name`, `district`, `district_id`, `category`, `lat`, `lon`,
`coord_source`, `description`, `fee_note`, `hours`, `season`, `facilities`, `accessibility`,
`demo_price`, `bookable`, `photos[]`), then rebuild:

```bash
python3 build_site.py
```

The pages themselves do not need editing — lists, detail pages, map markers and search indexes are
generated from the data at runtime.

---

## 5. Notes

- The map, photographs and fonts load from the internet; with no connection the site still works
  but shows empty photo frames and a blank map.
- The static build has no user accounts and no review moderation; those need the server version of
  this project.
- Tested in Chromium at 1280 px and 390 px widths. Layout is responsive from 360 px up.
