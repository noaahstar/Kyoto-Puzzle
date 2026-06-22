// リアルな交通コストを計算する中核関数
export const getTravelCost = (currData, dir, prevDir) => {
  let penalty = 0;
  
  if (prevDir) {
    const prevStreetType = (prevDir === 'E' || prevDir === 'W') ? currData.hType : currData.vType;
    const nextStreetType = (dir === 'E' || dir === 'W') ? currData.hType : currData.vType;
    const isStraight = (prevDir === dir);

    if (prevStreetType === 'minor' && nextStreetType === 'minor') {
      penalty = 1; 
    } else if (prevStreetType === 'major' && nextStreetType === 'major') {
      penalty = isStraight ? 0 : 2; 
    } else if (prevStreetType === 'minor' && nextStreetType === 'major') {
      if (currData.hasSignal) {
        penalty = isStraight ? 6 : 3; 
      } else {
        penalty = isStraight ? 4 : 1; 
      }
    } else if (prevStreetType === 'major' && nextStreetType === 'minor') {
      penalty = 1; 
    }
  }

  const nextStreetType = (dir === 'E' || dir === 'W') ? (currData.hType || 'minor') : (currData.vType || 'minor');
  const travel = nextStreetType === 'major' ? 1 : 2;

  return { penalty, travel, total: penalty + travel };
};

export const calculateNaviRoute = (startPos, goalPos, mapObj) => {
  const { mapData, numRows, numCols } = mapObj;
  const distances = {};
  const previous = {};
  const pq = [];

  const dirs = ['N', 'E', 'S', 'W'];
  for (let d of dirs) {
    const key = `${startPos}-${d}`;
    distances[key] = 0;
    pq.push({ key, cost: 0, idx: startPos, inDir: d });
  }

  while (pq.length > 0) {
    pq.sort((a, b) => a.cost - b.cost);
    const currState = pq.shift();
    
    if (currState.cost > distances[currState.key]) continue;
    if (currState.idx === goalPos) {
      const path = [];
      let currKey = currState.key;
      while (currKey) {
        path.unshift(parseInt(currKey.split('-')[0]));
        currKey = previous[currKey];
      }
      return { cost: currState.cost, path };
    }

    const cData = mapData[currState.idx];
    const r = cData.row;
    const c = cData.col;

    for (let dir of cData.allowedDirs) {
      const prevDir = currState.inDir;
      const isStraight = (prevDir === dir);
      
      // 大通り横断（直進）の禁止 (マイナー -> メジャー -> 直進 は不可)
      // hType, vTypeが 'major' の場合、交差点で直進できるかを簡易チェック
      // しかし、現状 MapData.js では全て 'minor' にしているため、このロジックを有効にするには
      // MapData.js の hType/vType を正確に設定する必要があります。
      if (currState.idx !== startPos && isStraight) {
         const prevStreetType = (prevDir === 'E' || prevDir === 'W') ? cData.hType : cData.vType;
         const crossingStreetType = (prevDir === 'E' || prevDir === 'W') ? cData.vType : cData.hType;
         if (prevStreetType === 'minor' && crossingStreetType === 'major') {
            // マイナーから大通りを横切る直進は禁止
            continue; 
         }
      }

      // 交通規制チェック (turnRestrictions)
      if (cData.turnRestrictions && cData.turnRestrictions.length > 0 && currState.idx !== startPos) {
        const prevDir = currState.inDir;
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

        let blockedByRule = false;
        for (let tr of cData.turnRestrictions) {
          if (tr.res === 'no_right_turn' && isRightTurn) {
            blockedByRule = true;
            break;
          }
          if (tr.res === 'only_left_turn' && !isLeftTurn && dir !== prevDir) {
            blockedByRule = true;
            break;
          }
        }
        if (blockedByRule) continue;
      }

      let nr = r;
      let nc = c;
      if (dir === 'N') nr -= 1;
      if (dir === 'S') nr += 1;
      if (dir === 'E') nc += 1;
      if (dir === 'W') nc -= 1;

      const nextIndex = nr * numCols + nc;
      
      const costInfo = getTravelCost(cData, dir, currState.idx === startPos ? null : currState.inDir);
      let newCost = currState.cost + costInfo.total;

      const nextKey = `${nextIndex}-${dir}`;
      if (distances[nextKey] === undefined || newCost < distances[nextKey]) {
        distances[nextKey] = newCost;
        previous[nextKey] = currState.key;
        pq.push({ key: nextKey, cost: newCost, idx: nextIndex, inDir: dir });
      }
    }
  }

  return { cost: Infinity, path: [] };
};

export const generateValidMission = (mapObj, level) => {
  const { mapData, numRows, numCols } = mapObj;
  const numCells = numRows * numCols;
  let s, g, navi;
  let attempts = 0;
  
  while (attempts < 2000) {
    s = Math.floor(Math.random() * numCells);
    g = Math.floor(Math.random() * numCells);
    
    if (s === g) {
      attempts++;
      continue;
    }

    if (level <= 10) {
      // 簡略化のため、大通り判定をスキップ、あるいはエラー防止のためhasSignalチェックを除去
      // if (!mapData[s].hasSignal && !mapData[g].hasSignal) { attempts++; continue; }
    }

    navi = calculateNaviRoute(s, g, mapObj);
    
    if (navi.cost !== Infinity) {
      // 動的グリッド対応の難易度判定
      if (level <= 10 && navi.cost >= 8 && navi.cost <= 25) return { startPos: s, goalPos: g, naviCost: navi.cost, naviPath: navi.path };
      if (level > 10 && level <= 30 && navi.cost > 20 && navi.cost <= 60) return { startPos: s, goalPos: g, naviCost: navi.cost, naviPath: navi.path };
      if (level > 30 && navi.cost >= 50) return { startPos: s, goalPos: g, naviCost: navi.cost, naviPath: navi.path };
    }
    attempts++;
  }
  
  // 保険
  const fallbackRoute = calculateNaviRoute(0, numCells - 1, mapObj);
  return { startPos: 0, goalPos: numCells - 1, naviCost: fallbackRoute.cost || 0, naviPath: fallbackRoute.path || [] };
};
