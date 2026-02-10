#!/usr/bin/env python3
"""
CPED数据预处理脚本
将Excel数据转换为JSON格式供前端使用
"""

import pandas as pd
import json
from datetime import datetime

def parse_date(date_val):
    """解析日期，返回字符串格式"""
    if pd.isna(date_val):
        return None
    if isinstance(date_val, datetime):
        return date_val.strftime('%Y-%m-%d')
    return str(date_val)

def process_basic_info():
    """处理基本信息表"""
    print("处理基本信息...")
    df = pd.read_excel('Full Data.xlsx', sheet_name='基本信息')

    # 重命名列
    df.columns = ['id', 'name', 'gender', 'ethnicity', 'birth_date', 'native_province',
                  'native_city', 'native_county', 'education', 'party_date', 'status',
                  'military', 'expelled', 'investigation_reason', 'investigation_note',
                  'returned', 'investigation_date', 'investigation_unit', 'prosecuted',
                  'charge', 'amount', 'first_trial_date', 'trial_location1', 'trial_location2',
                  'first_sentence', 'appealed', 'second_trial_date', 'second_sentence']

    officials = []
    for _, row in df.iterrows():
        official = {
            'id': int(row['id']),
            'name': str(row['name']) if not pd.isna(row['name']) else '',
            'gender': str(row['gender']) if not pd.isna(row['gender']) else '',
            'ethnicity': str(row['ethnicity']) if not pd.isna(row['ethnicity']) else '',
            'birthDate': parse_date(row['birth_date']),
            'nativePlace': {
                'province': str(row['native_province']) if not pd.isna(row['native_province']) else '',
                'city': str(row['native_city']) if not pd.isna(row['native_city']) else '',
                'county': str(row['native_county']) if not pd.isna(row['native_county']) else ''
            },
            'education': str(row['education']) if not pd.isna(row['education']) else '',
            'partyDate': parse_date(row['party_date']),
            'status': str(row['status']) if not pd.isna(row['status']) else '',
            'military': str(row['military']) if not pd.isna(row['military']) else '',
            'expelled': str(row['expelled']) if not pd.isna(row['expelled']) else '',
            'investigationReason': str(row['investigation_reason']) if not pd.isna(row['investigation_reason']) else ''
        }
        officials.append(official)

    return officials

def process_career():
    """处理全部经历表"""
    print("处理全部经历...")
    df = pd.read_excel('Full Data.xlsx', sheet_name='全部经历')

    # 重命名列
    df.columns = ['user_id', 'name', 'sequence', 'start_date', 'end_date',
                  'national_org', 'central_dispatch', 'province_code', 'province',
                  'city_code', 'city', 'region_level', 'note1', 'county', 'category',
                  'position_code1', 'position1', 'note2', 'position2', 'position3',
                  'specific_position', 'level', 'flag', 'education', 'seq']

    careers = {}
    for _, row in df.iterrows():
        user_id = int(row['user_id'])

        if user_id not in careers:
            careers[user_id] = []

        career = {
            'sequence': int(row['sequence']) if not pd.isna(row['sequence']) else 0,
            'startDate': parse_date(row['start_date']),
            'endDate': parse_date(row['end_date']),
            'nationalOrg': str(row['national_org']) if not pd.isna(row['national_org']) else '',
            'centralDispatch': str(row['central_dispatch']) if not pd.isna(row['central_dispatch']) else '',
            'province': str(row['province']) if not pd.isna(row['province']) else '',
            'city': str(row['city']) if not pd.isna(row['city']) else '',
            'county': str(row['county']) if not pd.isna(row['county']) else '',
            'regionLevel': str(row['region_level']) if not pd.isna(row['region_level']) else '',
            'category': str(row['category']) if not pd.isna(row['category']) else '',
            'position1': str(row['position1']) if not pd.isna(row['position1']) else '',
            'position2': str(row['position2']) if not pd.isna(row['position2']) else '',
            'position3': str(row['position3']) if not pd.isna(row['position3']) else '',
            'specificPosition': str(row['specific_position']) if not pd.isna(row['specific_position']) else '',
            'level': str(row['level']) if not pd.isna(row['level']) else '',
            'education': str(row['education']) if not pd.isna(row['education']) else ''
        }
        careers[user_id].append(career)

    # 按序号排序
    for user_id in careers:
        careers[user_id].sort(key=lambda x: x['sequence'])

    return careers

