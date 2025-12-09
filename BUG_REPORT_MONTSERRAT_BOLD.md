# Bug Report: Petits carrés dans la preview SVG avec Montserrat Bold

## Symptômes

- Quand on ajoute une 2ème ligne à un logo avec Montserrat Bold
- La **preview générale (SVG)** affiche des petits carrés au lieu du texte
- Les autres previews (favicon, sizes) fonctionnent correctement
- Changer pour une autre variante (Extra Bold, Light) résout le problème
- Revenir à Bold réaffiche les carrés

## Cause racine

**RACE CONDITION** entre le chargement asynchrone des fonts subsettées et les modifications de texte.

---

## Explication technique

### Architecture des previews

| Preview | Technologie | Subsetting | Fichier |
|---------|-------------|------------|---------|
| Preview générale | SVG via opentype.js | OUI | `app.js:1054-1194` |
| Favicon preview | Canvas API | NON | `renderer.js:189-211` |
| Size previews | Canvas API | NON | `renderer.js:189-211` |

### Le problème

1. **`render()`** appelle `renderSvgPreview()` de manière **asynchrone sans await** (`app.js:1049`)

2. **`renderSvgPreview()`** charge les fonts via Google Fonts avec un paramètre `text=` pour le subsetting (`app.js:1255-1257`):
   ```javascript
   const allText = this.lines.map(l => l.text).join('');
   const textParam = encodeURIComponent(allText);
   const cssUrl = `...&text=${textParam}&display=swap`;
   ```

3. **Le subsetting** signifie que Google Fonts retourne une font contenant **UNIQUEMENT** les glyphes pour le texte demandé

4. **Si le texte change pendant le chargement** (ajout de ligne, modification), la font chargée ne contient pas les nouveaux caractères

5. **opentype.js** retourne le glyph `.notdef` (petit carré) pour les caractères manquants

### Pourquoi Montserrat Bold spécifiquement ?

- C'est le **poids par défaut** (`CONFIG.DEFAULTS.FONT_WEIGHT: '700'` - `app.js:53`)
- Les nouvelles lignes héritent de ce poids (`app.js:957-963`)
- Le timing de chargement de Montserrat Bold crée une fenêtre parfaite pour la race condition
- Les autres variantes peuvent charger plus vite/lentement, évitant le problème

### Pourquoi les autres previews fonctionnent ?

Les previews canvas chargent les fonts CSS **sans subsetting** (`app.js:304`):
```javascript
const cssUrl = `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@${weights}&display=swap`;
// Pas de paramètre text= → tous les glyphes sont inclus
```

---

## Timeline du bug

```
T=0ms      : Utilisateur tape "Brand" sur ligne 1
T=0.1ms    : render() appelle renderSvgPreview() async
T=0.5ms    : fetchAndDecompressFont() demande font subsettée pour "Brand"
T=2ms      : Utilisateur clique "+ Add line" → ligne 2 avec "Text"
T=2.2ms    : render() veut relancer renderSvgPreview() mais fontLoading=true → return!
T=500ms    : Font subsettée arrive (contient seulement: B, r, a, n, d)
T=501ms    : renderSvgPreview() dessine avec this.lines = ["Brand", "Text"]
T=501.1ms  : "T", "e", "x", "t" n'existent pas dans la font → PETITS CARRÉS
```

---

## Fichiers impliqués

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `app.js` | 1048-1051 | `render()` - n'attend pas renderSvgPreview |
| `app.js` | 1064-1066 | `renderSvgPreview()` - return si fontLoading |
| `app.js` | 1253-1271 | `fetchAndDecompressFont()` - subsetting |
| `app.js` | 1279-1292 | Cache des fonts opentype |
| `app.js` | 954-967 | `addLine()` - déclenche render |

---

## Solutions proposées

### Solution 1: Invalider le cache quand le texte change (Recommandée)

Dans `fetchAndDecompressFont()`, inclure le texte dans la clé de cache :

```javascript
// Avant (app.js:1280)
const cacheKey = `${this.font}:${weight}`;

// Après
const allText = this.lines.map(l => l.text).join('');
const cacheKey = `${this.font}:${weight}:${allText}`;
```

