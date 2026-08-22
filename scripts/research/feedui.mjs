// feedui.mjs — the scrolling part of the full-screen sheets, in one place.
//
// phone.html and edits.html are the same feed: one picture per screen, snapped
// to the middle, a tick in the corner. They had two copies of the scroll code
// and both copies had the same faults. This file is the single copy.
//
// ---------------------------------------------------------------------------
// ROUND TWO. The first pass fixed three real things and Charlie's answer was
// "didn't help, going up is broken, down is fine". That sentence is worth more
// than the three fixes: it says the fault is DIRECTIONAL, and nothing in round
// one was. Ten real touch flings upward in a phone-sized headless Chrome land
// one slide at a time, never more than 2 px off the snap point, never on a
// blank slide — so whatever it is, it is not in the snap or in the recycler,
// and it does not exist on a desktop. Two things are up-only on a phone:
//
// A. THE ADDRESS BAR. Every mobile browser hides its toolbar on the way down
//    and brings it back THE MOMENT YOU SCROLL UP. While it moves, 100dvh
//    changes — that is what the d in dvh means — so all 576 slides change
//    height at once, the offset you are sitting at stops pointing at the slide
//    it pointed at, and mandatory snap resolves the contradiction by moving
//    you. Downward it happens once, at the start. Upward it happens on every
//    single gesture. So the feed is no longer measured in dvh: the height is
//    taken once, in pixels, and never given back. The bar may come and go; the
//    layout does not hear about it.
//
// B. SCROLL ANCHORING, which I gave it myself in round one. Chrome watches for
//    layout changes ABOVE the viewport and silently adjusts scrollTop to
//    compensate. Scrolling down, the recycler puts images in below the
//    viewport, where anchoring does not look. Scrolling up, it puts them in
//    two slides ABOVE — exactly what anchoring exists to react to. That is a
//    correction fighting a snap, up only, and new since round one. Turned off.
//
// Both are unproven on the actual phone and both are cheap. The panel now
// reports every distinct viewport height it has seen: one number means the bar
// never moved and theory A is wrong.
//
// ---------------------------------------------------------------------------
// ROUND ONE, still standing:
//
// 1. EVERY SLIDE STAYED DECODED. A 1080×2340 frame is 10.1 MB as a bitmap
//    (1080 · 2340 · 4 bytes). phone.html holds 576 of them and edits.html 474.
//    `loading="lazy"` stops them being FETCHED early; it does nothing about
//    keeping them decoded afterwards. Scroll a hundred slides in and the phone
//    is holding a gigabyte of bitmaps, so it starts throwing them away and
//    decoding them again — including the one under your thumb, mid-flick.
// 2. THE INDEX CAME FROM window.innerHeight, THE SCROLLER WAS 100dvh. The
//    error is multiplied by the slide number, and `jump to first unseen`
//    multiplied it outright: at slide 50 a 60 px disagreement is 3000 px.
//    Everything measures the scroller itself now.
// 3. backdrop-filter ON EVERY TICK. A blur that samples what is behind it has
//    to re-read the frame whenever the picture under it moves — which, in a
//    scrolling feed, is every frame. One per slide. Removed at the call site.
//
// Also: localStorage is a synchronous write, so `setItem` inside the scroll
// handler stalls the exact frame it is trying to keep smooth. Deferred.
//
// What is deliberately NOT changed: `scroll-snap-type: y mandatory` and
// `scroll-snap-stop: always` stay. Charlie asked to keep the snap, and
// snap-stop is the rule that says a flick may not pass more than one picture.

// The scroller and the slide. --h is set once by the script below, in pixels;
// the dvh in the fallback is only what shows in the instant before it runs.
export const feedCss = `
 html, body { overflow:hidden }
 /* Fixed, so the page root has nothing to scroll and the browser has no reason
    to animate its toolbar in the first place. If it animates anyway, --h does
    not change and neither does anything else. */
 main { position:fixed; top:0; left:0; width:100%; height:var(--h,100dvh);
        overflow-y:scroll; scroll-snap-type:y mandatory;
        overscroll-behavior-y:contain; overflow-anchor:none }
 .s { position:relative; height:var(--h,100dvh); scroll-snap-align:start; scroll-snap-stop:always;
      display:flex; align-items:center; justify-content:center; background:#000;
      overflow-anchor:none }
 .s img { width:100%; height:100%; object-fit:cover; display:block }`;

