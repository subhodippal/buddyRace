# বাডি রেস — Buddy Race

A silly 3D browser race. Four hostel friends (তুমি, বাবলু, পিন্টু, হাবলু) get into a fight in the hostel, and the fight turns into a chase. It runs through the college campus, the streets of Kolkata, a crowded market, village dirt roads and over a river bridge. They slap, kick, whack and throw stones at each other the whole way, while dodging rickshaws, autos, totos, bikes, cows, goats, chickens, potholes, open drains and a gang of street dogs. At the finish line the **Hostel Superintendent** is waiting. He catches them all and marches them back to the hostel.

- **A different story every race:** the last luchi, the missing egg, the lucky pen, results day, the toothpaste prank, the torn pant, the broken glasses.
- **10 levels:** College to the Para, Market Rush, Village Dirt Road, By the River, The Grand Chase, The Long Bridge, Lane Maze, Paddy Field Trail, Hill Road, and Final: Super Showdown. The road curves (including long circular bends), goes over hills and bumpy off-road stretches, narrows into lanes, passes a Y-junction, and crosses a river on a bridge.
- **Health bars** for everyone. **রসগোল্লা** pickups heal you.
- **Group brawls:** twice per race everyone bunches up for 10 seconds of ধিসুম ধিসুম. Mash HIT. The best fighter gets a speed boost.
- **Bystanders** wave and shout comments. The runners trash-talk each other ("ধর ধর!", "পালাবি কোথায়?", "ধর বাটাকে!", "হনু কোথাকার!").
- **Settings → খেলা → গালাগালি: বন্ধ / চালু.** চালু turns on Bengali slang for grown-up groups, from mild teasing ("কানা ডোচা", "বোকা পাঁঠা") to uncensored khisti. It is **off by default**.
- **Three mobile control layouts** (Settings → Mobile):
  - **Gyro** (default): tilt left / right to steer, tilt the top towards you to jump and away to crawl. All the Slide swipes work too. Sensitivity has − / + buttons with 10 levels (default 4, the gentle side of normal), plus options to swap up / down, invert steering and re-centre.
  - **Slide:** swipe anywhere on the screen. Slide left / right (keep the finger down) to steer, swipe up to jump, swipe down to crawl. Each finger works on its own, so one thumb can steer while the other swipes.
  - **Buttons:** ◀ ▶ at bottom-left, and jump, crawl, hit and sprint buttons on the right (a column of four in portrait).

  Slide and Gyro also have 🏃 sprint and 👊 hit buttons: side by side at the bottom-right in landscape, in the two bottom corners in portrait. Left-handed mode mirrors all of it. The gyro needs HTTPS on phones (GitHub Pages is fine; a plain `http://192.168…` LAN address is not).
