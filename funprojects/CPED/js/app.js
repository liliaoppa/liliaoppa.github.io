/**
 * CPED Application Controller
 * 应用主控制器，协调各组件
 */

import { dataLoader } from './services/dataLoader.js';
import { Sidebar } from './components/Sidebar.js';
import { ProfileCard } from './components/ProfileCard.js';
import { LevelMatrix } from './components/LevelMatrix.js';
import { GeoMap } from './components/GeoMap.js';
import { Timeline } from './components/Timeline.js';
import { showLoading, showError } from './utils/helpers.js';

class App {
  constructor() {
    // 初始化侧边栏（固定容器）
    this.sidebar = new Sidebar('officials-list');

    // 其他组件延迟初始化（动态创建容器）
    this.profileCard = null;
    this.levelMatrix = null;
    this.geoMap = null;
    this.timeline = null;

    // 当前选中的官员
    this.currentOfficial = null;
    this.currentOfficialData = null;
  }

  /**
   * 启动应用
   */
  async init() {
    try {
      // 设置侧边栏选择回调
      this.sidebar.onSelect = (id) => this.loadOfficial(id);

      // 初始化侧边栏
      await this.sidebar.init();

      // 如果有URL参数，加载指定官员
      const urlParams = new URLSearchParams(window.location.search);
      const officialId = urlParams.get('id');
      if (officialId) {
        const id = parseInt(officialId);
        if (!isNaN(id)) {
          this.sidebar.setSelectedId(id);
          await this.loadOfficial(id);
        }
      }

      console.log('CPED应用初始化完成');
    } catch (error) {
      console.error('应用初始化失败:', error);
      this.showGlobalError('应用初始化失败: ' + error.message);
    }
  }

  /**
   * 加载官员数据
   * @param {number} id - 官员ID
   */
  async loadOfficial(id) {
    // 更新URL（不刷新页面）
    const url = new URL(window.location);
    url.searchParams.set('id', id);
    window.history.pushState({ id }, '', url);

    // 显示主内容区加载状态
    this.showMainLoading();

    try {
      // 获取官员基本信息
      const official = await dataLoader.getOfficialById(id);
      if (!official) {
        throw new Error('未找到该官员');
      }

      this.currentOfficial = official;

      // 并行加载详细数据
      const [careers, timeline, geo] = await Promise.all([
        this.loadDataWithTimeout('careers', id),
        this.loadDataWithTimeout('timeline', id),
        this.loadDataWithTimeout('geo', id)
      ]);

      console.log('[App] Loaded data:', {
        careers: careers?.length,
        timeline: timeline?.length,
        geo: geo?.length,
        timelineSample: timeline?.[0]
      });

      this.currentOfficialData = { careers, timeline, geo };

      // 渲染各组件
      this.renderOfficial();

    } catch (error) {
      console.error('加载官员数据失败:', error);
      this.showMainError(error.message, () => this.loadOfficial(id));
    }
  }

  /**
   * 带超时的数据加载
   * @private
   */
  async loadDataWithTimeout(type, id) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

