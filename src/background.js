import moment from 'moment';
import Promise from 'bluebird';

import { getPagePostsComments } from './lib/fb';
import { exportPostsToCsv } from './lib/util';
import { setStorage, getStorage, clearStorage } from './browser/chrome/storage';
import {
  createBasicNotification,
  createProgressNotification
} from './browser/chrome/notification';
import {
  openWindow,
  closeWindow,
  blockImageLoading,
  allowImageLoading
} from './browser/chrome/window';

import {
  openTab,
  sendMessage,
  waitUntilTabLoaded
} from './browser/chrome/tab';

import {
  STORAGE_POSTS,
  STORAGE_KEYWORDS,
  NOTIFICATION_TITLE
} from './constant';

import ChromeRuntimeError from './browser/chrome/ChromeRuntimeError';

const LIMIT_RETRIES_OPEN_WINDOW = 3;
let retriesOpenWindow = 0;

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
  const { action, params } = request;

  switch (action) {
    case 'crawl-keywords':
      searchPostsByKeywords(params);
      break;
    case 'view-keyword':
      viewPostsByKeyword(params);
      break;
    default:
      break;
  }
});

const searchPostsByKeywords = function(params) {
  const {
    searchUrls,
    keywords,
    limit,
    limitType,
    pauseTimeInSecs
  } = params;

  const allPosts = {};

  return Promise.all([clearStorage(), blockImageLoading()])
    .then(function() {
      return setStorage(STORAGE_KEYWORDS, keywords);
    })
    .then(function() {
      return createBasicNotification({
        title: NOTIFICATION_TITLE,
        message: `Crawl ${keywords.length} keywords: ${keywords.join(', ')}`
      });
    })
    .then(function() {
      return Promise.each(searchUrls, function(searchUrl, idxSearchUrl) {

        return Promise.each(keywords, function(_keyword, idxKeyword) {

          const keyword = _keyword.trim();

          return createProgressNotificationForKeywords({
              currentKeyword: keyword,
              nextKeyword: keywords[idxKeyword + 1],
              crawledKeywords: Object.keys(allPosts),
              keywords
            })
            .then(function() {
              allPosts[keyword] = allPosts[keyword] || { posts: [], errors: [] };

              return searchPostsByKeyword({ searchUrl, keyword, limit, limitType, pauseTimeInSecs })
            })
            .then(function(params) {
              const { posts, error = {} } = params;

              allPosts[keyword].posts = allPosts[keyword].posts.concat(posts);

              if (Object.keys(error).length) {
                allPosts[keyword].errors = allPosts[keyword].errors.concat(error);
              }

              return onParsePostsSuccess(posts);
            })
            .then(function() {
              return createProgressNotificationForKeywords({
                currentKeyword: '',
                nextKeyword: keywords[idxKeyword + 1],
                crawledKeywords: Object.keys(allPosts),
                keywords,
                additionalMessage: idxKeyword !== keywords.length - 1 ?
                  'Sleeping time before go next' :
                  ''
              });
            })
            .then(function() {
              if (idxSearchUrl === searchUrls.length - 1
                && idxKeyword === keywords.length - 1) {
                return Promise.resolve();
              }

              return new Promise(function(resolve) {
                setTimeout(function() {
                  resolve();
                }, 8.5 * 1000);
              });
            });
        });
      });
    })
    .then(function() {
      return setStorage(STORAGE_POSTS, allPosts);
    })
    .then(function() {
      finalHandler(allPosts);

      openTab(
        chrome.extension.getURL('result.html'),
        { windowOptions: { focused: true }}
      );
    })
    .catch(function(error) {
      console.log(error);
      console.log(error.stack);

      // chrome runtime error
      if (error instanceof ChromeRuntimeError) {
        // retry again
        if (retriesOpenWindow < LIMIT_RETRIES_OPEN_WINDOW) {
          retriesOpenWindow++;

          return searchPostsByKeywords(params);
        }
      }

      // connection refused, access denied due to CORS...
      /* if (error.readyState === 0) {
        // auto enable export posts if error occured
        return finalHandler(allPosts, {
          message: '**** ERROR: CANNOT CONNECT TO IMPORT SERVER! ****\n\n',
          isEnableExportPosts: true
        });
      } */
    })
    .finally(function() {
      return allowImageLoading();
    });
};

const finalHandler = function(allPosts) {
  let message = `Crawl all keywords success at ${moment().format('YYYY-MM-DD HH:mm')}\n\n`;

  Object.keys(allPosts).forEach(function(keyword) {
    const posts = allPosts[keyword].posts;
    const errors = allPosts[keyword].errors;

    message += `Keyword: "${keyword}" - ${posts.length} posts`;

    if (errors.length) {
      errors.forEach(function(error) {
        if (error.is_crashed) {
          message += ' (Crashed)';
        }
      });
    }

    message += '\n';
  });

  message += '\nPress OK to view data';

  alert(message);
};

const onReceiveResponse = function(window, params, keyword) {
  return closeWindow(window.id)
    .then(function() {
      const { response } = params;

      if (response && response.posts) {
        return response.posts;
      }

      return getStorage(STORAGE_POSTS)
        .then(function(storagePosts) {
          return storagePosts[STORAGE_POSTS][keyword].posts;
        })
    })
    .then(function(posts) {
      if (!posts || !posts.length) {
        return { posts: [] };
      }

      return { posts };
    })
    .catch(function(error) {
      return Promise.reject(error);
    });
};

const onTabLoaded = function(tab, { keyword, limit, limitType, pauseTimeInSecs }) {
  const tabId = tab.id;
  const action = 'get-posts';

  return sendMessage(tabId, { action, keyword, limit, limitType, pauseTimeInSecs })
    .then(function(response) {
      return { tab, response };
    })
    .catch(function(error) {
      return Promise.reject(error);
    });
};

const onParsePostsSuccess = function(posts) {
  return Promise.resolve();

  // return getPagePostsComments(posts);
};

const onWindowOpened = function({ window, keyword, limit, limitType, pauseTimeInSecs }) {
  return waitUntilTabLoaded(window.tabs[0])
  .then(function(tab) {
    return onTabLoaded(tab, { keyword, limit, limitType, pauseTimeInSecs });
  })
  .then(function(params) {
    return onReceiveResponse(window, params, keyword);
  })
  .catch(function(error) {
    return Promise.reject(error);
  });
};

const searchPostsByKeyword = function({
  searchUrl, keyword, limit, limitType, pauseTimeInSecs
}) {
  const url = searchUrl.replace('{{keyword}}', keyword);

  return openWindow(url)
    .then(function(window) {
      return onWindowOpened({ window, keyword, limit, limitType, pauseTimeInSecs });
    })
    .catch(function(error) {
      return Promise.reject(error);
    });
};

const createProgressNotificationForKeywords = function({
  currentKeyword,
  nextKeyword,
  crawledKeywords,
  keywords,
  additionalMessage = ''
}) {
  if (!currentKeyword && !nextKeyword) {
    additionalMessage = 'Crawl all keywords success';
  }

  const message = `
    Running: ${currentKeyword || '<none>'},
    Next: ${nextKeyword || '<none>'},
    Finished: ${crawledKeywords.length ? crawledKeywords.join(', ') : '<none>'}
    ${additionalMessage || ''}
  `;

  return createProgressNotification({
      title: 'Chrome Extension Scraper',
      message: message,
      progress: Math.floor(crawledKeywords.length / keywords.length * 100)
    });
};
