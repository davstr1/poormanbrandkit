# Bug : LineSpacing non respecté dans le preview SVG principal

## Symptôme

Après le fix du centrage vertical dans le canvas (commit 72bafc1), le preview SVG principal ne respecte plus correctement le lineSpacing. Les lignes se chevauchent beaucoup plus que dans les previews canvas/app icons.

## Cause identifiée

Le problème vient de la **différence de calcul entre les deux phases** de `renderSvgPreview()` :

### Phase 1 : Calcul des dimensions (lignes 1150-1176)

```javascript
const lineHeight = lineFontSize * 1.2;  // Approximation fixe
totalHeight += lineHeight;
if (index < this.lines.length - 1) {
    totalHeight += this.lineSpacing;  // lineSpacing appliqué ici
}
```

Cette phase utilise `lineHeight = fontSize * 1.2` et applique `lineSpacing` entre les lignes.

### Phase 2 : Positionnement pour le dessin (lignes 1246-1273)

```javascript
let currentY = padding;
// ...
const y = currentY + lineFontSize;  // Position Y = currentY + fontSize (pas lineHeight!)
// ...
currentY += lineHeight + this.lineSpacing;
```

Le problème : **`y = currentY + lineFontSize`** positionne la baseline à `currentY + fontSize`, mais ensuite **`currentY += lineHeight + this.lineSpacing`** avance de `lineHeight (fontSize * 1.2) + lineSpacing`.

### Calcul de l'écart réel entre les baselines

Pour deux lignes avec fontSize=100 et lineSpacing=-20 :

- Ligne 1 baseline : `y = padding + 100 = 140` (avec padding=40)
- Avance : `currentY += 120 + (-20) = 100`
- Ligne 2 baseline : `y = 140 + 100 = 240` (attend...)

Non, recalculons :
- `currentY` initial = 40 (padding)
- Ligne 1 : `y = 40 + 100 = 140`
- `currentY = 40 + 120 + (-20) = 140`
- Ligne 2 : `y = 140 + 100 = 240`

Donc l'écart entre baselines = 240 - 140 = **100px**

### Comparaison avec le canvas (renderer.js)

Dans le canvas, on calcule :
```javascript
currentBaseline += metrics.descent + state.lineSpacing + nextAscent;
```

L'écart entre baselines = descent + lineSpacing + nextAscent

Avec des valeurs typiques (ascent ~80, descent ~20) et lineSpacing=-20 :
- Écart = 20 + (-20) + 80 = **80px**

### Conclusion

Le SVG utilise un écart de **100px** (basé sur fontSize), alors que le canvas utilise un écart de **~80px** (basé sur les vraies métriques). Avec un lineSpacing négatif, cette différence est amplifiée.

En plus, le SVG ne prend pas en compte les vraies dimensions des glyphes (ascent/descent réels), il utilise des approximations.

---

## Solution proposée

Appliquer la **même logique** que le canvas dans le SVG :

1. Utiliser `glyph.getBoundingBox()` d'opentype.js pour obtenir les vrais ascent/descent
2. Calculer les positions de baseline de la même façon :
   ```javascript
   currentBaseline += descent + lineSpacing + nextAscent;
   ```
3. Positionner chaque ligne à sa baseline calculée

### Code actuel à modifier

```javascript
// AVANT (app.js ligne 1261)
const y = currentY + lineFontSize;
// ...
currentY += lineHeight + this.lineSpacing;
```

### Code proposé

```javascript
// APRÈS - utiliser les métriques opentype
linesData.forEach((lineData, index) => {
    // Calculer ascent/descent réels via getBoundingBox()
    let maxAscent = 0;
    let maxDescent = 0;
    lineData.positions.forEach(({ font, letter, lineFontSize }) => {
        const glyph = font.charToGlyph(letter.char);
        const bbox = glyph.getBoundingBox();
        const scale = lineFontSize / font.unitsPerEm;
        maxAscent = Math.max(maxAscent, bbox.y2 * scale);
        maxDescent = Math.max(maxDescent, -bbox.y1 * scale);  // y1 est négatif
    });
    lineData.ascent = maxAscent;
    lineData.descent = maxDescent;
});

// Calculer les positions de baseline (même logique que canvas)
const baselinePositions = [];
let currentBaseline = 0;

linesData.forEach((lineData, i) => {
    if (i === 0) {
        currentBaseline = lineData.ascent;
    }
    baselinePositions.push(currentBaseline);

    if (i < linesData.length - 1) {
        currentBaseline += lineData.descent + this.lineSpacing + linesData[i + 1].ascent;
    }
});

// Dessiner à la baseline correcte
linesData.forEach((lineData, i) => {
    const y = padding + baselinePositions[i];
    // ... dessiner les paths
});
```

---

## Fichiers à modifier

| Fichier | Fonction | Modification |
|---------|----------|--------------|
| `app.js` | `renderSvgPreview()` | Utiliser getBoundingBox() et calculer les baselines comme dans le canvas |

---

## Bénéfice attendu

- Le preview SVG aura le **même espacement** que les previews canvas
- Cohérence WYSIWYG entre le preview principal et les exports
- Le centrage vertical sera aussi corrigé dans le SVG (bonus)
