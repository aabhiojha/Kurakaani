import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	selected?: boolean
	leadingIcon?: ReactNode
}

/**
 * MD3 filter/assist chip — pill-shaped, toggles between an outlined resting state
 * and a filled selected state. Renders as a button so it's keyboard-operable.
 */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
	{ selected = false, leadingIcon, className, children, type = 'button', ...rest },
	ref,
) {
	return (
		<button
			ref={ref}
			type={type}
			aria-pressed={selected}
			className={cn(
				'md-state inline-flex h-8 items-center gap-1.5 rounded-md3-xs px-3 text-[0.8125rem] font-medium',
				'transition-[background-color,color,border-color] duration-200 ease-md-standard',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2 focus-visible:ring-offset-md-surface',
				'active:scale-95',
				selected
					? 'bg-md-secondary-container text-md-on-secondary-container'
					: 'border border-md-outline-variant text-md-on-surface-variant',
				className,
			)}
			{...rest}
		>
			{leadingIcon}
			<span>{children}</span>
		</button>
	)
})
