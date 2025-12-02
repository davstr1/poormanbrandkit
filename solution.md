# Brand Kit Generator - Solution Technique

## Objectif
Créer une application web monopage permettant de :
1. Créer/personnaliser un logo texte avec différentes polices
2. Appliquer des couleurs sur certaines lettres
3. Prévisualiser le brand kit
4. Générer automatiquement tous les assets (logo multi-tailles, favicons, icônes app stores)

## Architecture Technique

### Stack proposé
- **HTML/CSS/JavaScript** vanilla (aucune dépendance externe requise)
- **Canvas API** pour le rendu et l'export des images
- **Google Fonts API** pour les polices (chargement dynamique)
- **JSZip** (CDN) pour l'export en archive ZIP

### Structure des fichiers
```
brand_kit/
├── index.html          # Application monopage
├── style.css           # Styles
├── app.js              # Logique principale
└── solution.md         # Ce fichier
```

## Fonctionnalités détaillées

### 1. Éditeur de Logo Texte
- **Saisie du texte** : Input permettant d'écrire le nom de la marque
- **Sélection de police** : Liste déroulante avec Google Fonts populaires
- **Style par lettre** : Clic sur une lettre pour lui appliquer une couleur spécifique
- **Couleur de fond** : Transparent ou couleur personnalisée
- **Taille de police** : Slider pour ajuster
- **Espacement des lettres** : Contrôle du letter-spacing

### 2. Preview en temps réel
- Affichage du logo en différentes tailles
- Preview sur fond clair/sombre pour vérifier la lisibilité
- Simulation favicon dans un onglet navigateur

### 3. Génération automatique des assets

#### Logos
| Format | Taille | Usage |
|--------|--------|-------|
| logo-full.png | 1024x1024 | Version principale |
| logo-512.png | 512x512 | Usage général |
| logo-256.png | 256x256 | Usage général |
| logo-128.png | 128x128 | Usage général |

#### Favicons Web
| Format | Taille | Usage |
|--------|--------|-------|
| favicon.ico | 16x16, 32x32, 48x48 | Multi-résolution ICO |
| favicon-16x16.png | 16x16 | Navigateurs modernes |
| favicon-32x32.png | 32x32 | Navigateurs modernes |
| apple-touch-icon.png | 180x180 | iOS Safari |

#### Icônes iOS App Store
| Format | Taille | Usage |
|--------|--------|-------|
| ios-1024.png | 1024x1024 | App Store |
| ios-180.png | 180x180 | iPhone @3x |
| ios-120.png | 120x120 | iPhone @2x |
| ios-167.png | 167x167 | iPad Pro |
| ios-152.png | 152x152 | iPad |

#### Icônes Android / Google Play
| Format | Taille | Usage |
|--------|--------|-------|
| android-512.png | 512x512 | Play Store |
| android-192.png | 192x192 | Launcher xxxhdpi |
| android-144.png | 144x144 | Launcher xxhdpi |
| android-96.png | 96x96 | Launcher xhdpi |
| android-72.png | 72x72 | Launcher hdpi |
| android-48.png | 48x48 | Launcher mdpi |

## Approche d'implémentation

### Étape 1 : Structure HTML
- Header avec titre
- Zone d'édition du logo (inputs, sélecteurs)
- Zone de preview avec le canvas principal
- Section des previews multi-tailles
- Bouton de génération/téléchargement

### Étape 2 : Système de coloration par lettre
```javascript
// Chaque lettre est un objet avec sa propre couleur
const logoLetters = [
  { char: 'B', color: '#FF0000' },
  { char: 'r', color: '#000000' },
  { char: 'a', color: '#000000' },
  // ...
];
```

L'utilisateur clique sur une lettre dans le preview pour ouvrir un color picker.

### Étape 3 : Rendu Canvas
```javascript
function renderLogo(ctx, width, height, letters, font) {
  // Calculer la taille de police optimale
  // Dessiner chaque lettre avec sa couleur
  // Centrer le texte
}
```

### Étape 4 : Export multi-tailles
```javascript
async function generateBrandKit() {
  const sizes = {
    logos: [1024, 512, 256, 128],
    favicon: [16, 32, 48],
    ios: [1024, 180, 167, 152, 120],
    android: [512, 192, 144, 96, 72, 48]
  };

  // Créer un canvas temporaire pour chaque taille
  // Exporter en PNG
  // Assembler dans un ZIP
}
```

### Étape 5 : Génération du ZIP
Utilisation de JSZip pour créer une archive contenant :
```
brand_kit_export/
├── logos/
│   ├── logo-1024.png
│   ├── logo-512.png
│   └── ...
├── favicons/
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   └── ...
├── ios/
│   └── ...
├── android/
│   └── ...
└── README.txt (instructions d'utilisation)
```

## Points d'attention

1. **Qualité du rendu** : Utiliser des canvas haute résolution (devicePixelRatio) pour un rendu net
2. **Favicon ICO** : Nécessite une librairie ou un service pour convertir PNG en ICO multi-résolution
3. **Performance** : Générer les assets de manière asynchrone pour ne pas bloquer l'UI
4. **Compatibilité** : Tester sur Chrome, Firefox, Safari

## Prochaine étape

Implémenter l'application en commençant par la structure HTML et le système d'édition du logo.
