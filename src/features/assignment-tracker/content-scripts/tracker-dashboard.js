// tracker-dashboard.js
(function () {
    'use strict';

    window.GistAssignmentTracker = window.GistAssignmentTracker || {};

    const Utils = window.GistAssignmentTracker.Utils;
    // const Config = window.GistAssignmentTracker.Config; // Not strictly needed here directly if we use listeners? Actually we need specific constants if they were used.

    // State management for Dashboard
    window.GistAssignmentTracker.Dashboard = {
        state: {
            assignments: {}, // { id: { title, deadline, isSubmitted, link, content } }
            timer: null,
            rendered: false,
            showContent: true, // Default true
            isLoading: true,
            loadedCount: 0,
            totalCount: 0
        },

        init: function (config = {}) {
            // console.log('Tracker Dashboard Module Loaded');
            this.state.showContent = config.showBody !== undefined ? config.showBody : true;
            this.state.urgentThresholdHours = config.urgentThresholdHours || 72;
            this.state.enableSummary = config.enableSummaryAtLecture !== undefined ? config.enableSummaryAtLecture : true;

            if (!this.state.enableSummary) return;

            // Listen for global settings changes if needed? 
            // tracker-main.js handles the listener and calls updateConfig
        },

        updateConfig: function (config) {
            let changed = false;

            if (config.showBody !== undefined && config.showBody !== this.state.showContent) {
                this.state.showContent = config.showBody;
                changed = true;
            }
            if (config.urgentThresholdHours !== undefined && config.urgentThresholdHours !== this.state.urgentThresholdHours) {
                this.state.urgentThresholdHours = config.urgentThresholdHours;
                changed = true;
            }
            if (config.enableSummaryAtLecture !== undefined) {
                this.state.enableSummary = config.enableSummaryAtLecture;
                // If disabled, remove UI?
                if (!this.state.enableSummary) {
                    const root = document.getElementById('assignment-dashboard-root');
                    if (root) root.remove();
                    this.state.rendered = false;
                    return;
                } else {
                    // if enabled and not rendered, render() will be called below if changed
                    changed = true;
                }
            }

            if (changed) {
                this.render();
            }
        },

        registerAssignment: function (id, link, title) {
            this.state.assignments[id] = {
                id,
                link,
                title,
                isSubmitted: false,
                deadline: null,
                content: ''
            };
            this.state.totalCount++;
            this.scheduleUpdate();
        },

        updateAssignmentData: function (id, data) {
            if (this.state.assignments[id]) {
                this.state.assignments[id] = {
                    ...this.state.assignments[id],
                    title: data.title || this.state.assignments[id].title,
                    content: data.content || '',
                    isSubmitted: data.isSubmitted,
                    deadline: data.deadline
                };

                this.state.loadedCount++;
                if (this.state.loadedCount >= this.state.totalCount) {
                    this.state.isLoading = false;
                }

                this.scheduleUpdate();
            }
        },

        scheduleUpdate: function () {
            if (this.state.timer) clearTimeout(this.state.timer);
            // Use config constant
            const debounceMs = window.GistAssignmentTracker.Config.DASHBOAD_DEBOUNCE_MS || 500;
            this.state.timer = setTimeout(() => this.render(), debounceMs);
        },

        // Deprecated: Settings Modal removed in favor of Options Page
        toggleSettingsModal: function () { },
        showSettingsModal: function () { },

        render: function () {
            if (!this.state.enableSummary) return;

            // 1. Find Insertion Point
            let container = document.getElementById('assignment-dashboard-root');
            if (!container) {
                const mainContent = document.querySelector('.course-content');
                const topicsList = mainContent ? mainContent.querySelector('ul.topics, ul.weeks') : null;

                if (topicsList) {
                    container = document.createElement('li');
                    container.id = 'assignment-dashboard-root';
                    container.className = 'section main assignment-dashboard-container';
                    // console.log('[Dashboard] Initialized');

                    const section0 = topicsList.querySelector('#section-0');

                    if (section0 && section0.nextSibling) {
                        topicsList.insertBefore(container, section0.nextSibling);
                    } else if (section0) {
                        topicsList.appendChild(container);
                    } else {
                        if (topicsList.firstChild) {
                            topicsList.insertBefore(container, topicsList.firstChild);
                        } else {
                            topicsList.appendChild(container);
                        }
                    }
                    this.state.rendered = true;
                } else {
                    return;
                }
            }

            // 2. Aggregate
            const assignments = Object.values(this.state.assignments);
            const total = assignments.length;

            let completed = 0;
            let urgentList = [];
            let overdueList = [];

            const now = new Date();
            const urgentThresholdMs = (this.state.urgentThresholdHours || 72) * 60 * 60 * 1000;

            assignments.forEach(a => {
                if (a.isSubmitted) {
                    completed++;
                } else {
                    const dueDate = Utils.parseDate(a.deadline);
                    if (dueDate) {
                        const diff = dueDate - now;
                        if (diff < 0) {
                            overdueList.push({ ...a, diff });
                        } else if (diff <= urgentThresholdMs) {
                            urgentList.push({ ...a, diff });
                        }
                    }
                }
            });

            urgentList.sort((a, b) => a.diff - b.diff);
            overdueList.sort((a, b) => b.diff - a.diff);

            const urgentAndOverdue = urgentList.length + overdueList.length;
            const remaining = total - completed - urgentAndOverdue;

            // 3. Render HTML
            let html = `
          <div class="content">
            <div class="dashboard-divider"></div>
            <div class="dashboard-header">
              <span>과제 개요</span>
            </div>
            
            <div class="dashboard-stats">
              <div class="stat-item">
                <div class="stat-value" style="color: #2e7d32">${completed}</div>
                <div class="stat-label">완료</div>
              </div>
              <div class="stat-item">
                <div class="stat-value" style="color: #c62828">${urgentAndOverdue}</div>
                <div class="stat-label">임박/지각</div>
              </div>
              <div class="stat-item">
                <div class="stat-value" style="color: #757575">${remaining}</div>
                <div class="stat-label">남음</div>
              </div>
            </div>
        `;

            const itemsToShow = [...overdueList, ...urgentList];

            if (itemsToShow.length === 0) {
                html += `
             <div class="dashboard-empty">
               지금은 마감이 임박하거나 지난 과제가 없습니다.
             </div>
           `;
            } else {
                html += `<div class="task-list-title">임박/지각 과제</div>
                    <div class="dashboard-task-list">`;

                itemsToShow.forEach(item => {
                    let chipClass = 'status-warning';
                    let chipText = '마감임박';
                    if (item.diff < 0) {
                        chipClass = 'status-overdue';
                        chipText = '마감지남';
                    }

                    const formattedDeadline = item.deadline ? Utils.formatDateWithPadding(item.deadline) + '까지' : '';
                    const dueDate = Utils.parseDate(item.deadline);
                    const remainingTime = (dueDate && item.diff > 0) ? Utils.calculateTimeRemaining(dueDate) : '';

                    const contentHtml = this.state.showContent && item.content
                        ? `<div class="task-content">${item.content}</div>`
                        : '';

                    html += `
               <a href="${item.link}" class="dashboard-task-item">
                 <div class="task-left">
                   <span class="assignment-status-chip ${chipClass}">${chipText}</span>
                   <div class="task-info">
                     <span class="task-title" title="${item.title}">${item.title}</span>
                     ${contentHtml}
                   </div>
                 </div>
                 <span class="task-due">${formattedDeadline}${remainingTime}</span>
               </a>
             `;
                });
                html += `</div>`;
            }

            html += `</div>`; // Close .content
            container.innerHTML = html;
        }
    };
})();
