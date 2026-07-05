import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type IconButtonVariant = 'standard' | 'filled' | 'tonal' | 'outlined'
export type IconButtonSize = 'sm' | 'md' | 'lg'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	/** Required for a11y — icon-only controls must be labelled. */
	label: string
	icon: ReactNode
	variant?: IconButtonVariant
	size?: IconButtonSize
	selected?: boolean
}

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
	standard: 'bg-transparent text-md-on-surface-variant',
	filled: 'bg-md-primary text-md-on-primary',
	tonal: 'bg-md-secondary-container text-md-on-secondary-container',
	outlined: 'bg-transparent text-md-on-surface-variant border border-md-outline-variant',
}

const SIZE_CLASSES: Record<IconButtonSize, string> = {
	sm: 'h-9 w-9',
	md: 'h-10 w-10',
	lg: 'h-12 w-12',
}

/** MD3 icon button — circular, 44px+ touch target on md/lg, state-layer feedback. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
	{ label, icon, variant = 'standard', size = 'md', selected = false, className, type = 'button', ...rest },
	ref,
) {
	return (
		<button
			ref={ref}
			type={type}
			aria-label={label}
			aria-pressed={selected || undefined}
			title={label}
			className={cn(
				'md-state inline-flex items-center justify-center rounded-full shrink-0',
				'transition-[background-color,color,box-shadow] duration-[240ms] ease-md-standard',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2 focus-visible:ring-offset-md-surface',
				'active:scale-95 disabled:pointer-events-none disabled:opacity-40',
				selected && variant === 'standard' && 'bg-md-secondary-container text-md-on-secondary-container',
				VARIANT_CLASSES[variant],
				SIZE_CLASSES[size],
				className,
			)}
			{...rest}
		>
			<span className="inline-flex">{icon}</span>
		</button>
	)
})
