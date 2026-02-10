/**
 * Profile Card Component
 * 官员基本信息卡片组件
 */

import { BaseComponent } from './BaseComponent.js';

export class ProfileCard extends BaseComponent {
  constructor(containerId) {
    super(containerId);

    this.state = {
      official: null,
      careerCount: 0
    };
  }

  /**
   * 设置官员数据
   * @param {Object} official - 官员基本信息
   * @param {number} careerCount - 履历数量
   */
  setOfficial(official, careerCount = 0) {
    this.setState({
      official,
      careerCount
    });
  }

  /**
   * 渲染组件
   */
  render() {
    const { official, careerCount } = this.state;

    if (!official) {
      this.showEmpty('请选择一位官员查看详情', 'fa-hand-pointer-o');
      return;
    }

    const nativePlace = this.formatNativePlace(official.nativePlace);

    this.container.innerHTML = `
      <div class="profile-card">
        <div class="profile-header">
          <div class="avatar">${official.name?.[0] || '?'}</div>
          <div class="profile-basic">
            <h2 class="profile-name">${official.name}</h2>
            <div class="profile-tags">
              <span class="tag">${official.gender || '未知'}</span>
              <span class="tag">${official.ethnicity || '未知'}</span>
              <span class="tag">${official.education || '未知'}</span>
            </div>
          </div>
        </div>

        <div class="profile-grid">
          <div class="info-item">
            <span class="info-label">籍贯</span>
            <span class="info-value">${nativePlace || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">出生日期</span>
            <span class="info-value">${official.birthDate || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">入党时间</span>
            <span class="info-value">${official.partyDate || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">现状</span>
            <span class="info-value">
              <span class="status-badge ${this.getStatusClass(official.status)}">
                ${official.status || '未知'}
              </span>
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">经历数</span>
            <span class="info-value highlight">${careerCount} 条</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 格式化籍贯信息
   * @private
   */
  formatNativePlace(nativePlace) {
    if (!nativePlace) return '';

    const parts = [];
    if (nativePlace.province) parts.push(nativePlace.province);
    if (nativePlace.city) parts.push(nativePlace.city);
    if (nativePlace.county) parts.push(nativePlace.county);

    return parts.join(' ');
  }

  /**
   * 获取状态样式类
   * @private
   */
  getStatusClass(status) {
    if (!status) return '';

    const statusMap = {
      '在职': 'status-active',
      '退休': 'status-retired',
      '免职': 'status-removed',
      '去世': 'status-deceased'
    };

    return statusMap[status] || '';
  }
}
