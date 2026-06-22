import json
from collections import defaultdict

def integrate():
    # 1. 規制データの読み込み
    with open('export交通規制及び通行可能可否.geojson', 'r', encoding='utf-8') as f:
        export_data = json.load(f)
        
    features = export_data.get('features', [])
    
    no_edges = set()
    cond_edges = {}
    relations_map = defaultdict(lambda: {"from_edges": set(), "via_coord": None, "restriction": None})
    
    def get_edges(coords):
        edges = set()
        for i in range(len(coords) - 1):
            p1 = (coords[i][0], coords[i][1])
            p2 = (coords[i+1][0], coords[i+1][1])
            edges.add((p1, p2))
            edges.add((p2, p1)) # 双方向で登録
        return edges

    for f in features:
        props = f.get('properties', {})
        geom = f.get('geometry', {})
        if not geom: continue
        
        geom_type = geom.get('type')
        coords = geom.get('coordinates', [])
        
        # 車両通行禁止
        if props.get('motor_vehicle') == 'no':
            if geom_type in ['LineString', 'Polygon']:
                # Polygonの場合は最初のリストを展開
                pts = coords[0] if geom_type == 'Polygon' else coords
                no_edges.update(get_edges(pts))
                
        # 時間帯限定
        cond = props.get('motor_vehicle:conditional') or props.get('access:conditional')
        if cond and geom_type == 'LineString':
            for edge in get_edges(coords):
                cond_edges[edge] = cond
                
        # 右左折規制 (Relation)
        for r in props.get('@relations', []):
            rel_id = r.get('rel')
            role = r.get('role')
            reltags = r.get('reltags', {})
            
            if 'restriction' in reltags:
                relations_map[rel_id]["restriction"] = reltags['restriction']
                
            if role == 'from' and geom_type == 'LineString':
                relations_map[rel_id]["from_edges"].update(get_edges(coords))
            elif role == 'via' and geom_type == 'Point':
                relations_map[rel_id]["via_coord"] = (coords[0], coords[1])
                
    # 2. processed_streets.json の読み込みとマージ
    with open('processed_streets.json', 'r', encoding='utf-8') as f:
        streets = json.load(f)
        
    for street in streets:
        street_coords = street.get("coords", [])
        
        motor_vehicle_segments = []
        conditional_segments = []
        
        # エッジ単位でのマッチング
        for i in range(len(street_coords) - 1):
            p1 = (street_coords[i][0], street_coords[i][1])
            p2 = (street_coords[i+1][0], street_coords[i+1][1])
            edge = (p1, p2)
            
            if edge in no_edges:
                motor_vehicle_segments.append("no")
            else:
                motor_vehicle_segments.append("yes")
                
            cond = cond_edges.get(edge)
            conditional_segments.append(cond if cond else None)
            
        street["motor_vehicle_segments"] = motor_vehicle_segments
        street["conditional_segments"] = conditional_segments
        
        # 右左折規制のマッチング
        turn_restrictions = []
        street_points = set((c[0], c[1]) for c in street_coords)
        street_edges = get_edges(street_coords)
        
        for rel_id, rel_data in relations_map.items():
            via = rel_data["via_coord"]
            res = rel_data["restriction"]
            from_edges = rel_data["from_edges"]
            
            if not via or not res or not from_edges:
                continue
                
            # この道が交差点(via)を含んでおり、かつ entering(from) エッジを共有しているか
            if via in street_points and street_edges.intersection(from_edges):
                turn_restrictions.append({
                    "via": via,
                    "restriction": res
                })
                
        street["turn_restrictions"] = turn_restrictions
        
    # 3. 書き出し
    with open('processed_streets_with_rules.json', 'w', encoding='utf-8') as f:
        json.dump(streets, f, ensure_ascii=False, indent=2)
        
    print(f"Integration complete. Total streets processed: {len(streets)}")
    
    # 統計情報の出力
    total_no = sum(1 for s in streets if "no" in s["motor_vehicle_segments"])
    total_cond = sum(1 for s in streets if any(s["conditional_segments"]))
    total_turns = sum(len(s["turn_restrictions"]) for s in streets)
    
    print(f"Streets with motor_vehicle=no: {total_no}")
    print(f"Streets with conditionals: {total_cond}")
    print(f"Total turn restrictions attached: {total_turns}")

if __name__ == '__main__':
    integrate()
