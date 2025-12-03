// The Poor Man's Brand Kit Maker - Main Application

// ==================== CONFIGURATION ====================
const CONFIG = {
    // Maximum number of text lines
    MAX_LINES: 3,

    // Preview sizes (for UI display)
    PREVIEW_SIZES: [
        { id: 'preview512', size: 512, displaySize: 128 },
        { id: 'preview256', size: 256, displaySize: 64 },
        { id: 'preview128', size: 128, displaySize: 32 },
        { id: 'preview64', size: 64, displaySize: 32 },
        { id: 'preview32', size: 32, displaySize: 32 },
        { id: 'preview16', size: 16, displaySize: 16 },
        { id: 'faviconPreview', size: 16, displaySize: 16 }
    ],

    // Export sizes for brand kit ZIP
    EXPORT: {
        LOGO_SIZES: [1024, 512, 256, 128],
        FAVICON_SIZES: [16, 32, 48, 180],
        IOS_SIZES: [1024, 180, 167, 152, 120],
        ANDROID_SIZES: [512, 192, 144, 96, 72, 48]
    },

    // App icon corner radius ratios
    RADIUS: {
        IOS: 0.2237,      // Apple standard (22.37%)
        ANDROID: 0.15     // Material design
    },

    // Padding ratios for canvas rendering
    PADDING: {
        LOGO: 0.075,      // 7.5% padding for logos
        APP_ICON: 0.15,   // 15% padding for app icons
        SVG: 40           // Fixed padding in pixels for SVG
    },

    // Font preview display sizes (in pixels)
    FONT_PREVIEW: {
        DROPDOWN: 22,     // Size in dropdown list
        CARD: 29,         // Size in popover cards
        HEADER: 32        // Size in popover header
    },

    // Saved config preview size
    SAVED_CONFIG_PREVIEW: 120,

    // Default values
    DEFAULTS: {
        FONT: 'Montserrat',
        FONT_WEIGHT: '700',
        BASE_FONT_SIZE: 100,
        LINE_SPACING: 10,
        HORIZONTAL_ALIGN: 'center',
        DEFAULT_COLOR: '#333333',
        BG_TYPE: 'transparent',
        BG_COLOR: '#ffffff',
        LAYER_ORDER: 'right',
        APP_ICON_BG: '#ffffff',
        APP_ICON_BORDER: '#e0e0e0'
    }
};

/**
 * Main application class for generating brand kits.
 * Handles multi-line logo creation, font management, and asset export.
 */
class BrandKitGenerator {
    /**
     * Initialize the brand kit generator with default state.
     */
    constructor() {
        // State - Multi-line support
        this.lines = [
            {
                text: 'Brand',
                letters: [],
                fontSize: 100,      // % of baseFontSize
                letterSpacing: 0
            }
        ];
        this.font = CONFIG.DEFAULTS.FONT;
        this.fontWeight = CONFIG.DEFAULTS.FONT_WEIGHT;
        this.baseFontSize = CONFIG.DEFAULTS.BASE_FONT_SIZE;
        this.lineSpacing = CONFIG.DEFAULTS.LINE_SPACING;
        this.horizontalAlign = CONFIG.DEFAULTS.HORIZONTAL_ALIGN;
        this.defaultColor = CONFIG.DEFAULTS.DEFAULT_COLOR;
        this.bgType = CONFIG.DEFAULTS.BG_TYPE;
        this.bgColor = CONFIG.DEFAULTS.BG_COLOR;
        this.layerOrder = CONFIG.DEFAULTS.LAYER_ORDER;
        this.currentLineIndex = 0;
        this.currentLetterIndex = null;

        // Compatibility getters/setters for single-line access
        Object.defineProperty(this, 'logoText', {
            get: () => this.lines[0]?.text || '',
            set: (value) => { if (this.lines[0]) this.lines[0].text = value; }
        });
        Object.defineProperty(this, 'letters', {
            get: () => this.lines[0]?.letters || [],
            set: (value) => { if (this.lines[0]) this.lines[0].letters = value; }
        });
        Object.defineProperty(this, 'fontSize', {
            get: () => this.baseFontSize,
            set: (value) => { this.baseFontSize = value; }
        });
        Object.defineProperty(this, 'letterSpacing', {
            get: () => this.lines[0]?.letterSpacing || 0,
            set: (value) => { if (this.lines[0]) this.lines[0].letterSpacing = value; }
        });

        // App icon settings
        this.appIconBg = CONFIG.DEFAULTS.APP_ICON_BG;
        this.appIconBorder = CONFIG.DEFAULTS.APP_ICON_BORDER;
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

    /**
     * Initialize application: load fonts, setup UI, bind events, render.
     */
    init() {
        this.loadGoogleFonts();
        this.setupFontSelector();
        this.bindEvents();
        this.updateLetters();
        this.loadSavedConfigs();
        this.render();
    }

    /**
     * Load Google Fonts from the hidden select element and build the font list UI.
     */
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

        // Load fonts via Google Fonts CSS API (just for preview, single weight)
        const fontNames = this.fontData.map(f => f.name.replace(/ /g, '+')).join('|');

        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css?family=${fontNames}&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);

