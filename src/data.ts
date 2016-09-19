type Proc = () => void;

export abstract class Question {
  private MAX_TRY_COUNT = 2;
  protected _answered = false;
  protected _guessed = false;
  private _tryCount = 0;

  private _listeners: Proc[] = [];

  constructor(private _question: string, private _variants: string[]) {
  }

  hasMoreTries(): boolean {
    return this._tryCount < this.MAX_TRY_COUNT;
  }

  protected nextTry(): void {
    this._tryCount = this._tryCount + 1;
  }

  get answered(): boolean {
    return this._answered;
  }

  get guessed(): boolean {
    return this._guessed;
  }

  get question(): string {
    return this._question;
  }

  get variants(): string[] {
    return this._variants;
  }

  abstract answer(variant: string): void;
  abstract initUI(parent$: JQuery): void;

  deinitUI(parent$: JQuery): void {
    parent$.children().remove();
  }

  onAnswered(cb: Proc): void {
    this._listeners.push(cb)
  }

  protected fireAnswered(): void {
    this._listeners.forEach((listener) => {
      listener();
    });

    this._listeners = [];
  }
}

class SequenceQuestion extends Question {
  private parent$: JQuery;
  private buffer: string;

  constructor(question: string, variants: string[]) {
    super(question, variants);
  }

  private checkValid(probe: string): boolean {
    return !this.answered && this.variants.indexOf(probe) >= 0;
  }

  answer(probe: string): void {
    if (!this.checkValid(probe)) return;

    if (this.buffer && this.buffer.length === this.question.length) {
      this.buffer = '';
    }

    this.buffer = this.buffer ? this.buffer + probe : probe;
    if (this.buffer.length === this.question.length) {
      this.nextTry();

      let correct = this.buffer === this.question;
      let hasMoreTries = this.hasMoreTries();

      if (correct || !hasMoreTries) {
        this._guessed = correct;
        this._answered = correct || !hasMoreTries;
        this.fireAnswered();
      }
    }

    this.updateUI();
  }

  private updateUI(): void {
    let input$ = this.parent$.find('.input');
    this.question.split('').forEach((c, i) => {
      let char$ = input$.find(`.char:nth-child(${i + 1})`);
      if (i < this.buffer.length) {
        char$.text(this.buffer[i]);
        char$.data('value', this.buffer[i]);
      } else {
        char$.html('&nbsp;');
        char$.data('value', null);
      }
    });

    if (this.buffer.length === this.question.length) {
      input$.removeClass('correct wrong');
      input$.toggleClass(this.guessed ? 'correct' : 'wrong');
      if (this.answered) {
        this.question.split('').forEach((c, i) => {
          let char$ = input$.find(`.char:nth-child(${i + 1})`);
          if (c !== this.buffer[i]) {
            char$.attr('data-correct', c);
          } else {
            char$.toggleClass('correct', true);
          }
        });
      }

      return;
    }

    input$.removeClass('correct wrong');
  }

  initUI(parent$: JQuery): void {
    this.parent$ = parent$;
    parent$.children().remove();

    this.initInput(parent$);
    this.initKeyboard(parent$);
  }

  private initInput(parent$: JQuery): void {
    let input$ = $('<div class="input"></div>');
    this.question.split('').forEach((c) => {
      input$.append('<div class="char">&nbsp;</div>');
    });

    parent$.append(input$);
  }

  private initKeyboard(parent$: JQuery): void {
    let keyboard$ = $('<div class="keyboard"></div>');
    this.variants.forEach((key) => {
      keyboard$.append(`<div class="key" data-value="${key}">${key}</div>`);
    });

    keyboard$.on('click', '.key', (event) => {
      let key$ = $(event.target);
      let key = '' + key$.data('value');

      this.answer(key);
    });

    parent$.append(keyboard$);
  }
}

export type QuestionFactory = () => Question;

export class Registry {
  private static _sections: string[] = [];
  private static _sectionMap: {[key: string]: QuestionFactory[]} = {};

  static register(factory: QuestionFactory, section: string): void {
    if (!Registry._sectionMap.hasOwnProperty(section)) {
      Registry._sections.push(section);
      Registry._sectionMap[section] = [factory];
    } else {
      Registry._sectionMap[section].push(factory);
    }
  }

