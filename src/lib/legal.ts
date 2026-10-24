/**
 * Status of the legal pages. They are a DRAFT prepared from what the website actually does; they have not been reviewed
 * by a lawyer. While `reviewed` is false a visible notice is shown at the top of both pages.
 * After the business owner has confirmed the details in docs/LEGAL_REVIEW_CHECKLIST.md and a legal professional has
 * reviewed the text, set `reviewed: true` and update `lastUpdated`.
 */
export const LEGAL = {
  reviewed: false,
  lastUpdated: '23 October 2026',
} as const;
