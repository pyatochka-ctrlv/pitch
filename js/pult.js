/* =========================================================
   ПУЛЬТ: тут живе весь стан уроку.
   Повний стан (імена, чекліст, нотатки) зберігається в localStorage
   під ключем pitchday-pult. На сцену йде лише «вид» без оцінок.
   ========================================================= */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var STAMP_KEYS = PD.STAMPS.map(function (s) { return s.key; });

  function freshTimer(duration) {
    return { duration: duration || 60, running: false, startedAt: 0, accumulated: 0 };
  }
  function defaults() {
    return {
      speakers: [], selectedId: null, stageId: null,
      mode: 'gallery', showName: false, showCheat: true,
      timer: freshTimer(60), volume: 0.7, muted: false
    };
  }

  var st = PD.Sync.load(PD.KEY_PULT, null) || defaults();
  st = Object.assign(defaults(), st);
  st.timer = Object.assign(freshTimer(60), st.timer || {});

  /* ---------- утиліти ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function byId(id) { return st.speakers.filter(function (s) { return s.id === id; })[0] || null; }
  function selected() { return byId(st.selectedId); }
  function onStage() { return byId(st.stageId); }
  function elapsedMs() { var t = st.timer; return t.accumulated + (t.running ? Date.now() - t.startedAt : 0); }
  function fmt(sec) {
    sec = Math.max(0, Math.round(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }
  var toastT;
  function toast(text) {
    var t = $('toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  function lastAction(text) { $('last-action').textContent = text; }
  function fired(btn) { if (!btn) return; btn.classList.remove('fired'); void btn.offsetWidth; btn.classList.add('fired'); }

  /* ---------- збереження і публікація ---------- */
  function avatarOf(s) { return s ? { char: s.char, color: s.color, pet: s.pet } : null; }

  function buildView() {
    var sp = onStage();
    return {
      mode: st.mode,
      showCheat: st.showCheat,
      volume: st.volume,
      muted: st.muted,
      timer: st.timer,
      preview: avatarOf(selected()),
      stage: sp ? {
        id: sp.id, char: sp.char, color: sp.color, pet: sp.pet,
        invention: sp.invention || '',
        name: st.showName ? sp.name : '',
        stamps: Object.assign({}, sp.stamps)
      } : null,
      all: st.speakers.map(function (s) {
        return { id: s.id, char: s.char, color: s.color, pet: s.pet, invention: s.invention || '', name: st.showName ? s.name : '' };
      })
    };
  }

  function commit(noRender) {
    PD.Sync.save(PD.KEY_PULT, st);
    var v = buildView();
    PD.Sync.save(PD.KEY_VIEW, v);
    PD.Sync.send('view', v);
    if (!noRender) render();
  }

  function fx(kind, data, label, btn) {
    PD.Sync.send('fx', Object.assign({ kind: kind }, data || {}));
    if (label) lastAction(label);
    fired(btn);
  }

  /* ---------- спікери ---------- */
  function addSpeaker(name) {
    name = (name || '').trim();
    if (!name) return;
    var n = st.speakers.length;
    var s = {
      id: PD.uid(), name: name,
      char: n % 6, color: (n * 3 + 5) % 8, pet: n % 6,
      invention: '', stamps: {}, checks: [false, false, false, false, false, false],
      duration: null, note: ''
    };
    STAMP_KEYS.forEach(function (k) { s.stamps[k] = false; });
    st.speakers.push(s);
    st.selectedId = s.id;
    commit();
    lastAction('➕ Додано: ' + name);
  }

  function removeSpeaker(id) {
    var s = byId(id);
    if (!s) return;
    if (!confirm('Видалити «' + s.name + '» зі списку? Позначки чекліста теж зникнуть.')) return;
    st.speakers = st.speakers.filter(function (x) { return x.id !== id; });
    if (st.selectedId === id) st.selectedId = st.speakers[0] ? st.speakers[0].id : null;
    if (st.stageId === id) st.stageId = null;
    commit();
  }

  function recordDuration() {
    var sp = onStage();
    var sec = Math.round(elapsedMs() / 1000);
    if (!sp || sec < 1) return;
    sp.duration = sec;
    if (sec >= 30 && sec <= 65) sp.checks[0] = true;
  }

  function resetTimer() {
    st.timer = freshTimer(st.timer.duration);
  }

  function putOnStage(id) {
    var s = byId(id);
    if (!s) { toast('Спочатку додайте дитину і виберіть її у списку'); return; }
    var same = st.stageId === id;
    if (!same) {
      recordDuration();
      resetTimer();
    }
    st.stageId = id;
    st.selectedId = id;
    st.mode = 'stage';
    commit();
    if (same) fx('enter');
    lastAction('🎤 На сцені: ' + s.name);
  }

  function nextSpeaker() {
    if (!st.speakers.length) { toast('Список дітей порожній'); return; }
    var idx = st.speakers.findIndex(function (s) { return s.id === st.stageId; });
    if (idx < 0) idx = st.speakers.findIndex(function (s) { return s.id === st.selectedId; }) - 1;
    var next = st.speakers[idx + 1];
    if (!next) {
      recordDuration();
      if (st.timer.running) { st.timer.accumulated = elapsedMs(); st.timer.running = false; }
      commit();
      toast('Це була остання дитина. Час для фіналу? 🎉');
      return;
    }
    putOnStage(next.id);
  }

  /* ---------- таймер ---------- */
  function startTimer() {
    var t = st.timer;
    if (t.running) return;
    t.startedAt = Date.now();
    t.running = true;
    if (st.mode !== 'stage' && onStage()) st.mode = 'stage';
    commit();
    lastAction('▶️ Таймер ' + t.duration + ' с');
  }
  function pauseTimer() {
    var t = st.timer;
    if (!t.running) return;
    t.accumulated = elapsedMs();
    t.running = false;
    recordDuration();
    commit();
    lastAction('⏸️ Пауза');
  }
  function resetTimerBtn() {
    if (elapsedMs() >= 1000) recordDuration();
    resetTimer();
    commit();
    lastAction('🔄 Таймер скинуто');
  }
  function setDuration(d) {
    st.timer.duration = d;
    commit();
    lastAction('⏱️ Тривалість: ' + d + ' с');
  }

  /* ---------- виклики ---------- */
  var lastQ = -1;
  function randomQuestion() {
    var i;
    do { i = Math.floor(Math.random() * PD.QUESTIONS.length); } while (i === lastQ && PD.QUESTIONS.length > 1);
    lastQ = i;
    return PD.QUESTIONS[i];
  }
  var LABELS = {
    interrupt: '✋ «А можна я скажу?!»', what: '❓ «Що-що? Не почули!»', louder: '🔊 «Голосніше, будь ласка!»',
    giggle: '😄 Смішок', laughwave: '😂 Хвиля сміху', phone: '📞 Телефонний дзвінок', freeze: '🧊 Зависання',
    forgot: '😶 Забув слово', applause: '👏 Оплески', star: '🌟 Незбивний момент!', clear: '🧽 Прибрано'
  };
  function runFx(kind, btn) {
    if (kind === 'question') {
      var q = randomQuestion();
      fx('question', { text: q }, '🙋 «' + q + '»', btn);
    } else {
      fx(kind, null, LABELS[kind] || kind, btn);
    }
  }
  function randomFrom(block, btn) {
    var list = block === 'word' ? PD.WORD_CHALLENGES : PD.STRONG_CHALLENGES;
    var c = list[Math.floor(Math.random() * list.length)];
    runFx(c.key, null);
    fired(btn);
    $('last-action').textContent = '🎲 ' + $('last-action').textContent;
  }

  /* ---------- побудова інтерфейсу ---------- */
  function buildStatic() {
    // питання
    $('q-list').innerHTML = PD.QUESTIONS.map(function (q, i) {
      return '<button class="q-btn" type="button" data-q="' + i + '">🙋 ' + esc(q) + '</button>';
    }).join('');
    // підказки
    $('hints').innerHTML = PD.HINTS.map(function (k) {
      var t = PD.TECHNIQUES.filter(function (x) { return x.key === k; })[0];
      return '<button class="btn yellow" type="button" data-hint="' + k + '"><span class="e">' + t.emoji + '</span>' + t.title + '</button>';
    }).join('');
    // печатки
    $('stamp-btns').innerHTML = PD.STAMPS.map(function (s) {
      return '<button class="btn stamp-btn" type="button" data-stamp="' + s.key + '" style="--ink:' + s.ink + '">' +
        '<span class="e">' + s.emoji + '</span>' + s.label + '<span class="st">вимкнено</span></button>';
    }).join('');
    // чекліст
    $('checklist').innerHTML = PD.CHECKLIST.map(function (c, i) {
      return '<label class="check" data-i="' + i + '"><input type="checkbox" data-check="' + i + '"><span class="cn">' + (i + 1) + '</span><span>' + esc(c) + '</span></label>';
    }).join('');
    // кольори і тваринки (не залежать від кольору одягу)
    $('pick-color').innerHTML = PD.COLORS.map(function (c, i) {
      return '<button class="pick" type="button" data-color="' + i + '" title="' + c.name + '"><span class="sw" style="background:' + c.hex + '"></span><span class="n">' + c.n + '</span><span class="lbl">' + c.name + '</span></button>';
    }).join('');
    $('pick-pet').innerHTML = PD.PETS.map(function (p, i) {
      return '<button class="pick" type="button" data-pet="' + i + '" title="' + p.name + '"><span class="n">' + p.n + '</span>' +
        (p.key === 'none' ? noPetMini() : PD.Avatars.pet(i)) + '<span class="lbl">' + p.name + '</span></button>';
    }).join('');
  }

  function noPetMini() {
    return '<svg viewBox="0 0 120 120" class="av-pet"><circle cx="60" cy="60" r="38" fill="none" stroke="#b9b0d8" stroke-width="7" stroke-dasharray="10 9"/><path d="M36 84 L84 36" stroke="#b9b0d8" stroke-width="7" stroke-linecap="round"/></svg>';
  }

  var charColorDrawn = -1;
  function render() {
    var sel = selected(), sp = onStage();

    // список дітей
    var list = $('speaker-list');
    if (!st.speakers.length) {
      list.innerHTML = '<div class="empty">Додайте дітей — імена видно лише на пульті. Тоді оберіть аватар у галереї.</div>';
    } else {
      list.innerHTML = st.speakers.map(function (s, i) {
        var done = s.duration ? '<span class="done" title="виступ(-ила)">✅</span>' : '';
        return '<div class="chip' + (s.id === st.selectedId ? ' sel' : '') + '" data-sid="' + s.id + '">' +
          '<span class="mini">' + PD.Avatars.character(s.char, s.color) + '</span>' +
          '<span class="nm">' + (i + 1) + '. ' + esc(s.name) + '</span>' +
          (s.id === st.stageId ? '<span class="live-mark" title="на сцені">🎤</span>' : '') + done +
          '<button class="del" type="button" data-del="' + s.id + '" title="Видалити">✖</button></div>';
      }).join('');
    }

    // конструктор
    $('editor').classList.toggle('disabled', !sel);
    $('ed-name').textContent = sel ? sel.name : '—';
    var color = sel ? sel.color : 0;
    if (charColorDrawn !== color) {
      $('pick-char').innerHTML = PD.CHARACTERS.map(function (c, i) {
        return '<button class="pick" type="button" data-char="' + i + '" title="' + c.title + '"><span class="n">' + c.n + '</span>' + PD.Avatars.character(i, color) + '</button>';
      }).join('');
      charColorDrawn = color;
    }
    markSel('#pick-char .pick', 'char', sel && sel.char);
    markSel('#pick-color .pick', 'color', sel && sel.color);
    markSel('#pick-pet .pick', 'pet', sel && sel.pet);
    var inv = $('invention');
    if (document.activeElement !== inv) inv.value = sel ? sel.invention || '' : '';

    // режими
    var modes = document.querySelectorAll('#modes .btn');
    for (var i = 0; i < modes.length; i++) modes[i].classList.toggle('sel', modes[i].getAttribute('data-mode') === st.mode);
    $('show-name').checked = st.showName;
    $('show-cheat').checked = st.showCheat;

    // тривалості
    var durs = document.querySelectorAll('#durations .btn');
    for (var j = 0; j < durs.length; j++) durs[j].classList.toggle('sel', +durs[j].getAttribute('data-d') === st.timer.duration);

    // гучність
    $('volume').value = Math.round(st.volume * 100);
    $('vol-val').textContent = Math.round(st.volume * 100) + '%';
    $('mute').textContent = st.muted ? '🔈 Увімкнути звук' : '🔇 Тиша';
    $('mute').classList.toggle('on', st.muted);

    // печатки — для того, хто на сцені
    $('stamps-for').textContent = sp ? sp.name : 'спочатку виведіть дитину на сцену';
    var sb = document.querySelectorAll('#stamp-btns .btn');
    for (var k = 0; k < sb.length; k++) {
      var key = sb[k].getAttribute('data-stamp');
      var on = !!(sp && sp.stamps[key]);
      sb[k].classList.toggle('on', on);
      sb[k].disabled = !sp;
      sb[k].querySelector('.st').textContent = on ? '✔ є печатка' : 'вимкнено';
    }

    // чекліст — для вибраної дитини
    $('check-for').textContent = sel ? sel.name : '—';
    var checks = document.querySelectorAll('#checklist .check');
    for (var c = 0; c < checks.length; c++) {
      var val = !!(sel && sel.checks[c]);
      checks[c].querySelector('input').checked = val;
      checks[c].querySelector('input').disabled = !sel;
      checks[c].classList.toggle('on', val);
    }
    var dur = $('duration');
    if (document.activeElement !== dur) dur.value = sel && sel.duration != null ? sel.duration : '';
    dur.disabled = !sel;
    var hint = $('dur-hint');
    if (sel && sel.duration != null) {
      var ok = sel.duration >= 30 && sel.duration <= 60;
      hint.textContent = ok ? 'у межах 30–60 с' : (sel.duration < 30 ? 'коротше за 30 с' : 'довше за 60 с');
      hint.className = 'dur-hint ' + (ok ? 'ok' : 'no');
    } else { hint.textContent = ''; hint.className = 'dur-hint'; }
    var note = $('note');
    if (document.activeElement !== note) note.value = sel ? sel.note || '' : '';
    note.disabled = !sel;

    $('now-name').textContent = sp ? sp.name : '—';
    renderTimer();
  }

  function markSel(selector, attr, val) {
    var els = document.querySelectorAll(selector);
    for (var i = 0; i < els.length; i++) els[i].classList.toggle('sel', val != null && +els[i].getAttribute('data-' + attr) === val);
  }

  function renderTimer() {
    var t = st.timer;
    var el = elapsedMs() / 1000;
    var rem = t.duration - el;
    var disp = $('t-display');
    disp.textContent = rem >= 0 ? fmt(rem) : '+' + fmt(-rem);
    disp.classList.toggle('warn', rem > 0 && rem <= 10 && el > 0);
    disp.classList.toggle('over', rem <= 0);
    $('t-dur').textContent = fmt(t.duration) + (rem <= 0 ? ' · час вийшов, дитина завершує думку' : '');
    var fill = $('t-fill');
    fill.style.width = Math.min(100, (el / t.duration) * 100) + '%';
    fill.classList.toggle('warn', rem <= 10);
    var now = $('now-time');
    now.textContent = fmt(el);
    now.classList.toggle('over', rem <= 0);
    var hb = $('hdr-start');
    hb.textContent = t.running ? '⏸️ Пауза' : '▶️ Старт';
    hb.classList.toggle('go', !t.running);
  }
  setInterval(renderTimer, 200);

  /* ---------- підсумок ---------- */
  function stampNames(s) {
    return PD.STAMPS.filter(function (x) { return s.stamps[x.key]; }).map(function (x) { return x.label; });
  }
  function summaryText() {
    var d = new Date();
    var lines = ['Підсумок уроку «Пітч-день» · ' + d.toLocaleDateString('uk-UA'), 'Дітей: ' + st.speakers.length, ''];
    st.speakers.forEach(function (s, i) {
      lines.push((i + 1) + '. ' + s.name);
      lines.push('   Винахід: ' + (s.invention || '—'));
      lines.push('   Аватар: персонаж ' + (s.char + 1) + ', ' + PD.COLORS[s.color].name + ', ' + PD.PETS[s.pet].name);
      lines.push('   Тривалість: ' + (s.duration != null ? s.duration + ' с' : '—'));
      PD.CHECKLIST.forEach(function (c, k) { lines.push('   ' + (s.checks[k] ? '✅' : '⬜') + ' ' + c); });
      var sn = stampNames(s);
      lines.push('   Печатки: ' + (sn.length ? sn.join(', ') : '—'));
      if (s.note) lines.push('   Нотатка: ' + s.note);
      lines.push('');
    });
    return lines.join('\n');
  }
  function csvCell(v) {
    v = String(v == null ? '' : v);
    return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function summaryCSV() {
    var head = ['№', "Ім'я", 'Винахід', 'Тривалість (с)'].concat(PD.CHECKLIST, ['Виконано пунктів', 'Печатки', 'Нотатка']);
    var rows = [head];
    st.speakers.forEach(function (s, i) {
      var done = s.checks.filter(Boolean).length;
      rows.push([i + 1, s.name, s.invention || '', s.duration != null ? s.duration : '']
        .concat(s.checks.map(function (c) { return c ? 'так' : 'ні'; }), [done + '/6', stampNames(s).join(', '), s.note || '']));
    });
    return rows.map(function (r) { return r.map(csvCell).join(','); }).join('\n');
  }
  function copy(text, okMsg) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      if (ok) toast(okMsg);
      else { $('copy-area').value = text; $('copy-dialog').showModal(); $('copy-area').select(); }
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, fallback);
    } else fallback();
  }
  function downloadCSV() {
    var blob = new Blob(['﻿' + summaryCSV()], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pitchday-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  /* ---------- події інтерфейсу ---------- */
  function closest(el, sel) { return el && el.closest ? el.closest(sel) : null; }

  $('add-form').addEventListener('submit', function (e) {
    e.preventDefault();
    addSpeaker($('new-name').value);
    $('new-name').value = '';
    $('new-name').focus();
  });

  $('speaker-list').addEventListener('click', function (e) {
    var del = closest(e.target, '[data-del]');
    if (del) { e.stopPropagation(); removeSpeaker(del.getAttribute('data-del')); return; }
    var chip = closest(e.target, '[data-sid]');
    if (chip) { st.selectedId = chip.getAttribute('data-sid'); commit(); }
  });

  $('editor').addEventListener('click', function (e) {
    var sel = selected();
    var b = closest(e.target, '.pick');
    if (!sel || !b) return;
    if (b.hasAttribute('data-char')) sel.char = +b.getAttribute('data-char');
    if (b.hasAttribute('data-color')) sel.color = +b.getAttribute('data-color');
    if (b.hasAttribute('data-pet')) sel.pet = +b.getAttribute('data-pet');
    commit();
    lastAction('🧩 Аватар ' + sel.name + ': персонаж ' + (sel.char + 1) + ', ' + PD.COLORS[sel.color].name + ', ' + PD.PETS[sel.pet].name);
  });

  $('invention').addEventListener('input', function () {
    var sel = selected();
    if (!sel) return;
    sel.invention = this.value;
    commit(true);
  });

  $('to-stage').addEventListener('click', function () { putOnStage(st.selectedId); });
  $('next').addEventListener('click', nextSpeaker);

  $('modes').addEventListener('click', function (e) {
    var b = closest(e.target, '[data-mode]');
    if (!b) return;
    st.mode = b.getAttribute('data-mode');
    commit();
    lastAction({ gallery: '🖼️ Галерея аватарів', stage: '🎭 Сцена', final: '🎉 Фінал' }[st.mode]);
  });
  $('show-name').addEventListener('change', function () { st.showName = this.checked; commit(); });
  $('show-cheat').addEventListener('change', function () { st.showCheat = this.checked; commit(); });

  $('durations').addEventListener('click', function (e) {
    var b = closest(e.target, '[data-d]');
    if (b) setDuration(+b.getAttribute('data-d'));
  });
  $('t-start').addEventListener('click', startTimer);
  $('t-pause').addEventListener('click', pauseTimer);
  $('t-reset').addEventListener('click', resetTimerBtn);
  $('hdr-start').addEventListener('click', function () { st.timer.running ? pauseTimer() : startTimer(); });

  document.addEventListener('click', function (e) {
    var f = closest(e.target, '[data-fx]');
    if (f) { runFx(f.getAttribute('data-fx'), f); return; }
    var r = closest(e.target, '[data-random]');
    if (r) { randomFrom(r.getAttribute('data-random'), r); return; }
    var q = closest(e.target, '[data-q]');
    if (q) { var text = PD.QUESTIONS[+q.getAttribute('data-q')]; fx('question', { text: text }, '🙋 «' + text + '»', q); return; }
    var h = closest(e.target, '[data-hint]');
    if (h) {
      var k = h.getAttribute('data-hint');
      var t = PD.TECHNIQUES.filter(function (x) { return x.key === k; })[0];
      fx('hint', { tech: k }, '💡 Підказка: ' + t.emoji + ' ' + t.title, h);
      return;
    }
    var s = closest(e.target, '[data-stamp]');
    if (s) {
      var sp = onStage();
      if (!sp) return;
      var key = s.getAttribute('data-stamp');
      sp.stamps[key] = !sp.stamps[key];
      commit();
      var def = PD.STAMPS.filter(function (x) { return x.key === key; })[0];
      lastAction((sp.stamps[key] ? '🔖 Печатка ' : '↩️ Знято печатку ') + def.label + ' · ' + sp.name);
    }
  });

  $('checklist').addEventListener('change', function (e) {
    var sel = selected();
    var i = e.target.getAttribute('data-check');
    if (!sel || i == null) return;
    sel.checks[+i] = e.target.checked;
    commit();
  });
  $('duration').addEventListener('input', function () {
    var sel = selected();
    if (!sel) return;
    sel.duration = this.value === '' ? null : Math.max(0, Math.round(+this.value));
    commit(true);
  });
  $('duration').addEventListener('change', function () { render(); });
  $('note').addEventListener('input', function () {
    var sel = selected();
    if (!sel) return;
    sel.note = this.value;
    commit(true);
  });

  $('copy-text').addEventListener('click', function () { copy(summaryText(), '📋 Підсумок скопійовано'); });
  $('copy-csv').addEventListener('click', function () { copy(summaryCSV(), '📊 CSV скопійовано'); });
  $('dl-csv').addEventListener('click', downloadCSV);
  $('reset-all').addEventListener('click', function () {
    if (!confirm('Почати новий урок? Список дітей, чекліст і нотатки буде очищено.\n\nПорада: спершу скопіюйте підсумок.')) return;
    var vol = st.volume, muted = st.muted;
    st = defaults();
    st.volume = vol; st.muted = muted;
    commit();
    fx('clear');
    lastAction('🧹 Новий урок');
  });

  $('volume').addEventListener('input', function () {
    st.volume = +this.value / 100;
    $('vol-val').textContent = this.value + '%';
    commit(true);
  });
  $('mute').addEventListener('click', function () {
    st.muted = !st.muted;
    if (st.muted) fx('silence');
    commit();
    lastAction(st.muted ? '🔇 Тиша' : '🔈 Звук увімкнено');
  });
  $('test-sound').addEventListener('click', function () { fx('test', null, '🔔 Перевірка звуку', this); });

  /* ---------- стан сцени ---------- */
  var stageSeen = 0, stageAudio = false, stageStarted = false;
  PD.Sync.on(function (msg) {
    if (msg.type === 'stage-status') {
      stageSeen = Date.now();
      stageAudio = !!(msg.data && msg.data.audio);
      stageStarted = !!(msg.data && msg.data.started);
      renderStatus();
    }
  });
  function renderStatus() {
    var el = $('status');
    if (Date.now() - stageSeen > 7000) {
      el.className = 'status off'; el.textContent = '🔴 Сцену не відкрито';
    } else if (!stageStarted || !stageAudio) {
      el.className = 'status warn'; el.textContent = '🟡 Сцена відкрита — натисніть на ній «Відкрити сцену»';
    } else {
      el.className = 'status ok'; el.textContent = '🟢 Сцена на зв\'язку · звук увімкнено';
    }
  }
  setInterval(renderStatus, 1000);

  /* ---------- старт ---------- */
  buildStatic();
  commit();
  PD.Sync.send('ping');
})();
