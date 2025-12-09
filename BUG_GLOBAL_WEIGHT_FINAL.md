# Bug : Le sélecteur de poids global est inutile par design

## Symptôme

Le sélecteur de poids global (`#fontWeight`) ne change rien à l'affichage, alors que les sélecteurs par ligne (`.line-font-weight`) fonctionnent parfaitement.

---

## Cause racine : Un problème de conception, pas de binding

**Le problème n'est PAS un conflit d'event listeners.**

Le problème est que le sélecteur global ne peut **jamais** affecter le rendu car chaque ligne a **toujours** son propre `fontWeight` défini.

### Preuve dans le code

#### 1. Création de la première ligne (constructor, ligne 76-84)

```javascript
this.lines = [
    {
        text: 'Brand',
        letters: [],
        fontSize: 100,
        letterSpacing: 0,
        fontWeight: CONFIG.DEFAULTS.FONT_WEIGHT  // ← DÉFINI À '700'
    }
];
```

#### 2. Création de nouvelles lignes (addLine, ligne 1059-1065)

```javascript
this.lines.push({
    text: 'Text',
    letters: [...],
    fontSize: 100,
    letterSpacing: 0,
    fontWeight: this.fontWeight  // ← COPIÉ depuis la valeur globale courante
});
```

#### 3. Utilisation dans le rendu (ligne 1179, 1234, etc.)

```javascript
const lineFontWeight = line.fontWeight || this.fontWeight;
```

**Le `|| this.fontWeight` ne s'exécute JAMAIS** car `line.fontWeight` est **toujours** défini (string '700', '400', etc.), jamais `null` ou `undefined`.

---

## Trace d'exécution

### Au démarrage

1. `constructor()` crée `this.lines[0]` avec `fontWeight: '700'`
2. `this.fontWeight = '700'` (global)
3. Le rendu utilise `line.fontWeight` = '700'

### L'utilisateur change le sélecteur global à "400"

1. Event listener déclenché → `this.fontWeight = '400'`
2. `render()` appelé
3. Le rendu évalue `line.fontWeight || this.fontWeight`
4. `line.fontWeight` = '700' (défini) → **retourne '700'**
5. `this.fontWeight` ('400') est **ignoré**

### L'utilisateur change le sélecteur de ligne à "400"

1. Event listener déclenché → `this.lines[0].fontWeight = '400'`
2. `render()` appelé
3. Le rendu utilise `line.fontWeight` = '400' → **fonctionne !**

---

## Pourquoi ce design ?

Le code a probablement évolué :

1. **Version initiale** : Une seule ligne, `this.fontWeight` utilisé directement
2. **Version multi-ligne** : Chaque ligne peut avoir son propre poids
3. **Migration** : Le sélecteur global est devenu redondant mais n'a pas été repensé

Le commentaire à la ligne 86 révèle l'intention originale :
```javascript
this.fontWeight = CONFIG.DEFAULTS.FONT_WEIGHT;  // Global default, used for new lines
```

Le sélecteur global est censé être un "default pour les nouvelles lignes", pas un contrôle actif.

---

## Impact

| Action | Effet attendu | Effet réel |
|--------|---------------|------------|
| Changer poids global | Toutes les lignes changent | Rien ne change |
| Changer poids de ligne | Cette ligne change | Cette ligne change ✓ |
| Ajouter nouvelle ligne | Hérite du poids global | Hérite du poids global ✓ |

Le sélecteur global fonctionne **seulement pour les nouvelles lignes**, pas pour les lignes existantes.

---

## Solutions possibles

### Option A : Supprimer le sélecteur global

Le plus simple. Le sélecteur global n'a pas de sens si chaque ligne a son propre contrôle.

**Modifications :**
- Supprimer le `<select id="fontWeight">` du HTML
- Supprimer le binding dans `bindEvents()`
- Garder `this.fontWeight` uniquement comme valeur par défaut interne

**Avantages :**
- Simple
- Supprime la confusion UX
- Cohérent avec le design multi-ligne

**Inconvénients :**
- Perte de la possibilité de "changer tout d'un coup"

---

### Option B : Le global contrôle TOUTES les lignes

Quand on change le global, on propage à toutes les lignes.

