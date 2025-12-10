# Plan d'implémentation : Génération favicon.ico avec FaviconJS

## Résumé

Ajouter la génération d'un fichier `favicon.ico` multi-résolution (16x16, 32x32, 48x48) dans le ZIP exporté en utilisant la bibliothèque FaviconJS.

---

## Étape 1 : Ajouter FaviconJS dans index.html

**Fichier** : `index.html`

**Où** : Après les autres scripts (ligne ~742)

**Code à ajouter** :
```html
<script src="https://unpkg.com/favicon.js@1.0.0/favicon.js"></script>
```

---

## Étape 2 : Mettre à jour la liste des fichiers générés sur la home

**Fichier** : `index.html`

**Où** : Dans la liste `<ul class="export-list">` (ligne ~516)

**Modifier** :
```html
<li>✓ Web favicons (16px, 32px, 48px, 180px)</li>
```

**En** :
```html
<li>✓ Web favicons (favicon.ico + PNG 16px, 32px, 48px, 180px)</li>
```

---

## Étape 3 : Modifier generateBrandKit() dans app.js

**Fichier** : `app.js`

**Où** : Dans `generateBrandKit()`, après la génération des favicons PNG (vers ligne 1615)

**Code à ajouter** :
```javascript
// Generate favicon.ico (multi-resolution: 16, 32, 48)
progressText.textContent = 'Generating favicon.ico...';
try {
    const icoCanvas = this.renderToCanvas(48);
    const favicon = new FaviconJS(icoCanvas);
    const icoDataUrl = favicon.ico([16, 32, 48]);
    const icoBlob = await fetch(icoDataUrl).then(r => r.blob());
    zip.folder('favicons').file('favicon.ico', icoBlob);
} catch (e) {
    console.error('Favicon.ico generation failed:', e);
}
```

---

## Étape 3 : Mettre à jour le README généré

**Fichier** : `app.js`

**Où** : Dans la constante `readme` de `generateBrandKit()` (vers ligne 1720)

**Modifier la section /favicons/** :
```
/favicons/
  - favicon.ico - Multi-resolution (16x16, 32x32, 48x48)
  - favicon-16x16.png - Browser tab icon
  - favicon-32x32.png - Browser tab icon (retina)
  - favicon-48x48.png - Windows site icon
  - apple-touch-icon.png (180x180) - iOS Safari bookmark
```

**Modifier les instructions d'utilisation** :
```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
```

---

## Résumé des modifications

| Fichier | Lignes | Modification |
|---------|--------|--------------|
| `index.html` | ~742 | Ajouter `<script>` FaviconJS |
| `index.html` | ~516 | Mettre à jour liste export (ajouter favicon.ico) |
| `app.js` | ~1615 | Ajouter génération ICO |
| `app.js` | ~1720 | Mettre à jour README |

**Total** : ~15 lignes de code à ajouter

---

## Tests de validation

1. [ ] Le script FaviconJS se charge sans erreur
2. [ ] Le fichier `favicon.ico` est présent dans le ZIP sous `/favicons/`
3. [ ] Le fichier ICO s'ouvre dans un navigateur/éditeur d'images
4. [ ] Le README mentionne le fichier favicon.ico
