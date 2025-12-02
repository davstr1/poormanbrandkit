// The Poor Man's Brand Kit - Renderer Module
// Handles all canvas and SVG rendering operations

const Renderer = {
    /**
     * Render multi-line text on a canvas with automatic scaling.
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
     * @param {number} size - Canvas size in pixels
     * @param {Object} state - Application state (lines, font, colors, etc.)
     * @param {number} padding - Padding ratio (0-1)
     */
    renderMultiLineText(ctx, size, state, padding = CONFIG.PADDING.LOGO) {
        const paddingPx = size * padding;
        const availableSize = size - paddingPx * 2;

        // Calculate dimensions for all lines at base size
        let maxLineWidth = 0;
        let totalHeight = 0;
        const lineMetrics = [];

        state.lines.forEach((line, index) => {
            const lineFontSize = (line.fontSize / 100) * state.baseFontSize;
            ctx.font = `${state.fontWeight} ${lineFontSize}px "${state.font}"`;

            let lineWidth = 0;
            line.letters.forEach((letter, i) => {
                lineWidth += ctx.measureText(letter.char).width;
                if (i < line.letters.length - 1) {
                    lineWidth += line.letterSpacing;
                }
            });

            maxLineWidth = Math.max(maxLineWidth, lineWidth);
            const lineHeight = lineFontSize * 1.1;
            totalHeight += lineHeight;
            if (index < state.lines.length - 1) {
                totalHeight += state.lineSpacing;
            }

            lineMetrics.push({ lineWidth, lineHeight, lineFontSize, line });
        });

        // Calculate scale to fit
        const scaleX = availableSize / maxLineWidth;
        const scaleY = availableSize / totalHeight;
        const scale = Math.min(scaleX, scaleY, 1);

        // Recalculate with scaled dimensions
        const scaledTotalHeight = totalHeight * scale;
        let startY = (size - scaledTotalHeight) / 2;

        // Draw each line
        lineMetrics.forEach(({ lineWidth, lineHeight, lineFontSize, line }) => {
            const scaledFontSize = lineFontSize * scale;
            const scaledLineHeight = lineHeight * scale;
            const scaledLineSpacing = state.lineSpacing * scale;

            ctx.font = `${state.fontWeight} ${scaledFontSize}px "${state.font}"`;
            ctx.textBaseline = 'top';

            // Recalculate line width with scaled font
            let scaledLineWidth = 0;
            const scaledLetterSpacing = line.letterSpacing * scale;
            line.letters.forEach((letter, i) => {
                scaledLineWidth += ctx.measureText(letter.char).width;
                if (i < line.letters.length - 1) {
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
                // center
                x = (size - scaledLineWidth) / 2;
            }

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
                ctx.fillText(letter.char, x, startY);
            });

            startY += scaledLineHeight + scaledLineSpacing;
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

        // Draw rounded rectangle background
        ctx.beginPath();
        ctx.roundRect(0, 0, size, size, radius);
        ctx.fillStyle = state.appIconBg;
        ctx.fill();

        // Draw border if enabled (inset to avoid corner overflow)
        if (state.appIconBorderEnabled) {
            const borderWidth = Math.max(1, size / 120);
            const inset = borderWidth / 2;
            ctx.beginPath();
            ctx.roundRect(inset, inset, size - borderWidth, size - borderWidth, radius - inset);
            ctx.strokeStyle = state.appIconBorder;
            ctx.lineWidth = borderWidth;
            ctx.stroke();
        }

        // Clip to rounded rectangle for the logo
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, size, size, radius);
        ctx.clip();

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
        if (state.bgType === 'color') {
            ctx.fillStyle = state.bgColor;
            ctx.fillRect(0, 0, size, size);
        }

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
            if (state.bgType === 'color') {
                ctx.fillStyle = state.bgColor;
                ctx.fillRect(0, 0, preview.displaySize, preview.displaySize);
            }

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
