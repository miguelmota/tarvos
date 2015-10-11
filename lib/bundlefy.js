'use strict';

const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const chalk = require('chalk');
const log = require('./log');
const concatStream = require('concat-stream')

function handleStreamError(error) {
  console.error(chalk.red(error));
}

function bundlefy(options) {
  const bundleOutFileStream = _.get(options, 'bundleOutFileStream');
  const vocabularyFileStream = _.get(options, 'vocabularyFileStream');
  const tarvosClientFile = path.resolve(__dirname, '../client/tarvos.js');
  const tarvosClientFileStream = fs.createReadStream(tarvosClientFile);

  tarvosClientFileStream.pipe(concatStream(gotTarvosContent));

  function gotTarvosContent(buffer) {
    bundleOutFileStream.write(`${buffer.toString()}`);
    vocabularyFileStream.pipe(concatStream(gotVocabulary));
  }

  function gotVocabulary(buffer) {

    const tarvosInitConfig = `Tarvos.config({
      pocketsphinxPath: '/client/vendor/pocketsphinx'
    });`;

    const tarvosVocabProp = `Tarvos.__compiledVocabulary = ${buffer.toString()};`;
    const tarvosAddWords = `Tarvos.addWords(Tarvos.__compiledVocabulary);`;

    bundleOutFileStream.write(`${tarvosInitConfig}${tarvosVocabProp}${tarvosAddWords}`);
    bundleOutFileStream.end();
  }

  return bundleOutFileStream;
}

module.exports = bundlefy;
