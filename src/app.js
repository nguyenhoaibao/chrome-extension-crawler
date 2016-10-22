import $ from 'jquery';
import moment from 'moment';
import Promise from 'bluebird';
import { parsePosts } from './lib/parser';
import { setStorage, getStorage } from './browser/chrome/storage';
import { STORAGE_POSTS } from './constant';

const LIMIT_RETRY_SCROLL_TIMES = 10;
const CACHED_POSTS_EACH_SCROLL_TIMES = 3;

let scrollTimes = 0;
let retryScrollTimes = 0;

let limitPostTimeInUnix;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  const { action } = request;

  if (action === 'get-posts') {
    const { keyword, limit, limitType, pauseTimeInSecs } = request;

    getPosts(keyword, limit, limitType, pauseTimeInSecs)
      .then(sendResponse)
      .catch(function(error) {
        console.log('Got error', error.stack);
        console.log('Trying to send cached posts to background scripts...');

        return getStorage(STORAGE_POSTS);
      })
      .then(function(storagePosts) {
        sendResponse({ posts: storagePosts[STORAGE_POSTS][keyword].posts });
      });

    return true;
  }
});

const getTotalPosts = function() {
  return document.getElementsByClassName('userContentWrapper').length;
};

const getLastPostTime = function() {
  const posts = document.getElementsByClassName('userContentWrapper');
  const $post = $(posts[posts.length - 1]);

  const $authorInfo = $post.find('div.clearfix > .clearfix');
  const $postTime = $authorInfo.find('a abbr[data-utime]').eq(0);
  const postTime = $postTime.attr('data-utime');

  return parseInt(postTime);
};

const isLinkValid = function() {
  // validate error link by title
  if (document.getElementById('pageTitle') === 'Page Not Found') {
    return false;
  }

  // validate error link by find link with href=/help/?ref=404
  if (document.querySelector('[href="/help/?ref=404"]')) {
    return false;
  }

  return true;
};

const isEmptyResult = function() {
  if (document.getElementById('empty_result_error')) {
    return true;
  }

  return false;
};

const isEndOfResults = function() {
  if (document.getElementById('browse_end_of_results_footer')) {
    return true;
  }

  if (document.getElementsByClassName('_24j').length) {
    return true;
  }

  if (document.getElementById('pagelet_scrolling_pager')
      && !document.getElementById('pagelet_scrolling_pager').innerHTML) {
    return true;
  }

  return false;
}

const isExceedLimitScrollTimes = function(limit) {
  if (limit < 0) {
    return true;
  }

  if (scrollTimes >= limit) {
    return true;
  }

  return false;
};

const isExceedLimitTotalPosts = function(limit) {
  const totalPosts = getTotalPosts();

  if (totalPosts >= limit) {
    return true;
  }

  return false;
};

const isExceedLimitPostsByDay = function(limit) {
  const lastPostTime = getLastPostTime();

  if (!limitPostTimeInUnix) {
    limitPostTimeInUnix = moment().subtract(limit, 'days')
      .hours(0)
      .minutes(0)
      .seconds(0)
      .unix();
  }

  if (lastPostTime <= limitPostTimeInUnix) {
    return true;
  }

  return false;
};

const isExceedLimitPostsByMonth = function(limit) {
  const lastPostTime = getLastPostTime();

  if (!limitPostTimeInUnix) {
    limitPostTimeInUnix = moment().subtract(limit, 'months')
      .hours(0)
      .minutes(0)
      .seconds(0)
      .unix();
  }

  if (lastPostTime <= limitPostTimeInUnix) {
    return true;
  }

  return false;
};

const isExceedLimitRetryScrollTimes = function() {
  if (retryScrollTimes > LIMIT_RETRY_SCROLL_TIMES) {
    return true;
  }

  return false;
};

const isPageConditionValid = function() {
  if (isEmptyResult()) {
    return false;
  }

  if (isEndOfResults()) {
    return false;
  }

  if (isExceedLimitRetryScrollTimes()) {
    return false;
  }

  if (!isLinkValid()) {
    return false;
  }

  return true;
}

