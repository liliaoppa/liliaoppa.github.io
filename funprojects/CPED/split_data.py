#!/usr/bin/env python3
"""
CPED数据分片脚本
将大JSON文件拆分为按需加载的小文件
"""

import json
import os
from pathlib import Path

def split_data():
    """拆分数据文件"""

    # 路径配置
    source_file = '/Users/liliao/Dropbox/liliaoppa.github.io/assets/data/cped/cped_data.json'
    output_dir = Path('/Users/liliao/Dropbox/liliaoppa.github.io/assets/data/cped')

    print(f"读取源数据: {source_file}")
    with open(source_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    officials = data['officials']
    careers = data['careers']
    timelines = data['levelTimelines']
    geo = data['geoMovements']

    print(f"官员总数: {len(officials)}")

    # 创建输出目录
    careers_dir = output_dir / 'careers'
    timelines_dir = output_dir / 'timelines'
    geo_dir = output_dir / 'geo'

    careers_dir.mkdir(exist_ok=True)
    timelines_dir.mkdir(exist_ok=True)
    geo_dir.mkdir(exist_ok=True)

    # 保存索引文件（精简版官员列表）
    index_data = {
        'officials': officials,
        'count': len(officials),
        'generatedAt': data.get('generatedAt', ''),
        'statistics': data.get('statistics', {})
    }

    index_file = output_dir / 'index.json'
    with open(index_file, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, ensure_ascii=False, separators=(',', ':'))

    print(f"保存索引: {index_file} ({os.path.getsize(index_file) / 1024:.1f} KB)")

    # 分片保存每个官员的数据
    success_count = 0
    error_count = 0

    for official in officials:
        oid = str(official['id'])

        try:
            # 保存 career 数据
            if oid in careers:
                with open(careers_dir / f'{oid}.json', 'w', encoding='utf-8') as f:
                    json.dump(careers[oid], f, ensure_ascii=False, separators=(',', ':'))

            # 保存 timeline 数据
            if oid in timelines:
                with open(timelines_dir / f'{oid}.json', 'w', encoding='utf-8') as f:
                    json.dump(timelines[oid], f, ensure_ascii=False, separators=(',', ':'))

            # 保存 geo 数据
            if oid in geo:
                with open(geo_dir / f'{oid}.json', 'w', encoding='utf-8') as f:
                    json.dump(geo[oid], f, ensure_ascii=False, separators=(',', ':'))

            success_count += 1

            if success_count % 500 == 0:
                print(f"  已处理 {success_count}/{len(officials)}...")

        except Exception as e:
            print(f"  错误 ID {oid}: {e}")
            error_count += 1

    print(f"\n完成!")
    print(f"  成功: {success_count}")
    print(f"  失败: {error_count}")

    # 统计文件大小
    total_size = os.path.getsize(index_file)
    file_counts = {'careers': 0, 'timelines': 0, 'geo': 0}

    for dirname, counts_key in [(careers_dir, 'careers'), (timelines_dir, 'timelines'), (geo_dir, 'geo')]:
        for f in os.listdir(dirname):
            if f.endswith('.json'):
                total_size += os.path.getsize(dirname / f)
                file_counts[counts_key] += 1

    print(f"\n文件统计:")
    print(f"  索引: 1 个文件")
    print(f"  careers: {file_counts['careers']} 个文件")
    print(f"  timelines: {file_counts['timelines']} 个文件")
    print(f"  geo: {file_counts['geo']} 个文件")
    print(f"  总计: {sum(file_counts.values()) + 1} 个文件")
    print(f"  总大小: {total_size / 1024 / 1024:.1f} MB")

if __name__ == '__main__':
    split_data()
