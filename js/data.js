(function(global) {
  "use strict";

  function Question(variants, tries) {
    this.variants = variants;
    this._answer = Question.randomElement(variants);
    this.tries = tries;
    this.guessed = false;
  }

  Question.prototype.isAnswered = function() {
    return !this.hasMoreTries();
  }

  Question.prototype.hasMoreTries = function() {
    return this.tries > 0;
  }

  Question.prototype.getVariants = function() {
    return this.variants;
  }

  Question.prototype.getAnswer = function() {
    return this._answer;
  }

  Question.prototype.isGuessed = function() {
    return this.guessed;
  }

  Question.prototype.answer = function(answer) {
    if (this.hasMoreTries()) {
      this.tries = this.tries - 1;
      var ok = this._answer === answer;
      if (ok) {
        this.tries = 0;
        this.guessed = true;
      }
      return ok;
    }

    return false;
  }

  Question.randomElement = function(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function Data(numOfQuesions) {
    this.numOfQuesions = numOfQuesions;
    this.questions = [];
  }

  Data.prototype.newQuestion = function() {
    this.questions.push(this._createNewQuestion());
    return this.questions.slice(-1)[0];
  }

  Data.prototype._createNewQuestion = function() {
    throw Error('Not implemented!');
  }

  function Level1Data() {
    Data.call(this, 5);
  }

  Level1Data.prototype = Object.create(Data.prototype);
  Level1Data.prototype.constructor = Level1Data;

  Level1Data.prototype._createNewQuestion = function() {
    return new Question(Level1Data.generateRandomChars(4), 2);
  }

  Level1Data.generateRandomChars = function(numOfChars) {
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


  global.Data = Data;
  global.Level1Data = Level1Data;
})(this);
