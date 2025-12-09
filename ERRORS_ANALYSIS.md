# Analyse des erreurs console

Ces erreurs apparaissent quand tu ouvres `index.html` directement depuis le système de fichiers (`file://`) au lieu d'un serveur web local.

---

## Erreur 1 : GoatCounter (`gc.zgo.at/count.js`)

```
GET file://gc.zgo.at/count.js net::ERR_INVALID_URL
```

### Cause
Dans `index.html:758-759` :
```html
<script data-goatcounter="https://poorman.goatcounter.com/count"
    async src="//gc.zgo.at/count.js"></script>
```

L'URL `//gc.zgo.at/count.js` est **protocol-relative** (commence par `//`). Le navigateur utilise le même protocole que la page :
- Sur `https://` → devient `https://gc.zgo.at/count.js` (OK)
- Sur `file://` → devient `file://gc.zgo.at/count.js` (INVALIDE)

### Solution
Utiliser une URL absolue avec `https://` :
```html
<script data-goatcounter="https://poorman.goatcounter.com/count"
    async src="https://gc.zgo.at/count.js"></script>
```

### Impact
- **En prod** : Aucun problème (le site est servi en HTTPS)
- **En local** : Le tracking ne fonctionne pas (ce qui est correct pour le dev)

### Recommandation
Laisser tel quel - c'est intentionnel que le tracking ne fonctionne pas en local.

---

## Erreur 2 : Favicons manquants

```
GET file:///favicon-32x32.png net::ERR_FILE_NOT_FOUND
GET file:///favicon-16x16.png net::ERR_FILE_NOT_FOUND
```

### Cause
Dans `index.html:13-14` :
```html
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
```

Les URLs commencent par `/` (chemin absolu depuis la racine). En `file://` :
- `/favicon-32x32.png` → `file:///favicon-32x32.png` (racine du système de fichiers)

Les fichiers existent bien dans le projet :
- `/Users/imac1/Documents/code2024/brand_kit/favicon-32x32.png`
- `/Users/imac1/Documents/code2024/brand_kit/favicon-16x16.png`

Mais le navigateur cherche à la racine `/` du système de fichiers.

### Solution
Utiliser des chemins relatifs :
```html
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">
```

### Impact
- **En prod** : Fonctionne (le serveur web résout `/` correctement)
- **En local file://** : Ne fonctionne pas

### Recommandation
Changer pour des chemins relatifs (sans `/`) - ça fonctionnera dans les deux cas.

---

## Erreur 3 : CORS sur Google Fonts API

```
Access to fetch at 'https://fonts.googleapis.com/css2?family=Lato:wght@800&text=BrandNEW&display=swap'
from origin 'null' has been blocked by CORS policy
```

### Cause
Quand tu ouvres un fichier HTML en `file://`, l'origine est `null`. Les requêtes `fetch()` vers des domaines externes (comme `fonts.googleapis.com`) sont bloquées par la politique CORS du navigateur.

Le code concerné est dans `app.js:1268` :
```javascript
const cssResponse = await fetch(cssUrl);
```

### Pourquoi ça fonctionne en prod ?
- L'origine est `https://poormanbrandkit.com` (ou similaire)
- Google Fonts autorise les requêtes cross-origin depuis des domaines web

### Pourquoi ça ne fonctionne pas en local file:// ?
- L'origine est `null`
- Google Fonts n'autorise pas les requêtes depuis l'origine `null`

### Solution
**Utiliser un serveur local pour le développement :**

```bash
# Option 1 : Python (installé par défaut sur macOS)
cd /Users/imac1/Documents/code2024/brand_kit
python3 -m http.server 8000
# Puis ouvrir http://localhost:8000

# Option 2 : Node.js (si installé)
npx serve .
# Puis ouvrir http://localhost:3000

# Option 3 : PHP (si installé)
php -S localhost:8000
```

### Alternative (non recommandée)
Désactiver la sécurité CORS dans Chrome (pour le dev uniquement) :
```bash
open -na "Google Chrome" --args --disable-web-security --user-data-dir=/tmp/chrome_dev
```
**Attention** : Ne jamais naviguer sur internet avec cette option activée.

### Impact
- **En prod** : Aucun problème
- **En local file://** : Le rendu SVG échoue complètement

### Recommandation
**Toujours utiliser un serveur local pour le développement.** C'est la pratique standard pour les applications web modernes.

---

## Résumé des corrections

| Erreur | Fichier | Action |
|--------|---------|--------|
| GoatCounter | `index.html:758` | Laisser tel quel (intentionnel) |
| Favicons | `index.html:13-14` | Changer `/favicon-*.png` → `favicon-*.png` |
| CORS Google Fonts | N/A | Utiliser un serveur local pour le dev |

---

## Commande recommandée pour le dev local

```bash
cd /Users/imac1/Documents/code2024/brand_kit && python3 -m http.server 8000
```

Puis ouvrir : http://localhost:8000
