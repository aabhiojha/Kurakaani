import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'placeholder'> {
	label: string
	/** Optional helper text shown below the field. Replaced by `error` when present. */
	supportingText?: string
	error?: string
	/** Rendered inside the field on the trailing edge (e.g. a password visibility toggle). */
	trailing?: ReactNode
}

/**
 * MD3 filled text field: rounded top, square bottom, 2px bottom indicator that
 * animates to primary on focus, and a floating label driven purely by CSS
 * (`:placeholder-shown` + `:focus`) so there's no JS state for the label.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
	{ label, supportingText, error, trailing, id, className, disabled, ...rest },
	ref,
) {
	const autoId = useId()
	const inputId = id ?? autoId
	const describedById = `${inputId}-desc`
	const hasError = Boolean(error)

	return (
		<div className={cn('w-full', className)}>
			<div
				className={cn(
					'group relative rounded-t-md3-sm bg-md-surface-container-highest',
					'transition-colors duration-200 ease-md-standard',
					disabled && 'opacity-40',
				)}
			>
				<input
					ref={ref}
					id={inputId}
					disabled={disabled}
					placeholder=" "
					aria-invalid={hasError || undefined}
					aria-describedby={supportingText || error ? describedById : undefined}
					className={cn(
						'peer h-14 w-full rounded-t-md3-sm bg-transparent px-4 pt-5 pb-1.5',
						trailing ? 'pr-12' : 'pr-4',
						'text-md-on-surface placeholder-transparent',
						'border-b-2 border-md-outline outline-none',
						'transition-colors duration-200 ease-md-standard',
						'focus:border-md-primary',
						hasError && 'border-md-error focus:border-md-error',
					)}
					{...rest}
				/>
				<label
					htmlFor={inputId}
					className={cn(
						'pointer-events-none absolute left-4 top-2 text-xs font-medium text-md-on-surface-variant',
						'transition-all duration-200 ease-md-standard',
						'peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:font-normal',
						'peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-md-primary',
						hasError && 'text-md-error peer-focus:text-md-error',
					)}
				>
					{label}
				</label>
				{trailing && (
					<div className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</div>
				)}
			</div>
			{(error || supportingText) && (
				<p
					id={describedById}
					className={cn(
						'mt-1.5 px-4 text-xs',
						hasError ? 'text-md-error' : 'text-md-on-surface-variant',
					)}
				>
					{error ?? supportingText}
				</p>
			)}
		</div>
	)
})
