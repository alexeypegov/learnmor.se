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

  function Level1(chars) {
    this.chars = chars;
  }

  Level1.prototype.newQuestion = function() {
    return new Question(Level1.chooseRandomly(4, this.chars), 2);
  }

  Level1.chooseRandomly = function(howMany, chars) {
    var result = [];
    while (result.length < howMany) {
      var ndx = Math.floor(Math.random() * chars.length);
      var probe = chars[ndx];
      if (result.indexOf(probe) === -1) {
        result.push(probe);
      }
    }

    return result;
  }

  function Levels() {}

  Levels.sections = [];
  Levels.sectionMap = {};

  Levels.register = function(level, section) {
    if (!Levels.sectionMap.hasOwnProperty(section)) {
      Levels.sections.push(section);
      Levels.sectionMap[section] = [level];
    } else {
      Levels.sectionMap[section].push(level);
    }
  }

  Levels.register(new Level1(['a', 'b', 'c', 'd', 'e', 'f']), 'alphabet');
  Levels.register(new Level1(['g', 'h', 'i', 'j', 'k', 'l', 'm']), 'alphabet');
  Levels.register(new Level1(['n', 'o', 'p', 'q', 'r', 's', 't']), 'alphabet');
  Levels.register(new Level1(['u', 'v', 'w', 'x', 'y', 'z']), 'alphabet');

  global.Levels = Levels;
})(this);
