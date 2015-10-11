'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const _ = require('lodash');
const chalk = require('chalk');
const IntentUtteranceFileParser = require('intent-utterance-file-parser');
const CMUSphinxDict = require('cmusphinxdict');
const log = require('./log');

function compileVocabulary(options) {
  const utterancesFileStream = _.get(options, 'utterancesFileStream');
  const vocabularyOutFileStream = _.get(options, 'vocabularyOutFileStream');
  const pronouncingDictionaryFileStream = _.get(options, 'pronouncingDictionaryFileStream');

  if (pronouncingDictionaryFileStream) {
    CMUSphinxDict.addPronouncings(pronouncingDictionaryFileStream, function(error, words, pronouncings) {
      if (error) {
        console.error(chalk.red(error));
      } else {
        parseIntentFile();
      }
    });
  } else {
    parseIntentFile();
  }

  function parseIntentFile() {
    IntentUtteranceFileParser(utterancesFileStream, function(error, response) {
      if (error) {
        vocabularyOutFileStream.emit('error', error);
        return false;
      }

      const uniqueWords = IntentUtteranceFileParser.getUniqueWords(response);
      CMUSphinxDict.get(uniqueWords, function(words, pronouncings) {
        const zipped = [];
        _.each(pronouncings, function(wordPronouncings, i) {
          _.each(wordPronouncings, function(pronouncing, j) {
            var name = words[i];
            if (j > 0) {
              name += `(${j+1})`;
            }

            zipped.push([name, pronouncing]);
          });
        });

        vocabularyOutFileStream.write(JSON.stringify(zipped, null, 2));
        vocabularyOutFileStream.emit('end');
      });
    });
  }

  return vocabularyOutFileStream;
}

module.exports = compileVocabulary;
