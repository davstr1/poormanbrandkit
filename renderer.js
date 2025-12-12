// The Poor Man's Brand Kit - Renderer Module
// Handles all canvas and SVG rendering operations

const Renderer = {
    /**
     * Render multi-line text on a canvas with automatic scaling.
     * Uses TextMetrics API for accurate vertical centering.
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
     * @param {number} size - Canvas size in pixels
     * @param {Object} state - Application state (lines, font, colors, etc.)
     * @param {number} padding - Padding ratio (0-1)
     */
    renderMultiLineText(ctx, size, state, padding = CONFIG.PADDING.LOGO) {
        const paddingPx = size * padding;
        const availableSize = size - paddingPx * 2;

        // Phase 1: Calculate metrics for all lines at base size
        let maxLineWidth = 0;
        const lineMetrics = [];

        state.lines.forEach((line) => {
            const lineFontSize = (line.fontSize / 100) * state.baseFontSize;
            const lineFontWeight = line.fontWeight || CONFIG.DEFAULTS.FONT_WEIGHT;
            ctx.font = `${lineFontWeight} ${lineFontSize}px "${state.font}"`;

            // Calculate line width
            let lineWidth = 0;
            line.letters.forEach((letter, i) => {
                lineWidth += ctx.measureText(letter.char).width;
                if (i < line.letters.length - 1) {
                    lineWidth += line.letterSpacing;
                }
            });
            maxLineWidth = Math.max(maxLineWidth, lineWidth);

            // Get real ascent/descent using TextMetrics
            let maxAscent = 0;
            let maxDescent = 0;
            line.letters.forEach((letter) => {
                const metrics = ctx.measureText(letter.char);
                maxAscent = Math.max(maxAscent, metrics.actualBoundingBoxAscent || lineFontSize * 0.8);
                maxDescent = Math.max(maxDescent, metrics.actualBoundingBoxDescent || lineFontSize * 0.2);
            });

            lineMetrics.push({
                lineWidth,
                lineFontSize,
                lineFontWeight,
                line,
                ascent: maxAscent,
                descent: maxDescent,
                visualHeight: maxAscent + maxDescent
            });
        });

        // Phase 2: Calculate baseline positions and total visual height
        const baselinePositions = [];
        let currentBaseline = 0;

        lineMetrics.forEach((metrics, i) => {
            if (i === 0) {
                // First line: baseline starts at its ascent
                currentBaseline = metrics.ascent;
            }
            baselinePositions.push(currentBaseline);

            // Move to next line: descent + spacing + next ascent
            if (i < lineMetrics.length - 1) {
                const nextAscent = lineMetrics[i + 1].ascent;
                currentBaseline += metrics.descent + state.lineSpacing + nextAscent;
            }
        });

        // Calculate total visual height (from top of first line to bottom of last)
        const lastIndex = lineMetrics.length - 1;
        const totalVisualHeight = baselinePositions[lastIndex] + lineMetrics[lastIndex].descent;

        // Phase 3: Calculate scale to fit
        const scaleX = availableSize / maxLineWidth;
        const scaleY = availableSize / totalVisualHeight;
        const scale = Math.min(scaleX, scaleY);

        // Calculate vertical offset to center
        const scaledVisualHeight = totalVisualHeight * scale;
        const offsetY = (size - scaledVisualHeight) / 2;

        // Phase 4: Draw each line
        ctx.textBaseline = 'alphabetic';

        lineMetrics.forEach((metrics, i) => {
            const { lineFontSize, lineFontWeight, line } = metrics;
            const scaledFontSize = lineFontSize * scale;
            const scaledLetterSpacing = line.letterSpacing * scale;

            ctx.font = `${lineFontWeight} ${scaledFontSize}px "${state.font}"`;

            // Calculate scaled line width for alignment
            let scaledLineWidth = 0;
            line.letters.forEach((letter, j) => {
                scaledLineWidth += ctx.measureText(letter.char).width;
                if (j < line.letters.length - 1) {
                    scaledLineWidth += scaledLetterSpacing;
                }
            });

            // Calculate X position based on alignment
            let x;
            if (state.horizontalAlign === 'left') {
                x = paddingPx;
            } else if (state.horizontalAlign === 'right') {
                x = size - paddingPx - scaledLineWidth;
            } else {
                x = (size - scaledLineWidth) / 2;
            }

            // Calculate Y position (baseline)
            const y = offsetY + baselinePositions[i] * scale;

            // Calculate positions for all letters
            const positions = [];
            line.letters.forEach((letter) => {
                positions.push({ letter, x });
                x += ctx.measureText(letter.char).width + scaledLetterSpacing;
            });

            // Draw in correct layer order
            const drawOrder = state.layerOrder === 'left' ? [...positions].reverse() : positions;
            drawOrder.forEach(({ letter, x }) => {
                ctx.fillStyle = letter.color || state.defaultColor;
                ctx.fillText(letter.char, x, y);
            });
        });
    },

    /**
     * Render an app icon with rounded corners and border.
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
     * @param {number} size - Icon size in pixels
     * @param {number} radiusRatio - Corner radius ratio (0-1)
     * @param {Object} state - Application state
     */
    renderAppIcon(ctx, size, radiusRatio, state) {
        const radius = size * radiusRatio;

        // Clear canvas to transparent
        ctx.clearRect(0, 0, size, size);

        // Clip everything to rounded rectangle
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, size, size, radius);
        ctx.clip();

        // Draw background
        ctx.fillStyle = state.bgColor;
        ctx.fillRect(0, 0, size, size);

        // Draw border if enabled
        if (state.appIconBorderEnabled) {
            const borderWidth = Math.max(1, size / 120);
            const inset = borderWidth / 2;
            ctx.beginPath();
            ctx.roundRect(inset, inset, size - borderWidth, size - borderWidth, radius - inset);
            ctx.strokeStyle = state.appIconBorder;
            ctx.lineWidth = borderWidth;
            ctx.stroke();
        }

        // Draw multi-line logo text
        this.renderMultiLineText(ctx, size, state, CONFIG.PADDING.APP_ICON);

        ctx.restore();
    },

    /**
     * Render the logo to a new canvas at the specified size.
     * @param {number} size - Canvas size in pixels
     * @param {Object} state - Application state
     * @returns {HTMLCanvasElement} The rendered canvas
     */
    renderToCanvas(size, state) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = size;
        canvas.height = size;

        // Background
        ctx.fillStyle = state.bgColor;
        ctx.fillRect(0, 0, size, size);

        // Render multi-line text
        this.renderMultiLineText(ctx, size, state, CONFIG.PADDING.LOGO);

        return canvas;
    },

    /**
     * Render an app icon to a new canvas.
     * @param {number} size - Icon size in pixels
     * @param {number} radiusRatio - Corner radius ratio (0-1)
     * @param {Object} state - Application state
     * @returns {HTMLCanvasElement} The rendered canvas
     */
    renderAppIconToCanvas(size, radiusRatio, state) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = size;
        canvas.height = size;

        this.renderAppIcon(ctx, size, radiusRatio, state);

        return canvas;
    },

    /**
     * Render all preview canvases.
     * @param {Object} state - Application state
     */
    renderPreviews(state) {
        CONFIG.PREVIEW_SIZES.forEach(preview => {
            const canvas = document.getElementById(preview.id);
            if (!canvas) return;

            const ctx = canvas.getContext('2d');

            canvas.width = preview.displaySize;
            canvas.height = preview.displaySize;

            // Clear
            ctx.clearRect(0, 0, preview.displaySize, preview.displaySize);

            // Draw background
            ctx.fillStyle = state.bgColor;
            ctx.fillRect(0, 0, preview.displaySize, preview.displaySize);

            // Render multi-line text
            this.renderMultiLineText(ctx, preview.displaySize, state);
        });
    },

    /**
     * Render app icon previews (iOS and Android).
     * @param {Object} state - Application state
     */
    renderAppIconPreviews(state) {
        // iOS icon
        const iosCanvas = document.getElementById('appIconIOS');
        if (iosCanvas) {
            iosCanvas.width = CONFIG.SAVED_CONFIG_PREVIEW;
            iosCanvas.height = CONFIG.SAVED_CONFIG_PREVIEW;
            this.renderAppIcon(
                iosCanvas.getContext('2d'),
                CONFIG.SAVED_CONFIG_PREVIEW,
                CONFIG.RADIUS.IOS,
                state
            );
        }

        // Android icon
        const androidCanvas = document.getElementById('appIconAndroid');
        if (androidCanvas) {
            androidCanvas.width = CONFIG.SAVED_CONFIG_PREVIEW;
            androidCanvas.height = CONFIG.SAVED_CONFIG_PREVIEW;
            this.renderAppIcon(
                androidCanvas.getContext('2d'),
                CONFIG.SAVED_CONFIG_PREVIEW,
                CONFIG.RADIUS.ANDROID,
                state
            );
        }
    }
};
