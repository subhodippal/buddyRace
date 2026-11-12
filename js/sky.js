// Time of day and weather for a level: sky colour, fog, light, clouds, rain and lightning.
//   time:    day | afternoon | evening
//   weather: sunny | cloudy | rainy
import * as THREE from 'three';

const TIME = {
  day:       { sky: 0xa8dcff, hemi: [0xffffff, 0x9a8a6a, 2.2], sun: [0xfff0cc, 1.8], sunPos: [-20, 40, -10], fog: [60, 175] },
  afternoon: { sky: 0xffcf8f, hemi: [0xfff0d8, 0x9a7a5a, 1.9], sun: [0xffa955, 2.0], sunPos: [-40, 16, -20], fog: [55, 170] },
  evening:   { sky: 0x5c4a82, hemi: [0x9aa6ff, 0x4a3a44, 1.3], sun: [0xff8a4a, 0.6], sunPos: [-50, 7, -30], fog: [45, 155] },
};
const WEATHER = {
  sunny:  { grey: 0x000000, mix: 0, light: 1, sun: 1, fogNear: 1, fogFar: 1, clouds: 6, cloud: 0xffffff },
  cloudy: { grey: 0xaab3bc, mix: 0.6, light: 0.85, sun: 0.35, fogNear: 0.75, fogFar: 0.92, clouds: 16, cloud: 0xc7ced6 },
  rainy:  { grey: 0x6f7883, mix: 0.75, light: 0.7, sun: 0.15, fogNear: 0.5, fogFar: 0.72, clouds: 22, cloud: 0x7d8792, rain: true },
};

export class Sky {
  constructor(scene, hemi, sun) {
    this.scene = scene; this.hemi = hemi; this.sun = sun;
    this.clouds = new THREE.Group(); scene.add(this.clouds);
    // rain: short streaks that fall around the camera
    const N = 1400, P = new Float32Array(N * 6);
    this.drops = [];
    for (let i = 0; i < N; i++) this.drops.push([(Math.random() - 0.5) * 70, Math.random() * 34 - 8, (Math.random() - 0.5) * 70]);
    this.rainGeo = new THREE.BufferGeometry(); this.rainGeo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    this.rain = new THREE.LineSegments(this.rainGeo, new THREE.LineBasicMaterial({ color: 0xc8d6e6, transparent: true, opacity: 0.55, fog: false }));
    this.rain.frustumCulled = false; this.rain.visible = false; scene.add(this.rain);
    this.flash = 0; this.nextBolt = 0; this.baseHemi = 2.2;
  }
  // set the look of a level; returns { evening, rainy } for the rest of the game
  apply(time = 'day', weather = 'sunny') {
    const t = TIME[time] || TIME.day, w = WEATHER[weather] || WEATHER.sunny;
    const sky = new THREE.Color(t.sky).lerp(new THREE.Color(w.grey), w.mix);
    this.scene.background = sky; this.scene.fog.color.copy(sky);
    this.scene.fog.near = t.fog[0] * w.fogNear; this.scene.fog.far = t.fog[1] * w.fogFar;
    this.hemi.color.setHex(t.hemi[0]); this.hemi.groundColor.setHex(t.hemi[1]);
    this.baseHemi = this.hemi.intensity = t.hemi[2] * w.light;
    this.sun.color.setHex(t.sun[0]); this.sun.intensity = t.sun[1] * w.sun; this.sun.position.set(...t.sunPos);
    // clouds
    while (this.clouds.children.length) { const c = this.clouds.children.pop(); c.geometry.dispose(); }
    const cm = new THREE.MeshBasicMaterial({ color: new THREE.Color(w.cloud).lerp(new THREE.Color(t.sky), time === 'evening' ? 0.45 : 0.1), fog: false });
    for (let i = 0; i < w.clouds; i++) {
      const a = i / w.clouds * Math.PI * 2 + Math.random(), r = 70 + Math.random() * 80;
      for (let k = 0; k < 3; k++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(6 + Math.random() * 6, 8, 6), cm);
        p.position.set(Math.cos(a) * r + k * 8, 48 + Math.random() * 14, Math.sin(a) * r + (k - 1) * 4); p.scale.y = 0.45;
        this.clouds.add(p);
      }
    }
    this.rainy = !!w.rain; this.rain.visible = this.rainy;
    this.nextBolt = 6 + Math.random() * 8;
    return { evening: time === 'evening', rainy: this.rainy };
  }
  // every frame: clouds drift along with the camera, rain falls, lightning now and then
  update(dt, cam, thunder) {
    this.clouds.position.x = cam.x; this.clouds.position.z = cam.z; this.clouds.rotation.y += dt * 0.004;
    if (this.rainy) {
      const P = this.rainGeo.attributes.position.array;
      this.drops.forEach((d, i) => {
        d[1] -= dt * 30; if (d[1] < -8) { d[1] = 26; d[0] = (Math.random() - 0.5) * 70; d[2] = (Math.random() - 0.5) * 70; }
        P.set([d[0], d[1], d[2], d[0] + 0.12, d[1] + 0.9, d[2]], i * 6);
      });
      this.rainGeo.attributes.position.needsUpdate = true;
      this.rain.position.copy(cam);
      this.nextBolt -= dt;
      if (this.nextBolt <= 0) { this.nextBolt = 10 + Math.random() * 14; this.flash = 0.22; setTimeout(thunder, 500 + Math.random() * 1200); }
    }
    if (this.flash > 0) { this.flash -= dt; this.hemi.intensity = this.baseHemi * (this.flash > 0.11 || this.flash < 0.05 ? 3.2 : 1.4); if (this.flash <= 0) this.hemi.intensity = this.baseHemi; }
  }
}
