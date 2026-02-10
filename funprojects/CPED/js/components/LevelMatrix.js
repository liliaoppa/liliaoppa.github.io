/**
 * Level Timeline Component
 * 级别晋升时间线（使用 ECharts 阶梯图）
 */

import { BaseComponent } from './BaseComponent.js';
import { LEVEL_CONFIG, LEVELS } from '../config.js';

// 备用配置（防止导入失败）- 8bit像素风格，高对比度颜色
const FALLBACK_LEVEL_CONFIG = {
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

export class LevelMatrix extends BaseComponent {
  constructor(containerId) {
    super(containerId);

    this.state = {
      official: null,
      timelineData: [],
      chart: null
    };
  }

  /**
   * 设置数据并渲染
   */
  setData(official, timelineData) {
    this.setState({
      official,
      timelineData: timelineData || []
    });
  }

  /**
   * 渲染图表
   */
  render() {
    const { official, timelineData } = this.state;
    console.log('[LevelMatrix] render called:', { official: official?.name, timelineDataLength: timelineData?.length });

    if (!official) {
      console.log('[LevelMatrix] No official, showing empty');
      this.showEmpty('请选择官员查看级别晋升图', 'fa-sitemap');
      return;
    }

    const chartData = this.processData(timelineData);
    console.log('[LevelMatrix] chartData result:', chartData.length, 'items');

    if (chartData.length === 0) {
      console.log('[LevelMatrix] Empty chartData, showing "无级别数据"');
      this.showEmpty('无级别数据', 'fa-sitemap');
      return;
    }

    this.drawChart(chartData, official.name);
  }

  /**
   * 处理时间线数据
   */
  processData(timelineData) {
    // 使用导入的配置或备用配置
    const config = LEVEL_CONFIG || FALLBACK_LEVEL_CONFIG;
    console.log('[LevelMatrix] Using config:', config === FALLBACK_LEVEL_CONFIG ? 'FALLBACK' : 'IMPORTED');
    console.log('[LevelMatrix] timelineData input:', timelineData?.length, 'items');

    if (!timelineData || !Array.isArray(timelineData) || timelineData.length === 0) {
      console.log('[LevelMatrix] Empty timelineData, returning []');
      return [];
    }

    // 按时间排序的数据点
    const dataPoints = [];

    timelineData.forEach((item, index) => {
      const level = item.level;
      const levelConfig = config[level];

      if (!levelConfig) {
        console.warn(`[LevelMatrix] Unknown level "${level}" at index ${index}`);
      }

      dataPoints.push({
        date: item.date,
        levelOrder: levelConfig?.order || item.levelOrder || 1,
        level: level,
        position: item.position,
        province: item.province
      });
    });

    // 按日期排序
    dataPoints.sort((a, b) => new Date(a.date) - new Date(b.date));

    console.log('[LevelMatrix] Processed dataPoints:', dataPoints.length, 'items');
    console.log('[LevelMatrix] First item:', dataPoints[0]);
    console.log('[LevelMatrix] Last item:', dataPoints[dataPoints.length - 1]);

    return dataPoints;
  }

  /**
   * 绘制 ECharts 阶梯图
   */
  drawChart(chartData, officialName) {
    console.log('[LevelMatrix] drawChart called with', chartData.length, 'items for', officialName);

    // 清理旧图表
    if (this.state.chart) {
      this.state.chart.dispose();
    }

    this.container.innerHTML = '';
    this.container.style.height = '350px';

    // 初始化图表
    const chart = echarts.init(this.container);
    this.state.chart = chart;

    // 准备数据 - 使用 category 类型更可靠
    const dates = chartData.map(d => d.date);
    const minYear = new Date(dates[0]).getFullYear();
    const maxYear = new Date(dates[dates.length - 1]).getFullYear();

    console.log('[LevelMatrix] Year range:', minYear, '-', maxYear);

    const option = {
      backgroundColor: '#fff',
      title: {
        text: `${officialName} - 级别晋升历程`,
        left: 'center',
        top: 10,
        textStyle: {
          fontFamily: 'retro, monospace',
          fontSize: 14,
          color: '#333',
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#222',
        borderColor: '#000',
        borderWidth: 4,
        textStyle: {
          color: '#fff',
          fontSize: 13,
          fontFamily: 'monospace'
        },
        formatter: (params) => {
          const data = chartData[params[0].dataIndex];
          const config = LEVEL_CONFIG || FALLBACK_LEVEL_CONFIG;
          const levelColor = config[data.level]?.color || '#999';
          return `
            <div style="padding: 10px;">
              <div style="font-weight: bold; margin-bottom: 6px; font-size: 14px; color: #fff;">${data.date}</div>
              <div style="background: ${levelColor}; color: #000; display: inline-block; padding: 4px 12px; font-weight: bold; font-size: 13px; border: 2px solid #fff; margin-bottom: 6px;">${data.level}</div>
              <div style="font-size: 12px; margin-top: 6px; color: #ddd;">${data.position || ''}</div>
              <div style="font-size: 11px; color: #999;">${data.province || ''}</div>
            </div>
          `;
        }
      },
      grid: {
        left: 80,
        right: 40,
        top: 60,
        bottom: 50,
        backgroundColor: '#fff'
      },
      xAxis: {
        type: 'category',
        name: '时间',
        data: dates,
        nameTextStyle: {
          fontFamily: 'retro1, monospace',
          fontSize: 11,
          color: '#333',
          fontWeight: 'bold'
        },
        axisLabel: {
          fontFamily: 'retro1, monospace',
          fontSize: 10,
          color: '#333',
          rotate: 45,
          interval: Math.floor(dates.length / 6)
        },
        axisLine: {
          lineStyle: {
            color: '#000',
            width: 3
          }
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#ddd',
            width: 1
          }
        }
      },
      yAxis: {
        type: 'value',
        name: '级别',
        min: 0.5,
        max: 9.5,
        interval: 1,
        nameTextStyle: {
          fontFamily: 'retro1, monospace',
          fontSize: 11,
          color: '#333',
          fontWeight: 'bold'
        },
        axisLabel: {
          fontFamily: 'retro1, monospace',
          fontSize: 10,
          color: '#333',
          fontWeight: 'bold',
          formatter: (value) => {
            const config = LEVEL_CONFIG || FALLBACK_LEVEL_CONFIG;
            const levels = LEVELS || Object.keys(config);
            const level = levels[value - 1];
            return level ? config[level]?.label || level : '';
          }
        },
        axisLine: {
          lineStyle: {
            color: '#000',
            width: 3
          }
        },
        splitLine: {
          lineStyle: {
            color: '#ddd',
            width: 1
          }
        }
      },
      // 创建级别背景色带 - 马赛克风格
      markArea: {
        silent: true,
        itemStyle: {
          opacity: 0.15
        },
        data: (() => {
          const config = LEVEL_CONFIG || FALLBACK_LEVEL_CONFIG;
          const levels = Object.keys(config);
          return levels.map((level, idx) => [{
            yAxis: idx + 0.5,
            itemStyle: { color: config[level].color }
          }, {
            yAxis: idx + 1.5
          }]);
        })()
      },
      series: [{
        name: '级别',
        type: 'line',
        step: 'middle',
        symbol: 'rect',
        symbolSize: [20, 16],
        lineStyle: {
          color: '#333',
          width: 3,
          type: 'solid'
        },
        itemStyle: {
          color: (params) => {
            const config = LEVEL_CONFIG || FALLBACK_LEVEL_CONFIG;
            return config[chartData[params.dataIndex].level]?.color || '#999';
          },
          borderColor: '#000',
          borderWidth: 3
        },
        emphasis: {
          itemStyle: {
            borderWidth: 4,
            shadowBlur: 0
          }
        },
        data: chartData.map(d => {
          const config = LEVEL_CONFIG || FALLBACK_LEVEL_CONFIG;
          return {
            value: d.levelOrder,
            itemStyle: {
              color: config[d.level]?.color || '#999',
              borderColor: '#000',
              borderWidth: 3
            }
          };
        })
      }]
    };

    chart.setOption(option);

    // 响应式
    this.resizeHandler = () => chart.resize();
    window.addEventListener('resize', this.resizeHandler);
  }

  /**
   * 销毁组件
   */
  destroy() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }

    if (this.state.chart) {
      this.state.chart.dispose();
      this.state.chart = null;
    }

    super.destroy();
  }
}
