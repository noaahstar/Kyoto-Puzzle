import React from 'react';

const TRIVIA_LIST = [
  "【京都豆知識】「丸太町通」は、かつて西堀川に集まった材木（丸太）を運ぶメインストリートでした。",
  "【京都豆知識】「姉小路通（あねやこうじどおり）」は、ガス灯がシンボルのおしゃれな通りです。",
  "【京都豆知識】京都の道は「碁盤の目」と言われますが、実は長方形（南北に長い）のブロックが多いです。",
  "【京都豆知識】「烏丸通」の「烏丸」は「からすま」と読みます。かつての烏丸殿に由来します。",
  "【京都豆知識】「錦小路通」は「京の台所」と呼ばれる錦市場がある活気あふれる通りです。"
];

export default function Result({ success, stars, totalCost, naviCost, time, message, onRetry, onNext, onReview, level }) {
  const trivia = TRIVIA_LIST[level % TRIVIA_LIST.length];

  return (
    <div className="result-phase" style={{ textAlign: 'center', padding: '32px 20px', background: 'white', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      <h1 style={{ fontSize: '3rem', color: success ? 'var(--color-start)' : 'var(--color-error)', marginBottom: '16px', letterSpacing: '2px' }}>
        {success ? '見事' : '残念'}
      </h1>
      
      <p style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '24px', color: '#555' }}>
        {message}
      </p>

      {success && (
        <div style={{ fontSize: '2.5rem', marginBottom: '24px', color: '#F1C40F' }}>
          {'★'.repeat(stars)}{'☆'.repeat(3 - stars)}
        </div>
      )}

      <div style={{ background: '#F8F9FA', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#999', fontWeight: '700' }}>あなたのコスト</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-header-bg)' }}>{totalCost}</div>
        </div>
        {success && (
          <div>
            <div style={{ fontSize: '0.8rem', color: '#999', fontWeight: '700' }}>ナビのコスト</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-primary)' }}>{naviCost}</div>
          </div>
        )}
        <div>
          <div style={{ fontSize: '0.8rem', color: '#999', fontWeight: '700' }}>クリア時間</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#E67E22' }}>{time}秒</div>
        </div>
      </div>

      <div style={{ background: '#FFF3CD', color: '#856404', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '32px', textAlign: 'left', fontSize: '0.9rem', fontWeight: '700' }}>
        💡 {trivia}
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button 
          onClick={onReview}
          style={{ background: '#BDC3C7', color: 'white', border: 'none', padding: '12px 24px', fontSize: '1rem', fontWeight: '800', borderRadius: '9999px', cursor: 'pointer', boxShadow: '0 4px 0 #95A5A6' }}
        >
          盤面を見る
        </button>
        <button 
          onClick={onRetry}
          style={{ background: '#95A5A6', color: 'white', border: 'none', padding: '12px 24px', fontSize: '1rem', fontWeight: '800', borderRadius: '9999px', cursor: 'pointer', boxShadow: '0 4px 0 #7F8C8D' }}
        >
          やり直す
        </button>
        
        {success && level < 60 && (
          <button 
            onClick={onNext}
            style={{ background: 'var(--color-primary)', color: 'white', border: 'none', padding: '12px 32px', fontSize: '1.1rem', fontWeight: '800', borderRadius: '9999px', cursor: 'pointer', boxShadow: '0 4px 0 #2980B9' }}
          >
            次へ
          </button>
        )}
      </div>
    </div>
  );
}
