# Plan d'implémentation : Centrage vertical via TextMetrics

## Contexte révisé

### Le vrai problème

Le décentrage vertical se voit principalement sur les **app icons** (iOS/Android) et les **previews de tailles** (512px, 256px, etc.) - tous rendus via **canvas**.

Avec un `lineSpacing` négatif, le bloc de texte apparaît décalé vers le haut : plus d'espace en bas qu'en haut.

### Contrainte technique

On ne peut **pas** utiliser opentype.js pour le rendu canvas - ça donne un résultat de mauvaise qualité (aliasing). On doit garder `ctx.fillText()`.

### Solution : TextMetrics API

`ctx.measureText()` retourne des métriques qui incluent les vraies dimensions visuelles :

```javascript
const metrics = ctx.measureText(text);
metrics.actualBoundingBoxAscent   // Distance baseline → haut réel du texte
metrics.actualBoundingBoxDescent  // Distance baseline → bas réel du texte
```

Support navigateurs : Chrome 77+, Firefox 74+, Safari 11.1+ ✓

---

## Architecture actuelle (renderer.js)

```javascript
renderMultiLineText(ctx, size, state, padding) {
    // 1. Calcul des métriques avec lineHeight = fontSize * 1.1
    const lineHeight = lineFontSize * 1.1;
    totalHeight += lineHeight;
    totalHeight += state.lineSpacing;  // ← spacing négatif réduit totalHeight

    // 2. Calcul du startY pour centrer
    const scaledTotalHeight = totalHeight * scale;
    let startY = (size - scaledTotalHeight) / 2;

    // 3. Dessin avec textBaseline = 'top'
    ctx.textBaseline = 'top';
    ctx.fillText(letter.char, x, startY);
    startY += scaledLineHeight + scaledLineSpacing;
}
```

**Problème** : `lineHeight = fontSize * 1.1` est une approximation qui ne correspond pas à la vraie hauteur visuelle des glyphes.

---

## Solution proposée

### Principe

1. Utiliser `actualBoundingBoxAscent` et `actualBoundingBoxDescent` pour chaque ligne
2. Calculer la vraie bounding box du bloc complet
3. Centrer en fonction de cette bounding box réelle

### Nouveau flux de calcul

```
Pour chaque ligne :
├── Mesurer ascent/descent réels via TextMetrics
├── Calculer la position de baseline
└── Accumuler pour la bounding box totale

Calculer le décalage vertical pour centrer la bounding box réelle
Dessiner chaque ligne à sa baseline corrigée
```

---

## Implémentation détaillée

### Étape 1 : Collecter les vraies métriques

```javascript
// Dans renderMultiLineText(), après avoir défini ctx.font pour chaque ligne

state.lines.forEach((line, index) => {
    ctx.font = `${lineFontWeight} ${lineFontSize}px "${state.font}"`;

    // Mesurer un caractère représentatif ou le texte complet
    // On prend le max ascent et min descent de tous les caractères
    let maxAscent = 0;
    let maxDescent = 0;

    line.letters.forEach((letter) => {
        const metrics = ctx.measureText(letter.char);
        maxAscent = Math.max(maxAscent, metrics.actualBoundingBoxAscent);
        maxDescent = Math.max(maxDescent, metrics.actualBoundingBoxDescent);
    });

    lineMetrics.push({
        // ... existing fields ...
        ascent: maxAscent,
        descent: maxDescent,
        visualHeight: maxAscent + maxDescent
    });
});
```

### Étape 2 : Calculer la bounding box totale

```javascript
// Calculer les positions de baseline et la bounding box réelle
let currentBaseline = 0;
const baselinePositions = [];

lineMetrics.forEach((metrics, i) => {
    if (i === 0) {
        // Première ligne : baseline = ascent (pour que le haut soit à y=0)
        currentBaseline = metrics.ascent;
    }

    baselinePositions.push(currentBaseline);

    // Avancer pour la ligne suivante
    // On utilise la vraie hauteur visuelle + spacing
    if (i < lineMetrics.length - 1) {
        currentBaseline += metrics.descent + state.lineSpacing + lineMetrics[i + 1].ascent;
    }
});

// Bounding box réelle
const firstAscent = lineMetrics[0].ascent;
const lastDescent = lineMetrics[lineMetrics.length - 1].descent;
const lastBaseline = baselinePositions[baselinePositions.length - 1];

const visualTop = 0;  // Le haut de la première ligne
const visualBottom = lastBaseline + lastDescent;
const totalVisualHeight = visualBottom - visualTop;
```

