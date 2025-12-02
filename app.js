// The Poor Man's Brand Kit Maker - Main Application

class BrandKitGenerator {
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
        this.font = 'Montserrat';
        this.fontWeight = '700';
        this.baseFontSize = 100;
        this.lineSpacing = 10;
        this.horizontalAlign = 'center'; // 'left', 'center', 'right'
        this.defaultColor = '#333333';
        this.bgType = 'transparent';
        this.bgColor = '#ffffff';
        this.layerOrder = 'right'; // 'right' = droite dessus, 'left' = gauche dessus
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

            // Scale letter spacing proportionally (1.4rem ≈ 22px vs baseFontSize)
            const dropdownDisplaySize = 22;
            const scaledSpacing = (firstLine.letterSpacing / this.baseFontSize) * dropdownDisplaySize;
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

        // Scale letter spacing proportionally (1.4rem ≈ 22px vs baseFontSize)
        const dropdownDisplaySize = 22;
        const scaledSpacing = (firstLine.letterSpacing / this.baseFontSize) * dropdownDisplaySize;

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

        // Letter spacing slider in popover (controls first line)
        document.getElementById('popoverLetterSpacing').addEventListener('input', (e) => {
            const spacing = parseInt(e.target.value);
            if (this.lines[0]) {
                this.lines[0].letterSpacing = spacing;
            }
            document.getElementById('popoverLetterSpacingValue').textContent = `${spacing}px`;
            // Update all previews in popover
            this.updatePopoverPreviews();
            // Re-render line editors to sync slider values
            this.renderLineEditors();
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
        const cardDisplaySize = 29;
        const headerDisplaySize = 32;
        const cardScaledSpacing = (firstLine.letterSpacing / this.baseFontSize) * cardDisplaySize;
        const headerScaledSpacing = (firstLine.letterSpacing / this.baseFontSize) * headerDisplaySize;

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

        // Scale letter spacing proportionally to display size (2rem ≈ 32px vs baseFontSize)
        const displaySize = 32;
        const scaledSpacing = (firstLine.letterSpacing / this.baseFontSize) * displaySize;
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

        // Scale letter spacing proportionally to card preview size (1.8rem ≈ 29px vs baseFontSize)
        const cardDisplaySize = 29;
        const scaledSpacing = (firstLine.letterSpacing / this.baseFontSize) * cardDisplaySize;

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
        this.renderLineEditors();
    }

    updateLetterColors() {
        this.lines.forEach(line => {
            line.letters.forEach(letter => {
                if (!letter.color) {
                    letter.customColor = false;
                }
            });
        });
        this.renderLineEditors();
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

        // Add line button (max 3 lines)
        if (this.lines.length < 3) {
            const addLineBtn = document.createElement('button');
            addLineBtn.className = 'add-line-btn';
            addLineBtn.innerHTML = '+ Add line';
            addLineBtn.addEventListener('click', () => this.addLine());
            container.appendChild(addLineBtn);
        }
    }

    addLine() {
        if (this.lines.length >= 3) return;

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
            this.renderLineEditors();
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
            this.renderLineEditors();
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

            // Render multi-line text
            this.renderMultiLineText(ctx, preview.displaySize);
        });
    }

    // Helper method to render multi-line text on a canvas
    renderMultiLineText(ctx, size, padding = 0.075) {
        const paddingPx = size * padding;
        const availableSize = size - paddingPx * 2;

        // Calculate dimensions for all lines at base size
        let maxLineWidth = 0;
        let totalHeight = 0;
        const lineMetrics = [];

        this.lines.forEach((line, index) => {
            const lineFontSize = (line.fontSize / 100) * this.baseFontSize;
            ctx.font = `${this.fontWeight} ${lineFontSize}px "${this.font}"`;

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
            if (index < this.lines.length - 1) {
                totalHeight += this.lineSpacing;
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
            const scaledLineSpacing = this.lineSpacing * scale;

            ctx.font = `${this.fontWeight} ${scaledFontSize}px "${this.font}"`;
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
            if (this.horizontalAlign === 'left') {
                x = paddingPx;
            } else if (this.horizontalAlign === 'right') {
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
            const drawOrder = this.layerOrder === 'left' ? [...positions].reverse() : positions;
            drawOrder.forEach(({ letter, x }) => {
                ctx.fillStyle = letter.color || this.defaultColor;
                ctx.fillText(letter.char, x, startY);
            });

            startY += scaledLineHeight + scaledLineSpacing;
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

        // Draw multi-line logo text
        this.renderMultiLineText(ctx, size, 0.15);

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

        // Render multi-line text
        this.renderMultiLineText(ctx, size, 0.075);

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

        // Draw multi-line logo text
        this.renderMultiLineText(ctx, size, 0.15);

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
        // Add text parameter with all logo text to ensure those glyphs are included
        const fontFamily = this.font.replace(/ /g, '+');
        const allText = this.lines.map(l => l.text).join('');
        const textParam = encodeURIComponent(allText);
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
        const allText = this.lines.map(l => l.text).join('');
        const cacheKey = `${this.font}:${this.fontWeight}:${allText}`;

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

        const padding = 40;

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

    getConfigData() {
        return {
            // New multi-line format
            lines: this.lines.map(line => ({
                text: line.text,
                letters: line.letters.map(l => ({ char: l.char, color: l.color })),
                fontSize: line.fontSize,
                letterSpacing: line.letterSpacing
            })),
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
            appIconBorderEnabled: this.appIconBorderEnabled,
            timestamp: Date.now(),
            // Legacy fields for backward compatibility
            logoText: this.logoText,
            letters: this.letters.map(l => ({ char: l.char, color: l.color })),
            fontSize: this.baseFontSize,
            letterSpacing: this.lines[0]?.letterSpacing || 0
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
        this.showToast('Configuration saved');
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
            container.innerHTML = '<p class="no-configs">No saved configurations</p>';
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
        // Check if new multi-line format or legacy format
        if (config.lines && Array.isArray(config.lines)) {
            // New multi-line format
            this.lines = config.lines.map(line => ({
                text: line.text,
                letters: line.letters.map(l => ({ char: l.char, color: l.color })),
                fontSize: line.fontSize || 100,
                letterSpacing: line.letterSpacing || 0
            }));
            this.baseFontSize = config.baseFontSize || 100;
            this.lineSpacing = config.lineSpacing || 10;
            this.horizontalAlign = config.horizontalAlign || 'center';
        } else {
            // Legacy single-line format - convert to new format
            this.lines = [{
                text: config.logoText || 'Brand',
                letters: config.letters ? config.letters.map(l => ({ char: l.char, color: l.color })) : [],
                fontSize: 100,
                letterSpacing: config.letterSpacing || 0
            }];
            this.baseFontSize = config.fontSize || 100;
            this.lineSpacing = 10;
            this.horizontalAlign = 'center';
        }

        // Common settings
        this.font = config.font;
        this.fontWeight = config.fontWeight;
        this.defaultColor = config.defaultColor;
        this.bgType = config.bgType;
        this.bgColor = config.bgColor;
        this.layerOrder = config.layerOrder || 'right';
        this.appIconBg = config.appIconBg || '#ffffff';
        this.appIconBorder = config.appIconBorder || '#e0e0e0';
        this.appIconBorderEnabled = config.appIconBorderEnabled !== false;

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
        const configs = this.getSavedConfigs();
        configs.splice(index, 1);
        localStorage.setItem('brandkit_configs', JSON.stringify(configs));
        this.renderSavedConfigs();
        this.showToast('Configuration deleted');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new BrandKitGenerator();
});
