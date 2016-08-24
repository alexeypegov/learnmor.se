(function(window){
  "use strict";

  function PlayButton() {
    this.button$ = $('#play');
  }

  PlayButton.prototype.toggleReplay = function(state) {
    this.button$.toggleClass('replay', state === undefined ? true : state);
  }

  PlayButton.prototype.enable = function(enable) {
    this.button$.toggleClass('disabled', !enable);
  }

  PlayButton.prototype.isReplay = function() {
    return this.button$.hasClass('replay');
  }

  /*
   * Settings
   */
  function Settings(app) {
    this.app = app;
    this.button$ = $('#settings');
    this.button$.on('click', this.showSettings.bind(this));
    this.panel$ = $('#settingsPanel');

    var self = this;
    this.panel$.on('click', 'button', function() {
      var chosen = parseFloat($(this).data('level'));
      self.onChosen(chosen);
      return false;
    });

    this.onChosen(1);
  }

  Settings.prototype.onChosen = function(chosen) {
    var levelNumber = 1;

    for (var i = 0; i < Levels.sections.length; i++) {
      var levels = Levels.sectionMap[Levels.sections[i]];

      for (var j = 0; j < levels.length; j++) {
        if (chosen === levelNumber) {
          this.dismiss(levelNumber);
          this.app.onLevelChosen(levels[j]);
          return;
        }

        levelNumber = levelNumber + 1;
      }
    }
  }

  Settings.prototype.dismiss = function(levelNumber) {
    this.panel$.hide();
    this.button$.html(levelNumber);
  }

  Settings.prototype.showSettings = function() {
    if (!this.panel$.children().length) {
      var level = 1;
      Levels.sections.forEach(function(section) {
        var section$ = $('<div class="section"></div>');
        section$.append('<div class="title">%(t)</div>'.replace('%(t)', section));
        var levels$ = $('<div class="levels"></div>');
        section$.append(levels$);
        var levels = Levels.sectionMap[section];
        levels.forEach(function() {
          levels$.append('<button class="level" data-level="%(l)">%(t)</button>'.replace('%(l)', level).replace('%(t)', level));
          level = level + 1;
        }.bind(this));

        this.panel$.append(section$);
      }.bind(this));

    }

    this.panel$.show();
  }

  /*
   * Answers
   */

  function Answers(app) {
    this.answers$ = $('#answers');
    this.initKeyboard();
    this.app = app;
  }

  Answers.prototype.reset = function() {
    this.answers$.children().remove();
    this.answered = false;
  }

  Answers.prototype.placeAnswers = function(data) {
    this.answers$.children().remove();
    this.data = data;
    data.getVariants().forEach(function(a) {
      var button$ = $('<button value="%(v)">%(text)</button>'.replace('%(v)', a).replace('%(text)', a));
      this.answers$.append(button$);

      var self = this;
      button$.on('click', function() {
        var this$ = $(this);
        self.answer(data, this$);
      });
    }.bind(this));
  }

  Answers.prototype.isAnswered = function() {
    return this.answered;
  }

  Answers.prototype.initKeyboard = function() {
    var self = this;
    $(window).on('keypress', function(e) {
      if (!self.data) return;
      var char = String.fromCharCode(e.which);
      var result$ = self.answers$.find('button[value="%(c)"]'.replace('%(c)', char));
      if (result$.length) {
        self.answer(self.data, result$);
        e.preventDefault();
      }
    });
  }

  Answers.prototype.answer = function(question, button$) {
    if (question.hasMoreTries()) {
      if (question.answer(button$.val())) {
        button$.toggleClass('correct', true);
      } else {
        button$.toggleClass('wrong', true);
      }

      if (!question.hasMoreTries()) {
        if (!question.isGuessed()) {
          button$.parent().find('[value="%(v)"]'.replace('%(v)', question.getAnswer())).toggleClass('correct', true);
        }

        this.app.answered();
        this.answered = true;
      }
    }
  }

  function App() {
    this.playButton = new PlayButton();
    this.answers = new Answers(this);
    var self = this;

    this.playButton.button$.on('click', this.next.bind(this));

    // todo: do we need it?
    this.repeat$ = $('#repeat');
    this.repeat$.on('click', this.play.bind(this));
    this.repeat$.hide();

    $(window).on('keypress', function(e) {
      if (e.which === 32) {
        self.next();
        e.preventDefault();
      } else if (e.which === 13) {
        self.play();
        e.preventDefault();
      }
    })

    this.settings = new Settings(this);
  }

  App.prototype.play = function() {
    this.lock();
    var question = this.getQuestion();
    new Morse(20).play(question.getAnswer()).then(function() {
      if (!this.playButton.isReplay() && !this.answers.answered) {
        this.answers.placeAnswers(question);
      }

      this.playButton.toggleReplay();
      this.unlock();
    }.bind(this));
  }

  App.prototype.answered = function() {
    this.playButton.toggleReplay(false);
  }

  App.prototype.onLevelChosen = function(level) {
    this.level = level;
    this.question = null;
  }

  App.prototype.getQuestion = function() {
    if (this.question) return this.question;
    this.question = this.level.newQuestion();
    return this.question;
  }

  App.prototype.next = function() {
    if (!this.answers.answered) {
      this.play();
      return;
    }

    this.playButton.toggleReplay(false);
    this.answers.reset();
    this.question = null;

    this.play();
  }

  App.prototype.lock = function() {
    this.playButton.enable(false);
  }

  App.prototype.unlock = function() {
    this.playButton.enable(true);
  }

  App.prototype.placeAnswers = function(data) {
    this.answers.placeAnswers(data);
  }

  new App();
})(window);
