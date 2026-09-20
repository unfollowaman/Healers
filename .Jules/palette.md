## 2026-09-16 - Modal Focus Restoration & Contextual Action Button ARIA Labels
**Learning:** Opening modals should store `document.activeElement` and transfer focus directly to the primary input so screen reader and keyboard users can immediately interact with the overlay without manual tabbing. Upon modal dismissal, focus must be restored to the triggering element. Additionally, icon buttons repeated in list rows require track-specific `aria-label`s (e.g. `Remove "Song Title" from playlist`) so screen reader users hear clear context instead of ambiguous generic action titles.
**Action:** Always capture and restore focus when toggling modal overlays, and include descriptive entity names in row action `aria-label` attributes.

## 2026-09-15 - Input Hotkey Safety & Escape Key Modal Dismissal
**Learning:** Global media keydown shortcuts (`Space` for play/pause, arrow keys for seeking) interfere with user text input across search bars and modals unless explicitly guarded against focused form elements (`INPUT`, `TEXTAREA`, `SELECT`, `isContentEditable`). Supporting `Escape` key dismissal provides an intuitive, accessible way to exit overlay UI states and blur active inputs.
**Action:** Always check `e.target` element types before processing global hotkeys in media player apps, and handle `Escape` key events to close open modals and dropdowns.
