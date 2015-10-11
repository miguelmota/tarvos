Tarvos.addGrammars([
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

Tarvos.addKeywords([
  {
    title: 'OKAY_TARVOS',
    g: 'OKAY TARVOS'
  }
]);

Tarvos.setActivateKeyword('OKAY_TARVOS');

Tarvos.on('ready', function() {
  console.log('Ready');
  updateGrammars();
  startBtn.disabled = stopBtn.disabled = false;
  var keywordIds = Tarvos.getKeywordIds();
  selectTag.querySelector('[value="'+keywordIds[0].id+'"]').selected = true;
  startRecording();
});

Tarvos.on('recognizerReady', function() {
  console.log('recognizer ready');
  updateStatus('Recognizer ready');
});

Tarvos.on('recorderReady', function() {
  console.log('Audio recorder ready');
  updateStatus('Audio recorder ready');
});

Tarvos.on('activate', function() {
  console.log('Activated');
});

Tarvos.on('hyp', function(hyp, isFinal) {
  var keywordIds = Tarvos.getKeywordIds();
  var grammarIds = Tarvos.getGrammarIds();
  console.log('hyp', hyp)

  if (hyp === 'OKAY TARVOS') {
    selectTag.querySelector('[value="'+grammarIds[0].id+'"]').selected = true;
    stopRecording();
    startRecording();
  }
  if (hyp === 'GO TO SETTINGS') {
    // set after call to stop
    if (isFinal) {
      speechSynthesis.speak(new SpeechSynthesisUtterance('Routing to settings.'));
    }
    stopRecording();
    selectTag.querySelector('[value="'+keywordIds[0].id+'"]').selected = true;
    startRecording();
  }

  if (outputContainer) {
    outputContainer.innerHTML = hyp;
  }
});

Tarvos.on('error', function(error) {
  console.error(error);
});

function startRecording() {
  var grammarId = document.getElementById('grammars').value;
  if (Tarvos.listen(grammarId)) {
    displayRecording(true);
  }
  updateStatus('Ready and listening');
}

function stopRecording() {
  Tarvos.stopListening();
  displayRecording(false);
  updateStatus('Stopped listening');
}

function updateGrammars() {
  var grammarIds = Tarvos.getGrammarIds();
  var keywordIds = Tarvos.getKeywordIds();
  var el;
  var i;
  for (i = 0 ; i < grammarIds.length ; i++) {
    el = document.createElement('option');
    el .value=grammarIds[i].id;
    el.innerHTML = grammarIds[i].title;
    selectTag.appendChild(el);
  }
  for (i = 0 ; i < keywordIds.length ; i++) {
    el = document.createElement('option');
    el.value = keywordIds[i].id;
    el.innerHTML = keywordIds[i].title;
    selectTag.appendChild(el);
  }
}

function displayRecording(display) {
  if (display) {
    document.getElementById('recording-indicator').innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
  } else {
    document.getElementById('recording-indicator').innerHTML = '';
  }
}

function updateStatus(newStatus) {
  document.getElementById('current-status').innerHTML += '<br>' + newStatus;
}

var outputContainer = document.getElementById('output');
var selectTag = document.getElementById('grammars');
var startBtn = document.getElementById('startBtn');
var stopBtn = document.getElementById('stopBtn');

updateStatus('Initializing web audio and speech recognizer, waiting for approval to access the microphone');

startBtn.disabled = true;
stopBtn.disabled = true;
startBtn.onclick = startRecording;
stopBtn.onclick = stopRecording;
