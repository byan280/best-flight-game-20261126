# Skyway

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/byan280/best-flight-game-20261126/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/byan280/best-flight-game-20261126/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Skyway is a tiny flight game that lives in one self-contained HTML page.
You pilot a little plane across a scrolling sky, thread golden rings to
build a combo, collect stars for points, and grab fuel cans before the
tank runs dry. Mountains, birds, balloons, and storms get in the way,
and the sky itself shifts from day to dusk to night as you fly farther.

This repository is an entry for the
[best-flight-game-20261126-0057 bounty on make.fun](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057).

## Play it

Build the page, then open it in any modern browser:

```sh
node main.ts
```

That writes `out/index.html`. Open that file in a browser and press
**TAKE OFF**. Your best score is remembered in the browser between
visits. No server, no packages, and no downloaded assets are involved:
the picture is drawn on a canvas and every sound is synthesized in
code while you play.

## Controls

- **Hold Up / W / touch** — climb. **Down / S** — dive.
- **Left / Right** or **A / D** — fly slower / faster.
- **P** — pause. **M** — mute the sound. **Space / Enter** — start,
  restart, or resume.
- On a touch screen, hold anywhere on the canvas to climb.

## What to watch for

- **Rings** raise your combo multiplier; threading three in a row makes
  the third one worth double.
- **Stars** are worth 25 points each. **Fuel cans** refill the tank and
  add 10 points.
- An empty tank leaves the engine weak, and storms, birds, balloons,
  and mountains cost one of your three lives. Wind gusts shove the
  plane around for a few seconds at a time.

## Building somewhere else

`main.ts` needs only Node. If the folder the script lives in cannot be
written to, set `MAKEFUN_OUTPUT_DIR` to a writable folder and the page
is written there instead:

```sh
MAKEFUN_OUTPUT_DIR=/tmp/skyway-out node main.ts
```

The script prints the page size and a short check summary when it
finishes. The generated file is `index.html` inside the output folder.
