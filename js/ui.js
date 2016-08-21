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

  this.playButton.button$.on('click', function() {
    self.lock();
    var question = self.getQuestion();
    new Morse(18).play(question.getAnswer()).then(function() {
      if (!self.answers.answered) {
        self.answers.placeAnswers(question);
      }

      self.unlock();
    })
  });

  var next$ = $('#next');
  next$.on('click', this.doNext.bind(this));
}

App.prototype.getQuestion = function() {
  if (this.question) {
    return this.question;
  }

  if (!this.data) {
    this.data = new Level1Data();
  }

  this.question = this.data.newQuestion();
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
