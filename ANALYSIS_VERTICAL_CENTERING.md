# Analyse : Centrage vertical avec line-spacing négatif

## Le problème observé

Quand le `lineSpacing` est négatif (ex: -20px), le logo multi-ligne n'apparaît plus centré verticalement dans le canvas. La première ligne semble trop haute par rapport à l'ensemble.

## Cause technique

Le calcul actuel de `totalHeight` :

```javascript
totalHeight += lineHeight;
if (index < this.lines.length - 1) {
    totalHeight += this.lineSpacing;  // peut être négatif
}
```

Le problème : **le lineSpacing négatif réduit `totalHeight`, mais le padding reste fixe**.

Exemple avec 2 lignes de 100px chacune et lineSpacing = -20px :
- `totalHeight` = 100 + (-20) + 100 = 180px (au lieu de 220px avec +20px)
- `svgHeight` = 180 + 40 (padding) + 40 (padding) = 260px
- La première ligne est placée à `y = padding + lineFontSize` = 40 + 100 = 140px

Le contenu est bien centré *mathématiquement* dans le SVG, mais visuellement, quand les lignes se chevauchent, l'espace vide au-dessus de la première ligne paraît disproportionné par rapport à l'espace sous la dernière ligne.

## Pourquoi ça paraît décentré ?

Avec un espacement négatif, les lignes se **superposent partiellement**. L'œil humain perçoit le "bloc visuel" comme étant plus compact que ce que les métriques suggèrent. Le padding symétrique autour d'un bloc où les lignes débordent les unes sur les autres crée une illusion de décentrage.

## Solutions possibles

### 1. Calculer la bounding box réelle des glyphes

**Principe** : Au lieu d'utiliser `lineHeight = fontSize * 1.2`, calculer la vraie hauteur occupée par les glyphes via `opentype.js` (ascender, descender, bounding box).

**Avantage** : Centrage pixel-perfect basé sur le contenu réel.

**Inconvénient** :
- Plus complexe à implémenter
- Nécessite de charger la font avant de calculer les dimensions
- Chaque font a des métriques différentes

### 2. Utiliser un padding proportionnel à totalHeight

**Principe** : Si `totalHeight` devient petit (à cause du spacing négatif), réduire le padding proportionnellement.

```javascript
const effectivePadding = Math.max(padding * (totalHeight / expectedHeight), minPadding);
```

**Avantage** : Simple à implémenter.

**Inconvénient** : Peut donner des résultats inconsistants selon les cas.

### 3. Limiter le lineSpacing minimum

**Principe** : Empêcher un lineSpacing trop négatif qui causerait un chevauchement excessif.

```javascript
const minSpacing = -lineHeight * 0.3; // Max 30% de chevauchement
const effectiveSpacing = Math.max(lineSpacing, minSpacing);
```

**Avantage** : Évite le problème à la source.

**Inconvénient** : Limite la liberté créative de l'utilisateur.

### 4. Centrer sur la bounding box combinée

**Principe** : Après le rendu, calculer la vraie bounding box de tous les paths SVG et recentrer.

**Avantage** : Centrage parfait garanti.

**Inconvénient** :
- Nécessite un double rendu (render → measure → reposition)
- Plus coûteux en performance

### 5. Ne rien faire (accepter le comportement)

**Principe** : Le spacing négatif est un cas d'usage avancé. L'utilisateur qui l'utilise comprend qu'il manipule un espace atypique.

**Avantage** : Aucun code à modifier.

**Inconvénient** : UX potentiellement frustrante.

## Recommandation

**Option 1 (bounding box réelle)** est la solution la plus propre mais la plus complexe.

**Option 3 (limiter le spacing)** est un bon compromis : simple et évite les cas extrêmes.

En pratique, un chevauchement au-delà de ~30-40% de la hauteur de ligne est rarement intentionnel et produit un résultat illisible de toute façon.

## Note

Le problème n'est pas un bug à proprement parler - c'est un effet secondaire prévisible d'un espacement négatif. La question est de savoir si on veut "protéger" l'utilisateur de ce cas ou lui laisser le contrôle total.
