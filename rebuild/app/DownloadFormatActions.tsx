'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function DownloadFormatActions() {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const tools = document.querySelector<HTMLElement>('.tools');
    if (!tools) return;
    const legacyPdf = tools.querySelector<HTMLElement>('a[data-testid="manual-download"]');
    if (legacyPdf) legacyPdf.hidden = true;
    setTarget(tools);
    return () => {
      if (legacyPdf) legacyPdf.hidden = false;
      setTarget(null);
    };
  }, []);

  if (!target) return null;

  return createPortal(
    <>
      <a
        className="manualDownload formatDownload formatDownloadPdf"
        href="/api/manual"
        download="Manual-do-Participante-CATS-Edicao-Digital-2026.pdf"
        data-testid="pdf-download"
        data-format="PDF"
        aria-label="Baixar Manual do Participante CATS em PDF. Formato de layout fixo, indicado para impressão e visualização fiel."
        title="PDF — layout fixo para impressão e visualização fiel"
      >
        <span className="formatBadge" aria-hidden="true">PDF</span>
        <span className="formatDownloadLabel">Baixar PDF</span>
      </a>
      <a
        className="manualDownload formatDownload formatDownloadEpub"
        href="/api/epub"
        download="Manual-do-Participante-CATS-Edicao-Digital-2026.epub"
        data-testid="epub-download"
        data-format="EPUB"
        aria-label="Baixar Manual do Participante CATS em EPUB. Formato de leitura adaptável, indicado para e-readers, celulares e tablets."
        title="EPUB — leitura adaptável para e-readers, celulares e tablets"
      >
        <span className="formatBadge" aria-hidden="true">EPUB</span>
        <span className="formatDownloadLabel">Baixar EPUB</span>
      </a>
    </>,
    target
  );
}
