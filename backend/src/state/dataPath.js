let runtimeDataFilePath = null;

function setRuntimeDataFilePath(p) { runtimeDataFilePath = p; }
function getRuntimeDataFilePath() { return runtimeDataFilePath; }

module.exports = { setRuntimeDataFilePath, getRuntimeDataFilePath };
