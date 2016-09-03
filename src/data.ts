type Proc = () => void;

export abstract class Question {
  protected _answered = false;
  private _listeners: Proc[] = [];

  constructor(private _question: string, private _variants: string[]) {
  }

  get answered(): boolean {
    return this._answered;
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

class SimpleQuestion extends Question {
  private MAX_TRY_COUNT = 2;
  private _tryCount = 0;
  private _guessed = false;
  private parent$: JQuery;

  constructor(question: string, variants: string[]) {
    super(question, variants)
  }

  answer(probe: string): void {
    if (this.variants.indexOf(probe) < 0 || this._answered) return;

    this._tryCount = this._tryCount + 1;

    let correct = probe === this.question;
    let hasMoreTries = this.hasMoreTries();

    if (correct || !hasMoreTries) {
      this._answered = true;
      this._guessed = correct;
      this.fireAnswered();
    }

    this.updateUI(probe);
  }

  private updateUI(probe: string): void {
    if (!this.parent$) return;

    let btn$ = this.parent$.find(`button[value="${probe.toLowerCase()}"]`);
    if (this._guessed) {
      btn$.toggleClass('correct', true);
    } else {
      btn$.toggleClass('wrong', true);

      if (!this.hasMoreTries()) {
        this.parent$.find(`button[value="${this.question}"]`).toggleClass('correct', true);
      }
    }
  }

  isGuessed(): boolean {
    return this._guessed;
  }

  isAnswered(): boolean {
    return this.isGuessed() || !this.hasMoreTries();
  }

  hasMoreTries(): boolean {
    return this._tryCount < this.MAX_TRY_COUNT;
  }

  initUI(parent$: JQuery): void {
    this.parent$ = parent$;
    parent$.children().remove();

    this.variants.forEach((variant) => {
      let button$ = $(`<button value="${variant}">${variant}</button>`);
      parent$.append(button$);

      button$.on('click', () => {
        if (this.isAnswered()) {
          return;
        }

        this.answer(variant);
      });
    });
  }
}

class SequenceQuestion extends Question {
  answer(probe: string): void {

  }

  initUI(parent$: JQuery): void {
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

  static populateLevels(parent$: JQuery) {
    if (!parent$.children().length) {
      let level = 1;
      Registry._sections.forEach((s) => {
        let section$ = $('<div class="section"></div>');
        section$.append(`<div class="title">${s}</div>`);
        let levels$ = $('<div class="levels"></div>');
        section$.append(levels$);
        let levels = Registry._sectionMap[s];
        levels.forEach((lvl) => {
          levels$.append(`<button class="level" data-level="${level}">${level}</button>`);
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

function newLevel1Question(alphabet: string): Question {
  let chars = chooseRandomly(4, alphabet);
  return new SimpleQuestion(randomChar(chars), chars.split(''));
}

Registry.register(() => { return newLevel1Question('aeimnt');  }, 'alpha');
Registry.register(() => { return newLevel1Question('dgkorsu'); }, 'alpha');
Registry.register(() => { return newLevel1Question('bcfhjlw'); }, 'alpha');
Registry.register(() => { return newLevel1Question('pqvxyz');  }, 'alpha');
