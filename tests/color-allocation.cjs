const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the actual application functions with a deadline so a regression
// reports a failure instead of hanging the test process like the browser.
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const start = source.indexOf('  function normalizeColorStore()');
const end = source.indexOf('  function parseDays(', start);
assert.ok(start >= 0 && end > start);
const functions = source.slice(start, end);

for (const count of [12, 13, 21, 100]) {
  const state = {
    courses: Array.from({ length: count }, (_, i) => ({ id: `course-${i}` })),
    courseColors: { map: {}, nextIndex: 0 },
    progress: { 'course-0': [1, 2, 3] }
  };
  const context = vm.createContext({ state, STORAGE: { colors: 'colors' }, saveJSON() {} });
  vm.runInContext(functions + '\nensureCourseColors();', context, { timeout: 1000 });
  assert.equal(Object.keys(state.courseColors.map).length, count);
  const saved = JSON.stringify(state.courseColors);
  vm.runInContext('ensureCourseColors();', context, { timeout: 1000 });
  assert.equal(JSON.stringify(state.courseColors), saved, 'Existing colors must be stable');
  state.courses.push({ id: 'new-course' });
  vm.runInContext('ensureCourseColors();', context, { timeout: 1000 });
  assert.equal(Object.keys(state.courseColors.map).length, count + 1);
  assert.deepEqual(state.progress, { 'course-0': [1, 2, 3] });
  console.log(`PASS: ${count} courses, repeat render, new course and preserved progress`);
}
