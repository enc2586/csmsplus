// Assignment Cache Updater
// updates the cache when a user visits an assignment page directly

(function () {
  'use strict';

  console.log('Assignment Cache Updater loaded');

  // Helper: Extract assignment ID from URL
  function getAssignmentId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }

  // Helper: Find table cell value by header text
  function getValueByHeader(headerText) {
    // Try searching in the submission summary table specifically first (most reliable)
    const summaryTable = document.querySelector('.submissionsummarytable');
    if (summaryTable) {
      // Moodle often uses <td class="cell c0">Header</td><td class="cell c1">Value</td>
      const cells = Array.from(summaryTable.querySelectorAll('th, td.cell.c0, td.c0'));
      const targetCell = cells.find(cell => cell.textContent.includes(headerText));

      if (targetCell) {
        const row = targetCell.closest('tr');
        if (row) {
          const valueCell = row.querySelector('td.cell.c1, td.c1, td:not(.c0):not(.cell)');
          if (valueCell) return valueCell.textContent.trim();

          const nextTd = targetCell.nextElementSibling;
          if (nextTd && nextTd.tagName === 'TD') return nextTd.textContent.trim();
        }
      }
    }

    // Fallback logic
    let ths = Array.from(document.querySelectorAll('th'));
    let targetTh = ths.find(th => th.textContent.includes(headerText));

    if (targetTh) {
      const row = targetTh.closest('tr');
      if (row) {
        const td = row.querySelector('td');
        if (td) return td.textContent.trim();
      }
    }
    return null;
  }

  // Main function to scrape and cache data
  function updateCache() {
    const assignmentId = getAssignmentId();
    if (!assignmentId) return;

    const submissionStatus = getValueByHeader('제출 여부');
    const dueDate = getValueByHeader('종료 일시');

    if (!submissionStatus && !dueDate) {
      console.log('Could not find submission status or due date');
      return;
    }

    const isSubmitted = submissionStatus && (submissionStatus.includes('제출함') || submissionStatus.includes('제출 완료'));

    // Extract assignment title - use specific selector
    const titleElement = document.querySelector('#region-main > div > h2');
    const assignmentTitle = titleElement ? titleElement.textContent.trim() : '';

    // Extract assignment content (description)
    let assignmentContent = '';
    const contentElement = document.querySelector('#intro, .box.generalbox.boxaligncenter, [id*="intro"]');
    if (contentElement) {
      // Check if there are multiple paragraph tags
      const paragraphs = contentElement.querySelectorAll('p');
      let rawText = '';

      if (paragraphs.length > 1) {
        // Multiple paragraphs - join with newline marker
        rawText = Array.from(paragraphs)
          .map(p => p.textContent.trim())
          .filter(text => text.length > 0)
          .join('###NEWLINE###');
      } else {
        // Single paragraph or no paragraph structure - use text content
        rawText = contentElement.textContent.trim();
      }

      // Replace newlines with '/' - ensure spacing around slash
      let processedText = rawText.replace(/\n+/g, '###NEWLINE###');
      // Normalize whitespace
      processedText = processedText.replace(/\s+/g, ' ');
      // Replace newline markers with proper spacing
      processedText = processedText.replace(/###NEWLINE###/g, (match, offset, str) => {
        const before = offset > 0 ? str[offset - 1] : '';
        const after = offset + match.length < str.length ? str[offset + match.length] : '';
        const needsBefore = before && before !== ' ';
        const needsAfter = after && after !== ' ';
        return (needsBefore ? ' ' : '') + '·' + (needsAfter ? ' ' : '');
      });
      processedText = processedText.trim();
      // Take first 200 characters
      if (processedText.length > 200) {
        assignmentContent = processedText.substring(0, 200) + '...';
      } else {
        assignmentContent = processedText;
      }
    }

    // Create cache object
    const cacheKey = `assignment_${assignmentId}`;
    const cacheData = {
      id: assignmentId,
      title: assignmentTitle,
      content: assignmentContent,
      deadline: dueDate,
      isSubmitted: isSubmitted,
      timestamp: Date.now()
    };

    // Calculate TTL based on status
    // 1 week if submitted, 1 minute otherwise (though if simple visit, maybe logic is different?
    // The plan said "Completed assignments TTL: 1 week".
    // If we are here, we have fresh data.

    console.log('Updating cache for assignment:', assignmentId, cacheData);

    chrome.storage.local.set({ [cacheKey]: cacheData }, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to update cache:', chrome.runtime.lastError);
      } else {
        console.log('Cache updated successfully');
      }
    });
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateCache);
  } else {
    updateCache();
  }

})();
