# বাডি রেস — Buddy Race

A silly 3D browser race. Four hostel friends (তুমি, বাবলু, পিন্টু, হাবলু) get into a fight in the hostel, and the fight turns into a chase. It runs through the college campus, the streets of Kolkata, a crowded market, village dirt roads and over a river bridge. They slap, kick, whack and throw stones at each other the whole way, while dodging rickshaws, autos, totos, bikes, cows, goats, chickens, potholes, open drains and a gang of street dogs. At the finish line the **Hostel Superintendent** is waiting. He catches them all and marches them back to the hostel.

- **A different story every race:** the last luchi, the missing egg, the lucky pen, results day, the toothpaste prank, the torn pant, the broken glasses.
- **10 levels:** College to the Para, Market Rush, Village Dirt Road, By the River, The Grand Chase, The Long Bridge, Lane Maze, Paddy Field Trail, Hill Road, and Final: Super Showdown. The road curves (including long circular bends), goes over hills and bumpy off-road stretches, narrows into lanes, passes a Y-junction, and crosses a river on a bridge.
- **Health bars** for everyone. **রসগোল্লা** pickups heal you.
- **Group brawls:** twice per race everyone bunches up for 10 seconds of ধিসুম ধিসুম. Mash HIT. The best fighter gets a speed boost.
- **Bystanders** wave and shout comments. The runners trash-talk each other ("ধর ধর!", "পালাবি কোথায়?", "ধর বাটাকে!", "হনু কোথাকার!").
- **Settings → খেলা → গালাগালি: বন্ধ / চালু.** চালু turns on Bengali slang for grown-up groups, from mild teasing ("কানা ডোচা", "বোকা পাঁঠা") to uncensored khisti. It is **off by default**.
- **Three mobile control layouts** (Settings → মোবাইল): **স্লাইডার** (drag a bar on the left to steer, three buttons on the right), **জাইরো** (tilt the phone like a steering wheel; sprint on the left, hit and jump on the right; sensitivity, invert and re-centre options), and the classic **বোতাম** ◀ ▶ buttons. The gyro needs HTTPS on phones (GitHub Pages is fine; a plain `http://192.168…` LAN address is not).
- **All in-game text is Bengali.**
- **Mobile plays in landscape.** Phones show a rotate screen in portrait; on Android the game goes fullscreen and locks to landscape on the first tap.
- **Equal speeds.** Every runner, AI included, has the same top speed and the same sprint: 4 seconds full, 15 seconds to refill.
- **Multiplayer:** create a room and share the code or link. Up to 4 players, and AI fills the empty seats.

Built with [three.js](https://threejs.org/) (loaded from a CDN). There is **no build step**. Music and most sound effects are synthesized in the browser. The story slides play only fast action music (no voices).

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
| Move left / right | `A` `D` / `←` `→` | Left stick / D-pad | ◀ ▶ |
| Sprint (hold, uses stamina "দম") | `Shift` / `↑` | RT / RB | 🏃 জোরে |
| Jump (potholes, barricades, cows, goats, dog bites) | `Space` | A / ✕ | ⤒ লাফ |
| Hit | `Ctrl` / `F` | X / □, B / ○ | 👊 মার |
| Change camera (behind / top) | `C` | Y / △ | 🎥 |
| Pause menu | `Esc` / `P` | Start | ⏸ |
| Mute | `M` | Back | 🔊 |

**Hit picks the right move for you.** If you're holding a stick, you whack them with it. Someone beside you gets slapped. Someone in front of or behind you gets kicked. If nobody is close and you have stones, you throw one at the nearest buddy ahead. You can hit as many times as you like, and you keep the stick for the rest of the race.

**Stones and sticks are picked up automatically** when you run over them. Each stone pickup gives you 3 stones.

**Multiplayer:** on the title screen, choose **একসাথে খেলো / Multiplayer** and then **Create room**. Share the 5-letter code, or use **Copy invite link** (`…?room=CODE`). Friends tap **Join**, and the host picks a level and starts. The connection is peer-to-peer over WebRTC through the free [PeerJS](https://peerjs.com/) matchmaking server, so it works on GitHub Pages with no game server. The host's browser runs the race, so the host should be on the best connection. Some strict networks (corporate or university firewalls) block peer-to-peer connections.

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
js/net.js         PeerJS rooms (host / join)
js/input.js       keyboard / gamepad / touch input, remapping, controls menu
js/world.js       scenery chunks along the curve: campus, city, market, village, river, bridge
js/models.js      low-poly buddies, rickshaw, cycle, auto, toto, bike, dog, cow, goat, obstacles
js/intro.js       comic slide player
js/audio.js       WebAudio sound effects and chase music, optional Bengali TTS
```

Debug: `?z=1500` in the URL starts the race 1500 m in.
