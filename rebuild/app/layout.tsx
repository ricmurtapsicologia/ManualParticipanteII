import type { Metadata } from 'next';
import './globals.css';
import './ds2.css';
import './wave54.css';
import './wave16.css';
import './wave18.css';

export const metadata: Metadata = {
  title: 'Manual do Participante CATS | Edição Digital',
  description: 'Manual do Participante CATS — edição digital interativa com 249 páginas.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
