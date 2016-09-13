/// <reference path="../typings/index.d.ts" />

import { WavGen } from './wav';

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

const SPACE = ' ';
const DASH = '-';

export abstract class MorsePlayer {
  constructor() {}

  abstract play(cb?: (success: boolean) => void): void;

  cancel(): void {}

  static create(text: string, wpm = 20, frequency = 680): MorsePlayer {
    let builder = new MorseBuilder(wpm);
    for (let i = 0; i < text.length; i++) {
      builder.append(text[i]);
    }

    let start = builder.build();
    let player = WavGen.supported ? new WavPlayer(frequency, start) : new WebAudioApiPlayer(frequency, start);
    return player;
  }
}

class WebAudioApiPlayer extends MorsePlayer {
  private signal: Signal;

  constructor(private frequency: number, private start: Tone) {
    super();
  }

  play(cb?: (success: boolean) => void): void {
    this.signal = new Signal(680);
    setTimeout(() => {
      this.start.play(this.frequency, this.signal, (success) => {
        this.signal.stop();
        this.signal = null;
        cb && cb(success);
      });
    }, 30);
  }

  cancel(): void {
    this.signal && this.signal.stop();
  }
}

class WavPlayer extends MorsePlayer {
  private audio: any; // oopsie

  constructor(frequency: number, start: Tone) {
    super();

    let wav = new WavGen(frequency);

    let tone = start;
    while (true) {
      wav.append(tone.duration, tone.silent);
      tone = tone.next;
      if (!tone) break;
    }

    this.audio  = new Audio(wav.build());
  }

  play(cb?: (success: boolean) => void): void {
    cb && this.audio.addEventListener('ended', () => cb(true));
    this.audio.play();
  }
}

enum ToneType {
  DOT, DASH, WORD_SEP, TONE_SEP, LETTER_SEP
}

class MorseBuilder {
  private dotDuration: number;
  private start: Tone;
  private current: Tone;
  private prevChar: string;

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

    if (toneSeq === SPACE) {
      this.current = this.current.append(this.createTone(ToneType.WORD_SEP));
    } else {
      for (let i = 0; i < toneSeq.length; i++) {
        let toneChar = toneSeq[i];
        if (this.prevChar && this.prevChar !== SPACE) {
          this.current = this.current.append(this.createTone(ToneType.LETTER_SEP));
        }

        let tone = this.createTone(toneChar === DASH ? ToneType.DASH : ToneType.DOT);
        if (!this.start) {
          this.start = this.createTone(ToneType.LETTER_SEP);
          this.start.append(tone);
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
    this.current.append(this.createTone(ToneType.LETTER_SEP)); // do not drop the mic
    return this.start;
  }

  private static getDotDuration(wpm: number): number {
    return Math.round(1200 / wpm);
  }
}

class Signal {
  private static ctx: AudioContext = new (window.AudioContext || webkitAudioContext)();

  private oscillator: OscillatorNode;
  private volume: GainNode;

  private _on: boolean = false;
  private _stopped = false;

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

  get stopped(): boolean {
    return this._stopped;
  }

  on(): void {
    if (!this._on && !this._stopped) {
      this._on = true;
      this.setVolume(1);
    }
  }

  private setVolume(volume: number): void {
    let now = Signal.ctx.currentTime;
    this.volume.gain.cancelScheduledValues(now);
    this.volume.gain.setValueAtTime(this.volume.gain.value, now);
    this.volume.gain.linearRampToValueAtTime(volume, now + 0.015);
  }

  off(): void {
    if (this._on) {
      this._on = false;
      this.setVolume(0);
    }
  }

  stop(): void {
    if (this.stopped) {
      return;
    }

    this.off();
    this._stopped = true;
    setTimeout(() => this.oscillator.stop(), 30);
  }
}

class Tone {
  private _next: Tone;

  constructor(public duration: number, public silent: boolean = false) {}

  append(tone: Tone): Tone {
    this._next = tone;
    return tone;
  }

  get next(): Tone {
    return this._next;
  }

  play(frequency: number, signal: Signal, onFinished: (success: boolean) => void): void {
    if (signal.stopped) {
      return;
    }

    if (!this.silent) {
      signal.on();
    }

    setTimeout(() => {
      if (!this.silent) {
        signal.off();
      }

      if (this.next) {
        this.next.play(frequency, signal, onFinished);
      } else {
        signal.stop();
        onFinished(true);
      }
    }, this.duration);
  }
}
