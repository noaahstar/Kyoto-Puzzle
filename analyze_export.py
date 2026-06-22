import json
from collections import Counter

def analyze():
    with open('export交通規制及び通行可能可否.geojson', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    features = data.get('features', [])
    print(f"Total features: {len(features)}")
    
    prop_keys = Counter()
    restrictions = []
    motor_vehicles = []
    conditionals = []
    
    for f in features:
        props = f.get('properties', {})
        for k in props.keys():
            prop_keys[k] += 1
            
        if 'restriction' in props:
            restrictions.append(props)
        if 'motor_vehicle' in props and props['motor_vehicle'] == 'no':
            motor_vehicles.append(props)
        if 'motor_vehicle:conditional' in props or 'access:conditional' in props:
            conditionals.append(props)
            
    print("\nMost common property keys:")
    for k, v in prop_keys.most_common(20):
        print(f"  {k}: {v}")
        
    print(f"\nRestrictions found: {len(restrictions)}")
    if restrictions:
        print("Sample:", json.dumps(restrictions[0], ensure_ascii=False))
        
    print(f"\nMotor Vehicle Prohibition found: {len(motor_vehicles)}")
    if motor_vehicles:
        print("Sample:", json.dumps(motor_vehicles[0], ensure_ascii=False))
        
    print(f"\nConditionals found: {len(conditionals)}")
    if conditionals:
        print("Sample:", json.dumps(conditionals[0], ensure_ascii=False))

if __name__ == '__main__':
    analyze()