**Modifications dans `bindEvents()` (ligne 631-634) :**

```javascript
this.weightChangeHandler = (e) => {
    this.fontWeight = e.target.value;
    // Propager à toutes les lignes
    this.lines.forEach(line => {
        line.fontWeight = e.target.value;
    });
    // Mettre à jour les sélecteurs par ligne
    this.updateWeightSelectors();
    this.render();
};
```

**Avantages :**
- Comportement intuitif ("global = tout")
- Garde la fonctionnalité

**Inconvénients :**
- Écrase les personnalisations par ligne
- L'utilisateur peut être surpris

---

### Option C : Le global est un "fallback" réel

Ne définir `line.fontWeight` que si l'utilisateur l'a **explicitement** changé.

**Modifications :**

1. **Constructor (ligne 82)** : Utiliser `null` au lieu de la valeur par défaut
```javascript
this.lines = [
    {
        text: 'Brand',
        letters: [],
        fontSize: 100,
        letterSpacing: 0,
        fontWeight: null  // ← null = utiliser le global
    }
];
```

2. **addLine (ligne 1064)** : Même chose
```javascript
fontWeight: null  // ← null = utiliser le global
```

3. **Les sélecteurs par ligne** : Afficher la valeur effective
```javascript
const currentWeight = line.fontWeight || this.fontWeight;
// Si line.fontWeight est null, la dropdown montre this.fontWeight
// L'utilisateur peut changer pour "overrider"
```

4. **Ajouter un bouton "Reset to global"** sur chaque ligne
```javascript
// Pour permettre de revenir au comportement global
line.fontWeight = null;
```

**Avantages :**
- Design propre et flexible
- Le global fonctionne vraiment comme un default
- Les overrides par ligne sont préservés

**Inconvénients :**
- Plus complexe à implémenter
- Nécessite une UI "reset"

---

### Option D : Deux modes d'utilisation (Recommandée)

Combiner B et C avec un toggle ou comportement intelligent.

**Comportement proposé :**

1. **Par défaut** : `line.fontWeight = null` (utilise le global)
2. **Si l'utilisateur change le sélecteur de ligne** : `line.fontWeight = valeur` (override)
3. **Si l'utilisateur change le global** :
   - Les lignes sans override (`fontWeight === null`) changent
   - Les lignes avec override restent inchangées
4. **Un indicateur visuel** montre quelles lignes ont un override
5. **Un bouton "Sync all to global"** permet de reset tous les overrides

**Interface :**
```
Global Weight: [Bold ▾]

Line 1: [Bold ▾]          ← "Follows global"
Line 2: [Light ▾] 🔗      ← "Custom (click to sync)"
Line 3: [Bold ▾]          ← "Follows global"
```

---

## Recommandation

**Pour un fix rapide** : **Option B** (le global propage à toutes les lignes)

C'est le comportement le plus intuitif pour l'utilisateur moyen. Quand on change "Weight" dans les contrôles globaux, on s'attend à ce que tout change.

**Pour un fix propre** : **Option D** (deux modes)

Plus de travail, mais offre la flexibilité de :
- Changer tout d'un coup (global)
- Personnaliser des lignes individuelles (override)
- Revenir au comportement global (reset)

---

## Fichiers impactés

| Fichier | Ligne(s) | Modification |
|---------|----------|--------------|
| `app.js` | 82 | Initialiser `fontWeight: null` |
| `app.js` | 631-634 | Propager aux lignes (Option B) ou respecter null (Option C/D) |
| `app.js` | 1064 | Initialiser `fontWeight: null` |
| `app.js` | 989-1006 | Gérer l'affichage du override |
| `index.html` | 313-318 | (Optionnel) Ajouter indicateur visuel |

---

## Résumé

**Le bug n'est pas technique, c'est un problème de design.** Le code fait exactement ce qu'il est censé faire - chaque ligne utilise son propre `fontWeight`. Le sélecteur "global" n'est global que de nom, il n'affecte que les nouvelles lignes.

La solution choisie dépend du comportement UX souhaité :
- Simple : Supprimer le global (Option A)
- Intuitif : Global propage partout (Option B)
- Flexible : Global comme vrai fallback avec overrides (Option C/D)
