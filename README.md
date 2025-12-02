# Poor Man's Brand Kit

A simple, no-bullshit tool to generate brand assets for your project. Create a text-based logo, customize colors per letter, and export everything you need in one click.

**No signup. No data sent to servers. Just open and use.**

## Features

- Multi-line text logos (up to 3 lines)
- Per-letter color customization
- 100+ Google Fonts with live preview
- Real-time SVG preview (WYSIWYG)
- Complete brand kit export:
  - Logos (PNG + SVG vector)
  - Favicons (16, 32, 48, 180px)
  - iOS App Icons (all required sizes)
  - Android App Icons (all required sizes)
  - Font file (TTF)
- Save/load configurations locally
- Works offline (after first load)

## Usage

1. Open `index.html` in your browser
2. Type your brand name
3. Click letters to change their color
4. Pick a font
5. Click "Generate Brand Kit"
6. Get a ZIP with all your assets

That's it.

## Files

```
brand_kit/
├── index.html    # Main page
├── app.js        # Application logic
├── style.css     # Styles
├── avatar.webp   # Mascot
├── ROADMAP.md    # What's next
└── README.md     # You're here
```

## Tech Stack

- Vanilla JS (no framework)
- Canvas API for PNG rendering
- opentype.js for SVG generation
- JSZip for export
- Google Fonts API

Zero build step. Zero dependencies to install. Just HTML/CSS/JS.

## Browser Support

Modern browsers only (Chrome, Firefox, Safari, Edge).
Uses ES6+, Canvas API, and async/await.

## License

Do whatever you want with it. It's free as in beer.

## Contributing

1. Fork
2. Make your changes
3. PR with clear description
4. No mega-PRs that "refactor everything"

---

*Made for people who need a quick brand kit without the corporate overhead.*
