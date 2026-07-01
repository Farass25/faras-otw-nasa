/**
 * CYBER SURVIVOR: OMNI STRIKE
 * Core Game Engine - Vanilla JavaScript HTML5 Canvas
 * Kompleksitas Tingkat Tinggi, Arsitektur Modular Berbasis Kelas Pro
 */

// ============================================================================
// 1. STRUKTUR DATA UTAS & STRUKTUR MATEMATIKA HELPER
// ============================================================================
class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    return this;
  }
  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }
  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }
  mult(n) {
    this.x *= n;
    this.y *= n;
    return this;
  }
  div(n) {
    this.x /= n;
    this.y /= n;
    return this;
  }
  magSq() {
    return this.x * this.x + this.y * this.y;
  }
  mag() {
    return Math.sqrt(this.magSq());
  }
  normalize() {
    let m = this.mag();
    if (m !== 0) this.div(m);
    return this;
  }
  distSq(v) {
    let dx = this.x - v.x;
    let dy = this.y - v.y;
    return dx * dx + dy * dy;
  }
  dist(v) {
    return Math.sqrt(this.distSq(v));
  }
  dot(v) {
    return this.x * v.x + this.y * v.y;
  }
  heading() {
    return Math.atan2(this.y, this.x);
  }
  clone() {
    return new Vector2(this.x, this.y);
  }
}

// ============================================================================
// 2. SISTEM PERSISTENSI DATA & PENYIMPANAN REGISTRI
// ============================================================================
class StorageSystem {
  constructor() {
    this.statsKey = 'cyber_survivor_analytics_v1';
    this.leaderboardKey = 'cyber_survivor_leaderboard_v1';
    this.achievementsKey = 'cyber_survivor_achievements_v1';
    this.initStorage();
  }

  initStorage() {
    if (!localStorage.getItem(this.statsKey)) {
      let initialStats = { totalKills: 0, totalDeaths: 0, highestScore: 0, highestWave: 0, longestSurvival: 0, shotsFired: 0, shotsHit: 0 };
      localStorage.setItem(this.statsKey, JSON.stringify(initialStats));
    }
    if (!localStorage.getItem(this.leaderboardKey)) {
      localStorage.setItem(this.leaderboardKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.achievementsKey)) {
      localStorage.setItem(this.achievementsKey, JSON.stringify({}));
    }
  }

  getStats() {
    return JSON.parse(localStorage.getItem(this.statsKey));
  }
  saveStats(stats) {
    localStorage.setItem(this.statsKey, JSON.stringify(stats));
  }
  getLeaderboard() {
    return JSON.parse(localStorage.getItem(this.leaderboardKey));
  }

  registerLeaderboardRecord(name, score, wave) {
    let board = this.getLeaderboard();
    let dateStr = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
    board.push({ name, score, wave, date: dateStr });
    board.sort((a, b) => b.score - a.score);
    board = board.slice(0, 10); // Ambil Top 10
    localStorage.setItem(this.leaderboardKey, JSON.stringify(board));
  }
}

// ============================================================================
// 3. ENGINES SISTEM AUDIO SINTETIK (WEB AUDIO API NODE GENERATOR)
// ============================================================================
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterVol = 0.8;
    this.musicVol = 0.6;
    this.sfxVol = 0.9;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  playTone(freq, type, duration, vol, fadeOut = true) {
    if (!this.ctx) return;
    try {
      let osc = this.ctx.createOscillator();
      let gainNode = this.ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      let actualVol = vol * this.sfxVol * this.masterVol;
      gainNode.gain.setValueAtTime(actualVol, this.ctx.currentTime);

      osc.start();
      if (fadeOut) {
        gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        osc.stop(this.ctx.currentTime + duration);
      } else {
        osc.stop(this.ctx.currentTime + duration);
      }
    } catch (e) {
      /* Audio fallback block */
    }
  }

  playShoot() {
    this.playTone(320, 'square', 0.08, 0.3);
  }
  playExplosion() {
    this.playTone(80, 'sawtooth', 0.4, 0.6);
  }
  playHit() {
    this.playTone(180, 'triangle', 0.05, 0.4);
  }
  playReload() {
    this.playTone(580, 'sine', 0.15, 0.2, false);
  }
  playLevelUp() {
    this.playTone(880, 'sine', 0.3, 0.5);
  }
}

// ============================================================================
// 4. ENGINE EFEK VISUAL: SISTEM PARTIKEL ULTRA
// ============================================================================
class VisualParticle {
  constructor() {
    this.pos = new Vector2();
    this.vel = new Vector2();
    this.color = '#ffffff';
    this.alpha = 1;
    this.size = 2;
    this.decay = 0.02;
    this.gravity = 0;
    this.active = false;
    this.glow = false;
  }

  init(x, y, vx, vy, color, size, decay, gravity = 0, glow = false) {
    this.pos.set(x, y);
    this.vel.set(vx, vy);
    this.color = color;
    this.size = size;
    this.decay = decay;
    this.gravity = gravity;
    this.alpha = 1;
    this.glow = glow;
    this.active = true;
  }

  update() {
    if (!this.active) return;
    this.vel.y += this.gravity;
    this.pos.add(this.vel);
    this.alpha -= this.decay;
    if (this.alpha <= 0) this.active = false;
  }
}

class ParticleEngine {
  constructor(maxParticles = 1500) {
    this.pool = Array.from({ length: maxParticles }, () => new VisualParticle());
    this.maxAllowed = maxParticles;
  }

  setQuality(preset) {
    if (preset === 'low') this.maxAllowed = 300;
    else if (preset === 'medium') this.maxAllowed = 600;
    else if (preset === 'high') this.maxAllowed = 1000;
    else this.maxAllowed = 1500;
  }

  spawn(x, y, vx, vy, color, size, decay, gravity = 0, glow = false) {
    let p = this.pool.find((item) => !item.active);
    if (p) p.init(x, y, vx, vy, color, size, decay, gravity, glow);
  }

  spawnExplosion(x, y, color, count, maxVel = 5, size = 4) {
    let actualCount = Math.min(count, this.maxAllowed / 10);
    for (let i = 0; i < actualCount; i++) {
      let angle = Math.random() * Math.PI * 2;
      let speed = Math.random() * maxVel + 1;
      let vx = Math.cos(angle) * speed;
      let vy = Math.sin(angle) * speed;
      let decay = Math.random() * 0.02 + 0.01;
      this.spawn(x, y, vx, vy, color, Math.random() * size + 1, decay, 0, true);
    }
  }

  spawnBloodSplash(x, y, dirAngle, count) {
    for (let i = 0; i < count; i++) {
      let spread = dirAngle + (Math.random() - 0.5) * 0.8;
      let speed = Math.random() * 4 + 1;
      let vx = Math.cos(spread) * speed;
      let vy = Math.sin(spread) * speed;
      this.spawn(x, y, vx, vy, '#ef4444', Math.random() * 3 + 1, Math.random() * 0.04 + 0.02);
    }
  }
}

// ============================================================================
// 5. ENGINE KONTROL SENTUH SPASIAL (MOBILE SUPPORT JOYSTICK)
// ============================================================================
class MobileVirtualJoystick {
  constructor() {
    this.active = false;
    this.basePos = new Vector2();
    this.stickPos = new Vector2();
    this.delta = new Vector2();
    this.maxRadius = 60;
    this.touchId = null;
    this.initListeners();
  }

  initListeners() {
    let zone = document.getElementById('virtual-joystick-zone');
    if (!zone) return;

    zone.addEventListener(
      'touchstart',
      (e) => {
        let touch = e.changedTouches[0];
        let rect = zone.getBoundingClientRect();
        this.basePos.set(rect.left + rect.width / 2, rect.top + rect.height / 2);
        this.stickPos.copy(this.basePos);
        this.touchId = touch.identifier;
        this.active = true;
      },
      { passive: true },
    );

    window.addEventListener(
      'touchmove',
      (e) => {
        if (!this.active) return;
        for (let t of e.touches) {
          if (t.identifier === this.touchId) {
            let cur = new Vector2(t.clientX, t.clientY);
            let diff = cur.clone().sub(this.basePos);
            let dist = diff.mag();
            if (dist > this.maxRadius) {
              diff.normalize().mult(this.maxRadius);
            }
            this.delta.copy(diff).div(this.maxRadius);
            this.stickPos.copy(this.basePos).add(diff);

            // Render UI Stick
            let stickEl = document.getElementById('joystick-stick');
            if (stickEl) {
              stickEl.style.left = `calc(50% + ${diff.x}px)`;
              stickEl.style.top = `calc(50% + ${diff.y}px)`;
            }
          }
        }
      },
      { passive: false },
    );

    window.addEventListener(
      'touchend',
      (e) => {
        for (let t of e.changedTouches) {
          if (t.identifier === this.touchId) {
            this.active = false;
            this.touchId = null;
            this.delta.set(0, 0);
            let stickEl = document.getElementById('joystick-stick');
            if (stickEl) {
              stickEl.style.left = '50%';
              stickEl.style.top = '50%';
            }
          }
        }
      },
      { passive: true },
    );
  }
}

// ============================================================================
// 6. MATRIKS KONFIGURASI MODUL PERSENJATAAN (WEAPON ARCHE_TYPES)
// ============================================================================
const WEAPON_REGISTRY = {
  pistol: { name: 'HEAVY PISTOL', dmg: 22, rate: 250, mag: 12, reload: 1000, acc: 0.95, recoil: 2, bSpeed: 14, crit: 1.5, splash: 0 },
  smg: { name: 'CYBER SMG', dmg: 14, rate: 80, mag: 40, reload: 1400, acc: 0.85, recoil: 4, bSpeed: 16, crit: 1.4, splash: 0 },
  rifle: { name: 'ASSAULT RIFLE', dmg: 32, rate: 140, mag: 30, reload: 1800, acc: 0.92, recoil: 5, bSpeed: 18, crit: 1.6, splash: 0 },
  shotgun: { name: 'RIOT SHOTGUN', dmg: 12, rate: 700, mag: 8, reload: 2200, acc: 0.65, recoil: 12, bSpeed: 12, crit: 1.5, pellets: 8, splash: 0 },
  sniper: { name: 'RAILGUN SNIPER', dmg: 135, rate: 1200, mag: 5, reload: 2500, acc: 0.99, recoil: 15, bSpeed: 28, crit: 2.5, splash: 0 },
  launcher: { name: 'PLASMA ROCKET', dmg: 120, rate: 1500, mag: 3, reload: 3200, acc: 0.9, recoil: 8, bSpeed: 10, crit: 1.5, splash: 140 },
};

