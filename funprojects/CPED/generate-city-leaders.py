#!/usr/bin/env python3
"""
生成城市-领导 JSON 数据
遍历所有官员的 career 数据，提取每个城市的市长和市委书记
"""

import json
import os
from collections import defaultdict

def load_index():
    """加载官员索引，获取 ID 到姓名的映射"""
    with open('../../assets/data/cped/index.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    return {o['id']: o['name'] for o in data['officials']}

def is_mayor(position, category):
    """判断是否为市长职位"""
    if not position:
        return False
    return (position == '市长' or
            position == '代市长' or
            '市委副书记、市长' in position or
            '市委副书记,市长' in position)

def is_secretary(position, category):
    """判断是否为市委书记职位"""
    if not position:
        return False
    # 必须是党委类别
    if category != '党委':
        return False
    # 不能是副书记或其他包含'副'的职位
    if '副' in position:
        return False
    # 只保留真正的市委书记（不是政法委书记、党工委书记等）
    return position == '书记' or position == '市委书记'

def main():
    print("正在加载官员索引...")
    id_to_name = load_index()
    print(f"加载了 {len(id_to_name)} 位官员")

    # 数据结构: {province-city: {mayors: [], secretaries: []}}
    cities = defaultdict(lambda: {'mayors': [], 'secretaries': []})

    careers_dir = '../../assets/data/cped/careers'
    files = [f for f in os.listdir(careers_dir) if f.endswith('.json')]
    total = len(files)

    print(f"\n正在处理 {total} 个官员的履历数据...")

    for i, filename in enumerate(files, 1):
        try:
            official_id = int(filename.replace('.json', ''))
            name = id_to_name.get(official_id, '未知')

            filepath = os.path.join(careers_dir, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                careers = json.load(f)

            for career in careers:
                city = career.get('city', '')
                province = career.get('province', '')
                position = career.get('specificPosition', '')
                category = career.get('category', '')

                # 跳过无效数据
                if not city or city == '不详' or not province:
                    continue

                key = f"{province}-{city}"

                leader_info = {
                    'id': official_id,
                    'name': name,
                    'position': position,
                    'level': career.get('level', ''),
                    'startDate': career.get('startDate', ''),
                    'endDate': career.get('endDate', '')
                }

                if is_mayor(position, category):
                    cities[key]['mayors'].append(leader_info)
                elif is_secretary(position, category):
                    cities[key]['secretaries'].append(leader_info)

            if i % 500 == 0:
                print(f"  已处理 {i}/{total} ({i*100//total}%)")

        except Exception as e:
            print(f"  处理 {filename} 时出错: {e}")

    print(f"\n找到 {len(cities)} 个城市")

    # 整理数据并去重
    result = []
    for key, data in cities.items():
        province, city = key.split('-', 1)

        # 去重函数：基于 id + position
        def dedup(leaders):
            seen = set()
            unique = []
            for l in leaders:
                k = f"{l['id']}-{l['position']}"
                if k not in seen:
                    seen.add(k)
                    unique.append(l)
            return unique

        mayors = dedup(data['mayors'])
        secretaries = dedup(data['secretaries'])

        # 按时间排序
        mayors.sort(key=lambda x: x['startDate'] or '')
        secretaries.sort(key=lambda x: x['startDate'] or '')

        if mayors or secretaries:
            result.append({
                'province': province,
                'city': city,
                'mayors': mayors,
                'secretaries': secretaries,
                'stats': {
                    'mayorCount': len(mayors),
                    'secretaryCount': len(secretaries)
                }
            })

    # 按城市名称排序
    result.sort(key=lambda x: (x['province'], x['city']))

    # 保存到文件
    output_file = 'data/city-leaders.json'
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'generatedAt': str(pd.Timestamp.now()) if 'pd' in dir() else None,
            'totalCities': len(result),
            'cities': result
        }, f, ensure_ascii=False, indent=2)

    print(f"\n数据已保存到: {output_file}")
    print(f"共 {len(result)} 个城市，包含市长和市委书记数据")

    # 显示一些样本
    print("\n样本数据:")
    for city_data in result[:3]:
        print(f"  {city_data['province']} - {city_data['city']}:")
        print(f"    市长: {city_data['stats']['mayorCount']} 位")
        print(f"    书记: {city_data['stats']['secretaryCount']} 位")

if __name__ == '__main__':
    main()
