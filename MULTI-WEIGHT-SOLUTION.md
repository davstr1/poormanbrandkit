# Solution pour le support multi-weight

## Problème actuel

1. **Preview principale** : Utilise SVG avec opentype.js pour convertir le texte en paths vectoriels. Opentype.js ne charge qu'une seule font (un seul weight) à la fois.

2. **Previews secondaires** (Sizes, App icons) : Utilisent Canvas avec les fonts CSS. Les fonts CSS sont chargées avec tous les weights, donc ça fonctionne.

3. **Export SVG** : Utilise opentype.js → même limitation qu'au point 1.

4. **Export PNG** : Utilise Canvas → fonctionne correctement avec multi-weight.

### Pourquoi SVG + opentype.js ?

Le SVG avec opentype.js convertit le texte en `<path>` vectoriels. Avantages :
- Le SVG exporté ne dépend pas de la font installée sur la machine de l'utilisateur
- Les paths sont précis et scalables à l'infini
- Pas besoin d'embarquer la font dans le SVG

---

## Solutions possibles

### Option A : Cache multi-fonts pour opentype.js

**Principe** : Charger et cacher une font opentype par weight utilisé.

```javascript
// Au lieu de :
this.opentypeFont = null;  // Une seule font

// On aurait :
this.opentypeFonts = {};   // { "700": font700, "400": font400, ... }
```

**Implémentation** :
1. Modifier `getOpentypeFont(weight)` pour accepter un weight en paramètre
2. Cacher chaque font par weight dans un objet
3. Dans `renderSvgPreview()` et `generateSVG()`, charger toutes les fonts nécessaires avant le rendu
4. Pour chaque ligne, utiliser la font du bon weight

**Avantages** :
- Garde le SVG avec paths vectoriels (pas de dépendance font)
- Preview = Export (WYSIWYG)

**Inconvénients** :
- Plus de requêtes réseau (une par weight)
- Plus de mémoire (une font par weight)
- Complexité accrue

**Effort estimé** : Moyen

---

### Option B : Unifier sur Canvas uniquement

**Principe** : Abandonner le SVG avec opentype pour la preview. Tout passer en Canvas.

**Implémentation** :
1. Remplacer `renderSvgPreview()` par un rendu Canvas
2. Pour l'export SVG, utiliser `<text>` avec `@font-face` embedded ou simplement ne plus exporter de SVG

**Avantages** :
- Code simplifié
- Multi-weight fonctionne immédiatement
- Performance améliorée (pas de chargement opentype)

**Inconvénients** :
- Perte du SVG avec paths vectoriels
- Si on garde le SVG avec `<text>`, il faudra que l'utilisateur ait la font installée

**Effort estimé** : Faible

---

### Option C : SVG avec fonts embarquées (base64)

**Principe** : Au lieu de paths, utiliser `<text>` dans le SVG avec la font embarquée en base64.

```svg
<svg>
  <defs>
    <style>
      @font-face {
        font-family: 'Montserrat';
        font-weight: 700;
        src: url(data:font/woff2;base64,...) format('woff2');
      }
      @font-face {
        font-family: 'Montserrat';
        font-weight: 400;
        src: url(data:font/woff2;base64,...) format('woff2');
      }
    </style>
  </defs>
  <text font-family="Montserrat" font-weight="700">Brand</text>
  <text font-family="Montserrat" font-weight="400">NAMASTE</text>
</svg>
```

**Avantages** :
- SVG autonome (font embarquée)
- Support multi-weight natif
- Preview Canvas = ce qu'on voit

**Inconvénients** :
- SVG plus lourd (fonts en base64)
- Moins "propre" que les paths vectoriels

**Effort estimé** : Moyen

---

### Option D : Hybride (recommandée)

**Principe** :
1. **Preview** : Canvas (rapide, multi-weight natif)
2. **Export PNG** : Canvas (déjà le cas)
3. **Export SVG** : Opentype avec multi-fonts cachées (Option A)

**Implémentation** :
1. Remplacer la preview principale par Canvas (comme les autres previews)
2. Garder opentype.js uniquement pour l'export SVG
3. Implémenter le cache multi-fonts pour l'export

**Avantages** :
- Preview rapide et réactive
- Export SVG de qualité (paths vectoriels)
- Séparation claire : preview ≠ export

**Inconvénients** :
- Preview et export SVG peuvent avoir de légères différences de rendu
- Complexité pour le cache multi-fonts

**Effort estimé** : Moyen-élevé

---

## Recommandation

**Option A (Cache multi-fonts)** semble le meilleur compromis :

1. On garde le comportement actuel (SVG avec paths)
2. On ajoute juste le support multi-weight
3. Preview = Export (WYSIWYG maintenu)

### Plan d'implémentation

1. **Modifier la structure de cache** :
   ```javascript
   this.opentypeFonts = {};  // { "fontName:weight": opentypeFont }
   ```

2. **Créer `getOpentypeFontForWeight(weight)`** :
   - Vérifie le cache
   - Si absent, télécharge la font avec ce weight
   - Retourne la font

3. **Modifier `renderSvgPreview()` et `generateSVG()`** :
   - Collecter tous les weights uniques des lignes
   - Précharger toutes les fonts nécessaires en parallèle
   - Pour chaque ligne, utiliser la font du bon weight

4. **Optimisation** : Charger les fonts en parallèle avec `Promise.all()`

### Code esquissé

```javascript
async getOpentypeFontForWeight(weight) {
    const cacheKey = `${this.font}:${weight}`;

    if (this.opentypeFonts[cacheKey]) {
        return this.opentypeFonts[cacheKey];
    }

    const ttfBuffer = await this.fetchAndDecompressFontWithWeight(weight);
    const font = opentype.parse(ttfBuffer);

    this.opentypeFonts[cacheKey] = font;
    return font;
}

async preloadAllWeights() {
    const weights = new Set();
    this.lines.forEach(line => {
        weights.add(line.fontWeight || this.fontWeight);
    });

    await Promise.all(
        [...weights].map(w => this.getOpentypeFontForWeight(w))
    );
}
```

---

## Décision requise

Quelle option préfères-tu ?

- **A** : Cache multi-fonts (garde SVG paths, plus complexe)
- **B** : Tout en Canvas (simple, perd SVG paths)
- **C** : SVG avec fonts embarquées (compromis)
- **D** : Hybride Canvas preview + SVG export multi-fonts
