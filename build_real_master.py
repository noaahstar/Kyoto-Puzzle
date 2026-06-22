import json

def build():
    with open('processed_streets.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    streets = []
    seen = set()
    for line in data:
        name = line["name"]
        
        if name in seen:
            continue
            
        # Filter garbage
        if "路地" in name or "橋" in name or "通路" in name or "広場" in name or "ライフ" in name or "ホテル" in name or "地下" in name:
            continue
        if not (name.endswith("通") or name.endswith("通り") or name.endswith("道") or name.endswith("小路") or name.endswith("図子") or name.endswith("辻子")):
            continue
            
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
        
        # Bounds check
        if not (135.751 < mid_lon < 135.768):
            continue
        if not (34.994 < mid_lat < 35.020):
            continue
            
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
        seen.add(name)
        
    v_out = [s for s in streets if s["orientation"] == "V"]
    h_out = [s for s in streets if s["orientation"] == "H"]
    
    # Sort
    v_out.sort(key=lambda x: x["mid_lon"])
    h_out.sort(key=lambda x: x["mid_lat"], reverse=True)
    
    res = {"V": v_out, "H": h_out}
    with open('real_master.json', 'w', encoding='utf-8') as f:
        json.dump(res, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    build()
