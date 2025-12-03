// The Poor Man's Brand Kit - Storage Module
// Handles localStorage operations for saved configurations

const Storage = {
    STORAGE_KEY: 'brandkit_configs',

    /**
     * Get current configuration as a serializable object.
     * @param {Object} state - Application state
     * @returns {Object} Configuration data
     */
    getConfigData(state) {
        return {
            // New multi-line format
            lines: state.lines.map(line => ({
                text: line.text,
                letters: line.letters.map(l => ({ char: l.char, color: l.color })),
                fontSize: line.fontSize,
                letterSpacing: line.letterSpacing,
                fontWeight: line.fontWeight
            })),
            font: state.font,
            fontWeight: state.fontWeight,
            baseFontSize: state.baseFontSize,
            lineSpacing: state.lineSpacing,
            horizontalAlign: state.horizontalAlign,
            defaultColor: state.defaultColor,
            bgType: state.bgType,
            bgColor: state.bgColor,
            layerOrder: state.layerOrder,
            appIconBg: state.appIconBg,
            appIconBorder: state.appIconBorder,
            appIconBorderEnabled: state.appIconBorderEnabled,
            timestamp: Date.now(),
            // Legacy fields for backward compatibility
            logoText: state.lines[0]?.text || 'Brand',
            letters: (state.lines[0]?.letters || []).map(l => ({ char: l.char, color: l.color })),
            fontSize: state.baseFontSize,
            letterSpacing: state.lines[0]?.letterSpacing || 0
        };
    },

    /**
     * Save configuration to localStorage with preview image.
     * @param {Object} state - Application state
     * @param {string} previewDataUrl - Preview image as data URL
     */
    saveConfig(state, previewDataUrl) {
        const configs = this.getSavedConfigs();
        const newConfig = this.getConfigData(state);
        newConfig.preview = previewDataUrl;

        configs.push(newConfig);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs));
    },

    /**
     * Retrieve saved configurations from localStorage.
     * @returns {Array} Array of saved configurations
     */
    getSavedConfigs() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    /**
     * Delete a configuration by index.
     * @param {number} index - Index of configuration to delete
     */
    deleteConfig(index) {
        const configs = this.getSavedConfigs();
        configs.splice(index, 1);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs));
    },

    /**
     * Parse a configuration and convert legacy format if needed.
     * @param {Object} config - Saved configuration object
     * @returns {Object} Normalized state object
     */
    parseConfig(config) {
        let lines, baseFontSize, lineSpacing, horizontalAlign;

        // Check if new multi-line format or legacy format
        if (config.lines && Array.isArray(config.lines)) {
            // New multi-line format
            lines = config.lines.map(line => ({
                text: line.text,
                letters: line.letters.map(l => ({ char: l.char, color: l.color })),
                fontSize: line.fontSize || 100,
                letterSpacing: line.letterSpacing || 0,
                fontWeight: line.fontWeight || config.fontWeight || CONFIG.DEFAULTS.FONT_WEIGHT
            }));
            baseFontSize = config.baseFontSize || CONFIG.DEFAULTS.BASE_FONT_SIZE;
            lineSpacing = config.lineSpacing || CONFIG.DEFAULTS.LINE_SPACING;
            horizontalAlign = config.horizontalAlign || CONFIG.DEFAULTS.HORIZONTAL_ALIGN;
        } else {
            // Legacy single-line format - convert to new format
            lines = [{
                text: config.logoText || 'Brand',
                letters: config.letters
                    ? config.letters.map(l => ({ char: l.char, color: l.color }))
                    : [],
                fontSize: 100,
                letterSpacing: config.letterSpacing || 0,
                fontWeight: config.fontWeight || CONFIG.DEFAULTS.FONT_WEIGHT
            }];
            baseFontSize = config.fontSize || CONFIG.DEFAULTS.BASE_FONT_SIZE;
            lineSpacing = CONFIG.DEFAULTS.LINE_SPACING;
            horizontalAlign = CONFIG.DEFAULTS.HORIZONTAL_ALIGN;
        }

        return {
            lines,
            baseFontSize,
            lineSpacing,
            horizontalAlign,
            font: config.font || CONFIG.DEFAULTS.FONT,
            fontWeight: config.fontWeight || CONFIG.DEFAULTS.FONT_WEIGHT,
            defaultColor: config.defaultColor || CONFIG.DEFAULTS.DEFAULT_COLOR,
            bgType: config.bgType || CONFIG.DEFAULTS.BG_TYPE,
            bgColor: config.bgColor || CONFIG.DEFAULTS.BG_COLOR,
            layerOrder: config.layerOrder || CONFIG.DEFAULTS.LAYER_ORDER,
            appIconBg: config.appIconBg || CONFIG.DEFAULTS.APP_ICON_BG,
            appIconBorder: config.appIconBorder || CONFIG.DEFAULTS.APP_ICON_BORDER,
            appIconBorderEnabled: config.appIconBorderEnabled !== false
        };
    }
};
