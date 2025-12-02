# Poor Man's Brand Kit - Roadmap

État des lieux et pistes d'amélioration. Pas de bullshit corporate, pas de sprints, pas de story points. Juste des trucs utiles à faire quand t'as 30 minutes devant toi.

---

## État actuel

**~4650 lignes** réparties en 6 fichiers :
- `app.js` — 1723 lignes, classe principale `BrandKitGenerator`
- `renderer.js` — 242 lignes, rendu canvas
- `exporter.js` — 385 lignes, génération ZIP
- `storage.js` — 130 lignes, localStorage
- `index.html` — 667 lignes, structure + fonts embarquées
- `style.css` — 1522 lignes, styles avec CSS variables

Ça marche. Le code est maintenant modulaire et documenté.

---

## Ce qui a été fait ✅

### Priorité 1 : Quick wins ✅
- [x] **`.gitignore` ajouté** — ignore `.DS_Store`, fichiers éditeurs, etc.
- [x] **Fichiers MD obsolètes supprimés** — `solution.md`, `plan-icons-logo-separation.md`, `instructions.md`

### Priorité 2 : DX (Developer Experience) ✅
- [x] **Constantes magiques extraites** — objet `CONFIG` en haut de `app.js` avec toutes les tailles, paddings, defaults
- [x] **Documentation JSDoc** — 15+ méthodes principales documentées
- [x] **`README.md` ajouté** — présentation, usage, tech stack

### Priorité 3 : Refacto légère ✅
- [x] **`renderer.js` créé** — `renderMultiLineText()`, `renderAppIcon()`, `renderToCanvas()`, `renderPreviews()`
- [x] **`exporter.js` créé** — `generateBrandKit()`, `generateSVG()`, `fetchFullFont()`, génération README/LICENSE
- [x] **`storage.js` créé** — `saveConfig()`, `getSavedConfigs()`, `deleteConfig()`, `parseConfig()`

---

### Priorité 4 : Nettoyage CSS ✅

- [x] **CSS custom properties** — `:root` avec 25+ variables (couleurs, borders, shadows, transitions, spacing)
- [x] **Palette de couleurs cohérente** — toutes les couleurs passent par les variables
- [x] **Couleurs hardcodées éliminées** — de ~150 à 14 (uniquement dans `:root`)

### Priorité 5 : Nettoyage JS ✅

- [x] **Méthodes dupliquées supprimées** — `renderMultiLineText()`, `renderAppIcon()` supprimés de app.js
- [x] **Console.log de debug supprimés** — code plus propre
- [x] **app.js réduit** — de 1893 à 1723 lignes (-170 lignes)

---

## Ce qui reste à faire

### Priorité 6 : Organisation CSS 🟡

21 sections dans un seul fichier, c'est gérable mais pas idéal.

**Option A (simple) :** Garder un seul fichier mais mieux organisé avec les variables
**Option B (clean) :** Splitter en fichiers :
- `base.css` — reset, typography, variables
- `layout.css` — container, header, main, sections
- `components.css` — buttons, inputs, cards, modals
- `popover.css` — font popover (c'est un gros morceau)

### Priorité 7 : Fonts externes 🟢

~100 fonts hardcodées dans un `<select>` caché dans le HTML.

**À faire (optionnel) :**
- [ ] **Externaliser dans `fonts.json`** — liste des fonts par catégorie
- [ ] **Générer dynamiquement** — charger le JSON et construire le select

---

## Features potentielles (backlog)

- [ ] **Export PNG direct** — sans passer par le ZIP, pour un usage rapide
- [ ] **Presets de couleurs** — quelques palettes prédéfinies (noir/blanc, couleurs vives, pastels)
- [ ] **Undo/Redo** — stocker l'historique des états
- [ ] **Import de config** — uploader un JSON pour restaurer une config
- [ ] **Thème sombre** — pour l'interface elle-même

---

## Ce qu'on ne fera PAS

- **Framework JS** — React/Vue/Svelte pour ce projet, non merci
- **TypeScript** — overhead de setup pour un projet solo
- **Bundler** — webpack/vite/parcel, c'est overkill ici
- **Tests unitaires** — le ROI est pas là pour un outil visuel
- **CI/CD** — c'est du HTML/JS statique, on push et c'est live
- **Analytics** — on a dit "no data sent to server", on tient parole
- **Monetization** — c'est free comme la bière du bar

---

## Comment contribuer

1. Fork
2. Fais ton truc
3. PR avec une description claire
4. Pas de PR de 47 fichiers qui "refactorise tout"

---

## Notes

Le code est propre et modulaire maintenant. Les prochaines améliorations sont du polish, pas de l'urgence.

Ordre recommandé :
1. CSS variables (impact visuel nul, mais code plus maintenable)
2. Supprimer doublons JS (réduire la taille de app.js)
3. Split CSS si ça devient ingérable

Pas la peine de tout faire d'un coup. Un truc à la fois, quand t'as le temps.
