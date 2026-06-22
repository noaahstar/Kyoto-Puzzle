import json

TARGET_V = ["堀川通", "醒ヶ井通", "油小路通", "小川通", "西洞院通", "釜座通", "新町通", "室町通", "衣棚通", "烏丸通", "車屋町通", "東洞院通", "間之町通", "高倉通", "堺町通", "柳馬場通", "富小路通", "麩屋町通", "御幸町通", "寺町通", "河原町通"]
TARGET_H = ["丸太町通", "竹屋町通", "夷川通", "二条通", "押小路通", "御池通", "姉小路通", "三条通", "六角通", "蛸薬師通", "錦小路通", "四条通", "綾小路通", "仏光寺通", "高辻通", "松原通", "万寿寺通", "五条通"]

def build():
    with open('processed_streets.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    streets = []
    for line in data:
        name = line["name"]
        is_mostly_oneway = line.get("is_mostly_oneway", False)
        
        coords = line["coords"]
        min_lon = min(c[0] for c in coords)
        max_lon = max(c[0] for c in coords)
        min_lat = min(c[1] for c in coords)
        max_lat = max(c[1] for c in coords)
        
        lon_diff = max_lon - min_lon
        lat_diff = max_lat - min_lat
        
        orientation = "V" if lat_diff > lon_diff else "H"
        mid_lon = (min_lon + max_lon) / 2
        mid_lat = (min_lat + max_lat) / 2
        
        start_coord = coords[0]
        end_coord = coords[-1]
        
        direction = None
        if is_mostly_oneway:
            if orientation == "V":
                direction = "S" if start_coord[1] > end_coord[1] else "N"
            else:
                direction = "E" if start_coord[0] < end_coord[0] else "W"
                
        streets.append({
            "name": name,
            "orientation": orientation,
            "mid_lon": mid_lon,
            "mid_lat": mid_lat,
            "direction": direction
        })
        
    v_out = []
    h_out = []
    
    for tv in TARGET_V:
        matches = [s for s in streets if s["name"] == tv and s["orientation"] == "V"]
        if matches:
            v_out.append(matches[0])
            
    for th in TARGET_H:
        matches = [s for s in streets if s["name"] == th and s["orientation"] == "H"]
        if matches:
            h_out.append(matches[0])
            
    # Sort by actual coordinates
    v_out.sort(key=lambda x: x["mid_lon"])
    h_out.sort(key=lambda x: x["mid_lat"], reverse=True)
    
    res = {"V": v_out, "H": h_out}
    with open('master.json', 'w', encoding='utf-8') as f:
        json.dump(res, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    build()
