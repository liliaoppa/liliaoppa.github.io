/**
 * Helper Utilities
 * 通用辅助函数
 */

/**
 * 防抖函数
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

/**
 * 节流函数
 * @param {Function} fn - 要节流的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function}
 */
export function throttle(fn, limit = 100) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 格式化日期显示
 * @param {string} dateStr - 日期字符串
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return '未知';
  if (dateStr === '至今') return '至今';

  // 尝试解析日期
  const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}年${parseInt(month)}月${parseInt(day)}日`;
  }

  return dateStr;
}

/**
 * 提取年份
 * @param {string} dateStr - 日期字符串
 * @returns {number|null}
 */
export function extractYear(dateStr) {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

/**
 * 安全地获取嵌套对象属性
 * @param {Object} obj - 对象
 * @param {string} path - 属性路径，如 'a.b.c'
 * @param {any} defaultValue - 默认值
 * @returns {any}
 */
export function get(obj, path, defaultValue = '') {
  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result == null || typeof result !== 'object') {
      return defaultValue;
    }
    result = result[key];
  }

  return result !== undefined ? result : defaultValue;
}

/**
 * 创建DOM元素
 * @param {string} tag - 标签名
 * @param {Object} options - 选项
 * @param {string} options.className - CSS类名
 * @param {string} options.text - 文本内容
 * @param {string} options.html - HTML内容
 * @param {Object} options.attrs - 属性对象
 * @param {Array} options.children - 子元素数组
 * @returns {HTMLElement}
 */
export function createElement(tag, options = {}) {
  const element = document.createElement(tag);

  if (options.className) {
    element.className = options.className;
  }

  if (options.text !== undefined) {
    element.textContent = options.text;
  }

  if (options.html !== undefined) {
    element.innerHTML = options.html;
  }

  if (options.attrs) {
    Object.entries(options.attrs).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  if (options.children) {
    options.children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof HTMLElement) {
        element.appendChild(child);
      }
    });
  }

  return element;
}

/**
 * 显示加载状态
 * @param {HTMLElement} container - 容器元素
 * @param {string} message - 加载消息
 */
export function showLoading(container, message = '加载中...') {
  container.innerHTML = `
    <div class="loading-state">
      <i class="fa fa-spinner fa-spin"></i>
      <p>${message}</p>
    </div>
  `;
}

/**
 * 显示错误状态
 * @param {HTMLElement} container - 容器元素
 * @param {string} message - 错误消息
 * @param {Function} onRetry - 重试回调
 */
export function showError(container, message, onRetry = null) {
  const retryButton = onRetry
    ? `<button class="btn btn-primary" id="retry-btn">
         <i class="fa fa-refresh"></i> 重试
       </button>`
    : '';

  container.innerHTML = `
    <div class="error-state">
      <i class="fa fa-exclamation-triangle"></i>
      <h3>加载失败</h3>
      <p>${message}</p>
      ${retryButton}
    </div>
  `;

  if (onRetry) {
    const btn = container.querySelector('#retry-btn');
    if (btn) {
      btn.addEventListener('click', onRetry);
    }
  }
}

/**
 * 显示空状态
 * @param {HTMLElement} container - 容器元素
 * @param {string} message - 空状态消息
 * @param {string} icon - Font Awesome图标类
 */
export function showEmpty(container, message = '暂无数据', icon = 'fa-inbox') {
  container.innerHTML = `
    <div class="empty-state">
      <i class="fa ${icon}"></i>
      <p>${message}</p>
    </div>
  `;
}
