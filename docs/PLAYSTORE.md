# Play Store Listing — Fika Takeaway

Copy for the Google Play Console app listing.

---

## App Details

| Field              | Value                              |
|--------------------|------------------------------------|
| App name           | Fika Takeaway                      |
| Package name       | com.fikatakeaway.app               |
| Category           | Business                           |
| Content rating     | Everyone                           |
| Target audience    | Staff (18+)                        |
| Free / Paid        | Free (unlisted / internal track)   |

---

## Short Description
*(80 characters max)*

> Shift reports, cash logs, and stock tracking for Fika Takeaway staff.

---

## Full Description
*(4000 characters max)*

```
Fika Takeaway Staff App

The official operations app for Fika Takeaway staff in Dillibazar, Kathmandu.

DESIGNED FOR BARISTAS
• Start and submit shift reports in minutes
• Step-by-step guided form: checklist → espresso → inventory → cash → waste → closing
• Auto-saves as a draft — never lose progress if you close the app
• Log expenses with one tap
• Get notified 10 minutes before your shift starts

DESIGNED FOR THE OWNER
• Dashboard with today's sales, drinks served, and weekly revenue chart
• Cash discrepancy detection: system flags differences over NPR 50
• Full shift review with espresso dial-in results, cash figures, and barista notes
• Monthly reports with revenue, expenses, waste, and top drinks
• Corporate membership management with drink usage tracking
• HR records: attendance, leave, incidents, salary

OFFLINE-FIRST
Your draft shift report is saved locally. You can fill in all 7 steps without internet. When you're back online, it syncs automatically.

SECURE
• PIN-based authentication for each staff member
• JWT-secured API
• No customer data stored

BUILT FOR FIKA
Every feature is built around how Fika actually operates — from the espresso calibration log to the NPR-denominated cash reconciliation.

---
For staff use only. Not available for public download.
```

---

## What's New (Release Notes)

### Version 1.0.0
- Initial release
- 7-step shift report form
- Cash discrepancy detection
- Corporate membership drink tracking
- Notion sync for backup
- Offline draft saving
- Push notifications for shift reminders

---

## Screenshots (required — 2–8 screenshots)

Recommended screenshots to capture:

1. **Splash screen** — green background, FIKA logo, tagline
2. **User select screen** — three profile cards (Barista 1, Barista 2, Owner)
3. **Barista home** — shift card with "Start Shift Report" button
4. **Shift form — Step 2** — espresso dial-in with taste assessment
5. **Shift form — Step 4** — cash log with discrepancy preview
6. **Owner dashboard** — metrics grid + weekly revenue chart
7. **Monthly report** — revenue breakdown and top drinks list
8. **Memberships screen** — corporate cards with drinks usage bars

Capture at: Pixel 6 or similar (1080×2400px), portrait orientation.

---

## App Icon

- Foreground: coffee cup emoji on white circle
- Background: `#6BCB77` (Fika green)
- Format: 512×512px PNG, no transparency on background layer

---

## Feature Graphic
*(1024×500px)*

Suggested design:
- Background: `#6BCB77`
- Left: `☕ FIKA` in white, bold, large
- Right: Phone mockup showing the dashboard
- Tagline: "Fast · Fresh · Consistent · Friendly"

---

## Privacy Policy URL

Host a minimal privacy policy page at your domain. Minimum required content:

> Fika Takeaway Staff App does not collect personal data from end users. The app stores operational business data (shift logs, cash records, inventory) on a private server accessible only to authorised Fika Takeaway staff. No data is sold or shared with third parties.

---

## Distribution

| Track    | Use                            |
|----------|--------------------------------|
| Internal | Initial testing (up to 100 testers by email) |
| Closed   | Invite-only beta               |
| Open     | Not recommended — staff only   |
| Production | Only if listed publicly      |

**Recommended:** Keep on **Internal** track. Share the download link directly with staff.

---

## Releasing

1. Build production AAB: `eas build --platform android --profile production`
2. Download `.aab` from EAS dashboard
3. Upload to Play Console → Internal Testing → Create release
4. Add release notes (copy from "What's New" above)
5. Review and roll out to 100%
6. Share internal test link with staff
