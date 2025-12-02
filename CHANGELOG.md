# Changelog — The Poor Man's Brand Kit Maker

Historique des modifications du projet.

---

## [Unreleased]

### Added
- Step 0 barré ("Figure out what your product even does — and a name")
- Bouton "Back to top" fixé en bas à droite
- Document `ANALYSIS.md` (analyse features, wording, UX)

### Changed
- Avatar cowboy légèrement agrandi (100px → 110px) avec marge négative élégante

### Fixed
- Messages toast traduits FR → EN (Color copied, Color pasted, Invalid color, Cannot read clipboard, Delete)

---

## [2024-12-02] — Refactor & Clean up

### Added
- **CSS Variables** : 25+ custom properties dans `:root`
  - Couleurs : `--color-text`, `--color-white`, `--color-gray-*`, `--color-danger`, etc.
  - Borders : `--border-color`, `--border-radius-sm/md/lg`
  - Shadows : `--shadow-sm/md/lg`
  - Transitions : `--transition-fast/normal/slow`
  - Spacing : `--spacing-xs/sm/md/lg/xl`

- **Modules JS** :
  - `renderer.js` (242 lignes) — Rendu canvas multi-ligne, app icons, previews
  - `exporter.js` (385 lignes) — ZIP, SVG, fonts, README génération
  - `storage.js` (130 lignes) — localStorage, save/load/delete configs

- **Documentation** :
  - `README.md` — Présentation projet, usage, tech stack
  - `ROADMAP.md` mis à jour avec état des lieux et priorités
  - JSDoc sur 15+ méthodes principales

- **CONFIG object** en haut de `app.js` :
  ```javascript
  const CONFIG = {
      MAX_LINES: 3,
      PREVIEW_SIZES: [...],
      EXPORT: { LOGO_SIZES, FAVICON_SIZES, IOS_SIZES, ANDROID_SIZES },
      RADIUS: { IOS: 0.2237, ANDROID: 0.15 },
      PADDING: { LOGO: 0.075, APP_ICON: 0.15, SVG: 40 },
      FONT_PREVIEW: { DROPDOWN: 22, CARD: 29, HEADER: 32 },
      DEFAULTS: { FONT, FONT_WEIGHT, BASE_FONT_SIZE, ... }
  };
  ```

### Changed
- Couleurs hardcodées remplacées par CSS variables (~150 → 14)
- `app.js` réduit de 1893 → 1723 lignes (-170 lignes)
- Méthodes dupliquées supprimées (`renderMultiLineText`, `renderAppIcon`)
- Console.log de debug supprimés

### Removed
- Fichiers MD obsolètes : `instructions.md`, `solution.md`, `plan-icons-logo-separation.md`

---

## [2024-12-01] — Initial state

### Features existantes
- Multi-line logo editor (max 3 lignes)
- 100+ Google Fonts
- Couleur par lettre
- Export ZIP complet (PNG, SVG, favicons, iOS, Android, font TTF)
- Saved configurations (localStorage)
- Preview temps réel avec opentype.js

### Tech Stack
- Vanilla JS (pas de framework)
- Canvas API + opentype.js
- JSZip pour export
- Google Fonts API
- Zero build step

---

## Conventions

- **Added** : Nouvelles features
- **Changed** : Modifications de features existantes
- **Fixed** : Corrections de bugs
- **Removed** : Features/code supprimés
- **Security** : Corrections de sécurité
