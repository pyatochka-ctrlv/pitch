/* =========================================================
   Синхронізація пульта і сцени.
   Основний канал — BroadcastChannel('pitchday-stage'),
   резервний — події localStorage (storage event).
   Кожне повідомлення має id, тож дублікати відкидаються.
   ========================================================= */
window.PD = window.PD || {};

PD.Sync = (function () {
  var listeners = [];
  var seen = {};
  var seenOrder = [];
  var bc = null;

  try {
    if ('BroadcastChannel' in window) bc = new BroadcastChannel(PD.CHANNEL);
  } catch (e) { bc = null; }

  function remember(id) {
    seen[id] = true;
    seenOrder.push(id);
    if (seenOrder.length > 300) delete seen[seenOrder.shift()];
  }

  function handle(msg) {
    if (!msg || !msg.id || seen[msg.id]) return;
    // старі повідомлення (наприклад, з «заснулої» вкладки) не відтворюємо
    if (msg.t && Date.now() - msg.t > 15000 && msg.type !== 'view') return;
    remember(msg.id);
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](msg); } catch (e) { console.error(e); }
    }
  }

  if (bc) bc.onmessage = function (e) { handle(e.data); };

  window.addEventListener('storage', function (e) {
    if (e.key !== PD.KEY_MSG || !e.newValue) return;
    try { handle(JSON.parse(e.newValue)); } catch (err) { /* ігноруємо */ }
  });

  function send(type, data) {
    var msg = { id: PD.uid(), t: Date.now(), type: type, data: data || null };
    remember(msg.id);
    if (bc) { try { bc.postMessage(msg); } catch (e) { /* ігноруємо */ } }
    try { localStorage.setItem(PD.KEY_MSG, JSON.stringify(msg)); } catch (e) { /* ігноруємо */ }
    return msg;
  }

  function on(fn) { listeners.push(fn); }

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ігноруємо */ }
  }

  return { send: send, on: on, load: load, save: save };
})();
