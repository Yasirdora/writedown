import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';

const palette = {
	light: {
		text: '#1d1d1f',
		muted: '#86868b',
		accent: '#0071e3',
		code: '#af52de',
		codeBg: 'rgba(0,0,0,.045)',
		quote: '#6e6e73',
		selection: 'rgba(0,113,227,.16)',
		activeLine: 'rgba(0,0,0,.025)',
		searchMatch: 'rgba(255,204,0,.45)'
	},
	dark: {
		text: '#f5f5f7',
		muted: '#98989d',
		accent: '#2997ff',
		code: '#bf5af2',
		codeBg: 'rgba(255,255,255,.08)',
		quote: '#a1a1a6',
		selection: 'rgba(41,151,255,.30)',
		activeLine: 'rgba(255,255,255,.045)',
		searchMatch: 'rgba(255,214,10,.35)'
	}
};

/** CodeMirror UI theme + markdown syntax highlighting, Apple-flavored. */
export function themeExtension(dark: boolean): Extension {
	const c = dark ? palette.dark : palette.light;

	const ui = EditorView.theme(
		{
			'&': {
				backgroundColor: 'transparent',
				color: c.text,
				height: '100%',
				fontSize: '15px'
			},
			'.cm-scroller': {
				fontFamily: `'SF Mono', ui-monospace, Menlo, Consolas, 'Liberation Mono', monospace`,
				lineHeight: '1.75',
				overflow: 'auto'
			},
			'.cm-content': {
				maxWidth: '780px',
				margin: '0 auto',
				padding: '48px 32px 45vh',
				caretColor: c.accent
			},
			'&.cm-focused': { outline: 'none' },
			'.cm-cursor': { borderLeftColor: c.accent, borderLeftWidth: '2px' },
			'.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
				backgroundColor: c.selection
			},
			'.cm-activeLine': { backgroundColor: c.activeLine },
			'.cm-placeholder': { color: c.muted },
			'.cm-panels': {
				backgroundColor: dark ? '#2c2c2e' : '#f5f5f7',
				color: c.text,
				border: 'none',
				borderBottom: `1px solid ${dark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.08)'}`
			},
			'.cm-panels input, .cm-panels button': {
				color: 'inherit',
				fontFamily: 'inherit'
			},
			'.cm-searchMatch': { backgroundColor: c.searchMatch, borderRadius: '3px' },
			'.cm-searchMatch-selected': { backgroundColor: dark ? 'rgba(255,159,10,.5)' : 'rgba(255,149,0,.4)' },
			'.cm-tooltip': {
				backgroundColor: dark ? '#2c2c2e' : '#ffffff',
				color: c.text,
				border: `1px solid ${dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.1)'}`,
				borderRadius: '10px'
			}
		},
		{ dark }
	);

	const highlight = syntaxHighlighting(
		HighlightStyle.define([
			{ tag: [t.heading1, t.heading2, t.heading3, t.heading4, t.heading5, t.heading6], fontWeight: '700', color: c.text },
			{ tag: t.strong, fontWeight: '700' },
			{ tag: t.emphasis, fontStyle: 'italic' },
			{ tag: t.strikethrough, textDecoration: 'line-through' },
			{ tag: t.monospace, color: c.code, backgroundColor: c.codeBg, borderRadius: '4px', padding: '0 2px' },
			{ tag: t.link, color: c.accent },
			{ tag: t.url, color: c.muted },
			{ tag: t.quote, color: c.quote },
			{ tag: [t.processingInstruction, t.punctuation, t.meta], color: c.muted },
			{ tag: t.contentSeparator, color: c.muted },
			{ tag: t.atom, color: c.accent }
		])
	);

	return [ui, highlight];
}
