// =============================================================================
// The share dialog's "Name in My work" field survives a slow link
// -----------------------------------------------------------------------------
// Opening the dialog computes the link asynchronously and, when it lands,
// used to put the focus on the link field. A student already typing a name had
// the rest of it swallowed, the field stayed empty and the item was saved under
// the scenario's name. The press must also keep what it saw, not what a refresh
// left behind while the module loaded.
// =============================================================================

import { describe, expect, test, jest } from '@jest/globals';

let release;
const encodePayload = jest.fn(
  () =>
    new Promise(resolve => {
      release = () => resolve('FRAG');
    })
);
const saved = [];

jest.unstable_mockModule('../js/ui.js', () => ({
  captureShareState: () => ({ v: 2, s: 'None', seed: '7' }),
  applyShareState: () => {},
  initialize_simulation: () => {},
  show_enhanced_scenario_info: () => {},
}));
jest.unstable_mockModule('../js/timeline.js', () => ({ getSimClock: () => 0 }));
jest.unstable_mockModule('../js/shareState.js', () => ({
  encodePayload,
  decodePayload: async () => null,
  shareUrl: f => `http://x/#${f}`,
  COMFORTABLE_URL_LENGTH: 2000,
}));
jest.unstable_mockModule('../js/rng.js', () => ({
  getWorldSeed: () => '7',
  formatSeed: s => String(s),
  parseSeed: s => s,
}));
jest.unstable_mockModule('../js/notify.js', () => ({
  toast: () => {},
  announce: () => {},
}));
jest.unstable_mockModule('../js/investigationsLoader.js', () => ({
  activityInHash: () => false,
  assignmentInHash: () => false,
  lessonInHash: () => false,
  packInHash: () => false,
}));
jest.unstable_mockModule('../js/myWork/made.js', () => ({
  scenarioRecord: r => r,
  saveMade: r => (saved.push(r), { ok: true }),
}));

describe('share dialog name field', () => {
  test('a late link does not take the focus from the name being typed', async () => {
    document.body.innerHTML = `
      <button id="shareBtn"></button>
      <div id="shareModal" class="hidden"><div id="shareContent">
        <input id="shareUrl" readonly><button id="shareCopyBtn"></button>
        <button id="shareKindSeeded"></button><button id="shareKindFull"></button>
        <input type="checkbox" id="shareCamera">
        <p id="shareMeta"></p><p id="shareWarning"></p><p id="shareStale"></p>
        <div id="shareSeedRow"><input id="shareSeed"></div>
        <button id="shareRerollBtn"></button><button id="shareEmbedBtn"></button>
        <input id="shareMineName"><button id="shareMineBtn"></button>
        <a id="shareFigureLink"></a><button id="shareCloseBtn"></button>
        <button id="shareCloseChip"></button>
      </div></div>`;
    const share = await import('../js/share.js');
    share.initShare();
    await share.openShareDialog();
    await new Promise(r => setTimeout(r, 5)); // refresh is waiting on the link
    const name = document.getElementById('shareMineName');
    // The student moves into the name field while the link is still computing.
    name.focus();
    name.value = 'My tides copy';
    release();
    await new Promise(r => setTimeout(r, 20));
    expect(document.activeElement).toBe(name);
    expect(name.value).toBe('My tides copy');

    // And the press saves the typed name.
    document.getElementById('shareMineBtn').click();
    await new Promise(r => setTimeout(r, 20));
    expect(saved.at(-1).name).toBe('My tides copy');
  });
});
