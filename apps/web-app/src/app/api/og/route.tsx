import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') || 'SeedFinderPro';
  const type = searchParams.get('type') || 'Grow';
  const sub = searchParams.get('sub') || '';

  const typeColor: Record<string, string> = {
    Grow: '#22c55e',
    Thread: '#8b5cf6',
    Strain: '#f59e0b',
  };
  const color = typeColor[type] || '#22c55e';

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          padding: '60px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Hintergrund-Muster */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(circle at 80% 20%, ${color}22 0%, transparent 60%)`,
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              background: color,
              color: 'white',
              fontSize: '16px',
              fontWeight: 700,
              padding: '6px 16px',
              borderRadius: '20px',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {type}
          </div>
          <span style={{ color: '#64748b', fontSize: '18px' }}>SeedFinderPro</span>
        </div>

        {/* Titel */}
        <div
          style={{
            color: 'white',
            fontSize: title.length > 60 ? '36px' : '48px',
            fontWeight: 800,
            lineHeight: 1.2,
            flex: 1,
            maxWidth: '900px',
          }}
        >
          {title.length > 120 ? title.slice(0, 117) + '...' : title}
        </div>

        {/* Untertitel */}
        {sub && (
          <div
            style={{
              color: '#94a3b8',
              fontSize: '22px',
              marginBottom: '32px',
              maxWidth: '900px',
            }}
          >
            {sub.length > 100 ? sub.slice(0, 97) + '...' : sub}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderTop: '1px solid #334155',
            paddingTop: '24px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              background: '#22c55e',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '22px',
              fontWeight: 700,
            }}
          >
            🌱
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '18px' }}>SeedFinderPro</div>
            <div style={{ color: '#64748b', fontSize: '14px' }}>Cannabis Growing Community</div>
          </div>
          <div style={{ marginLeft: 'auto', color: '#64748b', fontSize: '16px' }}>
            seedfinderpro.de
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
