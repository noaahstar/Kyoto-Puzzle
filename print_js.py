import json

def build():
    with open('real_master.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    v_out = data["V"]
    h_out = data["H"]
    
    with open('real_master.js', 'w', encoding='utf-8') as f:
        f.write("export const MASTER_VERTICAL_STREETS = [\n")
        for s in v_out:
            d = f'"{s["direction"]}"' if s["direction"] else 'null'
            t = '"major"' if '烏丸' in s["name"] or '堀川' in s["name"] or '河原町' in s["name"] else '"minor"'
            f.write(f'  {{ name: "{s["name"]}", type: {t}, oneWay: {d} }},\n')
        f.write("];\n\n")

        f.write("export const MASTER_HORIZONTAL_STREETS = [\n")
        for s in h_out:
            d = f'"{s["direction"]}"' if s["direction"] else 'null'
            t = '"major"' if '丸太町' in s["name"] or '御池' in s["name"] or '四条' in s["name"] or '五条' in s["name"] else '"minor"'
            f.write(f'  {{ name: "{s["name"]}", type: {t}, oneWay: {d} }},\n')
        f.write("];\n")

if __name__ == '__main__':
    build()
