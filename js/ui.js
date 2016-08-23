"use strict";

function PlayButton() {
  this.button$ = $('#play');

  var self = this;
  this.button$.on('click', function() {
    if (!self.button$.hasClass('replay')) {
      self.button$.addClass('replay');
    }
  });
}

PlayButton.prototype.enable = function(enable) {
  this.button$.toggleClass('disabled', !enable);
}

PlayButton.prototype.reset = function() {
  this.button$.removeClass('replay');
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

function Answers() {
  this.answers$ = $('#answers');
}

Answers.prototype.reset = function() {
  this.answers$.children().remove();
  this.answered = false;
}

Answers.prototype.placeAnswers = function(data) {
  this.answers$.children().remove();

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

      this.answered = true;
    }
  }
}

function App() {
  this.playButton = new PlayButton();
  this.answers = new Answers();
  var self = this;

  this.playButton.button$.on('click', this.play.bind(this));

  var next$ = $('#next');
  next$.on('click', this.doNext.bind(this));

  this.settings = new Settings(this);
}

App.prototype.play = function() {
  this.lock();
  var question = this.getQuestion();
  new Morse(20).play(question.getAnswer()).then(function() {
    if (!this.answers.answered) {
      this.answers.placeAnswers(question);
    }

    this.unlock();
  }.bind(this));
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

App.prototype.doNext = function() {
  this.playButton.reset();
  this.answers.reset();
  this.question = null;
}

App.prototype.lock = function() {

}

App.prototype.unlock = function() {

}

App.prototype.placeAnswers = function(data) {
  this.answers.placeAnswers(data);
}

new App();
