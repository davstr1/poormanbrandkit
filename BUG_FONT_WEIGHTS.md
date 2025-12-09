# Bug : Erreur CORS sur certains poids de police

## Symptôme

```
Access to fetch at 'https://fonts.googleapis.com/css2?family=Lato:wght@500&text=OUTFIIIT&display=swap'
from origin 'http://localhost:3847' has been blocked by CORS policy
```

## Diagnostic

**Ce n'est PAS une erreur CORS.** C'est une erreur HTTP 400 (Bad Request) déguisée.

Quand Google Fonts retourne une erreur 400, il n'inclut pas le header `Access-Control-Allow-Origin`, donc le navigateur rapporte ça comme une erreur CORS.

### Preuve

```bash
# Weight 500 (n'existe pas) → 400
curl -I "https://fonts.googleapis.com/css2?family=Lato:wght@500&display=swap"
HTTP/2 400

# Weight 700 (existe) → 200
curl -I "https://fonts.googleapis.com/css2?family=Lato:wght@700&display=swap"
HTTP/2 200
```

## Cause racine

**Toutes les polices n'ont pas tous les poids.**

Lato n'a que les poids : **100, 300, 400, 700, 900**

| Poids demandé | Existe | Résultat |
|---------------|--------|----------|
| 100 | ✅ | 200 OK |
| 200 | ❌ | 400 Bad Request |
| 300 | ✅ | 200 OK |
| 400 | ✅ | 200 OK |
| 500 | ❌ | 400 Bad Request |
| 600 | ❌ | 400 Bad Request |
| 700 | ✅ | 200 OK |
| 800 | ❌ | 400 Bad Request |
| 900 | ✅ | 200 OK |

### Où le problème se manifeste

1. **`loadFontWeights()`** (app.js:296) charge tous les poids en CSS :
   ```javascript
   const weights = '300;400;500;600;700;800;900';
   ```
   → Google Fonts CSS API est **tolérante** : elle ignore les poids inexistants

2. **`fetchAndDecompressFont()`** (app.js:1266) fetch un poids **spécifique** pour opentype.js :
   ```javascript
   const cssUrl = `...family=${fontFamily}:wght@${weight}&text=${textParam}&display=swap`;
   ```
   → Google Fonts **refuse** si le poids exact n'existe pas

## Le flux problématique

1. L'utilisateur sélectionne Lato avec poids 500 (Medium)
2. `loadFontWeights()` charge le CSS avec tous les poids → OK (Google Fonts ignore 500)
3. Le navigateur utilise un fallback (probablement 400) pour l'affichage canvas
4. `renderSvgPreview()` appelle `fetchAndDecompressFont("500", ...)`
5. Google Fonts retourne 400 Bad Request
6. Le navigateur voit pas de header CORS → rapporte comme erreur CORS
7. Le rendu SVG échoue

## Solutions proposées

### Solution 1 : Mapper vers les poids disponibles (Recommandée)

Créer une fonction qui mappe un poids demandé vers le poids disponible le plus proche.

```javascript
// Poids standards disponibles pour la plupart des polices Google
const STANDARD_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

// Poids disponibles par police (à maintenir ou fetch dynamiquement)
const FONT_WEIGHTS = {
    'Lato': [100, 300, 400, 700, 900],
    'Montserrat': [100, 200, 300, 400, 500, 600, 700, 800, 900],
    'Roboto': [100, 300, 400, 500, 700, 900],
    // ...
};

function getAvailableWeight(fontName, requestedWeight) {
    const available = FONT_WEIGHTS[fontName] || STANDARD_WEIGHTS;
    const requested = parseInt(requestedWeight);

    // Trouver le poids le plus proche
    return available.reduce((prev, curr) =>
        Math.abs(curr - requested) < Math.abs(prev - requested) ? curr : prev
    );
}
```

**Avantages :**
- Précis
- Pas de requêtes inutiles

**Inconvénients :**
- Nécessite de maintenir une liste des poids par police
- Ou faire un appel initial pour découvrir les poids disponibles

### Solution 2 : Fallback en cas d'erreur

Modifier `fetchAndDecompressFont()` pour essayer un poids alternatif si le poids demandé échoue.

```javascript
async fetchAndDecompressFont(weight, allText) {
    const fontFamily = this.font.replace(/ /g, '+');
    const textParam = encodeURIComponent(allText);

    // Poids à essayer dans l'ordre
    const weightsToTry = [weight, '400', '700', '300'];

    for (const w of weightsToTry) {
        const cssUrl = `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@${w}&text=${textParam}&display=swap`;
        try {
            const cssResponse = await fetch(cssUrl);
            if (cssResponse.ok) {
                const css = await cssResponse.text();
                const urlMatch = css.match(/url\(([^)]+)\)/);
                if (urlMatch) {
                    // ... reste du code
                    return ttfBuffer;
                }
            }
        } catch (e) {
            continue;
        }
    }
    throw new Error(`No available weight found for ${this.font}`);
}
```

**Avantages :**
- Simple à implémenter
- Auto-guérison

**Inconvénients :**
- Plusieurs requêtes réseau en cas d'échec
- Le poids final peut différer du poids demandé (incohérence visuelle)

### Solution 3 : Utiliser l'API CSS avec range (plus robuste)

Google Fonts CSS API accepte des ranges de poids et retourne ce qui existe :

```javascript
// Au lieu de demander un poids spécifique :
const cssUrl = `...wght@${weight}...`;

// Demander un range qui inclut le poids voulu :
const cssUrl = `...wght@100..900...`;
```

Puis parser le CSS retourné pour extraire les poids disponibles et utiliser le plus proche.

**Avantages :**
- Une seule requête
- Découvre automatiquement les poids disponibles

**Inconvénients :**
- Télécharge potentiellement plus de données
- Plus complexe à parser

### Solution 4 : Restreindre l'UI aux poids valides

Charger les métadonnées de la police sélectionnée et n'afficher que les poids disponibles dans le sélecteur.

```javascript
async loadFontMetadata(fontName) {
    // Requête pour découvrir les poids disponibles
    const cssUrl = `https://fonts.googleapis.com/css2?family=${fontName}:wght@100..900&display=swap`;
    const css = await (await fetch(cssUrl)).text();

    // Parser pour extraire les poids (regex sur font-weight dans @font-face)
    const weights = [...css.matchAll(/font-weight:\s*(\d+)/g)].map(m => m[1]);
    return [...new Set(weights)];
}
```

Puis mettre à jour le sélecteur de poids quand on change de police.

**Avantages :**
- UX cohérente (l'utilisateur ne peut pas choisir un poids invalide)
- Pas d'erreur possible

**Inconvénients :**
- Requête supplémentaire à chaque changement de police
- Refactoring de l'UI nécessaire

---

## Recommandation

**Solution 4** pour la meilleure UX, **combinée avec Solution 2** comme filet de sécurité.

1. Quand l'utilisateur change de police → charger les poids disponibles → mettre à jour le sélecteur
2. Si un poids invalide est demandé quand même (edge case) → fallback automatique

---

## Fichiers impactés

| Fichier | Fonction | Modification |
|---------|----------|--------------|
| `app.js` | `loadFontWeights()` | Découvrir les poids disponibles |
| `app.js` | `fetchAndDecompressFont()` | Ajouter fallback |
| `app.js` | `setupFontSelector()` ou similaire | Mettre à jour le sélecteur de poids |
| `index.html` | Sélecteur de poids | Rendre dynamique |
