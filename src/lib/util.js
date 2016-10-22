import $ from 'jquery';
import moment from 'moment';
import Promise from 'bluebird';

const request = function ({ url, data = {}, method = 'POST' }) {
  return new Promise(function(resolve, reject) {
    $.ajax({ url, method, data })
      .done(function(response) {
        resolve(response);
      })
      .fail(function(error) {
        reject(error);
      });
  });
};

const exportPostsToCsv = function(filename, posts) {
  let csvIndex = 1;

  const process = function(post) {
    let finalVal = csvIndex + ',';

    for (let key in post) {

      // ignore ds & commentsData key
      if (['ds', 'commentsData'].indexOf(key) !== -1) {
        continue;
      }

      let innerValue = post[key] ? post[key].toString() : '';

      if (key === 'publishedDate') {
        innerValue = moment.unix(innerValue).format('YYYY-MM-DDTHH:mm:ss');
      }

      let result = innerValue.replace(/"/g, '""');

      if (result.search(/("|,|\n)/g) >= 0) {
        result = '"' + result + '"';
      }

      finalVal += result + ',';
    }

    finalVal = finalVal.replace(/,$/, '') + '\n';

    csvIndex++;

    return finalVal;
  };

  const csvHeaders = '#,Keyword,Poster Name,Poster URL,Created Time,Content,' +
    'Image Url,Likes,Comments,Shares,Post URL' + '\n';

  let csvFile = csvHeaders;

  posts.forEach(function(post) {
    const {
      _id,
      _type,

      authorId,
      author,
      authorUrl,

      siteId,
      siteName,

      content,
      name,
      description,
      caption,

      publishedDate,

      likes,
      comments,
      shares,

      interactions,

      ds,

      url,
      attachFileUrl,

      crawled_comments: crawledComments = []
    } = post;

    const authorIdWithUnderscorePrefix = '_' + authorId;
    const siteIdWithUnderscorePrefix = '_' + siteId;

    const keyword = ds.keyword;

    const postWithKeyOrderByCsvHeaders = {
      keyword,
      author,
      authorUrl,

      publishedDate,
      content,

      attachFileUrl,
      likes,
      comments,
      shares,

      url
    };

    csvFile += process(postWithKeyOrderByCsvHeaders);

    if (crawledComments.length) {
      crawledComments.forEach(function(crawledComment) {
        const {
          author: commentAuthor,
          authorUrl: commentAuthorUrl,

          publishedDate: commentPublishedDate,
          content: commentContent,

          attachFileUrl: commentAttachFileUrl,
          likes: commentLikes,
          comments: commentComments,
          shares: commentShares,

          url: commentUrl
        } = crawledComment;

        const commentWithKeyOrderByCsvHeaders = {
          commentAuthor,
          commentAuthorUrl,

          commentPublishedDate,
          commentContent,

          commentAttachFileUrl,
          commentLikes,
          commentComments,
          commentShares,

          commentUrl
        };

        csvFile += process(commentWithKeyOrderByCsvHeaders);
      });

      csvFile += '\n\n\n';
    }
  });

  const blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });

  let link = document.createElement('a');
  if (link.download !== undefined) { // feature detection
    // Browsers that support HTML5 download attribute
    var url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  }
}

const formatNumber = function(text) {
  try {
    let number;

    if (text.indexOf(',') !== -1) {
      text = text.replace(/\,/, '.');
    }

    if (text.indexOf('K') !== -1) {
      number = parseInt(parseFloat(text.replace('K')) * 1000);
    } else if (text.indexOf('M') !== -1) {
      number = parseInt(parseFloat(text.replace('M')) * 1000000);
    } else {
      number = parseInt(text);
    }

    return number;
  } catch (e) {
    return 0;
  }
}

const getRandomNumber = function({ min = 0, max = 10 } = {}) {
  return Math.floor(Math.random() * (max - min)) + min;
};

export { request, exportPostsToCsv, formatNumber, getRandomNumber };
