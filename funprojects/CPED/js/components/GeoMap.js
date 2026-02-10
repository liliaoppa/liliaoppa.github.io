/**
 * Geo Map Component
 * 地理迁徙地图（使用ECharts）- 城市级别改进版
 */

import { BaseComponent } from './BaseComponent.js';
import { PROVINCE_COORDS, APP_CONFIG } from '../config.js';

export class GeoMap extends BaseComponent {
  constructor(containerId) {
    super(containerId);

    this.state = {
      official: null,
      geoData: [],
      careers: []  // 存储完整履历用于悬停显示
    };

    this.chart = null;
    this.mapLoaded = false;
  }

  /**
   * 设置数据
   * @param {Object} official - 官员信息
   * @param {Array} geoData - 地理迁徙数据
   * @param {Array} careers - 完整履历数据
   */
  setData(official, geoData, careers) {
    this.setState({
      official,
      geoData: geoData || [],
      careers: careers || []
    });
  }

  /**
   * 初始化并渲染地图
   */
  async render() {
    const { official, geoData } = this.state;

    if (!official) {
      this.showEmpty('请选择官员查看地理迁徙', 'fa-map-marker');
      return;
    }

    if (!geoData || geoData.length === 0) {
      this.showEmpty('无地理数据', 'fa-map-marker');
      return;
    }

    // 加载地图数据
    if (!this.mapLoaded) {
      const loaded = await this.loadChinaMap();
      if (!loaded) {
        this.showError('地图数据加载失败');
        return;
      }
    }

    this.drawMap(geoData, official.name);
  }

  /**
   * 加载中国地图数据
   * @private
   */
  async loadChinaMap() {
    try {
      const baseUrl = new URL(window.location.href);
      const basePath = baseUrl.pathname.replace(/\/[^\/]*$/, '');
      const mapUrl = `${baseUrl.origin}${basePath}/data/china.json`;

      const response = await fetch(mapUrl);
      if (!response.ok) {
        throw new Error('Map not found');
      }

      const chinaJson = await response.json();
      echarts.registerMap('china', chinaJson);
      this.mapLoaded = true;
      return true;
    } catch (error) {
      console.error('地图加载失败:', error);
      return false;
    }
  }

  /**
   * 获取城市坐标（使用省份坐标作为基础，添加小偏移）
   * @private
   */
  getCityCoord(province, city, index, total) {
    const baseCoord = PROVINCE_COORDS[province];
    if (!baseCoord) return null;

    // 同一省份内多个城市时，添加小偏移
    if (total > 1) {
      const angle = (index / total) * 2 * Math.PI;
      const radius = 0.5; // 偏移半径（度）
      return [
        baseCoord[0] + Math.cos(angle) * radius,
        baseCoord[1] + Math.sin(angle) * radius
      ];
    }

    return baseCoord;
  }

