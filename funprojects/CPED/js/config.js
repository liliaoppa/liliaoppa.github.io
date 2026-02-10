/**
 * CPED Configuration
 * 集中管理所有常量配置
 */

// 级别配置（从低到高）- 8bit像素风格，高对比度颜色
export const LEVEL_CONFIG = {
  '小于副处': { order: 1, color: '#c8e6c9', label: '<副处' },    // 浅绿
  '副处': { order: 2, color: '#81c784', label: '副处' },          // 绿
  '正处': { order: 3, color: '#4fc3f7', label: '正处' },          // 浅蓝
  '副厅': { order: 4, color: '#29b6f6', label: '副厅' },          // 蓝
  '正厅': { order: 5, color: '#fff176', label: '正厅' },          // 黄
  '副部': { order: 6, color: '#ff8a65', label: '副部' },          // 橙
  '正部': { order: 7, color: '#ef5350', label: '正部' },          // 红
  '副国': { order: 8, color: '#ab47bc', label: '副国' },          // 紫
  '正国': { order: 9, color: '#7e57c2', label: '正国' }           // 深紫
};

// 级别名称列表（从低到高）
export const LEVELS = Object.keys(LEVEL_CONFIG);

// 省份坐标映射
export const PROVINCE_COORDS = {
  '北京市': [116.4, 39.9],
  '上海市': [121.4, 31.2],
  '天津市': [117.2, 39.1],
  '重庆市': [106.5, 29.6],
  '河北省': [114.5, 38.0],
  '山西省': [112.5, 37.9],
  '辽宁省': [123.4, 41.8],
  '吉林省': [125.3, 43.9],
  '黑龙江省': [126.6, 45.8],
  '江苏省': [118.8, 32.1],
  '浙江省': [120.2, 30.3],
  '安徽省': [117.3, 31.9],
  '福建省': [119.3, 26.1],
  '江西省': [115.9, 28.7],
  '山东省': [117.0, 36.7],
  '河南省': [113.6, 34.8],
  '湖北省': [114.3, 30.6],
  '湖南省': [113.0, 28.2],
  '广东省': [113.3, 23.1],
  '海南省': [110.3, 20.0],
  '四川省': [104.1, 30.7],
  '贵州省': [106.7, 26.6],
  '云南省': [102.7, 25.0],
  '陕西省': [108.9, 34.3],
  '甘肃省': [103.8, 36.1],
  '青海省': [101.8, 36.6],
  '台湾省': [121.5, 25.0],
  '内蒙古自治区': [111.7, 40.8],
  '广西壮族自治区': [108.3, 22.8],
  '西藏自治区': [91.1, 29.7],
  '宁夏回族自治区': [106.3, 38.5],
  '新疆维吾尔自治区': [87.6, 43.8],
  '香港特别行政区': [114.2, 22.3],
  '澳门特别行政区': [113.5, 22.2],
  '中央': [116.4, 39.9]
};

// 应用配置
export const APP_CONFIG = {
  // 初始列表显示数量
  INITIAL_LIST_SIZE: 50,

  // 搜索结果最大数量
  MAX_SEARCH_RESULTS: 50,

  // 履历显示最大条数
  MAX_CAREER_ITEMS: 20,

  // 矩阵图单元格大小
  MATRIX_CELL_SIZE: 35,

  // 地图配置
  MAP: {
    defaultZoom: 1.2,
    lineColor: '#3498db',
    pointColor: '#3498db',
    emphasisColor: '#bbdefb'
  }
};

// 数据路径配置（相对CPED目录）
export const DATA_PATHS = {
  index: '../../assets/data/cped/index.json',
  careers: '../../assets/data/cped/careers',
  timelines: '../../assets/data/cped/timelines',
  geo: '../../assets/data/cped/geo',
  chinaMap: './data/china.json'
};
