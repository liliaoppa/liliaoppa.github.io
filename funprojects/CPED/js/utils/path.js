/**
 * Path Utilities
 * 处理相对路径和URL解析
 */

/**
 * 获取数据根目录的完整URL
 * 指向 assets/data/cped/
 */
export function getDataRootPath() {
  // 获取当前URL
  // 例如: http://localhost:8080/funprojects/CPED/index.html
  // 数据在: http://localhost:8080/assets/data/cped/
  // CPED 和数据文件都在根目录下，没有父子关系

  const url = new URL(window.location.href);

  // 数据文件始终在网站根目录的 assets/data/cped/ 下
  // 不依赖于 CPED 的路径位置
  return `${url.origin}/assets/data/cped`;
}

/**
 * 构建数据文件URL
 * @param {string} type - 数据类型 (careers|timelines|geo)
 * @param {string|number} id - 官员ID
 * @returns {string} 完整URL
 */
export function buildDataUrl(type, id) {
  const dataRoot = getDataRootPath();
  return `${dataRoot}/${type}/${id}.json`;
}

/**
 * 获取索引文件URL
 * @returns {string} 索引文件完整URL
 */
export function getIndexUrl() {
  const dataRoot = getDataRootPath();
  return `${dataRoot}/index.json`;
}

/**
 * 获取中国地图数据URL
 * @returns {string} 地图数据完整URL
 */
export function getMapUrl() {
  // 地图数据在 CPED/data/ 目录下（相对于当前页面）
  const url = new URL(window.location.href);
  const pathParts = url.pathname.split('/').filter(Boolean);

  // 找到 CPED 的位置
  const cpedIndex = pathParts.indexOf('CPED');
  if (cpedIndex >= 0) {
    // 构造到 CPED 目录的路径
    const baseParts = pathParts.slice(0, cpedIndex + 1);
    const basePath = '/' + baseParts.join('/');
    return `${url.origin}${basePath}/data/china.json`;
  }

  // 降级方案：假设在根目录
  return `${url.origin}/funprojects/CPED/data/china.json`;
}
