/* =========================================================
   ПУЛЬТ: тут живе весь стан уроку.
   Повний стан (імена, чекліст, нотатки) зберігається в localStorage
   під ключем pitchday-pult. На сцену йде лише «вид» без оцінок.
   Дві вкладки: «Підготовка» і «Пітч».
   ========================================================= */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var VERSION = 2;

  function freshTimer(duration) {
    return { duration: duration || 60, running: false, startedAt: 0, accumulated: 0 };
  }
  function blankStamps() {
    var o = {};
    PD.STAMPS.forEach(function (s) { o[s.key] = false; });
    return o;
  }
  function defaults() {
    return {
      v: VERSION, tab: 'prep',
      speakers: [], selectedId: null, openId: null, stageId: null,
      mode: 'gallery', showName: false, showCheat: false,
      timer: freshTimer(60), volume: 0.7, muted: false
    };
  }

  var st = PD.Sync.load(PD.KEY_PULT, null) || defaults();
  if (st.v !== VERSION) { st.showCheat = false; st.v = VERSION; }   // нова версія: шпаргалка за замовчуванням вимкнена
  st = Object.assign(defaults(), st);
  st.timer = Object.assign(freshTimer(60), st.timer || {});
  if (PD.DURATIONS.indexOf(st.timer.duration) < 0 && !st.timer.running) st.timer = freshTimer(60);
  // у кожної дитини — свій набір печаток (додаємо відсутні ключі для старих збережень)
  st.speakers.forEach(function (s) { s.stamps = Object.assign(blankStamps(), s.stamps || {}); });

  // тимчасовий стан інтерфейсу (не зберігається)
  var ui = { menuId: null, confirmDelId: null, resetAsk: false };

  /* ---------- утиліти ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function byId(id) { return st.speakers.filter(function (s) { return s.id === id; })[0] || null; }
  function indexOf(id) { return st.speakers.findIndex(function (s) { return s.id === id; }); }
  function selected() { return byId(st.selectedId); }
  function onStage() { return byId(st.stageId); }
  function elapsedMs() { var t = st.timer; return t.accumulated + (t.running ? Date.now() - t.startedAt : 0); }
  function fmt(sec) {
    sec = Math.max(0, Math.ceil(sec));
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
  function fired(btn) { if (!btn) return; btn.classList.remove('fired'); void btn.offsetWidth; btn.classList.add('fired'); }
  function closest(el, sel) { return el && el.closest ? el.closest(sel) : null; }

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
        name: st.showName ? PD.cap(sp.name) : '',
        stamps: Object.assign({}, sp.stamps)
      } : null,
      all: st.speakers.map(function (s) {
        return { id: s.id, char: s.char, color: s.color, pet: s.pet, invention: s.invention || '', name: st.showName ? PD.cap(s.name) : '', stamps: Object.assign({}, s.stamps) };
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

  function fx(kind, data, btn) {
    PD.Sync.send('fx', Object.assign({ kind: kind }, data || {}));
    fired(btn);
    if (st.mode !== 'stage' && ['question', 'applause', 'star'].indexOf(kind) >= 0) {
      toast('Ефекти видно лише в режимі «Сцена» — увімкніть його в «Підготовці»');
    }
  }

  /* ---------- діти ---------- */
  function addSpeaker(name) {
    name = PD.cap(name);
    if (!name) return;
    var n = st.speakers.length;
    var s = {
      id: PD.uid(), name: name,
      char: n % 6, color: (n * 3 + 5) % 8, pet: n % 6,
      invention: '', stamps: blankStamps(), checks: [false, false, false, false, false, false],
      duration: null, note: ''
    };
    st.speakers.push(s);
    st.selectedId = s.id;
    st.openId = s.id;           // одразу розгортаємо конструктор
    commit();
  }

  function removeSpeaker(id) {
    st.speakers = st.speakers.filter(function (x) { return x.id !== id; });
    if (st.selectedId === id) st.selectedId = st.speakers[0] ? st.speakers[0].id : null;
    if (st.openId === id) st.openId = null;
    if (st.stageId === id) { st.stageId = null; st.timer = freshTimer(st.timer.duration); }
    ui.menuId = ui.confirmDelId = null;
    commit();
  }

  function recordDuration() {
    var sp = onStage();
    var sec = Math.round(elapsedMs() / 1000);
    if (!sp || sec < 1) return;
    sp.duration = sec;
    if (sec >= 30 && sec <= 65) sp.checks[0] = true;
  }

  function resetTimer() { st.timer = freshTimer(st.timer.duration); }

  /* ---------- печатки (особисті для кожної дитини) ---------- */
  function stampDef(key) { return PD.STAMPS.filter(function (d) { return d.key === key; })[0]; }
  function animateStamp(id, key) {
    // анімація штампа на пульті: клітинка таблиці й кнопка в «Пітчі»
    var els = document.querySelectorAll('[data-cell="' + id + '|' + key + '"]' + (id === st.stageId ? ', [data-pstamp="' + key + '"]' : ''));
    for (var i = 0; i < els.length; i++) { els[i].classList.remove('stamped'); void els[i].offsetWidth; els[i].classList.add('stamped'); }
  }
  function toggleStamp(s, key) {
    s.stamps[key] = !s.stamps[key];
    commit();
    if (s.stamps[key]) animateStamp(s.id, key);
  }

  function putOnStage(id) {
    var s = byId(id);
    if (!s) return;
    var same = st.stageId === id;
    if (!same) { recordDuration(); resetTimer(); }
    st.stageId = id;
    st.selectedId = id;
    st.mode = 'stage';
    commit();
    if (same) fx('enter');
  }

  function isLast() {
    var i = indexOf(st.stageId);
    return i >= 0 && i === st.speakers.length - 1;
  }

  function nextSpeaker() {
    if (!st.speakers.length) { toast('Спочатку додайте дітей у вкладці «Підготовка»'); return; }
    if (isLast()) {
      // остання дитина → фінал
      recordDuration();
      resetTimer();
      st.mode = 'final';
      commit();
      toast('🎉 Фінал! Усі винахідники на сцені');
      return;
    }
    var i = indexOf(st.stageId);
    putOnStage(st.speakers[i + 1].id);
  }

  /* ---------- таймер ---------- */
  function startTimer() {
    var t = st.timer;
    if (t.running) return;
    if (!onStage()) toast('Підказка: виведіть дитину на сцену кнопкою «Наступний ▶»');
    t.startedAt = Date.now();
    t.running = true;
    if (st.mode !== 'stage' && onStage()) st.mode = 'stage';
    commit();
  }
  function pauseTimer() {
    var t = st.timer;
    if (!t.running) return;
    t.accumulated = elapsedMs();
    t.running = false;
    recordDuration();
    commit();
  }
  function resetTimerBtn() {
    if (elapsedMs() >= 1000) recordDuration();
    resetTimer();
    commit();
  }
  function setDuration(d) {
    if (st.timer.running) {
      st.timer.duration = d;       // під час виступу просто міняємо ліміт
    } else {
      if (elapsedMs() >= 1000) recordDuration();
      st.timer = freshTimer(d);    // не запущено — показуємо нову тривалість з нуля
    }
    commit();
  }

  /* ---------- питання журі ---------- */
  var lastQ = -1;
  function randomQuestion() {
    var i;
    do { i = Math.floor(Math.random() * PD.QUESTIONS.length); } while (i === lastQ && PD.QUESTIONS.length > 1);
    lastQ = i;
    return PD.QUESTIONS[i];
  }

  /* ---------- побудова статичних частин ---------- */
  function buildStatic() {
    $('q-list').innerHTML = PD.QUESTIONS.map(function (q, i) {
      return '<button class="q-btn" type="button" data-q="' + i + '">🙋 ' + esc(q) + '</button>';
    }).join('');
    $('durations').innerHTML = PD.DURATIONS.map(function (d) {
      return '<button class="btn" type="button" data-d="' + d + '">' + d + ' с</button>';
    }).join('');
    $('checklist').innerHTML = PD.CHECKLIST.map(function (c, i) {
      return '<label class="check"><input type="checkbox" data-check="' + i + '"><span class="cn">' + (i + 1) + '</span><span>' + esc(c) + '</span></label>';
    }).join('');
  }

  /* ---------- рендер: підготовка ---------- */
  function editorHtml(s) {
    var chars = PD.CHARACTERS.map(function (c, i) {
      return '<button class="pick' + (s.char === i ? ' sel' : '') + '" type="button" data-char="' + i + '" title="' + esc(c.title) + '">' +
        '<span class="n">' + c.n + '</span>' + PD.Avatars.character(i, s.color) + '</button>';
    }).join('');
    var colors = PD.COLORS.map(function (c, i) {
      return '<button class="pick' + (s.color === i ? ' sel' : '') + '" type="button" data-color="' + i + '">' +
        '<span class="n">' + c.n + '</span><span class="sw" style="background:' + c.hex + '"></span><span class="lbl">' + c.name + '</span></button>';
    }).join('');
    var pets = PD.PETS.map(function (p, i) {
      var pic = p.key === 'none'
        ? '<svg viewBox="0 0 120 120" class="av-pet"><circle cx="60" cy="60" r="38" fill="none" stroke="#b9b0d8" stroke-width="7" stroke-dasharray="10 9"/><path d="M36 84 L84 36" stroke="#b9b0d8" stroke-width="7" stroke-linecap="round"/></svg>'
        : PD.Avatars.pet(i);
      return '<button class="pick' + (s.pet === i ? ' sel' : '') + '" type="button" data-pet="' + i + '">' +
        '<span class="n">' + p.n + '</span>' + pic + '<span class="lbl">' + p.name + '</span></button>';
    }).join('');
    return '<div class="kid-editor">' +
      '<div class="ed-label">Персонаж</div><div class="pick-row chars">' + chars + '</div>' +
      '<div class="ed-label">Колір одягу</div><div class="pick-row colors">' + colors + '</div>' +
      '<div class="ed-label">Тваринка-помічник</div><div class="pick-row pets">' + pets + '</div>' +
      '<div class="ed-label">Винахід <small>(вставте текст із генератора)</small></div>' +
      '<textarea id="invention" rows="2" maxlength="120" placeholder="Напр.: Парасолька, що співає, коли починається дощ">' + esc(s.invention) + '</textarea>' +
      '<div class="ed-actions">' +
        '<button class="btn-inline green" type="button" data-done>✅ Готово</button>' +
        '<button class="btn-inline" type="button" data-to-stage>🎤 На сцену</button>' +
      '</div></div>';
  }

  function menuHtml(s) {
    if (ui.menuId !== s.id) return '';
    if (ui.confirmDelId === s.id) {
      return '<div class="menu"><p>Видалити <b>' + esc(s.name) + '</b>? Аватар, позначки й нотатка теж зникнуть.</p>' +
        '<div class="acts"><button class="btn-inline red" type="button" data-del-yes>Так, видалити</button>' +
        '<button class="btn-inline ghost" type="button" data-del-no>Скасувати</button></div></div>';
    }
    return '<div class="menu"><button class="item" type="button" data-del-ask>🗑️ Видалити дитину</button></div>';
  }

  function renderKids() {
    var list = $('kid-list');
    if (!st.speakers.length) {
      list.innerHTML = '<div class="empty">Додайте дітей — імена видно лише на пульті. Потім увімкніть «Галерея аватарів» і зберіть аватар для кожної дитини.</div>';
      return;
    }
    list.innerHTML = st.speakers.map(function (s, i) {
      var open = st.openId === s.id;
      var badges = (s.id === st.stageId ? '🎤 на сцені ' : '') + (s.duration != null ? '✅ ' + s.duration + ' с' : '');
      return '<div class="kid' + (open ? ' open' : '') + (s.id === st.selectedId ? ' sel' : '') + '" data-sid="' + s.id + '">' +
        '<div class="kid-head" data-toggle>' +
          '<span class="kid-num">' + (i + 1) + '</span>' +
          '<span class="mini">' + PD.Avatars.character(s.char, s.color) + '</span>' +
          '<div class="kid-info"><b>' + esc(s.name) + '</b><small class="kid-inv">' + (s.invention ? '💡 ' + esc(s.invention) : 'винахід ще не вписано') + '</small></div>' +
          '<span class="kid-badges">' + badges + '</span>' +
          '<button class="kid-edit" type="button">' + (open ? '▲ Згорнути' : '✏️ Аватар') + '</button>' +
          '<div class="menu-wrap"><button class="dots" type="button" data-menu title="Дії">⋯</button>' + menuHtml(s) + '</div>' +
        '</div>' +
        (open ? editorHtml(s) : '') +
      '</div>';
    }).join('');
  }

  // «Почати новий урок» — дві кнопки (у «Підсумку» і внизу), підтвердження на сторінці
  function resetHtml(zone) {
    if (ui.resetAsk === zone) {
      return '<div class="reset-confirm"><p>Очистити список дітей, аватари, чекліст і нотатки? Скасувати це не можна — спершу скопіюйте підсумок.</p>' +
        '<button class="btn-inline red" type="button" data-reset-yes>🧹 Так, почати новий урок</button>' +
        '<button class="btn-inline ghost" type="button" data-reset-no>Скасувати</button></div>';
    }
    if (zone === 'top') {
      return '<button class="btn wide new-lesson" type="button" data-reset-ask><span class="e">🧹</span>Новий урок</button>';
    }
    return '<div class="reset-row"><p>Після уроку скопіюйте підсумок, а потім очистіть пульт для нової групи.</p>' +
      '<button class="reset-btn" type="button" data-reset-ask>🧹 Почати новий урок</button></div>';
  }
  function renderReset() {
    $('reset-zone-top').innerHTML = resetHtml('top');
    $('reset-zone').innerHTML = resetHtml('bottom');
  }

  function renderPassports() {
    var box = $('passport-table');
    if (!st.speakers.length) { box.innerHTML = '<div class="empty">Тут з\'являться паспорти, коли ви додасте дітей.</div>'; return; }
    var head = '<div class="pp-row pp-head"><div class="pp-kid"></div>' + PD.STAMPS.map(function (d) {
      var all = st.speakers.every(function (s) { return s.stamps[d.key]; });
      return '<div class="pp-col" style="--ink:' + d.ink + '"><span class="pp-e">' + d.emoji + '</span><span class="pp-l">' + d.label + '</span>' +
        '<button class="pp-all" type="button" data-all="' + d.key + '"' + (all ? ' disabled' : '') + '>' + (all ? '✓ усі' : 'усім') + '</button></div>';
    }).join('') + '</div>';
    var rows = st.speakers.map(function (s) {
      return '<div class="pp-row' + (s.id === st.stageId ? ' live' : '') + '"><div class="pp-kid"><span class="pp-mini">' + PD.Avatars.character(s.char, s.color) + '</span>' +
        '<span class="pp-name">' + esc(s.name) + '</span></div>' +
        PD.STAMPS.map(function (d) {
          var on = !!s.stamps[d.key];
          return '<button class="pp-cell' + (on ? ' on' : '') + '" type="button" data-cell="' + s.id + '|' + d.key + '" style="--ink:' + d.ink + '"' +
            ' title="' + esc(s.name) + ': ' + d.label + (on ? ' — є' : ' — немає') + '">' + (on ? '✓' : d.emoji) + '</button>';
        }).join('') + '</div>';
    }).join('');
    box.innerHTML = '<div class="pp-table">' + head + rows + '</div>';
  }

  function renderPrep() {
    renderKids();
    renderPassports();
    var modes = document.querySelectorAll('#modes .btn');
    for (var i = 0; i < modes.length; i++) modes[i].classList.toggle('sel', modes[i].getAttribute('data-mode') === st.mode);
    $('show-name').checked = st.showName;
    $('show-cheat').checked = st.showCheat;
    $('volume').value = Math.round(st.volume * 100);
    $('vol-val').textContent = Math.round(st.volume * 100) + '%';
    $('mute').innerHTML = st.muted ? '<span class="e">🔈</span>Увімкнути звук' : '<span class="e">🔇</span>Тиша';
    $('mute').classList.toggle('on', st.muted);
    renderReset();
  }

  /* ---------- рендер: пітч ---------- */
  function renderPitch() {
    var sp = onStage();
    $('p-avatar').innerHTML = sp ? PD.Avatars.full(sp) : '<div class="empty">Ще нікого на сцені.<br>Натисніть «Наступний ▶», щоб почати з першої дитини.</div>';
    $('p-name').textContent = sp ? sp.name : '—';
    $('p-invention').textContent = sp ? (sp.invention ? '💡 ' + sp.invention : 'винахід-сюрприз') : '';

    var durs = document.querySelectorAll('#durations .btn');
    for (var j = 0; j < durs.length; j++) durs[j].classList.toggle('sel', +durs[j].getAttribute('data-d') === st.timer.duration);
    $('p-mute').classList.toggle('on', st.muted);
    $('p-mute').textContent = st.muted ? '🔈' : '🔇';
    $('p-mute').title = st.muted ? 'Увімкнути звук сцени' : 'Тиша на сцені';

    // рядок із 5 печаток поточної дитини («Винахідник» — найбільша)
    $('p-stamps').innerHTML = PD.STAMPS.map(function (d) {
      var on = !!(sp && sp.stamps[d.key]);
      return '<button class="pstamp' + (on ? ' on' : '') + (d.key === 'inventor' ? ' main' : '') + '" type="button" data-pstamp="' + d.key + '"' +
        ' style="--ink:' + d.ink + '"' + (sp ? '' : ' disabled') + ' title="' + d.label + (on ? ' — є (клік, щоб зняти)' : ' — поставити') + '">' +
        '<span class="e">' + d.emoji + '</span><span class="l">' + d.label + '</span>' + (on ? '<span class="ok">✓</span>' : '') + '</button>';
    }).join('');

    $('check-for').textContent = sp ? sp.name : '—';
    var boxes = document.querySelectorAll('#checklist input');
    for (var c = 0; c < boxes.length; c++) {
      var val = !!(sp && sp.checks[c]);
      boxes[c].checked = val;
      boxes[c].disabled = !sp;
      boxes[c].parentNode.classList.toggle('on', val);
    }
    var dur = $('duration');
    if (document.activeElement !== dur) dur.value = sp && sp.duration != null ? sp.duration : '';
    dur.disabled = !sp;
    var hint = $('dur-hint');
    if (sp && sp.duration != null) {
      var ok = sp.duration >= 30 && sp.duration <= 60;
      hint.textContent = ok ? 'у межах 30–60 с' : (sp.duration < 30 ? 'коротше за 30 с' : 'довше за 60 с');
      hint.className = 'dur-hint ' + (ok ? 'ok' : 'no');
    } else { hint.textContent = ''; hint.className = 'dur-hint'; }
    var note = $('note');
    if (document.activeElement !== note) note.value = sp ? sp.note || '' : '';
    note.disabled = !sp;

    var nb = $('next');
    var last = isLast();
    nb.textContent = !st.speakers.length ? 'Наступний ▶' : (!sp ? '▶ Почати з першої дитини' : (last ? '🎉 До фіналу' : 'Наступний ▶'));
    nb.classList.toggle('final', last);
    if (sp && !last) nb.title = 'Далі: ' + st.speakers[indexOf(sp.id) + 1].name;
    else nb.title = '';
  }

  function render() {
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('on', tabs[i].getAttribute('data-tab') === st.tab);
    $('tab-prep').classList.toggle('on', st.tab === 'prep');
    $('tab-pitch').classList.toggle('on', st.tab === 'pitch');
    var sp = onStage();
    $('now-name').textContent = sp ? sp.name : '—';
    renderPrep();
    renderPitch();
    renderTimer();
  }

  function renderTimer() {
    var t = st.timer;
    var el = elapsedMs() / 1000;
    var idle = !t.running && el <= 0;
    var rem = t.duration - el;
    var disp = $('t-display');
    disp.textContent = idle ? fmt(t.duration) : (rem >= 0 ? fmt(rem) : '+' + fmt(-rem));
    disp.classList.toggle('warn', !idle && rem > 0 && rem <= 10);
    disp.classList.toggle('over', !idle && rem <= 0);
    $('t-state').textContent = idle ? 'готово до старту' : (rem <= 0 ? 'час вийшов — дитина завершує думку' : (t.running ? 'іде виступ · ' + fmt(el) : 'пауза · ' + fmt(el)));
    var fill = $('t-fill');
    fill.style.width = Math.min(100, (el / t.duration) * 100) + '%';
    fill.classList.toggle('warn', rem <= 10);
    $('t-start').disabled = t.running;
    $('t-pause').disabled = !t.running;
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

  /* ---------- події: шапка ---------- */
  document.querySelector('.tabs').addEventListener('click', function (e) {
    var b = closest(e.target, '[data-tab]');
    if (!b) return;
    st.tab = b.getAttribute('data-tab');
    ui.menuId = null;
    commit();
  });
  $('status').addEventListener('click', function (e) {
    // відкривати сцену лише коли її ще немає (щоб не було двох сцен зі звуком)
    if (!this.classList.contains('off')) e.preventDefault();
  });

  /* ---------- події: підготовка ---------- */
  $('add-form').addEventListener('submit', function (e) {
    e.preventDefault();
    addSpeaker($('new-name').value);
    $('new-name').value = '';
    $('new-name').focus();
  });

  $('kid-list').addEventListener('click', function (e) {
    var kid = closest(e.target, '[data-sid]');
    if (!kid) return;
    var id = kid.getAttribute('data-sid');
    var s = byId(id);
    if (!s) return;

    // меню «⋯» і видалення з підтвердженням
    if (closest(e.target, '[data-menu]')) {
      ui.menuId = ui.menuId === id ? null : id;
      ui.confirmDelId = null;
      renderKids(); return;
    }
    if (closest(e.target, '[data-del-ask]')) { ui.confirmDelId = id; renderKids(); return; }
    if (closest(e.target, '[data-del-yes]')) { removeSpeaker(id); toast('Видалено: ' + s.name); return; }
    if (closest(e.target, '[data-del-no]')) { ui.menuId = ui.confirmDelId = null; renderKids(); return; }
    if (closest(e.target, '.menu')) return;

    // кнопки конструктора
    var b;
    if ((b = closest(e.target, '[data-char]'))) { s.char = +b.getAttribute('data-char'); commit(); return; }
    if ((b = closest(e.target, '[data-color]'))) { s.color = +b.getAttribute('data-color'); commit(); return; }
    if ((b = closest(e.target, '[data-pet]'))) { s.pet = +b.getAttribute('data-pet'); commit(); return; }
    if (closest(e.target, '[data-done]')) { st.openId = null; commit(); return; }
    if (closest(e.target, '[data-to-stage]')) { st.openId = null; st.tab = 'pitch'; putOnStage(id); return; }

    // клік по рядку — розгорнути / згорнути конструктор
    if (closest(e.target, '[data-toggle]')) {
      ui.menuId = null;
      if (st.openId === id) st.openId = null;
      else { st.openId = id; st.selectedId = id; }
      commit();
    }
  });

  $('kid-list').addEventListener('input', function (e) {
    if (e.target.id !== 'invention') return;
    var s = byId(st.openId);
    if (!s) return;
    s.invention = e.target.value;
    var small = closest(e.target, '.kid').querySelector('.kid-inv');
    small.textContent = s.invention ? '💡 ' + s.invention : 'винахід ще не вписано';
    commit(true);
  });

  // клік поза меню — закрити його
  document.addEventListener('click', function (e) {
    if (ui.menuId && !closest(e.target, '.menu-wrap')) { ui.menuId = ui.confirmDelId = null; renderKids(); }
  });

  $('modes').addEventListener('click', function (e) {
    var b = closest(e.target, '[data-mode]');
    if (!b) return;
    st.mode = b.getAttribute('data-mode');
    commit();
  });
  $('show-name').addEventListener('change', function () { st.showName = this.checked; commit(); });
  $('show-cheat').addEventListener('change', function () { st.showCheat = this.checked; commit(); });

  $('volume').addEventListener('input', function () {
    st.volume = +this.value / 100;
    $('vol-val').textContent = this.value + '%';
    commit(true);
  });
  function toggleMute() {
    st.muted = !st.muted;
    if (st.muted) PD.Sync.send('fx', { kind: 'silence' });
    commit();
  }
  $('mute').addEventListener('click', toggleMute);
  $('p-mute').addEventListener('click', toggleMute);
  $('test-sound').addEventListener('click', function () { fx('test', null, this); });

  $('copy-text').addEventListener('click', function () { copy(summaryText(), '📋 Підсумок скопійовано'); });
  $('copy-csv').addEventListener('click', function () { copy(summaryCSV(), '📊 CSV скопійовано'); });
  $('dl-csv').addEventListener('click', downloadCSV);

  function onResetClick(e) {
    var zone = closest(e.target, '[data-zone]').getAttribute('data-zone');
    if (closest(e.target, '[data-reset-ask]')) { ui.resetAsk = zone; renderReset(); return; }
    if (closest(e.target, '[data-reset-no]')) { ui.resetAsk = false; renderReset(); return; }
    if (closest(e.target, '[data-reset-yes]')) {
      var vol = st.volume, muted = st.muted;
      st = defaults();
      st.volume = vol; st.muted = muted;
      ui.resetAsk = false;
      commit();
      PD.Sync.send('fx', { kind: 'clear' });
      toast('🧹 Пульт очищено. Можна додавати нову групу');
    }
  }
  $('reset-zone-top').addEventListener('click', onResetClick);
  $('reset-zone').addEventListener('click', onResetClick);

  /* ---------- події: пітч ---------- */
  $('durations').addEventListener('click', function (e) {
    var b = closest(e.target, '[data-d]');
    if (b) setDuration(+b.getAttribute('data-d'));
  });
  $('t-start').addEventListener('click', startTimer);
  $('t-pause').addEventListener('click', pauseTimer);
  $('t-reset').addEventListener('click', resetTimerBtn);
  $('next').addEventListener('click', nextSpeaker);

  $('tab-pitch').addEventListener('click', function (e) {
    var f = closest(e.target, '[data-fx]');
    if (f) {
      var kind = f.getAttribute('data-fx');
      fx(kind, kind === 'question' ? { text: randomQuestion() } : null, f);
      return;
    }
    var q = closest(e.target, '[data-q]');
    if (q) { fx('question', { text: PD.QUESTIONS[+q.getAttribute('data-q')] }, q); return; }
  });

  $('p-stamps').addEventListener('click', function (e) {
    var b = closest(e.target, '[data-pstamp]');
    var sp = onStage();
    if (!b || !sp) return;
    toggleStamp(sp, b.getAttribute('data-pstamp'));
  });

  $('passport-table').addEventListener('click', function (e) {
    var c = closest(e.target, '[data-cell]');
    if (c) {
      var parts = c.getAttribute('data-cell').split('|');
      var s = byId(parts[0]);
      if (s) toggleStamp(s, parts[1]);
      return;
    }
    var a = closest(e.target, '[data-all]');
    if (a) {
      var key = a.getAttribute('data-all');
      var fresh = st.speakers.filter(function (s) { return !s.stamps[key]; });
      if (!fresh.length) return;
      fresh.forEach(function (s) { s.stamps[key] = true; });
      commit();
      fresh.forEach(function (s) { animateStamp(s.id, key); });
      toast('Печатку «' + stampDef(key).label + '» поставлено всім (' + fresh.length + ')');
    }
  });

  $('checklist').addEventListener('change', function (e) {
    var sp = onStage();
    var i = e.target.getAttribute('data-check');
    if (!sp || i == null) return;
    sp.checks[+i] = e.target.checked;
    commit();
  });
  $('duration').addEventListener('input', function () {
    var sp = onStage();
    if (!sp) return;
    sp.duration = this.value === '' ? null : Math.max(0, Math.round(+this.value));
    commit(true);
  });
  $('duration').addEventListener('change', function () { render(); });
  $('note').addEventListener('input', function () {
    var sp = onStage();
    if (!sp) return;
    sp.note = this.value;
    commit(true);
  });

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
      el.className = 'status off'; el.textContent = '🔴 Сцену не відкрито — відкрити';
      el.title = 'Натисніть, щоб відкрити сцену в новій вкладці';
    } else if (!stageStarted || !stageAudio) {
      el.className = 'status warn'; el.textContent = '🟡 Натисніть на сцені «Відкрити сцену»';
      el.title = 'Без цього кліку браузер не дозволить звук';
    } else {
      el.className = 'status ok'; el.textContent = '🟢 Сцена на зв\'язку · звук є';
      el.title = '';
    }
  }
  setInterval(renderStatus, 1000);

  /* ---------- старт ---------- */
  buildStatic();
  commit();
  renderStatus();
  PD.Sync.send('ping');
})();
