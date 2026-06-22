import React from 'react';

export default function Entrance({ level, onStart, onSettings }) {
  return (
    <div className="entrance-phase" style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      <h1 style={{ fontSize: '2.5rem', color: 'var(--color-header-bg)', marginBottom: '8px', letterSpacing: '4px' }}>
        洛中<br />ストリートパズル
      </h1>
      <p style={{ color: '#7f8c8d', marginBottom: '32px', fontWeight: '700' }}>〜 京都の道は、一日にして成らず 〜</p>

      <div style={{ background: '#F8F9FA', padding: '24px', borderRadius: 'var(--radius-md)', marginBottom: '32px', display: 'inline-block' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#333' }}>現在のレベル</h2>
        <div style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--color-primary)' }}>{level}</div>
        <p style={{ fontSize: '0.8rem', color: '#999' }}>{level <= 30 ? '洛中エリア（堀川〜烏丸）' : '洛中エリア（烏丸〜河原町）'}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <button 
          onClick={onStart}
          style={{ background: 'var(--color-start)', color: 'white', border: 'none', padding: '16px 48px', fontSize: '1.2rem', fontWeight: '800', borderRadius: '9999px', cursor: 'pointer', boxShadow: '0 4px 0 #27AE60', transition: 'transform 0.1s' }}
          onMouseDown={e => e.target.style.transform = 'translateY(4px)'}
          onMouseUp={e => e.target.style.transform = 'translateY(0)'}
        >
          出発する
        </button>
        <button 
          onClick={onSettings}
          style={{ background: 'transparent', color: '#95A5A6', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '700' }}
        >
          遊び方・設定
        </button>
      </div>
    </div>
  );
}
