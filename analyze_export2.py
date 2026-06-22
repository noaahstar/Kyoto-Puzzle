import json

def analyze():
    with open('export交通規制及び通行可能可否.geojson', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    features = data.get('features', [])
    
    res = []
    
    for f in features:
        props = f.get('properties', {})
        if '@relations' in props:
            # relation example
            res.append({"type": "relation_example", "props": props})
            break
            
    for f in features:
        props = f.get('properties', {})
        if 'motor_vehicle' in props and props['motor_vehicle'] == 'no':
            res.append({"type": "motor_vehicle=no", "props": props})
            break
            
    for f in features:
        props = f.get('properties', {})
        if 'motor_vehicle:conditional' in props:
            res.append({"type": "motor_vehicle:conditional", "props": props})
            break
            
    with open('export_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(res, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    analyze()
