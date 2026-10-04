// Run: node tests/tracker-check.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/features/assignment-tracker/content-scripts/tracker-utils.js'), 'utf8'), context);
const utils = context.window.GistAssignmentTracker.Utils;
const now = new Date(2026, 8, 30, 12);
const status = (deadline, submitted, hours) => utils.getAssignmentStatus(deadline, submitted, hours, now).status;
assert.equal(status('2026-09-30 22:00', false, 8), 'remaining');
assert.equal(status('2026-09-30 22:00', false, 10), 'urgent');
assert.equal(status('2026-09-30 12:00', false, 24), 'urgent');
assert.equal(status('2026-09-30 11:59', false, 24), 'overdue');
assert.equal(status('2026-09-29 12:00', true, 24), 'submitted');
assert.equal(status(null, false, 24), 'remaining');
console.log('assignment status checks passed');
