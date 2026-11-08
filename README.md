# Writedown

*A fast, local-first Markdown editor with seamless live preview.*

[**Open Live Preview**](https://yasirdora.github.io/writedown/)

Writedown is a keyboard-driven Markdown editor built with SvelteKit 2, Svelte 5, and CodeMirror 6. It keeps plain Markdown as the single source of truth while providing an inline preview that conceals syntax until you focus a line to edit it.

Everything runs entirely in your browser. There are no accounts, backend databases, or network calls required to create and edit documents.

---

## Design Principles

- **Markdown as source of truth**: Formatting decorations render directly over the underlying document rather than converting to a separate rich-text representation. What you write is what gets saved.
- **Zero configuration**: Open the editor and write immediately. All settings, commands, and shortcuts are available via the interface or the command palette (`⌘K`).
- **Local and private**: Documents are stored locally in the browser (`localStorage`). You can import from and export to standard `.md` or styled HTML at any time.
- **Lightweight performance**: Viewport-scoped rendering and virtualized editor extensions keep editing responsive even on longer documents.

---

## Features

- **In-place live preview**: Headings, emphasis, blockquotes, code, horizontal rules, and images render inline, revealing Markdown syntax only when the line is focused.
- **Viewing modes (`⌘1` `⌘2` `⌘3`)**: 
  - **Write**: Distraction-free single canvas with in-place rendering.
  - **Split**: Side-by-side editor and full rendered preview.
  - **Read**: Clean reading layout with editor chrome hidden.
- **Focus mode (`⌘⇧F`)**: Dims surrounding paragraphs to keep attention centered on the active line.
- **Command palette (`⌘K`)**: Quick fuzzy search for all actions, views, and formatting commands.
- **Interactive task lists**: Clickable task checkboxes in both the editor and the preview that immediately sync back to source Markdown.
- **Rich formatting support**: GitHub Flavored Markdown (GFM) tables, task lists, footnotes, syntax-highlighted code blocks (via `highlight.js`), and LaTeX mathematics (via KaTeX).
- **Clipboard & drag-and-drop images**: Embed inline images directly via clipboard paste or file drag-and-drop.
- **Document management**: Built-in document drawer with fast search, automatic title detection from content, and auto-save.
- **Import & export**: Open local `.md` files (with File System Access API support and standard fallback), download `.md`, export styled HTML, or print with dedicated print styles.
- **Theme support**: System-aware light and dark themes.

---

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `⌘K` | Open Command Palette |
| `⌘1` / `⌘2` / `⌘3` | Switch to Write / Split / Read mode |
| `⌘⇧F` | Toggle Focus Mode |
| `⌘\` | Toggle Sidebar |
| `⌘B` | Bold selection |
| `⌘I` | Italicize selection |
| `⌘⇧X` | Strikethrough selection |
| `⌘S` | Download document (`.md`) |

---

## Roadmap

- Outline navigation and table of contents
- Synchronized scrolling in split view
- Table formatting helpers (insert, align, and manipulate columns/rows)
- Offline PWA support
- Direct file handle persistence via File System Access API

---

## Development

### Prerequisites
- Node.js 20+
- npm 10+

### Setup & Scripts

```sh
npm install
npm run dev        # Start local development server
npm run build      # Build static SPA (adapter-static)
npm run preview    # Preview the production build locally
npm run check      # Run typechecking via svelte-check
```

### Architecture
- **Framework**: SvelteKit 2 + Svelte 5 (runes)
- **Editor**: CodeMirror 6
- **Markdown & Math**: `markdown-it`, KaTeX, `highlight.js`, DOMPurify
- **Adapter**: `@sveltejs/adapter-static`
- **Hosting**: GitHub Pages via GitHub Actions
