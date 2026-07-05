import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'elevated' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant
	size?: ButtonSize
	fullWidth?: boolean
	isLoading?: boolean
	leadingIcon?: ReactNode
	trailingIcon?: ReactNode
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
	filled: 'bg-md-primary text-md-on-primary shadow-none hover:shadow-md3-1',
	tonal: 'bg-md-secondary-container text-md-on-secondary-container hover:shadow-md3-1',
	outlined:
		'bg-transparent text-md-primary border border-md-outline hover:border-md-primary',
	text: 'bg-transparent text-md-primary',
	elevated: 'bg-md-surface-container-low text-md-primary shadow-md3-1 hover:shadow-md3-2',
	danger: 'bg-md-error text-md-on-error hover:shadow-md3-1',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
	sm: 'h-9 px-4 text-[0.8125rem] gap-1.5',
	md: 'h-10 px-6 text-sm gap-2',
	lg: 'h-12 px-8 text-base gap-2',
}

/**
 * MD3 pill button. Uses the shared `md-state` layer (opacity overlay of the
 * current text colour) for hover/focus/active instead of swapping colours, and
 * `active:scale-95` for tactile press feedback. Focus is a primary ring.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
	{
		variant = 'filled',
		size = 'md',
		fullWidth = false,
		isLoading = false,
		leadingIcon,
		trailingIcon,
		className,
		children,
		disabled,
		type = 'button',
		...rest
	},
	ref,
) {
	const isDisabled = disabled || isLoading
	return (
		<button
			ref={ref}
			type={type}
			disabled={isDisabled}
			aria-busy={isLoading || undefined}
			className={cn(
				'md-state inline-flex items-center justify-center rounded-full font-medium select-none',
				'transition-[box-shadow,transform,background-color,border-color] duration-[240ms] ease-md-standard',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2 focus-visible:ring-offset-md-surface',
				'active:scale-95 disabled:pointer-events-none disabled:opacity-40',
				VARIANT_CLASSES[variant],
				SIZE_CLASSES[size],
				fullWidth && 'w-full',
				className,
			)}
			{...rest}
		>
			<span className="inline-flex items-center justify-center gap-2">
				{isLoading ? (
					<Loader2 className="animate-spin" size={size === 'lg' ? 20 : 18} aria-hidden />
				) : (
					leadingIcon
				)}
				{children}
				{!isLoading && trailingIcon}
			</span>
		</button>
	)
})