const isCustomConditionValid = function(limit, limitType) {
  switch (limitType) {
    case 'scroll':
      return !isExceedLimitScrollTimes(limit);
    case 'post':
      return !isExceedLimitTotalPosts(limit);
    case 'day':
      return !isExceedLimitPostsByDay(limit);
    case 'month':
      return !isExceedLimitPostsByMonth(limit);
    default:
      return false;
  }
}

const isConditionValid = function(limit, limitType) {
  if (!isPageConditionValid()) {
    return false;
  }

  if (!isCustomConditionValid(limit, limitType)) {
    return false;
  }

  return true;
};

const getSleepingTimeByTotalPosts = function(totalPosts) {
  if (totalPosts < 50) {
    return 3.5 * 1000;
  }

  if (totalPosts < 100) {
    return 4 * 1000;
  }

  if (totalPosts < 150) {
    return 4.5 * 1000;
  }

  if (totalPosts < 200) {
    return 5 * 1000;
  }

  if (totalPosts < 250) {
    return 5.5 * 1000;
  }

  return 6 * 1000;
};

const scroll = function(pauseTimeInSecs) {
  const totalPostsBeforeScroll = getTotalPosts();

  // const sleepingTime = getSleepingTimeByTotalPosts(totalPostsBeforeScroll);
  const sleepingTime = pauseTimeInSecs * 1000 ||
    getSleepingTimeByTotalPosts(totalPostsBeforeScroll);

  return new Promise(function(resolve) {
    window.scrollTo(0, document.body.scrollHeight);

    setTimeout(function() {
      resolve();
    }, sleepingTime);
  }).then(function() {
    const totalPostsAfterScroll = getTotalPosts();

    if (totalPostsAfterScroll > totalPostsBeforeScroll) {
      scrollTimes++;
      return Promise.resolve();
    }

    if (!isPageConditionValid()) {
      return Promise.resolve();
    }

    return new Promise(function(resolve) {
      setTimeout(function() {
        retryScrollTimes++;

        resolve();
      }, 10 * 1000);
    }).then(function() {
      return scroll(pauseTimeInSecs);
    });
  }).catch(function(error) {
    return Promise.reject(error);
  });
};

const clickViewNewUpdatesButton = function() {
  const $newUpdatesButton = $('#u_ps_0_5_3');

  if (!$newUpdatesButton.length) {
    return Promise.resolve();
  }

  const $newUpdatesButtonParent = $newUpdatesButton.parents('#u_ps_0_5_1');
  if (!$newUpdatesButtonParent.length) {
    return Promise.resolve();
  }

  const isNewUpdatesButtonClickable = $newUpdatesButtonParent.hasClass('_2ywm');
  if (!isNewUpdatesButtonClickable) {
    return Promise.resolve();
  }

  $newUpdatesButton.click();

  return Promise.resolve();
}

const scrollAndValidateCondition = function(keyword, limit, limitType, pauseTimeInSecs) {
  if (!isConditionValid(limit, limitType)) {
    return Promise.resolve();
  }

  return scroll(pauseTimeInSecs)
    .then(function() {
      return clickViewNewUpdatesButton();
    })
    .then(function() {
      if (scrollTimes % CACHED_POSTS_EACH_SCROLL_TIMES === 0) {
        const html = document.documentElement.innerHTML;
        const posts = parsePosts(html, { keyword });

        if (!posts.length) {
          return Promise.resolve();
        }

        return getStorage(STORAGE_POSTS)
          .then(function(result) {
            const storagePosts = result[STORAGE_POSTS] || {};
            storagePosts[keyword] = { posts };

            return setStorage(STORAGE_POSTS, storagePosts);
          })
          .catch(function(error) {
            return Promise.reject(error);
          });
      }

      return Promise.resolve();
    })
    .then(function() {
      return scrollAndValidateCondition(keyword, limit, limitType, pauseTimeInSecs);
    })
    .catch(function(error) {
      return Promise.reject(error);
    });
};

const getPosts = function(keyword, limit, limitType, pauseTimeInSecs) {
  return scrollAndValidateCondition(keyword, limit, limitType, pauseTimeInSecs)
    .then(function() {
      return clickViewNewUpdatesButton();
    })
    .then(function() {
      const html = document.documentElement.innerHTML;
      const posts = parsePosts(html, { keyword });

      return { posts };
    })
    .catch(function(error) {
      return Promise.reject(error);
    });
};
