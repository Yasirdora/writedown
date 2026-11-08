import { countWords, deriveTitle } from '$lib/markdown/render';

export interface Doc {
	id: string;
	content: string;
	createdAt: number;
	updatedAt: number;
}

export type ViewMode = 'write' | 'split' | 'read';
export type ThemeMode = 'light' | 'dark' | 'system';

const STATE_KEY = 'writedown:state:v1';
const PREFS_KEY = 'writedown:prefs:v1';

const WELCOME = `# Welcome to Writedown

A markdown editor that gets out of your way. Start typing on the left — or right here, in fact — and watch the syntax melt into beautiful, rendered text.

**Try it now:** click anywhere on this line, and watch the raw markdown reappear. Move away, and it renders again. Your file is always plain, lossless markdown.

## The essentials

Press **Cmd-K** to open the command palette — everything lives there. A few favorites:

- **Cmd-B** / **Cmd-I** — bold and italic
- **Cmd-1 / 2 / 3** — Write, Split, and Read modes
- **Cmd-Shift-F** — Focus mode, dims everything but the current line
- **Cmd-S** — download your document as a \`.md\` file

## It speaks fluent markdown

Tables that behave:

| Feature | Shortcut | Status |
| --- | --- | --- |
| Live preview | always on | ✅ |
| Focus mode | Cmd-Shift-F | ✅ |
| Export HTML | Cmd-K | ✅ |

Tasks you can check off — click the box, here or in the preview:

- [x] Design something people love
- [x] Keep markdown as the single source of truth
- [ ] Write your next great thing

Math, beautifully typeset: $E = mc^2$ inline, or displayed:

$$
\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

Code with syntax highlighting:

\`\`\`swift
struct Writer: Human {
    let tools = ["Writedown"]
    func create() -> Masterpiece { .init() }
}
\`\`\`

> Simplicity is the ultimate sophistication. Every pixel here earns its place.

Paste an image from your clipboard and it embeds itself. Your documents live in your browser — private, local, yours.

---

*Delete this whenever you're ready. Create a new document from the sidebar, or press Cmd-K.*
`;