**Avantage**: Simple, corrige le problème de désynchronisation
**Inconvénient**: Plus de requêtes réseau si le texte change souvent

### Solution 2: Ne pas subsetter les fonts OpenType

Dans `fetchAndDecompressFont()`, retirer le paramètre `text=` :

```javascript
// Avant (app.js:1257)
const cssUrl = `...&text=${textParam}&display=swap`;

// Après
const cssUrl = `...&display=swap`;
```

**Avantage**: Plus simple, élimine le problème
**Inconvénient**: Téléchargements de fonts plus lourds

### Solution 3: Re-render après chargement des fonts

Forcer un nouveau render complet si `this.lines` a changé pendant le chargement :

```javascript
// Dans renderSvgPreview(), après await preloadAllWeights()
const currentText = this.lines.map(l => l.text).join('');
if (currentText !== initialText) {
    this.fontLoading = false;
    return this.renderSvgPreview(); // Re-render avec le texte actuel
}
```

**Avantage**: Garde le subsetting, corrige la race condition
**Inconvénient**: Potentiellement plusieurs renders

### Solution 4: Attendre renderSvgPreview dans render()

```javascript
// Avant (app.js:1048-1051)
render() {
    this.renderMainCanvas();
    this.renderPreviews();
    this.renderAppIcons();
}

// Après
async render() {
    await this.renderSvgPreview();
    this.renderPreviews();
    this.renderAppIcons();
}
```

**Avantage**: Garantit la synchronisation
**Inconvénient**: Ralentit le rendu global, UX moins réactive

---

## Recommandation

**Solution 3 + Solution 1 combinées** pour une correction robuste.

---

# PLAN D'IMPLÉMENTATION DÉTAILLÉ

## Stratégie choisie

Combiner :
- **Solution 3** : Détecter si le texte a changé pendant le chargement et re-render
- **Solution 1** : Inclure le texte dans la clé de cache pour éviter d'utiliser une font subsettée obsolète

## Modifications à effectuer

### 1. Modifier `getOpentypeFontForWeight()` (app.js:1279-1292)

**Problème actuel :**
```javascript
const cacheKey = `${this.font}:${weight}`;
```
La clé de cache ne tient pas compte du texte utilisé pour le subsetting. Une font subsettée pour "Brand" sera réutilisée même si le texte est maintenant "BrandKit".

**Modification :**
- Passer `allText` en paramètre à `getOpentypeFontForWeight()`
- Inclure le texte dans la clé de cache : `${this.font}:${weight}:${allText}`

**Attention :** Le cache grandit avec chaque combinaison texte/poids. C'est acceptable car :
- Les fonts sont relativement légères (subsettées)
- L'utilisateur ne tape pas des milliers de textes différents
- Alternative : limiter le cache aux N dernières entrées (LRU cache)

### 2. Modifier `preloadAllWeights()` (app.js:1299-1313)

**Problème actuel :**
```javascript
fontMap[weight] = await this.getOpentypeFontForWeight(weight);
```
Ne passe pas le texte actuel à `getOpentypeFontForWeight()`.

**Modification :**
- Calculer `allText` une seule fois au début
- Le passer à chaque appel de `getOpentypeFontForWeight(weight, allText)`
- Retourner aussi `allText` pour que `renderSvgPreview()` puisse vérifier s'il a changé

**Nouvelle signature de retour :**
```javascript
return { fontMap, textSnapshot: allText };
```

### 3. Modifier `fetchAndDecompressFont()` (app.js:1253-1271)

**Problème actuel :**
```javascript
const allText = this.lines.map(l => l.text).join('');
```
Recalcule `allText` à chaque appel, ce qui peut être incohérent si appelé à des moments différents.

**Modification :**
- Recevoir `allText` en paramètre au lieu de le recalculer
- Signature : `fetchAndDecompressFont(weight, allText)`

### 4. Modifier `renderSvgPreview()` (app.js:1064-1194)

**Problème actuel :**
Après `await this.preloadAllWeights()`, le code continue avec `this.lines` qui peut avoir changé pendant l'attente.

**Modification :**
Après le chargement des fonts, vérifier si le texte a changé :

