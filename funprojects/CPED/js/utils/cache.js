/**
 * Cache Manager
 * 简单的内存缓存，用于存储已加载的官员数据
 */

class Cache {
  #store = new Map();
  #maxSize = 100; // 最大缓存条目数

  /**
   * 获取缓存数据
   * @param {string} key - 缓存键
   * @returns {any|undefined} 缓存值
   */
  get(key) {
    const item = this.#store.get(key);
    if (item) {
      // 更新访问时间（LRU策略）
      item.accessed = Date.now();
      return item.value;
    }
    return undefined;
  }

  /**
   * 设置缓存数据
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   */
  set(key, value) {
    // 如果缓存已满，删除最久未访问的条目
    if (this.#store.size >= this.#maxSize && !this.#store.has(key)) {
      this.#evictLRU();
    }

    this.#store.set(key, {
      value,
      accessed: Date.now()
    });
  }

  /**
   * 检查是否有缓存
   * @param {string} key - 缓存键
   * @returns {boolean}
   */
  has(key) {
    return this.#store.has(key);
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  delete(key) {
    this.#store.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.#store.clear();
  }

  /**
   * 获取缓存大小
   * @returns {number}
   */
  size() {
    return this.#store.size;
  }

  /**
   * 删除最久未访问的条目（LRU）
   * @private
   */
  #evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, item] of this.#store.entries()) {
      if (item.accessed < oldestTime) {
        oldestTime = item.accessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.#store.delete(oldestKey);
    }
  }
}

// 导出单例实例
export const dataCache = new Cache();
