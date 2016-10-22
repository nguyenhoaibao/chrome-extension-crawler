const ChromeRuntimeError = function(message) {
  const _message = message ||
    `Chrome runtime last error: ${chrome.runtime.lastError.message}`;

  Error.call(this, _message);
  this.message = _message;
};

ChromeRuntimeError.prototype = Object.create(Error.prototype);
ChromeRuntimeError.prototype.constructor = ChromeRuntimeError;

export default ChromeRuntimeError;