### Étape 3 : Centrer et dessiner

```javascript
// Calculer le scale pour fitter dans l'espace disponible
const scaleX = availableSize / maxLineWidth;
const scaleY = availableSize / totalVisualHeight;
const scale = Math.min(scaleX, scaleY, 1);

// Centrer verticalement
const scaledVisualHeight = totalVisualHeight * scale;
const offsetY = (size - scaledVisualHeight) / 2;

// Dessiner chaque ligne à sa baseline
ctx.textBaseline = 'alphabetic';  // Important : on positionne par baseline maintenant

lineMetrics.forEach((metrics, i) => {
    const scaledBaseline = baselinePositions[i] * scale;
    const y = offsetY + scaledBaseline;

    // Dessiner les lettres à cette baseline
    drawOrder.forEach(({ letter, x }) => {
        ctx.fillStyle = letter.color || state.defaultColor;
        ctx.fillText(letter.char, x, y);
    });
});
```

---

## Fichiers à modifier

| Fichier | Fonction | Modification |
|---------|----------|--------------|
| `renderer.js` | `renderMultiLineText()` | Refactorer pour utiliser TextMetrics |

C'est tout. Une seule fonction à modifier.

---

## Changements clés

| Avant | Après |
|-------|-------|
| `lineHeight = fontSize * 1.1` | `visualHeight = ascent + descent` (mesuré) |
| `textBaseline = 'top'` | `textBaseline = 'alphabetic'` |
| Positionnement par le haut | Positionnement par baseline |
| Centrage sur hauteur approximative | Centrage sur bounding box réelle |

---

## Cas particuliers à gérer

### 1. Caractères sans descender (majuscules)
- `actualBoundingBoxDescent` sera ~0 ou très petit
- Le calcul reste correct

### 2. Caractères avec grand descender (g, y, p, q)
- `actualBoundingBoxDescent` sera plus grand
- Le centrage prendra ça en compte

### 3. Spacing négatif extrême
- Les lignes se chevauchent visuellement
- La bounding box totale sera plus petite
- Le centrage sera correct par rapport à cette bounding box compacte

### 4. Une seule ligne
- Pas de spacing à appliquer
- Le calcul se simplifie : centrer la hauteur visuelle de cette ligne

---

## Tests de validation

1. **Spacing positif (+20px)** : Visuellement identique à avant (ou très proche)
2. **Spacing zéro (0px)** : Lignes collées, bloc centré
3. **Spacing négatif (-20px)** : Lignes chevauchées, bloc centré ✓
4. **Une seule ligne** : Pas de régression
5. **Texte tout en majuscules** : Centré (pas de descender)
6. **Texte avec descenders (gyp)** : Centré en tenant compte du descender
7. **App icons iOS/Android** : Correctement centrés
8. **Previews de tailles** : Correctement centrés
9. **Export PNG** : Identique aux previews

---

## Impact sur le SVG

Le SVG principal (`renderSvgPreview()` dans app.js) utilise opentype.js et a son propre système de calcul. Pour l'instant on ne le modifie pas.

Si nécessaire plus tard, on pourra appliquer la même logique avec `glyph.getBoundingBox()` d'opentype.js.

---

## Résumé

**Une seule fonction à modifier** : `renderMultiLineText()` dans `renderer.js`

**Changement principal** : Remplacer l'approximation `lineHeight = fontSize * 1.1` par les vraies métriques `actualBoundingBoxAscent` et `actualBoundingBoxDescent`.

**Résultat** : Centrage vertical correct même avec un spacing négatif, tout en gardant `ctx.fillText()` pour la qualité de rendu.
