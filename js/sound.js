/* =========================================================
   Звуки сцени.
   Файли з папки /sounds (якщо вони є) + запасні сигнали Web Audio.
   Якщо файлу немає або браузер його не відтворив — грає синтезований
   сигнал. Жодних помилок назовні.
   ========================================================= */
window.PD = window.PD || {};

PD.Sound = (function () {
  var ctx = null, master = null, noiseBuf = null;
  var volume = 0.7, muted = false;
  var FILES = { applause: 'applause' };
  var EXT = ['mp3', 'ogg', 'wav'];
  var files = {};          // key -> HTMLAudioElement (тільки ті, що завантажились)
  var playing = [];        // активні HTMLAudioElement
  var synthNodes = [];     // активні вузли Web Audio

  function ready() { return !!ctx && ctx.state === 'running'; }

  function init() {
    if (!ctx) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
        master = ctx.createGain();
        master.connect(ctx.destination);
        applyVolume();
        var len = ctx.sampleRate * 1;
        noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { ctx = null; }
      preload();
    }
    if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* */ } }
  }

  function preload() {
    Object.keys(FILES).forEach(function (k) { tryLoad(k, 0); });
  }

  function tryLoad(key, i) {
    if (i >= EXT.length) return;
    var a = new Audio();
    var done = false;
    a.preload = 'auto';
    a.addEventListener('canplaythrough', function () { if (!done) { done = true; files[key] = a; } }, { once: true });
    a.addEventListener('error', function () { if (!done) { done = true; tryLoad(key, i + 1); } }, { once: true });
    a.src = 'sounds/' + FILES[key] + '.' + EXT[i];
    try { a.load(); } catch (e) { /* */ }
  }

  function applyVolume() {
    var v = muted ? 0 : volume;
    if (master && ctx) master.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
    playing.forEach(function (a) { a.volume = v; });
  }

  function setVolume(v, m) {
    volume = Math.max(0, Math.min(1, v));
    var wasMuted = muted;
    muted = !!m;
    if (muted && !wasMuted) stopAll();
    applyVolume();
  }

  function stopAll() {
    playing.forEach(function (a) { try { a.pause(); a.currentTime = 0; } catch (e) { /* */ } });
    playing = [];
    synthNodes.forEach(function (n) { try { n.stop(); } catch (e) { /* */ } });
    synthNodes = [];
  }

  /* ---------- відтворення файлу ---------- */
  function playFile(key, maxMs) {
    var src = files[key];
    if (!src) return false;
    var a = src.cloneNode(true);
    a.volume = muted ? 0 : volume;
    playing.push(a);
    var cleanup = function () {
      var i = playing.indexOf(a);
      if (i >= 0) playing.splice(i, 1);
    };
    a.addEventListener('ended', cleanup);
    var p = a.play();
    if (p && p.catch) p.catch(function () { cleanup(); synth(key); });
    if (maxMs) setTimeout(function () { fadeOut(a); }, maxMs);
    return true;
  }

  function fadeOut(a) {
    var steps = 8, i = 0, start = a.volume;
    var t = setInterval(function () {
      i++;
      a.volume = Math.max(0, start * (1 - i / steps));
      if (i >= steps) {
        clearInterval(t);
        try { a.pause(); } catch (e) { /* */ }
        var k = playing.indexOf(a);
        if (k >= 0) playing.splice(k, 1);
      }
    }, 40);
  }

  /* ---------- синтез ---------- */
  function track(node, stopAt) {
    synthNodes.push(node);
    node.onended = function () {
      var i = synthNodes.indexOf(node);
      if (i >= 0) synthNodes.splice(i, 1);
    };
    node.stop(stopAt);
  }

  function tone(freq, start, dur, opt) {
    opt = opt || {};
    var t0 = ctx.currentTime + start;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = opt.type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t0 + dur);
    if (opt.vib) {
      var l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = opt.vib; lg.gain.value = opt.vibDepth || 30;
      l.connect(lg); lg.connect(o.frequency); l.start(t0); track(l, t0 + dur + 0.05);
    }
    var peak = opt.gain || 0.2;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (opt.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); track(o, t0 + dur + 0.05);
  }

  function noise(start, dur, opt) {
    opt = opt || {};
    var t0 = ctx.currentTime + start;
    var s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    var f = ctx.createBiquadFilter();
    f.type = opt.filter || 'bandpass';
    f.frequency.value = opt.freq || 1500;
    f.Q.value = opt.q || 1;
    var g = ctx.createGain();
    var peak = opt.gain || 0.2;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (opt.attack || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t0, Math.random() * 0.5); track(s, t0 + dur + 0.05);
  }

  var SYNTH = {
    ding: function () {
      tone(1318, 0, 1.4, { gain: 0.16 });
      tone(2637, 0, 0.7, { gain: 0.04 });
    },
    pop: function () { tone(320, 0, 0.16, { to: 980, gain: 0.25 }); tone(660, 0.12, 0.25, { to: 1320, gain: 0.12 }); },
    question: function () { tone(520, 0, 0.14, { type: 'triangle', gain: 0.22 }); tone(720, 0.14, 0.22, { type: 'triangle', gain: 0.22, to: 820 }); },
    applause: function () {
      for (var i = 0; i < 140; i++) {
        var t = Math.random() * 2.6;
        var env = t < 0.4 ? t / 0.4 : Math.max(0.15, 1 - (t - 0.4) / 2.4);
        noise(t, 0.04, { freq: 1200 + Math.random() * 1800, q: 1.2, gain: 0.22 * env });
      }
    },
    star: function () { [784, 988, 1175, 1568, 1976].forEach(function (f, i) { tone(f, i * 0.07, 0.5, { gain: 0.11 }); }); },
    stamp: function () { tone(170, 0, 0.18, { to: 45, gain: 0.5 }); noise(0, 0.06, { freq: 600, gain: 0.25, filter: 'lowpass' }); },
    fanfare: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.13, i === 3 ? 0.9 : 0.2, { type: 'triangle', gain: 0.17 }); }); }
  };

  function synth(key) {
    if (!ctx || !SYNTH[key]) return;
    try { SYNTH[key](); } catch (e) { /* */ }
  }

  /* Головна функція: спочатку файл, інакше — синтез */
  function play(key, opt) {
    if (!ctx || muted) return;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* */ } }
    opt = opt || {};
    if (FILES[key] && playFile(key, opt.maxMs)) return;
    synth(key);
  }

  function hasFile(key) { return !!files[key]; }

  return { init: init, ready: ready, play: play, setVolume: setVolume, stopAll: stopAll, hasFile: hasFile };
})();
