/**
 * Data Loader Service
 * 负责按需加载官员数据，支持缓存机制
 */

import { dataCache } from '../utils/cache.js';
import { getIndexUrl, buildDataUrl } from '../utils/path.js';

// 带超时的 fetch 封装
async function fetchWithTimeout(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接');
    }
    throw error;
  }
}

class DataLoader {
  #indexData = null;
  #loadingPromises = new Map();

  /**
   * 加载官员索引数据
   * @returns {Promise<Object>} 索引数据
   */
  async loadIndex() {
    if (this.#indexData) {
      return this.#indexData;
    }

    const cacheKey = 'index';
    const cached = dataCache.get(cacheKey);
    if (cached) {
      this.#indexData = cached;
      return cached;
    }

    const url = getIndexUrl();
    console.log('[DataLoader] Loading index from:', url);

    try {
      const response = await fetchWithTimeout(url, {}, 60000); // 索引文件较大，给60秒超时
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.#indexData = data;
      dataCache.set(cacheKey, data);

      console.log('[DataLoader] Index loaded:', data.officials?.length || 0, 'officials');
      return data;
    } catch (error) {
      console.error('[DataLoader] Failed to load index:', error);
      console.error('[DataLoader] URL was:', url);

      // 提供更有用的错误信息
      let errorMsg = error.message;
      if (error.message.includes('Failed to fetch')) {
        errorMsg = '网络请求失败，请检查：\n1. 是否通过本地服务器访问（而非直接打开文件）\n2. 网络连接是否正常';
      }

      throw new Error(errorMsg);
    }
  }

  /**
   * 加载单个官员的详细数据
   * @param {string|number} id - 官员ID
   * @returns {Promise<Object>} 官员详细数据
   */
  async loadOfficialData(id) {
    const idStr = String(id);

    // 检查缓存
    const cached = dataCache.get(idStr);
    if (cached) {
      return cached;
    }

    // 避免重复请求（请求合并）
    if (this.#loadingPromises.has(idStr)) {
      return this.#loadingPromises.get(idStr);
    }

    const promise = this.#fetchOfficialData(idStr);
    this.#loadingPromises.set(idStr, promise);

    try {
      const data = await promise;
      dataCache.set(idStr, data);
      return data;
    } finally {
      this.#loadingPromises.delete(idStr);
    }
  }

  /**
   * 批量预加载官员数据（用于预加载）
   * @param {Array<string|number>} ids - 官员ID列表
   */
  async preloadOfficials(ids) {
    const uncachedIds = ids.filter(id => !dataCache.has(String(id)));

    // 限制并发数，避免过多请求
    const batchSize = 3;
    for (let i = 0; i < uncachedIds.length; i += batchSize) {
      const batch = uncachedIds.slice(i, i + batchSize);
      await Promise.all(batch.map(id =>
        this.loadOfficialData(id).catch(() => null)
      ));
    }
  }

  /**
   * 获取索引中的官员列表
   * @returns {Promise<Array>}
   */
  async getOfficialsList() {
    const index = await this.loadIndex();
    return index.officials || [];
  }

  /**
   * 获取统计数据
   * @returns {Promise<Object>}
   */
  async getStatistics() {
    const index = await this.loadIndex();
    return index.statistics || {};
  }

  /**
   * 搜索官员
   * @param {string} keyword - 搜索关键词
   * @param {number} limit - 最大结果数
   * @returns {Promise<Array>}
   */
  async searchOfficials(keyword, limit = 50) {
    const officials = await this.getOfficialsList();

    if (!keyword || keyword.trim() === '') {
      return officials.slice(0, limit);
    }

    const lowerKeyword = keyword.toLowerCase().trim();

    return officials
      .filter(o => {
        const nameMatch = o.name && o.name.toLowerCase().includes(lowerKeyword);
        const provinceMatch = o.nativePlace?.province &&
          o.nativePlace.province.includes(keyword);
        const cityMatch = o.nativePlace?.city &&
          o.nativePlace.city.includes(keyword);
        return nameMatch || provinceMatch || cityMatch;
      })
      .slice(0, limit);
  }

  /**
   * 根据ID获取官员基本信息
   * @param {string|number} id - 官员ID
   * @returns {Promise<Object|null>}
   */
  async getOfficialById(id) {
    const officials = await this.getOfficialsList();
    return officials.find(o => o.id === id) || null;
  }

  /**
   * 获取缓存统计
   * @returns {Object}
   */
  getCacheStats() {
    return {
      size: dataCache.size(),
      hasIndex: !!this.#indexData
    };
  }

  /**
   * 清空所有缓存
   */
  clearCache() {
    dataCache.clear();
    this.#indexData = null;
    this.#loadingPromises.clear();
  }

