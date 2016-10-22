import $ from 'jquery';
import moment from 'moment';
import Promise from 'bluebird';
import { getStorage } from './browser/chrome/storage';
import { exportPostsToCsv } from './lib/util';
import { STORAGE_POSTS, STORAGE_KEYWORDS } from './constant';

const buildHtml = function(post, currentIndex) {
  const attachFileUrl = post.attachFileUrl ?
    `<a href="${post.attachFileUrl}" target="_blank">${post.attachFileUrl.substr(0, 70) + '...'}</a>` :
    '';

  return '<tr>' +
    `<td>${currentIndex}</td>` +
    `<td>${post.ds.keyword}</td>` +
    `<td>${post.author}</td>` +
    `<td><a href="${post.authorUrl}" target="_blank">${post.authorUrl}</a></td>` +
    `<td>${moment.unix(post.publishedDate).format('YYYY-MM-DD HH:mm:ss')}</td>` +
    `<td>${post.content}</td>` +
    `<td>${attachFileUrl}</td>` +
    `<td>${post.likes}</td>` +
    `<td>${post.comments}</td>` +
    `<td>${post.shares}</td>` +
    `<td><a href="${post.url}" target="_blank">${post.url}</a></td>` +
    '</tr>';
};

const getStoragePosts = getStorage(STORAGE_POSTS);
const getStorageKeywords = getStorage(STORAGE_KEYWORDS);

Promise.all([getStoragePosts, getStorageKeywords])
  .then(function(result) {
    const posts = result[0][STORAGE_POSTS];
    const arrKeywords = result[1][STORAGE_KEYWORDS];

    let currentIndex = 1;
    let html = '';

    $('#keywords').text(`Search keywords: ${arrKeywords.join(', ')}`);

    if (!posts) {
      $('#loading').remove();
      $('#result').html('Haven\'t had any results yet. Please try again later.');
      return;
    }

    Object.keys(posts).forEach(function(keyword) {
      const postsByKeyword = posts[keyword].posts;

      postsByKeyword.forEach(function(post) {
        html += buildHtml(post, currentIndex);

        currentIndex++;

        const crawledComments = post.crawled_comments || [];

        if (crawledComments.length) {
          crawledComments.forEach(function(comment) {
            html += buildHtml(comment, currentIndex);

            currentIndex++;
          });
        }
      });
    });

    $('#loading').remove();
    $('.export-result').show();
    $('#result').html(html);
  })
  .catch(function(error) {
    return Promise.reject(error);
  });

$('.export-result').on('click', function() {
  getStorage(STORAGE_POSTS)
    .then(function(result) {
      const posts = result[STORAGE_POSTS];

      if (!Object.keys(posts).length) {
        return Promise.reject(new Error('Cannot get posts from local storage'));
      }

      let exportedPosts = [];

      Object.keys(posts).forEach(function(keyword) {
        const postsByKeyword = posts[keyword].posts;

        exportedPosts = exportedPosts.concat(postsByKeyword);
      });

      exportPostsToCsv('data.csv', exportedPosts);
    })
    .catch(function(error) {
      console.log(error);
    });
});
