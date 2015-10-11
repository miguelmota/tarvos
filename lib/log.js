'use strict';

const util = require('util');

function log(obj) {
  console.log(util.inspect(obj, {depth: 20}));
}

module.exports = log;
