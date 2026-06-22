import json
import math

BOARD1_V = ["堀川通", "黒門通", "油小路通", "小川通", "西洞院通", "釜座通", "新町通", "衣棚通", "室町通", "烏丸通"]
BOARD1_H = ["丸太町通", "竹屋町通", "夷川通", "二条通", "押小路通", "御池通", "姉小路通", "三条通", "六角通", "蛸薬師通"]

BOARD2_V = ["烏丸通", "車屋町通", "東洞院通", "間之町通", "高倉通", "堺町通", "柳馬場通", "富小路通", "麩屋町通", "御幸町通"]
BOARD2_H = ["丸太町通", "竹屋町通", "夷川通", "二条通", "押小路通", "御池通", "姉小路通", "三条通", "六角通", "蛸薬師通"]

def distance(p1, p2):
    return math.hypot(p1[0] - p2[0], p1[1] - p2[1])

def get_intersection_index(street_coords, p_intersect):
    # Returns the index of the segment that contains or is closest to p_intersect
    min_d = float('inf')
    best_i = 0
    for i in range(len(street_coords)-1):
        c1, c2 = street_coords[i], street_coords[i+1]
        mid = ((c1[0]+c2[0])/2, (c1[1]+c2[1])/2)
        d = distance(mid, p_intersect)
        if d < min_d:
            min_d = d
            best_i = i
    return best_i

def build_board(street_map, h_names, v_names, board_id):
    h_streets = [street_map.get(n) for n in h_names]
    v_streets = [street_map.get(n) for n in v_names]
    
    num_rows = len(h_names)
    num_cols = len(v_names)
    
    # 1. 座標の交点を見つける
    intersections = [[None for _ in range(num_cols)] for _ in range(num_rows)]
    for r in range(num_rows):
        hs = h_streets[r]
        for c in range(num_cols):
            vs = v_streets[c]
            if not hs or not vs: continue
            
            # Find closest points
            min_dist = float('inf')
            best_p = None
            for p1 in hs['coords']:
                for p2 in vs['coords']:
                    d = distance(p1, p2)
                    if d < min_dist:
                        min_dist = d
                        best_p = p1
            intersections[r][c] = best_p

    # 2. グリッドの構築
    grid = []
    for r in range(num_rows):
        for c in range(num_cols):
            hs = h_streets[r]
            vs = v_streets[c]
            p = intersections[r][c]
            
            h_name = h_names[r]
            v_name = v_names[c]
            
            allowed_dirs = []
            turn_restrictions = []
            
            if hs and vs and p:
                # 判定: N, S は vs のデータから
                v_idx = get_intersection_index(vs['coords'], p)
                
                # 北へ行けるか？ (v_streets は大抵 北→南 または 南→北)
                # processed_streets の並び順に依存するが、is_mostly_onewayを使えばよいか
                # よりシンプルに: 以前のMASTERデータに基づいて基本の一方通行を設定し、motor_vehicle_segmentsでブロックする
                
                pass
                
            # ここではシンプルに、一旦すべてのマスを作成
            grid.append({
                "id": r * num_cols + c,
                "row": r,
                "col": c,
                "hName": h_name,
                "vName": v_name,
                "intersectionName": v_name.replace('通','') + h_name.replace('通',''),
                "coord": p,
            })
            
    return {
        "boardId": board_id,
        "numRows": num_rows,
        "numCols": num_cols,
        "hNames": h_names,
        "vNames": v_names,
        "grid": grid
    }

def main():
    with open('processed_streets.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    street_map = {s['name']: s for s in data}
    
    b1 = build_board(street_map, BOARD1_H, BOARD1_V, 1)
    b2 = build_board(street_map, BOARD2_H, BOARD2_V, 2)
    
    with open('src/boards.json', 'w', encoding='utf-8') as f:
        json.dump({"1": b1, "2": b2}, f, ensure_ascii=False, indent=2)
        
    print("boards.json generated successfully.")

if __name__ == '__main__':
    main()
