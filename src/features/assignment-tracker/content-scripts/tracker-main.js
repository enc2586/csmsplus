// tracker-main.js
(function () {
    'use strict';

    // Global Namespace
    window.GistAssignmentTracker = window.GistAssignmentTracker || {};

    const { Utils, Api, UI, Dashboard, Config } = window.GistAssignmentTracker;

    // Track active containers
    const assignmentContainers = new Map(); // id -> Array<{ container, data, url, isInOverview }>

    // Current Options
    let CurrentOptions = {
        tracker: {
            enableSummaryAtDashboard: true,
            enableSummaryAtLecture: true,
            enableAssignmentDetail: true,
            showBody: true,
            showRemainingTime: true,
            urgentThresholdHours: 72
        },
        advanced: {
            cacheTtl: 60000,
            cacheTtlSubmitted: 604800000
        }
    };

    // Helper to render all containers for an ID
    function renderAllContainers(id, data, error = null) {
        const containers = assignmentContainers.get(id);
        if (!containers) return;

        const excluded = Utils.excludedAssignmentIds.has(id);
        containers.forEach(info => {
            // Update local data reference
            info.data = data;
            info.error = error;
            info.button.textContent = excluded ? '다시 추적' : '추적 제외';
            info.button.setAttribute('aria-label', `${info.title}: ${info.button.textContent}`);
            info.excludedLabel.hidden = !excluded;
            info.container.hidden = !excluded && !CurrentOptions.tracker.enableAssignmentDetail;
            if (excluded) {
                info.container.replaceChildren(info.excludedLabel);
            } else if (!info.container.hidden) {
                UI.renderAssignmentInfo(info.container, data, error, info.url, info.isInOverview, CurrentOptions.tracker);
            }
        });
    }

    function handleAssignmentLink(link) {
        const href = link.href;
        const url = new URL(href);
        const id = url.searchParams.get('id');

        if (!id) return;
        if (link.dataset.trackerProcessed) return;
        link.dataset.trackerProcessed = 'true';

        // Get Title
        let title = link.textContent.trim();
        const hiddenSpan = link.querySelector('.accesshide');
        if (hiddenSpan) {
            const clone = link.cloneNode(true);
            const hide = clone.querySelector('.accesshide');
            if (hide) hide.remove();
            title = clone.textContent.trim();
        }

        // Register to Dashboard
        Dashboard.registerAssignment(id, href, title);

        // Create UI container
        const infoContainer = UI.createAssignmentInfoElement();

        // Check if in overview
        const isInOverview = link.closest('#section-0') !== null;

        const controls = document.createElement('span');
        controls.className = 'assignment-tracking-controls';
        const excludedLabel = document.createElement('span');
        excludedLabel.className = 'assignment-status-chip status-default';
        excludedLabel.textContent = '추적 제외됨';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'assignment-tracking-button';
        button.addEventListener('click', async () => {
            button.disabled = true;
            try {
                const key = `excludedAssignment_${id}`;
                if (Utils.excludedAssignmentIds.has(id)) await chrome.storage.local.remove(key);
                else await chrome.storage.local.set({ [key]: true });
            } catch (error) {
                alert('추적 설정을 저장하지 못했습니다. 다시 시도해 주세요.');
            } finally {
                button.disabled = false;
            }
        });
        controls.append(button);

        // Add to containers map
        if (!assignmentContainers.has(id)) {
            assignmentContainers.set(id, []);
        }
        assignmentContainers.get(id).push({ container: infoContainer, data: null, url: href, isInOverview, button, excludedLabel, title });

        // Position Container
        const activityInstance = link.closest('.activityinstance');
        if (activityInstance) {
            activityInstance.appendChild(controls);
            activityInstance.appendChild(infoContainer);
        } else {
            link.parentElement.appendChild(controls);
            link.parentElement.appendChild(infoContainer);
        }

        renderAllContainers(id, Dashboard.state.assignments[id].loaded ? Dashboard.state.assignments[id] : null);

        // Handler for data updates
        const handleDataUpdate = (data, error = null) => {
            renderAllContainers(id, data, error);
            // Always notify dashboard even if data is null (error), so it counts as "loaded"
            Dashboard.updateAssignmentData(id, data);
        };



        // Check internal Dashboard state first (optimization)
        const dashboardData = Dashboard.state.assignments[id];
        // If dashboard has data (deadline is not null implies we fetched it), use it.
        // But dashboard init is empty. We need to check if we have *fetched* data.
        // Dashboard state init: deadline: null.
        if (dashboardData && dashboardData.deadline !== null) {
            handleDataUpdate(dashboardData);
            return;
        }

        // Check Cache
        const cacheKey = `assignment_${id} `;
        chrome.storage.local.get([cacheKey], (result) => {
            const cached = result[cacheKey];
            const now = Date.now();
            let isValid = false;

            if (cached) {
                const ttl = cached.isSubmitted ? CurrentOptions.advanced.cacheTtlSubmitted : CurrentOptions.advanced.cacheTtl;
                if (now - cached.timestamp < ttl) {
                    isValid = true;
                }
            }

            if (isValid) {
                handleDataUpdate(cached);
            } else {
                // Determine if we should fetch. 
                // If another link for this ID is already fetching, we might duplicate work here.
                // But the Queue system handles rate limiting.
                // We should ideally debounce fetches or check if a fetch is pending for this ID.
                // For now, let's just queue it. 

                const courseId = new URLSearchParams(window.location.search).get('id');

                Utils.enqueueFetch(async () => {
                    const data = await Api.fetchAssignmentDetails(href, id, href, courseId);
                    if (data) {
                        handleDataUpdate(data);
                        chrome.storage.local.set({ [cacheKey]: data });
                    } else {
                        handleDataUpdate(null, true);
                    }
                });
            }
        });
    }

    // Listen for settings changes via Storage
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        const exclusionsChanged = Utils.updateExcludedAssignments(changes);
        if (changes.options) {
            const newOptions = changes.options.newValue || {};
            const trackerOpts = newOptions.tracker || {};
            const advancedOpts = newOptions.advanced || {};

            // Update Global state
            CurrentOptions = {
                tracker: { ...CurrentOptions.tracker, ...trackerOpts },
                advanced: { ...CurrentOptions.advanced, ...advancedOpts }
            };

            // Update Dashboard Config
            Dashboard.updateConfig(CurrentOptions.tracker);
        }
        if (exclusionsChanged || changes.options) {
            assignmentContainers.forEach((containers, id) => {
                renderAllContainers(id, containers[0].data, containers[0].error);
            });
            Dashboard.scheduleUpdate();
        }
    });

    async function init() {
        // Load Options
        const result = await chrome.storage.local.get(['options']);
        if (result.options) {
            const opts = result.options;
            if (opts.tracker) CurrentOptions.tracker = { ...CurrentOptions.tracker, ...opts.tracker };
            if (opts.advanced) CurrentOptions.advanced = { ...CurrentOptions.advanced, ...opts.advanced };
        }

        await Utils.loadExcludedAssignments();

        // Init Dashboard with options
        Dashboard.init(CurrentOptions.tracker);

        const links = document.querySelectorAll('a[href*="mod/assign/view.php?id="]');
        console.log(`[Tracker] Found ${links.length} assignment links`);

        links.forEach(link => {
            if (link.closest('.activity.assign') || link.closest('.modtype_assign')) {
                handleAssignmentLink(link);
            } else {
                handleAssignmentLink(link);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
