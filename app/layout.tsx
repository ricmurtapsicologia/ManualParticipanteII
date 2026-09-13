import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Manual do Participante CATS',
  description: 'Edição digital interativa — rebuild limpo',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
