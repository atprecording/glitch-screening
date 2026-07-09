// Pure, testable core of the glitch on/off decision.
// Kept separate from DOM/video code so it can be unit tested with plain `node`
// (see /test/glitch-logic.test.js).

function computeGlitchUntil(now, durationMs) {
  // Every trigger just resets the "on" window to durationMs from *now*.
  // There is no separate on/off flag and no stacked setTimeouts, so two
  // triggers arriving close together simply extend the window instead of
  // leaving it stuck on or switching back early.
  return now + durationMs;
}

function isGlitchActive(glitchUntil, now) {
  return now < glitchUntil;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeGlitchUntil, isGlitchActive };
} else {
  window.GlitchLogic = { computeGlitchUntil, isGlitchActive };
}
