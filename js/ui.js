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

  data.answers.forEach(function(a) {
    var button$ = $('<button value="%(v)" data-correct="%(cl)">%(text)</button>'
      .replace('%(v)', a).replace('%(text)', a).replace('%(cl)', a === data.question ? 'true' : 'false'));
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

Answers.prototype.answer = function(data, button$) {
  this.answered = true;
  if (button$.data('correct') === true) {
    button$.toggleClass('correct', true);
  } else {
    button$.toggleClass('wrong', true);
    button$.parent().find('[data-correct="true"]').toggleClass('correct', true);
  }
}

function App() {
  this.playButton = new PlayButton();
  this.answers = new Answers();
  var self = this;
  this.playButton.button$.on('click', function() {
    self.lock();
    var data = self.getData();
    new Morse(18).play(data.question).then(function() {
      if (!self.answers.answered) {
        self.answers.placeAnswers(data);
      }

      self.unlock();
    })
  });

  var next$ = $('#next');
  next$.on('click', this.doNext.bind(this));
}

App.prototype.doNext = function() {
  this.playButton.reset();
  this.answers.reset();
  this.data = null;
}

App.prototype.lock = function() {

}

App.prototype.unlock = function() {

}

App.prototype.placeAnswers = function(data) {
  this.answers.placeAnswers(data);
}

App.prototype.getData = function() {
  if (this.data) return this.data;
  this.data = this.generateData();
  return this.data;
}

App.prototype.generateData = function() {
  var chars = this.generateRandomChars(4);
  var selected = this.randomElement(chars);
  return { answers: chars, question: selected };
}

App.prototype.generateRandomChars = function(numOfChars) {
  var chars = [];
  while (true) {
    var ndx = Math.floor(Math.random() * 26);
    var char = String.fromCharCode(97 + ndx);
    if (chars.indexOf(char) < 0) {
      chars.push(char);
    }

    if (chars.length === numOfChars) break;
  }

  return chars.sort();
}

App.prototype.randomElement = function(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

new App();
