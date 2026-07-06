import EmojiPicker, { EmojiStyle, Theme, type EmojiClickData } from 'emoji-picker-react'
import type { CSSProperties } from 'react'

type EmojiPickerPanelProps = {
	isDarkMode: boolean
	onSelect: (emoji: string) => void
}

/**
 * Thin wrapper around emoji-picker-react. Kept in its own module so ChatView can
 * `lazy()` it — the widget (and its emoji index) only load when the picker opens,
 * staying out of the initial bundle.
 *
 * The picker is themed by mapping its `--epr-*` CSS variables onto our MD3 tokens,
 * so it inherits the app's surface/on-surface/primary colours and re-themes with
 * the rest of the UI. `emojiStyle="native"` renders system emoji — no external
 * sprite requests.
 */
const eprThemeVars: CSSProperties = {
	// MD3 surface + text
	['--epr-bg-color' as string]: 'var(--md-surface-container-high)',
	['--epr-category-label-bg-color' as string]: 'var(--md-surface-container-high)',
	['--epr-text-color' as string]: 'var(--md-on-surface)',
	['--epr-hover-bg-color' as string]: 'var(--md-surface-container-highest)',
	['--epr-focus-bg-color' as string]: 'var(--md-surface-container-highest)',
	['--epr-highlight-color' as string]: 'var(--md-primary)',
	['--epr-category-icon-active-color' as string]: 'var(--md-primary)',
	// Search field → MD3 filled look
	['--epr-search-input-bg-color' as string]: 'var(--md-surface-container-highest)',
	['--epr-search-input-bg-color-active' as string]: 'var(--md-surface-container-highest)',
	['--epr-search-border-color' as string]: 'var(--md-primary)',
	['--epr-picker-border-color' as string]: 'transparent',
	['--epr-picker-border-radius' as string]: 'var(--radius-md3-lg, 24px)',
}

export default function EmojiPickerPanel({ isDarkMode, onSelect }: EmojiPickerPanelProps) {
	return (
		<div style={eprThemeVars}>
			<EmojiPicker
				theme={isDarkMode ? Theme.DARK : Theme.LIGHT}
				emojiStyle={EmojiStyle.NATIVE}
				lazyLoadEmojis
				skinTonesDisabled
				width="100%"
				height={380}
				previewConfig={{ showPreview: false }}
				onEmojiClick={(data: EmojiClickData) => onSelect(data.emoji)}
			/>
		</div>
	)
}
