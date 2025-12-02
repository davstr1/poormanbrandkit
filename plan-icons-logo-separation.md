# Plan : Support Multi-lignes pour le Logo

## Résumé du besoin

Permettre de créer un logo sur plusieurs lignes (jusqu'à 3), avec des styles différents par ligne.

**Pour les icônes** : Si l'utilisateur veut un design différent pour les petites tailles, il génère simplement un deuxième kit. Simple et efficace.

---

## Exemple : Outfiiit

| Kit | Design |
|-----|--------|
| Kit 1 (Logo) | `OUTFiiiT` (1 ligne) |
| Kit 2 (Icônes) | `OUT` / `FiiiT` (2 lignes) |

---

## Fonctionnalités à ajouter

### Support Multi-lignes

- Jusqu'à **3 lignes** de texte
- Bouton "+ Add line" / "× Remove line"
- Chaque ligne a ses propres paramètres :
  - Texte
  - Couleurs par lettre
  - Taille de police (relative : %)
  - Espacement des lettres

### Paramètres globaux

- **Line spacing** : Espacement entre les lignes
- **Police** : Une seule police pour toutes les lignes (simplifie)
- **Alignement horizontal** : Gauche / Centre / Droite

---

## Structure de données

```javascript
// État actuel
{
  text: "Outfiiit",
  letters: [{ char: 'O', color: '#000' }, ...],
  font: "Montserrat",
  fontSize: 72,
  letterSpacing: 0
}

// Nouvel état
{
  lines: [
    {
      text: "OUT",
      letters: [{ char: 'O', color: '#000' }, ...],
      fontSize: 100,        // % de baseFontSize
      letterSpacing: 0
    },
    {
      text: "FiiiT",
      letters: [{ char: 'F', color: '#000' }, { char: 'i', color: '#FF69B4' }, ...],
      fontSize: 80,         // Plus petit
      letterSpacing: 0
    }
  ],
  font: "Montserrat",
  baseFontSize: 72,
  lineSpacing: 10,
  horizontalAlign: "center"  // left | center | right
}
```

---

## Modifications de l'interface

### Section Logo modifiée

```
┌─────────────────────────────────────────────────┐
│ 1. Create your Logo                             │
├─────────────────────────────────────────────────┤
│                                                 │
│ Line 1: [OUT________________]    [× Remove]     │
│   Size: [====●====] 100%   Spacing: [===●===]   │
│   Colors: [O][U][T]                             │
│                                                 │
│ Line 2: [FiiiT______________]    [× Remove]     │
│   Size: [===●=====] 80%    Spacing: [===●===]   │
│   Colors: [F][i][i][i][T]                       │
│                                                 │
│                        [+ Add line]             │
│                                                 │
│ ─────────────────────────────────────────────── │
│ Font: [Montserrat ▼]                            │
│ Line spacing: [====●====]                       │
│ Align: [Left] [•Center] [Right]                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Plan d'implémentation

### Étape 1 : Structure de données

- [ ] Créer la nouvelle structure `lines[]`
- [ ] Migration automatique : ancien format → nouveau format (1 ligne)
- [ ] Mettre à jour `updateLetters()` pour gérer les lignes

### Étape 2 : Interface HTML

- [ ] Refactorer la section d'édition pour supporter N lignes
- [ ] Boutons "+ Add line" / "× Remove"
- [ ] Slider `fontSize` par ligne (en %)
- [ ] Slider `letterSpacing` par ligne
- [ ] Slider `lineSpacing` global
- [ ] Boutons d'alignement (left/center/right)

### Étape 3 : Rendu multi-lignes

- [ ] Modifier `renderLogo()` pour dessiner plusieurs lignes
- [ ] Calculer la hauteur totale (toutes lignes + espacements)
- [ ] Centrer verticalement l'ensemble
- [ ] Respecter l'alignement horizontal par ligne

### Étape 4 : Preview SVG

- [ ] Modifier `generateSVG()` pour multi-lignes
- [ ] Calculer les positions Y de chaque ligne
- [ ] Générer les paths pour chaque lettre de chaque ligne

### Étape 5 : Export

- [ ] Adapter `generateAllAssets()` pour le nouveau format
- [ ] Tester tous les formats d'export

### Étape 6 : Popover police

- [ ] Adapter le popover pour afficher le preview multi-lignes
- [ ] Mettre à jour les previews de chaque police

---

## Points d'attention

### UX
- Par défaut : 1 ligne (comportement actuel)
- Maximum : 3 lignes
- Minimum : 1 ligne (impossible de supprimer la dernière)

### Calcul de taille optimale
- Trouver le scale qui fait rentrer toutes les lignes dans le canvas
- Prendre en compte la ligne la plus large
- Prendre en compte la hauteur totale (lignes + espacements)

### Migration
- Détection automatique de l'ancien format
- Conversion transparente au chargement

---

## Fichiers impactés

| Fichier | Modifications |
|---------|---------------|
| `app.js` | Structure données, rendu, export, popover |
| `index.html` | Section d'édition multi-lignes |
| `style.css` | Styles pour les contrôles par ligne |

---

## Avantages de cette approche simplifiée

1. **Moins de complexité** : Pas de gestion logo/icône séparée
2. **Interface plus simple** : Un seul éditeur
3. **Flexibilité** : L'utilisateur génère autant de kits qu'il veut
4. **Moins de bugs potentiels** : Moins de code = moins de bugs
5. **Maintenance facilitée** : Code plus simple à maintenir

---

## Prochaine étape

Validation du plan, puis implémentation par étapes.
