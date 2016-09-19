/// <reference path="../typings/globals/jquery/index.d.ts" />

import { visibility, keyEventToString } from './browser';
import { MorsePlayer } from './morse';
import { Question, QuestionFactory, Registry } from './data';
import { Properties } from './storage';

class Button {
  protected el$: JQuery;

  constructor(selector: string) {
    this.el$ = $(selector);
  }

  get element$() {
    return this.el$;
  }

  set enabled(enabled: boolean) {
    this.el$.attr('aria-disabled', `${!enabled}`);
  }

  get enabled() {
    return this.el$.attr('aria-disabled') !== 'true';
  }

  onClick(cb: (button$?: JQuery, value?: any) => void) {
    this.el$.on('click', () => {
      this.enabled && cb(this.el$, this.el$.val());
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
type SpeedListener = (wpm: number) => void;
class Settings {
  private settingsButton: Button;
  private panel$: JQuery;
  private levelListener: FactoryListener;
  private speedListener: SpeedListener;
  private level = 1;
  private speed = 18;

  private _initialized = false;

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

    this.panel$.on('click', '.speed', (event) => {
      let speed = parseFloat($(event.target).attr('data-speed'));
      let next: number;
      switch (speed) {
        case 18:
          next = 21;
          break;
        case 21:
          next = 25;
          break;
        case 25:
        default:
          next = 18;
          break;
      }

      this.onSpeedChosen(next);
    });
  }

  restore(): void {
    this.onLevelChosen(Properties.getNumber('level', 1));
    this.onSpeedChosen(Properties.getNumber('speed', 18));
  }

  onLevelSelected(listener: FactoryListener): void {
    this.levelListener = listener;
  }

  onSpeedSelected(listener: SpeedListener): void {
    this.speedListener = listener;
  }

  private onSpeedChosen(wpm: number): void {
    this.speed = wpm;
    let speed$ = this.panel$.find('.speed');
    speed$.html(wpm + ' WPM');
    speed$.attr('data-speed', wpm);

    Properties.set('speed', wpm);

    this.speedListener && this.speedListener(wpm);
    this.settingsButton.element$.attr('data-speed', wpm);
  }

  private onLevelChosen(level: number) {
    this.panel$.hide();
    this.level = level;

    let factory = Registry.getFactory(level);
    if (this.levelListener && factory) {
      Properties.set('level', level);
      this.levelListener(factory);
    }

    this.settingsButton.setText(level.toString());
  }

  private showSettings(): void {
    if (!this._initialized) {
      this._initialized = true;
      this.panel$.append(`<div class="header"><span class="title">Levels</span><span class="speed" data-speed="${this.speed}">${this.speed} WPM</span></div>`);
      Registry.populateLevels(this.panel$, this.level);
    }

    this.panel$.show();
  }
}

class App {
  private playButton: PlayButton;
  private repeatButton: Button;
  private question: Question;
  private factory: QuestionFactory;
  private answers$: JQuery;
  private settings: Settings;
  private player: MorsePlayer;
  private previousPlayer: MorsePlayer;
  private speed: number;

  private _locked: boolean = false;

  constructor() {
    this.initButtons();

    this.settings = new Settings();
    this.settings.onLevelSelected((factory) => this.onFactoryChosen(factory));
    this.settings.onSpeedSelected((speed) => this.onSpeedChosen(speed));

    this.answers$ = $('#answers');

    visibility((visible: boolean) => {
      if (!visible) {
        this.player && this.player.cancel();
        this.previousPlayer && this.previousPlayer.cancel();
        this.locked = false;
      }
    });

    document.addEventListener('keydown', (event) => this.handleKeyEvent(event));
    this.settings.restore();
  }

  set locked(locked: boolean) {
    this.playButton.enabled = !locked;
    this.repeatButton.enabled = !locked;

    this._locked = locked;
  }

  get locked() {
    return this._locked;
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
    this.playButton.element$.addClass('pressed');

    if (!this.question) {
      let question = this.getQuestion();
      this.player && this.player.cancel();
      this.player = MorsePlayer.create(question.question, this.speed);
    }

    this.player.play((success) => {
      this.locked = false;
      this.playButton.element$.removeClass('pressed');
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

    this.previousPlayer = this.player;
    this.question = null;
    this.playButton.replay = false;
    this.repeatButton.visible = true;
  }

  private onSpeedChosen(speed: number): void {
    this.speed = speed;

    this.question && this.question.deinitUI(this.answers$);
    this.question = null;
    this.playButton.replay = false;
  }

  private onFactoryChosen(factory: QuestionFactory): void {
    this.question && this.question.deinitUI(this.answers$);

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
      if (this.locked) return;

      this.locked = true;
      this.repeatButton.element$.addClass('pressed');
      this.previousPlayer && this.previousPlayer.play((success) => {
        this.locked = false;
        this.repeatButton.element$.removeClass('pressed');
      });
    });
  }
}

new App(); // init everything
