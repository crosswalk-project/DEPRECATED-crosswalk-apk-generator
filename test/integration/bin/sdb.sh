#!/usr/bin/env node
var exitCodes = {};

var cliExitCodes = process.argv[2].split(',');
var commandAndCode;
for (var i = 0; i < cliExitCodes.length; i += 1) {
  commandAndCode = cliExitCodes[i].split(':');
  exitCodes[commandAndCode[0]] = parseInt(commandAndCode[1]);
}

var command = process.argv[3];
var exitCode = exitCodes[command];

process.exit(exitCode);
