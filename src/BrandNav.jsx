import React from 'react';

/** Official horizontal lockup — constellation C + wordmark + tagline baked into artwork. */
const BRAND_SRC = '/charioteer-brand.png';
const BRAND_ARIA_LABEL = 'Charioteer. Without structure, knowledge is noise.';

/**
 * @param {'intake' | 'compact'} variant — intake shows a bolder classic presence; compact for app header strip.
 */
export function BrandNav({ variant = 'intake' }) {
  const intake = variant === 'intake';

  return (
    <div
      className={[
        'brand-lockup',
        intake ? 'brand-lockup--intake' : 'brand-lockup--compact'
      ].join(' ')}
      role="img"
      aria-label={BRAND_ARIA_LABEL}
    >
      <img
        src={BRAND_SRC}
        alt=""
        className="brand-lockup__img"
        draggable={false}
      />
      {intake ? <span className="brand-lockup__rule" aria-hidden /> : null}
    </div>
  );
}
