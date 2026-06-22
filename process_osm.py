import json
import time
import requests
from collections import defaultdict, deque

# ==========================================
# 設定
# ==========================================
INPUT_FILE = 'export.geojson'  # または export.json (Overpass APIの出力)
OUTPUT_FILE = 'processed_streets.json'

# ==========================================
# 1. データのパースと道路ごとのグループ化
# ==========================================
def parse_osm_data(data):
    streets = defaultdict(list)
    
    # GeoJSON形式かOSM JSON形式かを判定
    if "features" in data:
        # GeoJSON形式の場合
        for feature in data["features"]:
            props = feature.get("properties", {})
            name = props.get("name")
            if not name:
                continue
                
            geom = feature.get("geometry", {})
            if geom.get("type") == "LineString":
                coords = geom.get("coordinates", [])
                # GeoJSONは [lon, lat] だが、比較用に文字列やタプルにする
                nodes = [f"{c[0]},{c[1]}" for c in coords]
                
                streets[name].append({
                    "id": props.get("id", "unknown"),
                    "name": name,
                    "oneway": props.get("oneway", "no"),
                    "nodes": nodes,
                    "coords": coords # [[lon, lat], ...]
                })
    elif "elements" in data:
        # OSM JSON形式 (out body geom; の結果)
        for el in data["elements"]:
            if el["type"] == "way":
                tags = el.get("tags", {})
                name = tags.get("name")
                if not name:
                    continue
                
                nodes = el.get("nodes", [])
                geom = el.get("geometry", [])
                coords = [[pt["lon"], pt["lat"]] for pt in geom] if geom else []
                
                streets[name].append({
                    "id": el["id"],
                    "name": name,
                    "oneway": tags.get("oneway", "no"),
                    "nodes": nodes,
                    "coords": coords
                })
    
    return streets

# ==========================================
# 2. 隣り合うパーツの結合（ガッチャンコ）
# ==========================================
def merge_street_segments(segments):
    """
    同じ通り名のセグメントリストを受け取り、端のノードが一致するものを結合する
    """
    if not segments:
        return []
        
    # 結合済みの長い道リスト
    merged_lines = []
    
    # まだ処理していないセグメントのリスト
    unmerged = segments.copy()
    
    while unmerged:
        # 基準となるセグメントを1つ取り出す
        current = unmerged.pop(0)
        current_nodes = deque(current["nodes"])
        current_coords = deque(current["coords"])
        current_oneways = [current["oneway"]] * (len(current["nodes"]) - 1)
        
        changed = True
        while changed:
            changed = False
            for i, seg in enumerate(unmerged):
                seg_nodes = seg["nodes"]
                
                # パターン1: currentの最後とsegの最初が一致 (順方向結合)
                if current_nodes[-1] == seg_nodes[0]:
                    current_nodes.extend(seg_nodes[1:])
                    current_coords.extend(seg["coords"][1:])
                    current_oneways.extend([seg["oneway"]] * (len(seg_nodes) - 1))
                    unmerged.pop(i)
                    changed = True
                    break
                    
                # パターン2: currentの最初とsegの最後が一致 (逆方向結合)
                elif current_nodes[0] == seg_nodes[-1]:
                    current_nodes.extendleft(reversed(seg_nodes[:-1]))
                    current_coords.extendleft(reversed(seg["coords"][:-1]))
                    current_oneways = ([seg["oneway"]] * (len(seg_nodes) - 1)) + current_oneways
                    unmerged.pop(i)
                    changed = True
                    break
                    
                # パターン3: currentの最後とsegの最後が一致 (segを反転して順方向結合)
                elif current_nodes[-1] == seg_nodes[-1]:
                    current_nodes.extend(reversed(seg_nodes[:-1]))
                    current_coords.extend(reversed(seg["coords"][:-1]))
                    # 反転したのでonewayも論理的には逆になるが、一旦元の値を保持
                    current_oneways.extend([seg["oneway"]] * (len(seg_nodes) - 1))
                    unmerged.pop(i)
                    changed = True
                    break
                    
                # パターン4: currentの最初とsegの最初が一致 (segを反転して逆方向結合)
                elif current_nodes[0] == seg_nodes[0]:
                    current_nodes.extendleft(seg_nodes[1:])
                    current_coords.extendleft(seg["coords"][1:])
                    current_oneways = ([seg["oneway"]] * (len(seg_nodes) - 1)) + current_oneways
                    unmerged.pop(i)
                    changed = True
                    break

        merged_lines.append({
            "name": current["name"],
            "nodes": list(current_nodes),
            "coords": list(current_coords),
            "oneway_segments": current_oneways
        })
        
    return merged_lines

