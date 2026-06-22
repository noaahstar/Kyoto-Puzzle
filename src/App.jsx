import React, { useState, useEffect } from 'react';
import Entrance from './components/Entrance';
import Game from './components/Game';
import Result from './components/Result';
import './index.css';

function App() {
  const [phase, setPhase] = useState('entrance'); // 'entrance', 'game', 'result'
  const [level, setLevel] = useState(1);
  const [gameResult, setGameResult] = useState(null); // { success, stars, totalCost, naviCost, message }

  useEffect(() => {
    const savedLevel = localStorage.getItem('kyoto_puzzle_level');
    if (savedLevel) setLevel(parseInt(savedLevel, 10));
  }, []);

  const handleStart = () => {
    setPhase('game');
  };

  const handleGameEnd = (result) => {
    setGameResult(result);
    setPhase('result');
    if (result.success && level < 60) {
      localStorage.setItem('kyoto_puzzle_level', level + 1);
    }
  };

  const handleRetry = () => {
    setPhase('game');
  };

  const handleNext = () => {
    setLevel(l => Math.min(60, l + 1));
    setPhase('game');
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {phase === 'entrance' && (
        <Entrance level={level} onStart={handleStart} onSettings={() => alert('設定画面は準備中です')} />
      )}
      {(phase === 'game' || phase === 'result') && (
        <Game 
          level={level} 
          onGameEnd={handleGameEnd} 
          isResultPhase={phase === 'result'}
          onNext={handleNext}
          onRetry={handleRetry}
        />
      )}
      {phase === 'result' && gameResult && gameResult.showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <Result 
            success={gameResult.success} 
            stars={gameResult.stars} 
            totalCost={gameResult.totalCost} 
            naviCost={gameResult.naviCost} 
            time={gameResult.time}
            message={gameResult.message} 
            onRetry={handleRetry} 
            onNext={handleNext} 
            onReview={() => setGameResult(prev => ({...prev, showModal: false}))}
            level={level}
          />
        </div>
      )}
    </div>
  );
}

export default App;
