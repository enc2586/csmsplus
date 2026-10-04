// Run: node tests/tracker-check.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const repo = path.resolve(__dirname, '..');
const scripts = 'src/features/assignment-tracker/content-scripts/';
const now = new Date(2026, 8, 30, 12).getTime();
class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
}
class Element {
    constructor() { this.children = []; this.dataset = {}; this.innerHTML = ''; this.style = {}; this.events = {}; }
    set innerHTML(value) { this.html = value; this.children = []; }
    get innerHTML() { return this.html; }
    replaceChildren(...children) { this.children = children; this.html = ''; }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.append(child); }
    prepend(child) { this.children.unshift(child); }
    setAttribute(key, value) { this[key] = value; }
    addEventListener(type, handler) { this.events[type] = handler; }
    querySelector(selector) { return this.children.find(child => `.${child.className}` === selector) || null; }
    remove() {}
}
const data = [
    { id: '1', deadline: '2026-09-30 22:00', isSubmitted: false },
    { id: '2', deadline: '2026-09-29 12:00', isSubmitted: false },
    { id: '3', deadline: '2026-09-29 12:00', isSubmitted: true },
    { id: '4', deadline: '2026-10-02 12:00', isSubmitted: false },
    { id: '5', deadline: null, isSubmitted: false },
    { id: '6', deadline: '2026-09-30 13:00', isSubmitted: false }
].map(a => ({ ...a, title: `과제 ${a.id}`, link: `https://lms.gist.ac.kr/mod/assign/view.php?id=${a.id}`, timestamp: now }));
const stored = { options: { tracker: { urgentThresholdHours: 24, enableAssignmentDetail: false } }, excludedAssignment_6: true };
for (const a of data.slice(0, 5)) stored[`assignment_${a.id}`] = a;
const listeners = [];
let failNextSave = false;
const local = {
    async get(keys, callback) {
        const result = keys === null ? { ...stored } : Object.fromEntries(keys.map(key => [key, stored[key]]));
        if (callback) callback(result);
        return result;
    },
    async set(items) {
        if (failNextSave) { failNextSave = false; throw new Error('storage failed'); }
        const changes = {};
        for (const [key, value] of Object.entries(items)) {
            changes[key] = { oldValue: stored[key], newValue: value };
            stored[key] = value;
        }
        listeners.forEach(fn => fn(changes, 'local'));
    },
    async remove(keys, callback) {
        const changes = {};
        for (const key of [keys].flat()) {
            changes[key] = { oldValue: stored[key] };
            delete stored[key];
        }
        listeners.forEach(fn => fn(changes, 'local'));
        if (callback) callback();
    }
};
function browser(document, pathname = '/course/view.php') {
    const window = { location: { pathname, search: '?id=100' } };
    return vm.createContext({ window, document, Date: Clock, URL, URLSearchParams, console: { log() {} },
        setTimeout: setImmediate, clearTimeout: clearImmediate,
        chrome: { storage: { local, onChanged: { addListener(fn) { listeners.push(fn); } } } },
        alert() {}, confirm: () => true });
}
function run(context, file) { vm.runInContext(fs.readFileSync(path.join(repo, file), 'utf8'), context, { filename: file }); }
async function settle() { for (let i = 0; i < 20; i++) await new Promise(setImmediate); }
function assertCounts(html, values) {
    const counts = [...html.matchAll(/class="stat-value"[^>]*>(\d+)</g)].map(m => Number(m[1]));
    assert.deepEqual(counts, values);
}
(async () => {
    const root = new Element();
    const wrapper = new Element();
    wrapper.className = 'dashboard-content-wrapper';
    root.append(wrapper);
    const links = [...data, data[0]].map(a => {
        const activity = new Element();
        return { href: a.link, textContent: a.title, dataset: {}, querySelector: () => null,
            closest: selector => selector === '.activityinstance' ? activity : null, parentElement: activity };
    });
    const document = { readyState: 'complete', createElement: () => new Element(),
        getElementById: () => root, querySelectorAll: () => links };
    const course = browser(document);
    for (const file of ['tracker-config.js', 'tracker-utils.js', 'tracker-ui.js', 'tracker-dashboard.js']) run(course, scripts + file);
    const Utils = course.window.GistAssignmentTracker.Utils;
    assert.equal(Utils.getAssignmentStatus('2026-09-30 22:00', false, 8).status, 'remaining');
    assert.equal(Utils.getAssignmentStatus('2026-09-30 22:00', false, 10).status, 'urgent');
    assert.equal(Utils.getAssignmentStatus('2026-09-30 12:00', false, 24).status, 'urgent');
    assert.equal(Utils.getAssignmentStatus('2026-09-30 11:59', false, 24).status, 'overdue');
    assert.equal(Utils.getAssignmentStatus('2026-09-29 12:00', true, 24).status, 'submitted');
    const fetched = [];
    let finishFetch;
    course.window.GistAssignmentTracker.Api = { async fetchAssignmentDetails(url, id) {
        fetched.push(id);
        return new Promise(resolve => { finishFetch = () => resolve(data.find(a => a.id === id)); });
    } };
    run(course, scripts + 'tracker-main.js');
    await settle();
    assert.equal(links[5].parentElement.children[0].children[0].textContent, '다시 추적', 'buttons render while data is loading');
    finishFetch();
    await settle();
    assert.deepEqual(fetched, ['6'], 'excluded assignments still fetch; valid caches are reused');
    assertCounts(wrapper.innerHTML, [1, 1, 1, 2]);
    assert(wrapper.innerHTML.indexOf('마감 임박 과제') < wrapper.innerHTML.indexOf('마감 지남 과제'));
    assert(!wrapper.innerHTML.includes('과제 6'));
    const controls = links.map(link => link.parentElement.children[0]);
    const details = links.map(link => link.parentElement.children[1]);
    details.forEach((el, i) => assert.equal(el.hidden, i !== 5));
    assert.equal(controls[0].children[0].textContent, '추적 제외');
    assert.equal(controls[5].children[0].textContent, '다시 추적');

    const courseDiv = new Element();
    const card = { querySelector: selector => selector === 'a.course_link' ? { href: 'https://lms.gist.ac.kr/course/view.php?id=100' } : courseDiv };
    const home = browser({ readyState: 'complete', createElement: () => new Element(),
        querySelector: () => null, querySelectorAll: () => [card] }, '/');
    home.fetch = async () => ({ text: async () => '' });
    home.DOMParser = class { parseFromString() { return { querySelectorAll: () => links }; } };
    run(home, scripts + 'tracker-utils.js');
    run(home, scripts + 'course-list-parser.js');
    await settle();
    const homeStats = courseDiv.children[0];
    assertCounts(homeStats.innerHTML, [1, 1, 1, 2]);

    await controls[0].children[0].events.click();
    await settle();
    assert.equal(stored.excludedAssignment_1, true);
    assert.equal(controls[0].children[0].textContent, '다시 추적');
    assert.equal(controls[6].children[0].textContent, '다시 추적', 'duplicate links stay synchronized');
    assert.equal(details[0].children[0].textContent, '추적 제외됨');
    assert.equal(details[0].hidden, false);
    assertCounts(wrapper.innerHTML, [1, 0, 1, 2]);
    assertCounts(homeStats.innerHTML, [1, 0, 1, 2]);
    await controls[6].children[0].events.click();
    await settle();
    assert(!('excludedAssignment_1' in stored));
    assertCounts(wrapper.innerHTML, [1, 1, 1, 2]);
    assertCounts(homeStats.innerHTML, [1, 1, 1, 2]);
    assert.deepEqual(fetched, ['6'], 'restoring does not add a new fetch');

    await local.set({ options: { tracker: { urgentThresholdHours: 8, enableAssignmentDetail: true } } });
    await settle();
    assertCounts(wrapper.innerHTML, [1, 0, 1, 3]);
    assertCounts(homeStats.innerHTML, [1, 0, 1, 3]);
    assert(details[0].innerHTML.includes('미제출'));
    assert.equal(details[0].hidden, false);
    assert.equal(details[5].hidden, false);
    assert.equal(details[5].children[0].textContent, '추적 제외됨');
    failNextSave = true;
    await controls[0].children[0].events.click();
    assert.equal(controls[0].children[0].textContent, '추적 제외');
    assert.equal(controls[0].children[0].disabled, false);
    assert(!('excludedAssignment_1' in stored));

    const options = browser({ addEventListener() {}, getElementById: () => new Element() });
    run(options, 'src/options/options.js');
    vm.runInContext('clearCache()', options);
    await settle();
    assert.equal(stored.excludedAssignment_6, true);
    assert(stored.options);
    assert(!Object.keys(stored).some(key => key.startsWith('assignment_')));
    const reload = browser({});
    run(reload, scripts + 'tracker-utils.js');
    await reload.window.GistAssignmentTracker.Utils.loadExcludedAssignments();
    assert(reload.window.GistAssignmentTracker.Utils.excludedAssignmentIds.has('6'));
    console.log('tracker checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