  /**
   * 绘制地图 - 城市级别改进版
   * @private
   */
  drawMap(geoData, officialName) {
    // 清理旧图表
    if (this.chart) {
      this.chart.dispose();
    }

    // 按省份-城市分组，统计每个地点的经历
    const locationMap = new Map();

    geoData.forEach((item, index) => {
      const key = `${item.province}-${item.city || '未知'}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, {
          province: item.province,
          city: item.city || item.province,
          experiences: [],
          earliestDate: item.date,
          latestDate: item.date
        });
      }
      const loc = locationMap.get(key);
      loc.experiences.push({
        date: item.date,
        position: item.position,
        level: item.level,
        sequence: index + 1
      });
      // 更新最早/最晚日期
      if (item.date < loc.earliestDate) loc.earliestDate = item.date;
      if (item.date > loc.latestDate) loc.latestDate = item.date;
    });

    // 转换为散点数据
    const scatterData = [];
    let index = 0;
    locationMap.forEach((loc, key) => {
      const coord = this.getCityCoord(loc.province, loc.city, index, locationMap.size);
      if (coord) {
        scatterData.push({
          name: loc.city,
          value: [...coord, loc.experiences.length],
          province: loc.province,
          experiences: loc.experiences,
          earliestDate: loc.earliestDate,
          latestDate: loc.latestDate
        });
      }
      index++;
    });

    // 按时间排序构建迁徙线
    const moveData = [];
    const sortedLocs = Array.from(locationMap.values()).sort((a, b) =>
      new Date(a.earliestDate) - new Date(b.earliestDate)
    );

    for (let i = 0; i < sortedLocs.length - 1; i++) {
      const from = sortedLocs[i];
      const to = sortedLocs[i + 1];
      const fromCoord = this.getCityCoord(from.province, from.city, i, sortedLocs.length);
      const toCoord = this.getCityCoord(to.province, to.city, i + 1, sortedLocs.length);

      if (fromCoord && toCoord) {
        moveData.push({
          fromName: from.city,
          toName: to.city,
          coords: [fromCoord, toCoord],
          fromDate: from.earliestDate,
          toDate: to.earliestDate
        });
      }
    }

    // 初始化图表
    this.chart = echarts.init(this.container);

    const option = {
      backgroundColor: '#e8e8e8',
      title: {
        text: `${officialName} - 工作地变迁（城市级别）`,
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 14,
          fontWeight: 600,
          color: '#333'
        }
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'transparent',
        borderWidth: 0,
        padding: 0,
        formatter: (params) => {
          if (params.seriesType === 'lines') {
            return `
              <div style="background: #333; padding: 8px 12px; border: 3px solid #000; max-width: 200px; font-family: monospace;">
                <div style="font-weight: bold; color: #fff; margin-bottom: 4px; font-size: 12px;">${params.data.fromName} → ${params.data.toName}</div>
                <div style="font-size: 11px; color: #aaa;">${params.data.fromDate} 至 ${params.data.toDate}</div>
              </div>
            `;
          }
          if (params.seriesType === 'scatter' || params.seriesType === 'effectScatter') {
            const data = params.data;
            const expList = data.experiences.map(e =>
              `<div style="margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #555;">
                <div style="font-size: 11px; color: #3498db; font-weight: bold;">${e.date}</div>
                <div style="font-size: 12px; color: #fff;">${e.position}</div>
                <div style="font-size: 10px; color: #aaa;">${e.level}</div>
              </div>`
            ).join('');

            return `
              <div style="background: #333; padding: 10px 14px; border: 3px solid #000; max-width: 280px; max-height: 300px; overflow-y: auto; font-family: monospace;">
                <div style="font-weight: bold; color: #fff; font-size: 13px; margin-bottom: 6px; border-bottom: 2px solid #555; padding-bottom: 6px;">
                  ${data.name} (${data.province})
                </div>
                <div style="font-size: 11px; color: #aaa; margin-bottom: 8px;">
                  ${data.earliestDate} ~ ${data.latestDate}
                </div>
                <div style="margin-top: 6px;">
                  ${expList}
                </div>
              </div>
            `;
          }
          return params.name;
        }
      },
      geo: {
        map: 'china',
        roam: true,
        zoom: 1.2,
        label: {
          show: true,
          fontSize: 10,
          color: '#333',
          fontFamily: 'monospace',
          fontWeight: 'bold'
        },
        itemStyle: {
          areaColor: '#f5f5f5',
          borderColor: '#000',
          borderWidth: 2,
          borderType: 'solid'
        },
        emphasis: {
          itemStyle: {
            areaColor: '#ddd',
            borderColor: '#000',
            borderWidth: 3
          },
          label: {
            color: '#000'
          }
        }
      },
      series: [
        {
          name: '迁徙线',
          type: 'lines',
          zlevel: 1,
          effect: {
            show: true,
            period: 4,
            trailLength: 0.5,
            color: '#3498db',
            symbolSize: 4
          },
          lineStyle: {
            color: '#3498db',
            width: 3,
            curveness: 0.2,
            opacity: 0.8
          },
          data: moveData
        },
        {
          name: '工作地点',
          type: 'scatter',
          coordinateSystem: 'geo',
          zlevel: 2,
          symbol: 'rect',
          symbolSize: 14,
          label: {
            show: true,
            position: 'top',
            formatter: '{b}',
            fontSize: 11,
            color: '#333',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            backgroundColor: '#fff',
            padding: [4, 8],
            borderColor: '#000',
            borderWidth: 2
          },
          itemStyle: {
            color: '#e74c3c',
            borderColor: '#000',
            borderWidth: 2
          },
          emphasis: {
            scale: 1.3,
            itemStyle: {
              color: '#c0392b',
              borderColor: '#000',
              borderWidth: 3
            }
          },
          data: scatterData
        }
      ]
    };

    this.chart.setOption(option);

    // 响应式处理
    this.resizeHandler = () => {
      if (this.chart) {
        this.chart.resize();
      }
    };

    window.addEventListener('resize', this.resizeHandler);
  }

  /**
   * 销毁组件
   */
  destroy() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }

    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }

    super.destroy();
  }
}
