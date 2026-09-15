import { ImageResponse } from 'next/og';

export const alt = 'Manual do Participante CATS — Edição Digital 2026';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, color: '#f7f5ef', background: 'linear-gradient(135deg,#052b2d 0%,#0d6665 68%,#e86d2b 100%)', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', fontSize: 34, fontWeight: 800, letterSpacing: 5 }}>CATS · CBMMG</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', fontSize: 78, lineHeight: 1.02, fontWeight: 800 }}>Manual do Participante</div>
        <div style={{ display: 'flex', fontSize: 34 }}>Edição Digital Interativa · 2026</div>
      </div>
      <div style={{ display: 'flex', fontSize: 24, opacity: 0.92 }}>Corpo de Bombeiros Militar de Minas Gerais</div>
    </div>,
    size
  );
}