function uuid(): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
	return `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

class AppStore {
	docs = $state<Doc[]>([]);
	activeId = $state<string>('');
	viewMode = $state<ViewMode>('split');
	theme = $state<ThemeMode>('system');
	seamless = $state(true);
	focus = $state(false);
	sidebarOpen = $state(true);
	paletteOpen = $state(false);
	notice = $state('');
	cursor = $state({ line: 1, col: 1 });
	systemDark = $state(false);

	activeIndex = $derived(this.docs.findIndex((d) => d.id === this.activeId));
	active = $derived(this.activeIndex >= 0 ? this.docs[this.activeIndex] : undefined);
	resolvedDark = $derived(this.theme === 'system' ? this.systemDark : this.theme === 'dark');
	words = $derived(countWords(this.active?.content ?? ''));
	chars = $derived((this.active?.content ?? '').length);
	readingMinutes = $derived(Math.max(1, Math.round(this.words / 200)));

	private saveTimer: ReturnType<typeof setTimeout> | undefined;
	private noticeTimer: ReturnType<typeof setTimeout> | undefined;

	constructor() {
		this.load();
	}

	private load(): void {
		try {
			const raw = localStorage.getItem(STATE_KEY);
			if (raw) {
				const saved = JSON.parse(raw) as { docs?: Doc[]; activeId?: string };
				if (Array.isArray(saved.docs)) this.docs = saved.docs;
				if (saved.activeId) this.activeId = saved.activeId;
			}
			const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null') as {
				viewMode?: ViewMode;
				theme?: ThemeMode;
				seamless?: boolean;
				sidebarOpen?: boolean;
			} | null;
			if (prefs) {
				if (prefs.viewMode) this.viewMode = prefs.viewMode;
				if (prefs.theme) this.theme = prefs.theme;
				if (typeof prefs.seamless === 'boolean') this.seamless = prefs.seamless;
				if (typeof prefs.sidebarOpen === 'boolean') this.sidebarOpen = prefs.sidebarOpen;
			}
		} catch {
			// corrupted storage — start fresh
		}
		if (this.docs.length === 0) {
			const id = uuid();
			this.docs = [{ id, content: WELCOME, createdAt: Date.now(), updatedAt: Date.now() }];
			this.activeId = id;
		}
		if (!this.docs.some((d) => d.id === this.activeId)) {
			this.activeId = this.docs[0].id;
		}
	}

	private persist(): void {
		clearTimeout(this.saveTimer);
		this.saveTimer = setTimeout(() => {
			try {
				localStorage.setItem(
					STATE_KEY,
					JSON.stringify({ docs: this.docs, activeId: this.activeId })
				);
				localStorage.setItem(
					PREFS_KEY,
					JSON.stringify({
						viewMode: this.viewMode,
						theme: this.theme,
						seamless: this.seamless,
						sidebarOpen: this.sidebarOpen
					})
				);
			} catch {
				this.showNotice('Storage is full — download your work to keep it safe');
			}
		}, 300);
	}

	// --- documents -----------------------------------------------------------

	titleOf(doc: Doc): string {
		return deriveTitle(doc.content);
	}

	updateContent(text: string): void {
		const doc = this.active;
		if (!doc || doc.content === text) return;
		doc.content = text;
		doc.updatedAt = Date.now();
		this.persist();
	}

	newDocument(content = ''): void {
		const id = uuid();
		this.docs.unshift({ id, content, createdAt: Date.now(), updatedAt: Date.now() });
		this.activeId = id;
		this.persist();
	}

	importDocument(content: string): void {
		this.newDocument(content);
		this.showNotice('Document imported');
	}

	deleteDocument(id: string): void {
		const index = this.docs.findIndex((d) => d.id === id);
		if (index < 0) return;
		this.docs.splice(index, 1);
		if (this.activeId === id) {
			this.activeId = this.docs[Math.min(index, this.docs.length - 1)]?.id ?? '';
		}
		if (this.docs.length === 0) this.newDocument();
		this.persist();
	}

	selectDocument(id: string): void {
		if (this.docs.some((d) => d.id === id)) {
			this.activeId = id;
			this.persist();
		}
	}

	/** Flip the nth task-list checkbox in the active document's source. */
	toggleTask(nth: number): void {
		const doc = this.active;
		if (!doc) return;
		let seen = -1;
		doc.content = doc.content.replace(
			/^(\s*(?:[-*+]|\d+[.)])\s+)\[([ xX])\]/gm,
			(match, prefix: string, mark: string) => {
				seen += 1;
				if (seen !== nth) return match;
				return `${prefix}[${mark === ' ' ? 'x' : ' '}]`;
			}
		);
		doc.updatedAt = Date.now();
		this.persist();
	}

	// --- interface -----------------------------------------------------------

	setViewMode(mode: ViewMode): void {
		this.viewMode = mode;
		this.persist();
	}

	cycleTheme(): void {
		this.theme = this.theme === 'light' ? 'dark' : this.theme === 'dark' ? 'system' : 'light';
		this.persist();
	}

	toggleSeamless(): void {
		this.seamless = !this.seamless;
		this.persist();
	}

	toggleFocus(): void {
		this.focus = !this.focus;
	}

	toggleSidebar(): void {
		this.sidebarOpen = !this.sidebarOpen;
		this.persist();
	}

	setPalette(open: boolean): void {
		this.paletteOpen = open;
	}

	setCursor(line: number, col: number): void {
		this.cursor = { line, col };
	}

	showNotice(message: string): void {
		this.notice = message;
		clearTimeout(this.noticeTimer);
		this.noticeTimer = setTimeout(() => (this.notice = ''), 2800);
	}
}

export const store = new AppStore();
