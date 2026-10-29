---
name: accessibility-review
description: Audit a screen or component for WCAG 2.1 AA accessibility. Use when asked for an accessibility (a11y) review, or after significant UI changes.
---

# Accessibility Review

1. Read the Accessibility Baseline in `docs/quality.md`.
2. Run the app and open the screen under review.
3. Check, in this order:
   1. **Keyboard:** Tab through everything. Order is logical, focus is always
      visible, nothing traps focus except open dialogs, Escape closes dialogs.
   2. **Semantics:** headings in order, landmarks present, buttons vs links
      used correctly, lists are real lists, tables have headers.
   3. **Forms:** every input has a label, errors are linked to inputs
      (`aria-describedby`) and announced.
   4. **Contrast:** text 4.5:1, large text and UI parts 3:1, in every theme.
   5. **Images and icons:** meaningful `alt`; icon-only buttons have an
      accessible name.
   6. **Dynamic content:** loading and status messages use `aria-live` or
      `role="status"` / `role="alert"`.
   7. **Zoom:** usable at 200% zoom and 320 px width without horizontal scroll.
4. Run the automated scan: `@axe-core/playwright` in the E2E tests.
5. Report each issue with the WCAG criterion, where it occurs, and the fix.
