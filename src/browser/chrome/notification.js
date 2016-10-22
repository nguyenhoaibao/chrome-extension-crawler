import Promise from 'bluebird';
import ChromeRuntimeError from './ChromeRuntimeError';

const createBasicNotification = function({
  title = '',
  message = '',
  iconUrl = 'images/icon_small.jpg'
}) {
  return new Promise(function(resolve, reject) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl,
      title,
      message
    }, function(notificationId) {
      if (chrome.runtime.lastError) {
        return reject(new ChromeRuntimeError());
      }

      resolve(notificationId);
    });
  });
};

const createProgressNotification = function({
  iconUrl = 'images/icon_small.jpg',
  progress = 0,
  title = '',
  message = ''
}) {
  return new Promise(function(resolve, reject) {
    chrome.notifications.create({
      type: 'progress',
      iconUrl,
      title,
      message,
      progress
    }, function(notificationId) {
      if (chrome.runtime.lastError) {
        return reject(new ChromeRuntimeError());
      }

      resolve(notificationId);
    });
  });
};

module.exports = {
  createBasicNotification,
  createProgressNotification
};