  static populateLevels(parent$: JQuery, selected: number = 1): void {
    let level = 1;
    Registry._sections.forEach((s) => {
      let section$ = $('<div class="section"></div>');
      section$.append(`<div class="title">${s}</div>`);
      let levels$ = $('<div class="levels"></div>');
      section$.append(levels$);
      let levels = Registry._sectionMap[s];
      levels.forEach((lvl) => {
        let level$ = $(`<button class="level" data-level="${level}">${level}</button>`);
        level$.toggleClass('selected', selected === level);
        levels$.append(level$);

        level = level + 1;
      });

      parent$.append(section$);
    });
  }

  static getFactory(level: number): QuestionFactory {
    let currentLevel = 1;

    for (let i = 0; i < Registry._sections.length; i++) {
        let section = Registry._sections[i];
        let factories = Registry._sectionMap[section];
        for (let i = 0; i < factories.length; i++) {
            let factory = factories[i];
            if (currentLevel === level) {
              return factory;
            }

            currentLevel = currentLevel + 1;
        }
    }

    return null;
  }

  static initial(): QuestionFactory {
    return this._sectionMap[this._sections[0]][0];
  }
}

export class QuestionChooser {
  private answerMap: {[key: string]: number} = {};
  constructor(private alphabet: string, private numOfChars: number, private numOfKeys: number) {
    for (let i = 0; i < alphabet.length; i++) {
      this.answerMap[alphabet[i]] = 0;
    }
  }

  answer(question: string, points: number): void {
    if (points === 0) return;

    for(let i = 0; i < question.length; i++) {
      this.answerMap[question[i]] = this.answerMap[question[i]] + points;
    }
  }

  // https://en.wikipedia.org/wiki/Rejection_sampling
  generateNewQuestion(): Question {
    let result = '';
    for (let i = 0; i < this.numOfChars; i++) {
      while(true) {
        let [c, x] = this.probe();
        let char = this.alphabet[c];
        if (this.answerMap[char] <= x && result.indexOf(char) === -1) {
          result += char;
          break;
        }

        if (result.length === this.numOfChars) {
          break;
        }
      }
    }

    let question = new SequenceQuestion(result, this.buildKeys(result, this.numOfKeys));
    question.onAnswered(() => this.answer(question.question, question.guessed ? question.hasMoreTries() ? 2 : 1 : 0));

    return question;
  }

  private probe(): [number, number] {
    let n = this.alphabet.length;
    let vals = Object.keys(this.answerMap).map((k) => this.answerMap[k]);
    let max = Math.max.apply(null, vals);
    let min = Math.min.apply(null, vals);
    return [QuestionChooser.rand(0, n), QuestionChooser.rand(min, max + 1)];
  }

  private buildKeys(question: string, numOfKeys: number): string[] {
    let variants = question;
    while (true) {
      if (variants.length === numOfKeys) {
        break;
      }

      let probe = this.alphabet[QuestionChooser.rand(0, this.alphabet.length)];
      if (variants.indexOf(probe) === -1) {
        variants = variants + probe;
      }
    }

    return variants.split('').sort();
  }

  private static rand(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min) + min);
  }
}

function sequenceQuestion(alphabet: string, numOfChars: number, numOfKeys: number): () => Question {
  let chooser = new QuestionChooser(alphabet, numOfChars, numOfKeys);
  return () => chooser.generateNewQuestion();
}

Registry.register(sequenceQuestion('aeimnt', 1, 4), 'alpha 1');
Registry.register(sequenceQuestion('dgkorsu', 1, 4), 'alpha 1');
Registry.register(sequenceQuestion('aeimntdgkorsu', 2, 8), 'alpha 1');

Registry.register(sequenceQuestion('bcfhjlw', 1, 4), 'alpha 2');
Registry.register(sequenceQuestion('pqvxyz', 1, 4), 'alpha 2');
Registry.register(sequenceQuestion('bcfhjlwpqvxyz', 2, 8), 'alpha 2');

Registry.register(sequenceQuestion('aeimntdgkorsubcfhjlwpqvxyz', 2, 8), 'alpha 3');
Registry.register(sequenceQuestion('aeimntdgkorsubcfhjlwpqvxyz', 3, 8), 'alpha 3');

Registry.register(sequenceQuestion('01234', 1, 4), 'digits');
Registry.register(sequenceQuestion('56789', 1, 4), 'digits');
Registry.register(sequenceQuestion('123456789', 2, 8), 'digits');

Registry.register(sequenceQuestion('0123456789aeimntdgkorsubcfhjlwpqvxyz', 2, 8), 'alpha & digits');
Registry.register(sequenceQuestion('0123456789aeimntdgkorsubcfhjlwpqvxyz', 4, 12), 'alpha & digits');
