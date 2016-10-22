import Promise from 'bluebird';
import ChromeRuntimeError from './ChromeRuntimeError';

const removeStorage = function(key) {
  return new Promise(function(resolve, reject) {
    chrome.storage.local.remove(key, function() {
      if (chrome.runtime.lastError) {
        return reject(new ChromeRuntimeError());
      }

      resolve();
    });
  });
};

const setStorage = function(key, value) {
  return new Promise(function(resolve, reject) {
    chrome.storage.local.set({ [key]: value }, function() {
      if (chrome.runtime.lastError) {
        return reject(new ChromeRuntimeError());
      }

      resolve();
    });
  });
};

const getStorage = function(key) {
  return new Promise(function(resolve, reject) {
    chrome.storage.local.get(key, function(result) {
      if (chrome.runtime.lastError) {
        return reject(new ChromeRuntimeError());
      }

      resolve(result);
    });
  });
};

const clearStorage = function() {
  return new Promise(function(resolve, reject) {
    chrome.storage.local.clear(function() {
      if (chrome.runtime.lastError) {
        return reject(new ChromeRuntimeError());
      }

      resolve();
    });
  });
};

module.exports = {
  setStorage,
  getStorage,
  clearStorage
};
