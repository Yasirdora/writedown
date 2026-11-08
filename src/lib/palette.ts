export interface PaletteCommand {
	id: string;
	title: string;
	hint?: string;
	run: () => void;
}
