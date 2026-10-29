interface GenderIconProps {
  className?: string
  /** Spoken name ("Nam"/"Nữ") when no text says the gender; omit to hide the icon from screen readers. */
  label?: string
}

function a11yProps(label?: string) {
  return label
    ? ({ role: 'img', 'aria-label': label } as const)
    : ({ 'aria-hidden': true } as const)
}

export function MaleIcon({ className = '', label }: GenderIconProps) {
  return (
    <svg
      className={className}
      {...a11yProps(label)}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'>
      {label && <title>{label}</title>}
      <circle cx='10' cy='14' r='5' />
      <line x1='13.5' y1='10.5' x2='19' y2='5' />
      <polyline points='15 5 19 5 19 9' />
    </svg>
  )
}

export function FemaleIcon({ className = '', label }: GenderIconProps) {
  return (
    <svg
      className={className}
      {...a11yProps(label)}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'>
      {label && <title>{label}</title>}
      <circle cx='12' cy='10' r='5' />
      <line x1='12' y1='15' x2='12' y2='21' />
      <line x1='9' y1='18' x2='15' y2='18' />
    </svg>
  )
}