- **All in-game text is Bengali.**
- **Mobile plays in portrait or landscape.** Turn the phone any time; the camera widens in portrait and the gyro re-centres itself. On Android the game goes fullscreen on the first tap.
- **Crawl under things:** some roads are blocked by two men carrying a bamboo ladder across, a wooden beam on sawhorses, or a big fallen tree. They are too high to jump, so crawl under them (slower, no sprint). Walk into one standing up and you bang your head.
- **Equal speeds.** Every runner, AI included, has the same top speed and the same sprint: 4 seconds full, 15 seconds to refill.
- **Four ways to play:** **একা খেলো** (single player), **বন্ধুদের রুম** (a friends' room online with a code or link), **অনলাইন ম্যাচ** (matched with strangers online), and **Wi-Fi / হটস্পট রুম** (everyone on the same Wi-Fi or phone hotspot, even with no internet). Up to 4 players; computer runners fill the empty seats.
- **Installable app (PWA):** on Android (Chrome, Edge, Samsung Internet) tap **📲 ফোনে ইনস্টল করো** on the title screen, or the browser's *Install app*. On iPhone: Safari → Share → *Add to Home Screen*. It gets its own icon, opens fullscreen, and after the first visit it works offline (voices included). Installing needs HTTPS (GitHub Pages is fine) or `localhost`; a plain `http://192.168…` address can be played but not installed.
- **Always in Bengali:** the page tells Chrome, Edge, Safari and Firefox (desktop and mobile) never to auto-translate it.

Built with [three.js](https://threejs.org/) (a copy is in `vendor/`, so the game also loads with no internet). There is **no build step**. Music and most sound effects are synthesized in the browser. The story slides play only fast action music (no voices).

- **Voices:** the Bengali voice lines are small pre-rendered MP3 clips in `audio/voice/`, so they play in any browser, offline, even where the OS has no Bengali speech voice. Every voice is angry, and each group has its own tune:
  - `friend`: the racers, young hostel boys.
  - `bystander`: male bystanders and walkers, older men.
  - `shopkeeper`: gruff stall owners.
  - `driver`: shouting drivers.
  - `super`: Super Sir, old and deep.
  - `female`: `bystandersFemale` only.

  Lines typed in English letters (Banglish) are shown as typed and spoken in Bengali. Their Bengali spellings are in `audio/voice/spoken.json`, so you can fix any word that is pronounced wrong.

  Each speaker also gets a slightly different pitch. Settings → খেলা → **Bengali voice** turns them off.
- **Animals:** the dog, cow and goat sounds are real recordings in `audio/animals/` (credits and licences in [`audio/animals/CREDITS.md`](audio/animals/CREDITS.md)).
- **Comments:** every speech bubble comes from [`comments.json`](comments.json). It has three parts:
  - `noSlangs`: clean lines.
  - `slangs`: used only when গালাগালি is On.
  - `common`: walkers, shopkeepers, story chase lines and per-level bystander/shopkeeper lines.

  `noSlangs` and `slangs` each hold `bystandersMale`, `bystandersFemale`, `friendsChase`, `friendsBrawl`, `friendsFall` (slips, drains, potholes, getting hit), `drivers` and `superSir`. Edit the file by hand and reload the page.

If you add or change lines in `comments.json`, regenerate the clips. This needs internet, `ffmpeg` and [edge-tts](https://pypi.org/project/edge-tts/), and only new lines are rendered:

```bash
pip install edge-tts      # once
node tools/make-voices.mjs
```

## Play locally

ES modules don't load from `file://`, so serve the folder with the included zero-dependency server (no `npm install` needed):

```bash
node server.js          # or: npm start
# open http://localhost:8000
node server.js 3000     # use a different port
```

The server also prints a `Phone:` address, so you can play on your phone over the same Wi-Fi.

## Controls

You run automatically. All controls can be remapped from **⏸ → ⚙ Controls** (or **Controls** on the title screen). Settings are saved in your browser.

| Action | Keyboard | Gamepad | Touch |
|---|---|---|---|
| Move left / right | `A` `D` / `←` `→` | Left stick / D-pad | tilt (Gyro), slide anywhere (Slide), ◀ ▶ (Buttons) |
| Sprint (hold, uses stamina "দম") | `Shift` / `↑` | RT / RB | 🏃 জোরে |
| Jump (potholes, barricades, cows, goats, dog bites) | `Space` | A / ✕ | swipe up, tilt up (Gyro), or ⤒ |
| Crawl (hold: ladders, beams, fallen trees) | `S` / `↓` | B / ○, D-pad ↓ | swipe down, tilt down (Gyro), or ⤓ |
| Hit | `Ctrl` / `F` | X / □ | 👊 মার |
| Change camera (behind / top) | `C` | Y / △ | 🎥 |
| Pause menu | `Esc` / `P` | Start | ⏸ |
| Mute | `M` | Back | 🔊 |

**Hit picks the right move for you.** If you're holding a stick, you whack them with it. Someone beside you gets slapped. Someone in front of or behind you gets kicked. If nobody is close and you have stones, you throw one at the nearest buddy ahead. You can hit as many times as you like, and you keep the stick for the rest of the race.

**Stones and sticks are picked up automatically** when you run over them. Each stone pickup gives you 3 stones.

**Multiplayer:** up to 4 players. The host's browser runs the race, so the host should have the best connection.

- **বন্ধুদের রুম (friends' room):** tap **রুম বানাও**, then share the 5-letter code or **আমন্ত্রণ লিঙ্ক** (`…?room=CODE`). Friends type the code and tap **যোগ দাও**. The host picks a level and starts.
- **অনলাইন ম্যাচ (online match):** tap **ম্যাচ খোঁজো**. You join a public room that has a free seat. If none is waiting, you open one and wait. It starts by itself after 30 seconds (or as soon as 4 players are in) on a random level.
- **Wi-Fi / হটস্পট রুম:** for everyone on one Wi-Fi network or phone hotspot.
  - **With no internet:** one laptop on that network runs `node server.js`, and everyone opens the `Phone:` address it prints. Rooms then appear in a list to tap; no code needed. The server relays the game, nothing goes to the internet.
  - **On the normal website:** this mode makes an ordinary room. Players find each other through the internet, but the game data then goes directly between the phones over the shared Wi-Fi.

Online rooms and matches are peer-to-peer over WebRTC through the free [PeerJS](https://peerjs.com/) matchmaking server, so they work on GitHub Pages with no game server. Some strict networks (corporate or university firewalls) block peer-to-peer connections.

**Dog gang:** twice per race, street dogs chase you, running right behind and beside you and lunging for bites. Jump to dodge a bite, or hold sprint to outrun them (panic sprint: windmill arms, dust trail, speed lines).

The Touch tab lets you turn the on-screen buttons on or off (Auto shows them on phones), change their size and opacity, and swap sides for left-handed play.

## Host on GitHub Pages

1. Create a GitHub repo and push this folder to the `main` branch.
2. In the repo, go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
3. The included workflow (`.github/workflows/pages.yml`) publishes the site on every push to `main`. It will be at `https://<user>.github.io/<repo>/`.

If you don't want to use Actions, choose **Deploy from a branch** and pick `main` / `(root)` instead. All paths are relative, so either option works.

## Project layout

```
index.html        page, HUD, touch controls, screens
css/style.css     UI, story-slide animations
js/main.js        game loop, runners, AI, combat, brawls, dog gang, superintendent, camera, HUD, multiplayer sync
js/track.js       curved / hilly road centre-line (track space ↔ world space)
js/levels.js      the 10 level layouts
js/stories.js     hostel stories, dialogue + khisti lines, intro & ending scenes
sw.js             service worker: offline cache for the installable app
icons/            app icon (icon.svg is the source; PNGs made with rsvg-convert)
js/net.js         rooms: online (PeerJS), online matchmaking, Wi-Fi / hotspot (WebSocket relay in server.js)
js/input.js       keyboard / gamepad / touch input, remapping, controls menu
js/world.js       scenery chunks along the curve: campus, city, market, village, river, bridge
js/models.js      low-poly buddies, rickshaw, cycle, auto, toto, bike, dog, cow, goat, obstacles
js/intro.js       comic slide player
js/audio.js       WebAudio sound effects and chase music, optional Bengali TTS
```

Debug: `?z=1500` in the URL starts the race 1500 m in.
