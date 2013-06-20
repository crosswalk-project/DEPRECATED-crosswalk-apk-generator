#!/usr/bin/env node
var behaviours = {
  failPush: {
    exitCodes: {push: 1}
  },
  failShell: {
    exitCodes: {shell: 1}
  }
};

var requestedBehaviour = behaviours[process.argv[2]];

console.log(requestedBehaviour);

var exitCode = 0;
if (requestedBehaviour &&
    requestedBehaviour.exitCodes &&
    requestedBehaviour.exitCodes[command]) {
  exitCode = requestedBehaviour.exitCodes[command];
}

process.exit(exitCode);
