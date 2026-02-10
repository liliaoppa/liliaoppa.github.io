/**
 * Timeline Component
 * 履历时间线组件
 */

import { BaseComponent } from './BaseComponent.js';
import { APP_CONFIG } from '../config.js';
import { formatDate } from '../utils/helpers.js';

export class Timeline extends BaseComponent {
  constructor(containerId) {
    super(containerId);

    this.state = {
      careers: [],
      expanded: false
    };
  }

  /**
   * 设置履历数据
   * @param {Array} careers - 履历数据数组
   */
  setData(careers) {
    this.setState({
      careers: careers || [],
      expanded: false
    });
  }

  /**
   * 渲染时间线
   */
  render() {
    const { careers, expanded } = this.state;

    if (!careers || careers.length === 0) {
      this.showEmpty('暂无履历数据', 'fa-history');
      return;
    }

    const displayCount = expanded ? careers.length : APP_CONFIG.MAX_CAREER_ITEMS;
    const displayCareers = careers.slice(0, displayCount);
    const hasMore = careers.length > APP_CONFIG.MAX_CAREER_ITEMS;

    this.container.innerHTML = `
      <div class="timeline-container">
        <div class="timeline-list">
          ${displayCareers.map((c, index) => this.renderCareerItem(c, index)).join('')}
        </div>
        ${hasMore ? this.renderExpandButton(expanded, careers.length, displayCount) : ''}
      </div>
    `;

    this.attachEvents();
  }

  /**
   * 渲染单个履历项
   * @private
   */
  renderCareerItem(career, index) {
    const startDate = formatDate(career.startDate);
    const endDate = career.endDate ? formatDate(career.endDate) : '至今';

    const location = [
      career.province,
      career.city,
      career.county
    ].filter(Boolean).join(' ');

    return `
      <div class="timeline-item" style="--delay: ${index * 0.05}s">
        <div class="timeline-marker"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="timeline-date">
              <i class="fa fa-calendar"></i>
              ${startDate} ~ ${endDate}
            </span>
            ${career.level ? `<span class="level-tag">${career.level}</span>` : ''}
          </div>
          <h4 class="timeline-position">${career.specificPosition || career.position1 || '未知职位'}</h4>
          ${location ? `
            <div class="timeline-location">
              <i class="fa fa-map-marker"></i>
              ${location}
            </div>
          ` : ''}
          ${career.education ? `
            <div class="timeline-education">
              <i class="fa fa-graduation-cap"></i>
              ${career.education}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * 渲染展开/收起按钮
   * @private
   */
  renderExpandButton(expanded, total, displayed) {
    const remaining = total - displayed;

    if (expanded) {
      return `
        <button class="btn btn-secondary expand-btn" id="toggle-expand">
          <i class="fa fa-chevron-up"></i>
          收起
        </button>
      `;
    }

    return `
      <button class="btn btn-secondary expand-btn" id="toggle-expand">
        <i class="fa fa-chevron-down"></i>
        还有 ${remaining} 条记录
      </button>
    `;
  }

  /**
   * 附加事件监听
   * @private
   */
  attachEvents() {
    const toggleBtn = this.container.querySelector('#toggle-expand');
    if (toggleBtn) {
      this.addEventListener(toggleBtn, 'click', () => {
        this.state.expanded = !this.state.expanded;
        this.render();
      });
    }
  }
}
