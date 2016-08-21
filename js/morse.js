var WPM_PARIS_DOTS = 50;
var WPM_CODEX_DOTS = 60;

var ALPHABET = {
  'a': '.-', 'b': '-...', 'c': '-.-.', 'd': '-..', 'e': '.', 'f': '..-.', 'g': '--.', 'h': '....',
  'i': '..', 'j': '.---', 'k': '-.-', 'l': '.-..', 'm': '--', 'n': '-.', 'o': '---', 'p': '.--.',
  'q': '--.-', 'r': '.-.', 's': '...', 't': '-', 'u': '..-', 'v': '...-', 'w': '.--', 'x': '-..-',
  'y': '-.--', 'z': '--..',
  '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
  '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----' /* or just '-' */,
  '.': '._._._', ',': '__..__', '?': '..__..',  '\'': '.____.',
  '/': '_.._.',  '(': '_.__.',  ')': '_.__._',  '&': '._...',
  ':': '___...', ';': '_._._.', '=': '_..._',   '+': '._._.',
  '-': '_...._', '_': '..__._', '"': '._.._.', '$': '..._.._',
  '!': '_._.__' /* or '___.' */, '@': '.__._.',
  ' ': ' ' /* space */
};

function isVisible() {
  var stateKey, eventKey, keys = {
    hidden: "visibilitychange",
    webkitHidden: "webkitvisibilitychange",
    mozHidden: "mozvisibilitychange",
    msHidden: "msvisibilitychange"
  };

  for (stateKey in keys) {
      if (stateKey in document) {
          eventKey = keys[stateKey];
          break;
      }
  }
  return !document[stateKey];
}

function Morse(wpm) {
  this.wpm = wpm;
}

Morse.prototype.play = function(text) {
  var builder = new MorseBuilder(this.wpm);
  for (var i = 0; i < text.length; i++) {
    builder.append(text[i]);
  }

  var deferred = $.Deferred();
  var startTone = builder.build();
  startTone.play(680, deferred);

  return deferred;
}

function MorseBuilder(wpm) {
  this.dotDuration = MorseBuilder.getDotDuration(wpm);

  this.start = null;
  this.current = null;
  this.prevChar = null;
}

MorseBuilder.prototype.createTone = function(toneChar) {
  var tone;
  switch (toneChar) {
    case 'dot':
      tone = new Tone(this.dotDuration);
      break;
    case 'dash':
      tone = new Tone(this.dotDuration * 3);
      break;
    case 'word-sep':
      tone = new Tone(this.dotDuration * 7, true);
      break;
    case 'tone-sep':
      tone = new Tone(this.dotDuration, true);
      break;
    case 'letter-sep':
      tone = new Tone(this.dotDuration * 3, true);
      break;
    default:
      throw Error('Unknown tone char: "%(c)"!'.replace('%(c)', toneChar));
  }

  return tone;
}

MorseBuilder.prototype.append = function(char) {
  var toneSeq = ALPHABET[char];
  if (!ALPHABET.hasOwnProperty(char)) {
    throw Error('Unknown char: "%(c)"!'.replace('%(c)', char));
  }

  if (toneSeq === ' ') {
    this.current = this.current.append(this.createTone('word-sep'));
  } else {
    for (var i = 0; i < toneSeq.length; i++) {
      var toneChar = toneSeq[i];
      if (this.prevChar && this.prevChar !== ' ') {
        this.current = this.current.append(this.createTone('letter-sep'));
        this.prevChar = null;
      }

      var tone = this.createTone(toneChar === '-' ? 'dash' : 'dot');
      if (!this.first) {
        this.first = tone;
      }

      if (this.current) {
        this.current = this.current.append(tone);
      } else {
        this.current = tone;
      }

      if (i < toneSeq.length - 1) {
        this.current = this.current.append(this.createTone('tone-sep'));
      }
    }
  }

  this.prevChar = char;
}

MorseBuilder.prototype.build = function() {
  var current = this.first;
  while(true) {
    current = current.next;
    if (!current) {
      break;
    }
  }

  return this.first;
}

MorseBuilder.getDotDuration = function(wpm) {
  return Math.round(60 / (parseFloat(wpm) * WPM_CODEX_DOTS) * 1000);
}

function Signal(freq) {
  var ctx = Signal.ctx;
  var osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;

  var vol = ctx.createGain();

  osc.connect(vol);
  vol.connect(ctx.destination);

  vol.gain.value = 0; // off by default
  osc.start();

  this.osc = osc;
  this.vol = vol;
}

Signal.ctx = new (window.AudioContext || window.webkitAudioContext)();

Signal.prototype.on = function() {
  this.vol.gain.value = .5;
}

Signal.prototype.off = function() {
  this.vol.gain.value = 0;
}

Signal.prototype.stop = function() {
  this.off();

  // don't drop the mic :)
  setTimeout(this.osc.stop.bind(this.osc), 30);
}

function Tone(duration, off) {
  this.duration = duration;
  this.off = off;
}

Tone.prototype.append = function (nextTone) {
  this.next = nextTone;
  return nextTone;
}

Tone.prototype.withSignal = function(freq, current, callback) {
  if (current) {
    callback.bind(this)(current);
  } else {
    setTimeout(callback.bind(this, new Signal(freq)), 30);
  }
};

Tone.prototype.play = function (freq, deferred, signal) {
  this.withSignal(freq, signal, function(signal) {
    if (!this.off) {
      signal.on();
    }

    window.setTimeout(function() {
      if (!this.off) {
        signal.off();
      }

      if (this.next && isVisible()) {
        this.next.play(freq, deferred, signal);
      } else {
        signal.stop();
        if (!isVisible()) {
          deferred.reject();
        } else {
          deferred.resolve();
        }
      }
    }.bind(this), this.duration);
  });
}
