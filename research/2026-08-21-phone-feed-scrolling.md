# Why the phone feed stuttered and skipped

21 August 2026.

> fix scroll on /phone, it's jerky and sometimes skips several photos. i like
> that it snaps a picture in the center, would be nice to conserve that

The snap stays. `scroll-snap-type: y mandatory` and `scroll-snap-stop: always`
are untouched — snap-stop is precisely the rule that says a flick may not pass
more than one picture, so the skipping was never the snap giving up. Something
else was moving the floor under it.

Three faults, in the order they matter. `phone.html` and `edits.html` had two
copies of the scroll code and both copies had all three.

---

## 1. Every slide stayed decoded

A 1080×2340 frame is **10.1 MB as a bitmap** (1080 · 2340 · 4 bytes). The feed
holds 576 of them, and `/edits` another 474.

`loading="lazy"` was doing the job it is for and not the job that was needed. It
delays the **fetch**; it does nothing about what happens after. Once an image
has loaded it stays attached to its `<img>` for the life of the page. Scroll a
hundred slides in and the phone is asked to hold a gigabyte of bitmaps, so it
starts throwing them away and decoding them again — including the one under the
thumb, mid-flick.

Measured over a 30-slide walk in a phone-sized headless Chrome:

```
now:     5 images alive at the end
before: 31 images alive at the end     (one per slide walked, kept forever)
```

Now a window of five follows the current slide: two either side, everything else
has its `src` removed outright, which is what actually lets the bitmap go.
Two either side is enough — snap-stop means a flick can only cross one — and the
next slide is handed to `img.decode()` while it is still off screen, so arriving
at it costs a paint and not a decode.

## 2. The index was measured with the wrong ruler

The scroller is `100dvh`. The code asked `window.innerHeight`.

On a desktop those are the same number and nothing shows. On a phone they are
not: `dvh` follows the address bar, `innerHeight` is the layout viewport. And
the error is not constant — **it is multiplied by the slide number**:

```js
feed.scrollTo({ top: seen * window.innerHeight })   // "jump to first unseen"
```

At slide 50, a 60 px disagreement is 3000 px — a page and a half past where it
meant to land, and then mandatory snap yanks it to whatever slide that turned
out to be. That is exactly what *"it skipped several photos"* looks like, and it
would happen on every restore, every jump, and creepingly in the counter.

Everything now measures the scroller itself (`feed.clientHeight`), so the ruler
and the thing being measured are the same object.

**This one is not proven on the phone.** A desktop headless Chrome reports
`scroller 915 px · innerHeight 915 px`, so the bug is invisible where it can be
tested. That is why the list panel now prints both numbers on the device: if
they differ there, this was the skipping.

## 3. A blur behind every tick

`.tick` had `backdrop-filter: blur(8px)` — one per slide, 576 of them. A filter
that samples what is *behind* an element has to re-read the frame whenever what
is behind it moves, which in a scrolling feed is every frame of every scroll. On
a dark photograph a flat `#000a` disc with a shadow is indistinguishable, so the
blur was paying for nothing.

## Also

- **`localStorage` is a synchronous write.** `setItem` was being called from
  inside the scroll handler, stalling the exact frame it was trying to keep
  smooth. The furthest-reached mark is now written 260 ms after the thumb stops.
- **A tap that only stops a fling no longer opens anything.** On `/phone` that
  tap swapped in the 1600 px full painting — a fetch and a decode landing in the
  middle of a scroll, caused by trying to stop the scroll.
- **The viewport is re-anchored if it ever does change** (rotation, keyboard,
  address bar): the slide you were on is put back under the thumb instead of
  being left to drift.

## What was verified, and where the limit is

In a 412×915 headless Chrome against the real pages:

```
phone.html  576 slides · 5 images alive at most over a 100-slide walk
edits.html  474 slides · 5 images alive at most over a 100-slide walk
counter and scroll index agree at 25 / 50 / 75 / 100
jump to slide 300 lands 0 px off that slide's top
no page errors (the only 404 is favicon.ico)
ticks, tap-to-open, tap-to-close and the flick guard all behave
```

**The stutter itself could not be reproduced here, and so cannot be shown
cured here.** Chrome decodes images off the main thread; 30 slides at 6×
CPU throttling produced 0 ms of main-thread blocking both before and after,
because a desktop with 30 GB of memory never reaches the pressure that makes a
phone start evicting bitmaps. What is fixed are named causes with measurable
sizes — 5 live images instead of 31 and rising, an exact index instead of one
multiplied by a viewport disagreement, 0 blur layers instead of 576. Whether
that is the whole of it is a question only the phone can answer.

