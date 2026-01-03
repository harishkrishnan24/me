# Personal Website - AI Agent Instructions

## Project Overview
A nostalgic 1990s-style personal portfolio website for Harish Krishnan, built with pure HTML and CSS. No frameworks, no JavaScript—just semantic markup with retro aesthetics.

## Architecture Principles

### Technology Stack
- **Zero Dependencies**: No frameworks, libraries, or JavaScript
- **Pure HTML5**: Semantic elements only (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`)
- **CSS Only**: Single `styles.css` for all styling and responsive behavior

### Design Philosophy
**1990s Web Nostalgia** implemented through:
- Courier New monospace typography
- Retro color palette: `#c0c0c0` (silver), `#000080` (navy blue), gradient buttons
- CSS inset/outset borders mimicking Windows 95 UI elements
- Dot-pattern background using `radial-gradient`
- Terminal-style elements (`.typewriter` class with black/green colors)
- Emoji decorations (🌐💻👨‍💻📚) as visual accents

## Critical Conventions

### HTML Structure Pattern
All pages follow this exact structure:
```html
<header>
  <nav>
    <h1>Harish Krishnan</h1>
    <ul><!-- Navigation with aria-current for active page --></ul>
  </nav>
</header>
<main>
  <section class="hero"><!-- Page-specific hero --></section>
  <section><!-- Content sections --></section>
</main>
<footer><!-- Copyright notice --></footer>
```

### Navigation
- **Consistent nav across all pages** (5 HTML pages: `index.html`, `about.html`, `projects.html`, `bookshelf.html`, `opensource.html`)
- Use `aria-current="page"` on active page link
- External links require `target="_blank" rel="noopener noreferrer"`

### CSS Class Patterns
Key reusable classes found in [styles.css](styles.css):
- `.hero` - Gradient header sections (unique per page)
- `.typewriter` - Terminal-style text (black background, green monospace text)
- `.update-box` - Content containers with retro styling
- `.profile-container` - Flexbox wrapper for profile image + text
- `.retro-note` / `.retro-footer` - Nostalgic messaging style
- `.learning` - Highlights technologies currently being learned

### Accessibility Requirements
- **Required for all images**: Descriptive `alt` attributes (see [about.html](about.html#L42-L45) profile image example)
- **Semantic HTML**: Use proper heading hierarchy (`<h2>` → `<h3>` → `<h4>`)
- **ARIA attributes**: `aria-current` for navigation state
- **Form elements**: Associated `<label>` with `for` attribute

### Mobile-First Responsive Design
- Base styles target mobile screens
- `@media (min-width: ...)` for progressively enhanced layouts
- Flexbox with `flex-wrap` for adaptive navigation and content grids
- No fixed widths; use `max-width` with percentage-based sizing

## Development Workflows

### Adding New Pages
1. Copy `index.html` structure as template
2. Update `<title>` and navigation `aria-current`
3. Customize `.hero` section with unique gradient/text
4. Add content in semantic `<section>` blocks
5. No build step—directly edit HTML files

### Styling Guidelines
- **No inline styles**: All CSS in [styles.css](styles.css)
- **Color scheme**: Primary `#000080`, secondary `#c0c0c0`, accent gradients
- **Borders**: Use `border: 2px inset/outset #c0c0c0` for 3D effects
- **Shadows**: `box-shadow: 2px 2px 4px rgba(0,0,0,0.3)` for depth
- **Hover states**: Transition from `outset` to `inset` borders on buttons

### Testing Locally
Open HTML files directly in browser—no server required:
```bash
open index.html  # macOS
```
Or use simple HTTP server:
```bash
python3 -m http.server 8000
```

## Project-Specific Patterns

### Content Organization
- **Homepage** ([index.html](index.html)): Welcome message, latest updates, contact form
- **About** ([about.html](about.html)): Biography, tech stack (with learning indicators), work history
- **Projects** ([projects.html](projects.html)): Portfolio showcase
- **Bookshelf** ([bookshelf.html](bookshelf.html)): Books and academic papers
- **Open Source** ([opensource.html](opensource.html)): Contributions and community work

### Asset Management
- Images stored in `/images/` directory
- Use relative paths: `<img src="images/profile.jpg">`
- Favicon via inline SVG data URI (see [index.html](index.html#L7-L10))

### Git Repository
- Hosted on GitHub: `harishkrishnan24/me`
- Branch: `master` (default)
- No build artifacts to commit—only source HTML/CSS

## Common Modifications

### Adding Contact Methods
Update [index.html](index.html#L86-L123) `.contact-info` section with new `.contact-method` div.

### Updating Tech Stack
Edit [about.html](about.html#L87-L108) skills list; use `<span class="learning">Technology 📚</span>` for items currently being learned.

### Adding Projects
Insert new `.update-box` in [projects.html](projects.html) with `<h4>` title and description.

## External References
- **Blog**: https://harishkrishnan1993.medium.com/
- **Udemy**: https://www.udemy.com/user/harish-krishnan-5/
- **LinkedIn**: https://www.linkedin.com/in/harishkrishnan1993/
- **GitHub**: https://github.com/harishkrishnan24

---
*Last updated: January 2026*
