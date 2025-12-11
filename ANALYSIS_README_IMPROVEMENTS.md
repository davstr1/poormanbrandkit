# Plan : Restructuration du ZIP exporté

## Objectif

Réorganiser les fichiers du ZIP pour que l'utilisateur sache exactement où placer chaque fichier, avec des meta tags copiables-collables.

---

## Nouvelle structure du ZIP

```
brand_kit_xxx.zip
│
├── README.txt
│
├── /website-root/          ← Copy CONTENTS to your website root
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── favicon-48x48.png
│   ├── apple-touch-icon.png
│   ├── android-chrome-192x192.png
│   ├── android-chrome-512x512.png
│   └── site.webmanifest     ← For PWA / "Add to Home Screen"
│
└── /assets/                ← For design / App Store / other uses
    ├── logo.svg
    ├── logo-1024.png
    ├── logo-512.png
    ├── logo-256.png
    ├── logo-128.png
    ├── /ios/               ← For App Store / Xcode
    │   ├── ios-1024.png
    │   ├── ios-180.png
    │   ├── ios-167.png
    │   ├── ios-152.png
    │   └── ios-120.png
    └── /fonts/
        ├── Font-400.ttf
        └── LICENSE.txt
```

---

## Changements de nommage

| Actuel | Nouveau | Raison |
|--------|---------|--------|
| `android-192.png` | `android-chrome-192x192.png` | Convention standard (realfavicongenerator.net) |
| `android-512.png` | `android-chrome-512x512.png` | Convention standard |
| `/favicons/` | `/website-root/` | Plus explicite sur l'emplacement |
| `/logos/` | `/assets/` | Regroupe tout ce qui n'est pas pour le site web |
| `/android/` | Supprimé | Fichiers Android déplacés dans website-root (PWA) |

---

## Nouveau README.txt (en anglais)

```
Brand Kit - ${logoText}
================================

Generated with The Poor Man's Brand Kit Maker
https://github.com/davstr1/poormanbrandkit

Font: ${font} (weights: ${weights})


QUICK START
-----------

1. Copy the CONTENTS of /website-root/ to your website's root directory
2. Add the meta tags below to your HTML <head>


META TAGS (copy-paste into <head>)
----------------------------------

<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="${backgroundColor}">


ABOUT site.webmanifest
----------------------

The site.webmanifest file enables "Add to Home Screen" on mobile devices.
Edit it to customize your app name if different from your logo text.


CONTENTS
--------

/website-root/  (copy to your website root)
  - favicon.ico              Multi-resolution (16, 32, 48px)
  - favicon-16x16.png        Browser tab icon
  - favicon-32x32.png        Browser tab icon (retina)
  - favicon-48x48.png        Windows site icon
  - apple-touch-icon.png     iOS Safari bookmark (180x180)
  - android-chrome-192x192.png   PWA / Android home screen
  - android-chrome-512x512.png   PWA / Android splash screen
  - site.webmanifest         PWA manifest (edit to customize)

/assets/  (for design, App Store, etc.)
  - logo.svg                 Vector logo (scalable)
  - logo-1024.png            High-resolution logo
  - logo-512.png
  - logo-256.png
  - logo-128.png
  - /ios/                    App Store / Xcode icons
  - /fonts/                  Font files + license
```

---

## Modifications dans app.js

### 1. Changer la structure des dossiers

Remplacer :
```javascript
zip.folder('favicons').file(...)
zip.folder('logos').file(...)
zip.folder('android').file(...)
```

Par :
```javascript
// Website root files
const websiteRoot = zip.folder('website-root');
websiteRoot.file('favicon.ico', icoBlob);
websiteRoot.file('favicon-16x16.png', ...);
websiteRoot.file('favicon-32x32.png', ...);
websiteRoot.file('favicon-48x48.png', ...);
websiteRoot.file('apple-touch-icon.png', ...);
websiteRoot.file('android-chrome-192x192.png', ...);
websiteRoot.file('android-chrome-512x512.png', ...);

// Generate site.webmanifest
const manifest = JSON.stringify({
  name: this.logoText,
  short_name: this.logoText,
  icons: [
    { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
  ],
  theme_color: this.bgColor,
  background_color: this.bgColor,
  display: 'standalone'
}, null, 2);
websiteRoot.file('site.webmanifest', manifest);

// Assets
const assets = zip.folder('assets');
assets.file('logo.svg', ...);
assets.file('logo-1024.png', ...);
assets.file('logo-512.png', ...);
assets.file('logo-256.png', ...);
assets.file('logo-128.png', ...);

// iOS assets
const iosFolder = assets.folder('ios');
iosFolder.file('ios-1024.png', ...);
iosFolder.file('ios-180.png', ...);
iosFolder.file('ios-167.png', ...);
iosFolder.file('ios-152.png', ...);
iosFolder.file('ios-120.png', ...);

// Fonts
const fontsFolder = assets.folder('fonts');
fontsFolder.file(...);
```

### 2. Supprimer les tailles Android inutiles

Les tailles 48, 72, 96, 144 ne sont plus nécessaires pour le web moderne (PWA utilise 192 et 512).
Supprimer leur génération dans `generateBrandKit()`.

### 3. Mettre à jour le README généré

Remplacer la constante `readme` par le nouveau contenu en anglais ci-dessus.

---

## Modifications dans index.html

Mettre à jour la liste des fichiers générés affichée sur la homepage :

Actuel :
```html
<li>✓ PNG Logos (1024px, 512px, 256px, 128px)</li>
<li>✓ SVG Logo (vector, scalable)</li>
<li>✓ Web favicons (favicon.ico + PNG 16px, 32px, 48px, 180px)</li>
<li>✓ iOS App Store icons</li>
<li>✓ Android / Google Play icons</li>
<li>✓ Font file (TTF + license)</li>
```

Nouveau :
```html
<li>✓ PNG Logos (1024px, 512px, 256px, 128px)</li>
<li>✓ SVG Logo (vector, scalable)</li>
<li>✓ Web favicons + PWA manifest (favicon.ico, PNG, webmanifest)</li>
<li>✓ iOS App Store icons</li>
<li>✓ Font file (TTF + license)</li>
```

---

## Résumé des changements

| Fichier | Action |
|---------|--------|
| `app.js` | Restructurer dossiers : `/favicons/` + `/logos/` + `/android/` → `/website-root/` + `/assets/` |
| `app.js` | Renommer `android-192.png` → `android-chrome-192x192.png` |
| `app.js` | Renommer `android-512.png` → `android-chrome-512x512.png` |
| `app.js` | Supprimer génération des tailles Android 48, 72, 96, 144 |
| `app.js` | Générer `site.webmanifest` dans website-root |
| `app.js` | Nouveau contenu README (en anglais) |
| `index.html` | Mettre à jour la liste des fichiers générés |

---

## Checklist de validation

- [ ] Le ZIP contient `/website-root/` avec tous les favicons + site.webmanifest
- [ ] Le ZIP contient `/assets/` avec logos, iOS et fonts
- [ ] Les fichiers Android sont nommés `android-chrome-192x192.png` et `android-chrome-512x512.png`
- [ ] Le `site.webmanifest` contient le bon logoText et bgColor
- [ ] Le README est en anglais
- [ ] Les meta tags dans le README incluent le manifest
- [ ] Le README explique que site.webmanifest est éditable
- [ ] La homepage reflète la nouvelle structure
