/// <reference path="../typings/index.d.ts" />

const WPM_PARIS_DOTS = 50;
const WPM_CODEX_DOTS = 60;

const ALPHABET = {
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

export class Morse {
    constructor(private wpm:number = 20, private frequency: number = 680) {
    }

    public play(text:string, cb: (success: boolean) => void): void {
      let builder = new MorseBuilder(this.wpm);
      for (let i = 0; i < text.length; i++) {
        builder.append(text[i]);
      }

      let start = builder.build();
      start.play(this.frequency, cb);
    }
}

enum ToneType {
  DOT, DASH, WORD_SEP, TONE_SEP, LETTER_SEP
}

class MorseBuilder {
  SPACE = ' ';
  DASH = '-';

  dotDuration: number;
  start: Tone;
  current: Tone;
  prevChar: string;

  constructor(wpm: number) {
    this.dotDuration = MorseBuilder.getDotDuration(wpm);
  }

  createTone(type: ToneType): Tone {
    let coeff = 1;
    let off = false;

    switch (type) {
      case ToneType.DOT:
        coeff = 1;
        break;
      case ToneType.DASH:
        coeff = 3;
        break;
      case ToneType.WORD_SEP:
        coeff = 7;
        off = true;
        break;
      case ToneType.TONE_SEP:
        coeff = 1;
        off = true;
        break;
      case ToneType.LETTER_SEP:
        coeff = 3;
        off = true;
        break;
      default:
        throw Error(`Unknown tone type: ${type}!`);
    }

    return new Tone(this.dotDuration * coeff, off);
  }

  append(char: string): void {
    let toneSeq = ALPHABET[char];
    if (!toneSeq) {
      throw Error(`Unknown char: "${char}!"`);
    }

    if (toneSeq === this.SPACE) {
      this.current = this.current.append(this.createTone(ToneType.WORD_SEP));
    } else {
      for (let i = 0; i < toneSeq.length; i++) {
        let toneChar = toneSeq[i];
        if (this.prevChar && this.prevChar !== this.SPACE) {
          this.current = this.current.append(this.createTone(ToneType.LETTER_SEP));
        }

        let tone = this.createTone(toneChar === this.DASH ? ToneType.DASH : ToneType.DOT);
        if (!this.start) {
          this.start = tone;
        }

        if (this.current) {
          this.current = this.current.append(tone);
        } else {
          this.current = tone;
        }

        if (i < toneSeq.length - 1) {
          this.current = this.current.append(this.createTone(ToneType.TONE_SEP));
        }
      }
    }

    this.prevChar = char;
  }

  build(): Tone {
    return this.start;
  }

  static getDotDuration(wpm: number) {
    return Math.round(60 / (wpm * WPM_CODEX_DOTS) * 1000);
  }
}

class Signal {
  private static ctx: AudioContext = new (window.AudioContext || webkitAudioContext)();

  private oscillator: OscillatorNode;
  private volume: GainNode;

  private _on: boolean = false;

  constructor(private frequency:number) {
    this.oscillator = Signal.ctx.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = frequency;

    this.volume = Signal.ctx.createGain();
    this.oscillator.connect(this.volume);
    this.volume.connect(Signal.ctx.destination);

    this.volume.gain.value = 0;
    this.oscillator.start();
  }

  on(): void {
    if (!this._on) {
      this._on = true;
      this.volume.gain.value = 1;
    }
  }

  off(): void {
    if (this._on) {
      this._on = false;
      this.volume.gain.value = 0;
    }
  }

  stop(): void {
    this.off();

    setTimeout(() => this.oscillator.stop(), 30);
  }
}

class Tone {
  next: Tone;

  constructor(private duration: number, private silent: boolean = false) {}

  append(tone: Tone): Tone {
    this.next = tone;
    return tone;
  }

  withSignal(frequency: number, signal: Signal, callback: (signal: Signal) => void) {
    let _cb = callback.bind(this);
    if (signal) {
      _cb(signal);
    } else {
      let _signal = new Signal(frequency);
      setTimeout(() => _cb(_signal), 30);
    }
  }

  play(frequency: number, onFinished: (success: boolean) => void, signal: Signal = null) {
    this.withSignal(frequency, signal, (_signal: Signal) => {
      if (!this.silent) {
        _signal.on();
      }

      setTimeout(() => {
        if (!this.silent) {
          _signal.off();
        }

        if (this.next /* && isVisible() */) {
          this.next.play(frequency, onFinished, _signal);
        } else {
          _signal.stop();
          onFinished(true /* !isVisible() */);
        }
      }, this.duration);
    });
  }
}