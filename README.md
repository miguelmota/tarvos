# SAMI

> Speech Assessment Machine Intelligence

**Note!** This is currently an experimental project. Check out the [Roadmap](#roadmap) for goals of this project.

# Roadmap

The ultimate goal of *SAMI* to achieve this idea of Voice Driven Interfaces (VDI) and Voice Driven User Experience (VDUX) in native web applications. Speech recognition is an extremly difficult problem to solve and W3C is already taking steps forward with the [Web Speech API](https://dvcs.w3.org/hg/speech-api/raw-file/tip/speechapi.html). The API is at it's early stages and currently only Chrome has implemented the [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) standard. This is not ideal because it leaves other major browsers out of the picture, and the their API has to send the audio buffers over to their servers and return a response which causes another issue with latency and the user must be online for it to work. Fortunately, [Sylvain Chevalier](https://github.com/syl22-00) ported over the [CMU Sphinx](http://cmusphinx.sourceforge.net/) speech recognition library to JavaScript. With a little bit of manual work, this enable us the ability to incorporate speech recognition locally in the browser without having to rely on a third party, like Google. The only mandatory dependency we need is having support for the [getUserMedia API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getUserMedia) to grab the users audio stream.

Here are the long-term goals outlined.

- Incorprate machine learning to attain Speaker Dependant Speech Recognition with the goal of yielding higher accuracy.
- Create a command line tool to auto generate word lists and grammars based from learned corpora (bodies of text).
- Crawl website to collect corpora and hyperlink information to auto generate grammars for navigation.
- Add audible feedback, initiallly probably via [SpeechSynthesis Web API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

# Usage

At the moment this is a simple wrapper for [PocketSphinx.js](https://github.com/syl22-00/pocketsphinx.js), which is a port of [CMU Pocket Sphinx](http://cmusphinx.sourceforge.net/) compiled to JavaScript with [emscripten](https://github.com/kripken/emscripten). First head over to [CMUSphinx Tutorial](http://cmusphinx.sourceforge.net/wiki/tutorial) and learn the concepts of phonetic dictionaries, grammars, and keywords in speech recognition.

For retrieving word phonemes check out the [CMU Sphinx Pronouncing Dictionary](http://www.speech.cs.cmu.edu/cgi-bin/cmudict). Here is a wrapper in node, [cmusphinxdict](https://github.com/miguelmota/node-cmusphinxdict).

Below as example of using SAMI.

```javascript
SAMI.config({
  // Path to pocketsphinx libarary
  libPath: '../../lib/pocketsphinx'
});

// Add word phonemes
SAMI.addWords([
  ['OKAY', 'OW K EY'],
  ['SAMI', 'S AE M IY']
  ['GO', 'G OW'],
  ['TO', 'T UW'],
  ['SETTINGS', 'S EH T IH NG Z'],
  ['DASHBOARD', 'D AE SH B AO R D'],
  ['NAVIGATE', 'N AE V AH G EY T']
]);

/*
 * Add grammars.
 *
 * In this example, you can say things like:
 *  - "Go to dashboard"
 *  - "Navigate to dashboard"
 *  - "Navigate to settings"
 *  - "Go to settings"
 */
SAMI.addGrammars([
  {
    title: 'NAVIGATE',
    g: {
      start: 0,
      end: 3,
      numStates: 8,
      transitions: [
        {from: 0, to: 1, word: 'NAVIGATE'},
        {from: 0, to: 1, word: 'GO'},
        {from: 1, to: 2, word: 'TO'},
        {from: 2, to: 3, word: 'SETTINGS'},
        {from: 2, to: 3, word: 'DASHBOARD'},
        {from: 0, to: 3, word: ''}
      ]
    }
  }
]);

// Add keywords
SAMI.addKeywords([
  {
    title: 'OKAY_SAMI',
    g: 'OKAY SAMI'
  }
]);

SAMI.on('recognizerReady', function() {
  console.log('Recognizer ready');
});

SAMI.on('recorderReady', function() {
  console.log('Audio recorder ready');
});

// Invoked when both recognizer and recorder are ready.
SAMI.on('ready', function() {
  console.log('Ready');

  var keywordIds = SAMI.getKeywordIds();

  // Start listening to "OKAY SAMI" keyword
  SAMI.listen(keywordIds[0].id);
});

// Word hypothesis
SAMI.on('hyp', function(hyp, isFinal) {
  var keywordIds = SAMI.getKeywordIds();
  var grammarIds = SAMI.getGrammarIds();

  if (hyp === 'OKAY SAMI') {
    SAMI.stopListenening();
    SAMI.startListening(grammarIds[0].id);
  }
  if (hyp === 'GO TO SETTINGS') {
    // isFinal is set after call to stopListening
    if (isFinal) {
      speechSynthesis.speak(new SpeechSynthesisUtterance('Routing to settings.'));
    }
    SAMI.stopListenening();
    SAMI.startListening(keywordIds[0].id);
  }

  if (outputContainer) {
    outputContainer.innerHTML = hyp;
  }
});

SAMI.on('error', function(error) {
  console.error(error);
});
```

# License

[PocketSphinx](https://github.com/syl22-00/pocketsphinx.js) is released under the MIT License.

SAMI is released under the MIT License.