# ==========================================
# 3. 一方通行（oneway）の「欠損」を推測・補完する
# ==========================================
def impute_oneway(oneway_list):
    """
    [yes, yes, unknown, yes] のようなリストの unknown を前後の文脈から補完する
    """
    imputed = oneway_list.copy()
    n = len(imputed)
    
    for i in range(n):
        if imputed[i] not in ["yes", "-1", "true", "1"]:  # 欠損や no とみなす
            # 前後の値をチェック
            prev_val = imputed[i-1] if i > 0 else None
            next_val = imputed[i+1] if i < n - 1 else None
            
            # 前後が両方とも一方通行(yes)なら、間も一方通行とみなす
            if prev_val in ["yes", "true", "1"] and next_val in ["yes", "true", "1"]:
                imputed[i] = "yes (imputed)"
                
    # 全体がyesなら、この通りは基本的に一方通行と判定できる
    is_mostly_oneway = imputed.count("yes") + imputed.count("yes (imputed)") > len(imputed) * 0.5
    
    return imputed, is_mostly_oneway

# ==========================================
# 4. 逆ジオコーディング（交差点名の取得）
# ==========================================
def reverse_geocode(lon, lat):
    """
    OpenStreetMapのNominatim APIを使って座標から住所や交差点名を取得
    ※無料APIのため、リクエスト間隔(sleep)を必ず空けること
    """
    url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=18&addressdetails=1"
    headers = {
        'User-Agent': 'KyotoStreetPuzzleApp/1.0 (contact@example.com)' # 適切なUser-Agentを設定
    }
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            # 住所の詳細から適当な交差点名や町名を抽出
            address = data.get("address", {})
            
            # 道路名や交差点名が含まれているか確認
            if "intersection" in address:
                return address["intersection"]
            elif "road" in address and "neighbourhood" in address:
                return f'{address["road"]} ({address["neighbourhood"]})'
            elif "suburb" in address:
                return address["suburb"]
            
            return data.get("display_name", "Unknown Intersection").split(",")[0]
            
    except Exception as e:
        print(f"Geocoding error: {e}")
        
    return f"Coord({lat:.4f}, {lon:.4f})"

# ==========================================
# メイン処理
# ==========================================
def main():
    print("1. データの読み込み中...")
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            raw_data = json.load(f)
    except FileNotFoundError:
        print(f"エラー: {INPUT_FILE} が見つかりません。")
        return

    streets = parse_osm_data(raw_data)
    print(f"{len(streets)}本のユニークな通りを検出しました。")
    
    final_results = []

    print("\n2. パーツの結合と一方通行の補完中...")
    for name, segments in streets.items():
        # ガッチャンコ（結合）
        merged_lines = merge_street_segments(segments)
        
        for idx, line in enumerate(merged_lines):
            # 一方通行の補完
            imputed_oneways, is_oneway = impute_oneway(line["oneway_segments"])
            line["oneway_segments"] = imputed_oneways
            line["is_mostly_oneway"] = is_oneway
            
            # 両端の座標
            start_coord = line["coords"][0]
            end_coord = line["coords"][-1]
            
            print(f"処理中: {name} (セグメント{idx+1}) - ノード数: {len(line['nodes'])}")
            
            # 3. APIを叩いて交差点名を取得 (負荷軽減のため、とりあえず端点のみ取得)
            # ※テスト時は以下のコメントアウトを外してください
            # time.sleep(1) # Nominatim APIの利用規約（1秒に1リクエスト以下）を順守
            # start_name = reverse_geocode(start_coord[0], start_coord[1])
            # time.sleep(1)
            # end_name = reverse_geocode(end_coord[0], end_coord[1])
            
            # デフォルトではAPI負荷を下げるため座標情報を入れる
            start_name = f"Lat:{start_coord[1]:.4f}"
            end_name = f"Lat:{end_coord[1]:.4f}"
            
            line["description"] = f"{name} ({start_name} 〜 {end_name} の区間)"
            final_results.append(line)

    # 保存
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_results, f, ensure_ascii=False, indent=2)
        
    print(f"\n完了！ 処理されたデータを {OUTPUT_FILE} に保存しました。")

if __name__ == "__main__":
    main()
