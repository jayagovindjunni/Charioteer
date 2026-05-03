import React from 'react';

/** Compact constellation-style “C” — gold nodes (#D4AF37), transparent, no bounding box */
export function BrandMark({ size = 28, className = '' }) {
  const gold = '#D4AF37';
  return (
    <svg
      className={['brand-mark', className].filter(Boolean).join(' ')}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable="false"
    >
      <circle cx="5" cy="9" r="1.2" fill={gold} opacity="0.88" />
      <circle cx="3.5" cy="14" r="0.75" fill={gold} opacity="0.62" />
      <circle cx="5.2" cy="18" r="0.95" fill={gold} opacity="0.52" />
      <circle cx="4" cy="22.5" r="0.8" fill={gold} opacity="0.45" />
      <path
        d="M 17.2 6.8 L 11.2 8.4 L 7.2 12.2 L 6.2 16.4 L 7.2 20.5 L 11.2 24.2 L 17.2 25.8"
        stroke={gold}
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.92"
      />
      <circle cx="17.2" cy="6.8" r="1.35" fill={gold} />
      <circle cx="11.2" cy="8.4" r="1.15" fill={gold} />
      <circle cx="7.2" cy="12.2" r="1" fill={gold} />
      <circle cx="6.2" cy="16.4" r="1.05" fill={gold} />
      <circle cx="7.2" cy="20.5" r="1" fill={gold} />
      <circle cx="11.2" cy="24.2" r="1.15" fill={gold} />
      <circle cx="17.2" cy="25.8" r="1.35" fill={gold} />
    </svg>
  );
}

export function BrandNav({ variant = 'intake', tagline = 'Without structure, knowledge is noise.' }) {
  const size = variant === 'compact' ? 24 : 28;
  const showTagline = variant === 'intake';

  return (
    <div className={['brand-nav', variant === 'compact' ? 'brand-nav--compact' : ''].join(' ')}>
      <BrandMark size={size} />
      <div className="brand-nav__text">
        <span className="brand-nav__wordmark">Charioteer</span>
        {showTagline ? <span className="brand-nav__tagline">{tagline}</span> : null}
      </div>
    </div>
  );
}
