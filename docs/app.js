(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var browser_1 = require("./browser");
var morse_1 = require("./morse");
var data_1 = require("./data");
var storage_1 = require("./storage");
var Button = (function () {
    function Button(selector) {
        this.el$ = $(selector);
    }
    Object.defineProperty(Button.prototype, "element$", {
        get: function () {
            return this.el$;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Button.prototype, "enabled", {
        get: function () {
            return this.el$.attr('aria-disabled') !== 'true';
        },
        set: function (enabled) {
            this.el$.attr('aria-disabled', "" + !enabled);
        },
        enumerable: true,
        configurable: true
    });
    Button.prototype.onClick = function (cb) {
        var _this = this;
        this.el$.on('click', function () {
            _this.enabled && cb(_this.el$, _this.el$.val());
            return false;
        });
    };
    Button.prototype.setText = function (s) {
        this.el$.html(s);
    };
    Object.defineProperty(Button.prototype, "visible", {
        get: function () {
            return this.el$.is(':visible');
        },
        set: function (visible) {
            this.el$.toggle(visible);
        },
        enumerable: true,
        configurable: true
    });
    return Button;
}());
var PlayButton = (function (_super) {
    __extends(PlayButton, _super);
    function PlayButton() {
        return _super.call(this, '#play') || this;
    }
    Object.defineProperty(PlayButton.prototype, "replay", {
        set: function (replay) {
            this.el$.toggleClass('replay', replay);
        },
        enumerable: true,
        configurable: true
    });
    return PlayButton;
}(Button));
var Settings = (function () {
    function Settings() {
        var _this = this;
        this._initialized = false;
        this.settingsButton = new Button('#settings');
        this.settingsButton.onClick(function () { return _this.showSettings(); });
        this.panel$ = $('#settingsPanel');
        this.panel$.on('click', 'button', function (event) {
            _this.panel$.find('.selected').removeClass('selected');
            $(event.target).addClass('selected');
            var level = parseFloat($(event.target).data('level'));
            _this.onLevelChosen(level);
        });
        this.panel$.on('click', '.speed', function (event) {
            var tempo = $(event.target).attr('data-tempo');
            var next;
            switch (tempo) {
                case 'adagio':
                    next = 'moderato';
                    break;
                case 'moderato':
                    next = 'presto';
                    break;
                case 'presto':
                default:
                    next = 'adagio';
                    break;
            }
            _this.onSpeedChosen(next);
        });
    }
    Settings.prototype.restore = function () {
        this.onLevelChosen(storage_1.Properties.getNumber('level', 1));
        this.onSpeedChosen(storage_1.Properties.getString('tempo', 'adagio'));
    };
    Settings.prototype.onLevelSelected = function (listener) {
        this.levelListener = listener;
    };
    Settings.prototype.onWpmSelected = function (listener) {
        this.wpmListener = listener;
    };
    Settings.getWpm = function (tempo) {
        switch (tempo) {
            case 'presto': return 25;
            case 'moderato': return 21;
            case 'adagio':
            default: return 18;
        }
    };
    Settings.prototype.onSpeedChosen = function (tempo) {
        this.tempo = tempo;
        var speed$ = this.panel$.find('.speed');
        storage_1.Properties.set('tempo', tempo);
        speed$.attr('data-tempo', tempo);
        this.panel$.attr('data-tempo', tempo);
        this.settingsButton.element$.attr('data-tempo', tempo);
        var wpm = Settings.getWpm(tempo);
        speed$.html(wpm + ' WPM');
        this.wpmListener && this.wpmListener(wpm);
    };
    Settings.prototype.onLevelChosen = function (level) {
        this.level = level;
        this.panel$.hide();
        var factory = data_1.Registry.getFactory(level);
        if (this.levelListener && factory) {
            storage_1.Properties.set('level', level);
            this.levelListener(factory);
        }
        this.settingsButton.setText(level.toString());
    };
    Settings.prototype.showSettings = function () {
        if (!this._initialized) {
            this._initialized = true;
            this.panel$.append("<div class=\"header\"><span class=\"title\">Levels</span><span class=\"speed\" data-tempo=\"" + this.tempo + "\">" + Settings.getWpm(this.tempo) + " WPM</span></div>");
            data_1.Registry.populateLevels(this.panel$, this.level);
        }
        this.panel$.show();
    };
    return Settings;
}());
var App = (function () {
    function App() {
        var _this = this;
        this._locked = false;
        this.initButtons();
        this.settings = new Settings();
        this.settings.onLevelSelected(function (factory) { return _this.onFactoryChosen(factory); });
        this.settings.onWpmSelected(function (wpm) { return _this.onWpmChosen(wpm); });
        this.answers$ = $('#answers');
        browser_1.visibility(function (visible) {
            if (!visible) {
                _this.player && _this.player.cancel();
                _this.previousPlayer && _this.previousPlayer.cancel();
                _this.locked = false;
            }
        });
        document.addEventListener('keydown', function (event) { return _this.handleKeyEvent(event); });
        this.settings.restore();
    }
    Object.defineProperty(App.prototype, "locked", {
        get: function () {
            return this._locked;
        },
        set: function (locked) {
            this.playButton.enabled = !locked;
            this.repeatButton.enabled = !locked;
            this._locked = locked;
        },
        enumerable: true,
        configurable: true
    });
    App.prototype.handleKeyEvent = function (event) {
        if (this.locked)
            return;
        if (event.which === 32) {
            this.play();
            event.preventDefault();
            return;
        }
        var key = browser_1.keyEventToString(event);
        if (this.question) {
            this.question.answer(key);
        }
    };
    App.prototype.play = function () {
        var _this = this;
        if (this.locked)
            return;
        this.repeatButton.visible = false;
        this.locked = true;
        this.playButton.element$.addClass('pressed');
        if (!this.question) {
            var question = this.getQuestion();
            this.player && this.player.cancel();
            this.player = morse_1.MorsePlayer.create(question.question, this.wpm);
        }
        this.player.play(function (success) {
            _this.locked = false;
            _this.playButton.element$.removeClass('pressed');
        });
    };
    App.prototype.getQuestion = function () {
        var _this = this;
        if (this.question) {
            return this.question;
        }
        this.question = this.factory();
        this.question.initUI(this.answers$);
        this.question.onAnswered(function () { return _this.onAnswered(); });
        return this.question;
    };
    App.prototype.onAnswered = function () {
        this.previousPlayer = this.player;
        this.question = undefined;
        this.playButton.replay = false;
        this.repeatButton.visible = true;
    };
    App.prototype.onWpmChosen = function (wpm) {
        this.wpm = wpm;
        this.question && this.question.deinitUI(this.answers$);
        this.question = undefined;
        this.playButton.replay = false;
    };
    App.prototype.onFactoryChosen = function (factory) {
        this.question && this.question.deinitUI(this.answers$);
        this.question = undefined;
        this.factory = factory;
        this.playButton.replay = false;
    };
    App.prototype.initButtons = function () {
        var _this = this;
        this.playButton = new PlayButton();
        this.playButton.onClick(function () {
            _this.playButton.replay = true;
            _this.play();
        });
        this.repeatButton = new Button('#repeat');
        this.repeatButton.onClick(function () {
            if (_this.locked)
                return;
            _this.locked = true;
            _this.repeatButton.element$.addClass('pressed');
            _this.previousPlayer && _this.previousPlayer.play(function (success) {
                _this.locked = false;
                _this.repeatButton.element$.removeClass('pressed');
            });
        });
    };
    return App;
}());
new App();

},{"./browser":2,"./data":3,"./morse":4,"./storage":5}],2:[function(require,module,exports){
Object.defineProperty(exports, "__esModule", { value: true });
function visibility(listener) {
    var props = {
        hidden: 'visibilitychange',
        webkitHidden: 'webkitvisibilitychange',
        mozHidden: 'mozvisibilitychange',
        msHidden: 'msvisibilitychange'
    };
    var eventKey;
    var stateKey;
    for (stateKey in props) {
        if (stateKey in document) {
            eventKey = props[stateKey];
            break;
        }
    }
    if (listener && eventKey) {
        document.addEventListener(eventKey, function (event) {
            listener(!event.target[stateKey]);
        });
    }
    return !document[stateKey];
}
exports.visibility = visibility;
function keyEventToString(event) {
    var result = '';
    var append = function (flag, name, buffer) { return buffer.length ? buffer + (flag ? ' ' + name : '') : (flag ? name : ''); };
    result = append(event.metaKey, 'META', result);
    result = append(event.ctrlKey, 'CTRL', result);
    result = append(event.altKey, 'ALT', result);
    result = append(event.shiftKey, 'SHIFT', result);
    var char = String.fromCharCode(event.keyCode);
    if (char) {
        result += (result.length ? ' ' : '') + char.toLowerCase();
    }
    return result;
}
exports.keyEventToString = keyEventToString;

},{}],3:[function(require,module,exports){
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Question = (function () {
    function Question(_question, _variants) {
        this._question = _question;
        this._variants = _variants;
        this.MAX_TRY_COUNT = 2;
        this._answered = false;
        this._guessed = false;
        this._tryCount = 0;
        this._listeners = [];
    }
    Question.prototype.hasMoreTries = function () {
        return this._tryCount < this.MAX_TRY_COUNT;
    };
    Question.prototype.nextTry = function () {
        this._tryCount = this._tryCount + 1;
    };
    Object.defineProperty(Question.prototype, "answered", {
        get: function () {
            return this._answered;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Question.prototype, "guessed", {
        get: function () {
            return this._guessed;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Question.prototype, "question", {
        get: function () {
            return this._question;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Question.prototype, "variants", {
        get: function () {
            return this._variants;
        },
        enumerable: true,
        configurable: true
    });
    Question.prototype.deinitUI = function (parent$) {
        parent$.children().remove();
    };
    Question.prototype.onAnswered = function (cb) {
        this._listeners.push(cb);
    };
    Question.prototype.fireAnswered = function () {
        this._listeners.forEach(function (listener) {
            listener();
        });
        this._listeners = [];
    };
    return Question;
}());
exports.Question = Question;
var SequenceQuestion = (function (_super) {
    __extends(SequenceQuestion, _super);
    function SequenceQuestion(question, variants) {
        return _super.call(this, question, variants) || this;
    }
    SequenceQuestion.prototype.checkValid = function (probe) {
        return !this.answered && this.variants.indexOf(probe) >= 0;
    };
    SequenceQuestion.prototype.answer = function (probe) {
        if (!this.checkValid(probe))
            return;
        if (this.buffer && this.buffer.length === this.question.length) {
            this.buffer = '';
        }
        this.buffer = this.buffer ? this.buffer + probe : probe;
        if (this.buffer.length === this.question.length) {
            this.nextTry();
            var correct = this.buffer === this.question;
            var hasMoreTries = this.hasMoreTries();
            if (correct || !hasMoreTries) {
                this._guessed = correct;
                this._answered = correct || !hasMoreTries;
                this.fireAnswered();
            }
        }
        this.updateUI();
    };
    SequenceQuestion.prototype.updateUI = function () {
        var _this = this;
        var input$ = this.parent$.find('.input');
        this.question.split('').forEach(function (c, i) {
            var char$ = input$.find(".char:nth-child(" + (i + 1) + ")");
            if (i < _this.buffer.length) {
                char$.text(_this.buffer[i]);
                char$.data('value', _this.buffer[i]);
            }
            else {
                char$.html('&nbsp;');
                char$.data('value', null);
            }
        });
        if (this.buffer.length === this.question.length) {
            input$.removeClass('correct wrong');
            input$.toggleClass(this.guessed ? 'correct' : 'wrong');
            if (this.answered) {
                this.question.split('').forEach(function (c, i) {
                    var char$ = input$.find(".char:nth-child(" + (i + 1) + ")");
                    if (c !== _this.buffer[i]) {
                        char$.attr('data-correct', c);
                    }
                    else {
                        char$.toggleClass('correct', true);
                    }
                });
            }
            return;
        }
        input$.removeClass('correct wrong');
    };
    SequenceQuestion.prototype.initUI = function (parent$) {
        this.parent$ = parent$;
        parent$.children().remove();
        this.initInput(parent$);
        this.initKeyboard(parent$);
    };
    SequenceQuestion.prototype.initInput = function (parent$) {
        var input$ = $('<div class="input"></div>');
        this.question.split('').forEach(function (c) {
            input$.append('<div class="char">&nbsp;</div>');
        });
        parent$.append(input$);
    };
    SequenceQuestion.prototype.initKeyboard = function (parent$) {
        var _this = this;
        var keyboard$ = $('<div class="keyboard"></div>');
        this.variants.forEach(function (key) {
            keyboard$.append("<div class=\"key\" data-value=\"" + key + "\">" + key + "</div>");
        });
        keyboard$.on('click', '.key', function (event) {
            var key$ = $(event.target);
            var key = '' + key$.data('value');
            _this.answer(key);
        });
        parent$.append(keyboard$);
    };
    return SequenceQuestion;
}(Question));
var Registry = (function () {
    function Registry() {
    }
    Registry.register = function (factory, section) {
        if (!Registry._sectionMap.hasOwnProperty(section)) {
            Registry._sections.push(section);
            Registry._sectionMap[section] = [factory];
        }
        else {
            Registry._sectionMap[section].push(factory);
        }
    };
    Registry.populateLevels = function (parent$, selected) {
        if (selected === void 0) { selected = 1; }
        var level = 1;
        Registry._sections.forEach(function (s) {
            var section$ = $('<div class="section"></div>');
            section$.append("<div class=\"title\">" + s + "</div>");
            var levels$ = $('<div class="levels"></div>');
            section$.append(levels$);
            var levels = Registry._sectionMap[s];
            levels.forEach(function (lvl) {
                var level$ = $("<button class=\"level\" data-level=\"" + level + "\">" + level + "</button>");
                level$.toggleClass('selected', selected === level);
                levels$.append(level$);
                level = level + 1;
            });
            parent$.append(section$);
        });
    };
    Registry.getFactory = function (level) {
        var currentLevel = 1;
        for (var i = 0; i < Registry._sections.length; i++) {
            var section = Registry._sections[i];
            var factories = Registry._sectionMap[section];
            for (var i_1 = 0; i_1 < factories.length; i_1++) {
                var factory = factories[i_1];
                if (currentLevel === level) {
                    return factory;
                }
                currentLevel = currentLevel + 1;
            }
        }
        return undefined;
    };
    Registry.initial = function () {
        return this._sectionMap[this._sections[0]][0];
    };
    return Registry;
}());
Registry._sections = [];
Registry._sectionMap = {};
exports.Registry = Registry;
var QuestionChooser = (function () {
    function QuestionChooser(alphabet, numOfChars, numOfKeys) {
        this.alphabet = alphabet;
        this.numOfChars = numOfChars;
        this.numOfKeys = numOfKeys;
        this.answerMap = {};
        for (var i = 0; i < alphabet.length; i++) {
            this.answerMap[alphabet[i]] = 0;
        }
    }
    QuestionChooser.prototype.answer = function (question, points) {
        if (points === 0)
            return;
        for (var i = 0; i < question.length; i++) {
            this.answerMap[question[i]] = this.answerMap[question[i]] + points;
        }
    };
    QuestionChooser.prototype.generateNewQuestion = function () {
        var _this = this;
        var result = '';
        for (var i = 0; i < this.numOfChars; i++) {
            while (true) {
                var _a = this.probe(), c = _a[0], x = _a[1];
                var char = this.alphabet[c];
                if (this.answerMap[char] <= x && result.indexOf(char) === -1) {
                    result += char;
                    break;
                }
                if (result.length === this.numOfChars) {
                    break;
                }
            }
        }
        var question = new SequenceQuestion(result, this.buildKeys(result, this.numOfKeys));
        question.onAnswered(function () { return _this.answer(question.question, question.guessed ? question.hasMoreTries() ? 2 : 1 : 0); });
        return question;
    };
    QuestionChooser.prototype.probe = function () {
        var _this = this;
        var n = this.alphabet.length;
        var vals = Object.keys(this.answerMap).map(function (k) { return _this.answerMap[k]; });
        var max = Math.max.apply(null, vals);
        var min = Math.min.apply(null, vals);
        return [QuestionChooser.rand(0, n), QuestionChooser.rand(min, max + 1)];
    };
    QuestionChooser.prototype.buildKeys = function (question, numOfKeys) {
        var variants = question;
        while (true) {
            if (variants.length === numOfKeys) {
                break;
            }
            var probe = this.alphabet[QuestionChooser.rand(0, this.alphabet.length)];
            if (variants.indexOf(probe) === -1) {
                variants = variants + probe;
            }
        }
        return variants.split('').sort();
    };
    QuestionChooser.rand = function (min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    };
    return QuestionChooser;
}());
exports.QuestionChooser = QuestionChooser;
function sequenceQuestion(alphabet, numOfChars, numOfKeys) {
    var chooser = new QuestionChooser(alphabet, numOfChars, numOfKeys);
    return function () { return chooser.generateNewQuestion(); };
}
Registry.register(sequenceQuestion('aeimnt', 1, 4), 'alpha 1');
Registry.register(sequenceQuestion('dgkorsu', 1, 4), 'alpha 1');
Registry.register(sequenceQuestion('aeimntdgkorsu', 2, 8), 'alpha 1');
Registry.register(sequenceQuestion('bcfhjlw', 1, 4), 'alpha 2');
Registry.register(sequenceQuestion('pqvxyz', 1, 4), 'alpha 2');
Registry.register(sequenceQuestion('bcfhjlwpqvxyz', 2, 8), 'alpha 2');
Registry.register(sequenceQuestion('aeimntdgkorsubcfhjlwpqvxyz', 2, 8), 'alpha 3');
Registry.register(sequenceQuestion('aeimntdgkorsubcfhjlwpqvxyz', 3, 8), 'alpha 3');
Registry.register(sequenceQuestion('01234', 1, 4), 'digits');
Registry.register(sequenceQuestion('56789', 1, 4), 'digits');
Registry.register(sequenceQuestion('123456789', 2, 8), 'digits');
Registry.register(sequenceQuestion('0123456789aeimntdgkorsubcfhjlwpqvxyz', 2, 8), 'alpha & digits');
Registry.register(sequenceQuestion('0123456789aeimntdgkorsubcfhjlwpqvxyz', 4, 12), 'alpha & digits');

},{}],4:[function(require,module,exports){
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var wav_1 = require("./wav");
var ALPHABET = {
    'a': '.-', 'b': '-...', 'c': '-.-.', 'd': '-..', 'e': '.', 'f': '..-.', 'g': '--.', 'h': '....',
    'i': '..', 'j': '.---', 'k': '-.-', 'l': '.-..', 'm': '--', 'n': '-.', 'o': '---', 'p': '.--.',
    'q': '--.-', 'r': '.-.', 's': '...', 't': '-', 'u': '..-', 'v': '...-', 'w': '.--', 'x': '-..-',
    'y': '-.--', 'z': '--..',
    '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
    '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----',
    '.': '._._._', ',': '__..__', '?': '..__..', '\'': '.____.',
    '/': '_.._.', '(': '_.__.', ')': '_.__._', '&': '._...',
    ':': '___...', ';': '_._._.', '=': '_..._', '+': '._._.',
    '-': '_...._', '_': '..__._', '"': '._.._.', '$': '..._.._',
    '!': '_._.__', '@': '.__._.',
    ' ': ' '
};
var SPACE = ' ';
var DASH = '-';
var MorsePlayer = (function () {
    function MorsePlayer() {
    }
    MorsePlayer.prototype.cancel = function () { };
    MorsePlayer.create = function (text, wpm, frequency) {
        if (wpm === void 0) { wpm = 20; }
        if (frequency === void 0) { frequency = 840; }
        var builder = new MorseBuilder(wpm);
        for (var i = 0; i < text.length; i++) {
            builder.append(text[i]);
        }
        var start = builder.build();
        var player = wav_1.WavGen.supported ? new WavPlayer(frequency, start) : new WebAudioApiPlayer(frequency, start);
        return player;
    };
    return MorsePlayer;
}());
exports.MorsePlayer = MorsePlayer;
var WebAudioApiPlayer = (function (_super) {
    __extends(WebAudioApiPlayer, _super);
    function WebAudioApiPlayer(frequency, start) {
        var _this = _super.call(this) || this;
        _this.frequency = frequency;
        _this.start = start;
        return _this;
    }
    WebAudioApiPlayer.prototype.play = function (cb) {
        var _this = this;
        this.signal = new Signal(this.frequency);
        setTimeout(function () {
            _this.start.play(_this.frequency, _this.signal, function (success) {
                _this.signal.stop();
                _this.signal = undefined;
                cb && cb(success);
            });
        }, 30);
    };
    WebAudioApiPlayer.prototype.cancel = function () {
        this.signal && this.signal.stop();
    };
    return WebAudioApiPlayer;
}(MorsePlayer));
var WavPlayer = (function (_super) {
    __extends(WavPlayer, _super);
    function WavPlayer(frequency, start) {
        var _this = _super.call(this) || this;
        _this._listeners = [];
        var wav = new wav_1.WavGen(frequency);
        var tone = start;
        while (true) {
            wav.append(tone.duration, tone.silent);
            tone = tone.next;
            if (!tone)
                break;
        }
        _this.audio = new Audio();
        _this.audio.src = wav.build();
        return _this;
    }
    WavPlayer.prototype.play = function (cb) {
        var _this = this;
        this._listeners.forEach(function (l) { return _this.audio.removeEventListener('ended', l); });
        this._listeners = [];
        var listener = function () { return cb && cb(true); };
        this._listeners.push(listener);
        this.audio.addEventListener('ended', listener);
        this.audio.play();
    };
    return WavPlayer;
}(MorsePlayer));
var ToneType;
(function (ToneType) {
    ToneType[ToneType["DOT"] = 0] = "DOT";
    ToneType[ToneType["DASH"] = 1] = "DASH";
    ToneType[ToneType["WORD_SEP"] = 2] = "WORD_SEP";
    ToneType[ToneType["TONE_SEP"] = 3] = "TONE_SEP";
    ToneType[ToneType["LETTER_SEP"] = 4] = "LETTER_SEP";
})(ToneType || (ToneType = {}));
var MorseBuilder = (function () {
    function MorseBuilder(wpm) {
        this.dotDuration = MorseBuilder.getDotDuration(wpm);
    }
    MorseBuilder.prototype.createTone = function (type) {
        var coeff;
        var off;
        switch (type) {
            case ToneType.DOT:
                _a = [1, false], coeff = _a[0], off = _a[1];
                break;
            case ToneType.DASH:
                _b = [3, false], coeff = _b[0], off = _b[1];
                break;
            case ToneType.WORD_SEP:
                _c = [7, true], coeff = _c[0], off = _c[1];
                break;
            case ToneType.TONE_SEP:
                _d = [1, true], coeff = _d[0], off = _d[1];
                break;
            case ToneType.LETTER_SEP:
                _e = [3, true], coeff = _e[0], off = _e[1];
                break;
            default:
                throw Error("Unknown tone type: " + type + "!");
        }
        return new Tone(this.dotDuration * coeff, off);
        var _a, _b, _c, _d, _e;
    };
    MorseBuilder.prototype.append = function (char) {
        var toneSeq = ALPHABET[char];
        if (!toneSeq) {
            throw Error("Unknown char: \"" + char + "!\"");
        }
        if (toneSeq === SPACE) {
            this.current = this.current.append(this.createTone(ToneType.WORD_SEP));
        }
        else {
            for (var i = 0; i < toneSeq.length; i++) {
                var toneChar = toneSeq[i];
                if (this.prevChar && this.prevChar !== SPACE) {
                    this.current = this.current.append(this.createTone(ToneType.LETTER_SEP));
                }
                var tone = this.createTone(toneChar === DASH ? ToneType.DASH : ToneType.DOT);
                if (!this.start) {
                    this.start = this.createTone(ToneType.LETTER_SEP);
                    this.start.append(tone);
                }
                if (this.current) {
                    this.current = this.current.append(tone);
                }
                else {
                    this.current = tone;
                }
                if (i < toneSeq.length - 1) {
                    this.current = this.current.append(this.createTone(ToneType.TONE_SEP));
                }
            }
        }
        this.prevChar = char;
    };
    MorseBuilder.prototype.build = function () {
        this.current.append(this.createTone(ToneType.LETTER_SEP));
        return this.start;
    };
    MorseBuilder.getDotDuration = function (wpm) {
        return Math.round(1200 / wpm);
    };
    return MorseBuilder;
}());
var Signal = (function () {
    function Signal(frequency) {
        this.frequency = frequency;
        this._on = false;
        this._stopped = false;
        if (!Signal.ctx) {
            Signal.ctx = new (webkitAudioContext || AudioContext)();
        }
        this.oscillator = Signal.ctx.createOscillator();
        this.oscillator.type = 'sine';
        this.oscillator.frequency.value = frequency;
        this.volume = Signal.ctx.createGain();
        this.oscillator.connect(this.volume);
        this.volume.connect(Signal.ctx.destination);
        this.volume.gain.value = 0;
        this.oscillator.start();
    }
    Object.defineProperty(Signal, "supported", {
        get: function () {
            return webkitAudioContext || AudioContext;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Signal.prototype, "stopped", {
        get: function () {
            return this._stopped;
        },
        enumerable: true,
        configurable: true
    });
    Signal.prototype.on = function () {
        if (!this._on && !this._stopped) {
            this._on = true;
            this.setVolume(1);
        }
    };
    Signal.prototype.setVolume = function (volume) {
        var now = Signal.ctx.currentTime;
        this.volume.gain.cancelScheduledValues(now);
        this.volume.gain.setValueAtTime(this.volume.gain.value, now);
        this.volume.gain.linearRampToValueAtTime(volume, now + 0.015);
    };
    Signal.prototype.off = function () {
        if (this._on) {
            this._on = false;
            this.setVolume(0);
        }
    };
    Signal.prototype.stop = function () {
        var _this = this;
        if (this.stopped) {
            return;
        }
        this.off();
        this._stopped = true;
        setTimeout(function () { return _this.oscillator.stop(); }, 30);
    };
    return Signal;
}());
var Tone = (function () {
    function Tone(duration, silent) {
        if (silent === void 0) { silent = false; }
        this.duration = duration;
        this.silent = silent;
    }
    Tone.prototype.append = function (tone) {
        this._next = tone;
        return tone;
    };
    Object.defineProperty(Tone.prototype, "next", {
        get: function () {
            return this._next;
        },
        enumerable: true,
        configurable: true
    });
    Tone.prototype.toString = function () {
        return "" + (this.silent ? '-' : '+') + this.duration + " " + (this.next && this.next.toString() || '');
    };
    Tone.prototype.play = function (frequency, signal, onFinished) {
        var _this = this;
        if (signal.stopped) {
            return;
        }
        if (!this.silent) {
            signal.on();
        }
        setTimeout(function () {
            if (!_this.silent) {
                signal.off();
            }
            if (_this.next) {
                _this.next.play(frequency, signal, onFinished);
            }
            else {
                signal.stop();
                onFinished(true);
            }
        }, this.duration);
    };
    return Tone;
}());

},{"./wav":6}],5:[function(require,module,exports){
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var MockStorage = (function (_super) {
    __extends(MockStorage, _super);
    function MockStorage() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MockStorage.prototype.getItem = function (key) {
        return null;
    };
    MockStorage.prototype.setItem = function (key, value) { };
    MockStorage.prototype.removeItem = function (key) { };
    MockStorage.prototype.clear = function () { };
    return MockStorage;
}(Storage));
var Properties = (function () {
    function Properties() {
    }
    Properties.hasLocalStorage = function () {
        return 'localStorage' in window && window['localStorage'] !== undefined;
    };
    Properties.set = function (key, value) {
        Properties._storage.setItem(key, value.toString());
    };
    Properties.get = function (key) {
        return Properties._storage.getItem(key);
    };
    Properties.getString = function (key, defaultValue) {
        if (defaultValue === void 0) { defaultValue = ''; }
        return Properties.get(key) || defaultValue;
    };
    Properties.getNumber = function (key, defaultValue) {
        if (defaultValue === void 0) { defaultValue = -1; }
        var s = Properties.get(key);
        if (!s)
            return defaultValue;
        var n = Number(s);
        return isNaN(n) ? defaultValue : n;
    };
    Properties.remove = function (key) {
        var v = Properties.get(key);
        Properties._storage.removeItem(key);
        return v;
    };
    return Properties;
}());
Properties._storage = Properties.hasLocalStorage() ? window.localStorage : new MockStorage();
exports.Properties = Properties;

},{}],6:[function(require,module,exports){
Object.defineProperty(exports, "__esModule", { value: true });
var Pcm = (function () {
    function Pcm(frequency, volume) {
        if (volume === void 0) { volume = 1; }
        this.frequency = frequency;
        this.volume = volume;
        this._data = [];
    }
    Pcm.prototype.append = function (duration, silence) {
        if (silence === void 0) { silence = false; }
        var key = "" + (silence ? '-' : '+') + duration;
        if (Pcm._cache.hasOwnProperty(key)) {
            this._data = this._data.concat(Pcm._cache[key]);
            return this;
        }
        var cycle = 44100 / this.frequency;
        var samples = Math.floor((duration / 1000) * 44100);
        var temp = [];
        if (silence) {
            temp = Array.apply(null, Array(samples)).map(Number.prototype.valueOf, 0);
        }
        else {
            var coeff = 2 * Math.PI;
            for (var i = 0; i < samples; i++) {
                temp.push(Math.sin(coeff * i / cycle));
            }
            var c = void 0;
            for (var i = 0; i < Math.min(200, samples); i++) {
                c = i * 100 / 20000;
                temp[i] = temp[i] * c;
                var endNdx = samples - i - 1;
                temp[endNdx] = temp[endNdx] * c;
            }
        }
        Pcm._cache[key] = temp;
        this._data = this._data.concat(temp);
        return this;
    };
    Object.defineProperty(Pcm.prototype, "data", {
        get: function () {
            return this._data;
        },
        enumerable: true,
        configurable: true
    });
    return Pcm;
}());
Pcm._cache = {};
var WavGen = (function () {
    function WavGen(frequency, volume) {
        if (frequency === void 0) { frequency = 680; }
        if (volume === void 0) { volume = 1; }
        this.pcm = new Pcm(frequency, volume);
    }
    Object.defineProperty(WavGen, "supported", {
        get: function () {
            return typeof btoa === 'function' && document.location.search.indexOf('html5') < 0 && document.createElement('audio').canPlayType('audio/wav') !== '';
        },
        enumerable: true,
        configurable: true
    });
    WavGen.prototype.append = function (duration, silence) {
        if (silence === void 0) { silence = false; }
        this.pcm.append(duration, silence);
        return this;
    };
    WavGen.prototype.build = function () {
        var data = this.pcm.data;
        return this.array2dataURI(data);
    };
    WavGen.prototype.pcm2wav = function (pcm, sampleRate, bitn) {
        var i32 = this.i32toString;
        var i16 = this.i16toString;
        var ret = 'RIFF' +
            i32(36 + pcm.length) +
            'WAVE' +
            'fmt ' +
            i32(16) +
            i16(1) +
            i16(1) +
            i32(sampleRate) +
            i32(sampleRate * bitn / 8) +
            i16(bitn / 8) +
            i16(bitn) +
            'data' +
            i32(pcm.length) +
            pcm;
        return ret;
    };
    ;
    WavGen.prototype.array2dataURI = function (array, sampleRate, bitsPerSample) {
        if (sampleRate === void 0) { sampleRate = 44100; }
        if (bitsPerSample === void 0) { bitsPerSample = 16; }
        return 'data:audio/wav;base64,' +
            btoa(this.pcm2wav(this.array2bytestream(array, bitsPerSample), sampleRate, bitsPerSample));
    };
    ;
    WavGen.prototype.i16toString = function (n) {
        var n1 = n & (65536 - 1);
        return String.fromCharCode(n1 & 255) + String.fromCharCode((n1 >> 8) & 255);
    };
    WavGen.prototype.i32toString = function (n) {
        var n1 = n & (65536 * 65536 - 1);
        return String.fromCharCode(n1 & 255) + String.fromCharCode((n1 >> 8) & 255) +
            String.fromCharCode((n1 >> 16) & 255) + String.fromCharCode((n1 >> 24) & 255);
    };
    WavGen.prototype.array2bytestream = function (x, bitn) {
        var ret = '';
        var c = String.fromCharCode;
        var r = Math.round;
        var n = x.length;
        var y;
        if (bitn === 8) {
            for (var i = 0; i < n; ++i) {
                y = r(x[i] * 127 + 128) & 255;
                ret += c(y);
            }
        }
        else {
            for (var i = 0; i < n; ++i) {
                y = r(x[i] * 32767) & 65535;
                ret += c((y >> 0) & 255) + c((y >> 8) & 255);
            }
        }
        return ret;
    };
    return WavGen;
}());
exports.WavGen = WavGen;

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYXBwLnRzIiwic3JjL2Jyb3dzZXIudHMiLCJzcmMvZGF0YS50cyIsInNyYy9tb3JzZS50cyIsInNyYy9zdG9yYWdlLnRzIiwic3JjL3dhdi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7O0FDQUEscUNBQXlEO0FBQ3pELGlDQUFzQztBQUN0QywrQkFBNkQ7QUFDN0QscUNBQXVDO0FBRXZDO0lBR0UsZ0JBQVksUUFBZ0I7UUFDMUIsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUVELHNCQUFJLDRCQUFRO2FBQVo7WUFDRSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUNsQixDQUFDOzs7T0FBQTtJQUVELHNCQUFJLDJCQUFPO2FBSVg7WUFDRSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssTUFBTSxDQUFDO1FBQ25ELENBQUM7YUFORCxVQUFZLE9BQWdCO1lBQzFCLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxLQUFHLENBQUMsT0FBUyxDQUFDLENBQUM7UUFDaEQsQ0FBQzs7O09BQUE7SUFNRCx3QkFBTyxHQUFQLFVBQVEsRUFBMkM7UUFBbkQsaUJBS0M7UUFKQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUU7WUFDbkIsS0FBSSxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsS0FBSSxDQUFDLEdBQUcsRUFBRSxLQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFDN0MsTUFBTSxDQUFDLEtBQUssQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFBO0lBQ0osQ0FBQztJQUVELHdCQUFPLEdBQVAsVUFBUSxDQUFTO1FBQ2YsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJ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LENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQy9DLENBQUM7UUFDSCxDQUFDO1FBRUQsTUFBTSxDQUFDLEdBQUcsQ0FBQztJQUNiLENBQUM7SUFDSCxhQUFDO0FBQUQsQ0FoRkEsQUFnRkMsSUFBQTtBQWhGWSx3QkFBTSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpbXBvcnQgeyB2aXNpYmlsaXR5LCBrZXlFdmVudFRvU3RyaW5nIH0gZnJvbSAnLi9icm93c2VyJztcbmltcG9ydCB7IE1vcnNlUGxheWVyIH0gZnJvbSAnLi9tb3JzZSc7XG5pbXBvcnQgeyBRdWVzdGlvbiwgUXVlc3Rpb25GYWN0b3J5LCBSZWdpc3RyeSB9IGZyb20gJy4vZGF0YSc7XG5pbXBvcnQgeyBQcm9wZXJ0aWVzIH0gZnJvbSAnLi9zdG9yYWdlJztcblxuY2xhc3MgQnV0dG9uIHtcbiAgcHJvdGVjdGVkIGVsJDogSlF1ZXJ5O1xuXG4gIGNvbnN0cnVjdG9yKHNlbGVjdG9yOiBzdHJpbmcpIHtcbiAgICB0aGlzLmVsJCA9ICQoc2VsZWN0b3IpO1xuICB9XG5cbiAgZ2V0IGVsZW1lbnQkKCkge1xuICAgIHJldHVybiB0aGlzLmVsJDtcbiAgfVxuXG4gIHNldCBlbmFibGVkKGVuYWJsZWQ6IGJvb2xlYW4pIHtcbiAgICB0aGlzLmVsJC5hdHRyKCdhcmlhLWRpc2FibGVkJywgYCR7IWVuYWJsZWR9YCk7XG4gIH1cblxuICBnZXQgZW5hYmxlZCgpIHtcbiAgICByZXR1cm4gdGhpcy5lbCQuYXR0cignYXJpYS1kaXNhYmxlZCcpICE9PSAndHJ1ZSc7XG4gIH1cblxuICBvbkNsaWNrKGNiOiAoYnV0dG9uJD86IEpRdWVyeSwgdmFsdWU/OiBhbnkpID0+IHZvaWQpIHtcbiAgICB0aGlzLmVsJC5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLmVuYWJsZWQgJiYgY2IodGhpcy5lbCQsIHRoaXMuZWwkLnZhbCgpKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KVxuICB9XG5cbiAgc2V0VGV4dChzOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLmVsJC5odG1sKHMpO1xuICB9XG5cbiAgc2V0IHZpc2libGUodmlzaWJsZTogYm9vbGVhbikge1xuICAgIHRoaXMuZWwkLnRvZ2dsZSh2aXNpYmxlKTtcbiAgfVxuXG4gIGdldCB2aXNpYmxlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmVsJC5pcygnOnZpc2libGUnKTtcbiAgfVxufVxuXG5jbGFzcyBQbGF5QnV0dG9uIGV4dGVuZHMgQnV0dG9uIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoJyNwbGF5Jyk7XG4gIH1cblxuICBzZXQgcmVwbGF5KHJlcGxheTogYm9vbGVhbikge1xuICAgIHRoaXMuZWwkLnRvZ2dsZUNsYXNzKCdyZXBsYXknLCByZXBsYXkpO1xuICB9XG59XG5cbnR5cGUgRmFjdG9yeUxpc3RlbmVyID0gKGZhY3Rvcnk6IFF1ZXN0aW9uRmFjdG9yeSkgPT4gdm9pZDtcbnR5cGUgV3BtTGlzdGVuZXIgPSAod3BtOiBudW1iZXIpID0+IHZvaWQ7XG5jbGFzcyBTZXR0aW5ncyB7XG4gIHByaXZhdGUgc2V0dGluZ3NCdXR0b246IEJ1dHRvbjtcbiAgcHJpdmF0ZSBwYW5lbCQ6IEpRdWVyeTtcbiAgcHJpdmF0ZSBsZXZlbExpc3RlbmVyOiBGYWN0b3J5TGlzdGVuZXI7XG4gIHByaXZhdGUgd3BtTGlzdGVuZXI6IFdwbUxpc3RlbmVyO1xuXG4gIHByaXZhdGUgbGV2ZWw6IG51bWJlcjtcbiAgcHJpdmF0ZSB0ZW1wbzogc3RyaW5nO1xuXG4gIHByaXZhdGUgX2luaXRpYWxpemVkID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5zZXR0aW5nc0J1dHRvbiA9IG5ldyBCdXR0b24oJyNzZXR0aW5ncycpO1xuICAgIHRoaXMuc2V0dGluZ3NCdXR0b24ub25DbGljaygoKSA9PiB0aGlzLnNob3dTZXR0aW5ncygpKTtcblxuICAgIHRoaXMucGFuZWwkID0gJCgnI3NldHRpbmdzUGFuZWwnKTtcbiAgICB0aGlzLnBhbmVsJC5vbignY2xpY2snLCAnYnV0dG9uJywgKGV2ZW50KSA9PiB7XG4gICAgICB0aGlzLnBhbmVsJC5maW5kKCcuc2VsZWN0ZWQnKS5yZW1vdmVDbGFzcygnc2VsZWN0ZWQnKTtcbiAgICAgICQoZXZlbnQudGFyZ2V0KS5hZGRDbGFzcygnc2VsZWN0ZWQnKTtcbiAgICAgIGxldCBsZXZlbCA9IHBhcnNlRmxvYXQoJChldmVudC50YXJnZXQpLmRhdGEoJ2xldmVsJykpO1xuICAgICAgdGhpcy5vbkxldmVsQ2hvc2VuKGxldmVsKTtcbiAgICB9KTtcblxuICAgIHRoaXMucGFuZWwkLm9uKCdjbGljaycsICcuc3BlZWQnLCAoZXZlbnQpID0+IHtcbiAgICAgIGxldCB0ZW1wbzogc3RyaW5nID0gJChldmVudC50YXJnZXQpLmF0dHIoJ2RhdGEtdGVtcG8nKTtcbiAgICAgIGxldCBuZXh0OiBzdHJpbmc7XG4gICAgICBzd2l0Y2ggKHRlbXBvKSB7XG4gICAgICAgIGNhc2UgJ2FkYWdpbyc6XG4gICAgICAgICAgbmV4dCA9ICdtb2RlcmF0byc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ21vZGVyYXRvJzpcbiAgICAgICAgICBuZXh0ID0gJ3ByZXN0byc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3ByZXN0byc6XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgbmV4dCA9ICdhZGFnaW8nO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICB0aGlzLm9uU3BlZWRDaG9zZW4obmV4dCk7XG4gICAgfSk7XG4gIH1cblxuICByZXN0b3JlKCk6IHZvaWQge1xuICAgIHRoaXMub25MZXZlbENob3NlbihQcm9wZXJ0aWVzLmdldE51bWJlcignbGV2ZWwnLCAxKSk7XG4gICAgdGhpcy5vblNwZWVkQ2hvc2VuKFByb3BlcnRpZXMuZ2V0U3RyaW5nKCd0ZW1wbycsICdhZGFnaW8nKSk7XG4gIH1cblxuICBvbkxldmVsU2VsZWN0ZWQobGlzdGVuZXI6IEZhY3RvcnlMaXN0ZW5lcik6IHZvaWQge1xuICAgIHRoaXMubGV2ZWxMaXN0ZW5lciA9IGxpc3RlbmVyO1xuICB9XG5cbiAgb25XcG1TZWxlY3RlZChsaXN0ZW5lcjogV3BtTGlzdGVuZXIpOiB2b2lkIHtcbiAgICB0aGlzLndwbUxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBnZXRXcG0odGVtcG86IHN0cmluZyk6IG51bWJlciB7XG4gICAgc3dpdGNoICh0ZW1wbykge1xuICAgICAgY2FzZSAncHJlc3RvJzogcmV0dXJuIDI1O1xuICAgICAgY2FzZSAnbW9kZXJhdG8nOiByZXR1cm4gMjE7XG4gICAgICBjYXNlICdhZGFnaW8nOlxuICAgICAgZGVmYXVsdDogcmV0dXJuIDE4O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgb25TcGVlZENob3Nlbih0ZW1wbzogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy50ZW1wbyA9IHRlbXBvO1xuXG4gICAgY29uc3Qgc3BlZWQkID0gdGhpcy5wYW5lbCQuZmluZCgnLnNwZWVkJyk7XG5cbiAgICBQcm9wZXJ0aWVzLnNldCgndGVtcG8nLCB0ZW1wbyk7XG4gICAgc3BlZWQkLmF0dHIoJ2RhdGEtdGVtcG8nLCB0ZW1wbyk7XG4gICAgdGhpcy5wYW5lbCQuYXR0cignZGF0YS10ZW1wbycsIHRlbXBvKTtcbiAgICB0aGlzLnNldHRpbmdzQnV0dG9uLmVsZW1lbnQkLmF0dHIoJ2RhdGEtdGVtcG8nLCB0ZW1wbyk7XG5cbiAgICBsZXQgd3BtID0gU2V0dGluZ3MuZ2V0V3BtKHRlbXBvKTtcbiAgICBzcGVlZCQuaHRtbCh3cG0gKyAnIFdQTScpO1xuICAgIHRoaXMud3BtTGlzdGVuZXIgJiYgdGhpcy53cG1MaXN0ZW5lcih3cG0pO1xuICB9XG5cbiAgcHJpdmF0ZSBvbkxldmVsQ2hvc2VuKGxldmVsOiBudW1iZXIpIHtcbiAgICB0aGlzLmxldmVsID0gbGV2ZWw7XG5cbiAgICB0aGlzLnBhbmVsJC5oaWRlKCk7XG5cbiAgICBsZXQgZmFjdG9yeSA9IFJlZ2lzdHJ5LmdldEZhY3RvcnkobGV2ZWwpO1xuICAgIGlmICh0aGlzLmxldmVsTGlzdGVuZXIgJiYgZmFjdG9yeSkge1xuICAgICAgUHJvcGVydGllcy5zZXQoJ2xldmVsJywgbGV2ZWwpO1xuICAgICAgdGhpcy5sZXZlbExpc3RlbmVyKGZhY3RvcnkpO1xuICAgIH1cblxuICAgIHRoaXMuc2V0dGluZ3NCdXR0b24uc2V0VGV4dChsZXZlbC50b1N0cmluZygpKTtcbiAgfVxuXG4gIHByaXZhdGUgc2hvd1NldHRpbmdzKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5faW5pdGlhbGl6ZWQpIHtcbiAgICAgIHRoaXMuX2luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgIHRoaXMucGFuZWwkLmFwcGVuZChgPGRpdiBjbGFzcz1cImhlYWRlclwiPjxzcGFuIGNsYXNzPVwidGl0bGVcIj5MZXZlbHM8L3NwYW4+PHNwYW4gY2xhc3M9XCJzcGVlZFwiIGRhdGEtdGVtcG89XCIke3RoaXMudGVtcG99XCI+JHtTZXR0aW5ncy5nZXRXcG0odGhpcy50ZW1wbyl9IFdQTTwvc3Bhbj48L2Rpdj5gKTtcbiAgICAgIFJlZ2lzdHJ5LnBvcHVsYXRlTGV2ZWxzKHRoaXMucGFuZWwkLCB0aGlzLmxldmVsKTtcbiAgICB9XG5cbiAgICB0aGlzLnBhbmVsJC5zaG93KCk7XG4gIH1cbn1cblxuY2xhc3MgQXBwIHtcbiAgcHJpdmF0ZSBwbGF5QnV0dG9uOiBQbGF5QnV0dG9uO1xuICBwcml2YXRlIHJlcGVhdEJ1dHRvbjogQnV0dG9uO1xuICBwcml2YXRlIHF1ZXN0aW9uOiBRdWVzdGlvbiB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBmYWN0b3J5OiBRdWVzdGlvbkZhY3Rvcnk7XG4gIHByaXZhdGUgYW5zd2VycyQ6IEpRdWVyeTtcbiAgcHJpdmF0ZSBzZXR0aW5nczogU2V0dGluZ3M7XG4gIHByaXZhdGUgcGxheWVyOiBNb3JzZVBsYXllcjtcbiAgcHJpdmF0ZSBwcmV2aW91c1BsYXllcjogTW9yc2VQbGF5ZXI7XG4gIHByaXZhdGUgd3BtOiBudW1iZXI7XG5cbiAgcHJpdmF0ZSBfbG9ja2VkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5pbml0QnV0dG9ucygpO1xuXG4gICAgdGhpcy5zZXR0aW5ncyA9IG5ldyBTZXR0aW5ncygpO1xuICAgIHRoaXMuc2V0dGluZ3Mub25MZXZlbFNlbGVjdGVkKChmYWN0b3J5KSA9PiB0aGlzLm9uRmFjdG9yeUNob3NlbihmYWN0b3J5KSk7XG4gICAgdGhpcy5zZXR0aW5ncy5vbldwbVNlbGVjdGVkKCh3cG0pID0+IHRoaXMub25XcG1DaG9zZW4od3BtKSk7XG5cbiAgICB0aGlzLmFuc3dlcnMkID0gJCgnI2Fuc3dlcnMnKTtcblxuICAgIHZpc2liaWxpdHkoKHZpc2libGU6IGJvb2xlYW4pID0+IHtcbiAgICAgIGlmICghdmlzaWJsZSkge1xuICAgICAgICB0aGlzLnBsYXllciAmJiB0aGlzLnBsYXllci5jYW5jZWwoKTtcbiAgICAgICAgdGhpcy5wcmV2aW91c1BsYXllciAmJiB0aGlzLnByZXZpb3VzUGxheWVyLmNhbmNlbCgpO1xuICAgICAgICB0aGlzLmxvY2tlZCA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIChldmVudCkgPT4gdGhpcy5oYW5kbGVLZXlFdmVudChldmVudCkpO1xuICAgIHRoaXMuc2V0dGluZ3MucmVzdG9yZSgpO1xuICB9XG5cbiAgc2V0IGxvY2tlZChsb2NrZWQ6IGJvb2xlYW4pIHtcbiAgICB0aGlzLnBsYXlCdXR0b24uZW5hYmxlZCA9ICFsb2NrZWQ7XG4gICAgdGhpcy5yZXBlYXRCdXR0b24uZW5hYmxlZCA9ICFsb2NrZWQ7XG5cbiAgICB0aGlzLl9sb2NrZWQgPSBsb2NrZWQ7XG4gIH1cblxuICBnZXQgbG9ja2VkKCkge1xuICAgIHJldHVybiB0aGlzLl9sb2NrZWQ7XG4gIH1cblxuICBwcml2YXRlIGhhbmRsZUtleUV2ZW50KGV2ZW50OiBLZXlib2FyZEV2ZW50KTogdm9pZCB7XG4gICAgaWYgKHRoaXMubG9ja2VkKSByZXR1cm47XG5cbiAgICBpZiAoZXZlbnQud2hpY2ggPT09IDMyKSB7XG4gICAgICB0aGlzLnBsYXkoKTtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IGtleSA9IGtleUV2ZW50VG9TdHJpbmcoZXZlbnQpO1xuICAgIGlmICh0aGlzLnF1ZXN0aW9uKSB7XG4gICAgICB0aGlzLnF1ZXN0aW9uLmFuc3dlcihrZXkpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcGxheSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5sb2NrZWQpIHJldHVybjtcblxuICAgIHRoaXMucmVwZWF0QnV0dG9uLnZpc2libGUgPSBmYWxzZTtcbiAgICB0aGlzLmxvY2tlZCA9IHRydWU7XG4gICAgdGhpcy5wbGF5QnV0dG9uLmVsZW1lbnQkLmFkZENsYXNzKCdwcmVzc2VkJyk7XG5cbiAgICBpZiAoIXRoaXMucXVlc3Rpb24pIHtcbiAgICAgIGxldCBxdWVzdGlvbiA9IHRoaXMuZ2V0UXVlc3Rpb24oKTtcbiAgICAgIHRoaXMucGxheWVyICYmIHRoaXMucGxheWVyLmNhbmNlbCgpO1xuICAgICAgdGhpcy5wbGF5ZXIgPSBNb3JzZVBsYXllci5jcmVhdGUocXVlc3Rpb24ucXVlc3Rpb24sIHRoaXMud3BtKTtcbiAgICB9XG5cbiAgICB0aGlzLnBsYXllci5wbGF5KChzdWNjZXNzKSA9PiB7XG4gICAgICB0aGlzLmxvY2tlZCA9IGZhbHNlO1xuICAgICAgdGhpcy5wbGF5QnV0dG9uLmVsZW1lbnQkLnJlbW92ZUNsYXNzKCdwcmVzc2VkJyk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGdldFF1ZXN0aW9uKCk6IFF1ZXN0aW9uIHtcbiAgICBpZiAodGhpcy5xdWVzdGlvbikge1xuICAgICAgcmV0dXJuIHRoaXMucXVlc3Rpb247XG4gICAgfVxuXG4gICAgdGhpcy5xdWVzdGlvbiA9IHRoaXMuZmFjdG9yeSgpO1xuICAgIHRoaXMucXVlc3Rpb24uaW5pdFVJKHRoaXMuYW5zd2VycyQpO1xuICAgIHRoaXMucXVlc3Rpb24ub25BbnN3ZXJlZCgoKSA9PiB0aGlzLm9uQW5zd2VyZWQoKSk7XG4gICAgcmV0dXJuIHRoaXMucXVlc3Rpb247XG4gIH1cblxuICBwcml2YXRlIG9uQW5zd2VyZWQoKSB7XG4gICAgLy8gaWYgKHRoaXMucXVlc3Rpb24pIHtcbiAgICAgIC8vIHRoaXMucXVlc3Rpb24uZGVpbml0VUkodGhpcy5hbnN3ZXJzJCk7XG4gICAgLy8gfVxuXG4gICAgdGhpcy5wcmV2aW91c1BsYXllciA9IHRoaXMucGxheWVyO1xuICAgIHRoaXMucXVlc3Rpb24gPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5wbGF5QnV0dG9uLnJlcGxheSA9IGZhbHNlO1xuICAgIHRoaXMucmVwZWF0QnV0dG9uLnZpc2libGUgPSB0cnVlO1xuICB9XG5cbiAgcHJpdmF0ZSBvbldwbUNob3Nlbih3cG06IG51bWJlcik6IHZvaWQge1xuICAgIHRoaXMud3BtID0gd3BtO1xuXG4gICAgdGhpcy5xdWVzdGlvbiAmJiB0aGlzLnF1ZXN0aW9uLmRlaW5pdFVJKHRoaXMuYW5zd2VycyQpO1xuICAgIHRoaXMucXVlc3Rpb24gPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5wbGF5QnV0dG9uLnJlcGxheSA9IGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBvbkZhY3RvcnlDaG9zZW4oZmFjdG9yeTogUXVlc3Rpb25GYWN0b3J5KTogdm9pZCB7XG4gICAgdGhpcy5xdWVzdGlvbiAmJiB0aGlzLnF1ZXN0aW9uLmRlaW5pdFVJKHRoaXMuYW5zd2VycyQpO1xuXG4gICAgdGhpcy5xdWVzdGlvbiA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLmZhY3RvcnkgPSBmYWN0b3J5O1xuICAgIHRoaXMucGxheUJ1dHRvbi5yZXBsYXkgPSBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgaW5pdEJ1dHRvbnMoKTogdm9pZCB7XG4gICAgdGhpcy5wbGF5QnV0dG9uID0gbmV3IFBsYXlCdXR0b24oKTtcbiAgICB0aGlzLnBsYXlCdXR0b24ub25DbGljaygoKSA9PiB7XG4gICAgICB0aGlzLnBsYXlCdXR0b24ucmVwbGF5ID0gdHJ1ZTtcbiAgICAgIHRoaXMucGxheSgpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZXBlYXRCdXR0b24gPSBuZXcgQnV0dG9uKCcjcmVwZWF0Jyk7XG4gICAgdGhpcy5yZXBlYXRCdXR0b24ub25DbGljaygoKSA9PiB7XG4gICAgICBpZiAodGhpcy5sb2NrZWQpIHJldHVybjtcblxuICAgICAgdGhpcy5sb2NrZWQgPSB0cnVlO1xuICAgICAgdGhpcy5yZXBlYXRCdXR0b24uZWxlbWVudCQuYWRkQ2xhc3MoJ3ByZXNzZWQnKTtcbiAgICAgIHRoaXMucHJldmlvdXNQbGF5ZXIgJiYgdGhpcy5wcmV2aW91c1BsYXllci5wbGF5KChzdWNjZXNzKSA9PiB7XG4gICAgICAgIHRoaXMubG9ja2VkID0gZmFsc2U7XG4gICAgICAgIHRoaXMucmVwZWF0QnV0dG9uLmVsZW1lbnQkLnJlbW92ZUNsYXNzKCdwcmVzc2VkJyk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuXG5uZXcgQXBwKCk7IC8vIGluaXQgZXZlcnl0aGluZ1xuIiwiZXhwb3J0IGZ1bmN0aW9uIHZpc2liaWxpdHkobGlzdGVuZXI/OiAodmlzaWJpbGl0eTogYm9vbGVhbikgPT4gdm9pZCk6IGJvb2xlYW4ge1xuICBjb25zdCBwcm9wcyA9IHtcbiAgICBoaWRkZW46ICd2aXNpYmlsaXR5Y2hhbmdlJyxcbiAgICB3ZWJraXRIaWRkZW46ICd3ZWJraXR2aXNpYmlsaXR5Y2hhbmdlJyxcbiAgICBtb3pIaWRkZW46ICdtb3p2aXNpYmlsaXR5Y2hhbmdlJyxcbiAgICBtc0hpZGRlbjogJ21zdmlzaWJpbGl0eWNoYW5nZSdcbiAgfTtcblxuICBsZXQgZXZlbnRLZXk6IHN0cmluZyB8IHVuZGVmaW5lZDsgXG4gIGxldCBzdGF0ZUtleTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBcbiAgZm9yIChzdGF0ZUtleSBpbiBwcm9wcykge1xuICAgIGlmIChzdGF0ZUtleSBpbiBkb2N1bWVudCkge1xuICAgICAgZXZlbnRLZXkgPSBwcm9wc1tzdGF0ZUtleV07XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBpZiAobGlzdGVuZXIgJiYgZXZlbnRLZXkpIHtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50S2V5LCAoZXZlbnQpID0+IHtcbiAgICAgIGxpc3RlbmVyKCFldmVudC50YXJnZXRbc3RhdGVLZXkhXSk7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gIWRvY3VtZW50W3N0YXRlS2V5IV07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBrZXlFdmVudFRvU3RyaW5nKGV2ZW50OiBLZXlib2FyZEV2ZW50KTogc3RyaW5nIHtcbiAgbGV0IHJlc3VsdCA9ICcnO1xuXG4gIGxldCBhcHBlbmQgPSAoZmxhZzogYm9vbGVhbiwgbmFtZTogc3RyaW5nLCBidWZmZXI6IHN0cmluZyk6IHN0cmluZyA9PiBidWZmZXIubGVuZ3RoID8gYnVmZmVyICsgKGZsYWcgPyAnICcgKyBuYW1lIDogJycpIDogKGZsYWcgPyBuYW1lIDogJycpO1xuXG4gIHJlc3VsdCA9IGFwcGVuZChldmVudC5tZXRhS2V5LCAnTUVUQScsIHJlc3VsdCk7XG4gIHJlc3VsdCA9IGFwcGVuZChldmVudC5jdHJsS2V5LCAnQ1RSTCcsIHJlc3VsdCk7XG4gIHJlc3VsdCA9IGFwcGVuZChldmVudC5hbHRLZXksICdBTFQnLCByZXN1bHQpO1xuICByZXN1bHQgPSBhcHBlbmQoZXZlbnQuc2hpZnRLZXksICdTSElGVCcsIHJlc3VsdCk7XG5cbiAgbGV0IGNoYXIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGV2ZW50LmtleUNvZGUpO1xuICBpZiAoY2hhcikge1xuICAgIHJlc3VsdCArPSAocmVzdWx0Lmxlbmd0aCA/ICcgJyA6ICcnKSArIGNoYXIudG9Mb3dlckNhc2UoKTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG4iLCJ0eXBlIFByb2MgPSAoKSA9PiB2b2lkO1xuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgUXVlc3Rpb24ge1xuICBwcml2YXRlIE1BWF9UUllfQ09VTlQgPSAyO1xuICBwcm90ZWN0ZWQgX2Fuc3dlcmVkID0gZmFsc2U7XG4gIHByb3RlY3RlZCBfZ3Vlc3NlZCA9IGZhbHNlO1xuICBwcml2YXRlIF90cnlDb3VudCA9IDA7XG5cbiAgcHJpdmF0ZSBfbGlzdGVuZXJzOiBQcm9jW10gPSBbXTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIF9xdWVzdGlvbjogc3RyaW5nLCBwcml2YXRlIF92YXJpYW50czogc3RyaW5nW10pIHtcbiAgfVxuXG4gIGhhc01vcmVUcmllcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fdHJ5Q291bnQgPCB0aGlzLk1BWF9UUllfQ09VTlQ7XG4gIH1cblxuICBwcm90ZWN0ZWQgbmV4dFRyeSgpOiB2b2lkIHtcbiAgICB0aGlzLl90cnlDb3VudCA9IHRoaXMuX3RyeUNvdW50ICsgMTtcbiAgfVxuXG4gIGdldCBhbnN3ZXJlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fYW5zd2VyZWQ7XG4gIH1cblxuICBnZXQgZ3Vlc3NlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fZ3Vlc3NlZDtcbiAgfVxuXG4gIGdldCBxdWVzdGlvbigpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9xdWVzdGlvbjtcbiAgfVxuXG4gIGdldCB2YXJpYW50cygpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIHRoaXMuX3ZhcmlhbnRzO1xuICB9XG5cbiAgYWJzdHJhY3QgYW5zd2VyKHZhcmlhbnQ6IHN0cmluZyk6IHZvaWQ7XG4gIGFic3RyYWN0IGluaXRVSShwYXJlbnQkOiBKUXVlcnkpOiB2b2lkO1xuXG4gIGRlaW5pdFVJKHBhcmVudCQ6IEpRdWVyeSk6IHZvaWQge1xuICAgIHBhcmVudCQuY2hpbGRyZW4oKS5yZW1vdmUoKTtcbiAgfVxuXG4gIG9uQW5zd2VyZWQoY2I6IFByb2MpOiB2b2lkIHtcbiAgICB0aGlzLl9saXN0ZW5lcnMucHVzaChjYilcbiAgfVxuXG4gIHByb3RlY3RlZCBmaXJlQW5zd2VyZWQoKTogdm9pZCB7XG4gICAgdGhpcy5fbGlzdGVuZXJzLmZvckVhY2goKGxpc3RlbmVyKSA9PiB7XG4gICAgICBsaXN0ZW5lcigpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5fbGlzdGVuZXJzID0gW107XG4gIH1cbn1cblxuY2xhc3MgU2VxdWVuY2VRdWVzdGlvbiBleHRlbmRzIFF1ZXN0aW9uIHtcbiAgcHJpdmF0ZSBwYXJlbnQkOiBKUXVlcnk7XG4gIHByaXZhdGUgYnVmZmVyOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocXVlc3Rpb246IHN0cmluZywgdmFyaWFudHM6IHN0cmluZ1tdKSB7XG4gICAgc3VwZXIocXVlc3Rpb24sIHZhcmlhbnRzKTtcbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tWYWxpZChwcm9iZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICF0aGlzLmFuc3dlcmVkICYmIHRoaXMudmFyaWFudHMuaW5kZXhPZihwcm9iZSkgPj0gMDtcbiAgfVxuXG4gIGFuc3dlcihwcm9iZTogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmNoZWNrVmFsaWQocHJvYmUpKSByZXR1cm47XG5cbiAgICBpZiAodGhpcy5idWZmZXIgJiYgdGhpcy5idWZmZXIubGVuZ3RoID09PSB0aGlzLnF1ZXN0aW9uLmxlbmd0aCkge1xuICAgICAgdGhpcy5idWZmZXIgPSAnJztcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZmZlciA9IHRoaXMuYnVmZmVyID8gdGhpcy5idWZmZXIgKyBwcm9iZSA6IHByb2JlO1xuICAgIGlmICh0aGlzLmJ1ZmZlci5sZW5ndGggPT09IHRoaXMucXVlc3Rpb24ubGVuZ3RoKSB7XG4gICAgICB0aGlzLm5leHRUcnkoKTtcblxuICAgICAgbGV0IGNvcnJlY3QgPSB0aGlzLmJ1ZmZlciA9PT0gdGhpcy5xdWVzdGlvbjtcbiAgICAgIGxldCBoYXNNb3JlVHJpZXMgPSB0aGlzLmhhc01vcmVUcmllcygpO1xuXG4gICAgICBpZiAoY29ycmVjdCB8fCAhaGFzTW9yZVRyaWVzKSB7XG4gICAgICAgIHRoaXMuX2d1ZXNzZWQgPSBjb3JyZWN0O1xuICAgICAgICB0aGlzLl9hbnN3ZXJlZCA9IGNvcnJlY3QgfHwgIWhhc01vcmVUcmllcztcbiAgICAgICAgdGhpcy5maXJlQW5zd2VyZWQoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnVwZGF0ZVVJKCk7XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZVVJKCk6IHZvaWQge1xuICAgIGxldCBpbnB1dCQgPSB0aGlzLnBhcmVudCQuZmluZCgnLmlucHV0Jyk7XG4gICAgdGhpcy5xdWVzdGlvbi5zcGxpdCgnJykuZm9yRWFjaCgoYywgaSkgPT4ge1xuICAgICAgbGV0IGNoYXIkID0gaW5wdXQkLmZpbmQoYC5jaGFyOm50aC1jaGlsZCgke2kgKyAxfSlgKTtcbiAgICAgIGlmIChpIDwgdGhpcy5idWZmZXIubGVuZ3RoKSB7XG4gICAgICAgIGNoYXIkLnRleHQodGhpcy5idWZmZXJbaV0pO1xuICAgICAgICBjaGFyJC5kYXRhKCd2YWx1ZScsIHRoaXMuYnVmZmVyW2ldKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNoYXIkLmh0bWwoJyZuYnNwOycpO1xuICAgICAgICBjaGFyJC5kYXRhKCd2YWx1ZScsIG51bGwpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMuYnVmZmVyLmxlbmd0aCA9PT0gdGhpcy5xdWVzdGlvbi5sZW5ndGgpIHtcbiAgICAgIGlucHV0JC5yZW1vdmVDbGFzcygnY29ycmVjdCB3cm9uZycpO1xuICAgICAgaW5wdXQkLnRvZ2dsZUNsYXNzKHRoaXMuZ3Vlc3NlZCA/ICdjb3JyZWN0JyA6ICd3cm9uZycpO1xuICAgICAgaWYgKHRoaXMuYW5zd2VyZWQpIHtcbiAgICAgICAgdGhpcy5xdWVzdGlvbi5zcGxpdCgnJykuZm9yRWFjaCgoYywgaSkgPT4ge1xuICAgICAgICAgIGxldCBjaGFyJCA9IGlucHV0JC5maW5kKGAuY2hhcjpudGgtY2hpbGQoJHtpICsgMX0pYCk7XG4gICAgICAgICAgaWYgKGMgIT09IHRoaXMuYnVmZmVyW2ldKSB7XG4gICAgICAgICAgICBjaGFyJC5hdHRyKCdkYXRhLWNvcnJlY3QnLCBjKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2hhciQudG9nZ2xlQ2xhc3MoJ2NvcnJlY3QnLCB0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaW5wdXQkLnJlbW92ZUNsYXNzKCdjb3JyZWN0IHdyb25nJyk7XG4gIH1cblxuICBpbml0VUkocGFyZW50JDogSlF1ZXJ5KTogdm9pZCB7XG4gICAgdGhpcy5wYXJlbnQkID0gcGFyZW50JDtcbiAgICBwYXJlbnQkLmNoaWxkcmVuKCkucmVtb3ZlKCk7XG5cbiAgICB0aGlzLmluaXRJbnB1dChwYXJlbnQkKTtcbiAgICB0aGlzLmluaXRLZXlib2FyZChwYXJlbnQkKTtcbiAgfVxuXG4gIHByaXZhdGUgaW5pdElucHV0KHBhcmVudCQ6IEpRdWVyeSk6IHZvaWQge1xuICAgIGxldCBpbnB1dCQgPSAkKCc8ZGl2IGNsYXNzPVwiaW5wdXRcIj48L2Rpdj4nKTtcbiAgICB0aGlzLnF1ZXN0aW9uLnNwbGl0KCcnKS5mb3JFYWNoKChjKSA9PiB7XG4gICAgICBpbnB1dCQuYXBwZW5kKCc8ZGl2IGNsYXNzPVwiY2hhclwiPiZuYnNwOzwvZGl2PicpO1xuICAgIH0pO1xuXG4gICAgcGFyZW50JC5hcHBlbmQoaW5wdXQkKTtcbiAgfVxuXG4gIHByaXZhdGUgaW5pdEtleWJvYXJkKHBhcmVudCQ6IEpRdWVyeSk6IHZvaWQge1xuICAgIGxldCBrZXlib2FyZCQgPSAkKCc8ZGl2IGNsYXNzPVwia2V5Ym9hcmRcIj48L2Rpdj4nKTtcbiAgICB0aGlzLnZhcmlhbnRzLmZvckVhY2goKGtleSkgPT4ge1xuICAgICAga2V5Ym9hcmQkLmFwcGVuZChgPGRpdiBjbGFzcz1cImtleVwiIGRhdGEtdmFsdWU9XCIke2tleX1cIj4ke2tleX08L2Rpdj5gKTtcbiAgICB9KTtcblxuICAgIGtleWJvYXJkJC5vbignY2xpY2snLCAnLmtleScsIChldmVudCkgPT4ge1xuICAgICAgbGV0IGtleSQgPSAkKGV2ZW50LnRhcmdldCk7XG4gICAgICBsZXQga2V5ID0gJycgKyBrZXkkLmRhdGEoJ3ZhbHVlJyk7XG5cbiAgICAgIHRoaXMuYW5zd2VyKGtleSk7XG4gICAgfSk7XG5cbiAgICBwYXJlbnQkLmFwcGVuZChrZXlib2FyZCQpO1xuICB9XG59XG5cbmV4cG9ydCB0eXBlIFF1ZXN0aW9uRmFjdG9yeSA9ICgpID0+IFF1ZXN0aW9uO1xuXG5leHBvcnQgY2xhc3MgUmVnaXN0cnkge1xuICBwcml2YXRlIHN0YXRpYyBfc2VjdGlvbnM6IHN0cmluZ1tdID0gW107XG4gIHByaXZhdGUgc3RhdGljIF9zZWN0aW9uTWFwOiB7W2tleTogc3RyaW5nXTogUXVlc3Rpb25GYWN0b3J5W119ID0ge307XG5cbiAgc3RhdGljIHJlZ2lzdGVyKGZhY3Rvcnk6IFF1ZXN0aW9uRmFjdG9yeSwgc2VjdGlvbjogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKCFSZWdpc3RyeS5fc2VjdGlvbk1hcC5oYXNPd25Qcm9wZXJ0eShzZWN0aW9uKSkge1xuICAgICAgUmVnaXN0cnkuX3NlY3Rpb25zLnB1c2goc2VjdGlvbik7XG4gICAgICBSZWdpc3RyeS5fc2VjdGlvbk1hcFtzZWN0aW9uXSA9IFtmYWN0b3J5XTtcbiAgICB9IGVsc2Uge1xuICAgICAgUmVnaXN0cnkuX3NlY3Rpb25NYXBbc2VjdGlvbl0ucHVzaChmYWN0b3J5KTtcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgcG9wdWxhdGVMZXZlbHMocGFyZW50JDogSlF1ZXJ5LCBzZWxlY3RlZDogbnVtYmVyID0gMSk6IHZvaWQge1xuICAgIGxldCBsZXZlbCA9IDE7XG4gICAgUmVnaXN0cnkuX3NlY3Rpb25zLmZvckVhY2goKHMpID0+IHtcbiAgICAgIGxldCBzZWN0aW9uJCA9ICQoJzxkaXYgY2xhc3M9XCJzZWN0aW9uXCI+PC9kaXY+Jyk7XG4gICAgICBzZWN0aW9uJC5hcHBlbmQoYDxkaXYgY2xhc3M9XCJ0aXRsZVwiPiR7c308L2Rpdj5gKTtcbiAgICAgIGxldCBsZXZlbHMkID0gJCgnPGRpdiBjbGFzcz1cImxldmVsc1wiPjwvZGl2PicpO1xuICAgICAgc2VjdGlvbiQuYXBwZW5kKGxldmVscyQpO1xuICAgICAgbGV0IGxldmVscyA9IFJlZ2lzdHJ5Ll9zZWN0aW9uTWFwW3NdO1xuICAgICAgbGV2ZWxzLmZvckVhY2goKGx2bCkgPT4ge1xuICAgICAgICBsZXQgbGV2ZWwkID0gJChgPGJ1dHRvbiBjbGFzcz1cImxldmVsXCIgZGF0YS1sZXZlbD1cIiR7bGV2ZWx9XCI+JHtsZXZlbH08L2J1dHRvbj5gKTtcbiAgICAgICAgbGV2ZWwkLnRvZ2dsZUNsYXNzKCdzZWxlY3RlZCcsIHNlbGVjdGVkID09PSBsZXZlbCk7XG4gICAgICAgIGxldmVscyQuYXBwZW5kKGxldmVsJCk7XG5cbiAgICAgICAgbGV2ZWwgPSBsZXZlbCArIDE7XG4gICAgICB9KTtcblxuICAgICAgcGFyZW50JC5hcHBlbmQoc2VjdGlvbiQpO1xuICAgIH0pO1xuICB9XG5cbiAgc3RhdGljIGdldEZhY3RvcnkobGV2ZWw6IG51bWJlcik6IFF1ZXN0aW9uRmFjdG9yeSB8IHVuZGVmaW5lZCB7XG4gICAgbGV0IGN1cnJlbnRMZXZlbCA9IDE7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IFJlZ2lzdHJ5Ll9zZWN0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgc2VjdGlvbiA9IFJlZ2lzdHJ5Ll9zZWN0aW9uc1tpXTtcbiAgICAgICAgbGV0IGZhY3RvcmllcyA9IFJlZ2lzdHJ5Ll9zZWN0aW9uTWFwW3NlY3Rpb25dO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZhY3Rvcmllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbGV0IGZhY3RvcnkgPSBmYWN0b3JpZXNbaV07XG4gICAgICAgICAgICBpZiAoY3VycmVudExldmVsID09PSBsZXZlbCkge1xuICAgICAgICAgICAgICByZXR1cm4gZmFjdG9yeTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY3VycmVudExldmVsID0gY3VycmVudExldmVsICsgMTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBzdGF0aWMgaW5pdGlhbCgpOiBRdWVzdGlvbkZhY3Rvcnkge1xuICAgIHJldHVybiB0aGlzLl9zZWN0aW9uTWFwW3RoaXMuX3NlY3Rpb25zWzBdXVswXTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgUXVlc3Rpb25DaG9vc2VyIHtcbiAgcHJpdmF0ZSBhbnN3ZXJNYXA6IHtba2V5OiBzdHJpbmddOiBudW1iZXJ9ID0ge307XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgYWxwaGFiZXQ6IHN0cmluZywgcHJpdmF0ZSBudW1PZkNoYXJzOiBudW1iZXIsIHByaXZhdGUgbnVtT2ZLZXlzOiBudW1iZXIpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFscGhhYmV0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLmFuc3dlck1hcFthbHBoYWJldFtpXV0gPSAwO1xuICAgIH1cbiAgfVxuXG4gIGFuc3dlcihxdWVzdGlvbjogc3RyaW5nLCBwb2ludHM6IG51bWJlcik6IHZvaWQge1xuICAgIGlmIChwb2ludHMgPT09IDApIHJldHVybjtcblxuICAgIGZvcihsZXQgaSA9IDA7IGkgPCBxdWVzdGlvbi5sZW5ndGg7IGkrKykge1xuICAgICAgdGhpcy5hbnN3ZXJNYXBbcXVlc3Rpb25baV1dID0gdGhpcy5hbnN3ZXJNYXBbcXVlc3Rpb25baV1dICsgcG9pbnRzO1xuICAgIH1cbiAgfVxuXG4gIC8vIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1JlamVjdGlvbl9zYW1wbGluZ1xuICBnZW5lcmF0ZU5ld1F1ZXN0aW9uKCk6IFF1ZXN0aW9uIHtcbiAgICBsZXQgcmVzdWx0ID0gJyc7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm51bU9mQ2hhcnM7IGkrKykge1xuICAgICAgd2hpbGUodHJ1ZSkge1xuICAgICAgICBsZXQgW2MsIHhdID0gdGhpcy5wcm9iZSgpO1xuICAgICAgICBsZXQgY2hhciA9IHRoaXMuYWxwaGFiZXRbY107XG4gICAgICAgIGlmICh0aGlzLmFuc3dlck1hcFtjaGFyXSA8PSB4ICYmIHJlc3VsdC5pbmRleE9mKGNoYXIpID09PSAtMSkge1xuICAgICAgICAgIHJlc3VsdCArPSBjaGFyO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlc3VsdC5sZW5ndGggPT09IHRoaXMubnVtT2ZDaGFycykge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IHF1ZXN0aW9uID0gbmV3IFNlcXVlbmNlUXVlc3Rpb24ocmVzdWx0LCB0aGlzLmJ1aWxkS2V5cyhyZXN1bHQsIHRoaXMubnVtT2ZLZXlzKSk7XG4gICAgcXVlc3Rpb24ub25BbnN3ZXJlZCgoKSA9PiB0aGlzLmFuc3dlcihxdWVzdGlvbi5xdWVzdGlvbiwgcXVlc3Rpb24uZ3Vlc3NlZCA/IHF1ZXN0aW9uLmhhc01vcmVUcmllcygpID8gMiA6IDEgOiAwKSk7XG5cbiAgICByZXR1cm4gcXVlc3Rpb247XG4gIH1cblxuICBwcml2YXRlIHByb2JlKCk6IFtudW1iZXIsIG51bWJlcl0ge1xuICAgIGxldCBuID0gdGhpcy5hbHBoYWJldC5sZW5ndGg7XG4gICAgbGV0IHZhbHMgPSBPYmplY3Qua2V5cyh0aGlzLmFuc3dlck1hcCkubWFwKChrKSA9PiB0aGlzLmFuc3dlck1hcFtrXSk7XG4gICAgbGV0IG1heCA9IE1hdGgubWF4LmFwcGx5KG51bGwsIHZhbHMpO1xuICAgIGxldCBtaW4gPSBNYXRoLm1pbi5hcHBseShudWxsLCB2YWxzKTtcbiAgICByZXR1cm4gW1F1ZXN0aW9uQ2hvb3Nlci5yYW5kKDAsIG4pLCBRdWVzdGlvbkNob29zZXIucmFuZChtaW4sIG1heCArIDEpXTtcbiAgfVxuXG4gIHByaXZhdGUgYnVpbGRLZXlzKHF1ZXN0aW9uOiBzdHJpbmcsIG51bU9mS2V5czogbnVtYmVyKTogc3RyaW5nW10ge1xuICAgIGxldCB2YXJpYW50cyA9IHF1ZXN0aW9uO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBpZiAodmFyaWFudHMubGVuZ3RoID09PSBudW1PZktleXMpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGxldCBwcm9iZSA9IHRoaXMuYWxwaGFiZXRbUXVlc3Rpb25DaG9vc2VyLnJhbmQoMCwgdGhpcy5hbHBoYWJldC5sZW5ndGgpXTtcbiAgICAgIGlmICh2YXJpYW50cy5pbmRleE9mKHByb2JlKSA9PT0gLTEpIHtcbiAgICAgICAgdmFyaWFudHMgPSB2YXJpYW50cyArIHByb2JlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB2YXJpYW50cy5zcGxpdCgnJykuc29ydCgpO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgcmFuZChtaW46IG51bWJlciwgbWF4OiBudW1iZXIpOiBudW1iZXIge1xuICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbik7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2VxdWVuY2VRdWVzdGlvbihhbHBoYWJldDogc3RyaW5nLCBudW1PZkNoYXJzOiBudW1iZXIsIG51bU9mS2V5czogbnVtYmVyKTogKCkgPT4gUXVlc3Rpb24ge1xuICBsZXQgY2hvb3NlciA9IG5ldyBRdWVzdGlvbkNob29zZXIoYWxwaGFiZXQsIG51bU9mQ2hhcnMsIG51bU9mS2V5cyk7XG4gIHJldHVybiAoKSA9PiBjaG9vc2VyLmdlbmVyYXRlTmV3UXVlc3Rpb24oKTtcbn1cblxuUmVnaXN0cnkucmVnaXN0ZXIoc2VxdWVuY2VRdWVzdGlvbignYWVpbW50JywgMSwgNCksICdhbHBoYSAxJyk7XG5SZWdpc3RyeS5yZWdpc3RlcihzZXF1ZW5jZVF1ZXN0aW9uKCdkZ2tvcnN1JywgMSwgNCksICdhbHBoYSAxJyk7XG5SZWdpc3RyeS5yZWdpc3RlcihzZXF1ZW5jZVF1ZXN0aW9uKCdhZWltbnRkZ2tvcnN1JywgMiwgOCksICdhbHBoYSAxJyk7XG5cblJlZ2lzdHJ5LnJlZ2lzdGVyKHNlcXVlbmNlUXVlc3Rpb24oJ2JjZmhqbHcnLCAxLCA0KSwgJ2FscGhhIDInKTtcblJlZ2lzdHJ5LnJlZ2lzdGVyKHNlcXVlbmNlUXVlc3Rpb24oJ3Bxdnh5eicsIDEsIDQpLCAnYWxwaGEgMicpO1xuUmVnaXN0cnkucmVnaXN0ZXIoc2VxdWVuY2VRdWVzdGlvbignYmNmaGpsd3Bxdnh5eicsIDIsIDgpLCAnYWxwaGEgMicpO1xuXG5SZWdpc3RyeS5yZWdpc3RlcihzZXF1ZW5jZVF1ZXN0aW9uKCdhZWltbnRkZ2tvcnN1YmNmaGpsd3Bxdnh5eicsIDIsIDgpLCAnYWxwaGEgMycpO1xuUmVnaXN0cnkucmVnaXN0ZXIoc2VxdWVuY2VRdWVzdGlvbignYWVpbW50ZGdrb3JzdWJjZmhqbHdwcXZ4eXonLCAzLCA4KSwgJ2FscGhhIDMnKTtcblxuUmVnaXN0cnkucmVnaXN0ZXIoc2VxdWVuY2VRdWVzdGlvbignMDEyMzQnLCAxLCA0KSwgJ2RpZ2l0cycpO1xuUmVnaXN0cnkucmVnaXN0ZXIoc2VxdWVuY2VRdWVzdGlvbignNTY3ODknLCAxLCA0KSwgJ2RpZ2l0cycpO1xuUmVnaXN0cnkucmVnaXN0ZXIoc2VxdWVuY2VRdWVzdGlvbignMTIzNDU2Nzg5JywgMiwgOCksICdkaWdpdHMnKTtcblxuUmVnaXN0cnkucmVnaXN0ZXIoc2VxdWVuY2VRdWVzdGlvbignMDEyMzQ1Njc4OWFlaW1udGRna29yc3ViY2Zoamx3cHF2eHl6JywgMiwgOCksICdhbHBoYSAmIGRpZ2l0cycpO1xuUmVnaXN0cnkucmVnaXN0ZXIoc2VxdWVuY2VRdWVzdGlvbignMDEyMzQ1Njc4OWFlaW1udGRna29yc3ViY2Zoamx3cHF2eHl6JywgNCwgMTIpLCAnYWxwaGEgJiBkaWdpdHMnKTtcbiIsImltcG9ydCB7IFdhdkdlbiB9IGZyb20gJy4vd2F2JztcblxuY29uc3QgQUxQSEFCRVQgPSB7XG4gICdhJzogJy4tJywgJ2InOiAnLS4uLicsICdjJzogJy0uLS4nLCAnZCc6ICctLi4nLCAnZSc6ICcuJywgJ2YnOiAnLi4tLicsICdnJzogJy0tLicsICdoJzogJy4uLi4nLFxuICAnaSc6ICcuLicsICdqJzogJy4tLS0nLCAnayc6ICctLi0nLCAnbCc6ICcuLS4uJywgJ20nOiAnLS0nLCAnbic6ICctLicsICdvJzogJy0tLScsICdwJzogJy4tLS4nLFxuICAncSc6ICctLS4tJywgJ3InOiAnLi0uJywgJ3MnOiAnLi4uJywgJ3QnOiAnLScsICd1JzogJy4uLScsICd2JzogJy4uLi0nLCAndyc6ICcuLS0nLCAneCc6ICctLi4tJyxcbiAgJ3knOiAnLS4tLScsICd6JzogJy0tLi4nLFxuICAnMSc6ICcuLS0tLScsICcyJzogJy4uLS0tJywgJzMnOiAnLi4uLS0nLCAnNCc6ICcuLi4uLScsICc1JzogJy4uLi4uJyxcbiAgJzYnOiAnLS4uLi4nLCAnNyc6ICctLS4uLicsICc4JzogJy0tLS4uJywgJzknOiAnLS0tLS4nLCAnMCc6ICctLS0tLScgLyogb3IganVzdCAnLScgKi8sXG4gICcuJzogJy5fLl8uXycsICcsJzogJ19fLi5fXycsICc/JzogJy4uX18uLicsICAnXFwnJzogJy5fX19fLicsXG4gICcvJzogJ18uLl8uJywgICcoJzogJ18uX18uJywgICcpJzogJ18uX18uXycsICAnJic6ICcuXy4uLicsXG4gICc6JzogJ19fXy4uLicsICc7JzogJ18uXy5fLicsICc9JzogJ18uLi5fJywgICAnKyc6ICcuXy5fLicsXG4gICctJzogJ18uLi4uXycsICdfJzogJy4uX18uXycsICdcIic6ICcuXy4uXy4nLCAnJCc6ICcuLi5fLi5fJyxcbiAgJyEnOiAnXy5fLl9fJyAvKiBvciAnX19fLicgKi8sICdAJzogJy5fXy5fLicsXG4gICcgJzogJyAnIC8qIHNwYWNlICovXG59O1xuXG5jb25zdCBTUEFDRSA9ICcgJztcbmNvbnN0IERBU0ggPSAnLSc7XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBNb3JzZVBsYXllciB7XG4gIGNvbnN0cnVjdG9yKCkge31cblxuICBhYnN0cmFjdCBwbGF5KGNiPzogKHN1Y2Nlc3M6IGJvb2xlYW4pID0+IHZvaWQpOiB2b2lkO1xuXG4gIGNhbmNlbCgpOiB2b2lkIHt9XG5cbiAgc3RhdGljIGNyZWF0ZSh0ZXh0OiBzdHJpbmcsIHdwbSA9IDIwLCBmcmVxdWVuY3kgPSA4NDApOiBNb3JzZVBsYXllciB7XG4gICAgbGV0IGJ1aWxkZXIgPSBuZXcgTW9yc2VCdWlsZGVyKHdwbSk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0ZXh0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBidWlsZGVyLmFwcGVuZCh0ZXh0W2ldKTtcbiAgICB9XG5cbiAgICBsZXQgc3RhcnQgPSBidWlsZGVyLmJ1aWxkKCk7XG4gICAgbGV0IHBsYXllciA9IFdhdkdlbi5zdXBwb3J0ZWQgPyBuZXcgV2F2UGxheWVyKGZyZXF1ZW5jeSwgc3RhcnQpIDogbmV3IFdlYkF1ZGlvQXBpUGxheWVyKGZyZXF1ZW5jeSwgc3RhcnQpO1xuICAgIHJldHVybiBwbGF5ZXI7XG4gIH1cbn1cblxuY2xhc3MgV2ViQXVkaW9BcGlQbGF5ZXIgZXh0ZW5kcyBNb3JzZVBsYXllciB7XG4gIHByaXZhdGUgc2lnbmFsOiBTaWduYWwgfCB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmcmVxdWVuY3k6IG51bWJlciwgcHJpdmF0ZSBzdGFydDogVG9uZSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBwbGF5KGNiPzogKHN1Y2Nlc3M6IGJvb2xlYW4pID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLnNpZ25hbCA9IG5ldyBTaWduYWwodGhpcy5mcmVxdWVuY3kpO1xuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5zdGFydC5wbGF5KHRoaXMuZnJlcXVlbmN5LCB0aGlzLnNpZ25hbCEsIChzdWNjZXNzKSA9PiB7XG4gICAgICAgIHRoaXMuc2lnbmFsIS5zdG9wKCk7XG4gICAgICAgIHRoaXMuc2lnbmFsID0gdW5kZWZpbmVkO1xuICAgICAgICBjYiAmJiBjYihzdWNjZXNzKTtcbiAgICAgIH0pO1xuICAgIH0sIDMwKTtcbiAgfVxuXG4gIGNhbmNlbCgpOiB2b2lkIHtcbiAgICB0aGlzLnNpZ25hbCAmJiB0aGlzLnNpZ25hbC5zdG9wKCk7XG4gIH1cbn1cblxudHlwZSBDYWxsYmFjayA9ICgpID0+IHZvaWQ7XG5jbGFzcyBXYXZQbGF5ZXIgZXh0ZW5kcyBNb3JzZVBsYXllciB7XG4gIHByaXZhdGUgYXVkaW86IGFueTsgLy8gb29wc2llXG4gIHByaXZhdGUgX2xpc3RlbmVyczogQ2FsbGJhY2tbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKGZyZXF1ZW5jeTogbnVtYmVyLCBzdGFydDogVG9uZSkge1xuICAgIHN1cGVyKCk7XG5cbiAgICBsZXQgd2F2ID0gbmV3IFdhdkdlbihmcmVxdWVuY3kpO1xuXG4gICAgbGV0IHRvbmUgPSBzdGFydDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgd2F2LmFwcGVuZCh0b25lLmR1cmF0aW9uLCB0b25lLnNpbGVudCk7XG4gICAgICB0b25lID0gdG9uZS5uZXh0O1xuICAgICAgaWYgKCF0b25lKSBicmVhaztcbiAgICB9XG5cbiAgICB0aGlzLmF1ZGlvICA9IG5ldyBBdWRpbygpO1xuICAgIHRoaXMuYXVkaW8uc3JjID0gd2F2LmJ1aWxkKCk7XG4gIH1cblxuICBwbGF5KGNiPzogKHN1Y2Nlc3M6IGJvb2xlYW4pID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLl9saXN0ZW5lcnMuZm9yRWFjaCgobCkgPT4gdGhpcy5hdWRpby5yZW1vdmVFdmVudExpc3RlbmVyKCdlbmRlZCcsIGwpKTtcbiAgICB0aGlzLl9saXN0ZW5lcnMgPSBbXTtcblxuICAgIGxldCBsaXN0ZW5lciA9ICgpID0+IGNiICYmIGNiKHRydWUpO1xuICAgIHRoaXMuX2xpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcblxuICAgIHRoaXMuYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignZW5kZWQnLCBsaXN0ZW5lcik7XG4gICAgdGhpcy5hdWRpby5wbGF5KCk7XG4gIH1cbn1cblxuZW51bSBUb25lVHlwZSB7XG4gIERPVCwgREFTSCwgV09SRF9TRVAsIFRPTkVfU0VQLCBMRVRURVJfU0VQXG59XG5cbmNsYXNzIE1vcnNlQnVpbGRlciB7XG4gIHByaXZhdGUgZG90RHVyYXRpb246IG51bWJlcjtcbiAgcHJpdmF0ZSBzdGFydDogVG9uZTtcbiAgcHJpdmF0ZSBjdXJyZW50OiBUb25lO1xuICBwcml2YXRlIHByZXZDaGFyOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3Iod3BtOiBudW1iZXIpIHtcbiAgICB0aGlzLmRvdER1cmF0aW9uID0gTW9yc2VCdWlsZGVyLmdldERvdER1cmF0aW9uKHdwbSk7XG4gIH1cblxuICBjcmVhdGVUb25lKHR5cGU6IFRvbmVUeXBlKTogVG9uZSB7XG4gICAgbGV0IGNvZWZmOiBudW1iZXI7XG4gICAgbGV0IG9mZjogYm9vbGVhbjtcblxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSBUb25lVHlwZS5ET1Q6XG4gICAgICAgIFtjb2VmZiwgb2ZmXSA9IFsxLCBmYWxzZV07XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb25lVHlwZS5EQVNIOlxuICAgICAgICBbY29lZmYsIG9mZl0gPSBbMywgZmFsc2VdO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9uZVR5cGUuV09SRF9TRVA6XG4gICAgICAgIFtjb2VmZiwgb2ZmXSA9IFs3LCB0cnVlXTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvbmVUeXBlLlRPTkVfU0VQOlxuICAgICAgICBbY29lZmYsIG9mZl0gPSBbMSwgdHJ1ZV07XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb25lVHlwZS5MRVRURVJfU0VQOlxuICAgICAgICBbY29lZmYsIG9mZl0gPSBbMywgdHJ1ZV07XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgRXJyb3IoYFVua25vd24gdG9uZSB0eXBlOiAke3R5cGV9IWApO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgVG9uZSh0aGlzLmRvdER1cmF0aW9uICogY29lZmYsIG9mZik7XG4gIH1cblxuICBhcHBlbmQoY2hhcjogc3RyaW5nKTogdm9pZCB7XG4gICAgbGV0IHRvbmVTZXEgPSBBTFBIQUJFVFtjaGFyXTtcbiAgICBpZiAoIXRvbmVTZXEpIHtcbiAgICAgIHRocm93IEVycm9yKGBVbmtub3duIGNoYXI6IFwiJHtjaGFyfSFcImApO1xuICAgIH1cblxuICAgIGlmICh0b25lU2VxID09PSBTUEFDRSkge1xuICAgICAgdGhpcy5jdXJyZW50ID0gdGhpcy5jdXJyZW50LmFwcGVuZCh0aGlzLmNyZWF0ZVRvbmUoVG9uZVR5cGUuV09SRF9TRVApKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b25lU2VxLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGxldCB0b25lQ2hhciA9IHRvbmVTZXFbaV07XG4gICAgICAgIGlmICh0aGlzLnByZXZDaGFyICYmIHRoaXMucHJldkNoYXIgIT09IFNQQUNFKSB7XG4gICAgICAgICAgdGhpcy5jdXJyZW50ID0gdGhpcy5jdXJyZW50LmFwcGVuZCh0aGlzLmNyZWF0ZVRvbmUoVG9uZVR5cGUuTEVUVEVSX1NFUCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHRvbmUgPSB0aGlzLmNyZWF0ZVRvbmUodG9uZUNoYXIgPT09IERBU0ggPyBUb25lVHlwZS5EQVNIIDogVG9uZVR5cGUuRE9UKTtcbiAgICAgICAgaWYgKCF0aGlzLnN0YXJ0KSB7XG4gICAgICAgICAgdGhpcy5zdGFydCA9IHRoaXMuY3JlYXRlVG9uZShUb25lVHlwZS5MRVRURVJfU0VQKTtcbiAgICAgICAgICB0aGlzLnN0YXJ0LmFwcGVuZCh0b25lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnQpIHtcbiAgICAgICAgICB0aGlzLmN1cnJlbnQgPSB0aGlzLmN1cnJlbnQuYXBwZW5kKHRvbmUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuY3VycmVudCA9IHRvbmU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaSA8IHRvbmVTZXEubGVuZ3RoIC0gMSkge1xuICAgICAgICAgIHRoaXMuY3VycmVudCA9IHRoaXMuY3VycmVudC5hcHBlbmQodGhpcy5jcmVhdGVUb25lKFRvbmVUeXBlLlRPTkVfU0VQKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnByZXZDaGFyID0gY2hhcjtcbiAgfVxuXG4gIGJ1aWxkKCk6IFRvbmUge1xuICAgIHRoaXMuY3VycmVudC5hcHBlbmQodGhpcy5jcmVhdGVUb25lKFRvbmVUeXBlLkxFVFRFUl9TRVApKTsgLy8gZG8gbm90IGRyb3AgdGhlIG1pY1xuICAgIHJldHVybiB0aGlzLnN0YXJ0O1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgZ2V0RG90RHVyYXRpb24od3BtOiBudW1iZXIpOiBudW1iZXIge1xuICAgIHJldHVybiBNYXRoLnJvdW5kKDEyMDAgLyB3cG0pO1xuICB9XG59XG5cbmNsYXNzIFNpZ25hbCB7XG4gIHByaXZhdGUgc3RhdGljIGN0eDogQXVkaW9Db250ZXh0O1xuXG4gIHByaXZhdGUgb3NjaWxsYXRvcjogT3NjaWxsYXRvck5vZGU7XG4gIHByaXZhdGUgdm9sdW1lOiBHYWluTm9kZTtcblxuICBwcml2YXRlIF9vbjogYm9vbGVhbiA9IGZhbHNlO1xuICBwcml2YXRlIF9zdG9wcGVkID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmcmVxdWVuY3k6bnVtYmVyKSB7XG4gICAgaWYgKCFTaWduYWwuY3R4KSB7XG4gICAgICBTaWduYWwuY3R4ID0gbmV3ICh3ZWJraXRBdWRpb0NvbnRleHQgfHwgQXVkaW9Db250ZXh0KSgpO1xuICAgIH1cblxuICAgIHRoaXMub3NjaWxsYXRvciA9IFNpZ25hbC5jdHguY3JlYXRlT3NjaWxsYXRvcigpO1xuICAgIHRoaXMub3NjaWxsYXRvci50eXBlID0gJ3NpbmUnO1xuICAgIHRoaXMub3NjaWxsYXRvci5mcmVxdWVuY3kudmFsdWUgPSBmcmVxdWVuY3k7XG5cbiAgICB0aGlzLnZvbHVtZSA9IFNpZ25hbC5jdHguY3JlYXRlR2FpbigpO1xuICAgIHRoaXMub3NjaWxsYXRvci5jb25uZWN0KHRoaXMudm9sdW1lKTtcbiAgICB0aGlzLnZvbHVtZS5jb25uZWN0KFNpZ25hbC5jdHguZGVzdGluYXRpb24pO1xuXG4gICAgdGhpcy52b2x1bWUuZ2Fpbi52YWx1ZSA9IDA7XG4gICAgdGhpcy5vc2NpbGxhdG9yLnN0YXJ0KCk7XG4gIH1cblxuICBzdGF0aWMgZ2V0IHN1cHBvcnRlZCgpIHtcbiAgICByZXR1cm4gd2Via2l0QXVkaW9Db250ZXh0IHx8IEF1ZGlvQ29udGV4dDtcbiAgfVxuXG4gIGdldCBzdG9wcGVkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9zdG9wcGVkO1xuICB9XG5cbiAgb24oKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLl9vbiAmJiAhdGhpcy5fc3RvcHBlZCkge1xuICAgICAgdGhpcy5fb24gPSB0cnVlO1xuICAgICAgdGhpcy5zZXRWb2x1bWUoMSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBzZXRWb2x1bWUodm9sdW1lOiBudW1iZXIpOiB2b2lkIHtcbiAgICBsZXQgbm93ID0gU2lnbmFsLmN0eC5jdXJyZW50VGltZTtcbiAgICB0aGlzLnZvbHVtZS5nYWluLmNhbmNlbFNjaGVkdWxlZFZhbHVlcyhub3cpO1xuICAgIHRoaXMudm9sdW1lLmdhaW4uc2V0VmFsdWVBdFRpbWUodGhpcy52b2x1bWUuZ2Fpbi52YWx1ZSwgbm93KTtcbiAgICB0aGlzLnZvbHVtZS5nYWluLmxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lKHZvbHVtZSwgbm93ICsgMC4wMTUpO1xuICB9XG5cbiAgb2ZmKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLl9vbikge1xuICAgICAgdGhpcy5fb24gPSBmYWxzZTtcbiAgICAgIHRoaXMuc2V0Vm9sdW1lKDApO1xuICAgIH1cbiAgfVxuXG4gIHN0b3AoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuc3RvcHBlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMub2ZmKCk7XG4gICAgdGhpcy5fc3RvcHBlZCA9IHRydWU7XG4gICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLm9zY2lsbGF0b3Iuc3RvcCgpLCAzMCk7XG4gIH1cbn1cblxuY2xhc3MgVG9uZSB7XG4gIHByaXZhdGUgX25leHQ6IFRvbmU7XG5cbiAgY29uc3RydWN0b3IocHVibGljIGR1cmF0aW9uOiBudW1iZXIsIHB1YmxpYyBzaWxlbnQ6IGJvb2xlYW4gPSBmYWxzZSkge31cblxuICBhcHBlbmQodG9uZTogVG9uZSk6IFRvbmUge1xuICAgIHRoaXMuX25leHQgPSB0b25lO1xuICAgIHJldHVybiB0b25lO1xuICB9XG5cbiAgZ2V0IG5leHQoKTogVG9uZSB7XG4gICAgcmV0dXJuIHRoaXMuX25leHQ7XG4gIH1cblxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgJHt0aGlzLnNpbGVudCA/ICctJyA6ICcrJ30ke3RoaXMuZHVyYXRpb259IGAgKyAodGhpcy5uZXh0ICYmIHRoaXMubmV4dC50b1N0cmluZygpIHx8ICcnKTtcbiAgfVxuXG4gIHBsYXkoZnJlcXVlbmN5OiBudW1iZXIsIHNpZ25hbDogU2lnbmFsLCBvbkZpbmlzaGVkOiAoc3VjY2VzczogYm9vbGVhbikgPT4gdm9pZCk6IHZvaWQge1xuICAgIGlmIChzaWduYWwuc3RvcHBlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5zaWxlbnQpIHtcbiAgICAgIHNpZ25hbC5vbigpO1xuICAgIH1cblxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgaWYgKCF0aGlzLnNpbGVudCkge1xuICAgICAgICBzaWduYWwub2ZmKCk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm5leHQpIHtcbiAgICAgICAgdGhpcy5uZXh0LnBsYXkoZnJlcXVlbmN5LCBzaWduYWwsIG9uRmluaXNoZWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2lnbmFsLnN0b3AoKTtcbiAgICAgICAgb25GaW5pc2hlZCh0cnVlKTtcbiAgICAgIH1cbiAgICB9LCB0aGlzLmR1cmF0aW9uKTtcbiAgfVxufVxuIiwiY2xhc3MgTW9ja1N0b3JhZ2UgZXh0ZW5kcyBTdG9yYWdlIHtcbiAgZ2V0SXRlbShrZXk6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgc2V0SXRlbShrZXk6IHN0cmluZywgdmFsdWU6IHN0cmluZykge31cbiAgcmVtb3ZlSXRlbShrZXk6IHN0cmluZyk6IHZvaWQge31cbiAgY2xlYXIoKTogdm9pZCB7fVxufVxuXG5leHBvcnQgY2xhc3MgUHJvcGVydGllcyB7XG4gIHN0YXRpYyBoYXNMb2NhbFN0b3JhZ2UoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICdsb2NhbFN0b3JhZ2UnIGluIHdpbmRvdyAmJiB3aW5kb3dbJ2xvY2FsU3RvcmFnZSddICE9PSB1bmRlZmluZWQ7XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBfc3RvcmFnZTogU3RvcmFnZSA9IFByb3BlcnRpZXMuaGFzTG9jYWxTdG9yYWdlKCkgPyB3aW5kb3cubG9jYWxTdG9yYWdlIDogbmV3IE1vY2tTdG9yYWdlKCk7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gIH1cblxuICBzdGF0aWMgc2V0KGtleTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nIHwgbnVtYmVyKTogdm9pZCB7XG4gICAgUHJvcGVydGllcy5fc3RvcmFnZS5zZXRJdGVtKGtleSwgdmFsdWUudG9TdHJpbmcoKSk7XG4gIH1cblxuICBzdGF0aWMgZ2V0KGtleTogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgcmV0dXJuIFByb3BlcnRpZXMuX3N0b3JhZ2UuZ2V0SXRlbShrZXkpO1xuICB9XG5cbiAgc3RhdGljIGdldFN0cmluZyhrZXk6IHN0cmluZywgZGVmYXVsdFZhbHVlOiBzdHJpbmcgPSAnJyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIFByb3BlcnRpZXMuZ2V0KGtleSkgfHwgZGVmYXVsdFZhbHVlO1xuICB9XG5cbiAgc3RhdGljIGdldE51bWJlcihrZXk6IHN0cmluZywgZGVmYXVsdFZhbHVlOiBudW1iZXIgPSAtMSk6IG51bWJlciB7XG4gICAgbGV0IHMgPSBQcm9wZXJ0aWVzLmdldChrZXkpO1xuICAgIGlmICghcykgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcblxuICAgIGxldCBuID0gTnVtYmVyKHMpO1xuICAgIHJldHVybiBpc05hTihuKSA/IGRlZmF1bHRWYWx1ZSA6IG47XG4gIH1cblxuICBzdGF0aWMgcmVtb3ZlKGtleTogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgbGV0IHYgPSBQcm9wZXJ0aWVzLmdldChrZXkpO1xuICAgIFByb3BlcnRpZXMuX3N0b3JhZ2UucmVtb3ZlSXRlbShrZXkpO1xuICAgIHJldHVybiB2O1xuICB9XG59XG4iLCJjbGFzcyBQY20ge1xuICBwcml2YXRlIHN0YXRpYyBfY2FjaGU6e1trZXk6IHN0cmluZ106IG51bWJlcltdfSA9IHt9O1xuXG4gIHByaXZhdGUgX2RhdGE6IG51bWJlcltdID0gW107XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmcmVxdWVuY3k6IG51bWJlciwgcHJpdmF0ZSB2b2x1bWUgPSAxKSB7XG4gIH1cblxuICBhcHBlbmQoZHVyYXRpb246IG51bWJlciwgc2lsZW5jZSA9IGZhbHNlKTogUGNtIHtcbiAgICBsZXQga2V5ID0gYCR7c2lsZW5jZSA/ICctJyA6ICcrJ30ke2R1cmF0aW9ufWA7XG4gICAgaWYgKFBjbS5fY2FjaGUuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgdGhpcy5fZGF0YSA9IHRoaXMuX2RhdGEuY29uY2F0KFBjbS5fY2FjaGVba2V5XSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBsZXQgY3ljbGUgPSA0NDEwMCAvIHRoaXMuZnJlcXVlbmN5O1xuICAgIGxldCBzYW1wbGVzID0gTWF0aC5mbG9vcigoZHVyYXRpb24gLyAxMDAwKSAqIDQ0MTAwKTtcblxuICAgIGxldCB0ZW1wOiBudW1iZXJbXSA9IFtdO1xuICAgIGlmIChzaWxlbmNlKSB7XG4gICAgICB0ZW1wID0gQXJyYXkuYXBwbHkobnVsbCwgQXJyYXkoc2FtcGxlcykpLm1hcChOdW1iZXIucHJvdG90eXBlLnZhbHVlT2YsMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGNvZWZmID0gMiAqIE1hdGguUEk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNhbXBsZXM7IGkrKykge1xuICAgICAgICB0ZW1wLnB1c2goTWF0aC5zaW4oY29lZmYgKiBpIC8gY3ljbGUpKTtcbiAgICAgIH1cblxuICAgICAgLy8gc21vb3RoIHRvbmVcbiAgICAgIGxldCBjOiBudW1iZXI7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1hdGgubWluKDIwMCwgc2FtcGxlcyk7IGkrKykge1xuICAgICAgICBjID0gaSAqIDEwMC8yMDAwMDtcbiAgICAgICAgdGVtcFtpXSA9IHRlbXBbaV0gKiBjO1xuXG4gICAgICAgIGxldCBlbmROZHggPSBzYW1wbGVzIC0gaSAtIDE7XG4gICAgICAgIHRlbXBbZW5kTmR4XSA9IHRlbXBbZW5kTmR4XSAqIGM7XG4gICAgICB9XG4gICAgfVxuXG4gICAgUGNtLl9jYWNoZVtrZXldID0gdGVtcDtcbiAgICB0aGlzLl9kYXRhID0gdGhpcy5fZGF0YS5jb25jYXQodGVtcCk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGdldCBkYXRhKCk6IG51bWJlcltdIHtcbiAgICByZXR1cm4gdGhpcy5fZGF0YTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgV2F2R2VuIHtcbiAgcHJpdmF0ZSBwY206IFBjbTtcblxuICBjb25zdHJ1Y3RvcihmcmVxdWVuY3kgPSA2ODAsIHZvbHVtZSA9IDEpIHtcbiAgICAgIHRoaXMucGNtID0gbmV3IFBjbShmcmVxdWVuY3ksIHZvbHVtZSk7XG4gIH1cblxuICBzdGF0aWMgZ2V0IHN1cHBvcnRlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHlwZW9mIGJ0b2EgPT09ICdmdW5jdGlvbicgJiYgZG9jdW1lbnQubG9jYXRpb24uc2VhcmNoLmluZGV4T2YoJ2h0bWw1JykgPCAwICYmIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2F1ZGlvJykuY2FuUGxheVR5cGUoJ2F1ZGlvL3dhdicpICE9PSAnJztcbiAgfVxuXG4gIGFwcGVuZChkdXJhdGlvbjogbnVtYmVyLCBzaWxlbmNlID0gZmFsc2UpOiBXYXZHZW4ge1xuICAgIHRoaXMucGNtLmFwcGVuZChkdXJhdGlvbiwgc2lsZW5jZSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBidWlsZCgpOiBzdHJpbmcge1xuICAgIGxldCBkYXRhID0gdGhpcy5wY20uZGF0YTtcbiAgICByZXR1cm4gdGhpcy5hcnJheTJkYXRhVVJJKGRhdGEpO1xuICB9XG5cbiAgcHJpdmF0ZSBwY20yd2F2KHBjbTogc3RyaW5nLCBzYW1wbGVSYXRlOiBudW1iZXIsIGJpdG46IG51bWJlcik6IHN0cmluZyB7XG4gICAgbGV0IGkzMiA9IHRoaXMuaTMydG9TdHJpbmc7XG4gICAgbGV0IGkxNiA9IHRoaXMuaTE2dG9TdHJpbmc7XG5cbiAgIHZhciByZXQ9XG4gICAgICdSSUZGJyArXG4gICAgIGkzMigzNiArIHBjbS5sZW5ndGgpICtcbiAgICAgJ1dBVkUnICtcbiAgICAgJ2ZtdCAnICtcbiAgICAgaTMyKDE2KSArXG4gICAgIGkxNigxKSArXG4gICAgIGkxNigxKSArXG4gICAgIGkzMihzYW1wbGVSYXRlKSArXG4gICAgIGkzMihzYW1wbGVSYXRlICogYml0biAvIDgpICtcbiAgICAgaTE2KGJpdG4gLyA4KSArXG4gICAgIGkxNihiaXRuKSArXG4gICAgICdkYXRhJyArXG4gICAgIGkzMihwY20ubGVuZ3RoKSArXG4gICAgIHBjbTtcbiAgIHJldHVybiByZXQ7XG4gfTtcblxuIHByaXZhdGUgYXJyYXkyZGF0YVVSSShhcnJheTogbnVtYmVyW10sIHNhbXBsZVJhdGUgPSA0NDEwMCwgYml0c1BlclNhbXBsZSA9IDE2KTogc3RyaW5nIHtcbiAgIHJldHVybiAnZGF0YTphdWRpby93YXY7YmFzZTY0LCcgK1xuICAgIGJ0b2EodGhpcy5wY20yd2F2KHRoaXMuYXJyYXkyYnl0ZXN0cmVhbShhcnJheSwgYml0c1BlclNhbXBsZSksIHNhbXBsZVJhdGUsIGJpdHNQZXJTYW1wbGUpKTtcbiB9O1xuXG4gcHJpdmF0ZSBpMTZ0b1N0cmluZyhuOiBudW1iZXIpOiBzdHJpbmcge1xuICAgIGxldCBuMSA9IG4gJiAoNjU1MzYgLSAxKTtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShuMSAmIDI1NSkgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKChuMSA+PiA4KSAmIDI1NSk7XG4gIH1cblxuICBwcml2YXRlIGkzMnRvU3RyaW5nKG46IG51bWJlcik6IHN0cmluZyB7XG4gICAgbGV0IG4xID0gbiAmICg2NTUzNiAqIDY1NTM2IC0gMSk7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUobjEgJiAyNTUpICsgU3RyaW5nLmZyb21DaGFyQ29kZSgobjEgPj4gOCkgJiAyNTUpICtcbiAgICAgIFN0cmluZy5mcm9tQ2hhckNvZGUoKG4xID4+IDE2KSAmIDI1NSkgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKChuMSA+PiAyNCkgJiAyNTUpO1xuICB9XG5cbiAgcHJpdmF0ZSBhcnJheTJieXRlc3RyZWFtKHg6IG51bWJlcltdLCBiaXRuOiBudW1iZXIpOiBzdHJpbmcge1xuICAgIGxldCByZXQgPSAnJztcbiAgICBsZXQgYyA9IFN0cmluZy5mcm9tQ2hhckNvZGU7XG4gICAgbGV0IHIgPSBNYXRoLnJvdW5kO1xuICAgIGxldCBuID0geC5sZW5ndGg7XG4gICAgbGV0IHk6IG51bWJlcjtcblxuICAgIGlmKGJpdG4gPT09IDgpIHtcbiAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBuIDsgKytpKSB7XG4gICAgICAgIHkgPSByKHhbaV0gKiAxMjcgKyAxMjgpICYgMjU1O1xuICAgICAgICByZXQgKz0gYyh5KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yKHZhciBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgICB5ID0gcih4W2ldICogMzI3NjcpICYgNjU1MzU7XG4gICAgICAgIHJldCArPSBjKCh5ID4+IDApICYgMjU1KSArIGMoKHkgPj4gOCkgJiAyNTUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH1cbn1cbiJdfQ==
