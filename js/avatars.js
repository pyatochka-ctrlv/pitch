/* =========================================================
   Оригінальні плоскі SVG-аватари: 6 дітей-винахідників
   і 6 тваринок-помічників (+ «без тваринки»).
   ========================================================= */
window.PD = window.PD || {};

PD.Avatars = (function () {
  var PANTS = '#363b5e';
  var SHOES = '#23233a';
  var LINE = '#4a2418';

  function shade(hex, amt) {
    var c = hex.replace('#', '');
    var n = parseInt(c, 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    function f(v) { return Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt))); }
    return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }

  /* ---------- частини, що лежать ПОЗАДУ голови ---------- */
  function backLayer(i, ch) {
    var h = ch.hair;
    switch (i) {
      case 1: // кепка: козирок стирчить позаду
        return '<ellipse cx="110" cy="55" rx="23" ry="4.5" transform="rotate(-6 110 55)" fill="#b02a33"/>';
      case 2: // два хвостики
        return '<circle cx="44" cy="82" r="19" fill="' + h + '"/><circle cx="38" cy="106" r="13" fill="' + h + '"/>' +
               '<circle cx="156" cy="82" r="19" fill="' + h + '"/><circle cx="162" cy="106" r="13" fill="' + h + '"/>';
      case 5: // косичка: хвостик волосся за головою
        return '<path d="M60 96 Q52 140 64 150 L80 140 Z" fill="' + h + '"/>';
      default: return '';
    }
  }

  /* ---------- волосся й аксесуари ПОВЕРХ голови ---------- */
  function frontLayer(i, ch) {
    var h = ch.hair, hs = shade(ch.hair, 0.18);
    switch (i) {
      case 0: // окуляри і кучері
        return '<g fill="' + h + '">' +
          '<circle cx="60" cy="90" r="14"/><circle cx="64" cy="72" r="16"/><circle cx="78" cy="59" r="16"/>' +
          '<circle cx="100" cy="53" r="17"/><circle cx="122" cy="59" r="16"/><circle cx="136" cy="72" r="16"/>' +
          '<circle cx="140" cy="90" r="14"/><circle cx="88" cy="68" r="12"/><circle cx="112" cy="68" r="12"/>' +
          '<circle cx="100" cy="72" r="10"/></g>' +
          '<g fill="' + hs + '" opacity=".6"><circle cx="78" cy="55" r="5"/><circle cx="104" cy="48" r="5"/><circle cx="128" cy="62" r="4"/></g>' +
          '<g fill="rgba(255,255,255,.18)" stroke="#2b2b44" stroke-width="3.5">' +
          '<circle cx="83" cy="104" r="14"/><circle cx="117" cy="104" r="14"/></g>' +
          '<path d="M97 103 Q100 99 103 103 M69 102 L58 99 M131 102 L142 99" stroke="#2b2b44" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
      case 1: // кепка задом наперед
        return '<rect x="56" y="88" width="9" height="22" rx="4" fill="' + h + '"/><rect x="135" y="88" width="9" height="22" rx="4" fill="' + h + '"/>' +
          '<path d="M55 97 Q55 50 100 50 Q145 50 145 97 Q100 84 55 97 Z" fill="#e63946"/>' +
          '<path d="M78 56 Q100 48 122 56" stroke="#ff8a91" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>' +
          '<path d="M86 93 Q100 70 114 93 Z" fill="' + h + '"/>' +
          '<rect x="86" y="84" width="28" height="5" rx="2.5" fill="#9e1f2a"/>' +
          '<path d="M55 97 Q100 84 145 97" stroke="#9e1f2a" stroke-width="5" fill="none"/>' +
          '<circle cx="100" cy="51" r="4.5" fill="#9e1f2a"/>';
      case 2: // два хвостики
        return '<path d="M56 102 Q52 52 100 52 Q148 52 144 102 Q134 76 100 74 Q66 76 56 102 Z" fill="' + h + '"/>' +
          '<path d="M100 54 L100 74" stroke="' + shade(h, -0.25) + '" stroke-width="3" stroke-linecap="round"/>' +
          '<circle cx="59" cy="78" r="6.5" fill="#ff5ea8"/><circle cx="141" cy="78" r="6.5" fill="#ff5ea8"/>';
      case 3: // великі навушники
        return '<path d="M58 94 Q58 54 100 54 Q142 54 142 94 Q130 72 114 74 Q104 62 92 72 Q74 70 58 94 Z" fill="' + h + '"/>' +
          '<path d="M50 104 Q50 36 100 36 Q150 36 150 104" stroke="#2d2d48" stroke-width="10" fill="none" stroke-linecap="round"/>' +
          '<rect x="38" y="86" width="26" height="40" rx="12" fill="#2d2d48"/><rect x="45" y="93" width="12" height="26" rx="6" fill="#4ee1c1"/>' +
          '<rect x="136" y="86" width="26" height="40" rx="12" fill="#2d2d48"/><rect x="143" y="93" width="12" height="26" rx="6" fill="#4ee1c1"/>';
      case 4: // шолом з лампочкою
        return '<rect x="56" y="98" width="9" height="16" rx="4" fill="' + h + '"/><rect x="135" y="98" width="9" height="16" rx="4" fill="' + h + '"/>' +
          '<circle class="bulb-glow" cx="100" cy="18" r="28" fill="#fff3a3" opacity=".35"/>' +
          '<rect x="90" y="30" width="20" height="20" rx="3" fill="#9aa3b5"/>' +
          '<path d="M90 36 H110 M90 42 H110" stroke="#717a8d" stroke-width="2"/>' +
          '<circle class="bulb" cx="100" cy="20" r="14" fill="#fff3a3" stroke="#e6c64a" stroke-width="2"/>' +
          '<path d="M95 26 L98 16 L102 22 L105 14" stroke="#d39b12" stroke-width="2" fill="none" stroke-linecap="round"/>' +
          '<path d="M52 102 Q52 48 100 48 Q148 48 148 102 Z" fill="#ffb703"/>' +
          '<rect x="93" y="50" width="14" height="50" fill="#ffd166" opacity=".8"/>' +
          '<rect x="46" y="96" width="108" height="11" rx="5.5" fill="#fb8500"/>';
      case 5: // косичка і пов'язка
        return '<path d="M56 100 Q50 52 100 52 Q150 52 144 100 Q140 76 116 70 Q86 66 56 100 Z" fill="' + h + '"/>' +
          '<path d="M58 84 Q100 62 142 84" stroke="#7b2cbf" stroke-width="11" fill="none" stroke-linecap="round"/>' +
          '<path d="M142 80 L160 68 L158 86 Z M142 82 L162 92 L150 98 Z" fill="#9d4edd"/>' +
          '<circle cx="144" cy="82" r="6" fill="#7b2cbf"/>' +
          '<g fill="' + h + '"><ellipse cx="146" cy="112" rx="11" ry="10"/><ellipse cx="150" cy="130" rx="10" ry="9.5"/>' +
          '<ellipse cx="153" cy="147" rx="9" ry="9"/><ellipse cx="155" cy="163" rx="8" ry="8"/></g>' +
          '<g stroke="' + shade(h, 0.25) + '" stroke-width="2" fill="none" opacity=".7"><path d="M140 112 Q146 118 152 112"/><path d="M144 130 Q150 136 156 130"/><path d="M148 147 Q153 152 158 147"/></g>' +
          '<rect x="148" y="170" width="14" height="6" rx="3" fill="#9d4edd"/>' +
          '<path d="M150 176 L146 188 M155 176 L155 190 M160 176 L164 188" stroke="' + h + '" stroke-width="4" stroke-linecap="round"/>';
    }
    return '';
  }

  /* ---------- людина ---------- */
  function character(charIndex, colorIndex, opts) {
    opts = opts || {};
    var ch = PD.CHARACTERS[charIndex] || PD.CHARACTERS[0];
    var cloth = (PD.COLORS[colorIndex] || PD.COLORS[0]).hex;
    if (opts.cloth) cloth = opts.cloth;
    var clothD = shade(cloth, -0.18);
    var skin = ch.skin, skinD = shade(skin, -0.12);
    var i = PD.CHARACTERS.indexOf(ch);

    return '<svg class="av-char" viewBox="0 -12 200 302" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<ellipse class="av-shadow" cx="100" cy="282" rx="62" ry="8" fill="rgba(0,0,0,.28)"/>' +
      '<g class="av-idle"><g class="av-jump">' +
        backLayer(i, ch) +
        // ноги й взуття
        '<rect x="80" y="222" width="17" height="50" rx="8" fill="' + PANTS + '"/>' +
        '<rect x="103" y="222" width="17" height="50" rx="8" fill="' + PANTS + '"/>' +
        '<ellipse cx="86" cy="273" rx="15" ry="8" fill="' + SHOES + '"/>' +
        '<ellipse cx="114" cy="273" rx="15" ry="8" fill="' + SHOES + '"/>' +
        // ліва рука
        '<g class="arm-l"><path d="M72 166 L56 214" stroke="' + clothD + '" stroke-width="19" stroke-linecap="round"/>' +
        '<circle cx="55" cy="218" r="10" fill="' + skin + '"/></g>' +
        // шия і тулуб
        '<rect x="91" y="134" width="18" height="22" rx="6" fill="' + skinD + '"/>' +
        '<rect x="63" y="148" width="74" height="86" rx="27" fill="' + cloth + '"/>' +
        '<path d="M63 200 Q100 214 137 200 L137 210 Q137 234 112 234 L88 234 Q63 234 63 210 Z" fill="rgba(0,0,0,.08)"/>' +
        '<path d="M86 149 L100 168 L114 149 Z" fill="rgba(255,255,255,.55)"/>' +
        '<rect x="108" y="180" width="20" height="17" rx="4" fill="rgba(0,0,0,.13)"/>' +
        '<rect x="113" y="166" width="5" height="18" rx="1" fill="#ffcf33"/><path d="M113 166 L115.5 160 L118 166 Z" fill="#f0a868"/>' +
        '<rect x="120" y="170" width="4" height="14" rx="1" fill="#62d2ff"/>' +
        // голова
        '<g class="av-head">' +
          '<circle cx="56" cy="108" r="10" fill="' + skinD + '"/><circle cx="144" cy="108" r="10" fill="' + skinD + '"/>' +
          '<circle cx="100" cy="100" r="45" fill="' + skin + '"/>' +
          '<ellipse cx="74" cy="121" rx="8" ry="4.5" fill="#ff7b7b" opacity=".45"/>' +
          '<ellipse cx="126" cy="121" rx="8" ry="4.5" fill="#ff7b7b" opacity=".45"/>' +
          '<g class="eyes">' +
            '<ellipse cx="83" cy="104" rx="8" ry="9" fill="#fff"/><ellipse cx="117" cy="104" rx="8" ry="9" fill="#fff"/>' +
            '<circle cx="84" cy="106" r="4.8" fill="#2a1a14"/><circle cx="118" cy="106" r="4.8" fill="#2a1a14"/>' +
            '<circle cx="85.8" cy="104" r="1.6" fill="#fff"/><circle cx="119.8" cy="104" r="1.6" fill="#fff"/>' +
          '</g>' +
          '<path class="brows" d="M75 90 Q83 86 91 90 M109 90 Q117 86 125 90" stroke="' + ch.hair + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
          '<path d="M97 113 Q100 117 103 113" stroke="' + shade(skin, -0.3) + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
          '<path class="m-smile" d="M87 123 Q100 135 113 123" stroke="' + LINE + '" stroke-width="3.6" fill="none" stroke-linecap="round"/>' +
          '<g class="m-open"><path d="M85 121 Q100 145 115 121 Z" fill="#6b1f24"/><path d="M92 133 Q100 128 108 133 Q100 140 92 133 Z" fill="#ff8a8a"/></g>' +
          '<path class="m-hmm" d="M89 127 Q94 122 100 127 T111 126" stroke="' + LINE + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
          frontLayer(i, ch) +
        '</g>' +
        // права рука (поверх голови — щоб «чухати потилицю»)
        '<g class="arm-r"><path d="M128 166 L144 214" stroke="' + clothD + '" stroke-width="19" stroke-linecap="round"/>' +
        '<circle cx="145" cy="218" r="10" fill="' + skin + '"/></g>' +
      '</g></g></svg>';
  }

  /* ---------- тваринки ---------- */
  var EYE = '#2a1a14';
  function laughEyes(x1, x2, y) {
    return '<path d="M' + (x1 - 5) + ' ' + y + ' Q' + x1 + ' ' + (y - 7) + ' ' + (x1 + 5) + ' ' + y +
           ' M' + (x2 - 5) + ' ' + y + ' Q' + x2 + ' ' + (y - 7) + ' ' + (x2 + 5) + ' ' + y +
           '" stroke="' + EYE + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>';
  }
  function openMouth(cx, cy, w) {
    return '<path d="M' + (cx - w) + ' ' + cy + ' Q' + cx + ' ' + (cy + w * 1.6) + ' ' + (cx + w) + ' ' + cy + ' Z" fill="#7a1f2b"/>' +
           '<path d="M' + (cx - w * 0.5) + ' ' + (cy + w * 0.8) + ' Q' + cx + ' ' + (cy + w * 0.4) + ' ' + (cx + w * 0.5) + ' ' + (cy + w * 0.8) +
           ' Q' + cx + ' ' + (cy + w * 1.3) + ' ' + (cx - w * 0.5) + ' ' + (cy + w * 0.8) + ' Z" fill="#ff8fa3"/>';
  }
  function dotEyes(x1, x2, y, r) {
    r = r || 4;
    return '<circle cx="' + x1 + '" cy="' + y + '" r="' + r + '" fill="' + EYE + '"/><circle cx="' + x2 + '" cy="' + y + '" r="' + r + '" fill="' + EYE + '"/>' +
           '<circle cx="' + (x1 + 1.4) + '" cy="' + (y - 1.4) + '" r="1.3" fill="#fff"/><circle cx="' + (x2 + 1.4) + '" cy="' + (y - 1.4) + '" r="1.3" fill="#fff"/>';
  }

  var PET_SVG = {
    cat: function () {
      var c = '#f4a259', d = '#d9792b', l = '#ffe3c2';
      return '<path class="pet-tail" d="M82 102 Q116 100 106 66" stroke="' + c + '" stroke-width="10" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="60" cy="88" rx="28" ry="24" fill="' + c + '"/><ellipse cx="60" cy="94" rx="16" ry="15" fill="' + l + '"/>' +
        '<ellipse cx="47" cy="110" rx="9" ry="5.5" fill="' + d + '"/><ellipse cx="73" cy="110" rx="9" ry="5.5" fill="' + d + '"/>' +
        '<path d="M37 42 L42 14 L60 32 Z M83 42 L78 14 L60 32 Z" fill="' + c + '"/>' +
        '<path d="M42 36 L44 22 L53 32 Z M78 36 L76 22 L67 32 Z" fill="#ffb3b3"/>' +
        '<circle cx="60" cy="50" r="25" fill="' + c + '"/>' +
        '<path d="M54 28 L56 36 M60 26 L60 35 M66 28 L64 36" stroke="' + d + '" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="M57 58 L63 58 L60 62 Z" fill="#ff7b9c"/>' +
        '<path d="M30 56 L46 58 M30 63 L46 61 M90 56 L74 58 M90 63 L74 61" stroke="#7a4a2a" stroke-width="1.6" stroke-linecap="round"/>' +
        '<g class="p-normal"><ellipse cx="50" cy="49" rx="3.8" ry="5.4" fill="' + EYE + '"/><ellipse cx="70" cy="49" rx="3.8" ry="5.4" fill="' + EYE + '"/>' +
        '<path d="M54 63 Q57 67 60 63 Q63 67 66 63" stroke="#7a4a2a" stroke-width="2" fill="none" stroke-linecap="round"/></g>' +
        '<g class="p-laugh">' + laughEyes(50, 70, 51) + openMouth(60, 63, 7) + '</g>';
    },
    dog: function () {
      var c = '#c98d5a', d = '#8a5a3b', l = '#f2d3b1';
      return '<path class="pet-tail" d="M84 96 Q104 86 100 70" stroke="' + c + '" stroke-width="9" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="60" cy="88" rx="28" ry="24" fill="' + c + '"/><ellipse cx="60" cy="95" rx="15" ry="14" fill="' + l + '"/>' +
        '<ellipse cx="47" cy="110" rx="9" ry="5.5" fill="' + d + '"/><ellipse cx="73" cy="110" rx="9" ry="5.5" fill="' + d + '"/>' +
        '<circle cx="60" cy="48" r="25" fill="' + c + '"/>' +
        '<ellipse cx="34" cy="50" rx="9" ry="19" transform="rotate(16 34 50)" fill="' + d + '"/>' +
        '<ellipse cx="86" cy="50" rx="9" ry="19" transform="rotate(-16 86 50)" fill="' + d + '"/>' +
        '<circle cx="70" cy="42" r="7" fill="' + d + '" opacity=".5"/>' +
        '<ellipse cx="60" cy="60" rx="14" ry="10" fill="' + l + '"/>' +
        '<ellipse cx="60" cy="55" rx="5.5" ry="4" fill="#2a1a14"/>' +
        '<g class="p-normal">' + dotEyes(50, 70, 45) +
        '<path d="M54 62 Q57 66 60 62 Q63 66 66 62" stroke="#5a3520" stroke-width="2" fill="none" stroke-linecap="round"/></g>' +
        '<g class="p-laugh">' + laughEyes(50, 70, 46) + openMouth(60, 62, 7) + '</g>';
    },
    owl: function () {
      var c = '#8d6e63', d = '#6d4c41', l = '#e8dcd5';
      return '<path d="M32 40 L36 18 L50 32 Z M88 40 L84 18 L70 32 Z" fill="' + d + '"/>' +
        '<ellipse cx="60" cy="72" rx="34" ry="40" fill="' + c + '"/>' +
        '<ellipse cx="29" cy="80" rx="9" ry="22" transform="rotate(10 29 80)" fill="' + d + '"/>' +
        '<ellipse cx="91" cy="80" rx="9" ry="22" transform="rotate(-10 91 80)" fill="' + d + '"/>' +
        '<ellipse cx="60" cy="88" rx="20" ry="20" fill="' + l + '"/>' +
        '<path d="M52 82 L55 86 L58 82 M62 82 L65 86 L68 82 M57 92 L60 96 L63 92" stroke="' + c + '" stroke-width="2" fill="none"/>' +
        '<circle cx="46" cy="56" r="14" fill="#f5efe9"/><circle cx="74" cy="56" r="14" fill="#f5efe9"/>' +
        '<path d="M48 110 L46 116 M52 110 L52 116 M68 110 L68 116 M72 110 L74 116" stroke="#f3a52c" stroke-width="3" stroke-linecap="round"/>' +
        '<g class="p-normal"><circle cx="46" cy="57" r="7" fill="' + EYE + '"/><circle cx="74" cy="57" r="7" fill="' + EYE + '"/>' +
        '<circle cx="48.5" cy="54.5" r="2.2" fill="#fff"/><circle cx="76.5" cy="54.5" r="2.2" fill="#fff"/>' +
        '<path d="M55 66 L65 66 L60 75 Z" fill="#f3a52c"/></g>' +
        '<g class="p-laugh">' + laughEyes(46, 74, 59) +
        '<path d="M54 65 L66 65 L60 70 Z" fill="#f3a52c"/><path d="M55 72 L65 72 L60 80 Z" fill="#e08b14"/></g>';
    },
    fox: function () {
      var c = '#f0803c', d = '#c45a1c', w = '#fff4e6';
      return '<path class="pet-tail" d="M78 104 Q120 106 110 70 Q104 58 96 66 Q100 90 78 96 Z" fill="' + c + '"/>' +
        '<path d="M110 70 Q104 58 96 66 Q99 72 100 78 Q108 78 110 70 Z" fill="' + w + '"/>' +
        '<ellipse cx="60" cy="88" rx="27" ry="24" fill="' + c + '"/><ellipse cx="60" cy="96" rx="14" ry="14" fill="' + w + '"/>' +
        '<ellipse cx="47" cy="110" rx="8" ry="5.5" fill="#3a2418"/><ellipse cx="73" cy="110" rx="8" ry="5.5" fill="#3a2418"/>' +
        '<path d="M36 40 L38 10 L58 30 Z M84 40 L82 10 L62 30 Z" fill="' + c + '"/>' +
        '<path d="M38 22 L38 10 L46 18 Z M82 22 L82 10 L74 18 Z" fill="#3a2418"/>' +
        '<path d="M32 40 Q60 22 88 40 Q86 62 60 76 Q34 62 32 40 Z" fill="' + c + '"/>' +
        '<path d="M36 50 Q48 54 60 76 Q42 68 36 50 Z M84 50 Q72 54 60 76 Q78 68 84 50 Z" fill="' + w + '"/>' +
        '<ellipse cx="60" cy="72" rx="4.5" ry="3.5" fill="#2a1a14"/>' +
        '<g class="p-normal">' + dotEyes(49, 71, 48, 4) + '</g>' +
        '<g class="p-laugh">' + laughEyes(49, 71, 50) + openMouth(60, 76, 5) + '</g>';
    },
    panda: function () {
      var w = '#fafafa', k = '#22222b';
      return '<circle cx="38" cy="30" r="10" fill="' + k + '"/><circle cx="82" cy="30" r="10" fill="' + k + '"/>' +
        '<ellipse cx="60" cy="88" rx="29" ry="25" fill="' + w + '"/>' +
        '<path d="M32 78 Q60 66 88 78 L88 88 Q60 78 32 88 Z" fill="' + k + '"/>' +
        '<ellipse cx="34" cy="92" rx="8" ry="13" fill="' + k + '"/><ellipse cx="86" cy="92" rx="8" ry="13" fill="' + k + '"/>' +
        '<ellipse cx="46" cy="110" rx="10" ry="6" fill="' + k + '"/><ellipse cx="74" cy="110" rx="10" ry="6" fill="' + k + '"/>' +
        '<circle cx="60" cy="50" r="26" fill="' + w + '"/>' +
        '<ellipse cx="48" cy="50" rx="8" ry="10" transform="rotate(25 48 50)" fill="' + k + '"/>' +
        '<ellipse cx="72" cy="50" rx="8" ry="10" transform="rotate(-25 72 50)" fill="' + k + '"/>' +
        '<ellipse cx="60" cy="61" rx="5" ry="3.5" fill="' + k + '"/>' +
        '<g class="p-normal"><circle cx="49" cy="50" r="3" fill="#fff"/><circle cx="71" cy="50" r="3" fill="#fff"/>' +
        '<path d="M55 66 Q60 70 65 66" stroke="' + k + '" stroke-width="2" fill="none" stroke-linecap="round"/></g>' +
        '<g class="p-laugh"><path d="M45 52 Q49 46 53 52 M67 52 Q71 46 75 52" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>' + openMouth(60, 65, 6) + '</g>';
    },
    turtle: function () {
      var s = '#4caf50', sd = '#2e7d32', k = '#9ad49c';
      return '<ellipse cx="34" cy="106" rx="9" ry="7" fill="' + k + '"/><ellipse cx="82" cy="106" rx="9" ry="7" fill="' + k + '"/>' +
        '<path d="M14 100 L6 104 L16 106 Z" fill="' + k + '"/>' +
        '<circle cx="100" cy="72" r="16" fill="' + k + '"/><rect x="86" y="78" width="16" height="16" rx="6" fill="' + k + '"/>' +
        '<path d="M14 100 Q16 48 58 48 Q100 48 102 100 Z" fill="' + s + '"/>' +
        '<path d="M44 62 L58 54 L72 62 L72 78 L58 86 L44 78 Z" fill="' + sd + '"/>' +
        '<path d="M24 86 L36 80 L40 92 Z M92 86 L80 80 L76 92 Z M52 92 L64 92 L58 99 Z" fill="' + sd + '"/>' +
        '<rect x="10" y="96" width="96" height="9" rx="4.5" fill="#f2c94c"/>' +
        '<g class="p-normal"><circle cx="105" cy="68" r="4" fill="' + EYE + '"/><circle cx="106.4" cy="66.6" r="1.3" fill="#fff"/>' +
        '<path d="M100 80 Q106 83 112 78" stroke="#3a5a3a" stroke-width="2" fill="none" stroke-linecap="round"/></g>' +
        '<g class="p-laugh"><path d="M100 69 Q105 63 110 69" stroke="' + EYE + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<path d="M99 77 Q106 90 114 76 Z" fill="#7a1f2b"/></g>';
    }
  };

  function pet(petIndex) {
    var p = PD.PETS[petIndex];
    if (!p || p.key === 'none' || !PET_SVG[p.key]) return '';
    return '<svg class="av-pet pet-' + p.key + '" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<ellipse cx="60" cy="116" rx="40" ry="4" fill="rgba(0,0,0,.25)"/>' +
      '<g class="pet-body">' + PET_SVG[p.key]() + '</g></svg>';
  }

  /* «Без тваринки» для галереї */
  function noPet() {
    return '<svg class="av-pet pet-none" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<circle cx="60" cy="62" r="38" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="7" stroke-dasharray="10 9"/>' +
      '<path d="M36 86 L84 38" stroke="rgba(255,255,255,.55)" stroke-width="7" stroke-linecap="round"/></svg>';
  }

  /* Повний аватар: людина + тваринка поруч */
  function full(a, extraClass) {
    a = a || { char: 0, color: 0, pet: 6 };
    var p = pet(a.pet);
    return '<div class="avatar ' + (extraClass || '') + (p ? '' : ' no-pet') + '">' +
      '<div class="av-char-wrap">' + character(a.char, a.color) + '</div>' +
      (p ? '<div class="av-pet-wrap">' + p + '</div>' : '') +
      '</div>';
  }

  return { character: character, pet: pet, noPet: noPet, full: full, shade: shade };
})();
