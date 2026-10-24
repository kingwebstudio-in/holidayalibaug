# Legal review checklist (draft policies — not legal advice)

The privacy policy and terms were written from what the website actually does. They have not been reviewed by a lawyer. Notes: India's DPDP Rules were notified in November 2025 with the main notice/consent/retention duties phased in later (reported as May 2027); until then the IT Act and its rules apply — confirm current dates with your lawyer.

**You must confirm / decide (nothing below was invented in the pages):**
1. Legal entity name, registered address, and who operates the site.
2. Public contact e-mail/phone/address — enter them in Admin → Website settings; both pages show them automatically (otherwise they point to the enquiry form). A grievance/contact person for data requests.
3. **Retention period** for enquiries (pages say "as long as needed"); then schedule `npm run privacy -- purge`.
4. **Cancellation / refund / deposit terms** — the terms say these are agreed in writing; publish real ones only after you decide them.
5. Whether you really never sell or share data for marketing (policy says personal information is not sold).
6. Where your hosting and database are located (policy says some providers may be outside India).
7. Governing law / court jurisdiction city.
8. Which providers you actually use (e-mail, analytics) so the lists stay accurate.
9. Any age/ID/payment data you might later collect — the pages assume none.

When reviewed: set `reviewed: true` and the date in `src/lib/legal.ts` (this removes the draft notice).