class WeaponInstance {
  constructor(key) {
    let config = WEAPON_REGISTRY[key];
    Object.assign(this, config);
    this.typeKey = key;
    this.ammoInClip = config.mag;
    this.ammoReserve = key === 'pistol' ? Infinity : config.mag * 5;
    this.lastFired = 0;
    this.isReloading = false;
    this.reloadStarted = 0;
  }
}

// ============================================================================
// 7. SUBSISTEM ENTITAS UTAMA: AKTOR PEMAIN (PLAYER)
// ============================================================================
class PlayerActor {
  constructor(game) {
    this.game = game;
    this.pos = new Vector2(2000, 2000); // Koordinat tengah world map
    this.radius = 22;
    this.angle = 0;
    this.vel = new Vector2();

    // Stat Vitalitas
    this.maxHp = 100;
    this.hp = 100;
    this.maxArmor = 100;
    this.armor = 50;
    this.maxStamina = 100;
    this.stamina = 100;

    // Stat Progresi Atribut
    this.level = 1;
    this.exp = 0;
    this.expNeeded = 100;

    // Modifikator Atribut Upgrade Kartu Tempur
    this.damageMod = 1.0;
    this.speedMod = 1.0;
    this.reloadMod = 1.0;
    this.critChance = 0.1; // Base 10%
    this.magazineMod = 1.0;

    // Manajemen Senjata
    this.weapons = [new WeaponInstance('pistol'), new WeaponInstance('rifle')];
    this.activeWpIdx = 0;

    this.medkitsCount = 3;
    this.baseMoveSpeed = 4.0;
    this.isSprinting = false;
    this.isDead = false;
  }

  getActiveWeapon() {
    return this.weapons[this.activeWpIdx];
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.game.camera.shake(8);
    this.game.audio.playHit();

    if (this.armor > 0) {
      let armAbsorption = Math.min(this.armor, amount * 0.65);
      this.armor -= armAbsorption;
      amount -= armAbsorption;
    }
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      this.game.triggerGameOver();
    }
  }

  addExp(amt) {
    this.exp += amt;
    if (this.exp >= this.expNeeded) {
      this.exp -= this.expNeeded;
      this.level++;
      this.expNeeded = Math.floor(this.expNeeded * 1.4);
      this.game.audio.playLevelUp();
      this.game.triggerLevelUpCycle();
    }
  }

  update(input, joystick) {
    if (this.isDead) return;

    // Siklus Pemulihan Stamina Organik
    if (!this.isSprinting && this.stamina < this.maxStamina) {
      this.stamina += 0.25;
    }

    // Hitung Vektor Pergerakan Input Keyboard / Virtual Joystick
    let moveVec = new Vector2();
    if (joystick.active) {
      moveVec.copy(joystick.delta);
    } else {
      if (input.keys['w'] || input.keys['arrowup']) moveVec.y = -1;
      if (input.keys['s'] || input.keys['arrowdown']) moveVec.y = 1;
      if (input.keys['a'] || input.keys['arrowleft']) moveVec.x = -1;
      if (input.keys['d'] || input.keys['arrowright']) moveVec.x = 1;
      moveVec.normalize();
    }

    this.isSprinting = (input.keys['shift'] || input.mobileSprint) && moveVec.magSq() > 0 && this.stamina > 15;
    if (this.isSprinting) {
      this.stamina -= 0.6;
    }

    let speed = this.baseMoveSpeed * this.speedMod;
    if (this.isSprinting) speed *= 1.6;

    this.vel.copy(moveVec).mult(speed);
    this.pos.add(this.vel);

    // Batasan Peta (World Boundaries Constraints)
    let worldSize = this.game.worldSize;
    if (this.pos.x < this.radius) this.pos.x = this.radius;
    if (this.pos.x > worldSize - this.radius) this.pos.x = worldSize - this.radius;
    if (this.pos.y < this.radius) this.pos.y = this.radius;
    if (this.pos.y > worldSize - this.radius) this.pos.y = worldSize - this.radius;

    // Selesaikan Tumbukan Terhadap Objek Solid Peta (Obstacle Rigid Resolution)
    this.game.obstacles.forEach((obs) => obs.resolveCollision(this));

    // Sinkronisasi Sudut Rotasi Pembidikan Karakter (Orientasi Kamera)
    if (!joystick.active && !this.game.isMobile) {
      let screenPlayerX = this.pos.x - this.game.camera.pos.x;
      let screenPlayerY = this.pos.y - this.game.camera.pos.y;
      this.angle = Math.atan2(input.mousePos.y - screenPlayerY, input.mousePos.x - screenPlayerX);
    } else if (moveVec.magSq() > 0) {
      this.angle = moveVec.heading(); // Fallback otomatis arah bidik mengikuti gerak HP
    }

    // Rutinitas Manajemen Pengisian Ulang Senjata Tempur
    let activeWeapon = this.getActiveWeapon();
    if (activeWeapon.isReloading) {
      if (Date.now() - activeWeapon.reloadStarted >= activeWeapon.reload * this.reloadMod) {
        let needed = Math.floor(activeWeapon.mag * this.magazineMod) - activeWeapon.ammoInClip;
        let transfer = Math.min(needed, activeWeapon.ammoReserve);
        activeWeapon.ammoInClip += transfer;
        if (activeWeapon.ammoReserve !== Infinity) activeWeapon.ammoReserve -= transfer;
        activeWeapon.isReloading = false;
      }
    }
  }

  executeShootAction() {
    let wp = this.getActiveWeapon();
    if (wp.isReloading) return;
    if (wp.ammoInClip <= 0) {
      this.executeReloadAction();
      return;
    }

    let now = Date.now();
    if (now - wp.lastFired < wp.rate) return;
    wp.lastFired = now;

    this.game.camera.shake(wp.recoil * 0.7);
    this.game.audio.playShoot();

    if (wp.typeKey === 'shotgun') {
      for (let i = 0; i < wp.pellets; i++) {
        let spread = this.angle + (Math.random() - 0.5) * (1 - wp.acc);
        this.game.spawnBulletNode(this.pos.x, this.pos.y, spread, wp);
      }
      wp.ammoInClip--;
    } else {
      let spread = this.angle + (Math.random() - 0.5) * (1 - wp.acc);
      this.game.spawnBulletNode(this.pos.x, this.pos.y, spread, wp);
      wp.ammoInClip--;
    }
  }

  executeReloadAction() {
    let wp = this.getActiveWeapon();
    if (wp.isReloading || wp.ammoInClip >= Math.floor(wp.mag * this.magazineMod) || wp.ammoReserve <= 0) return;
    wp.isReloading = true;
    wp.reloadStarted = Date.now();
    this.game.audio.playReload();
  }

  useMedkit() {
    if (this.medkitsCount > 0 && this.hp < this.maxHp) {
      this.medkitsCount--;
      this.hp = Math.min(this.maxHp, this.hp + 40);
      this.game.audio.playTone(440, 'sine', 0.2, 0.4, false);
    }
  }

  draw(ctx, cam) {
    ctx.save();
    ctx.translate(this.pos.x - cam.pos.x, this.pos.y - cam.pos.y);
    ctx.rotate(this.angle);

    // Pencahayaan Bayangan Dinamis Tubuh Pemain (Shadow Cast Rings)
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.isSprinting ? '#a855f7' : '#00f0ff';

    // Menggambar Konstruksi Grafis Tubuh Robotik Pemain
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Indikator Arah Moncong Senjata Aktif (Gun Muzzle Tube)
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, -6, this.radius + 14, 12);
    ctx.strokeStyle = '#00f0ff';
    ctx.strokeRect(0, -6, this.radius + 14, 12);

    ctx.restore();
  }
}

// ============================================================================
// 8. INFRASTRUKTUR PROJEKTIL FISIK (BULLET ENTITIES PATHWAY)
// ============================================================================
class ProjectileNode {
  constructor() {
    this.pos = new Vector2();
    this.vel = new Vector2();
    this.damage = 0;
    this.critChance = 0;
    this.critMultiplier = 1;
    this.splash = 0;
    this.speed = 0;
    this.isEnemyBullet = false;
    this.active = false;
    this.trail = [];
  }

