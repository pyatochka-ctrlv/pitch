/* =========================================================
   СЦЕНА: отримує стан і події з пульта та показує їх.
   Ефекти (хмарки журі, оплески, «незбивний момент»)
   показуються лише в режимі «Сцена».
   ========================================================= */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var stageEl = $('stage');
  var view = null;
  var lastRemaining = null;
  var timers = {};          // іменовані таймаути ефектів
  var C = 2 * Math.PI * 68; // довжина кільця таймера

  /* ---------- масштаб 1280×720 під вікно ---------- */
  function fit() {
    var s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    stageEl.style.transform = 'translate(-50%, -50%) scale(' + s + ')';
    stageEl.style.transformOrigin = '50% 50%';
  }
  window.addEventListener('resize', fit);
  fit();

  function later(name, ms, fn) {
    clearTimeout(timers[name]);
    timers[name] = setTimeout(fn, ms);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function mmss(sec) {
    sec = Math.max(0, Math.ceil(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }
  function isStageMode() { return !!view && view.mode === 'stage'; }

  /* ---------- статичні частини ---------- */
  function buildStatic() {
    // печатки: коло + назва під ним
    $('stamps').innerHTML = PD.STAMPS.map(function (s) {
      return '<div class="stamp-cell" data-key="' + s.key + '" style="--ink:' + s.ink + '">' +
        '<div class="stamp-slot" data-key="' + s.key + '"></div>' +
        '<div class="stamp-name">' + s.label + '</div></div>';
    }).join('');

    // шпаргалка: лише іконка + назва
    $('cheat-list').innerHTML = PD.TECHNIQUES.map(function (t) {
      return '<div class="tech" data-key="' + t.key + '"><div class="te">' + t.emoji + '</div><div class="tt">' + t.title + '</div></div>';
    }).join('');

    // журі: три силуети зі спини
    var shapes = [
      '<circle class="body" cx="115" cy="22" r="17"/><circle class="body" cx="115" cy="58" r="40"/>',
      '<circle class="body" cx="115" cy="54" r="44"/><circle class="body" cx="80" cy="40" r="10"/><circle class="body" cx="150" cy="40" r="10"/>',
      '<circle class="body" cx="115" cy="58" r="40"/><circle class="body" cx="72" cy="62" r="14"/><circle class="body" cx="158" cy="62" r="14"/>'
    ];
    $('jury').innerHTML = shapes.map(function (s, i) {
      return '<div class="juror j' + i + '">' +
        '<div class="bubble"></div>' +
        '<svg viewBox="0 0 230 150" aria-hidden="true">' +
        '<path class="body" d="M8 160 Q8 96 115 88 Q222 96 222 160 Z"/>' + s + '</svg></div>';
    }).join('');

    // галерея
    $('g-chars').innerHTML = PD.CHARACTERS.map(function (c, i) {
      return '<div class="g-card" data-i="' + i + '"><div class="g-num">' + c.n + '</div>' +
        PD.Avatars.character(i, 0, { cloth: '#b9c2dc' }) + '</div>';
    }).join('');
    $('g-colors').innerHTML = PD.COLORS.map(function (c, i) {
      return '<div class="g-card" data-i="' + i + '"><div class="swatch" style="background:' + c.hex + '">' + c.n + '</div>' +
        '<div class="g-name">' + c.name + '</div></div>';
    }).join('');
    $('g-pets').innerHTML = PD.PETS.map(function (p, i) {
      return '<div class="g-card" data-i="' + i + '"><div class="g-num">' + p.n + '</div>' +
        (p.key === 'none' ? PD.Avatars.noPet() : PD.Avatars.pet(i)) +
        '<div class="g-name">' + p.name + '</div></div>';
    }).join('');
  }

  /* ---------- застосування стану ---------- */
  var sig = { preview: '', stage: '', final: '', stageId: null, mode: null };

  function avSig(a) { return a ? [a.char, a.color, a.pet].join('-') : ''; }

  function applyView(v, initial) {
    if (!v) return;
    var prev = view;
    view = v;

    // режим
    if (sig.mode !== v.mode) {
      if (!initial) clearEffects();
      stageEl.classList.remove('mode-gallery', 'mode-stage', 'mode-final');
      stageEl.classList.add('mode-' + (v.mode || 'gallery'));
      if (!initial && v.mode === 'final') celebrate();
      sig.mode = v.mode;
    }
    stageEl.classList.toggle('no-cheat', !v.showCheat);
    stageEl.classList.toggle('show-name', !!(v.stage && v.stage.name));

    PD.Sound.setVolume(v.volume == null ? 0.7 : v.volume, !!v.muted);

    renderGallery(v, initial);
    renderScene(v, prev, initial);
    renderFinal(v);
    tick(true);
  }

  function renderGallery(v, initial) {
    var p = v.preview;
    var s = avSig(p);
    ['g-chars', 'g-colors', 'g-pets'].forEach(function (id, k) {
      var val = p ? [p.char, p.color, p.pet][k] : -1;
      var cards = $(id).children;
      for (var i = 0; i < cards.length; i++) cards[i].classList.toggle('sel', i === val);
    });
    if (s === sig.preview) return;
    sig.preview = s;
    if (!p) { $('g-preview-slot').innerHTML = ''; $('g-preview-caption').textContent = ''; return; }
    $('g-preview-slot').innerHTML = PD.Avatars.full(p, 'live breathe' + (initial ? '' : ' pop'));
    $('g-preview-caption').textContent = 'Персонаж ' + (p.char + 1) + ', ' + PD.COLORS[p.color].name + ', ' + PD.PETS[p.pet].name;
    if (!initial && v.mode === 'gallery') PD.Sound.play('pop');
  }

  function renderScene(v, prev, initial) {
    var sp = v.stage;
    stageEl.classList.toggle('no-speaker', !sp);
    if (!sp) {
      $('speaker-slot').innerHTML = '';
      sig.stage = ''; sig.stageId = null;
      renderStamps(null, null, true);
      return;
    }
    // ім'я (з великої літери) та винахід
    $('speaker-name').textContent = sp.name ? PD.cap(sp.name) + ' представляє:' : '';
    var inv = (sp.invention || '').trim();
    var invEl = $('invention');
    invEl.textContent = inv ? '💡 ' + inv : '💡 Винахід-сюрприз';
    invEl.classList.toggle('long', inv.length > 38 && inv.length <= 70);
    invEl.classList.toggle('xlong', inv.length > 70);

    // аватар
    var s = sp.id + ':' + avSig(sp);
    if (s !== sig.stage) {
      var newSpeaker = sig.stageId !== sp.id;
      $('speaker-slot').innerHTML = PD.Avatars.full(sp, 'live breathe');
      sig.stage = s;
      sig.stageId = sp.id;
      if (newSpeaker && !initial && v.mode === 'stage') enter();
    }

    // печатки
    var sameSpeaker = prev && prev.stage && prev.stage.id === sp.id;
    renderStamps(sp.stamps, sameSpeaker ? prev.stage.stamps : null, initial || !sameSpeaker || v.mode !== 'stage');
  }

  function renderStamps(stamps, prevStamps, silent) {
    var cells = document.querySelectorAll('#stamps .stamp-cell');
    var slammed = false;
    for (var i = 0; i < cells.length; i++) {
      var key = cells[i].getAttribute('data-key');
      var slot = cells[i].querySelector('.stamp-slot');
      var on = !!(stamps && stamps[key]);
      var was = !!(prevStamps && prevStamps[key]);
      var existing = slot.querySelector('.stamp');
      cells[i].classList.toggle('on', on);
      if (on && !existing) {
        var def = PD.STAMPS[i];
        var el = document.createElement('div');
        el.className = 'stamp' + (silent ? '' : ' slam');
        el.style.setProperty('--rot', Math.round(rand(-14, 12)) + 'deg');
        el.innerHTML = '<span class="e">' + def.emoji + '</span>';
        slot.appendChild(el);
        if (!silent && !was) slammed = true;
      } else if (!on && existing) {
        existing.remove();
      }
    }
    if (slammed) {
      PD.Sound.play('stamp');
      var pp = $('passport');
      pp.classList.remove('thump'); void pp.offsetWidth; pp.classList.add('thump');
    }
  }

  function renderFinal(v) {
    var all = v.all || [];
    var s = all.map(function (a) { return a.id + avSig(a) + (a.invention || '') + (a.name || ''); }).join('|');
    if (s === sig.final) return;
    sig.final = s;
    var grid = $('final-grid');
    if (!all.length) { grid.innerHTML = '<div class="f-empty">Додайте дітей на пульті 🙂</div>'; return; }

    // підбираємо розмір, щоб усі вмістилися
    var W = 1160, H = 560, GAP = 14, K = 1.12, n = all.length;
    var capH = all.some(function (a) { return a.name; }) ? 64 : 46;
    var best = { h: 40, perRow: n };
    for (var rows = 1; rows <= 4; rows++) {
      var perRow = Math.ceil(n / rows);
      var hByH = (H - (rows - 1) * 8) / rows - capH;
      var hByW = ((W - (perRow - 1) * GAP) / perRow) / K;
      var h = Math.min(hByH, hByW, 320);
      if (h > best.h) best = { h: h, perRow: perRow };
    }
    var w = Math.floor(best.h * K);
    // ширина контейнера рівно під perRow елементів — тоді ряди діляться рівно
    var gw = best.perRow * w + (best.perRow - 1) * GAP + 2;
    grid.style.width = gw + 'px';
    grid.style.left = Math.round((1280 - gw) / 2) + 'px';
    grid.style.setProperty('--fh', Math.floor(best.h) + 'px');
    grid.innerHTML = all.map(function (a) {
      var cap = (a.name ? '<b>' + esc(PD.cap(a.name)) + '</b>' : '') + (a.invention ? '<span class="fi">' + esc(a.invention) + '</span>' : '');
      return '<div class="f-item" style="width:' + w + 'px">' +
        PD.Avatars.full(a, 'live breathe') +
        (cap ? '<div class="f-cap">' + cap + '</div>' : '') + '</div>';
    }).join('');
    // різний ритм дихання, щоб не рухались синхронно
    var avs = grid.querySelectorAll('.av-idle');
    for (var i = 0; i < avs.length; i++) avs[i].style.animationDelay = (-i * 0.53) + 's';
  }

  /* ---------- таймер ---------- */
  function tick() {
    if (!view) return;
    var t = view.timer || { duration: 60, running: false, accumulated: 0 };
    var dur = (t.duration || 60) * 1000;
    var elapsed = (t.accumulated || 0) + (t.running ? Date.now() - t.startedAt : 0);
    var idle = !t.running && elapsed <= 0;
    var remaining = idle ? dur : dur - elapsed;
    var done = !idle && remaining <= 0;

    var ring = $('ring');
    var frac = done ? 1 : Math.max(0, Math.min(1, remaining / dur));
    ring.style.strokeDasharray = C;
    ring.style.strokeDashoffset = C * (1 - frac);

    var timerEl = $('timer');
    // поки таймер не запущено — показуємо обрану тривалість, напр. «1:00»
    $('timer-text').textContent = done ? '🏁' : mmss(remaining / 1000);
    timerEl.classList.toggle('warn', !idle && !done && remaining <= 10000);
    timerEl.classList.toggle('done', done);
    stageEl.classList.toggle('time-done', done);

    if (done && lastRemaining !== null && lastRemaining > 0 && t.running && isStageMode()) PD.Sound.play('ding');
    lastRemaining = remaining;

    // спікер погойдується, поки йде таймер
    var av = document.querySelector('#speaker-slot .avatar');
    if (av) {
      av.classList.toggle('sway', !!t.running);
      av.classList.toggle('breathe', !t.running);
    }
  }
  setInterval(tick, 100);

  /* ---------- допоміжне для ефектів ---------- */
  function speakerAv() { return document.querySelector('#speaker-slot .avatar'); }
  function flashClass(el, cls, ms, name) {
    if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    later(name || cls, ms, function () { el.classList.remove(cls); });
  }
  function jurors() { return document.querySelectorAll('.juror'); }

  function hideBubbles() {
    var js = jurors();
    for (var i = 0; i < js.length; i++) {
      js[i].querySelector('.bubble').classList.remove('show');
      js[i].classList.remove('talk');
    }
  }

  function say(text) {
    hideBubbles();
    var j = jurors()[Math.floor(Math.random() * 3)];
    var b = j.querySelector('.bubble');
    b.textContent = text;
    void b.offsetWidth;
    b.classList.add('show');
    j.classList.add('talk');
    later('bubble', 3800, hideBubbles);
  }

  function floatEmoji(emoji, x, y, opt) {
    opt = opt || {};
    var el = document.createElement('div');
    el.className = 'float-emoji';
    el.textContent = emoji;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.fontSize = (opt.size || 48) + 'px';
    el.style.setProperty('--dur', (opt.dur || 2.6) + 's');
    el.style.setProperty('--dx', (opt.dx || rand(-60, 60)) + 'px');
    el.style.setProperty('--dy', (opt.dy || -rand(300, 460)) + 'px');
    el.style.setProperty('--r1', rand(-20, 20) + 'deg');
    el.style.setProperty('--r2', rand(-30, 30) + 'deg');
    el.style.animationDelay = (opt.delay || 0) + 's';
    $('fx-layer').appendChild(el);
    setTimeout(function () { el.remove(); }, ((opt.dur || 2.6) + (opt.delay || 0)) * 1000 + 300);
  }

  function jurorX(i) { return [255, 640, 1025][i]; }

  /* ---------- конфеті ---------- */
  var cv = $('confetti'), cx = cv.getContext('2d'), parts = [], raf = null;
  var COLORS = ['#ffcf3f', '#4ee1c1', '#ff6fae', '#6ea8ff', '#ff8a3d', '#a78bfa', '#ffffff'];
  function burst(n, x, y, spread) {
    for (var i = 0; i < n; i++) {
      var a = rand(-Math.PI, 0) * (spread || 1) - (spread ? (Math.PI * (1 - spread)) / 2 : 0);
      var sp = rand(6, 15);
      parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, r: rand(0, 6.28), vr: rand(-0.3, 0.3),
        w: rand(8, 14), h: rand(5, 9), c: pick(COLORS), life: rand(120, 190) });
    }
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function rain(n) {
    for (var i = 0; i < n; i++) {
      parts.push({ x: rand(0, 1280), y: rand(-400, -10), vx: rand(-1.5, 1.5), vy: rand(2, 5), r: rand(0, 6.28), vr: rand(-0.2, 0.2),
        w: rand(8, 14), h: rand(5, 9), c: pick(COLORS), life: 320 });
    }
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function loop() {
    raf = null;
    cx.clearRect(0, 0, 1280, 720);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.vy += 0.22; p.vx *= 0.99; p.vy = Math.min(p.vy, 7);
      p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life--;
      if (p.life <= 0 || p.y > 760) { parts.splice(i, 1); continue; }
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r);
      cx.globalAlpha = Math.min(1, p.life / 30);
      cx.fillStyle = p.c; cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 1);
      cx.restore();
    }
    if (parts.length) raf = requestAnimationFrame(loop);
    else cx.clearRect(0, 0, 1280, 720);
  }

  /* прибрати всі ефекти (при зміні режиму або з пульта) */
  function clearEffects() {
    hideBubbles();
    clearTimeout(timers.bubble);
    $('fx-layer').innerHTML = '';
    parts = [];
    cx.clearRect(0, 0, 1280, 720);
    var av = speakerAv();
    if (av) av.classList.remove('scratch', 'joy', 'appear');
  }

  /* ---------- ефекти ---------- */
  function enter() {
    var av = speakerAv();
    if (av) { av.classList.remove('appear'); void av.offsetWidth; av.classList.add('appear'); }
    flashClass(document.querySelector('.spot'), 'flash', 1300, 'spot');
    flashClass(document.querySelector('.spot-pool'), 'flash', 1300, 'pool');
    PD.Sound.play('pop');
  }

  function celebrate() {
    PD.Sound.play('fanfare');
    burst(90, 200, 620, 0.6);
    burst(90, 1080, 620, 0.6);
    setTimeout(function () { rain(120); }, 500);
    setTimeout(function () { PD.Sound.play('applause'); }, 600);
  }

  // ефекти, що працюють лише в режимі «Сцена»
  var STAGE_FX = {
    question: function (d) {
      say('🙋 ' + (d && d.text ? d.text : pick(PD.QUESTIONS)));
      flashClass(speakerAv(), 'scratch', 2700, 'scratch');
      PD.Sound.play('question');
    },
    applause: function () {
      hideBubbles();
      burst(80, 180, 640, 0.5);
      burst(80, 1100, 640, 0.5);
      for (var i = 0; i < 3; i++) for (var k = 0; k < 3; k++) floatEmoji('👏', jurorX(i) - 24 + rand(-50, 50), 580, { delay: k * 0.35 + rand(0, 0.2), size: 44, dy: -rand(200, 300) });
      flashClass(speakerAv(), 'joy', 2000, 'joy');
      PD.Sound.play('applause');
    },
    star: function () {
      var b = document.createElement('div');
      b.className = 'star-banner';
      b.textContent = '🌟 Незбивний момент! 🌟';
      $('fx-layer').appendChild(b);
      setTimeout(function () { b.remove(); }, 3400);
      for (var k = 0; k < 14; k++) {
        var s = document.createElement('div');
        s.className = 'sparkle';
        s.textContent = pick(['✨', '⭐', '🌟']);
        s.style.left = rand(560, 700) + 'px';
        s.style.top = rand(320, 380) + 'px';
        s.style.setProperty('--dx', rand(-420, 420) + 'px');
        s.style.setProperty('--dy', rand(-260, 200) + 'px');
        s.style.animationDelay = rand(0, 0.4) + 's';
        $('fx-layer').appendChild(s);
        (function (el) { setTimeout(function () { el.remove(); }, 2000); })(s);
      }
      burst(70, 640, 380, 1);
      flashClass(speakerAv(), 'joy', 2000, 'joy');
      PD.Sound.play('star');
    },
    enter: function () { enter(); }
  };

  // службові команди — у будь-якому режимі
  var ANY_FX = {
    silence: function () { PD.Sound.stopAll(); },
    clear: function () { clearEffects(); PD.Sound.stopAll(); },
    test: function () {
      PD.Sound.play('ding');
      var t = document.createElement('div');
      t.className = 'toast-small';
      t.textContent = PD.Sound.ready() ? '🔊 Звук працює' : '🔇 Клацніть по сцені, щоб увімкнути звук';
      $('fx-layer').appendChild(t);
      setTimeout(function () { t.remove(); }, 2500);
    }
  };

  /* ---------- зв'язок із пультом ---------- */
  function reportStatus() {
    PD.Sync.send('stage-status', { audio: PD.Sound.ready(), started: started });
  }

  PD.Sync.on(function (msg) {
    if (msg.type === 'view') applyView(msg.data, false);
    else if (msg.type === 'fx' && msg.data) {
      var k = msg.data.kind;
      if (ANY_FX[k]) ANY_FX[k](msg.data);
      else if (STAGE_FX[k] && isStageMode()) STAGE_FX[k](msg.data);
    }
    else if (msg.type === 'ping') reportStatus();
  });

  /* ---------- старт ---------- */
  var started = false;
  function start() {
    PD.Sound.init();
    started = true;
    $('start-overlay').classList.add('hidden');
    setTimeout(reportStatus, 300);
  }
  $('start-btn').addEventListener('click', start);
  // будь-який клік по сцені теж «будить» звук
  document.addEventListener('pointerdown', function () { if (started) PD.Sound.init(); });

  buildStatic();
  applyView(PD.Sync.load(PD.KEY_VIEW, null) || {
    mode: 'gallery', showCheat: false, volume: 0.7, muted: false,
    timer: { duration: 60, running: false, startedAt: 0, accumulated: 0 },
    preview: null, stage: null, all: []
  }, true);
  setInterval(reportStatus, 3000);
  reportStatus();
})();