---

# Round two: "didn't help, going up is broken. down is fine"

That sentence is worth more than the three fixes above, because **it says the
fault is directional and nothing in round one was.** Decoding, memory, index
arithmetic and blur layers all cost the same in both directions.

First, what the desktop says. Ten real touch flings upward on the actual page,
in a 412×915 headless Chrome, dispatched as touch sequences rather than
`scrollTop` assignments:

```
slide 9.001 · off 1 px · 5 live · blank: false
slide 8.001 · off 1 px · 5 live · blank: false
...
slide 0.001 · off 1 px · 3 live · blank: false
```

One slide per flick, never more than 2 px off the snap point, never landing on a
picture that has not arrived. **Going up is provably perfect where I can test
it.** So the cause is something the desktop does not have.

## The address bar: half dead

Every mobile browser hides its toolbar going down and brings it back the moment
you scroll up. While it moves, `100dvh` changes — that is what the d means — so
every slide changes height at once. Down it happens once; up it happens on every
gesture. It fits the symptom exactly, which is why it was worth measuring rather
than believing. Shrinking the viewport by 56 px while parked on slide 40:

```
measured in dvh    slide height 915 → 859 px · scrollTop 36600 → 34360 · moved 0.000 of a slide
frozen in pixels   slide height 915 → 915 px · scrollTop 36600 → 36600 · moved 0.000 of a slide
```

Chrome re-snaps after a resize and keeps you on the same slide. **A toolbar
appearing does not skip anything.** It may still feel bad mid-gesture — the
whole feed relaying out under a moving thumb — but it does not do the thing
Charlie described, and saying it did would have been a third guess dressed as a
finding. The height is frozen in pixels anyway: a feed's layout should not
depend on a viewport that moves, and it costs nothing.

## Scroll anchoring: my own fault, and up-only

Chrome watches for layout changes **above** the viewport and silently adjusts
`scrollTop` to compensate. Round one's recycler makes exactly that kind of
change — and asymmetrically:

- scrolling **down**, it inserts images *below* the viewport, where anchoring
  never looks;
- scrolling **up**, it inserts them two slides *above*, which is precisely the
  event anchoring exists to react to.

A silent scroll correction arriving in the middle of a snap, upward only, new
since round one. `overflow-anchor: none` on the scroller and the slides.

## What is honest to say about round two

Both changes are cheap and both are correct on their own terms. **Neither is
proven to be the bug**, and one theory has already been measured down to "does
not do that". Two rounds of desktop reasoning have now been spent on a fault the
desktop cannot reproduce, so the next step is not a third theory.

## The instrument: `scrolltest.html`

`scrolltest.mjs` → 200 slides, **no photographs at all** — a number on a colour.
Nothing to download, nothing to decode, no recycler. If going up is still broken
there, then images, memory, decoding and everything in round one are innocent.

Four switches, live, no reload: `height frozen|dvh`, `snap mandatory|proximity`,
`snap-stop on|off`, `anchor off|auto`, and `photos off|on` to turn it back into
the real feed. Flip one, flick, see if it changes.

And the readout that matters: **where it landed, last eight.** A skip is a gap.

```
landed: 3, 4, 5, 4, 3, 2, 1, 0
```

That is the desktop, five flicks down and five back up, no gaps. A phone
reporting `40, 39, 36` names the fault in a way no amount of reasoning here can.

## The copy button could not have worked

> btw copy didn't work on the phone had to copy manually

Not a glitch — it was never going to. The sheets are served over plain `http` on
the LAN, and `navigator.clipboard` is gated behind a secure context, so on the
phone it is simply not there. The handler awaited it, landed in its `catch`, and
called `ids.select()` — which selects the text and copies nothing. That is
exactly what Charlie saw.

`document.execCommand('copy')` is deprecated and is the one that works on
`http`, so it goes first now and the Clipboard API is the fallback rather than
the rule. Verified on both sheets: the button reads `copied`, and if both paths
fail it says `selected — copy it by hand` instead of claiming success.

## Two things that came with it

- **`feedui.mjs`** — the scroll code is now one file, imported by both sheets.
  Two copies of the same code with the same three faults is how this got here;
  the repo already has a `still_copied_by_hand` list for the same reason.
- **`KEEP=1`** — `KEEP=1 node phone.mjs` rewrites the page and leaves the frames
  alone. Cutting 576 works out of their sources takes about a quarter of an hour
  and nothing about the pictures changes when the scrolling does. Both sheets
  reproduced their earlier statistics exactly through this path, which is also
  what proves the reuse is faithful.
