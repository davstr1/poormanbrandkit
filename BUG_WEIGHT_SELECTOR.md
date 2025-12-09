# Bug : Le sélecteur de poids global ne fonctionne pas

## Symptôme

Le sélecteur de poids global (`#fontWeight`) ne déclenche aucune mise à jour après un changement de police, alors que les sélecteurs de poids par ligne (`.line-font-weight`) fonctionnent parfaitement.

---

## Cause racine

**Deux mécanismes d'event binding concurrents** sur le même élément `#fontWeight` :

### 1. Dans `bindEvents()` (ligne 630)
```javascript
document.getElementById('fontWeight').addEventListener('change', (e) => {
    this.fontWeight = e.target.value;
    this.render();
});
```
- Attaché **une seule fois** au démarrage
- Utilise `.addEventListener()`

### 2. Dans `updateWeightSelectors()` (ligne 380)
```javascript
globalSelect.onchange = (e) => {
    this.fontWeight = e.target.value;
    this.render();
};
```
- Attaché **à chaque changement de police**
- Utilise `.onchange =` (propriété DOM)

**Le mélange de `.addEventListener()` et `.onchange =` sur le même élément crée un conflit.**

---

## Chronologie du bug

### Au démarrage

```
init()
├─ loadGoogleFonts()
│  └─ loadFontWeights('Montserrat')
│     └─ updateWeightSelectors()
│        └─ globalSelect.onchange = handler1  ← PREMIER
│
└─ bindEvents()
   └─ addEventListener('change', handler2)    ← DEUXIÈME
```

**Résultat** : Les deux handlers coexistent, ça fonctionne.

### Après changement de police

```
selectFont('Lato')
└─ loadFontWeights('Lato')
   └─ updateWeightSelectors()
      └─ globalSelect.innerHTML = newOptions
      └─ globalSelect.onchange = handler3     ← REMPLACE handler1
```

**Résultat** :
- `handler2` (addEventListener) toujours là
- `handler3` (.onchange) remplace `handler1`
- **Conflit entre les deux mécanismes → rien ne se passe**

---

## Pourquoi les sélecteurs par ligne fonctionnent

Dans `renderLineEditors()` (ligne 984-1001) :

```javascript
// Élément CRÉÉ dynamiquement
const weightControl = document.createElement('div');
weightControl.innerHTML = `<select class="line-font-weight">...</select>`;

// Listener attaché UNE SEULE FOIS avec addEventListener
const weightSelect = weightControl.querySelector('.line-font-weight');
weightSelect.addEventListener('change', (e) => {
    this.lines[lineIndex].fontWeight = e.target.value;
    this.render();
});
```

**Différences clés :**

| Aspect | Global `#fontWeight` | Par ligne `.line-font-weight` |
|--------|---------------------|-------------------------------|
| Élément | Statique (HTML) | Créé dynamiquement |
| Binding | `.addEventListener()` + `.onchange =` | `.addEventListener()` seul |
| Rebinding | Oui (à chaque changement police) | Non (nouvel élément) |
| Conflit | **OUI** | Non |

---

## Solution proposée

### Option A : Utiliser UNIQUEMENT addEventListener (Recommandée)

Supprimer le `.onchange =` dans `updateWeightSelectors()` et ne garder que le listener de `bindEvents()`.

**Modification dans `updateWeightSelectors()` (lignes 377-384) :**

```javascript
// AVANT (problématique)
globalSelect.innerHTML = buildOptions(this.fontWeight);
globalSelect.onchange = (e) => {
    this.fontWeight = e.target.value;
    this.render();
};

// APRÈS (corrigé)
globalSelect.innerHTML = buildOptions(this.fontWeight);
// Pas de re-binding - le listener de bindEvents() suffit
```

**Avantage** : Simple, cohérent avec les sélecteurs par ligne.

### Option B : Utiliser UNIQUEMENT onchange

Supprimer le listener dans `bindEvents()` et ne garder que `.onchange` dans `updateWeightSelectors()`.

**Modification dans `bindEvents()` (lignes 624-627) :**

```javascript
// AVANT
document.getElementById('fontWeight').addEventListener('change', (e) => {
    this.fontWeight = e.target.value;
    this.render();
});

// APRÈS
// Supprimer complètement - géré par updateWeightSelectors()
```

