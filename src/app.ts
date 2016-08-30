/// <reference path="../typings/globals/jquery/index.d.ts" />

import { visibility, keyEventToString } from './browser';
import { Morse } from './morse';
import { Question, QuestionFactory, Registry } from './data';

class Button {
  protected el$: JQuery;

  constructor(selector: string) {
    this.el$ = $(selector);
  }

  public setEnabled(enabled: boolean) {
    this.el$.attr('aria-disabled', `${!enabled}`);
  }

  public onClick(cb: (button$?: JQuery, value?: any) => void) {
    this.el$.on('click', () => {
      cb(this.el$, this.el$.val());
      return false;
    })
  }

  public setText(s: string): void {
    this.el$.html(s);
  }
}

class PlayButton extends Button {
  constructor() {
    super('#play');
  }

  toggleReplay(replay: boolean): void {
    this.el$.toggleClass('replay', replay);
  }
}

type FactoryListener = (factory: QuestionFactory) => void;
class Settings {
  private settingsButton: Button;
  private panel$: JQuery;
  private listener: FactoryListener;

  constructor() {
    this.settingsButton = new Button('#settings');
    this.settingsButton.onClick(() => this.showSettings());

    this.panel$ = $('#settingsPanel');
    this.panel$.on('click', 'button', (event) => {
      let level = parseFloat($(event.target).data('level'));
      this.onLevelChosen(level);
    });
  }

  onLevelSelected(listener: FactoryListener): void {
    this.listener = listener;
  }

  private onLevelChosen(level: number) {
    this.panel$.hide();

    let factory = Registry.getFactory(level);
    if (this.listener) {
      this.listener(factory);
    }

    this.settingsButton.setText(level.toString());
  }

  private showSettings(): void {
    Registry.populateLevels(this.panel$);
    this.panel$.show();
  }
}

class App {
  playButton: PlayButton;
  question: Question;
  factory: QuestionFactory;
  answers$: JQuery;
  settings: Settings;
  morse: Morse;

  locked: boolean = false;

  constructor() {
    this.initButtons();
    // this.initKeyboard();

    this.settings = new Settings();
    this.settings.onLevelSelected((factory) => this.onFactoryChosen(factory));

    this.answers$ = $('#answers');
    this.onFactoryChosen(Registry.initial());

    visibility((visible: boolean) => {
      if (!visible && this.morse) {
        this.morse.cancel();
        this.locked = false;
      }
    });

    document.addEventListener('keydown', (event) => this.handleKeyEvent(event));
  }

  private handleKeyEvent(event: KeyboardEvent): void {
    if (this.locked) return;

    if (event.which === 32) {
      this.play();
      event.preventDefault();
      return;
    }

    let key = keyEventToString(event);
    if (this.question) {
      this.question.answer(key);
    }
  }

  private play(): void {
    if (this.locked) return;

    this.locked = true;
    let question = this.getQuestion();
    this.morse = new Morse();
    this.morse.play(question.question, (success) => {
      this.morse = null;
      this.locked = false;
    });
  }

  private getQuestion(): Question {
    if (this.question) {
      return this.question;
    }

    this.question = this.factory();
    this.question.initUI(this.answers$);
    this.question.onAnswered(() => this.onAnswered());
    return this.question;
  }

  private onAnswered() {
    // if (this.question) {
      // this.question.deinitUI(this.answers$);
    // }

    this.question = null;
    this.playButton.toggleReplay(false);
  }

  onFactoryChosen(factory: QuestionFactory): void {
    if (this.question) {
      this.question.deinitUI(this.answers$);
    }

    this.question = null;
    this.factory = factory;
    this.playButton.toggleReplay(false);
  }

  private initButtons(): void {
    this.playButton = new PlayButton();
    this.playButton.onClick(() => {
      this.playButton.toggleReplay(true);
      this.play();
    });
  }
}

new App(); // init everything
