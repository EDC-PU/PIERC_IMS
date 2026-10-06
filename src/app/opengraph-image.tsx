import { ImageResponse } from 'next/og';

export const alt = 'PIERC Incubation Management System | Parul University';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '80px',
          backgroundColor: '#0F172A',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              padding: '10px 24px',
              backgroundColor: '#D91A2A',
              color: 'white',
              fontSize: '20px',
              fontWeight: 900,
              borderRadius: '999px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}
          >
            Parul University
          </div>
          <div
            style={{
              color: '#94A3B8',
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '1px',
            }}
          >
            PIERC • Section 8 Incubator
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              fontSize: '64px',
              fontWeight: 900,
              color: 'white',
              lineHeight: 1.1,
              maxWidth: '1000px',
            }}
          >
            Incubation Management System
          </div>
          <div
            style={{
              fontSize: '28px',
              color: '#EF4444',
              fontWeight: 800,
              letterSpacing: '1px',
            }}
          >
            Ideate • Innovate • Incubate • Accelerate
          </div>
          <div
            style={{
              fontSize: '22px',
              color: '#94A3B8',
              fontWeight: 500,
              maxWidth: '900px',
            }}
          >
            Empowering 200+ startups with ₹8 Cr+ in funding, FabLab prototyping, and mentor acceleration
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            borderTop: '2px solid #334155',
            paddingTop: '24px',
            color: '#94A3B8',
            fontSize: '18px',
            fontWeight: 700,
          }}
        >
          <div>portal.pierc.org</div>
          <div>SSIP 2.0 • NIDHI-PRAYAS • DPIIT Recognised</div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