    try {
      const data = await dataLoader.loadOfficialData(id);
      clearTimeout(timeoutId);
      return data[type] || [];
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn(`加载${type}数据失败:`, error);
      return [];
    }
  }

  /**
   * 渲染官员详情
   * @private
   */
  renderOfficial() {
    const { currentOfficial, currentOfficialData } = this;

    if (!currentOfficial || !currentOfficialData) {
      return;
    }

    const { careers, timeline, geo } = currentOfficialData;

    // 更新主内容区结构
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
      <div class="content-grid">
        <!-- 基本信息卡片 -->
        <section class="content-section">
          <div class="section-header">
            <h3><i class="fa fa-user"></i> 基本信息</h3>
          </div>
          <div id="profile-container"></div>
        </section>

        <!-- 级别晋升矩阵 -->
        <section class="content-section wide">
          <div class="section-header">
            <h3><i class="fa fa-sitemap"></i> 级别晋升时间线</h3>
            <div class="legend-inline">
              <span class="legend-item"><span class="legend-color" style="background:#c8e6c9"></span> &lt;副处</span>
              <span class="legend-item"><span class="legend-color" style="background:#81c784"></span> 副处</span>
              <span class="legend-item"><span class="legend-color" style="background:#4fc3f7"></span> 正处</span>
              <span class="legend-item"><span class="legend-color" style="background:#29b6f6"></span> 副厅</span>
              <span class="legend-item"><span class="legend-color" style="background:#fff176"></span> 正厅</span>
              <span class="legend-item"><span class="legend-color" style="background:#ff8a65"></span> 副部</span>
              <span class="legend-item"><span class="legend-color" style="background:#ef5350"></span> 正部</span>
              <span class="legend-item"><span class="legend-color" style="background:#ab47bc"></span> 副国</span>
              <span class="legend-item"><span class="legend-color" style="background:#7e57c2"></span> 正国</span>
            </div>
          </div>
          <div id="level-matrix-container"></div>
          <p class="matrix-hint">
            <i class="fa fa-info-circle"></i>
            横轴为年份，纵轴为级别。颜色表示该年份已达到的最高级别（包含该级别及以下）。
          </p>
        </section>

        <!-- 地理迁徙 -->
        <section class="content-section">
          <div class="section-header">
            <h3><i class="fa fa-map-marker"></i> 地理迁徙</h3>
          </div>
          <div id="geo-map-container" class="map-wrapper"></div>
        </section>

        <!-- 详细履历 -->
        <section class="content-section wide">
          <div class="section-header">
            <h3><i class="fa fa-history"></i> 详细履历</h3>
          </div>
          <div id="timeline-container"></div>
        </section>
      </div>
    `;

    // 重新初始化组件（因为DOM被重置了）
    this.profileCard = new ProfileCard('profile-container');
    this.levelMatrix = new LevelMatrix('level-matrix-container');
    this.geoMap = new GeoMap('geo-map-container');
    this.timeline = new Timeline('timeline-container');

    // 渲染各组件
    this.profileCard.setOfficial(currentOfficial, careers.length);
    this.levelMatrix.setData(currentOfficial, timeline);
    this.geoMap.setData(currentOfficial, geo, careers);
    this.timeline.setData(careers);

    // 地图需要异步渲染
    this.geoMap.render();
  }

  /**
   * 显示主内容区加载状态
   * @private
   */
  showMainLoading() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
      <div class="loading-state main-loading">
        <i class="fa fa-spinner fa-spin"></i>
        <h3>正在加载数据...</h3>
        <p>请稍候</p>
      </div>
    `;
  }

  /**
   * 显示主内容区错误
   * @private
   */
  showMainError(message, onRetry) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
      <div class="error-state main-error">
        <i class="fa fa-exclamation-triangle"></i>
        <h3>加载失败</h3>
        <p>${message}</p>
        <button class="btn btn-primary" id="retry-btn">
          <i class="fa fa-refresh"></i> 重试
        </button>
      </div>
    `;

    const retryBtn = mainContent.querySelector('#retry-btn');
    if (retryBtn && onRetry) {
      retryBtn.addEventListener('click', onRetry);
    }
  }

  /**
   * 显示全局错误
   * @private
   */
  showGlobalError(message) {
    document.body.innerHTML = `
      <div class="error-page">
        <div class="error-content">
          <i class="fa fa-exclamation-circle"></i>
          <h1>出错了</h1>
          <p>${message}</p>
          <button class="btn btn-primary" onclick="location.reload()">
            <i class="fa fa-refresh"></i> 刷新页面
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 处理浏览器返回
   */
  handlePopState(event) {
    if (event.state && event.state.id) {
      this.sidebar.setSelectedId(event.state.id);
      this.loadOfficial(event.state.id);
    } else {
      // 返回首页状态
      const mainContent = document.getElementById('main-content');
      mainContent.innerHTML = `
        <div class="empty-state welcome">
          <i class="fa fa-hand-pointer-o"></i>
          <h2>请选择一位官员</h2>
          <p>从左侧列表选择官员查看详细生涯数据</p>
        </div>
      `;
      this.sidebar.setSelectedId(null);
      this.currentOfficial = null;
      this.currentOfficialData = null;
    }
  }
}

// 导出应用实例
export const app = new App();
