# Plan: Personal Website Cleanup & Game Improvements

## Context

Kyle Murray's personal research portfolio uses a Phaser 3 platformer game as the primary navigation interface. Visitors must play the game to reach research content pages. The site needs:
- A way to bypass the game and reach research pages directly
- Better game feel and UX
- Cleaner visual design

---

## 1. Skip-Game Option (highest priority)

Add an HTML overlay **on top of the Phaser canvas** (not inside Phaser) so it's accessible regardless of game state.

**Welcome modal** on first load (shown via a `<div id="welcome-overlay">`):
- Left column: Brief bio + "Play the Game" button
- Right column: "Browse Research" — a grid of the 4 research areas with icons and one-sentence descriptions, each a clickable link
- Clicking "Play the Game" dismisses the modal and starts the game
- ESC key also dismisses it

**Persistent floating button** (always visible after modal is dismissed):
- Bottom-right corner, labeled "Research ↗" with cyan styling
- Clicking re-shows the research links in a compact modal/drawer
- Styled consistent with the space theme (dark bg, cyan border)

Files modified: `index.html` (add overlay HTML + CSS + a small JS bootstrap before `main.js`)

---

## 2. Game Mechanics Improvements

### UFO behavior
- Change `attackMode` initial value from `true` to `false` — UFO starts patrolling
- Reduce `snakeSpeed` from 70 to 50
- Increase behavior-switch timer from 4–8 s to 10–20 s so the player has more time before it attacks
- Location: `main.js:36–39`, `main.js:713`

### Rocket pack visibility
- Move spawn from `(-100, -100)` (completely off-screen) to ~`(400, groundY - 80)` — visible on the starting screen
- Add a gentle pulsing glow text label "Rocket Pack →" above it
- Location: `main.js:359–365`

### Platform layout
- Reduce `x_offset` from `1200` to `600` so research platforms are reachable sooner without as much rightward scrolling
- Remove or reposition the "Original website" platform (currently at negative x, effectively hidden)
- Lower the research platform heights so the jump distances are more forgiving (currently stairstepping 100px each; reduce to 70px steps)
- Location: `main.js:219–232`

### Directional hint
- Add a fixed (scroll-factor 0) text element in the game pointing right: `"Research platforms →"` that fades out after 10 seconds
- Location: `main.js` in the `create()` function

### Instructions text cleanup
- Rewrite the instruction text to a single clean string at bottom: `"← → move  |  ↑ jump  |  SPACE enter platform  |  Avoid the UFO!"`
- Remove the ad-hoc concatenation with `'. Watch out for the UFO!'`
- Location: `main.js:150–158`, `main.js:668–671`

### Fix copyright year
- Change `'© 2025 Kyle Murray'` to `'© 2026 Kyle Murray'`
- Location: `main.js:501`

---

## 3. Visual / Design Improvements

### Bio panel in-game
- Wrap the bio text in a rounded-rect Phaser graphics object (semi-transparent dark background) so it's visually separated from the game world
- Add a subtle cyan border to match the overall palette
- Location: `main.js:108–135`

### Research platform icons
- Increase icon scale from `0.16` to `0.20` so they're more visible at 0.8 camera zoom
- Location: `main.js:289–315`

### Overall
- The `styles.css` background URL currently points to an external Phaser labs URL (`https://labs.phaser.io/assets/skies/space3.png`). This is fragile. If the user has a local copy or wants to switch, it should be a local asset reference. **Flag this to user** but don't change automatically.

---

## 4. Sub-page Consistency (light touch)

The `insar.html` (and other research pages) duplicate styles inline rather than using `styles.css`. This doesn't need a full refactor now, but we can:
- Add `<link rel="stylesheet" href="../styles.css">` to each research page's `<head>`
- Remove the duplicated `.platform-return-button`, `.read-more` inline styles (they already match `styles.css`)

Pages: `insar/insar.html`, `flooding/flooding.html`, `groundwater/groundwater.html`, `tectonics/tectonics.html`

---

## Files to Modify

| File | Changes |
|------|---------|
| `index.html` | Add welcome modal overlay HTML/CSS/JS |
| `main.js` | UFO behavior, rocket pack placement, platform layout, instructions text, copyright year, bio panel styling, direction hint |
| `insar/insar.html` | Link shared stylesheet, remove duplicate styles |
| `flooding/flooding.html` | Same |
| `groundwater/groundwater.html` | Same |
| `tectonics/tectonics.html` | Same |

---

## Verification

1. Open `index.html` in browser (or `npm start` via `server.js`)
2. Verify welcome modal appears on first load with both "Play Game" and "Browse Research" options
3. Click "Browse Research" — all 4 research links navigate correctly
4. Dismiss modal, play game — rocket pack visible near start position
5. Verify UFO starts in patrol mode (not immediately chasing)
6. Walk right — research platforms appear at reduced x_offset
7. Stand on platform, press SPACE — navigates to research page; "Return to platform" brings you back
8. Mobile: load in browser DevTools mobile mode; verify touch controls still work
9. Check copyright reads 2026
