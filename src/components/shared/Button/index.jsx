import './Button.css'

/**
 * Button
 * @param {'primary'|'ghost'|'danger'} [variant='primary']
 * @param {'sm'|'md'} [size='md']
 * @param {boolean} [iconOnly] - renders as square icon button
 * @param {boolean} [disabled]
 * @param {function} [onClick]
 * @param {React.ReactNode} children
 */
function Button({
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  disabled = false,
  onClick,
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    iconOnly ? 'btn--icon' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      className={classes}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  )
}

export default Button
