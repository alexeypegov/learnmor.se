/// <reference path="../typings/globals/jquery/index.d.ts" />

import { visibility, keyEventToString } from './browser';
import { Morse } from './morse';
import { Question, QuestionFactory, Registry } from './data';
import { Properties } from './storage';

class Button {
  protected el$: JQuery;

  constructor(selector: string) {
    this.el$ = $(selector);
  }

  set enabled(enabled: boolean) {
    this.el$.attr('aria-disabled', `${!enabled}`);
  }

  onClick(cb: (button$?: JQuery, value?: any) => void) {
    this.el$.on('click', () => {
      cb(this.el$, this.el$.val());
      return false;
    })
  }

  setText(s: string): void {
    this.el$.html(s);
  }

  set visible(visible: boolean) {
    this.el$.toggle(visible);
  }

  get visible(): boolean {
    return this.el$.is(':visible');
  }
}

class PlayButton extends Button {
  constructor() {
    super('#play');
  }

  set replay(replay: boolean) {
    this.el$.toggleClass('replay', replay);
  }
}

type FactoryListener = (factory: QuestionFactory) => void;
class Settings {
  private settingsButton: Button;
  private panel$: JQuery;
  private listener: FactoryListener;
  private level: number = 1;

  constructor() {
    this.settingsButton = new Button('#settings');
    this.settingsButton.onClick(() => this.showSettings());

    this.panel$ = $('#settingsPanel');
    this.panel$.on('click', 'button', (event) => {
      this.panel$.find('.selected').removeClass('selected');
      $(event.target).addClass('selected');
      let level = parseFloat($(event.target).data('level'));
      this.onLevelChosen(level);
    });
  }

  restore(): void {
    let level = Properties.getNumber('level', 1);
    this.onLevelChosen(level);
  }

  onLevelSelected(listener: FactoryListener): void {
    this.listener = listener;
  }

  private onLevelChosen(level: number) {
    this.panel$.hide();
    this.level = level;

    let factory = Registry.getFactory(level);
    if (this.listener && factory) {
      Properties.set('level', level);
      this.listener(factory);
    }

    this.settingsButton.setText(level.toString());
  }

  private showSettings(): void {
    Registry.populateLevels(this.panel$, this.level);
    this.panel$.show();
  }
}

class App {
  private playButton: PlayButton;
  private repeatButton: Button;
  private question: Question;
  private previousQuestion: Question;
  private factory: QuestionFactory;
  private answers$: JQuery;
  private settings: Settings;
  private morse: Morse;

  private locked: boolean = false;

  constructor() {
    this.initButtons();

    this.settings = new Settings();
    this.settings.onLevelSelected((factory) => this.onFactoryChosen(factory));

    this.answers$ = $('#answers');

    visibility((visible: boolean) => {
      if (!visible && this.morse) {
        this.morse.cancel();
        this.locked = false;
      }
    });

    document.addEventListener('keydown', (event) => this.handleKeyEvent(event));

    this.settings.restore();
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

    this.repeatButton.visible = false;
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

    this.previousQuestion = this.question;
    this.question = null;
    this.playButton.replay = false;
    this.repeatButton.visible = true;
  }

  onFactoryChosen(factory: QuestionFactory): void {
    if (this.question) {
      this.question.deinitUI(this.answers$);
    }

    this.question = null;
    this.factory = factory;
    this.playButton.replay = false;
  }

  private initButtons(): void {
    this.playButton = new PlayButton();
    this.playButton.onClick(() => {
      this.playButton.replay = true;
      this.play();
    });

    this.repeatButton = new Button('#repeat');
    this.repeatButton.onClick(() => {
      if (this.previousQuestion) {
        new Morse().play(this.previousQuestion.question);
      }
    });
  }
}

new App(); // init everything
