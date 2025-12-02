// The Poor Man's Brand Kit Maker - Main Application

class BrandKitGenerator {
    constructor() {
        // State
        this.logoText = 'Brand';
        this.letters = [];
        this.font = 'Montserrat';
        this.fontWeight = '700';
        this.fontSize = 100;
        this.letterSpacing = 0;
        this.defaultColor = '#333333';
        this.bgType = 'transparent';
        this.bgColor = '#ffffff';
        this.layerOrder = 'right'; // 'right' = droite dessus, 'left' = gauche dessus
        this.currentLetterIndex = null;

        // App icon settings
        this.appIconBg = '#ffffff';
        this.appIconBorder = '#e0e0e0';
        this.appIconBorderEnabled = true;

        // Font cache for opentype.js
        this.opentypeFont = null;
        this.fontCacheKey = null;
        this.fontLoading = false;

        // DOM Elements
        this.canvas = document.getElementById('logoCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.svgElement = document.getElementById('logoSvg');

        // Initialize
        this.init();
    }

    init() {
        this.loadGoogleFonts();
        this.setupFontSelector();
        this.bindEvents();
        this.updateLetters();
        this.loadSavedConfigs();
        this.render();
    }

    loadGoogleFonts() {
        // Get all font names from the hidden select element
        const select = document.getElementById('fontSelect');
        this.fontData = [];

        // Extract fonts with their categories
        select.querySelectorAll('optgroup').forEach(group => {
            const category = group.label;
            group.querySelectorAll('option').forEach(option => {
                if (option.value) {
                    this.fontData.push({
                        name: option.value,
                        category: category,
                        selected: option.selected
                    });
                }
            });
        });

        // Build the custom font list UI
        this.buildFontList();

        // Load fonts via Google Fonts CSS API
        const fontNames = this.fontData.map(f => f.name.replace(/ /g, '+')).join('|');

        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css?family=${fontNames}&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);

        link.onload = () => {
            this.render();
        };

        // Fallback render
        setTimeout(() => this.render(), 1500);
    }

    buildFontList() {
        const fontList = document.getElementById('fontList');
        fontList.innerHTML = '';

        let currentCategory = '';

        this.fontData.forEach(font => {
            // Add category header if new category
            if (font.category !== currentCategory) {
                currentCategory = font.category;
                const categoryEl = document.createElement('div');
                categoryEl.className = 'font-category';
                categoryEl.textContent = font.category;
                categoryEl.dataset.category = font.category;
                fontList.appendChild(categoryEl);
            }

            // Add font option with name and preview
            const optionEl = document.createElement('div');
            optionEl.className = 'font-option' + (font.selected ? ' selected' : '');
            optionEl.dataset.font = font.name;
            optionEl.dataset.category = font.category;

            // Font name (normal font)
            const nameSpan = document.createElement('span');
            nameSpan.className = 'font-name';
            nameSpan.textContent = font.name;

            // Logo preview (in this font) with colored letters
            const previewSpan = document.createElement('span');
            previewSpan.className = 'font-preview';
            previewSpan.style.fontFamily = `"${font.name}", sans-serif`;

            // Scale letter spacing proportionally (1.4rem ≈ 22px vs fontSize)
            const dropdownDisplaySize = 22;
            const scaledSpacing = (this.letterSpacing / this.fontSize) * dropdownDisplaySize;
            previewSpan.style.letterSpacing = scaledSpacing + 'px';

            // Create colored letter spans (inline, not inline-block to preserve letter-spacing)
            this.letters.forEach((letter) => {
                const letterSpan = document.createElement('span');
                letterSpan.textContent = letter.char;
                letterSpan.style.color = letter.color || this.defaultColor;
                previewSpan.appendChild(letterSpan);
            });

            optionEl.appendChild(nameSpan);
            optionEl.appendChild(previewSpan);

            optionEl.addEventListener('click', () => {
                this.selectFont(font.name);
            });

            fontList.appendChild(optionEl);
        });
    }

    updateFontPreviews() {
        // Scale letter spacing proportionally (1.4rem ≈ 22px vs fontSize)
        const dropdownDisplaySize = 22;
        const scaledSpacing = (this.letterSpacing / this.fontSize) * dropdownDisplaySize;

        // Update all font previews with current logo text, colors, and spacing
        document.querySelectorAll('.font-option .font-preview').forEach(preview => {
            // Update letter spacing on container (scaled)
            preview.style.letterSpacing = scaledSpacing + 'px';

            // Rebuild colored letter spans (inline to preserve letter-spacing)
            preview.innerHTML = '';
            this.letters.forEach((letter) => {
                const letterSpan = document.createElement('span');
                letterSpan.textContent = letter.char;
                letterSpan.style.color = letter.color || this.defaultColor;
                preview.appendChild(letterSpan);
            });
        });
    }

    selectFont(fontName) {
        this.font = fontName;

        // Update display - show font name normally
        document.getElementById('fontDisplayText').textContent = fontName;

        // Update selected state in list
        document.querySelectorAll('.font-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.font === fontName);
        });

        // Close dropdown
        document.getElementById('fontSelector').classList.remove('open');

