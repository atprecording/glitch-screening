const assert = require('assert');
const { computeGlitchUntil, isGlitchActive } = require('../player/glitch-logic.js');

// A single trigger turns the glitch on for the full duration, then off.
{
  const now = 1000;
  const glitchUntil = computeGlitchUntil(now, 5000);
  assert.strictEqual(isGlitchActive(glitchUntil, now), true);
  assert.strictEqual(isGlitchActive(glitchUntil, now + 4999), true);
  assert.strictEqual(isGlitchActive(glitchUntil, now + 5000), false);
}

// Two triggers arriving close together extend the window instead of
// getting stuck on, or being cut short by the first trigger's deadline.
{
  let glitchUntil = computeGlitchUntil(1000, 5000); // on until 6000
  glitchUntil = computeGlitchUntil(1200, 5000); // 2nd press at 1200, on until 6200
  assert.strictEqual(
    isGlitchActive(glitchUntil, 6100),
    true,
    'should still be glitching after the 2nd press extended it past the 1st deadline'
  );
  assert.strictEqual(
    isGlitchActive(glitchUntil, 6200),
    false,
    'should turn off exactly at the extended deadline, not stay stuck on'
  );
}

// A burst of rapid triggers never leaves it stuck on forever - it always
// turns off exactly durationMs after the *last* trigger in the burst.
{
  let glitchUntil = 0;
  const start = 0;
  for (let i = 0; i < 20; i++) {
    glitchUntil = computeGlitchUntil(start + i, 5000); // presses at t=0..19
  }
  assert.strictEqual(isGlitchActive(glitchUntil, start + 19 + 4999), true);
  assert.strictEqual(isGlitchActive(glitchUntil, start + 19 + 5000), false);
}

console.log('glitch-logic tests passed');
