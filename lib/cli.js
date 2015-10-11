'use strict';

const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const chalk = require('chalk');
const minimist = require('minimist');
const argv = minimist(process.argv.slice(2));
const compileVocabulary = require('./compile-vocabulary');
const bundlefy = require('./bundlefy');

function resolveConfig(config) {
  const configDirPath = _.get(config, 'configDirPath');

  if (!_.isString(configDirPath)) {
    console.error(chalk.red(new ReferenceError('Must use config path.')));
    return false;
  }

  const intentUtterancesFile = path.resolve(
    process.cwd(),
    configDirPath,
    _.get(config, 'intentUtterances.src', '../config/IntentUtteranceFileParser.txt')
  );

  const vocabularyOutFile = path.resolve(
    process.cwd(),
    configDirPath,
    _.get(config, 'vocabulary.dist', '../config/vocabulary.json')
  );

  const pronouncingDictionaryFile = path.resolve(
    process.cwd(),
    configDirPath,
    _.get(config, 'vocabulary.pronouncingDictionary', '../config/pronouncingDictionary.json')
    );

  const bundleOutFile = path.resolve(
    process.cwd(),
    configDirPath,
    _.get(config, 'bundle.dist', '../config/bundle.min.js')
    );

  return {
    intentUtterancesFile: intentUtterancesFile,
    vocabularyOutFile: vocabularyOutFile,
    pronouncingDictionaryFile: pronouncingDictionaryFile,
    bundleOutFile: bundleOutFile
  };
}

const tasks = {
  bundle: function(options) {
    config = resolveConfig(_.get(options, 'config'));

    const bundleOutFileStream = fs.createWriteStream(config.bundleOutFile);
    const vocabularyFileStream = fs.createReadStream(config.vocabularyOutFile);

    bundlefy({
      bundleOutFileStream: bundleOutFileStream,
      vocabularyFileStream: vocabularyFileStream
    }).on('error', function(error) {
      console.error(chalk.red(error));
    }).on('close', function() {
      console.log(chalk.green('Bundle complete.'));
    });
  },

  compile: {
    vocabulary: function(options) {
      config = resolveConfig(_.get(options, 'config'));

      const utterancesFileStream = fs.createReadStream(config.intentUtterancesFile);
      const vocabularyOutFileStream = fs.createWriteStream(config.vocabularyOutFile);
      const pronouncingDictionaryFileStream = fs.createReadStream(config.pronouncingDictionaryFile);

      compileVocabulary({
        utterancesFileStream: utterancesFileStream,
        vocabularyOutFileStream: vocabularyOutFileStream,
        pronouncingDictionaryFileStream: pronouncingDictionaryFileStream
      }).on('error', function(error) {
        console.error(chalk.red(error));
      }).on('end', function() {
        console.log(chalk.green('Compile vocabulary complete.'));
      });
    }
  }
};

const compileArg = _.get(argv, 'compile');
const bundleArg = _.first(_.get(argv, '_'));

const configArg = _.get(argv, 'config');

let config = null;

if (_.isString(configArg)) {
  const configFilePath = path.resolve(process.cwd(), configArg);
  const configDirPath = configFilePath.split('/').slice(0, -1).join('/');
  config = require(configFilePath);
  config.configFilePath = configFilePath;
  config.configDirPath = configDirPath;
}

if (_.isString(compileArg)) {
  const task = _.get(tasks, ['compile', compileArg]);

  if (_.isFunction(task)) {
    task({
      config: config
    });
  } else {
    console.error('task not found');
  }
} else if (_.isString(bundleArg)) {
  const task = _.get(tasks, 'bundle');

  if (_.isFunction(task)) {
    task({
      config: config
    });
  } else {
    console.error('task not found');
  }
} else {
  console.error('option not found');
}
