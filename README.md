# Glitch Screening

A live-screening gimmick: audience members press a big red button on their
phones, and your playback page briefly swaps the main film for a
frame-synced "glitch track" for a few seconds before switching back.

- `/player/index.html` — your playback page, **runs locally on your laptop, never deployed**
- `/button/index.html` — the audience page, deployed to Netlify (send this link/QR to phones)
- `/netlify/functions/trigger.js` — serverless counter + cooldown lock, deployed to Netlify

## Why the player isn't deployed

Film video files are way too big for git/Netlify: GitHub hard-rejects any
single file over 100MB on push, and Netlify's large-file handling (Git LFS)
only gives 1GB/month free — nowhere near enough for two feature-length
videos. So `/player/` just stays on your laptop and reads `main.mp4` /
`glitch.mp4` straight off local disk — which is also more reliable for a
live show than streaming multi-GB video over venue wifi in real time.
Only the tiny `/button/` page and the trigger function go to Netlify.

## 1. Add your video files

Drop your two videos straight into the `player/` folder, named exactly:

```
player/main.mp4
player/glitch.mp4
```

Both must be the same length and frame-synced edits of the same film —
they play in parallel from the moment you hit Start, and are never paused
or seeked, only muted/unmuted and shown/hidden. They're gitignored, so
they'll never accidentally get committed or pushed.

## 2. Deploy `/button` and the function to Netlify

1. Push this folder to a git repo (GitHub/GitLab/Bitbucket) — the video
   files are gitignored so this stays small even though they're on disk.
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
3. Build settings are already defined in `netlify.toml` (publish `.`,
   functions in `netlify/functions`, build command `npm install` — just
   needed to install the `@netlify/blobs` dependency for the function).
4. Deploy. Netlify Blobs needs no extra setup or credentials — it's scoped
   to the site automatically.

You'll end up with:

- `https://<your-site>.netlify.app/button/` — share this (or a QR code of it) with the audience
- `https://<your-site>.netlify.app/.netlify/functions/trigger` — the function URL

Copy that function URL into `FUNCTION_URL` at the top of `player/index.html`
(it's currently a placeholder `YOUR-SITE-NAME.netlify.app`) — the player
needs the full URL since it's no longer on the same domain as the function.

## 3. Running it

1. Open `player/index.html` on your laptop straight from disk (double-click
   it, or run a tiny local server like `python3 -m http.server` from inside
   `player/` and open `http://localhost:8000`). Click **Start** — autoplay
   needs a user gesture, hence the button. Both videos start playing in
   sync; only the main track is audible.
2. Screen-share that browser tab/window (with audio) into Teams.
3. Audience opens `/button/` and presses the red button whenever they like.
   Every ~300ms the player checks the server for new presses and swaps to
   the glitch track for 5 seconds, then swaps back.
4. If the network trigger is ever flaky, press **g** on the player's
   keyboard to fire a glitch locally (doesn't touch the server counter).
5. Use the **Fullscreen** button on the player for a clean screen-share.

## 4. Resetting between screenings

The counter and cooldown lock persist (via Netlify Blobs) until you reset
them. Visit, in a browser:

```
https://<your-site>.netlify.app/.netlify/functions/trigger?reset=resetfilm2026
```

That secret word lives as `RESET_WORD` at the top of
`netlify/functions/trigger.js` — change it to something only you know
before your first real screening, since anyone with the word can reset
mid-show.

## 5. Tuning

Everything you're likely to want to tweak is a constant at the top of each file:

| File | Constant | What it does |
|---|---|---|
| `player/index.html` | `GLITCH_MS` | how long the glitch track stays up per press |
| `player/index.html` | `POLL_MS` | how often the player checks the server for new presses |
| `button/index.html` | `COOLDOWN_S` | client-side cooldown display (seconds) |
| `netlify/functions/trigger.js` | `COOLDOWN_MS` | server-enforced cooldown (must match `COOLDOWN_S * 1000`) |
| `netlify/functions/trigger.js` | `RESET_WORD` | the `?reset=` secret |

## 6. Testing the glitch toggle logic

The on/off decision for the glitch overlay is a small pure function in
`player/glitch-logic.js`, kept separate from the video/DOM code so it's
easy to test without a browser. It works by tracking a single
`glitchUntil` timestamp rather than a boolean flag or stacked timers, so
if two triggers land close together the window just extends — it can
never get stuck "on" or flip back to main early. Run the test with:

```
node test/glitch-logic.test.js
```

## Notes

- No accounts, cookies, or per-user data — the button page only ever
  sends a bare POST with no identifying info.
- The server-side lock is checked and set in one function call, so two
  presses arriving at the exact same millisecond could in the rare case
  both slip through before the lock is written (a lost update on the
  counter, not the cooldown) — harmless for a live-audience gimmick, not
  worth the extra complexity of a compare-and-swap for this use case.