  init(x, y, angle, wp, isEnemy = false, critChan = 0) {
    this.pos.set(x, y);
    this.speed = wp.bSpeed;
    this.vel.set(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
    this.damage = wp.dmg;
    this.critChance = critChan;
    this.critMultiplier = wp.crit;
    this.splash = wp.splash;
    this.isEnemyBullet = isEnemy;
    this.active = true;
    this.trail = [];
  }

  update(game) {
    if (!this.active) return;

    // Rekam Node Histori Jejak Peluru (Bullet Trace Tail)
    this.trail.push(this.pos.clone());
    if (this.trail.length > 6) this.trail.shift();

    this.pos.add(this.vel);

    // Batasan Deteksi Luar Peta (Out of Bounds cleanup)
    if (this.pos.x < 0 || this.pos.x > game.worldSize || this.pos.y < 0 || this.pos.y > game.worldSize) {
      this.active = false;
      return;
    }

    // Tumbukan Peluru terhadap Objek Solid Lingkungan (Static Collisions)
    for (let obs of game.obstacles) {
      if (obs.checkPointIntersection(this.pos)) {
        this.triggerImpactDebris(game);
        this.active = false;
        return;
      }
    }
  }

  triggerImpactDebris(game) {
    game.particles.spawnExplosion(this.pos.x, this.pos.y, '#00f0ff', 8, 3, 2);
    if (this.splash > 0) {
      game.triggerRadialExplosionArea(this.pos, this.splash, this.damage);
    }
  }

  draw(ctx, cam) {
    if (!this.active || this.trail.length < 2) return;
    ctx.save();
    ctx.strokeStyle = this.isEnemyBullet ? 'rgba(239, 68, 68, 0.7)' : 'rgba(57, 255, 20, 0.8)';
    ctx.lineWidth = this.splash > 0 ? 5 : 2;
    ctx.beginPath();
    ctx.moveTo(this.trail[0].x - cam.pos.x, this.trail[0].y - cam.pos.y);
    ctx.lineTo(this.pos.x - cam.pos.x, this.pos.y - cam.pos.y);
    ctx.stroke();
    ctx.restore();
  }
}

// ============================================================================
// 9. OBJEK SOLID LINGKUNGAN (MAP RIGID STATIC OBSTACLES)
// ============================================================================
class EnvironmentObstacle {
  constructor(x, y, w, h, type = 'container') {
    this.pos = new Vector2(x, y);
    this.w = w;
    this.h = h;
    this.type = type; // types: wall, container, wreck, barrel, crate
    this.hp = type === 'barrel' ? 30 : Infinity;
    this.destroyed = false;
  }

  checkPointIntersection(pt) {
    return pt.x >= this.pos.x && pt.x <= this.pos.x + this.w && pt.y >= this.pos.y && pt.y <= this.pos.y + this.h;
  }

  resolveCollision(actor) {
    if (this.destroyed) return;

    // Temukan titik terdekat pada kotak pembatas AABB terhadap pusat lingkaran aktor
    let closestX = Math.max(this.pos.x, Math.min(actor.pos.x, this.pos.x + this.w));
    let closestY = Math.max(this.pos.y, Math.min(actor.pos.y, this.pos.y + this.h));

    let distX = actor.pos.x - closestX;
    let distY = actor.pos.y - closestY;
    let distSq = distX * distX + distY * distY;

    if (distSq < actor.radius * actor.radius) {
      let dist = Math.sqrt(distSq);
      let overlap = actor.radius - dist;

      // Vector Normalisasi Pengusiran Keluar Volume Tumbukan
      let nx = distX / (dist || 1);
      let ny = distY / (dist || 1);

      if (dist === 0) {
        // Kasus ekstrem tepat di dalam pusat
        nx = 1;
        ny = 0;
        actor.pos.x += actor.radius;
      } else {
        actor.pos.x += nx * overlap;
        actor.pos.y += ny * overlap;
      }
    }
  }

  draw(ctx, cam) {
    if (this.destroyed) return;

    // Cek Culling visibilitas layar agar hemat rendering matriks
    if (this.pos.x + this.w < cam.pos.x || this.pos.x > cam.pos.x + cam.width || this.pos.y + this.h < cam.pos.y || this.pos.y > cam.pos.y + cam.height) return;

    ctx.save();
    ctx.translate(this.pos.x - cam.pos.x, this.pos.y - cam.pos.y);

    // Pilih Skema Pewarnaan Render Berdasarkan Tipe Objek
    switch (this.type) {
      case 'wall':
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#475569';
        break;
      case 'container':
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#38bdf8';
        break;
      case 'wreck':
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#64748b';
        break;
      case 'barrel':
        ctx.fillStyle = '#7f1d1d';
        ctx.strokeStyle = '#ef4444';
        break;
      case 'crate':
        ctx.fillStyle = '#78350f';
        ctx.strokeStyle = '#f59e0b';
        break;
    }

    ctx.lineWidth = 2;
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.strokeRect(0, 0, this.w, this.h);

    // Dekorasi Grid Tekstur Internal Garis Silang
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(this.w, this.h);
    ctx.moveTo(this.w, 0);
    ctx.lineTo(0, this.h);
    ctx.stroke();

    ctx.restore();
  }
}

// ============================================================================
// 10. MATRIKS MUSUH DAN KECERDASAN BUATAN MULTI-BEHAVIOR (AI ENEMIES SYSTEMS)
// ============================================================================
class EnemyAI {
  constructor(game, x, y, type = 'grunt', isMinion = false) {
    this.game = game;
    this.pos = new Vector2(x, y);
    this.vel = new Vector2();
    this.type = type;
    this.radius = 20;
    this.angle = 0;
    this.active = true;
    this.isMinion = isMinion;

    // Tabel Parameter Konfigurasi Atribut Default Per Tipe AI Musuh
    this.setupEnemyAttributes();
  }

  setupEnemyAttributes() {
    let scale = 1.0 + (this.game.wave - 1) * 0.15; // Peningkatan Stat Otomatis Per Wave
    if (this.game.difficulty === 'nightmare') scale *= 1.5;

    switch (this.type) {
      case 'runner':
        this.maxHp = 30 * scale;
        this.speed = 5.2;
        this.damage = 8 * scale;
        this.color = '#fbbf24';
        this.expReward = 15;
        break;
      case 'tank':
        this.maxHp = 350 * scale;
        this.speed = 1.6;
        this.radius = 35;
        this.damage = 35 * scale;
        this.color = '#dc2626';
        this.expReward = 60;
        break;
      case 'sniper':
        this.maxHp = 50 * scale;
        this.speed = 2.8;
        this.damage = 40 * scale;
        this.color = '#ec4899';
        this.expReward = 35;
        this.shootRange = 550;
        this.lastShot = 0;
        break;
      case 'kamikaze':
        this.maxHp = 25 * scale;
        this.speed = 6.0;
        this.damage = 60 * scale;
        this.color = '#ea580c';
        this.expReward = 25;
        break;
      case 'elite':
        this.maxHp = 140 * scale;
        this.speed = 3.6;
        this.damage = 15 * scale;
        this.color = '#a855f7';
        this.expReward = 50;
        this.shootRange = 350;
        this.lastShot = 0;
        break;
      case 'grunt':
      default:
        this.maxHp = 60 * scale;
        this.speed = 3.2;
        this.damage = 12 * scale;
        this.color = '#10b981';
        this.expReward = 20;
        break;
    }
    this.hp = this.maxHp;
  }

  takeDamage(amount, isCrit = false) {
    this.hp -= amount;
    this.game.particles.spawnBloodSplash(this.pos.x, this.pos.y, this.angle + Math.PI, 6);

    // Cetak Teks Floating Indikator Damage Ponten Pop-up
    this.game.spawnFloatingTextNode(this.pos.x, this.pos.y - 15, Math.floor(amount), isCrit ? '#f59e0b' : '#ffffff', isCrit ? 22 : 15);

    if (this.hp <= 0 && this.active) {
      this.active = false;
      this.game.triggerEnemyDeathScore(this);
    }
  }

  update() {
    if (!this.active) return;

    let p = this.game.player;
    let toPlayer = p.pos.clone().sub(this.pos);
    let dist = toPlayer.mag();
    this.angle = toPlayer.heading();

    let moveDir = toPlayer.clone().normalize();

    // Implementasi Alur Kecerdasan Buatan Tingkat Lanjut Per Tipe Kelas AI
    if (this.type === 'sniper') {
      if (dist < this.shootRange - 100) {
        moveDir.mult(-1); // Mundur menjauh menjaga jarak aman kiting
      } else if (dist > this.shootRange + 50) {
        // Tetap mendekat normal
      } else {
        moveDir.set(0, 0); // Berhenti di tempat mengambil posisi tembak jitu
        this.executeRangedAttackLoop(dist);
      }
    } else if (this.type === 'elite') {
      // Algoritma Pola Gerakan Mengitari Flanking Melingkar Samping
      if (dist < this.shootRange) {
        let tangent = new Vector2(-moveDir.y, moveDir.x);
        moveDir.copy(tangent).mult(0.6).add(moveDir.clone().mult(-0.1)).normalize();
        this.executeRangedAttackLoop(dist);
      }
    } else if (this.type === 'kamikaze') {
      if (dist < this.radius + p.radius + 10) {
        this.active = false;
        p.takeDamage(this.damage);
        this.game.particles.spawnExplosion(this.pos.x, this.pos.y, '#ea580c', 40, 7, 5);
        this.game.audio.playExplosion();
        return;
      }
    } else {
      // Serangan Kontak Fisik Jarak Dekat Melee untuk Grunt, Runner, Tank
      if (dist < this.radius + p.radius + 5) {
        p.takeDamage(this.damage * 0.05); // Damage per tick frame kontak
      }
    }

    // Vektor Modifikasi Menghindari Tabrakan Antar Rekan Sesama Musuh (Flocking Avoidance Separation)
    let separationVec = new Vector2();
    let neighbors = 0;
    this.game.enemies.forEach((other) => {
      if (other === this || !other.active) return;
      let d = this.pos.dist(other.pos);
      if (d < this.radius + other.radius + 15) {
        let push = this.pos
          .clone()
          .sub(other.pos)
          .normalize()
          .div(d || 1);
        separationVec.add(push);
        neighbors++;
      }
    });
    if (neighbors > 0) {
      separationVec.normalize().mult(1.5);
      moveDir.add(separationVec).normalize();
    }

    this.vel.copy(moveDir).mult(this.speed);
    this.pos.add(this.vel);

    // Resolusi Hambatan Tabrakan Terhadap Dinding Solid Map Lingkungan
    this.game.obstacles.forEach((obs) => obs.resolveCollision(this));
  }

  executeRangedAttackLoop(currentDistance) {
    let now = Date.now();
    let cooldown = this.type === 'sniper' ? 2500 : 800;
    if (now - this.lastShot < cooldown) return;
    this.lastShot = now;

    let fakeWp = { bSpeed: this.type === 'sniper' ? 16 : 11, dmg: this.damage, splash: 0 };
    this.game.spawnBulletNode(this.pos.x, this.pos.y, this.angle, fakeWp, true);
  }