        // Render
        this.render();
    }

    setupFontSelector() {
        const selector = document.getElementById('fontSelector');
        const display = document.getElementById('fontDisplay');

        // Open fullscreen popover on click
        display.addEventListener('click', () => {
            this.openFontPopover();
        });

        // Setup popover events
        document.getElementById('closeFontPopover').addEventListener('click', () => {
            this.closeFontPopover();
        });

        // Search filter in popover
        document.getElementById('fontSearchInput').addEventListener('input', (e) => {
            this.filterFontCards(e.target.value);
        });

        // Letter spacing slider in popover
        document.getElementById('popoverLetterSpacing').addEventListener('input', (e) => {
            this.letterSpacing = parseInt(e.target.value);
            document.getElementById('popoverLetterSpacingValue').textContent = `${this.letterSpacing}px`;
            // Sync with main slider
            document.getElementById('letterSpacing').value = this.letterSpacing;
            document.getElementById('letterSpacingValue').textContent = `${this.letterSpacing}px`;
            // Update all previews in popover
            this.updatePopoverPreviews();
            // Update main preview too
            this.render();
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('fontPopover').classList.contains('show')) {
                this.closeFontPopover();
            }
        });
    }

    updatePopoverPreviews() {
        // Scale letter spacing proportionally
        const cardDisplaySize = 29;
        const headerDisplaySize = 32;
        const cardScaledSpacing = (this.letterSpacing / this.fontSize) * cardDisplaySize;
        const headerScaledSpacing = (this.letterSpacing / this.fontSize) * headerDisplaySize;

        // Update header preview
        const headerPreview = document.getElementById('currentFontPreview');
        if (headerPreview) {
            headerPreview.style.letterSpacing = headerScaledSpacing + 'px';
        }

        // Update all card previews
        document.querySelectorAll('.font-card-preview').forEach(preview => {
            preview.style.letterSpacing = cardScaledSpacing + 'px';
        });
    }

    openFontPopover() {
        const popover = document.getElementById('fontPopover');
        const grid = document.getElementById('fontPopoverGrid');
        const searchInput = document.getElementById('fontSearchInput');

        // Update current font display
        document.getElementById('currentFontName').textContent = this.font;
        this.updateCurrentFontPreview();

        // Sync letter spacing slider
        document.getElementById('popoverLetterSpacing').value = this.letterSpacing;
        document.getElementById('popoverLetterSpacingValue').textContent = `${this.letterSpacing}px`;

        // Build the grid of font cards
        this.buildFontPopoverGrid();

        // Show popover
        popover.classList.add('show');
        searchInput.value = '';
        searchInput.focus();

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    closeFontPopover() {
        document.getElementById('fontPopover').classList.remove('show');
        document.body.style.overflow = '';
    }

    updateCurrentFontPreview() {
        const preview = document.getElementById('currentFontPreview');
        preview.style.fontFamily = `"${this.font}", sans-serif`;

        // Scale letter spacing proportionally to display size (2rem ≈ 32px vs fontSize)
        const displaySize = 32;
        const scaledSpacing = (this.letterSpacing / this.fontSize) * displaySize;
        preview.style.letterSpacing = scaledSpacing + 'px';
        preview.innerHTML = '';

        this.letters.forEach((letter) => {
            const span = document.createElement('span');
            span.textContent = letter.char;
            span.style.color = letter.color || this.defaultColor;
            preview.appendChild(span);
        });
    }

    buildFontPopoverGrid() {
        const grid = document.getElementById('fontPopoverGrid');
        grid.innerHTML = '';

        // Scale letter spacing proportionally to card preview size (1.8rem ≈ 29px vs fontSize)
        const cardDisplaySize = 29;
        const scaledSpacing = (this.letterSpacing / this.fontSize) * cardDisplaySize;

        this.fontData.forEach(font => {
            const card = document.createElement('div');
            card.className = 'font-card' + (font.name === this.font ? ' selected' : '');
            card.dataset.font = font.name;

            // Font name
            const nameEl = document.createElement('div');
            nameEl.className = 'font-card-name';
            nameEl.textContent = font.name;

            // Preview with colored letters
            const previewEl = document.createElement('div');
            previewEl.className = 'font-card-preview';
            previewEl.style.fontFamily = `"${font.name}", sans-serif`;
            previewEl.style.letterSpacing = scaledSpacing + 'px';

            this.letters.forEach((letter) => {
                const span = document.createElement('span');
                span.textContent = letter.char;
                span.style.color = letter.color || this.defaultColor;
                previewEl.appendChild(span);
            });

            card.appendChild(nameEl);
            card.appendChild(previewEl);

            // Click to select
            card.addEventListener('click', () => {
                this.selectFontFromPopover(font.name);
            });

            grid.appendChild(card);
        });
    }

    selectFontFromPopover(fontName) {
        this.font = fontName;

        // Update display
        document.getElementById('fontDisplayText').textContent = fontName;

        // Update selected state in grid
        document.querySelectorAll('.font-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.font === fontName);
        });

        // Update current preview in header
        document.getElementById('currentFontName').textContent = fontName;
        this.updateCurrentFontPreview();

        // Update old dropdown too (for compatibility)
        document.querySelectorAll('.font-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.font === fontName);
        });

        // Close popover and render
        this.closeFontPopover();
        this.render();
    }

    filterFontCards(query) {
        const lowerQuery = query.toLowerCase();
        document.querySelectorAll('.font-card').forEach(card => {
            const fontName = card.dataset.font.toLowerCase();
            card.classList.toggle('hidden', !fontName.includes(lowerQuery));
        });
    }

    filterFonts(query) {
        const lowerQuery = query.toLowerCase();
        const fontList = document.getElementById('fontList');

        // Track which categories have visible fonts
        const visibleCategories = new Set();

        fontList.querySelectorAll('.font-option').forEach(opt => {
            const fontName = opt.dataset.font.toLowerCase();
            const matches = fontName.includes(lowerQuery);
            opt.classList.toggle('hidden', !matches);
            if (matches) {
                visibleCategories.add(opt.dataset.category);
            }
        });

        // Show/hide category headers
        fontList.querySelectorAll('.font-category').forEach(cat => {
            cat.classList.toggle('hidden', !visibleCategories.has(cat.dataset.category));
        });
    }

    bindEvents() {
        // Text input
        document.getElementById('logoText').addEventListener('input', (e) => {
            this.logoText = e.target.value || 'Brand';
            document.getElementById('tabTitle').textContent = this.logoText;
            this.updateLetters();
            this.updateFontPreviews();
            this.render();
        });

        // Font weight
        document.getElementById('fontWeight').addEventListener('change', (e) => {
            this.fontWeight = e.target.value;
            this.render();
        });

        // Font size
        document.getElementById('fontSize').addEventListener('input', (e) => {
            this.fontSize = parseInt(e.target.value);
            document.getElementById('fontSizeValue').textContent = `${this.fontSize}px`;
            this.render();
        });

        // Letter spacing
        document.getElementById('letterSpacing').addEventListener('input', (e) => {
            this.letterSpacing = parseInt(e.target.value);
            document.getElementById('letterSpacingValue').textContent = `${this.letterSpacing}px`;
            this.updateFontPreviews();
            this.render();
        });

        // Default color
        document.getElementById('defaultColor').addEventListener('input', (e) => {
            this.defaultColor = e.target.value;
            this.updateLetterColors();
            this.updateFontPreviews();
            this.render();
        });

        // Layer order
        document.querySelectorAll('input[name="layerOrder"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.layerOrder = e.target.value;
                this.render();
            });
        });

        // Background type
        document.querySelectorAll('input[name="bgType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.bgType = e.target.value;
                document.getElementById('bgColor').disabled = this.bgType === 'transparent';
                this.render();
            });
        });

        // Background color
        document.getElementById('bgColor').addEventListener('input', (e) => {
            this.bgColor = e.target.value;
            this.render();
        });

        // Preview background toggle
        document.querySelectorAll('.bg-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.bg-toggle').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const preview = document.getElementById('mainPreview');
                preview.className = 'main-preview ' + e.target.dataset.bg;
            });
        });

        // App icon controls
        document.getElementById('appIconBg').addEventListener('input', (e) => {
            this.appIconBg = e.target.value;
            this.renderAppIcons();
        });

        document.getElementById('appIconBorder').addEventListener('input', (e) => {
            this.appIconBorder = e.target.value;
            this.renderAppIcons();
        });

        document.getElementById('appIconBorderEnabled').addEventListener('change', (e) => {
            this.appIconBorderEnabled = e.target.checked;
            this.renderAppIcons();
        });

        // Modal events
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('applyColor').addEventListener('click', () => this.applyLetterColor());
        document.getElementById('resetColor').addEventListener('click', () => this.resetLetterColor());

        // Color picker and hex input sync
        const colorPicker = document.getElementById('letterColorPicker');
        const hexInput = document.getElementById('hexInput');

        colorPicker.addEventListener('input', (e) => {
            hexInput.value = e.target.value.toUpperCase();
        });

        hexInput.addEventListener('input', (e) => {
            let value = e.target.value;
            // Add # if missing
            if (value && !value.startsWith('#')) {
                value = '#' + value;
            }
            // Validate hex color
            if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                colorPicker.value = value;
                hexInput.style.borderColor = '#e0e0e0';
            } else if (value.length === 7) {
                hexInput.style.borderColor = '#ff4444';
            }
        });

        // Copy hex color
        document.getElementById('copyHex').addEventListener('click', async () => {
            const hex = hexInput.value.toUpperCase();
            try {
                await navigator.clipboard.writeText(hex);
                this.copiedColor = hex;
                this.showToast('Couleur copiée : ' + hex);
                document.getElementById('copyHex').classList.add('copied');
                setTimeout(() => {
                    document.getElementById('copyHex').classList.remove('copied');
                }, 1000);
            } catch (err) {
                this.showToast('Error copying');
            }
        });

        // Paste hex color
        document.getElementById('pasteHex').addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                let color = text.trim().toUpperCase();
                if (!color.startsWith('#')) {
                    color = '#' + color;
                }
                if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
                    hexInput.value = color;
                    colorPicker.value = color;
                    this.showToast('Couleur collée : ' + color);
                    this.updateClipboardPreview(color);
                } else {
                    this.showToast('Couleur invalide dans le presse-papiers');
                }
            } catch (err) {
                this.showToast('Impossible de lire le presse-papiers');
            }
        });

        // Generate button
        document.getElementById('generateBtn').addEventListener('click', () => this.generateBrandKit());

        // Close modal on outside click
        document.getElementById('colorModal').addEventListener('click', (e) => {
            if (e.target.id === 'colorModal') this.closeModal();
        });
    }

    showToast(message) {
        // Remove existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 2000);
    }

    updateClipboardPreview(color) {
        const container = document.getElementById('clipboardColor');
        const preview = document.getElementById('clipboardPreview');
        const hex = document.getElementById('clipboardHex');

        if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) {
            container.style.display = 'flex';
            preview.style.backgroundColor = color;
            hex.textContent = color;
        } else {
            container.style.display = 'none';
        }
    }

    updateLetters() {
        const oldLetters = [...this.letters];
        this.letters = this.logoText.split('').map((char, index) => {
            // Preserve custom color if letter exists at same position
            const oldLetter = oldLetters[index];
            return {
                char,
                color: oldLetter && oldLetter.char === char ? oldLetter.color : null
            };
        });
        this.renderLetterButtons();
    }

    updateLetterColors() {
        this.letters.forEach(letter => {
            if (!letter.color) {
                letter.customColor = false;
            }
        });
        this.renderLetterButtons();
    }

    renderLetterButtons() {
        const container = document.getElementById('letterButtons');
        container.innerHTML = '';

        this.letters.forEach((letter, index) => {
            const btn = document.createElement('button');
            btn.className = 'letter-btn' + (letter.color ? ' has-custom-color' : '');
            btn.textContent = letter.char;
            btn.style.color = letter.color || this.defaultColor;
            btn.addEventListener('click', () => this.openColorPicker(index));
            container.appendChild(btn);
        });
    }

    openColorPicker(index) {
        this.currentLetterIndex = index;
        const letter = this.letters[index];
        const color = letter.color || this.defaultColor;
        document.getElementById('modalLetter').textContent = letter.char;
        document.getElementById('letterColorPicker').value = color;
        document.getElementById('hexInput').value = color.toUpperCase();
        document.getElementById('clipboardColor').style.display = 'none';
        document.getElementById('colorModal').classList.add('show');
    }

    closeModal() {
        document.getElementById('colorModal').classList.remove('show');
        this.currentLetterIndex = null;
    }

    applyLetterColor() {
        if (this.currentLetterIndex !== null) {
            const color = document.getElementById('letterColorPicker').value;
            this.letters[this.currentLetterIndex].color = color;
            this.renderLetterButtons();
            this.updateFontPreviews();
            this.render();
        }
        this.closeModal();
    }

    resetLetterColor() {
        if (this.currentLetterIndex !== null) {
            this.letters[this.currentLetterIndex].color = null;
            this.renderLetterButtons();
            this.updateFontPreviews();
            this.render();
        }
        this.closeModal();
    }

    render() {
        this.renderMainCanvas();
        this.renderPreviews();
        this.renderAppIcons();
    }

    renderMainCanvas() {
        // Render SVG preview using opentype.js paths
        // This ensures WYSIWYG - preview matches SVG export exactly
        this.renderSvgPreview();
    }

    async renderSvgPreview() {
        // Prevent concurrent renders
        if (this.fontLoading) return;

        const padding = 40;

        // Use canvas to measure text dimensions (faster than loading font)
        this.ctx.font = `${this.fontWeight} ${this.fontSize}px "${this.font}"`;

        let totalWidth = 0;
        this.letters.forEach((letter, index) => {
            totalWidth += this.ctx.measureText(letter.char).width;
            if (index < this.letters.length - 1) {
                totalWidth += this.letterSpacing;
            }
        });

        const svgWidth = Math.max(totalWidth + padding * 2, 200);
        const svgHeight = this.fontSize * 1.4 + padding * 2;

        // Set initial SVG size and show placeholder
        this.svgElement.setAttribute('width', svgWidth);
        this.svgElement.setAttribute('height', svgHeight);
        this.svgElement.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);

        // Show loading state only if font not cached
        const cacheKey = `${this.font}:${this.fontWeight}:${this.logoText}`;
        if (!this.opentypeFont || this.fontCacheKey !== cacheKey) {
            this.svgElement.innerHTML = this.bgType === 'color'
                ? `<rect width="100%" height="100%" fill="${this.bgColor}"/><text x="50%" y="50%" text-anchor="middle" fill="#999" font-size="14">Loading...</text>`
                : `<text x="50%" y="50%" text-anchor="middle" fill="#999" font-size="14">Loading...</text>`;
        }

        // Load font asynchronously
        this.fontLoading = true;
        try {
            const font = await this.getOpentypeFont();

            // Re-measure with opentype for accurate SVG positioning
            let x = padding;
            const positions = [];

            this.letters.forEach((letter, index) => {
                const glyph = font.charToGlyph(letter.char);
                const width = glyph.advanceWidth * (this.fontSize / font.unitsPerEm);
                positions.push({ letter, x, width });
                x += width + this.letterSpacing;
            });

            // Recalculate total width with opentype measurements
            const opentypeTotalWidth = positions.length > 0
                ? positions[positions.length - 1].x + positions[positions.length - 1].width - padding
                : 0;
            const finalSvgWidth = Math.max(opentypeTotalWidth + padding * 2, 200);

            // Build SVG content
            let svgContent = '';

            // Background
            if (this.bgType === 'color') {
                svgContent += `<rect width="100%" height="100%" fill="${this.bgColor}"/>`;
            }

            // Y position (baseline)
            const y = padding + this.fontSize;

            // Draw letters in correct order
            const drawOrder = this.layerOrder === 'left' ? [...positions].reverse() : positions;
            drawOrder.forEach(({ letter, x }) => {
                const color = letter.color || this.defaultColor;
                const path = font.getPath(letter.char, x, y, this.fontSize);
                const pathData = path.toPathData(2);
                svgContent += `<path d="${pathData}" fill="${color}"/>`;
            });

            // Update SVG element
            this.svgElement.setAttribute('width', finalSvgWidth);
            this.svgElement.setAttribute('viewBox', `0 0 ${finalSvgWidth} ${svgHeight}`);
            this.svgElement.innerHTML = svgContent;

        } catch (error) {
            console.error('Error rendering SVG preview:', error);
            // Fallback to canvas-based text
            this.svgElement.innerHTML = this.bgType === 'color'
                ? `<rect width="100%" height="100%" fill="${this.bgColor}"/><text x="50%" y="50%" text-anchor="middle" fill="#f00" font-size="12">Loading error</text>`
                : `<text x="50%" y="50%" text-anchor="middle" fill="#f00" font-size="12">Loading error</text>`;
        } finally {
            this.fontLoading = false;
        }
    }

    renderPreviews() {
        const previews = [
            { id: 'preview512', size: 512, displaySize: 128 },
            { id: 'preview256', size: 256, displaySize: 64 },
            { id: 'preview128', size: 128, displaySize: 32 },
            { id: 'preview64', size: 64, displaySize: 32 },
            { id: 'preview32', size: 32, displaySize: 32 },
            { id: 'preview16', size: 16, displaySize: 16 },
            { id: 'faviconPreview', size: 16, displaySize: 16 }
        ];

        previews.forEach(preview => {
            const canvas = document.getElementById(preview.id);
            const ctx = canvas.getContext('2d');

            canvas.width = preview.displaySize;
            canvas.height = preview.displaySize;

            // Clear
            ctx.clearRect(0, 0, preview.displaySize, preview.displaySize);

            // Draw background
            if (this.bgType === 'color') {
                ctx.fillStyle = this.bgColor;
                ctx.fillRect(0, 0, preview.displaySize, preview.displaySize);
            }

            // Calculate font size to fit
            const text = this.logoText;
            let testFontSize = preview.displaySize * 0.8;
            ctx.font = `${this.fontWeight} ${testFontSize}px "${this.font}"`;

            // Measure and adjust
            let textWidth = 0;
            this.letters.forEach((letter, index) => {
                textWidth += ctx.measureText(letter.char).width;
                if (index < this.letters.length - 1) {
                    textWidth += (this.letterSpacing * testFontSize / this.fontSize);
                }
            });

            const scale = Math.min(
                (preview.displaySize * 0.85) / textWidth,
                (preview.displaySize * 0.85) / testFontSize
            );
            const finalFontSize = testFontSize * scale;
            const scaledSpacing = this.letterSpacing * finalFontSize / this.fontSize;

            ctx.font = `${this.fontWeight} ${finalFontSize}px "${this.font}"`;
            ctx.textBaseline = 'middle';

            // Recalculate width with final font
            textWidth = 0;
            this.letters.forEach((letter, index) => {
                textWidth += ctx.measureText(letter.char).width;
                if (index < this.letters.length - 1) {
                    textWidth += scaledSpacing;
                }
            });

            const y = preview.displaySize / 2;

            // Calculate all positions first
            const positions = [];
            let x = (preview.displaySize - textWidth) / 2;
            this.letters.forEach((letter) => {
                positions.push({ letter, x });
                x += ctx.measureText(letter.char).width + scaledSpacing;
            });

            // Draw in order based on layerOrder option
            const drawOrder = this.layerOrder === 'left' ? [...positions].reverse() : positions;
            drawOrder.forEach(({ letter, x }) => {
                ctx.fillStyle = letter.color || this.defaultColor;
                ctx.fillText(letter.char, x, y);
            });
        });
    }

    renderAppIcons() {
        // iOS icon - 22.37% border radius (Apple standard)
        this.renderAppIcon('appIconIOS', 120, 0.2237);

        // Android icon - slightly smaller radius
        this.renderAppIcon('appIconAndroid', 120, 0.15);
    }

    renderAppIcon(canvasId, size, radiusRatio) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        const radius = size * radiusRatio;

        canvas.width = size;
        canvas.height = size;

        // Draw rounded rectangle background
        ctx.beginPath();
        ctx.roundRect(0, 0, size, size, radius);
        ctx.fillStyle = this.appIconBg;
        ctx.fill();

        // Draw border if enabled (inset to avoid corner overflow)
        if (this.appIconBorderEnabled) {
            const borderWidth = 1;
            const inset = borderWidth / 2;
            ctx.beginPath();
            ctx.roundRect(inset, inset, size - borderWidth, size - borderWidth, radius - inset);
            ctx.strokeStyle = this.appIconBorder;
            ctx.lineWidth = borderWidth;
            ctx.stroke();
        }

        // Clip to rounded rectangle for the logo
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, size, size, radius);
        ctx.clip();

        // Draw logo text centered
        const padding = size * 0.15;
        const availableSize = size - padding * 2;

        // Calculate font size to fit
        let testFontSize = availableSize * 0.6;
        ctx.font = `${this.fontWeight} ${testFontSize}px "${this.font}"`;

        let textWidth = 0;
        this.letters.forEach((letter, index) => {
            textWidth += ctx.measureText(letter.char).width;
            if (index < this.letters.length - 1) {
                textWidth += (this.letterSpacing * testFontSize / this.fontSize);
            }
        });

        const scale = Math.min(
            availableSize / textWidth,
            availableSize * 0.7 / testFontSize
        );
        const finalFontSize = testFontSize * scale;
        const scaledSpacing = this.letterSpacing * finalFontSize / this.fontSize;

        ctx.font = `${this.fontWeight} ${finalFontSize}px "${this.font}"`;
        ctx.textBaseline = 'middle';

        // Recalculate width
        textWidth = 0;
        this.letters.forEach((letter, index) => {
            textWidth += ctx.measureText(letter.char).width;
            if (index < this.letters.length - 1) {
                textWidth += scaledSpacing;
            }
        });

        const y = size / 2;

        // Calculate all positions first
        const positions = [];
        let x = (size - textWidth) / 2;
        this.letters.forEach((letter) => {
            positions.push({ letter, x });
            x += ctx.measureText(letter.char).width + scaledSpacing;
        });

        // Draw in order based on layerOrder option
        const drawOrder = this.layerOrder === 'left' ? [...positions].reverse() : positions;
        drawOrder.forEach(({ letter, x }) => {
            ctx.fillStyle = letter.color || this.defaultColor;
            ctx.fillText(letter.char, x, y);
        });

        ctx.restore();
    }

    renderToCanvas(size) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = size;
        canvas.height = size;

        // Background
        if (this.bgType === 'color') {
            ctx.fillStyle = this.bgColor;
            ctx.fillRect(0, 0, size, size);
        }

        // Calculate font size to fit
        let testFontSize = size * 0.6;
        ctx.font = `${this.fontWeight} ${testFontSize}px "${this.font}"`;

        let textWidth = 0;
        this.letters.forEach((letter, index) => {
            textWidth += ctx.measureText(letter.char).width;
            if (index < this.letters.length - 1) {
                textWidth += (this.letterSpacing * testFontSize / this.fontSize);
            }
        });

        const scale = Math.min(
            (size * 0.85) / textWidth,
            (size * 0.7) / testFontSize
        );
        const finalFontSize = testFontSize * scale;
        const scaledSpacing = this.letterSpacing * finalFontSize / this.fontSize;

        ctx.font = `${this.fontWeight} ${finalFontSize}px "${this.font}"`;
        ctx.textBaseline = 'middle';

        // Recalculate
        textWidth = 0;
        this.letters.forEach((letter, index) => {
            textWidth += ctx.measureText(letter.char).width;
            if (index < this.letters.length - 1) {
                textWidth += scaledSpacing;
            }
        });

        const y = size / 2;

        // Calculate all positions first
        const positions = [];
        let x = (size - textWidth) / 2;
        this.letters.forEach((letter) => {
            positions.push({ letter, x });
            x += ctx.measureText(letter.char).width + scaledSpacing;
        });

        // Draw in order based on layerOrder option
        const drawOrder = this.layerOrder === 'left' ? [...positions].reverse() : positions;
        drawOrder.forEach(({ letter, x }) => {
            ctx.fillStyle = letter.color || this.defaultColor;
            ctx.fillText(letter.char, x, y);
        });

        return canvas;
    }

    renderAppIconToCanvas(size, radiusRatio) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const radius = size * radiusRatio;

        canvas.width = size;
        canvas.height = size;

        // Draw rounded rectangle background
        ctx.beginPath();
        ctx.roundRect(0, 0, size, size, radius);
        ctx.fillStyle = this.appIconBg;
        ctx.fill();

        // Draw border if enabled (inset to avoid corner overflow)
        if (this.appIconBorderEnabled) {
            const borderWidth = Math.max(1, size / 120);
            const inset = borderWidth / 2;
            ctx.beginPath();
            ctx.roundRect(inset, inset, size - borderWidth, size - borderWidth, radius - inset);
            ctx.strokeStyle = this.appIconBorder;
            ctx.lineWidth = borderWidth;
            ctx.stroke();
        }

        // Clip to rounded rectangle for the logo
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, size, size, radius);
        ctx.clip();

        // Draw logo text centered
        const padding = size * 0.15;
        const availableSize = size - padding * 2;

        let testFontSize = availableSize * 0.6;
        ctx.font = `${this.fontWeight} ${testFontSize}px "${this.font}"`;

        let textWidth = 0;
        this.letters.forEach((letter, index) => {
            textWidth += ctx.measureText(letter.char).width;
            if (index < this.letters.length - 1) {
                textWidth += (this.letterSpacing * testFontSize / this.fontSize);
            }
        });

        const scale = Math.min(
            availableSize / textWidth,
            availableSize * 0.7 / testFontSize
        );
        const finalFontSize = testFontSize * scale;
        const scaledSpacing = this.letterSpacing * finalFontSize / this.fontSize;

        ctx.font = `${this.fontWeight} ${finalFontSize}px "${this.font}"`;
        ctx.textBaseline = 'middle';

        textWidth = 0;
        this.letters.forEach((letter, index) => {
            textWidth += ctx.measureText(letter.char).width;
            if (index < this.letters.length - 1) {
                textWidth += scaledSpacing;
            }
        });

        const y = size / 2;
        const positions = [];
        let x = (size - textWidth) / 2;
        this.letters.forEach((letter) => {
            positions.push({ letter, x });
            x += ctx.measureText(letter.char).width + scaledSpacing;
        });

        const drawOrder = this.layerOrder === 'left' ? [...positions].reverse() : positions;
        drawOrder.forEach(({ letter, x }) => {
            ctx.fillStyle = letter.color || this.defaultColor;
            ctx.fillText(letter.char, x, y);
        });

        ctx.restore();
        return canvas;
    }

    // ==================== SVG GENERATION ====================

    // Load wawoff2 WASM module for WOFF2 decompression
    async loadWawoff2() {
        if (window.wawoff2Ready) {
            console.log('wawoff2 already loaded');
            return;
        }

        console.log('Loading wawoff2...');
        return new Promise((resolve, reject) => {
            // Set up Module before loading script
            window.Module = {
                onRuntimeInitialized: () => {
                    console.log('wawoff2 initialized');
                    window.wawoff2Ready = true;
                    resolve();
                }
            };

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/wawoff2@2.0.1/build/decompress_binding.js';
            script.onerror = () => {
                console.error('Failed to load wawoff2 script');
                reject(new Error('Failed to load wawoff2'));
            };
            document.head.appendChild(script);
        });
    }

    async fetchAndDecompressFont() {
        // Get font URL from Google Fonts CSS
        // Add text parameter with our logo text to ensure those glyphs are included
        const fontFamily = this.font.replace(/ /g, '+');
        const textParam = encodeURIComponent(this.logoText);
        // Request specific weight explicitly
        const cssUrl = `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@${this.fontWeight}&text=${textParam}&display=swap`;

        console.log('Fetching font CSS:', cssUrl);
        console.log('Requested weight:', this.fontWeight);
        const cssResponse = await fetch(cssUrl);
        const css = await cssResponse.text();
        console.log('CSS response:', css);

        // Extract WOFF2 URL
        const urlMatch = css.match(/url\(([^)]+)\)/);
        if (!urlMatch) {
            throw new Error('Could not find font URL in CSS');
        }
        const fontUrl = urlMatch[1].replace(/['"]/g, '');
        console.log('Font URL:', fontUrl);

        // Fetch WOFF2 font
        const fontResponse = await fetch(fontUrl);
        const woff2Buffer = await fontResponse.arrayBuffer();
        console.log('WOFF2 buffer size:', woff2Buffer.byteLength);

        // Decompress WOFF2 to TTF
        console.log('Decompressing WOFF2...');
        const ttfUint8 = Module.decompress(woff2Buffer);
        console.log('TTF decompressed, length:', ttfUint8.length);

        // Convert Uint8Array to ArrayBuffer
        const ttfBuffer = ttfUint8.buffer.slice(ttfUint8.byteOffset, ttfUint8.byteOffset + ttfUint8.byteLength);
        console.log('TTF ArrayBuffer size:', ttfBuffer.byteLength);

        return ttfBuffer;
    }

    // Get cached opentype font or load it
    async getOpentypeFont() {
        const cacheKey = `${this.font}:${this.fontWeight}:${this.logoText}`;

        // Return cached font if valid
        if (this.opentypeFont && this.fontCacheKey === cacheKey) {
            return this.opentypeFont;
        }

        // Load wawoff2 and font
        await this.loadWawoff2();
        const ttfBuffer = await this.fetchAndDecompressFont();
        const font = opentype.parse(ttfBuffer);

        // Cache it
        this.opentypeFont = font;
        this.fontCacheKey = cacheKey;

        return font;
    }

    // Fetch full font (not subsetted) for inclusion in brand kit
    async fetchFullFont() {
        await this.loadWawoff2();

        const fontFamily = this.font.replace(/ /g, '+');
        // Request full font WITHOUT text parameter to get all glyphs
        const cssUrl = `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@${this.fontWeight}&display=swap`;

        console.log('Fetching full font CSS:', cssUrl);
        const cssResponse = await fetch(cssUrl);
        const css = await cssResponse.text();

        // Extract WOFF2 URL
        const urlMatch = css.match(/url\(([^)]+)\)/);
        if (!urlMatch) {
            throw new Error('Could not find font URL in CSS');
        }
        const fontUrl = urlMatch[1].replace(/['"]/g, '');

        // Fetch WOFF2 font
        const fontResponse = await fetch(fontUrl);
        const woff2Buffer = await fontResponse.arrayBuffer();

        // Decompress WOFF2 to TTF
        const ttfUint8 = Module.decompress(woff2Buffer);
        const ttfBuffer = ttfUint8.buffer.slice(ttfUint8.byteOffset, ttfUint8.byteOffset + ttfUint8.byteLength);

        return ttfBuffer;
    }

    async generateSVG() {
        // Use cached opentype font
        const font = await this.getOpentypeFont();
        console.log('Using font:', font.names.fullName);

        // Use same padding as preview (40) for consistency
        const padding = 40;

        // Calculate positions using opentype.js (same as preview)
        let x = padding;
        const positions = [];

        this.letters.forEach((letter, index) => {
            const glyph = font.charToGlyph(letter.char);
            const width = glyph.advanceWidth * (this.fontSize / font.unitsPerEm);
            positions.push({ letter, x, width });
            x += width + this.letterSpacing;
        });

        // Calculate total width
        const totalWidth = positions.length > 0
            ? positions[positions.length - 1].x + positions[positions.length - 1].width - padding
            : 0;

        const svgWidth = Math.ceil(Math.max(totalWidth + padding * 2, 200));
        const svgHeight = Math.ceil(this.fontSize * 1.4 + padding * 2);
        const y = padding + this.fontSize;

        // Build SVG
        let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">
`;

        // Add background if needed
        if (this.bgType === 'color') {
            svgContent += `  <rect width="100%" height="100%" fill="${this.bgColor}"/>\n`;
        }

        // Draw letters in correct order
        const drawOrder = this.layerOrder === 'left' ? [...positions].reverse() : positions;
        drawOrder.forEach(({ letter, x }) => {
            const color = letter.color || this.defaultColor;
            const path = font.getPath(letter.char, x, y, this.fontSize);
            const pathData = path.toPathData(2);
            svgContent += `  <path d="${pathData}" fill="${color}"/>\n`;
        });

        svgContent += `</svg>`;
        return svgContent;
    }

    async generateBrandKit() {
        const btn = document.getElementById('generateBtn');
        const btnText = btn.querySelector('.btn-text');
        const btnLoading = btn.querySelector('.btn-loading');
        const progressBar = document.getElementById('progressBar');
        const progressFill = progressBar.querySelector('.progress-fill');
        const progressText = progressBar.querySelector('.progress-text');

        btn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';
        progressBar.style.display = 'block';

        const zip = new JSZip();
        const assets = [];

        // Define all assets to generate
        const logoSizes = [1024, 512, 256, 128];
        const faviconSizes = [16, 32, 48, 180];
        const iosSizes = [1024, 180, 167, 152, 120];
        const androidSizes = [512, 192, 144, 96, 72, 48];

        // Logos
        logoSizes.forEach(size => {
            assets.push({ folder: 'logos', name: `logo-${size}.png`, size });
        });

        // Favicons
        faviconSizes.forEach(size => {
            const name = size === 180 ? 'apple-touch-icon.png' : `favicon-${size}x${size}.png`;
            assets.push({ folder: 'favicons', name, size });
        });

        // iOS (with app icon style)
        iosSizes.forEach(size => {
            assets.push({ folder: 'ios', name: `ios-${size}.png`, size, type: 'appicon', radius: 0.2237 });
        });

        // Android (with app icon style)
        androidSizes.forEach(size => {
            assets.push({ folder: 'android', name: `android-${size}.png`, size, type: 'appicon', radius: 0.15 });
        });

        const totalAssets = assets.length;
        let completed = 0;

        for (const asset of assets) {
            let canvas;
            if (asset.type === 'appicon') {
                canvas = this.renderAppIconToCanvas(asset.size, asset.radius);
            } else {
                canvas = this.renderToCanvas(asset.size);
            }
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            zip.folder(asset.folder).file(asset.name, blob);

            completed++;
            const progress = Math.round((completed / totalAssets) * 100);
            progressFill.style.width = progress + '%';
            progressText.textContent = progress + '%';

            // Allow UI to update
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Generate SVG file
        progressText.textContent = 'Generating SVG...';
        try {
            console.log('Starting SVG generation...');
            const svg = await this.generateSVG();
            console.log('SVG generated successfully');
            zip.folder('logos').file('logo.svg', svg);
        } catch (e) {
            console.error('SVG generation failed:', e);
            alert('SVG Error: ' + e.message);
        }

        // Add font file
        progressText.textContent = 'Downloading font...';
        try {
            console.log('Fetching full font...');
            const fontBuffer = await this.fetchFullFont();
            const fontFileName = `${this.font.replace(/\s+/g, '-')}-${this.fontWeight}.ttf`;
            zip.folder('fonts').file(fontFileName, fontBuffer);
            console.log('Font added:', fontFileName);

            // Add font license info
            const fontLicense = `Font: ${this.font}
Weight: ${this.fontWeight}
Source: Google Fonts (https://fonts.google.com/specimen/${this.font.replace(/\s+/g, '+')})

License:
--------
This font is distributed under the Open Font License (OFL) or Apache 2.0.
You can use it freely in your personal and commercial projects.

For more information about this font's specific license,
visit: https://fonts.google.com/specimen/${this.font.replace(/\s+/g, '+')}#license
`;
            zip.folder('fonts').file('LICENSE.txt', fontLicense);
        } catch (e) {
            console.error('Font download failed:', e);
            // Non-blocking error - continue without font
        }

        // Add README
        const readme = `Brand Kit - ${this.logoText}
================================

Generated with The Poor Man's Brand Kit Maker

Font: ${this.font} (${this.fontWeight})

Contents:
- /logos/ - Logo in various sizes (1024px, 512px, 256px, 128px) + SVG
- /favicons/ - Web favicons and Apple touch icon
- /ios/ - iOS App Store icons
- /android/ - Android/Google Play icons
- /fonts/ - Font file used for the logo (TTF)

Usage:
------

Web Favicons:
Add these to your HTML <head>:
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

iOS:
Use ios-1024.png for App Store submission.
Other sizes for various device icons.

Android:
Use android-512.png for Play Store submission.
Other sizes for launcher icons.

Font:
The /fonts/ folder contains the TTF font used for the logo.
Install it on your system to use it in other software.
See LICENSE.txt for license information.
`;

        zip.file('README.txt', readme);

        // Generate and download
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brand_kit_${this.logoText.toLowerCase().replace(/\s+/g, '_')}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Reset UI
        btn.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        progressBar.style.display = 'none';
        progressFill.style.width = '0%';
    }

    // ==================== SAVED CONFIGS ====================

    getConfigData() {
        return {
            logoText: this.logoText,
            letters: this.letters.map(l => ({ char: l.char, color: l.color })),
            font: this.font,
            fontWeight: this.fontWeight,
            fontSize: this.fontSize,
            letterSpacing: this.letterSpacing,
            defaultColor: this.defaultColor,
            bgType: this.bgType,
            bgColor: this.bgColor,
            layerOrder: this.layerOrder,
            appIconBg: this.appIconBg,
            appIconBorder: this.appIconBorder,
            appIconBorderEnabled: this.appIconBorderEnabled,
            timestamp: Date.now()
        };
    }

    saveConfig() {
        const configs = this.getSavedConfigs();
        const newConfig = this.getConfigData();

        // Generate preview image
        const previewCanvas = this.renderToCanvas(120);
        newConfig.preview = previewCanvas.toDataURL('image/png');

        configs.push(newConfig);
        localStorage.setItem('brandkit_configs', JSON.stringify(configs));

        this.renderSavedConfigs();
        this.showToast('Configuration sauvegardée');
    }

    getSavedConfigs() {
        try {
            const data = localStorage.getItem('brandkit_configs');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    loadSavedConfigs() {
        // Bind save button
        document.getElementById('saveConfigBtn').addEventListener('click', () => {
            this.saveConfig();
        });

        this.renderSavedConfigs();
    }

    renderSavedConfigs() {
        const container = document.getElementById('savedConfigsList');
        const configs = this.getSavedConfigs();

        if (configs.length === 0) {
            container.innerHTML = '<p class="no-configs">Aucune configuration sauvegardée</p>';
            return;
        }

        container.innerHTML = '';

        configs.forEach((config, index) => {
            const item = document.createElement('div');
            item.className = 'saved-config-item';

            // Preview canvas
            const canvas = document.createElement('canvas');
            canvas.width = 120;
            canvas.height = 60;
            const ctx = canvas.getContext('2d');

            // Load preview image
            if (config.preview) {
                const img = new Image();
                img.onload = () => {
                    // Draw centered and scaled
                    const scale = Math.min(120 / img.width, 60 / img.height);
                    const w = img.width * scale;
                    const h = img.height * scale;
                    ctx.drawImage(img, (120 - w) / 2, (60 - h) / 2, w, h);
                };
                img.src = config.preview;
            }

            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'saved-config-delete';
            deleteBtn.innerHTML = '×';
            deleteBtn.title = 'Supprimer';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteConfig(index);
            });

            item.appendChild(canvas);
            item.appendChild(deleteBtn);

            // Click to load
            item.addEventListener('click', () => {
                this.loadConfig(config);
            });

            container.appendChild(item);
        });
    }

    loadConfig(config) {
        // Restore all settings
        this.logoText = config.logoText;
        this.letters = config.letters.map(l => ({ char: l.char, color: l.color }));
        this.font = config.font;
        this.fontWeight = config.fontWeight;
        this.fontSize = config.fontSize;
        this.letterSpacing = config.letterSpacing;
        this.defaultColor = config.defaultColor;
        this.bgType = config.bgType;
        this.bgColor = config.bgColor;
        this.layerOrder = config.layerOrder || 'right';
        this.appIconBg = config.appIconBg || '#ffffff';
        this.appIconBorder = config.appIconBorder || '#e0e0e0';
        this.appIconBorderEnabled = config.appIconBorderEnabled !== false;

        // Update UI controls
        document.getElementById('logoText').value = this.logoText;
        document.getElementById('tabTitle').textContent = this.logoText;
        document.getElementById('fontDisplayText').textContent = this.font;
        document.getElementById('fontWeight').value = this.fontWeight;
        document.getElementById('fontSize').value = this.fontSize;
        document.getElementById('fontSizeValue').textContent = `${this.fontSize}px`;
        document.getElementById('letterSpacing').value = this.letterSpacing;
        document.getElementById('letterSpacingValue').textContent = `${this.letterSpacing}px`;
        document.getElementById('defaultColor').value = this.defaultColor;
        document.getElementById('bgColor').value = this.bgColor;

        // Background type radio
        document.querySelectorAll('input[name="bgType"]').forEach(radio => {
            radio.checked = radio.value === this.bgType;
        });
        document.getElementById('bgColor').disabled = this.bgType === 'transparent';

        // Layer order radio
        document.querySelectorAll('input[name="layerOrder"]').forEach(radio => {
            radio.checked = radio.value === this.layerOrder;
        });

        // App icon controls
        document.getElementById('appIconBg').value = this.appIconBg;
        document.getElementById('appIconBorder').value = this.appIconBorder;
        document.getElementById('appIconBorderEnabled').checked = this.appIconBorderEnabled;

        // Update font selector
        document.querySelectorAll('.font-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.font === this.font);
        });

        // Update letter buttons and font previews
        this.renderLetterButtons();
        this.updateFontPreviews();

        // Render
        this.render();
        this.showToast('Configuration chargée');
    }

    deleteConfig(index) {
        const configs = this.getSavedConfigs();
        configs.splice(index, 1);
        localStorage.setItem('brandkit_configs', JSON.stringify(configs));
        this.renderSavedConfigs();
        this.showToast('Configuration supprimée');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new BrandKitGenerator();
});
