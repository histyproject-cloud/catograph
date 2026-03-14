import { useState, useEffect } from 'react';

export function useBreakpoint() {
  const [bp, setBp] = useState(() => getBreakpoint(window.innerWidth));

  useEffect(() => {
    const handler = () => setBp(getBreakpoint(window.innerWidth));
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return {
    isMobile: bp === 'mobile',
    isTablet: bp === 'tablet',
    isDesktop: bp === 'desktop',
    bp,
  };
}

function getBreakpoint(w) {
  if (w < 768) return 'mobile';
  if (w < 1200) return 'tablet';
  return 'desktop';
}
