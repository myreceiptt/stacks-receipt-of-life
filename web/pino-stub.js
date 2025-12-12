// Lightweight no-op "pino" stub for browser builds.
// This avoids pulling in thread-stream and its Node-only test files.

function createLogger() {
  const noop = () => {};
  const logger = {
    info: noop,
    error: noop,
    warn: noop,
    debug: noop,
    trace: noop,
    fatal: noop,
    child: () => logger,
  };
  return logger;
}

function pino() {
  return createLogger();
}

// Some code paths expect pino.destination()
pino.destination = () => ({ write: () => {} });

module.exports = pino;
module.exports.default = pino;
