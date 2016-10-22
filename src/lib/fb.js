import Promise from 'bluebird';
import moment from 'moment';
import { getRandomNumber } from './util';

const commentFields = 'id,from,comments,message,attachment,like_count,comment_count,created_time';

const ACCESS_TOKEN = [
  '448411185319273|d7282b0c43319ad90f77e8f030c9ffc2',
  '647114738755668|95b838ab00b2a04019125c66ba3cca34',
  '849495238420510|78e381dd140c1db08c02d91253e833dd',
  '898185280273436|ee8dbb98b92dee37ea65e644fba5e582',
  '1679451008942981|f1999091134b9ed29da0c083b1f40743',
  '1733877523514414|2964c73fb2f2fe671ffb975b39032472',
  '1053046104768362|61750ed2f1f62639befae442842a7ee2',
  '529620363865638|effa1d919d043d8276f61a0b8346043d',
  '1615039008776176|3ea8a1b060ba46f6a999eb42f38a948d',
  '357642511112990|256ab448fec5e614ee67e65cd215de95'
];
const LIMIT_COMMENTS_PER_REQUEST = 500;

const getPagePostCommentsRecursive = function(url, totalComments = []) {
  return fetch(url)
    .then(function(response) {
      if (response.status !== 200) {
        return Promise.resolve(totalComments);
      }

      return response.json();
    })
    .then(function(json) {
      const comments = json.data;

      if (!comments || !comments.length) {
        return Promise.resolve(totalComments);
      }

      comments.forEach(function(comment) {
        const transformedComment = {
          _id: comment.id,
          _type: '',

          authorId: comment.from.id,
          author: comment.from.name,
          authorUrl: `https://www.facebook.com/${comment.from.id}`,

          siteId: '',
          siteName: '',

          content: comment.message,
          name: '',
          description: '',
          caption: '',

          publishedDate: moment(comment.created_time).unix(),

          likes: comment.like_count,
          comments: comment.comment_count,
          shares: 0,

          attachFileUrl: '',

          interactions: comment.like_count + comment.comment_count,

          url: `https://www.facebook.com/${comment.id}`
        };

        totalComments.push(transformedComment);
      });

      const nextPage = json.paging ? json.paging.next : '';
      if (!nextPage) {
        return Promise.resolve(totalComments);
      }

      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          resolve();
        }, 1.5 * 1000);
      }).then(function() {
        return getPagePostCommentsRecursive(nextPage, totalComments);
      });
    })
    .catch(function(error) {
      console.log('eeerrrr', error);
      return Promise.reject(error);
    });
};

const getRandomAccessToken = function() {
  const randomIndex = getRandomNumber({ max: ACCESS_TOKEN.length - 1 });

  return ACCESS_TOKEN[randomIndex];
}

const getPagePostComments = function(post) {
  const query = `https://graph.facebook.com/v2.2/${post._id}/comments` +
    `?filter=stream&fields=${commentFields}` +
    `&limit=${LIMIT_COMMENTS_PER_REQUEST}` +
    `&access_token=${getRandomAccessToken()}`;

  return getPagePostCommentsRecursive(query);
};

const getPagePostsComments = function(posts) {
  return Promise.each(posts, function(post, index) {
    if (post._type !== 'fbPageTopic') {
      return Promise.resolve();
    }

    return getPagePostComments(post)
      .then(function(totalComments) {
        post.crawled_comments = totalComments;
      })
      .catch(function(error) {
        return Promise.reject(error);
      });
  }).then(function() {
    return posts;
  }).catch(function(error) {
    return Promise.reject(error);
  });
};

module.exports = {
  getPagePostsComments
};
