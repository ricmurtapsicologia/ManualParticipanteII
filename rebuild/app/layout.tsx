import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Manual do Participante CATS | Rebuild',
  description: 'Base limpa do Manual do Participante CATS — edição digital interativa.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
