import boardsData from './boards.json';
import streetsData from '../processed_streets.json';

const streetMap = {};
streetsData.forEach(s => streetMap[s.name] = s);

export const V_DIRS = {
  "堀川通": null, "黒門通": "N", "醒ヶ井通": "S", "油小路通": "N", "小川通": "S", "西洞院通": "S", 
  "釜座通": "N", "新町通": "S", "衣棚通": "N", "室町通": "N", "烏丸通": null,
  "車屋町通": "N", "東洞院通": "S", "間之町通": "N", "高倉通": "S", "堺町通": "S",
  "柳馬場通": "N", "富小路通": "S", "麩屋町通": "N", "御幸町通": "S"
};

export const H_DIRS = {
  "丸太町通": null, "竹屋町通": "W", "夷川通": "E", "二条通": "E", "押小路通": "W", 
  "御池通": null, "姉小路通": "E", "三条通": "W", "六角通": "E", "蛸薬師通": "W"
};

export const generateMap = (level) => {
  const boardId = level <= 30 ? "1" : "2";
  const board = boardsData[boardId];
  
  const mapData = board.grid.map(cell => {
    let allowedDirs = [];
    const vDir = V_DIRS[cell.vName] || '2-way';
    const hDir = H_DIRS[cell.hName] || '2-way';
    
    // 基本の一方通行
    if (cell.row > 0 && (vDir === 'N' || vDir === '2-way')) allowedDirs.push('N');
    if (cell.row < board.numRows - 1 && (vDir === 'S' || vDir === '2-way')) allowedDirs.push('S');
    if (cell.col > 0 && (hDir === 'W' || hDir === '2-way')) allowedDirs.push('W');
    if (cell.col < board.numCols - 1 && (hDir === 'E' || hDir === '2-way')) allowedDirs.push('E');
    
    // 通行不可（motor_vehicle=no）の適用
    const vs = streetMap[cell.vName];
    const hs = streetMap[cell.hName];
    let isBlocked = false;
    
    // 本来は座標ベースで厳密に判定するが、今回は簡易的に、通り全体でnoが含まれていれば進入禁止フラグを立てる
    // (※ただし交差する道は通れるようにするため、N/SやE/Wのみ削る)
    if (vs && vs.motor_vehicle_segments && vs.motor_vehicle_segments.includes("no")) {
        allowedDirs = allowedDirs.filter(d => d !== 'N' && d !== 'S');
    }
    if (hs && hs.motor_vehicle_segments && hs.motor_vehicle_segments.includes("no")) {
        allowedDirs = allowedDirs.filter(d => d !== 'E' && d !== 'W');
    }
    
    if (allowedDirs.length === 0) {
      isBlocked = true;
    }

    // 右左折規制 (turn_restrictions)
    let turnRestrictions = [];
    const isSamePoint = (p1, p2) => Math.abs(p1[0] - p2[0]) < 0.0005 && Math.abs(p1[1] - p2[1]) < 0.0005;
    
    if (vs && vs.turn_restrictions) {
       for (let tr of vs.turn_restrictions) {
         if (cell.coord && isSamePoint(tr.via, cell.coord)) {
             turnRestrictions.push({ from: 'V', res: tr.restriction });
         }
       }
    }
    if (hs && hs.turn_restrictions) {
       for (let tr of hs.turn_restrictions) {
         if (cell.coord && isSamePoint(tr.via, cell.coord)) {
             turnRestrictions.push({ from: 'H', res: tr.restriction });
         }
       }
    }

    const hType = ['丸太町通', '御池通'].includes(cell.hName) ? 'major' : 'minor';
    const vType = ['堀川通', '烏丸通'].includes(cell.vName) ? 'major' : 'minor';

    return {
      ...cell,
      isBlocked,
      allowedDirs,
      turnRestrictions,
      hType,
      vType,
    };
  });
  
  return { mapData, numRows: board.numRows, numCols: board.numCols, hNames: board.hNames, vNames: board.vNames };
};
