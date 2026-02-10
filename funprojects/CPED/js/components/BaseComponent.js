/**
 * Base Component Class
 * 所有组件的基类，提供统一接口
 */

export class BaseComponent {
  /**
   * @param {string|HTMLElement} container - 容器ID或元素
   */
  constructor(container) {
    this.container = typeof container === 'string'
      ? document.getElementById(container)
      : container;

    if (!this.container) {
      throw new Error(`Container not found: ${container}`);
    }

    this.state = {};
    this.eventListeners = [];
  }

  /**
   * 设置状态（触发重新渲染）
   * @param {Object} newState - 新状态
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.render();
  }

  /**
   * 获取当前状态
   * @returns {Object}
   */
  getState() {
    return { ...this.state };
  }

  /**
   * 渲染组件（子类必须实现）
   * @abstract
   */
  render() {
    throw new Error('render() method must be implemented by subclass');
  }

  /**
   * 显示加载状态
   * @param {string} message - 加载消息
   */
  showLoading(message = '加载中...') {
    this.container.innerHTML = `
      <div class="loading-state">
        <i class="fa fa-spinner fa-spin"></i>
        <p>${message}</p>
      </div>
    `;
  }

  /**
   * 显示错误状态
   * @param {string} message - 错误消息
   * @param {Function} onRetry - 重试回调
   */
  showError(message, onRetry = null) {
    const retryHtml = onRetry
      ? `<button class="btn btn-primary retry-btn">
           <i class="fa fa-refresh"></i> 重试
         </button>`
      : '';

    this.container.innerHTML = `
      <div class="error-state">
        <i class="fa fa-exclamation-triangle"></i>
        <h3>出错了</h3>
        <p>${message}</p>
        ${retryHtml}
      </div>
    `;

    if (onRetry) {
      const btn = this.container.querySelector('.retry-btn');
      if (btn) {
        this.addEventListener(btn, 'click', onRetry);
      }
    }
  }

  /**
   * 显示空状态
   * @param {string} message - 消息
   * @param {string} icon - 图标类名
   */
  showEmpty(message = '暂无数据', icon = 'fa-inbox') {
    this.container.innerHTML = `
      <div class="empty-state">
        <i class="fa ${icon}"></i>
        <p>${message}</p>
      </div>
    `;
  }

  /**
   * 添加事件监听（自动记录以便清理）
   * @param {HTMLElement} element - 目标元素
   * @param {string} event - 事件类型
   * @param {Function} handler - 处理函数
   * @param {Object} options - 事件选项
   */
  addEventListener(element, event, handler, options = {}) {
    element.addEventListener(event, handler, options);
    this.eventListeners.push({ element, event, handler });
  }

  /**
   * 清理所有事件监听
   */
  removeAllEventListeners() {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }

  /**
   * 销毁组件
   */
  destroy() {
    this.removeAllEventListeners();
    this.container.innerHTML = '';
  }
}
