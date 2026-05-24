import './Input.css'

/**
 * Input
 * A controlled single-line text input.
 *
 * @param {string}   value
 * @param {function} onChange
 * @param {string}   [placeholder]
 * @param {'sm'|'md'} [size='md']
 * @param {function} [onKeyDown]
 * @param {boolean}  [autoFocus]
 */
function Input({
  value,
  onChange,
  placeholder = '',
  size = 'md',
  onKeyDown,
  autoFocus = false,
  className = '',
  ...rest
}) {
  return (
    <input
      className={`input ${size === 'sm' ? 'input--sm' : ''} ${className}`.trim()}
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      autoFocus={autoFocus}
      {...rest}
    />
  )
}

export default Input