        // Load all weights for the default font
        this.loadFontWeights(this.font);

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
        const firstLine = this.lines[0];

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

            // Logo preview (in this font) with colored letters - show first line
            const previewSpan = document.createElement('span');
            previewSpan.className = 'font-preview';
            previewSpan.style.fontFamily = `"${font.name}", sans-serif`;

            // Scale letter spacing proportionally to dropdown display size
            const scaledSpacing = (firstLine.letterSpacing / this.baseFontSize) * CONFIG.FONT_PREVIEW.DROPDOWN;
            previewSpan.style.letterSpacing = scaledSpacing + 'px';

            // Create colored letter spans for first line
            firstLine.letters.forEach((letter) => {
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
        const firstLine = this.lines[0];
        if (!firstLine) return;

        // Scale letter spacing proportionally to dropdown display size
        const scaledSpacing = (firstLine.letterSpacing / this.baseFontSize) * CONFIG.FONT_PREVIEW.DROPDOWN;

        // Update all font previews with first line text, colors, and spacing
        document.querySelectorAll('.font-option .font-preview').forEach(preview => {
            // Update letter spacing on container (scaled)
            preview.style.letterSpacing = scaledSpacing + 'px';

            // Rebuild colored letter spans for first line
            preview.innerHTML = '';
            firstLine.letters.forEach((letter) => {
                const letterSpan = document.createElement('span');
                letterSpan.textContent = letter.char;
                letterSpan.style.color = letter.color || this.defaultColor;
                preview.appendChild(letterSpan);
            });
        });
    }

    selectFont(fontName) {
        this.font = fontName;

        // Load all weights for this font
        this.loadFontWeights(fontName);

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

    /**
     * Load all font weights for a specific font family.
     * @param {string} fontName - The font family name
     */
    loadFontWeights(fontName) {
        const fontFamily = fontName.replace(/ /g, '+');
        const weights = '300;400;500;600;700;800;900';
        const linkId = `font-weights-${fontFamily}`;

        // Don't reload if already loaded
        if (document.getElementById(linkId)) return;

        const link = document.createElement('link');
        link.id = linkId;
        link.href = `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@${weights}&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);

        link.onload = () => this.render();
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

        // Letter spacing slider in popover (controls first line)
        document.getElementById('popoverLetterSpacing').addEventListener('input', (e) => {
            const spacing = parseInt(e.target.value);
            if (this.lines[0]) {
                this.lines[0].letterSpacing = spacing;
            }
            document.getElementById('popoverLetterSpacingValue').textContent = `${spacing}px`;
            // Update all previews in popover
            this.updatePopoverPreviews();
            // Sync line editor slider value without rebuilding
            this.syncLineSpacingSlider(0, spacing);
            // Update main preview
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
        const firstLine = this.lines[0];
        if (!firstLine) return;

        // Scale letter spacing proportionally
        const cardScaledSpacing = (firstLine.letterSpacing / this.baseFontSize) * CONFIG.FONT_PREVIEW.CARD;
        const headerScaledSpacing = (firstLine.letterSpacing / this.baseFontSize) * CONFIG.FONT_PREVIEW.HEADER;

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
        const firstLine = this.lines[0];

        // Update current font display
        document.getElementById('currentFontName').textContent = this.font;
        this.updateCurrentFontPreview();

        // Sync letter spacing slider with first line's spacing
        const spacing = firstLine?.letterSpacing || 0;
        document.getElementById('popoverLetterSpacing').value = spacing;
        document.getElementById('popoverLetterSpacingValue').textContent = `${spacing}px`;

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
        const firstLine = this.lines[0];
        if (!firstLine) return;

        preview.style.fontFamily = `"${this.font}", sans-serif`;

        // Scale letter spacing proportionally to header display size
        const scaledSpacing = (firstLine.letterSpacing / this.baseFontSize) * CONFIG.FONT_PREVIEW.HEADER;
        preview.style.letterSpacing = scaledSpacing + 'px';
        preview.innerHTML = '';

        firstLine.letters.forEach((letter) => {
            const span = document.createElement('span');
            span.textContent = letter.char;
            span.style.color = letter.color || this.defaultColor;
            preview.appendChild(span);
        });
    }

    buildFontPopoverGrid() {
        const grid = document.getElementById('fontPopoverGrid');
        grid.innerHTML = '';

        const firstLine = this.lines[0];
        if (!firstLine) return;

        // Scale letter spacing proportionally to card preview size
        const scaledSpacing = (firstLine.letterSpacing / this.baseFontSize) * CONFIG.FONT_PREVIEW.CARD;

        this.fontData.forEach(font => {
            const card = document.createElement('div');
            card.className = 'font-card' + (font.name === this.font ? ' selected' : '');
            card.dataset.font = font.name;

            // Font name
            const nameEl = document.createElement('div');
            nameEl.className = 'font-card-name';
            nameEl.textContent = font.name;

            // Preview with colored letters from first line
            const previewEl = document.createElement('div');
            previewEl.className = 'font-card-preview';
            previewEl.style.fontFamily = `"${font.name}", sans-serif`;
            previewEl.style.letterSpacing = scaledSpacing + 'px';

            firstLine.letters.forEach((letter) => {
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

        // Load all weights for this font
        this.loadFontWeights(fontName);

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
        // Font weight
        document.getElementById('fontWeight').addEventListener('change', (e) => {
            this.fontWeight = e.target.value;
            this.render();
        });

        // Base font size (global)
        const baseFontSizeEl = document.getElementById('baseFontSize');
        if (baseFontSizeEl) {
            baseFontSizeEl.addEventListener('input', (e) => {
                this.baseFontSize = parseInt(e.target.value);
                document.getElementById('baseFontSizeValue').textContent = `${this.baseFontSize}px`;
                this.render();
            });
        }

        // Line spacing (global)
        const lineSpacingEl = document.getElementById('lineSpacing');
        if (lineSpacingEl) {
            lineSpacingEl.addEventListener('input', (e) => {
                this.lineSpacing = parseInt(e.target.value);
                document.getElementById('lineSpacingValue').textContent = `${this.lineSpacing}px`;
                this.render();
            });
        }

        // Horizontal alignment
        document.querySelectorAll('input[name="horizontalAlign"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.horizontalAlign = e.target.value;
                this.render();
            });
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

        // Grid toggle
        document.getElementById('gridToggle').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            const grid = document.getElementById('previewGrid');
            btn.classList.toggle('active');
            grid.classList.toggle('show');
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
                this.showToast('Color copied: ' + hex);
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
                    this.showToast('Color pasted: ' + color);
                    this.updateClipboardPreview(color);
                } else {
                    this.showToast('Invalid color in clipboard');
                }
            } catch (err) {
                this.showToast('Cannot read clipboard');
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
        // Update letters for all lines
        this.lines.forEach((line) => {
            const oldLetters = [...line.letters];
            line.letters = line.text.split('').map((char, index) => {
                // Preserve custom color if letter exists at same position
                const oldLetter = oldLetters[index];
                return {
                    char,
                    color: oldLetter && oldLetter.char === char ? oldLetter.color : null
                };
            });
        });
        this.renderLineEditors();
    }

    updateLineLetters(lineIndex) {
        const line = this.lines[lineIndex];
        if (!line) return;

        const oldLetters = [...line.letters];
        line.letters = line.text.split('').map((char, index) => {
            const oldLetter = oldLetters[index];
            return {
                char,
                color: oldLetter && oldLetter.char === char ? oldLetter.color : null
            };
        });
        // Only update the letter buttons for this line, not the whole editor
        this.updateLineLetterButtons(lineIndex);
    }

    updateLineLetterButtons(lineIndex) {
        const container = document.getElementById('linesEditor');
        if (!container) return;

        const lineEditor = container.querySelector(`.line-editor[data-line-index="${lineIndex}"]`);
        if (!lineEditor) return;

        const letterButtonsContainer = lineEditor.querySelector('.letter-buttons');
        if (!letterButtonsContainer) return;

        const line = this.lines[lineIndex];
        letterButtonsContainer.innerHTML = '';

        line.letters.forEach((letter, letterIndex) => {
            const btn = document.createElement('button');
            btn.className = 'letter-btn' + (letter.color ? ' has-custom-color' : '');
            btn.textContent = letter.char;
            btn.style.color = letter.color || this.defaultColor;
            btn.addEventListener('click', () => this.openColorPicker(letterIndex, lineIndex));
            letterButtonsContainer.appendChild(btn);
        });
    }

    syncLineSpacingSlider(lineIndex, value) {
        const container = document.getElementById('linesEditor');
        if (!container) return;

        const lineEditor = container.querySelector(`.line-editor[data-line-index="${lineIndex}"]`);
        if (!lineEditor) return;

        const slider = lineEditor.querySelector('.line-letter-spacing');
        const valueDisplay = lineEditor.querySelector('.line-letter-spacing-value');
        if (slider) slider.value = value;
        if (valueDisplay) valueDisplay.textContent = `${value}px`;
    }

    updateLetterColors() {
        this.lines.forEach((line, lineIndex) => {
            line.letters.forEach(letter => {
                if (!letter.color) {
                    letter.customColor = false;
                }
            });
            this.updateLineLetterButtons(lineIndex);
        });
    }

    renderLetterButtons() {
        // Legacy - now handled by renderLineEditors
        this.renderLineEditors();
    }

    renderLineEditors() {
        const container = document.getElementById('linesEditor');
        if (!container) return;

        container.innerHTML = '';

        this.lines.forEach((line, lineIndex) => {
            const lineEl = document.createElement('div');
            lineEl.className = 'line-editor';
            lineEl.dataset.lineIndex = lineIndex;

            // Line header with text input and remove button
            const lineHeader = document.createElement('div');
            lineHeader.className = 'line-editor-header';

            const lineLabel = document.createElement('span');
            lineLabel.className = 'line-label';
            lineLabel.textContent = `Line ${lineIndex + 1}`;

            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.className = 'line-text-input';
            textInput.value = line.text;
            textInput.placeholder = 'Enter text...';
            textInput.addEventListener('input', (e) => {
                this.lines[lineIndex].text = e.target.value || 'Text';
                this.updateLineLetters(lineIndex);
                this.updateFontPreviews();
                this.render();
                // Update tab title with first line
                if (lineIndex === 0) {
                    document.getElementById('tabTitle').textContent = e.target.value || 'Brand';
                }
            });

            lineHeader.appendChild(lineLabel);
            lineHeader.appendChild(textInput);

            // Remove button (only if more than 1 line)
            if (this.lines.length > 1) {
                const removeBtn = document.createElement('button');
                removeBtn.className = 'line-remove-btn';
                removeBtn.innerHTML = '×';
                removeBtn.title = 'Remove line';
                removeBtn.addEventListener('click', () => this.removeLine(lineIndex));
                lineHeader.appendChild(removeBtn);
            }

            lineEl.appendChild(lineHeader);

            // Line controls (size and spacing)
            const lineControls = document.createElement('div');
            lineControls.className = 'line-controls';

            // Font size slider (%)
            const sizeControl = document.createElement('div');
            sizeControl.className = 'line-control';
            sizeControl.innerHTML = `
                <label>Size</label>
                <input type="range" class="line-font-size" min="30" max="150" value="${line.fontSize}">
                <span class="line-font-size-value">${line.fontSize}%</span>
            `;
            const sizeSlider = sizeControl.querySelector('.line-font-size');
            const sizeValue = sizeControl.querySelector('.line-font-size-value');
            sizeSlider.addEventListener('input', (e) => {
                this.lines[lineIndex].fontSize = parseInt(e.target.value);
                sizeValue.textContent = `${e.target.value}%`;
                this.render();
            });
            lineControls.appendChild(sizeControl);

            // Letter spacing slider
            const spacingControl = document.createElement('div');
            spacingControl.className = 'line-control';
            spacingControl.innerHTML = `
                <label>Spacing</label>
                <input type="range" class="line-letter-spacing" min="-20" max="50" value="${line.letterSpacing}">
                <span class="line-letter-spacing-value">${line.letterSpacing}px</span>
            `;
            const spacingSlider = spacingControl.querySelector('.line-letter-spacing');
            const spacingValue = spacingControl.querySelector('.line-letter-spacing-value');
            spacingSlider.addEventListener('input', (e) => {
                this.lines[lineIndex].letterSpacing = parseInt(e.target.value);
                spacingValue.textContent = `${e.target.value}px`;
                this.updateFontPreviews();
                this.render();
            });
            lineControls.appendChild(spacingControl);

            lineEl.appendChild(lineControls);

            // Letter buttons for color customization
            const letterButtonsContainer = document.createElement('div');
            letterButtonsContainer.className = 'letter-buttons';

            line.letters.forEach((letter, letterIndex) => {
                const btn = document.createElement('button');
                btn.className = 'letter-btn' + (letter.color ? ' has-custom-color' : '');
                btn.textContent = letter.char;
                btn.style.color = letter.color || this.defaultColor;
                btn.addEventListener('click', () => this.openColorPicker(letterIndex, lineIndex));
                letterButtonsContainer.appendChild(btn);
            });

            lineEl.appendChild(letterButtonsContainer);
            container.appendChild(lineEl);
        });

        // Add line button (max lines)
        if (this.lines.length < CONFIG.MAX_LINES) {
            const addLineBtn = document.createElement('button');
            addLineBtn.className = 'add-line-btn';
            addLineBtn.innerHTML = '+ Add line';
            addLineBtn.addEventListener('click', () => this.addLine());
            container.appendChild(addLineBtn);
        }
    }

    addLine() {
        if (this.lines.length >= CONFIG.MAX_LINES) return;

        this.lines.push({
            text: 'Text',
            letters: [{ char: 'T', color: null }, { char: 'e', color: null }, { char: 'x', color: null }, { char: 't', color: null }],
            fontSize: 100,
            letterSpacing: 0
        });

        this.renderLineEditors();
        this.render();
    }

    removeLine(lineIndex) {
        if (this.lines.length <= 1) return;

        this.lines.splice(lineIndex, 1);
        this.renderLineEditors();
        this.render();
    }

    openColorPicker(letterIndex, lineIndex = 0) {
        this.currentLetterIndex = letterIndex;
        this.currentLineIndex = lineIndex;
        const letter = this.lines[lineIndex]?.letters[letterIndex];
        if (!letter) return;

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
        if (this.currentLetterIndex !== null && this.currentLineIndex !== null) {
            const color = document.getElementById('letterColorPicker').value;
            const line = this.lines[this.currentLineIndex];
            if (line && line.letters[this.currentLetterIndex]) {
                line.letters[this.currentLetterIndex].color = color;
            }
            this.updateLineLetterButtons(this.currentLineIndex);
            this.updateFontPreviews();
            this.render();
        }
        this.closeModal();
    }

    resetLetterColor() {
        if (this.currentLetterIndex !== null && this.currentLineIndex !== null) {
            const line = this.lines[this.currentLineIndex];
            if (line && line.letters[this.currentLetterIndex]) {
                line.letters[this.currentLetterIndex].color = null;
            }
            this.updateLineLetterButtons(this.currentLineIndex);
            this.updateFontPreviews();
            this.render();
        }
        this.closeModal();
    }

    /**
     * Get current state as an object for use by modules.
     * @returns {Object} Current application state
     */
    getState() {
        return {
            lines: this.lines,
            font: this.font,
            fontWeight: this.fontWeight,
            baseFontSize: this.baseFontSize,
            lineSpacing: this.lineSpacing,
            horizontalAlign: this.horizontalAlign,
            defaultColor: this.defaultColor,
            bgType: this.bgType,
            bgColor: this.bgColor,
            layerOrder: this.layerOrder,
            appIconBg: this.appIconBg,
            appIconBorder: this.appIconBorder,
            appIconBorderEnabled: this.appIconBorderEnabled
        };
    }

    /**
     * Main render method: updates SVG preview, size previews, and app icons.
     */
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

    /**
     * Render the main SVG preview using opentype.js for accurate font paths.
     * @async
     */
    async renderSvgPreview() {
        // Prevent concurrent renders
        if (this.fontLoading) return;

        const padding = CONFIG.PADDING.SVG;

        // Calculate dimensions for all lines
        let maxLineWidth = 0;
        let totalHeight = 0;
        const lineMetrics = [];

        this.lines.forEach((line, index) => {
            const lineFontSize = (line.fontSize / 100) * this.baseFontSize;
            this.ctx.font = `${this.fontWeight} ${lineFontSize}px "${this.font}"`;

            let lineWidth = 0;
            line.letters.forEach((letter, i) => {
                lineWidth += this.ctx.measureText(letter.char).width;
                if (i < line.letters.length - 1) {
                    lineWidth += line.letterSpacing;
                }
            });

            maxLineWidth = Math.max(maxLineWidth, lineWidth);
            const lineHeight = lineFontSize * 1.2;
            totalHeight += lineHeight;
            if (index < this.lines.length - 1) {
                totalHeight += this.lineSpacing;
            }

            lineMetrics.push({ lineWidth, lineHeight, lineFontSize });
        });

        const svgWidth = Math.max(maxLineWidth + padding * 2, 200);
        const svgHeight = totalHeight + padding * 2;

        // Set initial SVG size and show placeholder
        this.svgElement.setAttribute('width', svgWidth);
        this.svgElement.setAttribute('height', svgHeight);
        this.svgElement.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);

        // Get all text for cache key
        const allText = this.lines.map(l => l.text).join('');
        const cacheKey = `${this.font}:${this.fontWeight}:${allText}`;
        if (!this.opentypeFont || this.fontCacheKey !== cacheKey) {
            this.svgElement.innerHTML = this.bgType === 'color'
                ? `<rect width="100%" height="100%" fill="${this.bgColor}"/><text x="50%" y="50%" text-anchor="middle" fill="#999" font-size="14">Loading...</text>`
                : `<text x="50%" y="50%" text-anchor="middle" fill="#999" font-size="14">Loading...</text>`;
        }

        // Load font asynchronously
        this.fontLoading = true;
        try {
            const font = await this.getOpentypeFont();

            // Recalculate with opentype for accurate SVG
            let maxOpentypeWidth = 0;
            const linesData = [];

            this.lines.forEach((line, lineIndex) => {
                const lineFontSize = (line.fontSize / 100) * this.baseFontSize;
                const positions = [];
                let x = 0;

                line.letters.forEach((letter) => {
                    const glyph = font.charToGlyph(letter.char);
                    const width = glyph.advanceWidth * (lineFontSize / font.unitsPerEm);
                    positions.push({ letter, x, width, lineFontSize });
                    x += width + line.letterSpacing;
                });

                const lineWidth = positions.length > 0
                    ? positions[positions.length - 1].x + positions[positions.length - 1].width
                    : 0;
                maxOpentypeWidth = Math.max(maxOpentypeWidth, lineWidth);
                linesData.push({ positions, lineWidth, lineFontSize, lineHeight: lineMetrics[lineIndex].lineHeight });
            });

            const finalSvgWidth = Math.max(maxOpentypeWidth + padding * 2, 200);

            // Build SVG content
            let svgContent = '';

            // Background
            if (this.bgType === 'color') {
                svgContent += `<rect width="100%" height="100%" fill="${this.bgColor}"/>`;
            }

            // Draw each line
            let currentY = padding;
            linesData.forEach((lineData) => {
                const { positions, lineWidth, lineFontSize, lineHeight } = lineData;

                // Calculate X offset based on alignment
                let xOffset;
                if (this.horizontalAlign === 'left') {
                    xOffset = padding;
                } else if (this.horizontalAlign === 'right') {
                    xOffset = finalSvgWidth - padding - lineWidth;
                } else {
                    // center
                    xOffset = (finalSvgWidth - lineWidth) / 2;
                }

                const y = currentY + lineFontSize;

                // Draw letters in correct order
                const drawOrder = this.layerOrder === 'left' ? [...positions].reverse() : positions;
                drawOrder.forEach(({ letter, x, lineFontSize: fontSize }) => {
                    const color = letter.color || this.defaultColor;
                    const path = font.getPath(letter.char, xOffset + x, y, fontSize);
                    const pathData = path.toPathData(2);
                    svgContent += `<path d="${pathData}" fill="${color}"/>`;
                });

                currentY += lineHeight + this.lineSpacing;
            });

            // Update SVG element
            this.svgElement.setAttribute('width', finalSvgWidth);
            this.svgElement.setAttribute('viewBox', `0 0 ${finalSvgWidth} ${svgHeight}`);
            this.svgElement.innerHTML = svgContent;

        } catch (error) {
            console.error('Error rendering SVG preview:', error);
            this.svgElement.innerHTML = this.bgType === 'color'
                ? `<rect width="100%" height="100%" fill="${this.bgColor}"/><text x="50%" y="50%" text-anchor="middle" fill="#f00" font-size="12">Loading error</text>`
                : `<text x="50%" y="50%" text-anchor="middle" fill="#f00" font-size="12">Loading error</text>`;
        } finally {
            this.fontLoading = false;
        }
    }

    renderPreviews() {
        Renderer.renderPreviews(this.getState());
    }

    renderAppIcons() {
        Renderer.renderAppIconPreviews(this.getState());
    }

    /**
     * Render the logo to a new canvas at the specified size.
     * @param {number} size - Canvas size in pixels
     * @returns {HTMLCanvasElement} The rendered canvas
     */
    renderToCanvas(size) {
        return Renderer.renderToCanvas(size, this.getState());
    }

    /**
     * Render an app icon to a new canvas.
     * @param {number} size - Icon size in pixels
     * @param {number} radiusRatio - Corner radius ratio (0-1)
     * @returns {HTMLCanvasElement} The rendered canvas
     */
    renderAppIconToCanvas(size, radiusRatio) {
        return Renderer.renderAppIconToCanvas(size, radiusRatio, this.getState());
    }

    // ==================== FONT LOADING (for SVG preview) ====================

    /**
     * Load wawoff2 WASM module for WOFF2 decompression.
     * @async
     */
    async loadWawoff2() {
        if (window.wawoff2Ready) return;

        return new Promise((resolve, reject) => {
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
    }

    /**
     * Fetch and decompress font for current text (subsetted).
     * @async
     * @returns {Promise<ArrayBuffer>} TTF font buffer
     */
    async fetchAndDecompressFont() {
        const fontFamily = this.font.replace(/ /g, '+');
        const allText = this.lines.map(l => l.text).join('');
        const textParam = encodeURIComponent(allText);
        const cssUrl = `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@${this.fontWeight}&text=${textParam}&display=swap`;

        const cssResponse = await fetch(cssUrl);
        const css = await cssResponse.text();

        const urlMatch = css.match(/url\(([^)]+)\)/);
        if (!urlMatch) throw new Error('Could not find font URL in CSS');

        const fontUrl = urlMatch[1].replace(/['"]/g, '');
        const fontResponse = await fetch(fontUrl);
        const woff2Buffer = await fontResponse.arrayBuffer();

        const ttfUint8 = Module.decompress(woff2Buffer);
        return ttfUint8.buffer.slice(ttfUint8.byteOffset, ttfUint8.byteOffset + ttfUint8.byteLength);
    }

    /**
     * Get cached opentype font or load it.
     * @async
     * @returns {Promise<Object>} Opentype.js font object
     */
    async getOpentypeFont() {
        const allText = this.lines.map(l => l.text).join('');
        const cacheKey = `${this.font}:${this.fontWeight}:${allText}`;

        if (this.opentypeFont && this.fontCacheKey === cacheKey) {
            return this.opentypeFont;
        }

        await this.loadWawoff2();
        const ttfBuffer = await this.fetchAndDecompressFont();
        const font = opentype.parse(ttfBuffer);

        this.opentypeFont = font;
        this.fontCacheKey = cacheKey;

        return font;
    }

    /**
     * Fetch full font (not subsetted) for brand kit export.
     * @async
     * @returns {Promise<ArrayBuffer>} TTF font buffer
     */
    async fetchFullFont() {
        await this.loadWawoff2();

        const fontFamily = this.font.replace(/ /g, '+');
        const cssUrl = `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@${this.fontWeight}&display=swap`;

        const cssResponse = await fetch(cssUrl);
        const css = await cssResponse.text();

        const urlMatch = css.match(/url\(([^)]+)\)/);
        if (!urlMatch) throw new Error('Could not find font URL in CSS');

        const fontUrl = urlMatch[1].replace(/['"]/g, '');
        const fontResponse = await fetch(fontUrl);
        const woff2Buffer = await fontResponse.arrayBuffer();

        const ttfUint8 = Module.decompress(woff2Buffer);
        return ttfUint8.buffer.slice(ttfUint8.byteOffset, ttfUint8.byteOffset + ttfUint8.byteLength);
    }

    /**
     * Generate SVG logo with vector paths from opentype.js.
     * @async
     * @returns {Promise<string>} SVG markup
     */
    async generateSVG() {
        const font = await this.getOpentypeFont();
        const padding = CONFIG.PADDING.SVG;

        // Calculate dimensions for all lines
        let maxLineWidth = 0;
        let totalHeight = 0;
        const linesData = [];

        this.lines.forEach((line, lineIndex) => {
            const lineFontSize = (line.fontSize / 100) * this.baseFontSize;
            const positions = [];
            let x = 0;

            line.letters.forEach((letter) => {
                const glyph = font.charToGlyph(letter.char);
                const width = glyph.advanceWidth * (lineFontSize / font.unitsPerEm);
                positions.push({ letter, x, width, lineFontSize });
                x += width + line.letterSpacing;
            });

            const lineWidth = positions.length > 0
                ? positions[positions.length - 1].x + positions[positions.length - 1].width
                : 0;
            maxLineWidth = Math.max(maxLineWidth, lineWidth);

            const lineHeight = lineFontSize * 1.2;
            totalHeight += lineHeight;
            if (lineIndex < this.lines.length - 1) {
                totalHeight += this.lineSpacing;
            }

            linesData.push({ positions, lineWidth, lineFontSize, lineHeight });
        });

        const svgWidth = Math.ceil(Math.max(maxLineWidth + padding * 2, 200));
        const svgHeight = Math.ceil(totalHeight + padding * 2);

        // Build SVG
        let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">
`;

        // Add background if needed
        if (this.bgType === 'color') {
            svgContent += `  <rect width="100%" height="100%" fill="${this.bgColor}"/>\n`;
        }

        // Draw each line
        let currentY = padding;
        linesData.forEach((lineData) => {
            const { positions, lineWidth, lineFontSize, lineHeight } = lineData;

            // Calculate X offset based on alignment
            let xOffset;
            if (this.horizontalAlign === 'left') {
                xOffset = padding;
            } else if (this.horizontalAlign === 'right') {
                xOffset = svgWidth - padding - lineWidth;
            } else {
                // center
                xOffset = (svgWidth - lineWidth) / 2;
            }

            const y = currentY + lineFontSize;

            // Draw letters in correct order
            const drawOrder = this.layerOrder === 'left' ? [...positions].reverse() : positions;
            drawOrder.forEach(({ letter, x, lineFontSize: fontSize }) => {
                const color = letter.color || this.defaultColor;
                const path = font.getPath(letter.char, xOffset + x, y, fontSize);
                const pathData = path.toPathData(2);
                svgContent += `  <path d="${pathData}" fill="${color}"/>\n`;
            });

            currentY += lineHeight + this.lineSpacing;
        });

        svgContent += `</svg>`;
        return svgContent;
    }

    /**
     * Generate and download the complete brand kit as a ZIP file.
     * Includes logos (PNG/SVG), favicons, iOS icons, Android icons, and font.
     * @async
     */
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

        // Logos
        CONFIG.EXPORT.LOGO_SIZES.forEach(size => {
            assets.push({ folder: 'logos', name: `logo-${size}.png`, size });
        });

        // Favicons
        CONFIG.EXPORT.FAVICON_SIZES.forEach(size => {
            const name = size === 180 ? 'apple-touch-icon.png' : `favicon-${size}x${size}.png`;
            assets.push({ folder: 'favicons', name, size });
        });

        // iOS (with app icon style)
        CONFIG.EXPORT.IOS_SIZES.forEach(size => {
            assets.push({ folder: 'ios', name: `ios-${size}.png`, size, type: 'appicon', radius: CONFIG.RADIUS.IOS });
        });

        // Android (with app icon style)
        CONFIG.EXPORT.ANDROID_SIZES.forEach(size => {
            assets.push({ folder: 'android', name: `android-${size}.png`, size, type: 'appicon', radius: CONFIG.RADIUS.ANDROID });
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
            const svg = await this.generateSVG();
            zip.folder('logos').file('logo.svg', svg);
        } catch (e) {
            console.error('SVG generation failed:', e);
        }

        // Add font file
        progressText.textContent = 'Downloading font...';
        try {
            const fontBuffer = await this.fetchFullFont();
            const fontFileName = `${this.font.replace(/\s+/g, '-')}-${this.fontWeight}.ttf`;
            zip.folder('fonts').file(fontFileName, fontBuffer);

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
https://github.com/davstr1/poormanbrandkit

Font: ${this.font} (weight: ${this.fontWeight})
Letter spacing: ${this.letterSpacing}px

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
  - ${this.font.replace(/\s+/g, '-')}-${this.fontWeight}.ttf - Font file
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

    /**
     * Get current configuration as a serializable object.
     * @returns {Object} Configuration data
     */
    getConfigData() {
        return Storage.getConfigData(this.getState());
    }

    /**
     * Save current configuration to localStorage with preview image.
     */
    saveConfig() {
        const previewCanvas = this.renderToCanvas(CONFIG.SAVED_CONFIG_PREVIEW);
        const previewDataUrl = previewCanvas.toDataURL('image/png');
        Storage.saveConfig(this.getState(), previewDataUrl);

        this.renderSavedConfigs();
        this.showToast('Configuration saved');
    }

    /**
     * Retrieve saved configurations from localStorage.
     * @returns {Array} Array of saved configurations
     */
    getSavedConfigs() {
        return Storage.getSavedConfigs();
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
            container.innerHTML = '<p class="no-configs">No saved configurations</p>';
            return;
        }

        container.innerHTML = '';

        configs.forEach((config, index) => {
            const item = document.createElement('div');
            item.className = 'saved-config-item';

            // Preview canvas
            const canvas = document.createElement('canvas');
            canvas.width = CONFIG.SAVED_CONFIG_PREVIEW;
            canvas.height = CONFIG.SAVED_CONFIG_PREVIEW / 2;
            const ctx = canvas.getContext('2d');

            // Load preview image
            if (config.preview) {
                const img = new Image();
                img.onload = () => {
                    // Draw centered and scaled
                    const previewW = CONFIG.SAVED_CONFIG_PREVIEW;
                    const previewH = CONFIG.SAVED_CONFIG_PREVIEW / 2;
                    const scale = Math.min(previewW / img.width, previewH / img.height);
                    const w = img.width * scale;
                    const h = img.height * scale;
                    ctx.drawImage(img, (previewW - w) / 2, (previewH - h) / 2, w, h);
                };
                img.src = config.preview;
            }

            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'saved-config-delete';
            deleteBtn.innerHTML = '×';
            deleteBtn.title = 'Delete';
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

    /**
     * Load a configuration and update the UI.
     * Supports both legacy single-line and new multi-line formats.
     * @param {Object} config - Configuration object to load
     */
    loadConfig(config) {
        // Parse config using Storage module (handles legacy format conversion)
        const parsed = Storage.parseConfig(config);

        // Apply parsed state to this instance
        this.lines = parsed.lines;
        this.baseFontSize = parsed.baseFontSize;
        this.lineSpacing = parsed.lineSpacing;
        this.horizontalAlign = parsed.horizontalAlign;
        this.font = parsed.font;
        this.fontWeight = parsed.fontWeight;
        this.defaultColor = parsed.defaultColor;
        this.bgType = parsed.bgType;
        this.bgColor = parsed.bgColor;
        this.layerOrder = parsed.layerOrder;
        this.appIconBg = parsed.appIconBg;
        this.appIconBorder = parsed.appIconBorder;
        this.appIconBorderEnabled = parsed.appIconBorderEnabled;

        // Update UI controls
        document.getElementById('tabTitle').textContent = this.lines[0]?.text || 'Brand';
        document.getElementById('fontDisplayText').textContent = this.font;
        document.getElementById('fontWeight').value = this.fontWeight;
        document.getElementById('baseFontSize').value = this.baseFontSize;
        document.getElementById('baseFontSizeValue').textContent = `${this.baseFontSize}px`;
        document.getElementById('lineSpacing').value = this.lineSpacing;
        document.getElementById('lineSpacingValue').textContent = `${this.lineSpacing}px`;
        document.getElementById('defaultColor').value = this.defaultColor;
        document.getElementById('bgColor').value = this.bgColor;

        // Horizontal align radio
        document.querySelectorAll('input[name="horizontalAlign"]').forEach(radio => {
            radio.checked = radio.value === this.horizontalAlign;
        });

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

        // Rebuild line editors and update previews
        this.renderLineEditors();
        this.updateFontPreviews();

        // Render
        this.render();
        this.showToast('Configuration loaded');
    }

    deleteConfig(index) {
        Storage.deleteConfig(index);
        this.renderSavedConfigs();
        this.showToast('Configuration deleted');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new BrandKitGenerator();
});
