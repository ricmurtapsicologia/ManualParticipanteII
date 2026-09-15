'use client';

import { useEffect } from 'react';

export default function SkipLinkFocus() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const origin = event.target;
      if (!(origin instanceof Element)) return;
      const link = origin.closest<HTMLAnchorElement>('a.skipLink[href="#conteudo-principal"]');
      if (!link) return;
      const target = document.getElementById('conteudo-principal');
      if (!target) return;
      event.preventDefault();
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'start' });
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return null;
}
