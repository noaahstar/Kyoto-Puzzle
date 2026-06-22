import json

def analyze():
    with open('processed_streets.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    streets = []
    for line in data:
        name = line["name"]
        is_mostly_oneway = line.get("is_mostly_oneway", False)
        # get dominant oneway direction or segment info
        # Let's just find the average lon/lat to determine if it's N-S or E-W
        coords = line["coords"]
        min_lon = min(c[0] for c in coords)
        max_lon = max(c[0] for c in coords)
        min_lat = min(c[1] for c in coords)
        max_lat = max(c[1] for c in coords)
        
        lon_diff = max_lon - min_lon
        lat_diff = max_lat - min_lat
        
        # 縦か横か判定
        orientation = "V" if lat_diff > lon_diff else "H"
        
        # 代表座標 (中間点)
        mid_lon = (min_lon + max_lon) / 2
        mid_lat = (min_lat + max_lat) / 2
        
        # 一方通行の方向 (coordsは通常、始点から終点への配列)
        start_coord = coords[0]
        end_coord = coords[-1]
        
        direction = "2-way"
        if is_mostly_oneway:
            if orientation == "V":
                if start_coord[1] > end_coord[1]:
                    direction = "S" # 北から南へ
                else:
                    direction = "N"
            else:
                if start_coord[0] < end_coord[0]:
                    direction = "E" # 西から東へ
                else:
                    direction = "W"
                    
        streets.append({
            "name": name,
            "orientation": orientation,
            "mid_lon": mid_lon,
            "mid_lat": mid_lat,
            "direction": direction,
            "oneway_segments": line.get("oneway_segments", [])
        })
        
    # Sort vertical by lon (West to East)
    v_streets = sorted([s for s in streets if s["orientation"] == "V"], key=lambda x: x["mid_lon"])
    # Sort horizontal by lat (North to South) -> descending lat
    h_streets = sorted([s for s in streets if s["orientation"] == "H"], key=lambda x: x["mid_lat"], reverse=True)
    
    with open('extracted_streets.txt', 'w', encoding='utf-8') as f:
        f.write("=== Vertical Streets (West to East) ===\n")
        for s in v_streets:
            f.write(f"{s['name']}: {s['direction']} (Lon: {s['mid_lon']:.5f})\n")
            
        f.write("\n=== Horizontal Streets (North to South) ===\n")
        for s in h_streets:
            f.write(f"{s['name']}: {s['direction']} (Lat: {s['mid_lat']:.5f})\n")

if __name__ == '__main__':
    analyze()
