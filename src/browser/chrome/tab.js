import Promise from 'bluebird';
import ChromeRuntimeError from './ChromeRuntimeError';

const openTab = function(url, { window = {}, windowOptions = {} } = {}) {
  return Promise.resolve()
    .then(function() {
      if (window.id) {
        return window.id;
      }

      return new Promise(function(resolve, reject) {
        chrome.windows.getCurrent(function(window) {
          if (chrome.runtime.lastError) {
            return reject(new ChromeRuntimeError());
          }

          if (!window.id) {
            return reject(new Error('Cannot get window id'));
          }

          return resolve(window.id);
        });
      });
    })
    .then(function(windowId) {
      return new Promise(function(resolve, reject) {
        chrome.tabs.create({ url, windowId }, function(tab) {
          if (chrome.runtime.lastError) {
            return reject(new ChromeRuntimeError());
          }

          chrome.windows.update(windowId, windowOptions, function() {
            return resolve(tab);
          });
        });
      });
    })
    .catch(function(error) {
      return Promise.reject(error);
    });
};

const getTabStatus = function(tabId) {
  return new Promise(function(resolve, reject) {
    chrome.tabs.get(tabId, function(tab) {
      resolve(tab.status);
    });
  });
};

const waitUntilTabLoaded = function(tab) {
  const tabId = tab.id;

  return getTabStatus(tabId)
    .then(function(status) {
      if (status !== 'complete') {
        return waitUntilTabLoaded(tab);
      }

      return Promise.resolve(tab);
    });
};

const getCurrentTabId = function(windowId) {
  return new Promise(function(resolve, reject) {
    chrome.tabs.query({ windowId, active: true }, function(arrTab) {
      const currentTab = arrTab[0];

      resolve(currentTab.id);
    });
  });
};

const closeTab = function(tab) {
  const tabId = tab.id;

  return Promise.resolve()
    .then(function() {
      if (!tabId) {
        return Promise.reject(new Error('Cannot get current tab!'));
      }

      return tabId;
    })
    .then(function(tabId) {
      return new Promise(function(resolve, reject) {
        chrome.tabs.remove(tabId, function() {
          resolve();
        });
      })
    })
    .catch(function(error) {
      return Promise.reject(error);
    });
};

const sendMessage = function(tabId, message) {
  return new Promise(function(resolve, reject) {
    chrome.tabs.sendMessage(tabId, message, function(response) {
      resolve(response);
    });
  });
};

export {
  openTab,
  closeTab,
  getCurrentTabId,
  sendMessage,
  getTabStatus,
  waitUntilTabLoaded
};