  /**
   * 获取所有城市列表（从所有官员的career数据中提取）
   * @returns {Promise<Array>} 城市列表
   */
  async getCitiesList() {
    const officials = await this.getOfficialsList();
    const citiesMap = new Map();

    // 限制并发数，避免浏览器卡死
    const batchSize = 20;
    for (let i = 0; i < officials.length; i += batchSize) {
      const batch = officials.slice(i, i + batchSize);
      await Promise.all(batch.map(async (official) => {
        try {
          const data = await this.loadOfficialData(official.id);
          if (!data.careers) return;

          // 只提取该官员担任过市长或书记的城市
          let hasLeadershipRole = false;
          data.careers.forEach(career => {
            const pos = career.specificPosition || '';
            const cat = career.category || '';
            const isMayor = pos === '市长' || pos.includes('代市长') || pos.includes('市委副书记、市长');
            const isSecretary = pos === '书记' || pos === '市委书记' || (pos.includes('书记') && cat.includes('党委') && !pos.includes('副'));

            if ((isMayor || isSecretary) && career.city && career.city !== '不详' && career.city !== '') {
              hasLeadershipRole = true;
              const key = `${career.province}-${career.city}`;
              if (!citiesMap.has(key)) {
                citiesMap.set(key, {
                  province: career.province,
                  city: career.city,
                  officialIds: new Set()
                });
              }
              citiesMap.get(key).officialIds.add(official.id);
            }
          });
        } catch (e) {
          // 忽略加载失败的官员
        }
      }));

      // 每批次后给浏览器喘息时间，并更新进度（可选）
      if (i + batchSize < officials.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // 转换为数组并排序（按官员数量降序）
    return Array.from(citiesMap.values())
      .map(c => ({
        province: c.province,
        city: c.city,
        officialCount: c.officialIds.size
      }))
      .sort((a, b) => b.officialCount - a.officialCount);
  }

  /**
   * 获取城市的领导列表（市长和市委书记）
   * @param {string} province - 省份
   * @param {string} city - 城市
   * @returns {Promise<Object>} { mayors: Array, secretaries: Array }
   */
  async getCityLeaders(province, city) {
    const officials = await this.getOfficialsList();
    const mayors = [];
    const secretaries = [];

    // 限制并发数，避免浏览器卡死
    const batchSize = 20;
    for (let i = 0; i < officials.length; i += batchSize) {
      const batch = officials.slice(i, i + batchSize);
      await Promise.all(batch.map(async (official) => {
        try {
          const data = await this.loadOfficialData(official.id);
          if (!data.careers) return;

          data.careers.forEach(career => {
            // 只处理该城市的记录
            if (career.city !== city || career.province !== province) return;

            const pos = career.specificPosition || '';
            const cat = career.category || '';

            // 只处理市长或书记职位
            const isMayor = pos === '市长' || pos === '市委副书记、市长' || pos === '代市长';
            const isSecretary = pos === '书记' || pos === '市委书记' || (pos.includes('书记') && cat.includes('党委') && !pos.includes('副'));

            if (isMayor || isSecretary) {
              const leaderInfo = {
                id: official.id,
                name: official.name,
                position: career.specificPosition,
                level: career.level,
                startDate: career.startDate,
                endDate: career.endDate,
                category: career.category
              };

              if (isMayor) {
                mayors.push(leaderInfo);
              } else {
                secretaries.push(leaderInfo);
              }
            }
          });
        } catch (e) {
          // 忽略加载失败的官员
        }
      }));

      // 每批次后给浏览器喘息时间
      if (i + batchSize < officials.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // 按时间排序
    const sortByDate = (a, b) => new Date(a.startDate) - new Date(b.startDate);
    mayors.sort(sortByDate);
    secretaries.sort(sortByDate);

    // 去重：同一官员同一职位的多个记录只保留第一个
    const dedup = (arr) => {
      const seen = new Set();
      return arr.filter(item => {
        const key = `${item.id}-${item.position}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    return { mayors: dedup(mayors), secretaries: dedup(secretaries) };
  }

  /**
   * 实际获取官员数据的内部方法
   * @private
   */
  async #fetchOfficialData(id) {
    try {
      const timelineUrl = buildDataUrl('timelines', id);
      const [careersRes, timelineRes, geoRes] = await Promise.all([
        fetchWithTimeout(buildDataUrl('careers', id), {}, 10000).catch((e) => { console.log('careers fetch failed:', e.message); return null; }),
        fetchWithTimeout(timelineUrl, {}, 10000).catch((e) => { console.log('timelines fetch failed:', e.message); return null; }),
        fetchWithTimeout(buildDataUrl('geo', id), {}, 10000).catch((e) => { console.log('geo fetch failed:', e.message); return null; })
      ]);

      console.log('[DataLoader] Response status:', {
        careers: careersRes?.status,
        timeline: timelineRes?.status,
        geo: geoRes?.status
      });

      const [careers, timeline, geo] = await Promise.all([
        careersRes?.ok ? careersRes.json() : [],
        timelineRes?.ok ? timelineRes.json() : [],
        geoRes?.ok ? geoRes.json() : []
      ]);

      console.log('[DataLoader] Parsed data:', { careers: careers?.length, timeline: timeline?.length, geo: geo?.length });
      console.log('[DataLoader] Timeline first item:', timeline?.[0]);

      return { careers, timeline, geo };
    } catch (error) {
      console.error(`Failed to load official data for ID ${id}:`, error);
      throw new Error(`官员数据加载失败 (ID: ${id})`);
    }
  }
}

// 导出单例实例
export const dataLoader = new DataLoader();
