import React, { useState, useEffect } from 'react';
import { Play, ArrowUp, ArrowRight, ArrowDown, ArrowLeft, RotateCcw } from 'lucide-react';
import { generateMap } from '../MapData';
import { generateValidMission, getTravelCost } from '../utils';

export default function Game({ level, onGameEnd, isResultPhase, onNext, onRetry }) {
  const [mapObj, setMapObj] = useState(null);
  const [grid, setGrid] = useState([]); 
  const [startPos, setStartPos] = useState(null);
  const [goalPos, setGoalPos] = useState(null);
  
  const [status, setStatus] = useState('idle'); 
  const [message, setMessage] = useState('');
  const [playerCost, setPlayerCost] = useState(0);
  const [naviCost, setNaviCost] = useState(0);
  const [pathHistory, setPathHistory] = useState([]);
  const [naviPath, setNaviPath] = useState([]);
  const [showHints, setShowHints] = useState(false); 
  
  const [carPos, setCarPos] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // New: Path drawing state
  const [userPathSequence, setUserPathSequence] = useState([]);

  // New: Timer
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const newMapObj = generateMap(level);
    setMapObj(newMapObj);
    setGrid(Array(newMapObj.mapData.length).fill(null));
    setStatus('idle');
    setMessage('');
    setPathHistory([]);
    setNaviPath([]);
    setUserPathSequence([]);
    setPlayerCost(0);
    setNaviCost(0);
    setCarPos(null);
    setIsAnimating(false);
    
    const mission = generateValidMission(newMapObj, level);
    setStartPos(mission.startPos);
    setGoalPos(mission.goalPos);
    setNaviCost(mission.naviCost);
    setNaviPath(mission.naviPath);

    setStartTime(Date.now());
    setElapsedTime(0);
  }, [level]);

  useEffect(() => {
    let timer;
    if (status === 'idle' && startTime) {
      timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status, startTime]);

  const handleCellClick = (index) => {
    if (status !== 'idle' || isAnimating) return; 

    const { numCols, numRows } = mapObj;
    const lastPos = userPathSequence.length > 0 ? userPathSequence[userPathSequence.length - 1] : startPos;
    
    // Undo step
    if (index === lastPos && index !== startPos) {
       setUserPathSequence(prev => prev.slice(0, -1));
       setGrid(prev => {
           const newGrid = [...prev];
           const prevPos = userPathSequence.length > 1 ? userPathSequence[userPathSequence.length - 2] : startPos;
           newGrid[prevPos] = null;
           return newGrid;
       });
       return;
    }

    if (userPathSequence.includes(goalPos)) {
        setMessage('すでにゴールに到達しています。「出発」を押してください。');
        setTimeout(() => setMessage(''), 2000);
        return;
    }

    const r1 = Math.floor(lastPos / numCols);
    const c1 = lastPos % numCols;
    const r2 = Math.floor(index / numCols);
    const c2 = index % numCols;
    const isAdjacent = Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;

    if (!isAdjacent) {
       setMessage('直前のマスと隣接するマスを選んでください！');
       setTimeout(() => setMessage(''), 2000);
       return;
    }

    if (userPathSequence.includes(index) || index === startPos) {
       return;
    }

    let dirRot = 0;
    if (index === lastPos - numCols) dirRot = 0;
    else if (index === lastPos + 1) dirRot = 90;
    else if (index === lastPos + numCols) dirRot = 180;
    else if (index === lastPos - 1) dirRot = 270;

    setGrid(prev => {
        const newGrid = [...prev];
        newGrid[lastPos] = dirRot; // 前のマス（またはスタートマス）を新しい方向に向ける
        newGrid[index] = dirRot;   // クリックしたマスにも仮の矢印（進行方向）を表示する
        return newGrid;
    });
    setUserPathSequence(prev => [...prev, index]);
  };

  const handleStart = () => {
    if (userPathSequence.length === 0) {
        setMessage('ルートが引かれていません！スタート地点の隣からマスをタップしてください。');
        return;
    }

    const { mapData, numCols, numRows } = mapObj;
    let curr = startPos;
    let totalCost = 0;
    const path = [curr];
    let isError = false;
    let errorMsg = '';
    let prevDir = null; 

    // We simulate exactly what the user drew (userPathSequence implies the route)
    for (let i = 0; i < 200; i++) {
      if (curr === goalPos) break;

      let rot = grid[curr];
      
      if (rot === null) {
        isError = true;
        errorMsg = 'ルートが途切れています！（ゴールまで引かれていません）';
        break;
      }
      
      const cData = mapData[curr];
      let dir = '';
      if (rot === 0) dir = 'N';
      else if (rot === 90) dir = 'E';
      else if (rot === 180) dir = 'S';
      else if (rot === 270) dir = 'W';

      if (!cData.allowedDirs.includes(dir)) {
        isError = true;
        errorMsg = '一方通行の逆走、または進入禁止エリアです！';
        break;
      }

      // 大通り横断（直進）の禁止判定
      if (prevDir && prevDir === dir) {
         const prevStreetType = (prevDir === 'E' || prevDir === 'W') ? cData.hType : cData.vType;
         const crossingStreetType = (prevDir === 'E' || prevDir === 'W') ? cData.vType : cData.hType;
         if (prevStreetType === 'minor' && crossingStreetType === 'major') {
             isError = true;
             errorMsg = '細い道から大通り（御池通など）を横切る直進はできません！';
             break;
         }
      }

      // 右折禁止などのトラップ判定
      if (cData.turnRestrictions && cData.turnRestrictions.length > 0 && prevDir) {
        let isRightTurn = false;
        let isLeftTurn = false;
        if (prevDir === 'N' && dir === 'E') isRightTurn = true;
        if (prevDir === 'E' && dir === 'S') isRightTurn = true;
        if (prevDir === 'S' && dir === 'W') isRightTurn = true;
        if (prevDir === 'W' && dir === 'N') isRightTurn = true;

        if (prevDir === 'N' && dir === 'W') isLeftTurn = true;
        if (prevDir === 'W' && dir === 'S') isLeftTurn = true;
        if (prevDir === 'S' && dir === 'E') isLeftTurn = true;
        if (prevDir === 'E' && dir === 'N') isLeftTurn = true;

        for (let tr of cData.turnRestrictions) {
            if (tr.res === 'no_right_turn' && isRightTurn) {
                isError = true;
                errorMsg = 'この交差点は右折禁止の罠がありました！';
                break;
            }
            if (tr.res === 'only_left_turn' && !isLeftTurn && dir !== prevDir) {
                isError = true;
                errorMsg = 'ここは左折専用レーンです！';
                break;
            }
        }
        if (isError) break;
      }

      let nr = cData.row;
      let nc = cData.col;
      if (dir === 'N') nr -= 1;
      if (dir === 'S') nr += 1;
      if (dir === 'E') nc += 1;
      if (dir === 'W') nc -= 1;

      const costInfo = getTravelCost(cData, dir, prevDir);
      totalCost += costInfo.total;

      const nextIndex = nr * numCols + nc;
      curr = nextIndex;
      path.push(curr);
      prevDir = dir; 
    }

    if (!isError && curr !== goalPos) {
      isError = true;
      errorMsg = 'ゴールにたどり着かずに止まってしまいました。';
    }

    setPathHistory(path);
    setIsAnimating(true);
    setCarPos(path[0]);
    setStatus('playing');
    setPlayerCost(0); 

    let step = 0;
    let currentLiveCost = 0;
    let animPrevDir = null;
    
    const animate = () => {
      step++;
      if (step < path.length) {
        const currentIdx = path[step - 1];
        const nextIdx = path[step];
        const cData = mapObj.mapData[currentIdx];
        
        let dir = '';
        if (nextIdx === currentIdx - mapObj.numCols) dir = 'N';
        if (nextIdx === currentIdx + mapObj.numCols) dir = 'S';
        if (nextIdx === currentIdx + 1) dir = 'E';
        if (nextIdx === currentIdx - 1) dir = 'W';

        const costInfo = getTravelCost(cData, dir, animPrevDir);
        currentLiveCost += costInfo.total;
        
        setCarPos(nextIdx);
        setPlayerCost(currentLiveCost);
        animPrevDir = dir;
        
        setTimeout(animate, 200); 
      } else {
        setIsAnimating(false);
        if (isError) {
          setStatus('error');
          setMessage(`💥 クラッシュ: ${errorMsg}`);
          setTimeout(() => {
             onGameEnd({ success: false, stars: 0, totalCost, naviCost, time: elapsedTime, message: errorMsg, showModal: true });
          }, 1500);
        } else {
          setStatus('result');
          let costScore = 1;
          if (totalCost <= naviCost) costScore = 3;
          else if (totalCost <= naviCost + 5) costScore = 2;
          
          let timeScore = 1;
          if (elapsedTime <= 20) timeScore = 3;
          else if (elapsedTime <= 45) timeScore = 2;

          let starCount = Math.floor((costScore + timeScore) / 2);
          if (starCount < 1) starCount = 1;
          if (starCount > 3) starCount = 3;
          
          let msg = '';
          if (starCount === 3) msg = 'プロ顔負け！最強の「洛中マスター」です！';
          else if (starCount === 2) msg = 'ゴール！なかなか優秀な「一般ドライバー」です。';
          else msg = 'ゴール！でもかなり遠回りか時間がかかったかも？';
          
          setMessage(`🎉 ${msg}`);
          setTimeout(() => {
             onGameEnd({ success: true, stars: starCount, totalCost, naviCost, time: elapsedTime, message: msg, showModal: true });
          }, 2000);
        }
      }
    };
    setTimeout(animate, 200);
  };

  const getIndicatorText = (cellData) => {
    const d = cellData.allowedDirs;
    let text = '';
    if (d.includes('N')) text += '↑';
    if (d.includes('S')) text += '↓';
    if (d.includes('W')) text += '←';
    if (d.includes('E')) text += '→';
    if (text === '') text = '🚫';
    return text;
  };

  const renderArrow = (rot) => {
    switch (rot) {
      case 0: return <ArrowUp className="grid-arrow" strokeWidth={3} color="var(--color-primary)" />;
      case 90: return <ArrowRight className="grid-arrow" strokeWidth={3} color="var(--color-primary)" />;
      case 180: return <ArrowDown className="grid-arrow" strokeWidth={3} color="var(--color-primary)" />;
      case 270: return <ArrowLeft className="grid-arrow" strokeWidth={3} color="var(--color-primary)" />;
      default: return null;
    }
  };

  const handleResetPath = () => {
     setGrid(Array(mapObj.mapData.length).fill(null));
     setUserPathSequence([]);
     setStatus('idle');
     setMessage('');
     setPathHistory([]);
  };

  if (!mapObj) return <div>Loading...</div>;

  const { mapData, numRows, numCols, hNames, vNames } = mapObj;

  return (
    <div style={{ width: '100%', maxWidth: '750px', margin: '0 auto' }}>
      <div className="top-header">
        <h1 style={{ marginBottom: '16px' }}>LEVEL {level} <span style={{fontSize:'1rem', color:'#7f8c8d'}}>/ 60</span></h1>
        <div className="mission-box">
          🚩 {startPos !== null ? mapData[startPos]?.intersectionName : ''} から {goalPos !== null ? mapData[goalPos]?.intersectionName : ''} へ向かえ
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '12px', fontSize: '1.2rem', fontWeight: 'bold' }}>
          <div>⏳ {elapsedTime}秒</div>
        </div>

        {message && (
          <div className={`status-message ${status}`}>
            {message}
          </div>
        )}
      </div>

      <div className="grid-scroll-wrapper" style={{ width: '100%', paddingBottom: '12px', overflowX: 'auto' }}>
        <div className="grid-container" style={{ gridTemplateColumns: `minmax(40px, auto) repeat(${numCols}, 2fr)`, minWidth: '400px' }}>
          <div className="corner-space"></div>
          {Array.from({length: numCols}).map((_, c) => (
            <div key={`col-${c}`} className="street-label vertical">
              {vNames[c]}
            </div>
          ))}

          {Array.from({length: numRows}).map((_, r) => (
            <React.Fragment key={`row-${r}`}>
              <div className="street-label horizontal">
                {hNames[r]}
              </div>

              {mapData.filter(d => d.row === r).map((cellData) => {
                const index = cellData.id;
                const isStart = index === startPos;
                const isGoal = index === goalPos;
                const hasArrow = grid[index] !== null;
                
                const isPassed = status !== 'idle' && pathHistory.includes(index);
                const isNaviRoute = status === 'result' && naviPath.includes(index);
                const isBlocked = cellData.isBlocked;
                
                const isPathSequence = status === 'idle' && (userPathSequence.includes(index) || isStart);

                return (
                  <div 
                    key={index} 
                    className={`grid-cell ${isStart ? 'is-start' : ''} ${isGoal ? 'is-goal' : ''} ${isPassed ? 'is-passed' : ''} ${isNaviRoute ? 'is-navi-route' : ''}`}
                    style={{ 
                        background: isBlocked ? '#2C3E50' : (isPathSequence && !isPassed ? '#E8F6F3' : undefined), 
                        borderColor: isBlocked ? '#1A252F' : undefined 
                    }}
                    onClick={() => !isBlocked && handleCellClick(index)}
                  >
                    {isStart && !hasArrow && <span style={{ zIndex: 2 }}>始</span>}
                    {isGoal && <span style={{ zIndex: 2 }}>終</span>}
                    
                    {hasArrow && <div style={{ zIndex: 3 }}>{renderArrow(grid[index])}</div>}

                    {carPos === index && (
                      <div className="car-icon">🚗</div>
                    )}

                    {!isBlocked && (
                      <div className="one-way-indicator" style={{ opacity: showHints ? 1 : 0, transition: 'opacity 0.2s' }}>
                        {getIndicatorText(cellData)}
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="controls">
        <div className="stats">
          <div className="stat-item">
            <span className="stat-label">現在のコスト</span>
            <span className="stat-value">{status !== 'idle' ? playerCost : '--'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">ナビのコスト</span>
            <span className="stat-value">{status !== 'idle' ? naviCost : '--'}</span>
          </div>
        </div>
        
        <div className="controls-actions" style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn-reset" 
            onClick={() => setShowHints(!showHints)}
            disabled={isAnimating}
            style={{ background: showHints ? '#BDC3C7' : '#F39C12', boxShadow: showHints ? '0 4px 0 #95A5A6' : '0 4px 0 #D68910', opacity: isAnimating ? 0.5 : 1 }}
          >
            💡 ヒント
          </button>
          
          {status === 'idle' || status === 'playing' ? (
            <>
                <button className="btn-reset" onClick={handleResetPath} disabled={isAnimating} style={{ opacity: isAnimating ? 0.5 : 1, padding: '8px 16px', fontSize: '0.9rem' }}>
                    <RotateCcw size={16} /> クリア
                </button>
                <button className="btn-start" onClick={handleStart} disabled={isAnimating} style={{ opacity: isAnimating ? 0.5 : 1 }}>
                  <Play size={20} /> 出発
                </button>
            </>
          ) : (
            isResultPhase ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-reset" onClick={onRetry} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>やり直し</button>
                <button className="btn-start" onClick={onNext} style={{ background: 'var(--color-primary)', padding: '8px 16px', fontSize: '0.9rem' }}>次へ</button>
              </div>
            ) : (
              <button className="btn-reset" onClick={handleResetPath}>
                <RotateCcw size={20} /> やり直し
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
