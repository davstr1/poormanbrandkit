// The Poor Man's Brand Kit - Exporter Module
// Handles ZIP generation and asset export

const Exporter = {
    /**
     * Load wawoff2 WASM module for WOFF2 decompression.
     * @async
     */
    async loadWawoff2() {
        // Already loaded
        if (window.wawoff2Ready) return;

        // Already loading - wait for it
        if (window.wawoff2Loading) {
            return window.wawoff2Loading;
        }

        // Start loading
        window.wawoff2Loading = new Promise((resolve, reject) => {
            window.Module = {
                onRuntimeInitialized: () => {
                    window.wawoff2Ready = true;
                    resolve();
                }
            };

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/wawoff2@2.0.1/build/decompress_binding.js';
            script.onerror = () => reject(new Error('Failed to load wawoff2'));
            document.head.appendChild(script);
        });

        return window.wawoff2Loading;
    },

    /**
     * Fetch and decompress a Google Font.
     * @async
     * @param {string} fontName - Font family name
     * @param {string} fontWeight - Font weight (e.g., '700')
     * @param {string} text - Text to include (for subsetting)
     * @returns {Promise<ArrayBuffer>} TTF font buffer
     */
    async fetchAndDecompressFont(fontName, fontWeight, text) {
        const fontFamily = fontName.replace(/ /g, '+');
        const textParam = encodeURIComponent(text);
        const cssUrl = `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@${fontWeight}&text=${textParam}&display=swap`;

        const cssResponse = await fetch(cssUrl);
        if (!cssResponse.ok) {
            throw new Error(`Font CSS request failed: ${cssResponse.status} for ${fontFamily} weight ${fontWeight}`);
        }
        const css = await cssResponse.text();

        const urlMatch = css.match(/url\(([^)]+)\)/);
        if (!urlMatch) {
            throw new Error(`Could not find font URL in CSS for ${fontFamily} weight ${fontWeight}`);
        }
        const fontUrl = urlMatch[1].replace(/['"]/g, '');

        const fontResponse = await fetch(fontUrl);
        if (!fontResponse.ok) {
            throw new Error(`Font file request failed: ${fontResponse.status}`);
        }
        const woff2Buffer = await fontResponse.arrayBuffer();

        // Validate we got actual font data
        if (woff2Buffer.byteLength < 100) {
            throw new Error(`Font file too small (${woff2Buffer.byteLength} bytes) - likely an error response`);
        }

        const ttfUint8 = Module.decompress(woff2Buffer);
        if (!ttfUint8) {
            throw new Error(`WOFF2 decompression failed for ${fontFamily} weight ${fontWeight}`);
        }
        const ttfBuffer = ttfUint8.buffer.slice(
            ttfUint8.byteOffset,
            ttfUint8.byteOffset + ttfUint8.byteLength
        );

        return ttfBuffer;
    },

    /**
     * Fetch full font (not subsetted) for inclusion in brand kit.
     * @async
     * @param {string} fontName - Font family name
     * @param {string} fontWeight - Font weight
     * @returns {Promise<ArrayBuffer>} TTF font buffer
     */
    async fetchFullFont(fontName, fontWeight) {
        await this.loadWawoff2();

        const fontFamily = fontName.replace(/ /g, '+');
        const cssUrl = `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@${fontWeight}&display=swap`;

        const cssResponse = await fetch(cssUrl);
        if (!cssResponse.ok) {
            throw new Error(`Font CSS request failed: ${cssResponse.status} for ${fontFamily} weight ${fontWeight}`);
        }
        const css = await cssResponse.text();

        const urlMatch = css.match(/url\(([^)]+)\)/);
        if (!urlMatch) {
            throw new Error(`Could not find font URL in CSS for ${fontFamily} weight ${fontWeight}`);
        }
        const fontUrl = urlMatch[1].replace(/['"]/g, '');

        const fontResponse = await fetch(fontUrl);
        if (!fontResponse.ok) {
            throw new Error(`Font file request failed: ${fontResponse.status}`);
        }
        const woff2Buffer = await fontResponse.arrayBuffer();

        // Validate we got actual font data
        if (woff2Buffer.byteLength < 100) {
            throw new Error(`Font file too small (${woff2Buffer.byteLength} bytes) - likely an error response`);
        }

        const ttfUint8 = Module.decompress(woff2Buffer);
        if (!ttfUint8) {
            throw new Error(`WOFF2 decompression failed for ${fontFamily} weight ${fontWeight}`);
        }
        const ttfBuffer = ttfUint8.buffer.slice(
            ttfUint8.byteOffset,
            ttfUint8.byteOffset + ttfUint8.byteLength
        );

        return ttfBuffer;
    },

    /**
     * Generate SVG logo with vector paths from opentype.js.
     * Uses real glyph bounding boxes for accurate line spacing.
     * @async
     * @param {Object} opentypeFont - Loaded opentype.js font
     * @param {Object} state - Application state
     * @returns {Promise<string>} SVG markup
     */
    async generateSVG(opentypeFont, state) {
        const font = opentypeFont;
        const padding = CONFIG.PADDING.SVG;

        // Calculate dimensions for all lines using real glyph metrics
        let maxLineWidth = 0;
        const linesData = [];

        state.lines.forEach((line) => {
            const lineFontSize = (line.fontSize / 100) * state.baseFontSize;
            const positions = [];
            let x = 0;
            let maxAscent = 0;
            let maxDescent = 0;

            line.letters.forEach((letter) => {
                const glyph = font.charToGlyph(letter.char);
                const scale = lineFontSize / font.unitsPerEm;
                const width = glyph.advanceWidth * scale;

                // Get real bounding box for ascent/descent
                const bbox = glyph.getBoundingBox();
                maxAscent = Math.max(maxAscent, bbox.y2 * scale);
                // Descent is distance below baseline (positive value)
                const descent = bbox.y1 < 0 ? -bbox.y1 * scale : 0;
                maxDescent = Math.max(maxDescent, descent);

                positions.push({ letter, x, width, lineFontSize });
                x += width + line.letterSpacing;
            });

            const lineWidth = positions.length > 0
                ? positions[positions.length - 1].x + positions[positions.length - 1].width
                : 0;
            maxLineWidth = Math.max(maxLineWidth, lineWidth);

            // Ensure minimum descent for consistent spacing with capitals
            const minDescent = lineFontSize * 0.15;
            linesData.push({
                positions,
                lineWidth,
                lineFontSize,
                ascent: maxAscent || lineFontSize * 0.8,
                descent: Math.max(maxDescent, minDescent)
            });
        });

        // Calculate baseline positions (same logic as canvas renderer)
        const baselinePositions = [];
        let currentBaseline = 0;

        linesData.forEach((lineData, i) => {
            if (i === 0) {
                currentBaseline = lineData.ascent;
            }
            baselinePositions.push(currentBaseline);

            if (i < linesData.length - 1) {
                const nextAscent = linesData[i + 1].ascent;
                currentBaseline += lineData.descent + state.lineSpacing + nextAscent;
            }
        });

        // Calculate total visual height
        const lastIndex = linesData.length - 1;
        const totalVisualHeight = baselinePositions[lastIndex] + linesData[lastIndex].descent;

        const svgWidth = Math.ceil(Math.max(maxLineWidth + padding * 2, 200));
        const svgHeight = Math.ceil(totalVisualHeight + padding * 2);

        // Build SVG
        let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">
`;

        // Add background if needed
        if (state.bgType === 'color') {
            svgContent += `  <rect width="100%" height="100%" fill="${state.bgColor}"/>\n`;
        }

        // Draw each line at its calculated baseline
        linesData.forEach((lineData, i) => {
            const { positions, lineWidth, lineFontSize } = lineData;

            // Calculate X offset based on alignment
            let xOffset;
            if (state.horizontalAlign === 'left') {
                xOffset = padding;
            } else if (state.horizontalAlign === 'right') {
                xOffset = svgWidth - padding - lineWidth;
            } else {
                xOffset = (svgWidth - lineWidth) / 2;
            }

            // Y position is padding + baseline position
            const y = padding + baselinePositions[i];

            // Draw letters in correct order
            const drawOrder = state.layerOrder === 'left' ? [...positions].reverse() : positions;
            drawOrder.forEach(({ letter, x, lineFontSize: fontSize }) => {
                const color = letter.color || state.defaultColor;
                const path = font.getPath(letter.char, xOffset + x, y, fontSize);
                const pathData = path.toPathData(2);
                svgContent += `  <path d="${pathData}" fill="${color}"/>\n`;
            });
        });

        svgContent += `</svg>`;
        return svgContent;
    },

    /**
     * Generate README content for the brand kit.
     * @param {Object} state - Application state
     * @returns {string} README text
     */
    generateReadme(state) {
        const logoText = state.lines[0]?.text || 'Brand';

        // Collect unique colors
        const colors = new Set();
        colors.add(state.defaultColor);
        state.lines.forEach(line => {
            line.letters.forEach(letter => {
                if (letter.color) colors.add(letter.color);
            });
        });
        if (state.bgType === 'color') colors.add(state.bgColor);
        colors.add(state.appIconBg);
        if (state.appIconBorderEnabled) colors.add(state.appIconBorder);

        const colorList = [...colors].map(c => `  - ${c}`).join('\n');

        // Collect unique font weights from all lines
        const weights = new Set();
        state.lines.forEach(line => {
            weights.add(line.fontWeight || CONFIG.DEFAULTS.FONT_WEIGHT);
        });
        const weightList = [...weights].sort().join(', ');

        // Line details
        const lineDetails = state.lines.map((line, i) =>
            `  Line ${i + 1}: "${line.text}" (weight: ${line.fontWeight || CONFIG.DEFAULTS.FONT_WEIGHT}, size: ${line.fontSize}%, spacing: ${line.letterSpacing}px)`
        ).join('\n');

        return `Brand Kit - ${logoText}
================================

Generated with The Poor Man's Brand Kit Maker
https://github.com/davstr1/poormanbrandkit

Font: ${state.font}
Weights used: ${weightList}

Lines:
------
${lineDetails}

Colors:
-------
${colorList}

Contents:
---------

/logos/
  - logo-1024.png (1024x1024) - Full size logo
  - logo-512.png (512x512)
  - logo-256.png (256x256)
  - logo-128.png (128x128)
  - logo.svg - Vector format (scalable)

/favicons/
  - favicon-16x16.png - Browser tab icon
  - favicon-32x32.png - Browser tab icon (retina)
  - favicon-48x48.png - Windows site icon
  - apple-touch-icon.png (180x180) - iOS Safari bookmark

/ios/
  - ios-1024.png - App Store (required)
  - ios-180.png - iPhone @3x
  - ios-167.png - iPad Pro
  - ios-152.png - iPad
  - ios-120.png - iPhone @2x

/android/
  - android-512.png - Play Store (required)
  - android-192.png - xxxhdpi launcher
  - android-144.png - xxhdpi launcher
  - android-96.png - xhdpi launcher
  - android-72.png - hdpi launcher
  - android-48.png - mdpi launcher

/fonts/
${[...weights].sort().map(w => `  - ${state.font.replace(/\s+/g, '-')}-${w}.ttf - Font file (weight ${w})`).join('\n')}
  - LICENSE.txt - Font license information


Usage:
------

Web Favicons - Add to your HTML <head>:

  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

iOS App Store:
  Use ios-1024.png for App Store Connect submission.
  Xcode will use the other sizes for device icons.

Android / Google Play:
  Use android-512.png for Play Store submission.
  Place other sizes in res/mipmap-* folders.

SVG Logo:
  Use logo.svg for websites, print, or any scalable usage.
  The SVG contains vector paths (not embedded fonts).

Font:
  Install the TTF file to use the same font in other apps.
  The font is from Google Fonts - see LICENSE.txt for terms.
`;
    },

    /**
     * Generate font license text.
     * @param {Object} state - Application state
     * @returns {string} License text
     */
    generateFontLicense(state) {
        // Collect unique weights
        const weights = new Set();
        state.lines.forEach(line => {
            weights.add(line.fontWeight || CONFIG.DEFAULTS.FONT_WEIGHT);
        });
        const weightList = [...weights].sort().join(', ');

        return `Font: ${state.font}
Weights: ${weightList}
Source: Google Fonts (https://fonts.google.com/specimen/${state.font.replace(/\s+/g, '+')})

License:
--------
This font is distributed under the Open Font License (OFL) or Apache 2.0.
You can use it freely in your personal and commercial projects.

For more information about this font's specific license,
visit: https://fonts.google.com/specimen/${state.font.replace(/\s+/g, '+')}#license
`;
    },

    /**
     * Generate and download the complete brand kit as a ZIP file.
     * @async
     * @param {Object} state - Application state
     * @param {Object} opentypeFont - Loaded opentype.js font
     * @param {Function} onProgress - Progress callback (progress, message)
     */
    async generateBrandKit(state, opentypeFont, onProgress) {
        const zip = new JSZip();
        const assets = [];

        // Logos
        CONFIG.EXPORT.LOGO_SIZES.forEach(size => {
            assets.push({ folder: 'logos', name: `logo-${size}.png`, size });
        });

        // Favicons
        CONFIG.EXPORT.FAVICON_SIZES.forEach(size => {
            const name = size === 180 ? 'apple-touch-icon.png' : `favicon-${size}x${size}.png`;
            assets.push({ folder: 'favicons', name, size });
        });

        // iOS
        CONFIG.EXPORT.IOS_SIZES.forEach(size => {
            assets.push({
                folder: 'ios',
                name: `ios-${size}.png`,
                size,
                type: 'appicon',
                radius: CONFIG.RADIUS.IOS
            });
        });

        // Android
        CONFIG.EXPORT.ANDROID_SIZES.forEach(size => {
            assets.push({
                folder: 'android',
                name: `android-${size}.png`,
                size,
                type: 'appicon',
                radius: CONFIG.RADIUS.ANDROID
            });
        });

        const totalAssets = assets.length;
        let completed = 0;

        for (const asset of assets) {
            let canvas;
            if (asset.type === 'appicon') {
                canvas = Renderer.renderAppIconToCanvas(asset.size, asset.radius, state);
            } else {
                canvas = Renderer.renderToCanvas(asset.size, state);
            }
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            zip.folder(asset.folder).file(asset.name, blob);

            completed++;
            const progress = Math.round((completed / totalAssets) * 100);
            onProgress(progress, `${progress}%`);

            await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Generate SVG
        onProgress(null, 'Generating SVG...');
        try {
            const svg = await this.generateSVG(opentypeFont, state);
            zip.folder('logos').file('logo.svg', svg);
        } catch (e) {
            console.error('SVG generation failed:', e);
            throw new Error('SVG Error: ' + e.message);
        }

        // Add font files (all weights used)
        onProgress(null, 'Downloading fonts...');
        try {
            // Collect unique weights from all lines
            const weights = new Set();
            state.lines.forEach(line => {
                weights.add(line.fontWeight || CONFIG.DEFAULTS.FONT_WEIGHT);
            });

            // Download each weight
            for (const weight of weights) {
                const fontBuffer = await this.fetchFullFont(state.font, weight);
                const fontFileName = `${state.font.replace(/\s+/g, '-')}-${weight}.ttf`;
                zip.folder('fonts').file(fontFileName, fontBuffer);
            }
            zip.folder('fonts').file('LICENSE.txt', this.generateFontLicense(state));
        } catch (e) {
            console.error('Font download failed:', e);
            // Non-blocking - continue without font
        }

        // Add README
        zip.file('README.txt', this.generateReadme(state));

        // Generate and download
        const content = await zip.generateAsync({ type: 'blob' });
        const logoText = state.lines[0]?.text || 'brand';
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brand_kit_${logoText.toLowerCase().replace(/\s+/g, '_')}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};
