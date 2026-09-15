import type { Metadata } from 'next';
import './globals.css';
import './ds2.css';
import './wave54.css';
import './wave16.css';
import './wave18.css';
import './wave10.css';
import './a11y-qep.css';
import './download-format-actions.css';
import SkipLinkFocus from './SkipLinkFocus';
import DownloadFormatActions from './DownloadFormatActions';

const canonicalUrl = 'https://manual-participante-cats-digital.vercel.app';
const title = 'Manual do Participante CATS | Edição Digital 2026';
const description = 'Manual do Participante CATS — edição digital interativa 2026 do Corpo de Bombeiros Militar de Minas Gerais.';

export const metadata: Metadata = {
  metadataBase: new URL(canonicalUrl),
  title,
  description,
  authors: [{ name: 'Corpo de Bombeiros Militar de Minas Gerais' }],
  creator: 'Corpo de Bombeiros Militar de Minas Gerais',
  publisher: 'Corpo de Bombeiros Militar de Minas Gerais',
  keywords: ['CATS', 'ATS', 'CBMMG', 'abordagem técnica', 'tentativa de suicídio', 'manual do participante'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'book',
    locale: 'pt_BR',
    url: canonicalUrl,
    title,
    description,
    siteName: 'CATS — Manual do Participante',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Capa digital do Manual do Participante CATS — Edição 2026' }]
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/opengraph-image']
  },
  robots: { index: true, follow: true }
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': ['Book', 'LearningResource'],
  name: 'Manual do Participante CATS',
  description,
  inLanguage: 'pt-BR',
  datePublished: '2026',
  version: 'Edição 2026',
  url: canonicalUrl,
  isAccessibleForFree: true,
  encodingFormat: ['application/pdf', 'application/epub+zip'],
  learningResourceType: 'Manual de formação',
  author: { '@type': 'Organization', name: 'Corpo de Bombeiros Militar de Minas Gerais' },
  publisher: { '@type': 'Organization', name: 'Corpo de Bombeiros Militar de Minas Gerais' }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
        <SkipLinkFocus />
        {children}
        <DownloadFormatActions />
      </body>
    </html>
  );
}
