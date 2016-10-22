import $ from 'jquery';
import { openTab } from './browser/chrome/tab';

const $searchUrlWrapper = $('#search-url-wrapper');
const $searchUrlSelect = $('#search-url');

const $datePostedWrapper = $('#date-posted-wrapper');

const $customDatePostedWrapper = $('#custom-date-posted-wrapper');
const $customDatePosted = $('#custom-date-posted');

const $pauseTime = $('#pause-time');

const $useCustomDatePostedCheckbox = $('#use-custom-date-posted');

const $crawlBtn = $('#crawl-btn');
const $resultBtn = $('#result-btn');

const DEFAULT_LIMIT = 0;
const DEFAULT_SEARCH_URL = 'https://www.facebook.com/?q={{keyword}}';

const DATE_POSTED_TOTAL_YEARS = 2;

const getSearchUrl = function(searchUrlType) {
  switch (searchUrlType) {
    case 'top-post':
      return 'https://www.facebook.com/search/top/?q={{keyword}}';
    default:
      return 'https://www.facebook.com/search/top/?q={{keyword}}';
  }
};

const getFilterDatePosted = function() {
  return $useCustomDatePostedCheckbox.is(':checked') ?
    $('#custom-date-posted').val() :
    $("input[name=date-posted]:checked").val();
};

const getSearchUrlByDatePosted = function() {
  const datePosted = getFilterDatePosted();

  if (datePosted.length === 4) {
    return `&filters_rp_creation_time={"start_year":"${datePosted}","end_year":"${datePosted}"}`;
  } else if (datePosted.indexOf('-') !== -1) {
    return `&filters_rp_creation_time={"start_month":"${datePosted}","end_month":"${datePosted}"}`;
  }

  return '';
};

const getSearchTypes = function() {
  const options = $searchUrlSelect[0].options;
  const searchTypes = [];

  for (var i = 0, l = options.length; i < l; i++) {
    if (options[i].selected) {
      searchTypes.push(options[i].value);
    }
  }

  return searchTypes;
};

const getSearchUrls = function() {
  const searchTypes = getSearchTypes();
  let searchUrls = searchTypes.map(function(searchType) {
    return getSearchUrl(searchType);
  });

  const searchUrlByDatePosted = getSearchUrlByDatePosted();
  if (searchUrlByDatePosted) {
    searchUrls = searchUrls.map(function(searchUrl) {
      return searchUrl + searchUrlByDatePosted;
    });
  }

  return searchUrls;
};

const getPauseTimeInSeconds = function() {
  const pauseTimeStr = $pauseTime.val();

  return pauseTimeStr ? parseInt(pauseTimeStr) : 0;
};

const getTotalDatePostedYears = function() {
  const years = [];
  const currentYear = (new Date()).getFullYear();

  for (let i = 0; i <= DATE_POSTED_TOTAL_YEARS; i++) {
    years.push(currentYear - i);
  }

  return years;
};

const generateRadioInputHtmlByAnyTime = function() {
  return '&nbsp;&nbsp;<input type="radio" name="date-posted" value="" checked /> Anytime';
};

const generateRadioInputHtmlByYear = function(year) {
  return `<input type="radio" name="date-posted" value="${year}" /> ${year}`;
};

const generateRadioInputHtmlByYears = function(years) {
  let html = '';

  years.forEach(function(year) {
    html += '&nbsp;&nbsp;' + generateRadioInputHtmlByYear(year);
  });

  return html;
}

const buildDatePostedHtml = function() {
  let html = '';

  html += generateRadioInputHtmlByAnyTime();
  html += generateRadioInputHtmlByYears(getTotalDatePostedYears());
  html += '<br /><br />';

  $datePostedWrapper.append(html);
};

const onWindowLoaded = function() {
  buildDatePostedHtml();
};

$crawlBtn.on('click', function() {
  const action = 'crawl-keywords';
  const searchUrls = getSearchUrls();
  const keywordsStr = $('#keywords').val();

  if (!keywordsStr) {
    alert('Keywords is required!');
    return;
  }

  const limit = $('#limit').val() ? parseInt($('#limit').val()) : DEFAULT_LIMIT;
  const limitType = $('#limit-type').val();

  const pauseTimeInSecs = getPauseTimeInSeconds();

  const keywords = keywordsStr.split(',');

  const params = {
    searchUrls,
    keywords,
    limit,
    limitType,
    pauseTimeInSecs
  };

  chrome.extension.sendMessage({ action, params });
});

$useCustomDatePostedCheckbox.on('change', function() {
  if ($(this).is(':checked')) {
    $datePostedWrapper.hide();
    $customDatePostedWrapper.show();
  } else {
    $datePostedWrapper.show();
    $customDatePostedWrapper.hide();
  }
});

$resultBtn.on('click', function() {
  openTab(
    chrome.extension.getURL('result.html'),
    { windowOptions: { focused: true }}
  );
});

window.onload = onWindowLoaded;
