interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  errors?: string[]
}

export function AuthInput({ label, errors, name, ...props }: AuthInputProps) {
  const id = `field-${name}`
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-[var(--color-ink)]">
        {label}
      </label>
      <input
        id={id}
        name={name}
        {...props}
        className="shadow-xs mt-1.5 block w-full rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
      />
      {errors && errors.length > 0 ? (
        <p className="mt-1.5 text-xs text-red-600">{errors[0]}</p>
      ) : null}
    </div>
  )
}