def generate_level_timeline(careers):
    """生成级别时间线数据"""
    level_order = {'小于副处': 1, '副处': 2, '正处': 3, '副厅': 4,
                   '正厅': 5, '副部': 6, '正部': 7, '副国': 8, '正国': 9}

    timelines = {}
    for user_id, career_list in careers.items():
        timeline = []
        for c in career_list:
            if c['level'] and c['level'] in level_order:
                timeline.append({
                    'date': c['startDate'],
                    'level': c['level'],
                    'levelOrder': level_order[c['level']],
                    'position': c['specificPosition'] or c['position1'],
                    'province': c['province'],
                    'city': c['city']
                })
        timelines[user_id] = sorted(timeline, key=lambda x: x['date'] or '9999-12-31')
    return timelines

def generate_geo_movement(careers):
    """生成地理变迁数据"""
    movements = {}
    for user_id, career_list in careers.items():
        movement = []
        for c in career_list:
            if c['province']:
                movement.append({
                    'date': c['startDate'],
                    'province': c['province'],
                    'city': c['city'],
                    'county': c['county'],
                    'position': c['specificPosition'] or c['position1'],
                    'level': c['level']
                })
        movements[user_id] = sorted(movement, key=lambda x: x['date'] or '9999-12-31')
    return movements

def generate_statistics(officials, careers):
    """生成统计信息"""
    print("生成统计信息...")

    # 级别统计
    level_stats = {}
    for career_list in careers.values():
        for c in career_list:
            if c['level']:
                level_stats[c['level']] = level_stats.get(c['level'], 0) + 1

    # 地区统计
    province_stats = {}
    for career_list in careers.values():
        for c in career_list:
            if c['province']:
                province_stats[c['province']] = province_stats.get(c['province'], 0) + 1

    # 性别统计
    gender_stats = {}
    for o in officials:
        if o['gender']:
            gender_stats[o['gender']] = gender_stats.get(o['gender'], 0) + 1

    # 学历统计
    edu_stats = {}
    for o in officials:
        if o['education']:
            edu_stats[o['education']] = edu_stats.get(o['education'], 0) + 1

    return {
        'totalOfficials': len(officials),
        'totalCareerRecords': sum(len(c) for c in careers.values()),
        'levelStats': level_stats,
        'provinceStats': province_stats,
        'genderStats': gender_stats,
        'educationStats': edu_stats
    }

def main():
    print("开始处理CPED数据...")

    # 处理数据
    officials = process_basic_info()
    careers = process_career()
    level_timelines = generate_level_timeline(careers)
    geo_movements = generate_geo_movement(careers)
    statistics = generate_statistics(officials, careers)

    # 合并数据
    print("合并数据...")
    data = {
        'officials': officials,
        'careers': careers,
        'levelTimelines': level_timelines,
        'geoMovements': geo_movements,
        'statistics': statistics,
        'generatedAt': datetime.now().isoformat()
    }

    # 保存为JSON
    print("保存数据...")
    with open('data/cped_data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # 保存简化版官员列表（用于快速加载）
    with open('data/officials_list.json', 'w', encoding='utf-8') as f:
        json.dump(officials, f, ensure_ascii=False)

    # 保存统计信息
    with open('data/statistics.json', 'w', encoding='utf-8') as f:
        json.dump(statistics, f, ensure_ascii=False)

    print(f"数据处理完成！")
    print(f"  官员数量: {len(officials)}")
    print(f"  经历记录: {statistics['totalCareerRecords']}")
    print(f"  数据文件: data/cped_data.json")

if __name__ == '__main__':
    import os
    os.makedirs('data', exist_ok=True)
    main()