**Inconvénient** : Le premier changement avant `updateWeightSelectors()` ne fonctionnerait pas.

### Option C : Supprimer l'ancien listener avant rebinding

Utiliser une référence nommée pour pouvoir supprimer l'ancien listener.

```javascript
// Dans la classe
this.weightChangeHandler = (e) => {
    this.fontWeight = e.target.value;
    this.render();
};

// Dans bindEvents()
document.getElementById('fontWeight').addEventListener('change', this.weightChangeHandler);

// Dans updateWeightSelectors()
globalSelect.removeEventListener('change', this.weightChangeHandler);
globalSelect.addEventListener('change', this.weightChangeHandler);
```

**Inconvénient** : Plus complexe, nécessite de stocker la référence.

---

## Recommandation après review

### Risque identifié

Le commentaire existant dans le code suggère une méfiance envers `innerHTML` :
```javascript
// Re-bind the change event (innerHTML may affect it in some browsers)
```

Si dans certains navigateurs `innerHTML` sur un `<select>` casse les listeners, supprimer simplement `.onchange =` ne suffira pas.

### Solution robuste : Unifier sur addEventListener avec cleanup

**Principe** : Utiliser uniquement `.addEventListener()` partout, mais avec une référence nommée pour pouvoir nettoyer.

### Changements à effectuer

#### 1. Ajouter une propriété pour stocker le handler (ligne ~123)

```javascript
this.opentypeFonts = {};
this.renderCounter = 0;
this.weightChangeHandler = null;  // AJOUTER
```

#### 2. Modifier `bindEvents()` (lignes 628-633)

```javascript
// AVANT
bindEvents() {
    // Font weight
    document.getElementById('fontWeight').addEventListener('change', (e) => {
        this.fontWeight = e.target.value;
        this.render();
    });

// APRÈS
bindEvents() {
    // Font weight - handler défini ici, sera aussi utilisé par updateWeightSelectors
    this.weightChangeHandler = (e) => {
        this.fontWeight = e.target.value;
        this.render();
    };
    document.getElementById('fontWeight').addEventListener('change', this.weightChangeHandler);
```

#### 3. Modifier `updateWeightSelectors()` (lignes 377-384)

```javascript
// AVANT
globalSelect.innerHTML = buildOptions(this.fontWeight);

// Re-bind the change event (innerHTML may affect it in some browsers)
globalSelect.onchange = (e) => {
    this.fontWeight = e.target.value;
    this.render();
};

// APRÈS
globalSelect.innerHTML = buildOptions(this.fontWeight);

// Re-bind avec addEventListener (cleanup + re-attach)
if (this.weightChangeHandler) {
    globalSelect.removeEventListener('change', this.weightChangeHandler);
    globalSelect.addEventListener('change', this.weightChangeHandler);
}
```

### Pourquoi cette solution est meilleure

1. **Unicité** : Un seul handler, une seule méthode (addEventListener)
2. **Cleanup** : On supprime l'ancien listener avant d'en ajouter un nouveau
3. **Cohérence** : Même pattern que les sélecteurs par ligne
4. **Robustesse** : Fonctionne même si innerHTML casse les listeners

### Alternative minimaliste (si on fait confiance à addEventListener)

Si on est certain que `innerHTML` ne casse pas les listeners `addEventListener` :

**Simplement supprimer les lignes 379-383** :

```javascript
// Re-bind the change event (innerHTML may affect it in some browsers)
globalSelect.onchange = (e) => {
    this.fontWeight = e.target.value;
    this.render();
};
```

Le listener de `bindEvents()` restera attaché et fonctionnera.

**Risque** : Si `innerHTML` casse les listeners dans certains navigateurs, ça ne marchera pas.

---

## Fichiers impactés

### Solution robuste

| Fichier | Ligne | Action |
|---------|-------|--------|
| `app.js` | ~123 | Ajouter `this.weightChangeHandler = null;` |
| `app.js` | 628-633 | Extraire le handler dans une propriété |
| `app.js` | 379-383 | Remplacer `.onchange =` par `removeEventListener` + `addEventListener` |

### Solution minimaliste

| Fichier | Ligne | Action |
|---------|-------|--------|
| `app.js` | 379-383 | Supprimer le bloc `.onchange = ...` |
