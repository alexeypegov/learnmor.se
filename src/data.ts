type Proc = () => void;

export abstract class Question {
  private MAX_TRY_COUNT = 2;
  protected _answered = false;
  protected _guessed = false;
  private _tryCount = 0;

  private _listeners: Proc[] = [];

  constructor(private _question: string, private _variants: string[]) {
  }

  protected hasMoreTries(): boolean {
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
        char$.html('&middot;');
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
      input$.append('<div class="char">&middot;</div>');
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
      let key = key$.data('value');

      this.answer(key);
    });

    parent$.append(keyboard$);
  }
}

export type QuestionFactory = () => Question;

export class Registry {
  private static _sections: string[] = [];
  private static _sectionMap: {[key: string]: QuestionFactory[]} = {};

  static register(factory: QuestionFactory, section: string) {
    if (!Registry._sectionMap.hasOwnProperty(section)) {
      Registry._sections.push(section);
      Registry._sectionMap[section] = [factory];
    } else {
      Registry._sectionMap[section].push(factory);
    }
  }

  static populateLevels(parent$: JQuery, selected: number = 1) {
    if (!parent$.children().length) {
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

function chooseRandomly(howMany: number, chars: string): string {
  let result: string[] = [];
  while (result.length < howMany) {
    let ndx = Math.floor(Math.random() * chars.length);
    let probe = chars[ndx];
    if (result.indexOf(probe) === -1) {
      result.push(probe);
    }
  }

  return result.join('');
}

function randomChar(s: string): string {
  return s[Math.floor(Math.random() * s.length)];
}

function sequenceQuestion(alphabet: string, numOfKeys: number, numOfChars: number): Question {
  let variants = chooseRandomly(numOfKeys, alphabet);
  let question = chooseRandomly(numOfChars, variants);
  return new SequenceQuestion(question, variants.split(''));
}

Registry.register(() => { return sequenceQuestion('aeimnt', 4, 1);  }, 'alpha');
Registry.register(() => { return sequenceQuestion('dgkorsu', 4, 1); }, 'alpha');
Registry.register(() => { return sequenceQuestion('aeimntdgkorsu', 8, 3) }, 'alpha');
Registry.register(() => { return sequenceQuestion('bcfhjlw', 4, 1); }, 'alpha');
Registry.register(() => { return sequenceQuestion('pqvxyz', 4, 1);  }, 'alpha');
Registry.register(() => { return sequenceQuestion('bcfhjlwpqvxyz', 8, 3);  }, 'alpha');
