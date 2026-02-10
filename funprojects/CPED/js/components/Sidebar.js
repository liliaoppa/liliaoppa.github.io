/**
 * Sidebar Component
 * 侧边栏组件：搜索框 + 官员列表
 */

import { BaseComponent } from './BaseComponent.js';
import { dataLoader } from '../services/dataLoader.js';
import { APP_CONFIG } from '../config.js';
import { debounce } from '../utils/helpers.js';

export class Sidebar extends BaseComponent {
  constructor(containerId) {
    super(containerId);

    this.state = {
      officials: [],
      filteredOfficials: [],
      selectedId: null,
      keyword: '',
      isLoading: false
    };

    this.onSelect = null;
    this.isComposing = false; // 输入法组合状态
  }

  /**
   * 初始化并加载数据
   */
  async init() {
    console.log('[Sidebar] init() started');
    this.setState({ isLoading: true });
    this.showLoading('正在加载索引...\n(约 1MB，首次加载可能需要 10-30 秒)');

    try {
      console.log('[Sidebar] Calling dataLoader.getOfficialsList()...');
      const officials = await dataLoader.getOfficialsList();
      console.log('[Sidebar] Got officials:', officials?.length);

      this.setState({
        officials,
        filteredOfficials: officials.slice(0, APP_CONFIG.INITIAL_LIST_SIZE),
        isLoading: false
      });

      console.log('[Sidebar] Rendering...');
      this.render();
      this.attachEvents();
      console.log('[Sidebar] init() completed');
    } catch (error) {
      console.error('[Sidebar] Failed to load:', error);
      this.setState({ isLoading: false });
      this.showError(error.message, () => this.init());
    }
  }

  /**
   * 渲染组件
   */
  render() {
    const { filteredOfficials, selectedId, keyword, isLoading } = this.state;

    if (isLoading) return;

    this.container.innerHTML = `
      <div class="search-section">
        <div class="panel-title">
          <i class="fa fa-search"></i> 搜索官员
        </div>
        <div class="search-box">
          <div class="search-input-wrapper">
            <i class="fa fa-search search-icon"></i>
            <input
              type="text"
              class="form-control search-input"
              id="search-input"
              placeholder="输入姓名或籍贯搜索..."
              value="${keyword}"
              autocomplete="off"
            >
            ${keyword ? '<i class="fa fa-times-circle clear-icon" id="clear-input"></i>' : ''}
          </div>
        </div>
      </div>

      <div class="list-section">
        <div class="panel-title">
          <i class="fa fa-list"></i>
          官员列表
          <span class="count-badge">${filteredOfficials.length}</span>
        </div>
        <div class="officials-list" id="officials-list-container">
          ${this.renderOfficialsList(filteredOfficials, selectedId)}
        </div>
      </div>
    `;

    this.attachEvents();
  }

  /**
   * 渲染官员列表
   * @private
   */
  renderOfficialsList(officials, selectedId) {
    if (officials.length === 0) {
      return `<div class="empty-state small">
        <i class="fa fa-inbox"></i>
        <p>未找到匹配结果</p>
      </div>`;
    }

    return officials.map(o => `
      <div
        class="official-item ${o.id === selectedId ? 'active' : ''}"
        data-id="${o.id}"
      >
        <div class="official-avatar">${o.name?.[0] || '?'}</div>
        <div class="official-info-main">
          <div class="official-name">${o.name}</div>
          <div class="official-meta">
            <span class="meta-tag">${o.nativePlace?.province || '未知'}</span>
            <span class="meta-tag">${o.education || ''}</span>
          </div>
        </div>
        <i class="fa fa-chevron-right arrow"></i>
      </div>
    `).join('');
  }

  /**
   * 附加事件监听
   * @private
   */
  attachEvents() {
    this.removeAllEventListeners();

    // 搜索输入框 - 支持输入法
    const searchInput = this.container.querySelector('#search-input');
    if (searchInput) {
      // 处理输入法组合开始
      this.addEventListener(searchInput, 'compositionstart', () => {
        this.isComposing = true;
      });

      // 处理输入法组合结束
      this.addEventListener(searchInput, 'compositionend', (e) => {
        this.isComposing = false;
        this.state.keyword = e.target.value;
        this.debouncedSearch(e.target.value);
      });

      // 输入事件
      this.addEventListener(searchInput, 'input', (e) => {
        // 如果正在使用输入法，不触发搜索
        if (this.isComposing) return;

        this.state.keyword = e.target.value;
        this.debouncedSearch(e.target.value);
      });

      // 回车搜索
      this.addEventListener(searchInput, 'keydown', (e) => {
        if (e.key === 'Enter' && !this.isComposing) {
          this.performSearch(e.target.value);
        }
      });

      // 自动聚焦
      searchInput.focus();
    }

    // 清除输入按钮
    const clearBtn = this.container.querySelector('#clear-input');
    if (clearBtn) {
      this.addEventListener(clearBtn, 'click', () => {
        this.clearSearch();
        const input = this.container.querySelector('#search-input');
        if (input) input.focus();
      });
    }

    // 官员列表点击
    const listContainer = this.container.querySelector('#officials-list-container');
    if (listContainer) {
      this.addEventListener(listContainer, 'click', (e) => {
        const item = e.target.closest('.official-item');
        if (item) {
          const id = parseInt(item.dataset.id);
          this.selectOfficial(id);
        }
      });
    }
  }

  /**
   * 执行搜索
   * @param {string} keyword - 搜索关键词
   */
  async performSearch(keyword) {
    if (!keyword || keyword.trim() === '') {
      this.clearSearch();
      return;
    }

    const results = await dataLoader.searchOfficials(
      keyword,
      APP_CONFIG.MAX_SEARCH_RESULTS
    );

    this.setState({
      filteredOfficials: results,
      keyword: keyword.trim()
    });
  }

  /**
   * 清空搜索
   */
  clearSearch() {
    const { officials } = this.state;

    this.setState({
      keyword: '',
      filteredOfficials: officials.slice(0, APP_CONFIG.INITIAL_LIST_SIZE)
    });

    // 清空输入框
    const input = this.container.querySelector('#search-input');
    if (input) {
      input.value = '';
    }
  }

  /**
   * 选择官员
   * @param {number} id - 官员ID
   */
  selectOfficial(id) {
    this.state.selectedId = id;

    // 更新UI选中状态
    this.container.querySelectorAll('.official-item').forEach(item => {
      item.classList.toggle('active', parseInt(item.dataset.id) === id);
    });

    // 触发回调
    if (this.onSelect) {
      this.onSelect(id);
    }
  }

  /**
   * 设置选中状态（不触发回调）
   * @param {number} id - 官员ID
   */
  setSelectedId(id) {
    this.state.selectedId = id;

    this.container.querySelectorAll('.official-item').forEach(item => {
      item.classList.toggle('active', parseInt(item.dataset.id) === id);
    });
  }
}
