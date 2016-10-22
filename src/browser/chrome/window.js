import Promise from 'bluebird';
import ChromeRuntimeError from './ChromeRuntimeError';

const openWindow = function(
  url,
  { type = 'popup', state = 'normal', focused = false } = {}
) {
  return new Promise(function(resolve, reject) {
    chrome.windows.create({
      url,
      type,
      state
    }, function(window) {
      if (chrome.runtime.lastError) {
        return reject(new ChromeRuntimeError());
      }

      const windowId = window.id;

      if (!window || !window.id) {
        return reject(new Error('Cannot get window id'));
      }

      return resolve(window);
    });
  });
};

// const openWindow = function(url, params = {}) {
//   return new Promise(function(resolve, reject) {
//     let options = {
//       state: 'normal'
//     };
//
//     if (Object.keys(params).length) {
//       options = Object.assign(options, params);
//     }
//
//     const createData = Object.assign({ url, type: 'popup' }, options);
//
//     chrome.windows.create(createData, function(window) {
//       if (chrome.runtime.lastError) {
//         return reject(new ChromeRuntimeError());
//       }
//
//       const windowId = window.id;
//
//       if (!window || !windowId) {
//         return reject(new Error('Cannot get window id'));
//       }
//
//       chrome.windows.update(windowId, options, function() {
//         return resolve(window);
//       });
//     });
//   });
// };

const getWindowById = function(windowId) {
  return new Promise(function(resolve, reject) {
    chrome.windows.get(windowId, function(_window) {
      if (!_window) {
        return resolve('');
      }

      resolve(_window);
    });
  });
};

const closeWindow = function(windowId) {
  return getWindowById(windowId)
    .then(function(_window) {
      if (!_window) {
        return Promise.resolve();
      }

      return new Promise(function(resolve, reject) {
        chrome.windows.remove(windowId, function() {
          return resolve();
        });
      });
    })
    .catch(function(error) {
      return Promise.reject(error);
    });
};

const blockImageLoading = function() {
  return Promise.resolve();

  return new Promise(function(resolve, reject) {
    chrome.contentSettings.images.set({
      primaryPattern: 'https://www.facebook.com/*',
      setting: 'block',
      scope: 'regular'
    }, function() {
      if (chrome.runtime.lastError) {
        return reject(new ChromeRuntimeError());
      }

      resolve();
    });
  });
};

const allowImageLoading = function() {
  return Promise.resolve();

  return new Promise(function(resolve, reject) {
    chrome.contentSettings.images.clear({ scope: 'regular' }, function() {
      if (chrome.runtime.lastError) {
        return reject(new ChromeRuntimeError());
      }

      resolve();
    });
  });
};

export { openWindow, closeWindow, blockImageLoading, allowImageLoading };