// "copy didn't work on the phone, had to copy manually" — and it could not
// have. The sheets are served over plain http on the LAN, and navigator
// .clipboard is gated behind a secure context, so on the phone it simply is not
// there. The old handler awaited it, landed in the catch, and did `ids.select()`
// — which selects the text and copies nothing, which is exactly what Charlie
// saw. execCommand('copy') is deprecated and is the one that works on http, so
// it goes first now and the Clipboard API is the fallback rather than the rule.
// Expects `ids` (the textarea) and a #copy button.
export const copyJs = `
el('copy').addEventListener('click', async () => {
  const b = el('copy');
  ids.focus();
  ids.setSelectionRange(0, ids.value.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch {}
  if (!ok && navigator.clipboard) {
    try { await navigator.clipboard.writeText(ids.value); ok = true; } catch {}
  }
  b.textContent = ok ? 'copied' : 'selected — copy it by hand';
  setTimeout(() => { b.textContent = 'copy'; }, 1600);
});`;

// A slide's <img> carries data-crop (and data-full where there is a second
// view). It carries no src: src is what this code hands out and takes back.
//
//   seenKey  localStorage key for the furthest slide reached
//   label    a statement run on every slide change, with `i` in scope
//   full     true if tapping a slide swaps in a second, larger image
//
// Expects `el`, `slides` and a <main id="feed"> to exist already.
export const feedJs = ({ seenKey, label, full = false }) => `
const feed = el('feed');
const SEEN = ${JSON.stringify(seenKey)};
let seen = 0;
try { seen = Number(localStorage.getItem(SEEN)) || 0; } catch {}

// The one measurement the whole feed rests on, taken once. Everything after
// this is arithmetic on a number that cannot move under it.
const vpH = () => Math.round((window.visualViewport && window.visualViewport.height) || window.innerHeight);
const heights = new Set();
function freeze() {
  const h = vpH();
  heights.add(h);
  document.documentElement.style.setProperty('--h', h + 'px');
}
freeze();
if (window.visualViewport) window.visualViewport.addEventListener('resize', () => heights.add(vpH()));

// The scroller's own height. Never window.innerHeight: on a phone that is a
// different number, and the difference gets multiplied by the slide index.
const H = () => feed.clientHeight || 1;
const at = () => Math.round(feed.scrollTop / H());

// Only a handful of slides hold an image at once. Two either side is enough to
// cover a flick — snap-stop:always means a flick can only cross one — and it
// caps what the phone has to hold at about five frames instead of five hundred.
const NEAR = 2;
const live = new Set();
const wants = s => ${full ? "s.classList.contains('open') ? s.querySelector('img').dataset.full : s.querySelector('img').dataset.crop" : "s.querySelector('img').dataset.crop"};

function keepNear(i) {
  const lo = Math.max(0, i - NEAR), hi = Math.min(slides.length - 1, i + NEAR);
  for (const j of [...live]) {
    if (j >= lo && j <= hi) continue;
    slides[j].querySelector('img').removeAttribute('src');   // lets the bitmap go
    live.delete(j);
  }
  for (let j = lo; j <= hi; j++) {
    if (live.has(j)) continue;
    const im = slides[j].querySelector('img');
    im.src = wants(slides[j]);
    live.add(j);
    // Decode it now, off the main thread, while it is still off screen — so
    // arriving at the slide costs a paint and not a decode.
    if (im.decode) im.decode().catch(() => {});
  }
}

let i0 = -1;
function show(i) {
  i0 = i;
  ${label}
  keepNear(i);
}
function goTo(i) { feed.scrollTop = i * H(); show(i); }

// The furthest-reached mark is written once the thumb stops, not per frame.
let settleT = 0;
function settle() {
  clearTimeout(settleT);
  settleT = setTimeout(() => {
    if (i0 > seen) { seen = i0; try { localStorage.setItem(SEEN, String(seen)); } catch {} }
  }, 260);
}

let raf = 0, lastMove = 0;
feed.addEventListener('scroll', () => {
  lastMove = performance.now();
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    const i = at();
    if (i === i0) return;
    show(i);
    settle();
  });
}, { passive: true });

// A tap that only stops a fling is not a request to open anything.
const flicking = () => performance.now() - lastMove < 300;

// Turning the phone is the only resize that should move anything. A toolbar
// sliding in or a keyboard opening changes the window, not the feed — round one
// put a re-anchor here for those and it was wrong: it fires in the middle of an
// upward gesture and pulls you back to where the gesture started.
let w0 = window.innerWidth;
addEventListener('resize', () => {
  heights.add(vpH());
  if (window.innerWidth === w0) return;
  w0 = window.innerWidth;
  const i = Math.max(0, i0);
  freeze();
  requestAnimationFrame(() => goTo(i));
});

// One line in the list panel, so this can be checked on the actual phone
// instead of taken on trust. Two or more heights = the toolbar is moving, and
// that was the thing breaking the way up.
function diag() {
  const d = el('diag');
  if (d) d.textContent = 'slide ' + H() + ' px · window heights seen: '
    + [...heights].join(', ') + ' · ' + live.size + ' of ' + slides.length + ' images live';
}

requestAnimationFrame(() => goTo(Math.min(Math.max(seen, 0), slides.length - 1)));`;
