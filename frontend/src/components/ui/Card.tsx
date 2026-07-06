import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export type CardVariant = 'filled' | 'outlined' | 'elevated'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
	variant?: CardVariant
	/** Adds hover elevation + a subtle lift; use for clickable cards. */
	interactive?: boolean
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
	filled: 'bg-md-surface-container',
	outlined: 'bg-md-surface border border-md-outline-variant',
	elevated: 'bg-md-surface-container-low shadow-md3-1',
}

/**
 * MD3 card — tonal surface, large radius, no hard borders by default. Depth comes
 * from the tonal surface ladder rather than heavy shadow. `interactive` opts into
 * the hover-elevation + press feedback for tappable cards.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
	{ variant = 'filled', interactive = false, className, ...rest },
	ref,
) {
	return (
		<div
			ref={ref}
			className={cn(
				'rounded-md3-lg',
				VARIANT_CLASSES[variant],
				interactive &&
					'motion-interactive cursor-pointer hover:shadow-md3-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2 focus-visible:ring-offset-md-surface active:scale-[0.99]',
				className,
			)}
			{...rest}
		/>
	)
})