  draw(ctx, cam) {
    if (this.pos.x + this.radius < cam.pos.x || this.pos.x - this.radius > cam.pos.x + cam.width || this.pos.y + this.radius < cam.pos.y || this.pos.y - this.radius > cam.pos.y + cam.height) return;

    ctx.save();
    ctx.translate(this.pos.x - cam.pos.x, this.pos.y - cam.pos.y);
    ctx.rotate(this.angle);

    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;

    ctx.fillStyle = '#111827';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    if (this.type === 'runner') {
      // Bentuk Segitiga Tajam Cepat Lancip
      ctx.moveTo(this.radius, 0);
      ctx.lineTo(-this.radius, -this.radius * 0.8);
      ctx.lineTo(-this.radius * 0.4, 0);
      ctx.lineTo(-this.radius, this.radius * 0.8);
    } else if (this.type === 'tank') {
      // Bentuk Poligon Hexagon Baja Kokoh Lemot
      for (let i = 0; i < 6; i++) {
        let angle = (Math.PI / 3) * i;
        ctx.lineTo(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius);
      }
    } else {
      // Lingkaran Standar Grunt/Elite
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Indikator Tanda Visual Core Energi Musuh Tengah Badan
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ============================================================================
// 11. SUBSISTEM MASTER ENCOUNTER BOSS FIGHTER MACHINE
// ============================================================================
class MegaBossEntity {
  constructor(game, x, y) {
    this.game = game;
    this.pos = new Vector2(x, y);
    this.vel = new Vector2();
    this.radius = 75;
    this.angle = 0;
    this.maxHp = 2500 + (game.wave / 10 - 1) * 2000;
    this.hp = this.maxHp;
    this.speed = 2.0;
    this.active = true;
    this.phase = 1;

    this.lastSkillUsed = 0;
    this.skillCooldown = 4000;
    this.isCharging = false;
    this.chargeTarget = new Vector2();
    this.chargeTimer = 0;
  }

  takeDamage(amount, isCrit = false) {
    this.hp -= amount;
    this.game.particles.spawnBloodSplash(this.pos.x, this.pos.y, this.angle + Math.PI, 15);
    this.game.spawnFloatingTextNode(this.pos.x, this.pos.y - 40, Math.floor(amount), '#ef4444', 28);

    // Transisi Masuk Fase Kedua Mengamuk di bawah HP 50%
    if (this.phase === 1 && this.hp <= this.maxHp * 0.5) {
      this.phase = 2;
      this.speed *= 1.5;
      this.skillCooldown = 2200;
      this.game.spawnFloatingTextNode(this.pos.x, this.pos.y, 'PHASE 2: ENRAGED MODE ACTIVE!', '#ff007f', 35);
    }

    if (this.hp <= 0 && this.active) {
      this.active = false;
      this.game.triggerBossDefeatedReward(this);
    }
  }

  update() {
    if (!this.active) return;
    let p = this.game.player;
    let now = Date.now();

    if (this.isCharging) {
      // Rutinitas Fisika Terjangan Kilat Charge Attack Modul
      this.angle = this.vel.heading();
      this.pos.add(this.vel);
      if (Date.now() - this.chargeTimer > 1200) {
        this.isCharging = false;
        this.speed = this.phase === 2 ? 3.0 : 2.0;
      }

      if (this.pos.dist(p.pos) < this.radius + p.radius) {
        p.takeDamage(45);
        this.isCharging = false; // Batalkan interupsi pasca benturan sukses
        this.speed = this.phase === 2 ? 3.0 : 2.0;
      }
      this.game.obstacles.forEach((obs) => obs.resolveCollision(this));
      return;
    }

    let toPlayer = p.pos.clone().sub(this.pos);
    let dist = toPlayer.mag();
    this.angle = toPlayer.heading();

    // Gerakan mengejar konstan standar
    let moveDir = toPlayer.clone().normalize();
    this.vel.copy(moveDir).mult(this.speed);
    this.pos.add(this.vel);
    this.game.obstacles.forEach((obs) => obs.resolveCollision(this));

    // State Machine Trigger Penggunaan Skill Spesial Area
    if (now - this.lastSkillUsed > this.skillCooldown) {
      this.lastSkillUsed = now;
      let rng = Math.random();
      if (rng < 0.4) {
        this.triggerSkillRadialBurst();
      } else if (rng < 0.75) {
        this.triggerSkillChargeLunge(p.pos);
      } else {
        this.triggerSkillSummonMinions();
      }
    }
  }

  triggerSkillRadialBurst() {
    this.game.spawnFloatingTextNode(this.pos.x, this.pos.y - 60, 'SKILL: RADIAL BURST', '#fff000', 22);
    let count = this.phase === 2 ? 36 : 18;
    let step = (Math.PI * 2) / count;
    for (let i = 0; i < count; i++) {
      let angle = step * i;
      let fakeWp = { bSpeed: 8, dmg: 18, splash: 0 };
      this.game.spawnBulletNode(this.pos.x, this.pos.y, angle, fakeWp, true);
    }
  }

  triggerSkillChargeLunge(targetPos) {
    this.game.spawnFloatingTextNode(this.pos.x, this.pos.y - 60, 'SKILL: CHARGE ATTACK!', '#ff007f', 24);
    this.isCharging = true;
    this.chargeTimer = Date.now();
    let diff = targetPos.clone().sub(this.pos).normalize();
    this.vel.copy(diff).mult(14); // Menggandakan kecepatan dorong peluru kendali
  }

  triggerSkillSummonMinions() {
    this.game.spawnFloatingTextNode(this.pos.x, this.pos.y - 60, 'SKILL: REINFORCEMENTS', '#00f0ff', 22);
    for (let i = 0; i < 4; i++) {
      let offsetAngle = Math.random() * Math.PI * 2;
      let mx = this.pos.x + Math.cos(offsetAngle) * 110;
      let my = this.pos.y + Math.sin(offsetAngle) * 110;
      this.game.enemies.push(new EnemyAI(this.game, mx, my, Math.random() > 0.5 ? 'runner' : 'kamikaze', true));
    }
  }

  draw(ctx, cam) {
    ctx.save();
    ctx.translate(this.pos.x - cam.pos.x, this.pos.y - cam.pos.y);
    ctx.rotate(this.angle);

    ctx.shadowBlur = 30;
    ctx.shadowColor = this.phase === 2 ? '#ff007f' : '#dc2626';

    // Desain Tubuh Inti Monster Raksasa Boss Mech
    ctx.fillStyle = '#030712';
    ctx.strokeStyle = this.phase === 2 ? '#ff007f' : '#dc2626';
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Kanon Ganda Eksternal Bahu Kiri-Kanan (Twin Heavy Cannons)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(10, -35, 60, 20);
    ctx.fillRect(10, 15, 60, 20);

    ctx.restore();
  }
}

// ============================================================================
// 12. SISTEM LOOT DAN REGENERASI BEBAS (COLLECTABLE LOOT ITEM SYSTEM)
// ============================================================================
class LootCollectible {
  constructor(x, y, type = 'coin') {
    this.pos = new Vector2(x, y);
    this.type = type; // types: ammo, medkit, armor, coin, weapon
    this.radius = 12;
    this.active = true;
    this.pulseTimer = Math.random() * Math.PI;
  }

  update(player) {
    this.pulseTimer += 0.05;
    let dist = this.pos.dist(player.pos);

    // Efek Magnetik Penarikan Otomatis Jarak Dekat (Item Vacuum Pull)
    if (dist < 160) {
      let pull = player.pos.clone().sub(this.pos).normalize().mult(5.5);
      this.pos.add(pull);
    }

    if (dist < this.radius + player.radius) {
      this.active = false;
      this.applyLootEffect(player);
    }
  }

  applyLootEffect(player) {
    switch (this.type) {
      case 'coin':
        player.game.score += 250;
        break;
      case 'medkit':
        player.medkitsCount++;
        break;
      case 'armor':
        player.armor = Math.min(player.maxArmor, player.armor + 35);
        break;
      case 'ammo':
        player.weapons.forEach((wp) => {
          wp.ammoReserve += wp.mag * 2;
        });
        break;
      case 'weapon':
        // Tambahkan Modul Senjata Baru Acak yang Belum Dimiliki Operator
        let allKeys = Object.keys(WEAPON_REGISTRY);
        let currentKeys = player.weapons.map((w) => w.typeKey);
        let unowned = allKeys.filter((k) => !currentKeys.includes(k));
        if (unowned.length > 0) {
          let newKey = unowned[Math.floor(Math.random() * unowned.length)];
          player.weapons.push(new WeaponInstance(newKey));
          player.game.spawnFloatingTextNode(player.pos.x, player.pos.y - 30, `UNLOCKED: ${WEAPON_REGISTRY[newKey].name}`, '#38bdf8', 20);
        } else {
          player.game.score += 2000; // Bonus skor jika semua modul komplit
        }
        break;
    }
    player.game.audio.playTone(640, 'sine', 0.08, 0.3, true);
  }

  draw(ctx, cam) {
    ctx.save();
    ctx.translate(this.pos.x - cam.pos.x, this.pos.y - cam.pos.y);

    let scale = 1.0 + Math.sin(this.pulseTimer) * 0.15;
    ctx.scale(scale, scale);

    let color = '#ffffff';
    switch (this.type) {
      case 'coin':
        color = '#fff000';
        break;
      case 'medkit':
        color = '#22c55e';
        break;
      case 'armor':
        color = '#00f0ff';
        break;
      case 'ammo':
        color = '#a855f7';
        break;
      case 'weapon':
        color = '#ff007f';
        break;
    }

    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ============================================================================
// 13. NODE TEKS FLOATING DAN SISTEM REVEAL KAMERA (UI & VIEW TRACKING)
// ============================================================================
class FloatingTextNode {
  constructor(x, y, text, color, size) {
    this.pos = new Vector2(x, y);
    this.text = text;
    this.color = color;
    this.size = size;
    this.alpha = 1.0;
    this.active = true;
  }
  update() {
    this.pos.y -= 0.8; // Melayang ke atas
    this.alpha -= 0.025;
    if (this.alpha <= 0) this.active = false;
  }
  draw(ctx, cam) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.font = `bold ${this.size}px 'Orbitron', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.pos.x - cam.pos.x, this.pos.y - cam.pos.y);
    ctx.restore();
  }
}

class TrackingCamera {
  constructor() {
    this.pos = new Vector2(0, 0);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.shakeIntensity = 0;
  }
  update(targetX, targetY, worldSize) {
    // Linear Interpolation (Lerp) Kamera Mengikuti Pemain Mulus Smooth
    let targetCamX = targetX - this.width / 2;
    let targetCamY = targetY - this.height / 2;

    this.pos.x += (targetCamX - this.pos.x) * 0.08;
    this.pos.y += (targetCamY - this.pos.y) * 0.08;

    // Klem Pembatas Pandangan Kamera di dalam Batas Dunia (Camera Constraints)
    if (this.pos.x < 0) this.pos.x = 0;
    if (this.pos.x > worldSize - this.width) this.pos.x = worldSize - this.width;
    if (this.pos.y < 0) this.pos.y = 0;
    if (this.pos.y > worldSize - this.height) this.pos.y = worldSize - this.height;

    // Kalkulasi Meredupnya Efek Guncangan Kamera (Camera Shake Decay)
    if (this.shakeIntensity > 0) {
      this.pos.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.pos.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= 0.9;
      if (this.shakeIntensity < 0.2) this.shakeIntensity = 0;
    }
  }
  shake(amt) {
    this.shakeIntensity += amt;
  }
  resize(w, h) {
    this.width = w;
    this.height = h;
  }
}

// ============================================================================
// 14. INTI UTAMA ARSITEKTUR GAME ENGINE ENGINE (MASTER COORDINATOR)
// ============================================================================
class MasterGameEngine {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.worldSize = 5000; // Peta masif ukuran super besar 5000x5000px

    // Parameter Konfigurasi Mode Pilihan Default Menu Utama
    this.difficulty = 'medium';
    this.gameMode = 'survival';
    this.selectedMap = 'hangar';
    this.graphicsPreset = 'ultra';

    // Instansiasi Seluruh Komponen Subsistem Modular
    this.storage = new StorageSystem();
    this.audio = new AudioEngine();
    this.particles = new ParticleEngine();
    this.joystick = new MobileVirtualJoystick();
    this.camera = new TrackingCamera();

    // Koleksi Pools Objek Aktif Lapangan Tempur
    this.player = null;
    this.obstacles = [];
    this.enemies = [];
    this.bossNode = null;
    this.bullets = Array.from({ length: 400 }, () => new ProjectileNode()); // Object pre-pooling optimization
    this.loots = [];
    this.floatingTexts = [];

    // Parameter Mekanika Loop Siklus Pertandingan (Runtime States)
    this.gameState = 'MENU'; // States: MENU, GAMEPLAY, LEVELUP, GAMEOVER
    this.score = 0;
    this.killCount = 0;
    this.wave = 0;
    this.waveInProgress = false;
    this.waveCountdownTimer = 0;
    this.matchStartTime = 0;

    // Manajemen Input Sistem
    this.input = { keys: {}, mousePos: new Vector2(), leftClick: false, mobileSprint: false };
    this.fps = 0;
    this.lastFrameTimestamp = 0;
    this.frameCount = 0;
    this.fpsIntervalTimer = 0;

    // Parameter Siklus Simulasi Lingkungan Atmosferik (Weather & Time Systems)
    this.weatherType = 'sunny'; // sunny, rain, fog, sandstorm
    this.timeCycle = 'day'; // day, sunset, night
    this.cycleTimeTracker = 0;

    this.isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    this.initDOMBindings();
    this.initInputListeners();
    this.resizeViewport();

    // Jalankan Master Animation Frame loop konstan semenjak inisialisasi awal
    window.addEventListener('resize', () => this.resizeViewport());
    this.lastFrameTimestamp = performance.now();
    requestAnimationFrame((t) => this.masterLoopFrame(t));
  }

  resizeViewport() {
    let w = window.innerWidth;
    let h = window.innerHeight;
    this.canvas.width = w;
    this.canvas.height = h;
    this.camera.resize(w, h);
  }

  initDOMBindings() {
    // Tautkan Selector Menu Parameter
    const bindSelector = (parentId, prop) => {
      let btns = document.querySelectorAll(`#${parentId} .selector-btn`);
      btns.forEach((b) => {
        b.addEventListener('click', () => {
          btns.forEach((el) => el.classList.remove('active'));
          b.classList.add('active');
          this[prop] = b.getAttribute('data-value');
        });
      });
    };
    bindSelector('difficulty-selector', 'difficulty');
    bindSelector('mode-selector', 'gameMode');
    bindSelector('map-selector', 'selectedMap');

    // Tautkan Tombol Navigasi Menu
    const wireScreenTransition = (btnId, screenId, show = true) => {
      document.getElementById(btnId).addEventListener('click', () => {
        this.audio.init();
        document.querySelectorAll('.ui-screen').forEach((s) => s.classList.add('hidden'));
        if (show) document.getElementById(screenId).classList.remove('hidden');
      });
    };
    wireScreenTransition('btn-howtoplay', 'howtoplay-screen');
    wireScreenTransition('btn-settings', 'settings-screen');
    wireScreenTransition('btn-stats', 'stats-screen');

    document.querySelectorAll('.back-btn').forEach((b) => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.ui-screen').forEach((s) => s.classList.add('hidden'));
        document.getElementById('menu-screen').classList.remove('hidden');
        this.syncSettingsFromDOM();
      });
    });

    document.getElementById('btn-stats').addEventListener('click', () => this.renderStatisticsToDOM());
    document.getElementById('btn-play').addEventListener('click', () => this.bootUpGameplaySequence());
    document.getElementById('btn-retry').addEventListener('click', () => this.bootUpGameplaySequence());
    document.getElementById('btn-abort').addEventListener('click', () => {
      document.querySelectorAll('.ui-screen').forEach((s) => s.classList.add('hidden'));
      document.getElementById('menu-screen').classList.remove('hidden');
      this.gameState = 'MENU';
    });

    // Tombol Fullscreen Kontroler
    document.getElementById('btn-fullscreen').addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen();
      }
    });

    // Tautkan Event Tombol Kontrol Sentuh HP Seluler (Mobile Controls Event Attach)
    if (this.isMobile) {
      document.getElementById('mobile-controls-layer').classList.remove('hidden');
      const mapMobileBtn = (id, startAction, endAction = null) => {
        let el = document.getElementById(id);
        if (!el) return;
        el.addEventListener(
          'touchstart',
          (e) => {
            e.preventDefault();
            startAction();
          },
          { passive: false },
        );
        if (endAction)
          el.addEventListener(
            'touchend',
            (e) => {
              e.preventDefault();
              endAction();
            },
            { passive: false },
          );
      };
      mapMobileBtn(
        'vbtn-shoot',
        () => {
          this.input.leftClick = true;
        },
        () => {
          this.input.leftClick = false;
        },
      );
      mapMobileBtn('vbtn-reload', () => {
        if (this.player) this.player.executeReloadAction();
      });
      mapMobileBtn(
        'vbtn-sprint',
        () => {
          this.input.mobileSprint = true;
        },
        () => {
          this.input.mobileSprint = false;
        },
      );
      mapMobileBtn('vbtn-medkit', () => {
        if (this.player) this.player.useMedkit();
      });
      mapMobileBtn('vbtn-weapon', () => {
        if (this.player) {
          this.player.activeWpIdx = (this.player.activeWpIdx + 1) % this.player.weapons.length;
        }
      });
    }
  }

  syncSettingsFromDOM() {
    this.graphicsPreset = document.getElementById('setting-graphics').value;
    this.particles.setQuality(preset);
    let showFps = document.getElementById('setting-fps').checked;
    document.getElementById('hud-fps').style.display = showFps ? 'block' : 'none';
  }

  renderStatisticsToDOM() {
    let stats = this.storage.getStats();
    document.getElementById('stat-total-kills').innerText = stats.totalKills;
    document.getElementById('stat-total-deaths').innerText = stats.totalDeaths;
    document.getElementById('stat-high-score').innerText = stats.highestScore;
    document.getElementById('stat-high-wave').innerText = stats.highestWave;
    document.getElementById('stat-max-time').innerText = `${stats.longestSurvival}s`;
    let acc = stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;
    document.getElementById('stat-accuracy').innerText = `${acc}%`;

    // Render Tabel Top 10 Data Leaderboard Lokal
    let board = this.storage.getLeaderboard();
    let tbody = document.querySelector('#leaderboard-table tbody');
    tbody.innerHTML = '';
    board.forEach((item, index) => {
      let row = `<tr><td>${index + 1}</td><td>${item.name}</td><td>${item.score}</td><td>WAVE ${item.wave}</td><td>${item.date}</td></tr>`;
      tbody.innerHTML += row;
    });
  }

  initInputListeners() {
    window.addEventListener('keydown', (e) => {
      let k = e.key.toLowerCase();
      this.input.keys[k] = true;

      // Swap senjata cepat via tombol numeric keyboard desktop
      if (this.player && ['1', '2', '3', '4', '5', '6'].includes(k)) {
        let idx = parseInt(k) - 1;
        if (idx < this.player.weapons.length) this.player.activeWpIdx = idx;
      }
      if (k === 'r' && this.player) this.player.executeReloadAction();
      if ((k === 'q' || k === 'e') && this.player) this.player.useMedkit();
    });
    window.addEventListener('keyup', (e) => {
      this.input.keys[e.key.toLowerCase()] = false;
    });

    window.addEventListener('mousemove', (e) => {
      this.input.mousePos.set(e.clientX, e.clientY);
    });
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.input.leftClick = true;
        this.audio.init(); // Unlock konteks audio via gestur user mousedown
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.input.leftClick = false;
    });
  }

  bootUpGameplaySequence() {
    // Alihkan layar UI Overlay
    document.querySelectorAll('.ui-screen').forEach((s) => s.classList.add('hidden'));
    document.getElementById('hud-container').classList.remove('hidden');

    // Instansiasi Karakter Pemain & Reset Parameter Lapangan Pertandingan
    this.player = new PlayerActor(this);
    this.obstacles = [];
    this.enemies = [];
    this.loots = [];
    this.floatingTexts = [];
    this.bossNode = null;
    this.bullets.forEach((b) => (b.active = false));

    this.score = 0;
    this.killCount = 0;
    this.wave = 1;
    this.waveInProgress = false;
    this.waveCountdownTimer = Date.now() + 3000; // 3 Detik jeda persiapan wave pertama
    this.matchStartTime = Date.now();
    this.cycleTimeTracker = Date.now();

    // Bangun Procedural Map Grid Sesuai Pilihan Deployment Zone
    this.generateProceduralEnvironmentMap();

    this.gameState = 'GAMEPLAY';
  }

  generateProceduralEnvironmentMap() {
    let size = this.worldSize;
    // Buat Dinding Sisi Batas Terluar Dunia Perimeter Map
    this.obstacles.push(new EnvironmentObstacle(0, 0, size, 40, 'wall'));
    this.obstacles.push(new EnvironmentObstacle(0, 0, 40, size, 'wall'));
    this.obstacles.push(new EnvironmentObstacle(0, size - 40, size, 40, 'wall'));
    this.obstacles.push(new EnvironmentObstacle(size - 40, 0, 40, size, 'wall'));

    // Letakkan Objek Rintangan Secara Acak Mengikuti Karakteristik Tema Bioma Map
    let count = this.selectedMap === 'spacestation' ? 120 : 80;
    if (this.selectedMap === 'random') {
      let zones = ['hangar', 'spacestation', 'military', 'desert', 'city'];
      this.selectedMap = zones[Math.floor(Math.random() * zones.length)];
    }

    for (let i = 0; i < count; i++) {
      let rx = Math.random() * (size - 400) + 200;
      let ry = Math.random() * (size - 400) + 200;

      // Jangan taruh objek solid menumpuk tepat di titik spawn awal player
      if (Math.abs(rx - 2000) < 250 && Math.abs(ry - 2000) < 250) continue;

      let rw = Math.random() * 120 + 60;
      let rh = Math.random() * 120 + 60;
      let type = 'container';
      if (this.selectedMap === 'desert') type = 'wreck';
      else if (this.selectedMap === 'city') type = Math.random() > 0.4 ? 'wall' : 'crate';
      else if (Math.random() > 0.7) type = 'barrel';

      this.obstacles.push(new EnvironmentObstacle(rx, ry, rw, rh, type));
    }
  }

  spawnBulletNode(x, y, angle, wp, isEnemy = false) {
    let b = this.bullets.find((item) => !item.active);
    // Track statistik peluru berjalan untuk akumulasi akurasi player
    if (!isEnemy && this.gameState === 'GAMEPLAY') {
      let stats = this.storage.getStats();
      stats.shotsFired++;
      this.storage.saveStats(stats);
    }
    if (b) b.init(x, y, angle, wp, isEnemy, isEnemy ? 0 : this.player.critChance);
  }

  spawnFloatingTextNode(x, y, text, color = '#ffffff', size = 16) {
    this.floatingTexts.push(new FloatingTextNode(x, y, text, color, size));
  }

  spawnEnemyWaveGroup() {
    this.waveInProgress = true;
    let baseCount = 10 + this.wave * 5;
    if (this.difficulty === 'hard') baseCount = Math.floor(baseCount * 1.4);
    if (this.difficulty === 'nightmare') baseCount = Math.floor(baseCount * 1.8);

    // Cek Apakah Wave Merupakan Siklus Pertempuran Boss Raksasa (Setiap Kelipatan 10 Wave)
    if (this.wave % 10 === 0 || this.gameMode === 'bossrush') {
      let bx = this.player.pos.x + (Math.random() - 0.5) * 600;
      let by = this.player.pos.y - 400;
      this.bossNode = new MegaBossEntity(this, bx, by);
      this.spawnFloatingTextNode(this.player.pos.x, this.player.pos.y - 100, 'WARNING: HARBINGER CLASS MECH DETECTED', '#ef4444', 30);
      if (this.gameMode === 'bossrush') return; // Boss Rush membatasi spawn kroco minion awal
    }

    let typesPool = ['grunt'];
    if (this.wave >= 2) typesPool.push('runner');
    if (this.wave >= 4) typesPool.push('kamikaze');
    if (this.wave >= 6) typesPool.push('tank');
    if (this.wave >= 8) typesPool.push('sniper', 'elite');

    for (let i = 0; i < baseCount; i++) {
      // Tentukan koordinat spawn melingkar di luar batas bidang pandang layar kamera
      let angle = Math.random() * Math.PI * 2;
      let spawnDist = Math.random() * 400 + 700;
      let ex = this.player.pos.x + Math.cos(angle) * spawnDist;
      let ey = this.player.pos.y + Math.sin(angle) * spawnDist;

      // Pastikan clamping koordinat musuh agar tidak spawn bocor ke luar peta
      ex = Math.max(80, Math.min(this.worldSize - 80, ex));
      ey = Math.max(80, Math.min(this.worldSize - 80, ey));

      let chosenType = typesPool[Math.floor(Math.random() * typesPool.length)];
      this.enemies.push(new EnemyAI(this, ex, ey, chosenType));
    }

    // Acak variasi perubahan cuaca alamiah dinamis setiap pergantian wave
    if (Math.random() > 0.6) {
      let wTypes = ['sunny', 'rain', 'fog', 'sandstorm'];
      this.weatherType = wTypes[Math.floor(Math.random() * wTypes.length)];
    }
  }

  triggerEnemyDeathScore(enemy) {
    this.killCount++;
    this.score += enemy.expReward * 10;
    this.player.addExp(enemy.expReward);

    let stats = this.storage.getStats();
    stats.shotsHit++; // Hitung hit peluru berhasil
    stats.totalKills++;
    this.storage.saveStats(stats);

    // Peluang Menjatuhkan Kotak Loot Suplai Drop (Loot Drop Probability Matrix)
    let dropRoll = Math.random();
    if (dropRoll < 0.22) {
      let lTypes = ['coin', 'ammo', 'armor', 'medkit'];
      if (Math.random() > 0.92) lTypes.push('weapon'); // Drop item crate senjata super langka
      let chosenLoot = lTypes[Math.floor(Math.random() * lTypes.length)];
      this.loots.push(new LootCollectible(enemy.pos.x, enemy.pos.y, chosenLoot));
    }
  }

  triggerBossDefeatedReward(boss) {
    this.score += 5000;
    this.spawnFloatingTextNode(boss.pos.x, boss.pos.y, 'BOSS ELIMINATED! CRITICAL CORE DROPPED', '#39ff14', 26);
    this.loots.push(new LootCollectible(boss.pos.x, boss.pos.y, 'weapon'));
    this.loots.push(new LootCollectible(boss.pos.x + 30, boss.pos.y, 'medkit'));
    this.bossNode = null;
  }

  triggerBossDefeatedReward(boss) {
    this.score += 15000;
    this.player.addExp(800);
    this.bossNode = null;
    this.loots.push(new LootCollectible(boss.pos.x, boss.pos.y, 'weapon'));
  }

  triggerRadialExplosionArea(centerPos, radius, maxDmg) {
    this.audio.playExplosion();
    this.camera.shake(12);

    // Cek ledakan melukai musuh di radius
    this.enemies.forEach((e) => {
      if (!e.active) return;
      let d = e.pos.dist(centerPos);
      if (d < radius + e.radius) {
        let falloff = 1 - d / radius;
        e.takeDamage(maxDmg * falloff);
      }
    });

    // Ledakan melukai boss jika aktif
    if (this.bossNode && this.bossNode.active) {
      let d = this.bossNode.pos.dist(centerPos);
      if (d < radius + this.bossNode.radius) {
        this.bossNode.takeDamage(maxDmg * 0.6);
      }
    }

    // Cek ledakan melukai diri sendiri (Self-inflicted Friendly Fire Damage)
    let pDist = this.player.pos.dist(centerPos);
    if (pDist < radius + this.player.radius) {
      this.player.takeDamage(maxDmg * 0.3 * (1 - pDist / radius));
    }
  }

  triggerLevelUpCycle() {
    this.gameState = 'LEVELUP';
    document.getElementById('levelup-screen').classList.remove('hidden');

    // Kompilasi Generator Kartu Opsi Peningkatan Kemampuan secara Acak
    let container = document.getElementById('upgrade-cards-container');
    container.innerHTML = '';

    const UPGRADE_POOL = [
      { title: 'KINETIC MODULATOR', desc: 'Meningkatkan output kerusakan tembakan (+25% Damage Matrix)', action: () => (this.player.damageMod += 0.25) },
      {
        title: 'NANO-CORE BATTERY',
        desc: 'Meningkatkan kapasitas vitalitas maksimum (+20 Max HP Organik)',
        action: () => {
          this.player.maxHp += 20;
          this.player.hp += 20;
        },
      },
      { title: 'DEFLECTOR REINFORCE', desc: 'Mereset kapasitas perisai pelindung (+40 Armor Plates)', action: () => (this.player.armor = Math.min(this.player.maxArmor, this.player.armor + 40)) },
      { title: 'MAGNETIC FEEDER', desc: 'Mengoptimalkan proses kalibrasi mag (+20% Kecepatan Reload)', action: () => (this.player.reloadMod -= 0.2) },
      { title: 'OVERCLOCK SYNAPSE', desc: 'Meningkatkan kelincahan gerak motorik (+15% Velocity Speed)', action: () => (this.player.speedMod += 0.15) },
      { title: 'CRIT-EYE SCANNER', desc: 'Menambahkan probabilitas serangan kritikal (+8% Critical Chance)', action: () => (this.player.critChance += 0.08) },
      { title: 'EXTENDED MAG-WELL', desc: 'Memperluas volume magasin peluru (+30% Magazine Size Capacity)', action: () => (this.player.magazineMod += 0.3) },
    ];

    // Acak ambil 3 kartu berbeda dari kolam upgrade
    let shuffled = [...UPGRADE_POOL].sort(() => 0.5 - Math.random()).slice(0, 3);

    shuffled.forEach((opt) => {
      let card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `<div class="card-title">${opt.title}</div><div class="card-desc">${opt.desc}</div>`;
      card.addEventListener('click', () => {
        opt.action();
        document.getElementById('levelup-screen').classList.add('hidden');
        this.gameState = 'GAMEPLAY';
      });
      container.appendChild(card);
    });
  }

  triggerGameOver() {
    this.gameState = 'GAMEOVER';
    document.getElementById('hud-container').classList.add('hidden');
    document.getElementById('gameover-screen').classList.remove('hidden');

    let runtimeSec = Math.floor((Date.now() - this.matchStartTime) / 1000);
    let stats = this.storage.getStats();

    // Rekam pembaruan catatan rekor tertinggi lokal
    if (this.score > stats.highestScore) stats.highestScore = this.score;
    if (this.wave > stats.highestWave) stats.highestWave = this.wave;
    if (runtimeSec > stats.longestSurvival) stats.longestSurvival = runtimeSec;
    stats.totalDeaths++;
    this.storage.saveStats(stats);

    // Cetak data ringkasan ke elemen HTML DOM
    document.getElementById('go-score').innerText = this.score;
    document.getElementById('go-kills').innerText = this.killCount;
    document.getElementById('go-wave').innerText = this.wave;
    document.getElementById('go-time').innerText = `${runtimeSec}s`;
    let acc = stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;
    document.getElementById('go-accuracy').innerText = `${acc}%`;

    // Interupsi tombol submit rekor leaderboard saat pergantian nama
    const saveHandler = () => {
      let name = document.getElementById('player-name-input').value.trim() || 'ANONYMOUS';
      this.storage.registerLeaderboardRecord(name, this.score, this.wave);
      document.getElementById('btn-abort').click();
      document.getElementById('btn-retry').removeEventListener('click', saveHandler);
    };
    // Bind otomatis ke tombol navigasi abort pasca kematian tempur
    document.getElementById('btn-abort').addEventListener(
      'click',
      () => {
        let name = document.getElementById('player-name-input').value.trim() || 'OPERATOR';
        this.storage.registerLeaderboardRecord(name, this.score, this.wave);
      },
      { once: true },
    );
  }

  // ============================================================================
  // 15. ALUR PIPELINE SIMULASI: LOOP FRAME ENGINE UTAMA
  // ============================================================================
  masterLoopFrame(timestamp) {
    let elapsed = timestamp - this.lastFrameTimestamp;
    this.lastFrameTimestamp = timestamp;

    // Diagnostik Kalkulasi FPS Counter Teknis Ticker
    this.frameCount++;
    this.fpsIntervalTimer += elapsed;
    if (this.fpsIntervalTimer >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsIntervalTimer -= 1000;
      document.getElementById('hud-fps').innerText = `FPS: ${this.fps}`;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Cabang Manajemen Pembaruan State Loop (State Pipeline Router)
    if (this.gameState === 'GAMEPLAY' || this.gameState === 'LEVELUP') {
      if (this.gameState === 'GAMEPLAY') this.updateGameplaySystems();
      this.renderGameplayCanvasView();
      this.renderMinimapRadarHUD();
      this.updateHUDDisplayLabels();
    } else {
      // Render Background Estetik Kosmetik Halus Di Menu Utama via Partikel Bebas
      this.renderMenuBackgroundEffects();
    }

    requestAnimationFrame((t) => this.masterLoopFrame(t));
  }

  updateGameplaySystems() {
    // Pembaruan Siklus Siang-Malam Global Ambiance (Ambient Dynamic Multiplier Clock)
    let timeElapsed = Date.now() - this.cycleTimeTracker;
    if (timeElapsed < 30000) this.timeCycle = 'day';
    else if (timeElapsed < 45000) this.timeCycle = 'sunset';
    else if (timeElapsed < 75000) this.timeCycle = 'night';
    else {
      this.cycleTimeTracker = Date.now();
      this.timeCycle = 'day';
    }

    // Pembaruan Logika Entitas Inti Player
    this.player.update(this.input, this.joystick);

    // Eksekusi Tembakan Terus Menerus Jika Klik Mouse / Tombol Mobile Ditahan
    if (this.input.leftClick) {
      this.player.executeShootAction();
    }

    // Jalankan Update Projektil Peluru Pre-pooled Node Array
    this.bullets.forEach((b) => {
      if (b.active) {
        b.update(this);
        // Deteksi Tumbukan Peluru terhadap Aktor Target (Bullet vs Actors Collision)
        if (b.isEnemyBullet) {
          if (b.pos.dist(this.player.pos) < this.player.radius) {
            this.player.takeDamage(b.damage);
            b.active = false;
          }
        } else {
          // Peluru Player Menyerang Pasukan Musuh Biasa
          for (let e of this.enemies) {
            if (e.active && b.pos.dist(e.pos) < e.radius) {
              let isCrit = Math.random() < b.critChance;
              let finalDmg = b.damage * this.player.damageMod;
              if (isCrit) finalDmg *= b.critMultiplier;

              e.takeDamage(finalDmg, isCrit);
              b.active = false;
              if (b.splash > 0) this.triggerRadialExplosionArea(b.pos, b.splash, b.damage);
              break;
            }
          }
          // Peluru Player Menyerang Modul Boss Raksasa
          if (b.active && this.bossNode && this.bossNode.active) {
            if (b.pos.dist(this.bossNode.pos) < this.bossNode.radius) {
              let isCrit = Math.random() < b.critChance;
              let finalDmg = b.damage * this.player.damageMod;
              if (isCrit) finalDmg *= b.critMultiplier;

              this.bossNode.takeDamage(finalDmg, isCrit);
              b.active = false;
              if (b.splash > 0) this.triggerRadialExplosionArea(b.pos, b.splash, b.damage);
            }
          }
        }
      }
    });

    // Pembaruan Logika Kecerdasan Buatan Gerak Pasukan Musuh
    this.enemies = this.enemies.filter((e) => e.active);
    this.enemies.forEach((e) => e.update());

    // Pembaruan Logika Gerak Siklus Aksi Boss Raksasa
    if (this.bossNode) {
      if (this.bossNode.active) this.bossNode.update();
      else this.bossNode = null;
    }

    // Pembaruan Logika Pengambilan Loot Drop Items Suplai
    this.loots = this.loots.filter((l) => l.active);
    this.loots.forEach((l) => l.update(this.player));

    // Pembaruan Teks Floating Pop-up Damage
    this.floatingTexts = this.floatingTexts.filter((t) => t.active);
    this.floatingTexts.forEach((t) => t.update());

    // Pembaruan Mesin Simulasi Fisika Partikel Visual Debris
    this.particles.pool.forEach((p) => {
      if (p.active) p.update();
    });

    // Kamera Mengunci Fokus Titik Koordinat Posisi Player Node
    this.camera.update(this.player.pos.x, this.player.pos.y, this.worldSize);

    // Manajemen Logika Alur Sistem Wave Berkelanjutan (Wave Spawner Loop Control)
    if (this.enemies.length === 0 && !this.bossNode && this.waveInProgress) {
      this.waveInProgress = false;
      this.score += this.wave * 2000; // Bonus skor penyelesaian wave bersih
      this.wave++;
      this.waveCountdownTimer = Date.now() + 5000; // 5 detik istirahat antar wave berikutnya
      this.spawnFloatingTextNode(this.player.pos.x, this.player.pos.y, `WAVE ${this.wave - 1} COMPLETED`, '#39ff14', 25);
    }

    if (!this.waveInProgress && Date.now() > this.waveCountdownTimer) {
      this.spawnEnemyWaveGroup();
    }
  }

  renderGameplayCanvasView() {
    let ctx = this.ctx;
    let cam = this.camera;

    // 1. RENDER GROUND GRID TILE BASE LINGKUNGAN (World Grid Render Floor)
    ctx.save();
    ctx.strokeStyle = this.selectedMap === 'desert' ? '#332211' : '#1e293b';
    ctx.lineWidth = 1;
    let gridSize = 100;

    let startX = Math.floor(cam.pos.x / gridSize) * gridSize;
    let startY = Math.floor(cam.pos.y / gridSize) * gridSize;

    for (let x = startX; x < startX + cam.width + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x - cam.pos.x, 0);
      ctx.lineTo(x - cam.pos.x, cam.height);
      ctx.stroke();
    }
    for (let y = startY; y < startY + cam.height + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y - cam.pos.y);
      ctx.lineTo(cam.width, y - cam.pos.y);
      ctx.stroke();
    }
    ctx.restore();

    // 2. RENDER SELURUH ENTITAS FIELD (Urutan Layering Kedalaman Grafis)
    this.obstacles.forEach((obs) => obs.draw(ctx, cam));
    this.loots.forEach((l) => l.draw(ctx, cam));
    this.bullets.forEach((b) => b.draw(ctx, cam));
    this.enemies.forEach((e) => e.draw(ctx, cam));
    if (this.bossNode) this.bossNode.draw(ctx, cam);
    this.player.draw(ctx, cam);

    // Render Lapisan Array Engine Partikel Debris Efek
    this.particles.pool.forEach((p) => {
      if (!p.active) return;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      if (p.glow) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
      }
      ctx.fillStyle = p.color;
      ctx.fillRect(p.pos.x - cam.pos.x, p.pos.y - cam.pos.y, p.size, p.size);
      ctx.restore();
    });

    // Render Teks Terapung Floating Text Node Damage
    this.floatingTexts.forEach((t) => t.draw(ctx, cam));

    // 3. LAYER REVEAL ATMOSFERIK (Sistem Simulasi Cuaca & Transisi Waktu Gelap Malam)
    this.renderAtmosphericAmbianceFilters(ctx, cam);
  }

  renderAtmosphericAmbianceFilters(ctx, cam) {
    // Efek Visual Cuaca Aktif Masking Overlays
    if (this.weatherType === 'rain') {
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.22)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 30; i++) {
        let rx = Math.random() * cam.width;
        let ry = Math.random() * cam.height;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 15, ry + 35);
        ctx.stroke();
      }
    } else if (this.weatherType === 'sandstorm') {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
      ctx.fillRect(0, 0, cam.width, cam.height);
      ctx.strokeStyle = 'rgba(120, 53, 4, 0.15)';
      for (let i = 0; i < 15; i++) {
        let rx = Math.random() * cam.width;
        let ry = Math.random() * cam.height;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + 80, ry + 10);
        ctx.stroke();
      }
    } else if (this.weatherType === 'fog') {
      let fogGrad = ctx.createRadialGradient(cam.width / 2, cam.height / 2, cam.width / 4, cam.width / 2, cam.height / 2, cam.width / 1.2);
      fogGrad.addColorStop(0, 'rgba(255,255,255,0)');
      fogGrad.addColorStop(1, 'rgba(203, 213, 225, 0.25)');
      ctx.fillStyle = fogGrad;
      ctx.fillRect(0, 0, cam.width, cam.height);
    }

    // Topeng Ambiance Cahaya Malam Keremangan (Dynamic Torch Lighting Composite Mask)
    if (this.timeCycle === 'sunset' || this.timeCycle === 'night') {
      ctx.save();
      let opacity = this.timeCycle === 'sunset' ? 0.4 : 0.88;

      // Atur mode pemicu musuh ekstra agresif di kala malam tiba (Night Aggression Modifier)
      if (this.timeCycle === 'night') {
        this.enemies.forEach((e) => (e.speed *= 1.002)); // Buff mikro bertumpuk akselerasi malam
      }

      // Buat Canvas Bayangan Hitam Pekat overlay malam
      let offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = cam.width;
      offscreenCanvas.height = cam.height;
      let octx = offscreenCanvas.getContext('2d');
      octx.fillStyle = this.timeCycle === 'sunset' ? 'rgba(124, 45, 18, 0.35)' : 'rgba(3, 7, 18, 0.88)';
      octx.fillRect(0, 0, cam.width, cam.height);

      // Potong Lubang Lingkaran Cahaya Senter di sekeliling Player (Torch Cut-out)
      let px = this.player.pos.x - cam.pos.x;
      let py = this.player.pos.y - cam.pos.y;
      let lightRad = this.timeCycle === 'sunset' ? 400 : 260;

      let radGrad = octx.createRadialGradient(px, py, 20, px, py, lightRad);
      radGrad.addColorStop(0, 'rgba(0,0,0,1)');
      radGrad.addColorStop(0.5, 'rgba(0,0,0,0.8)');
      radGrad.addColorStop(1, 'rgba(0,0,0,0)');

      octx.globalCompositeOperation = 'destination-out';
      octx.fillStyle = radGrad;
      octx.beginPath();
      octx.arc(px, py, lightRad, 0, Math.PI * 2);
      octx.fill();

      ctx.drawImage(offscreenCanvas, 0, 0);
      ctx.restore();
    }
  }

  renderMinimapRadarHUD() {
    let mCanvas = document.getElementById('minimapCanvas');
    let mctx = mCanvas.getContext('2d');
    mctx.clearRect(0, 0, 150, 150);

    mctx.save();
    mctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    mctx.beginPath();
    mctx.arc(75, 75, 75, 0, Math.PI * 2);
    mctx.fill();
    mctx.clip(); // Potong radar melingkar bundar sirkular

    // Rasio Konversi Skala Translasi Map 5000px ke Radar Mini 150px
    let factor = 150 / this.worldSize;

    // Gambar Pin Titik Posisi Pasukan Obstacle Solid Tembok (Gray pins)
    mctx.fillStyle = 'rgba(255,255,255,0.06)';
    this.obstacles.forEach((obs) => {
      mctx.fillRect(obs.pos.x * factor, obs.pos.y * factor, obs.w * factor, obs.h * factor);
    });

    // Gambar Pin Titik Posisi Koleksi Drop Loot Suplai (Purple/Green pins)
    this.loots.forEach((l) => {
      mctx.fillStyle = l.type === 'weapon' ? '#ff007f' : '#00f0ff';
      mctx.fillRect(l.pos.x * factor - 1, l.pos.y * factor - 1, 3, 3);
    });

    // Gambar Pin Pasukan Musuh Biasa (Red Micro dots)
    mctx.fillStyle = '#ef4444';
    this.enemies.forEach((e) => {
      mctx.fillRect(e.pos.x * factor - 1, e.pos.y * factor - 1, 2.5, 2.5);
    });

    // Gambar Pin Titik Target Boss Raksasa Jika Aktif (Enormous Blinking Pink Dot)
    if (this.bossNode && this.bossNode.active) {
      mctx.fillStyle = Date.now() % 400 > 200 ? '#ff007f' : '#ffffff';
      mctx.beginPath();
      mctx.arc(this.bossNode.pos.x * factor, this.bossNode.pos.y * factor, 4, 0, Math.PI * 2);
      mctx.fill();
    }

    // Gambar Pin Posisi Indikator Operator Utama Player (Neon Green Dot Center)
    mctx.fillStyle = '#39ff14';
    mctx.shadowBlur = 5;
    mctx.shadowColor = '#39ff14';
    mctx.beginPath();
    mctx.arc(this.player.pos.x * factor, this.player.pos.y * factor, 3.5, 0, Math.PI * 2);
    mctx.fill();

    mctx.restore();
  }

  updateHUDDisplayLabels() {
    let p = this.player;
    let wp = p.getActiveWeapon();

    // Pembaruan Progress Bar Bar Pengisi Vitalitas Organik Pemain
    document.getElementById('bar-hp').style.width = `${(p.hp / p.maxHp) * 100}%`;
    document.getElementById('bar-arm').style.width = `${(p.armor / p.maxArmor) * 100}%`;
    document.getElementById('bar-stm').style.width = `${(p.stamina / p.maxStamina) * 100}%`;
    document.getElementById('bar-exp').style.width = `${(p.exp / p.expNeeded) * 100}%`;

    document.getElementById('hud-level').innerText = p.level;
    document.getElementById('hud-score').innerText = String(this.score).padStart(8, '0');
    document.getElementById('hud-kills').innerText = `Kills: ${this.killCount}`;

    // Pembaruan Label Info Baris Atas Wave Status
    if (!this.waveInProgress) {
      let remain = Math.max(0, Math.ceil((this.waveCountdownTimer - Date.now()) / 1000));
      document.getElementById('hud-wave').innerText = 'WARMUP STAGE';
      document.getElementById('hud-enemies-left').innerText = `Next Wave Deployment In: ${remain}s`;
    } else {
      document.getElementById('hud-wave').innerText = `WAVE ${String(this.wave).padStart(2, '0')}`;
      document.getElementById('hud-enemies-left').innerText = `Hostiles Terminated: ${this.enemies.length} Remaining`;
    }

    // Sinkronisasi teks persenjataan aktif magasin
    document.getElementById('hud-weapon-name').innerText = wp.name;
    document.getElementById('hud-ammo-clip').innerText = wp.ammoInClip;
    document.getElementById('hud-ammo-reserve').innerText = wp.ammoReserve === Infinity ? '∞' : wp.ammoReserve;

    let reloadIndicator = document.getElementById('hud-reload-indicator');
    if (wp.isReloading) reloadIndicator.classList.remove('hidden');
    else reloadIndicator.classList.add('hidden');

    document.getElementById('hud-difficulty-mode').innerText = `${this.gameMode.toUpperCase()} / ${this.difficulty.toUpperCase()}`;

    // Handler Hubungan Visibilitas Bar Nyawa Atas Mega Boss Encounter Panel
    let bossContainer = document.getElementById('boss-health-container');
    if (this.bossNode && this.bossNode.active) {
      bossContainer.classList.remove('hidden');
      document.getElementById('boss-name-label').innerText = `HARBINGER CYBER-MECH PHASE ${this.bossNode.phase}`;
      let pct = (this.bossNode.hp / this.bossNode.maxHp) * 100;
      document.getElementById('boss-health-bar').style.width = `${pct}%`;
    } else {
      bossContainer.classList.add('hidden');
    }
  }

  renderMenuBackgroundEffects() {
    let ctx = this.ctx;
    ctx.fillStyle = 'rgba(3, 7, 18, 0.15)'; // Soft overlay trails
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Secara acak spawn partikel melayang acak dekoratif menu siber background
    if (Math.random() > 0.85) {
      let rx = Math.random() * this.canvas.width;
      let ry = this.canvas.height + 20;
      this.particles.spawn(rx, ry, (Math.random() - 0.5) * 2, -Math.random() * 2 - 1, '#00f0ff', Math.random() * 3 + 1, 0.005, 0, false);
    }

    // Jalankan update render kolam partikel dekoratif menu instan
    this.particles.pool.forEach((p) => {
      if (!p.active) return;
      p.update();
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.pos.x, p.pos.y, p.size, p.size);
      ctx.restore();
    });
  }
}

// Inisialisasi Bootloader Engine Utama setelah seluruh file DOM terunduh sempurna
window.addEventListener('DOMContentLoaded', () => {
  window.AppCoreEngine = new MasterGameEngine();
});