```javascript
// Après ligne 1114
const { fontMap, textSnapshot } = await this.preloadAllWeights();

// Vérifier si le texte a changé pendant le chargement
const currentText = this.lines.map(l => l.text).join('');
if (currentText !== textSnapshot) {
    // Le texte a changé, on doit re-render avec le nouveau texte
    this.fontLoading = false;
    this.renderSvgPreview(); // Relancer (non-bloquant)
    return;
}
```

**Important :** Ne pas utiliser `await` sur le re-render pour éviter une boucle infinie bloquante.

### 5. Gérer le cas des poids qui changent aussi

**Problème potentiel non couvert initialement :**
Si l'utilisateur change le poids de la 2ème ligne (pas juste le texte), on a le même problème.

**Solution :**
Inclure aussi les poids dans le snapshot :
```javascript
const weightsSnapshot = this.lines.map(l => l.fontWeight || this.fontWeight).join(',');
```

Et vérifier que les deux (texte ET poids) n'ont pas changé.

## Ordre des modifications

1. **`fetchAndDecompressFont(weight, allText)`** - Ajouter paramètre `allText`
2. **`getOpentypeFontForWeight(weight, allText)`** - Ajouter paramètre et modifier clé de cache
3. **`preloadAllWeights()`** - Calculer et passer `allText`, retourner le snapshot
4. **`renderSvgPreview()`** - Vérifier le snapshot après chargement, re-render si changé

## Tests à effectuer après implémentation

1. **Test du bug original :**
   - Créer un logo avec "Brand" ligne 1
   - Rapidement ajouter une ligne 2 avec "Kit"
   - Vérifier que les deux lignes s'affichent correctement (pas de carrés)

2. **Test changement de texte pendant chargement :**
   - Taper "Hello"
   - Immédiatement changer pour "Hello World"
   - Vérifier que "World" s'affiche correctement

3. **Test changement de poids pendant chargement :**
   - Ligne 1 : "Brand" en Bold
   - Ajouter ligne 2 : "Kit"
   - Immédiatement changer ligne 2 en Light
   - Vérifier l'affichage correct

4. **Test de non-régression :**
   - Vérifier que l'export SVG fonctionne toujours
   - Vérifier que les previews canvas fonctionnent
   - Vérifier que le changement de font fonctionne

## Risques et mitigations

| Risque | Mitigation |
|--------|------------|
| Boucle infinie de re-render | Le `fontLoading` flag empêche les renders concurrents |
| Cache qui grandit trop | Acceptable pour usage normal ; option LRU si problème |
| Performance dégradée | Le re-render n'arrive que si le texte change pendant chargement (rare) |
| Export SVG cassé | `generateSVG()` utilise les mêmes fonctions - à vérifier |

## Impact sur `generateSVG()` et autres exports

### `generateSVG()` (app.js:1346-1419)

Cette fonction appelle `preloadAllWeights()` à la ligne 1347 :
```javascript
const fontMap = await this.preloadAllWeights();
```

**Modification nécessaire :**
```javascript
const { fontMap } = await this.preloadAllWeights();
```

Pas besoin de vérifier `textSnapshot` ici car :
- `generateSVG()` est appelé lors de l'export (action utilisateur explicite)
- Le texte ne change pas pendant l'export
- Pas de race condition possible dans ce contexte

### `exporter.js`

Ce fichier a sa propre fonction `fetchAndDecompressFont(fontName, fontWeight, text)` (ligne 37) qui prend **déjà** le texte en paramètre. Pas d'impact sur ce fichier.

---

## Résumé des fichiers à modifier

| Fichier | Fonction | Modification |
|---------|----------|--------------|
| `app.js` | `fetchAndDecompressFont()` | Ajouter paramètre `allText` |
| `app.js` | `getOpentypeFontForWeight()` | Ajouter paramètre `allText`, modifier clé cache |
| `app.js` | `preloadAllWeights()` | Calculer snapshot, retourner `{ fontMap, textSnapshot }` |
| `app.js` | `renderSvgPreview()` | Vérifier snapshot, re-render si changé |
| `app.js` | `generateSVG()` | Adapter à la nouvelle signature de retour |

**Total : 5 fonctions à modifier dans 1 fichier (`app.js`)**
