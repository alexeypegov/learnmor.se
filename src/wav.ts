class Pcm {
  private static _cache:{[key: string]: number[]} = {};

  private _data: number[] = [];

  constructor(private frequency: number, private volume = 1) {
  }

  append(duration: number, silence = false): Pcm {
    let key = `${duration}${silence ? 'UP' : 'DOWN'}`;
    if (Pcm._cache.hasOwnProperty(key)) {
      this._data = this._data.concat(Pcm._cache[key]);
      return this;
    }

    let cycle = 44100 / this.frequency;
    let samples = Math.floor((duration / 1000) * 44100);

    if (silence) {
      this._data = this._data.concat(Array.apply(null, Array(samples)).map(Number.prototype.valueOf,0));
    } else {
      const coeff = 2 * Math.PI;
      let temp: number[] = [];
      for (let i = 0; i < samples; i++) {
        temp.push(Math.sin(coeff * i / cycle));
      }

      // smooth tone
      let c: number;
      for (let i = 0; i < Math.min(200, samples); i++) {
        c = i * 100/20000;
        temp[i] = temp[i] * c;

        let endNdx = samples - i - 1;
        temp[endNdx] = temp[endNdx] * c;
      }

      Pcm._cache[key] = temp;
      this._data = this._data.concat(temp);
    }

    return this;
  }

  get data(): number[] {
    return this._data;
  }
}

export class WavGen {
  private pcm: Pcm;

  constructor(frequency = 680, volume = 1) {
      this.pcm = new Pcm(frequency, volume);
  }

  static get supported(): boolean {
    return typeof btoa === 'function' && document.location.search.indexOf('html5') < 0;
  }

  append(duration: number, silence = false): WavGen {
    this.pcm.append(duration, silence);
    return this;
  }

  build(): string {
    let data = this.pcm.data;
    return this.array2dataURI(data);
  }

  private pcm2wav(pcm: string, sampleRate: number, bitn: number): string {
    let i32 = this.i32toString;
    let i16 = this.i16toString;

   var ret=
     'RIFF' +
     i32(36 + pcm.length) +
     'WAVE' +
     'fmt ' +
     i32(16) +
     i16(1) +
     i16(1) +
     i32(sampleRate) +
     i32(sampleRate * bitn / 8) +
     i16(bitn / 8) +
     i16(bitn) +
     'data' +
     i32(pcm.length) +
     pcm;
   return ret;
 };

 private array2dataURI(array: number[], sampleRate = 44100, bitsPerSample = 16): string {
   return 'data:audio/wav;base64,' +
    btoa(this.pcm2wav(this.array2bytestream(array, bitsPerSample), sampleRate, bitsPerSample));
 };

 private i16toString(n: number): string {
    let n1 = n & (65536 - 1);
    return String.fromCharCode(n1 & 255) + String.fromCharCode((n1 >> 8) & 255);
  }

  private i32toString(n: number): string {
    let n1 = n & (65536 * 65536 - 1);
    return String.fromCharCode(n1 & 255) + String.fromCharCode((n1 >> 8) & 255) +
      String.fromCharCode((n1 >> 16) & 255) + String.fromCharCode((n1 >> 24) & 255);
  }

  private array2bytestream(x: number[], bitn: number): string {
    let ret = '';
    let c = String.fromCharCode;
    let r = Math.round;
    let n = x.length;
    let y: number;

    if(bitn === 8) {
      for(var i = 0; i < n ; ++i) {
        y = r(x[i] * 127 + 128) & 255;
        ret += c(y);
      }
    } else {
      for(var i = 0; i < n; ++i) {
        y = r(x[i] * 32767) & 65535;
        ret += c((y >> 0) & 255) + c((y >> 8) & 255);
      }
    }

    return ret;
  }
}
