(function(root) {
  'use strict';

  /**
   * SAMI
   */
  var SAMI = (function() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    window.URL = window.URL || window.webkitURL;

    /**
     * Global variables
     */
    var g_libPath;
    var g_recognizer;
    var g_recorder;
    var g_callbackManager;
    var g_audioContext;
    var g_words = [];
    var g_keywords = [];
    var g_grammars = [];
    var g_grammarIds = [];
    var g_keywordIds = [];
    var g_activateKeyword;

    var g_recorderReady = false;
    var g_recognizerReady = false;
    var g_observableCallbacks = {};

    /**
     * _size
     */
    function _size(v) {
      return ('length' in v) ? v.length : 0;
    }

    /**
     * _slice
     */
    function _slice(v, i) {
      return [].slice.call(v, i);
    }

    /**
     * _hasOwnProperty
     */
    function _hasOwnProperty(obj, prop) {
      return Object.hasOwnProperty.call(obj, prop);
    }

    /**
     * on
     */
    function on(name, fn) {
      if (typeof fn !== 'function') {
        throw new TypeError('Second argument for "on" method must be a function.');
      }
      (g_observableCallbacks[name] = g_observableCallbacks[name] || []).push(fn);
    }

    /**
     * one
     */
    function one(name, fn) {
      fn.one = true;
      return on(name, fn);
    }

    /**
     * off
     */
    function off(name, fn) {
      if (name === '*') return (g_observableCallbacks = {}, g_observableCallbacks);
      if (!g_observableCallbacks[name]) return;
      if (fn) {
        if (typeof fn !== 'function') {
          throw new TypeError('Second argument for "off" method must be a function.');
        }
        g_observableCallbacks[name] = g_observableCallbacks[name].map(function(fm, i) {
          if (fm === fn) {
            g_observableCallbacks[name].splice(i, 1);
          }
        });
      } else {
        delete g_observableCallbacks[name];
      }
    }

    /**
     * trigger
     */
    function trigger(name /*, args */) {
      if (!g_observableCallbacks[name] || !_size(g_observableCallbacks[name])) return;
      var args = _slice(arguments, 1);

      g_observableCallbacks[name].forEach(function(fn, i) {
        if (fn) {
          fn.apply(fn, args);
          if (fn.one) {
            g_observableCallbacks[name].splice(i, 1);
          }
        }
      });
    }

    /**
     * initRecognizer
     */
    function initRecognizer() {
      // You can pass parameters to the recognizer,
      // such as : {command: 'initialize', data: [["-hmm", "my_model"], ["-fwdflat", "no"]]}
      postRecognizerJob({
        command: 'initialize',
        data: [
          // Threshold for p(hyp)/p(alternatives) ratio
          ["-kws_threshold", "2"]
        ]
      }, initCallback);

      function initCallback() {
        feedWords(g_words, feedWordsCallback);
      }

      function feedWordsCallback() {
        feedGrammar(g_grammars, 0);
      }
    }

    /**
     * recognizerLoaded
     * @desc Callback for when recognizer worker is loaded.
     */
    function recognizerLoaded(recognizer) {
      recognizer.onmessage = function(event) {
        if (_hasOwnProperty(event.data, 'id')) {
          var callback = g_callbackManager.get(event.data.id);
          var data = {};
          if (_hasOwnProperty(event.data, 'data')) {
            data = event.data.data;
          }
          if (callback) {
            callback(data);
          }
        }

        // New hypothesis
        if (_hasOwnProperty(event.data, 'hyp')) {
          var hyp = event.data.hyp;
          var isFinal = false;
          if (_hasOwnProperty(event.data, 'final')) {
            isFinal = event.data.final;
          }
          if (hyp) {
            onHyp(hyp, isFinal);
          }
        }

        if (_hasOwnProperty(event.data, 'status') && event.data.status === 'error') {
          onError(event.data);
        }
      };

      initRecognizer();
    }

    /**
     * recognizerReady
     */
    function recognizerReady() {
       g_recognizerReady = true;
        onRecognizerReady();
       checkReady();
    }

    /**
     * checkReady
     */
    function checkReady() {
      if (g_recognizerReady && g_recorderReady) {
        onReady();
      }
    }

    /**
     * onRecognizerReady
     */
    function onRecognizerReady() {
      trigger('recognizerReady');
    }

    /**
     * onRecorderReady
     */
    function onRecorderReady() {
      trigger('recorderReady');
    }

    /**
     * onReady
     * @desc Invoked when recognizer and recorder are ready.
     */
    function onReady() {
      trigger('ready');
    }

    /**
     * onHyp
     */
    function onHyp(hyp, isFinal) {
      trigger('hyp', hyp, isFinal);
    }

    /**
     * onError
     */
    function onError(error) {
      trigger('error', error);
    }

    /**
     * onAudioRecorderError
     */
    function onAudioRecorderError(error) {
      onError(error);
    }

    /**
     * startUserMedia
     */
    function startUserMedia(stream) {
      var input = g_audioContext.createMediaStreamSource(stream);

      // Firefox hack https://support.mozilla.org/en-US/questions/984179
      window.firefox_audio_hack = input;

      var config = {
        errorCallback: function(error) {
          onAudioRecorderError(error);
        }
      };

      g_recorder = new AudioRecorder(input, config);

      if (g_recognizer) {
        g_recorder.consumers.push(g_recognizer);
      }

      g_recorderReady = true;
      onRecorderReady();
      checkReady();
    }

    /**
     * config
     */
    function config(options) {
      options = options || {};

      g_libPath = options.libPath || './lib/pocketsphinx';
    }

    /**
     * main
     * @desc Main init function.
     */
    function main() {
      g_callbackManager = new CallbackManager();
      g_recognizer = spawnWorker(g_libPath + '/recognizer.js', recognizerLoaded);
      getAudio();
    }

    /**
     * spawnWorker
     * @desc Instantiates a new recognizer worker.
     */
    function spawnWorker(workerURL, onReady) {
      var recognizer = new Worker(workerURL);

      recognizer.onmessage = function(event) {
        onReady(recognizer);
      };

      // Initialize
      recognizer.postMessage(g_libPath + '/pocketsphinx.js');
      return recognizer;
    }

    /**
     * postRecognizerJob
     */
    function postRecognizerJob(message, callback) {
      message = message || {};
      if (g_callbackManager) {
        message.callbackId = g_callbackManager.add(callback);
      }
      if (g_recognizer) {
        g_recognizer.postMessage(message);
      }
    }

    /**
     * getAudio
     */
    function getAudio() {
      try {
        g_audioContext = new AudioContext();
      } catch (error) {
        onError(error);
      }

      if (navigator.getUserMedia) {
        navigator.getUserMedia({
          audio: {mandatory:
            {googEchoCancellation: false,
              googAutoGainControl: false,
              googNoiseSuppression: false,
              googHighpassFilter: false
            },
            optional: []
          }
        }, startUserMedia, getUserMediaError);
      } else {
        onError(new Error('No web audio support.'));
      }

      function getUserMediaError(error) {
        onError(error);
      }
    }

    /**
     * feedWords
     */
    function feedWords(words, callback) {
      postRecognizerJob({
        command: 'addWords',
        data: words
      }, callback);
    }

    /**
     * feedGrammar
     */
    function feedGrammar(g, index, id) {
      if (id && (g_grammarIds.length > 0)) {
        g_grammarIds[0].id = id.id;
      }
      if (index < g.length) {
        g_grammarIds.unshift({title: g[index].title});
        postRecognizerJob({
          command: 'addGrammar',
          data: g[index].g
        }, addGrammarCallback);
      } else {
        feedKeyword(g_keywords, 0);
      }

      function addGrammarCallback(id) {
        feedGrammar(g_grammars, index + 1, {id:id});
      }
    }

    /**
     * feedKeyword
     */
    function feedKeyword(g, index, id) {
      if (id && (g_keywordIds.length > 0)) {
        g_keywordIds[0].id = id.id;
      }
      if (index < g.length) {
        g_keywordIds.unshift({title: g[index].title});
        postRecognizerJob({
          command: 'addKeyword',
          data: g[index].g
        }, feedKeywordCallback);
      } else {
        recognizerReady();
      }

      function feedKeywordCallback(id) {
        feedKeyword(g_keywords, index + 1, {id:id});
      }
    }

    /**
     * addWords
     */
    function addWords(words) {
      g_words = g_words.concat(words);
    }

    /**
     * addGrammars
     */
    function addGrammars(grammars) {
      g_grammars = g_grammars.concat(grammars);
    }

    /**
     * addKeywords
     */
    function addKeywords(keywords) {
      g_keywords = g_keywords.concat(keywords);
    }

    /**
     * getGrammarIds
     */
    function getGrammarIds() {
      return g_grammarIds;
    }

    /**
     * getKeywordIds
     */
    function getKeywordIds() {
      return g_keywordIds;
    }

    /**
     * listen
     */
    function listen(grammarId) {
      return g_recorder && g_recorder.start(grammarId);
    }

    /**
     * stopListening
     */
    function stopListening() {
      return g_recorder && g_recorder.stop();
    }

    /**
     * setActivateKeyword
     */
    function setActivateKeyword(keyword) {
      g_activateKeyword = keyword;
    }

    setTimeout(main, 0);

    return {
      config: config,
      on: on,
      addWords: addWords,
      addGrammars: addGrammars,
      addKeywords: addKeywords,
      listen: listen,
      stopListening: stopListening,
      setActivateKeyword: setActivateKeyword,
      getGrammarIds: getGrammarIds,
      getKeywordIds: getKeywordIds
    };
  })();

  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = SAMI;
    }
    exports.SAMI = SAMI;
  } else if (typeof define === 'function' && define.amd) {
    define([], function() {
      return SAMI;
    });
  } else {
    root.SAMI = SAMI;
  }
})(this);
