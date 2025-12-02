# Poor Man's Brand Kit - Roadmap

État des lieux et pistes d'amélioration. Pas de bullshit corporate, pas de sprints, pas de story points. Juste des trucs utiles à faire quand t'as 30 minutes devant toi.

---

## État actuel

**4000 lignes** réparties en 3 fichiers :
- `app.js` — 1888 lignes, une grosse classe `BrandKitGenerator`
- `index.html` — 664 lignes, structure + fonts embarquées
- `style.css` — 1468 lignes, tout en vrac

Ça marche. C'est pas joli côté code, mais ça fait le job.

---

## Ce qui pue (dette technique)

### 1. `app.js` est un monolithe

Une seule classe de ~1900 lignes qui fait :
- Gestion d'état (lines, fonts, colors)
- Manipulation DOM (render editors, modals)
- Rendu canvas (previews, icons)
- Rendu SVG (opentype.js)
- Export ZIP
- LocalStorage
- Event binding

**Problème** : Impossible de toucher un truc sans risquer d'en casser trois autres.

**Fix potentiel** : Découper en modules (ES6) quand ça devient vraiment ingérable. Pas urgent tant que ça marche.

### 2. CSS sans structure

1468 lignes de CSS avec des commentaires `/* Section */` comme seule organisation. Pas de méthodologie (BEM, etc.), des sélecteurs qui se marchent dessus.

**Problème** : Ajouter un style = prier pour pas casser autre chose.

**Fix potentiel** :
- Soit on s'en fout (ça marche)
- Soit on passe en CSS custom properties pour les valeurs répétées
- Soit on split en fichiers thématiques (base, components, layout)

### 3. Fonts inline dans le HTML

La liste des Google Fonts est hardcodée dans `<select>` dans le HTML. ~100 fonts = beaucoup de lignes.

**Problème** : Ajouter/retirer une font = éditer le HTML.

**Fix potentiel** : Externaliser dans un `fonts.json` et générer dynamiquement. Overkill pour maintenant.

### 4. Pas de build step

Vanilla JS, vanilla CSS, pas de bundler. C'est un choix, pas un oubli.

**Avantage** : Zéro config, ouvre le fichier et ça marche.

**Inconvénient** : Pas de minification, pas de tree-shaking, pas de TypeScript.

**Verdict** : On garde comme ça. Un bundler pour 4000 lignes c'est du overhead inutile.

---

## Améliorations utiles (par priorité)

### Priorité 1 : Quick wins

- [ ] **Supprimer `the-poor-man.png`** — 2MB inutiles, on a `avatar.webp` (4KB)
- [ ] **Ajouter `.gitignore`** — ignorer `.DS_Store`, éventuels fichiers de test
- [ ] **Nettoyer les fichiers MD obsolètes** — `solution.md`, `plan-icons-logo-separation.md`, `instructions.md` si plus utiles

### Priorité 2 : DX (Developer Experience)

- [ ] **Extraire les constantes magiques** — tailles de preview (512, 256, 128...), padding ratios, etc. dans un objet `CONFIG` en haut de `app.js`
- [ ] **Documenter les méthodes principales** — JSDoc basique sur les 10-15 méthodes clés
- [ ] **Ajouter un `README.md`** — comment lancer, comment contribuer, licence

### Priorité 3 : Refacto légère

- [ ] **Séparer le rendering** — extraire `renderSvgPreview()`, `renderPreviews()`, `renderAppIcons()` dans un module `renderer.js`
- [ ] **Séparer l'export** — extraire `generateKit()` et tout le ZIP dans `exporter.js`
- [ ] **Séparer le storage** — extraire `saveConfig()`, `loadConfig()`, `getSavedConfigs()` dans `storage.js`

### Priorité 4 : Features potentielles

- [ ] **Export PNG direct** — sans passer par le ZIP, pour un usage rapide
- [ ] **Presets de couleurs** — quelques palettes prédéfinies (noir/blanc, couleurs vives, pastels)
- [ ] **Undo/Redo** — stocker l'historique des états (overkill mais cool)
- [ ] **Import de config** — uploader un JSON pour restaurer une config

---

## Ce qu'on ne fera PAS

- **Framework JS** — React/Vue/Svelte pour 4000 lignes, non merci
- **TypeScript** — overhead de setup pour un projet solo
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

## Notes perso

Le code est moche mais il marche. L'utilisateur s'en fout de la beauté du code, il veut son logo.

Refactoriser pour le plaisir = temps perdu.
Refactoriser quand ça bloque = temps bien investi.

On est dans la catégorie "ça marche, on touche pas trop".
