// tracker-ui.js
(function () {
    'use strict';

    window.GistAssignmentTracker = window.GistAssignmentTracker || {};

    const Utils = window.GistAssignmentTracker.Utils;

    window.GistAssignmentTracker.UI = {
        createAssignmentInfoElement: function () {
            const container = document.createElement('div');
            container.className = 'assignment-info-container';
            return container;
        },

        renderAssignmentInfo: function (container, data, error = null, assignmentUrl = null, isCompact = false, config = {}) {
            container.innerHTML = '';

            if (error) return;

            if (!data) {
                // Loading state
                if (isCompact) {
                    container.innerHTML = `
                        <span class="assignment-loading">
                          <span class="assignment-spinner"></span>
                        </span>`;
                } else {
                    container.innerHTML = `
                        <span class="assignment-loading">
                          <span class="assignment-spinner"></span>
                          불러오는 중...
                        </span>`;
                }
                return;
            }

            const { deadline, isSubmitted, content } = data;
            const statusData = Utils.getAssignmentStatus(deadline, isSubmitted);
            const { chipText, chipClass, dueDate } = statusData;

            // Calculate remaining time
            const now = new Date();
            let remainingTimeText = '';

            // Allow override or default to true/false based on typical usage
            const showRemaining = config.showRemainingTime !== undefined ? config.showRemainingTime : true;

            if (showRemaining && !isSubmitted && dueDate && dueDate > now) {
                remainingTimeText = Utils.calculateTimeRemaining(dueDate);
            }

            if (isCompact) {
                // Compact View Logic
                const cleanRemaining = remainingTimeText.replace(/[()]/g, '').trim();
                const link = assignmentUrl || '#';

                container.innerHTML = `
                  <a href="${link}" class="assignment-compact-link">
                    <div class="assignment-compact-chip ${chipClass}">
                      ${chipText}
                    </div>
                    ${cleanRemaining ? `<div class="assignment-compact-remaining">${cleanRemaining}</div>` : ''}
                  </a>
                `;
            } else {
                // Normal View Logic
                const formattedDeadline = deadline ? Utils.formatDateWithPadding(deadline) + '까지' : '마감일 정보 없음';
                const showContent = config.showBody !== undefined ? config.showBody : true;

                const contentHtml = showContent && content
                    ? `<div class="assignment-content-preview">${content}</div>`
                    : '';

                // Common inner HTML structure
                const innerStructure = `
                    <div class="assignment-status-row">
                        <div class="assignment-status-chip ${chipClass}">
                            ${chipText}
                        </div>
                        <div class="assignment-deadline-text">${formattedDeadline}${remainingTimeText}</div>
                    </div>
                    ${contentHtml}
                `;

                if (assignmentUrl) {
                    container.innerHTML = `
                      <a href="${assignmentUrl}" class="assignment-info-link">
                        ${innerStructure}
                      </a>
                    `;
                } else {
                    container.innerHTML = innerStructure;
                }
            }
        }
    };

})();
