import json

def analyze():
    with open('export交通規制及び通行可能可否.geojson', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    features = data.get('features', [])
    rel_id = 16454726
    
    parts = []
    
    for f in features:
        props = f.get('properties', {})
        geom = f.get('geometry', {})
        relations = props.get('@relations', [])
        for r in relations:
            if r.get('rel') == rel_id:
                parts.append({
                    "id": props.get('@id'),
                    "role": r.get('role'),
                    "geom_type": geom.get('type'),
                    "coords": geom.get('coordinates')
                })
                
    with open('rel_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(parts, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    analyze()
