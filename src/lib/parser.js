import $ from 'jquery';
import { request, formatNumber } from './util';

function parsePostAuthorInfo($authorInfo) {
    var self = this;
    var regxMatch;
    var id;
    var name;
    var url = $authorInfo.find('>a').eq(0).attr('data-hovercard');
    var $profileLink = $authorInfo.find('span.fwb > a').eq(0);

    if (!url || !$profileLink) {
        return null;
    }

    if (regxMatch = url.match(/id=\d+.*?/g)) {
        id = regxMatch[0].replace('id=', '');
        if (id && $profileLink.length) {
            name = $profileLink.text();

            return {
                id: id,
                name: name
            }
        }
    }

    return null;
};

function parsePostId($userContainer, author) {
    var postId = $userContainer.find('form input[name=ft_ent_identifier]').val();
    var match = /^(\d+)$/;

    if (!match) {
        if (postId.indexOf(':') != -1) {
            postId = postId.split(':')[1];
        }
    }

    postId = postId ? author.id + '_' + postId : null;

    return postId;
};

function parsePostFeedbackInfo($feedback, $share, html, singlePost) {
    var self = this;
    var likeCount = 0;
    var commentCount = 0;
    var shareCount = 0;
    var shareName = '';
    var shareDescription = '';
    var shareCaption = '';

    var patternLikes;
    var patternShares;
    var patternComments;

    var matchLikes;
    var matchShares;
    var matchComments;

    // Feedback
    if (singlePost == 1) {
        patternLikes = "\"likecount\":(\\d+)";
        patternShares = "\"sharecount\":(\\d+)";
        patternComments = "\"commentcount\":(\\d+)";

        matchLikes = html.match(new RegExp(patternLikes, 'i'));
        matchShares = html.match(new RegExp(patternShares, 'i'));
        matchComments = html.match(new RegExp(patternComments, 'i'));

        likeCount = matchLikes ? parseInt(matchLikes[1], 10) : 0;
        shareCount = matchShares ? parseInt(matchShares[1], 10) : 0;
        commentCount = matchComments ? parseInt(matchComments[1], 10) : 0
    } else {
        var like = $feedback.find("._ipp ._1g5v span").eq(0).text();

        if (like) {
            likeCount = formatNumber(like);
        }

        var share = $feedback.find("._ipo").eq(0).html();
        if (share) {
            patternShares = "([\\.\\w]+) [s|S]hares?";
            patternComments = "([\\.\\w]+) [c|C]omments?";

            matchShares = share.match(new RegExp(patternShares));
            matchComments = share.match(new RegExp(patternComments));

            if (matchShares) {
                shareCount = formatNumber(matchShares[1]);
            }

            if (matchComments) {
                commentCount = formatNumber(matchComments[1]);
            } else {
                var comments = $feedback.find('.UFILastCommentComponent .UFIPagerCount').text();

                matchComments = comments.match(/of (.+)/);

                if (matchComments) {
                    commentCount = formatNumber(matchComments[1]);
                }
            }
        }
    }

    // Share
    if ($share.length) {
        var $shareName = $share.find('._3ekx ._6m3 ._6m6, .fcg > .fwb > a').eq(0);
        if ($shareName.length) {
            shareName = $shareName.text();
        }

        var $shareDescription = $share.find('._5pco ._58cn, >.mtm._5pco, ._3ekx ._6m3 ._6m7').eq(0);
        if ($shareDescription.length) {
            shareDescription = $shareDescription.text();
            shareDescription = shareDescription.replace(/<br\s*[\/]?>/gi, "\n").replace('See More', '');
        }

        var $shareCaption = $share.find('._3ekx ._6m3 .ellipsis, ._5pbx, ._5pco').eq(0);
        if ($shareCaption.length) {
            shareCaption = $shareCaption.text()
                .replace(/<br\s*[\/]?>/gi, "\n")
                .replace('See More', '');
        }
    }

    return {
        likes: likeCount,
        comments: commentCount,
        shares: shareCount,
        shareName: shareName,
        shareDescription: shareDescription,
        shareCaption: shareCaption
    }
};

function parsePostType($authorInfo) {
  var postType = 'user';
  var fromUrl = $authorInfo.find('>a').eq(0).attr('data-hovercard');
  var toUrl = $authorInfo.find('.clearfix a._wpv') ? $authorInfo.find('.clearfix a._wpv').eq(0).attr('data-hovercard') : null;

  if (fromUrl.indexOf('page') > -1
    || (toUrl && (toUrl.indexOf('page') > -1 || toUrl.indexOf('group') > -1 )))
    {
      postType = 'page';
  }

  return postType;
};

function getSourceUser($html) {
    var username = $html.find('a[title=Profile]').attr('href');

    if (!username) {
        username = $html.find('a.fbxWelcomeBoxName').attr('href');
    }

    if (!username) {
        return null;
    }

    username = username
      .replace('http://www.facebook.com/', '')
      .replace('https://www.facebook.com/', '')
      .replace('?ref=bookmarks', '');

    return username;
};

function parseCommentAuthorInfo($comment) {
    var regxMatch;
    var id;
    var name;
    var $profile = $comment.find('.UFICommentActorName');

    if ($profile.length) {
        if (regxMatch = $profile.attr('data-hovercard').match(/id=\d+.*?/g)) {
            id = regxMatch[0].replace('id=', '');
            if (id) {
                name = $profile.text().trim();
                return {
                    id: id,
                    name: name
                };
            }
        }
    }

    return null;
};

function parseComments($userContainer, post) {
    var self = this;
    var result = [];
    var comments = $userContainer.find('.UFIList .UFIComment').toArray();

    if (!comments.length) return result;

    var postId = post._id.split('_')[1];

    comments.forEach(function(comment) {
        var $comment = $(comment);
        var likeCount = 0;
        var commentCount = 0;
        var sharesCount = 0;
        var id;
        var commentParentId;

        var commentUrl = $comment.find('div.UFICommentActions a.uiLinkSubtle').eq(0).attr('href').trim();
        var match = commentUrl.match(/comment_id=(\d+)/);

        if (!match) {
            return;
        }

        var commentId = match[1];
        var isReplyComment = commentUrl.indexOf('reply_comment_id') !== -1;

        if (isReplyComment) {
            var matchReplyComment = commentUrl.match(/reply_comment_id=(\d+)/);
            var replyCommentId = matchReplyComment[1];

            id = postId + '_' + replyCommentId;

            commentParentId = postId + '_' + commentId;
        } else {
            id = postId + '_' + commentId;
        }

        var author;
        var message;
        var time;
        var createdTime;
        var indexType;

        if (id && (id.indexOf('_') !== -1)) {
            author = parseCommentAuthorInfo($comment);
        }

        message = $comment.find('.UFICommentBody').eq(0).text().trim();

        // Time
        time = $comment.find('abbr.livetimestamp[data-utime]').attr('data-utime');

        if (post._type == 'fbUserTopic') {
            indexType = 'fbUserComment';
        } else {
            indexType = 'fbPageComment';
        }

        var url = 'http://facebook.com/' + id;

        if (author && message) {
            var commentData = {
              _id: id,
              _type: indexType,

              authorId: author.id,
              author: author.name,

              siteId: post.siteId,
              siteName: post.siteName,

              content: message,
              publishedDate: time,

              parentId: post._id,
              parentDate: post.publishedDate,

              likes: likeCount,
              comments: commentCount,
              shares: sharesCount,
              interactions: likeCount + commentCount + sharesCount,

              title: post.content,
              url: url,
              ds: post.ds
            }

            if (commentParentId) {
                commentData.commentParentId = commentParentId;
            }

            result.push(commentData);
        }
    });

    return result;
}

function parseAttachFileUrl($attachFile) {
  var $fileUrl = $attachFile.find('img.scaledImageFitWidth').eq(0);
  if (!$fileUrl.length) {
    return '';
  }

  return $fileUrl.attr('src');
}

function parsePosts(html, { keyword }) {
    var self = this;
    var result = [];

    var $data = $(html);
    var posts = $data.find('.userContentWrapper').toArray();

    // No posts found
    if (!posts.length) {
      return [];
    };

    posts.forEach(function(post) {
        return new Promise(function(resolve, reject) {
            var $userContainer = $(post);
            var $authorInfo = $userContainer.find('.clearfix');
            var author = parsePostAuthorInfo($authorInfo);
            var $postTime = $authorInfo.find('a abbr[data-utime]').eq(0);
            var $shareLink = $authorInfo.find('>div a._wpv');
            var $share = $userContainer.find('div.mtm').eq(0);
            // var feedBackDetails = $userContainer.find('._37uu ._524d a[data-comment-prelude-ref]').attr('aria-label');
            var toObjects = [];
            var message = '';

            var data;
            var regxMatch;
            var createdTime;
            var indexType;
            var $userContent;
            var $continueReading;
            var shareUrl;

            if (author) {
                var postId = parsePostId($userContainer, author);

                if (postId) {
                    if ($postTime.length) {
                        createdTime = $postTime.attr('data-utime');
                    }

                    if (!createdTime) {
                      return;
                    }

                    $userContent = $userContainer.find('.userContent').eq(0);

                    var singlePost = posts.length;
                    var feedback = parsePostFeedbackInfo($userContainer, $share, html, singlePost);

                    message = $userContent.text()
                        .replace(/<br\s*[\/]?>/gi, "\n")
                        .replace('See More', '')
                        .replace('Continue Reading', '');

                    if (!message) {
                      if (feedback.shareDescription || feedback.shareCaption) {
                          message = 'Share';
                      } else {
                          return Promise.resolve();
                      }
                    }

                    if ($shareLink.length) {
                        if (shareUrl = $shareLink.attr('data-hovercard')) {
                            if (regxMatch = shareUrl.match(/id=\d+.*?/g)) {
                                toObjects.push({
                                    id: parseInt(regxMatch[0].replace('id=', '')).toString(),
                                    name: $shareLink.text()
                                });
                            }
                        }
                    }

                    if (!toObjects.length) {
                        toObjects.push({
                            id: author.id.toString(),
                            name: author.name
                        });
                    }

                    var $attachFile = $userContainer.find('>div >._3x-2');
                    var attachFileUrl = parseAttachFileUrl($attachFile);

                    var url = 'http://facebook.com/' + postId;
                    var postType = parsePostType($authorInfo);

                    if (postType === 'user') {
                        indexType = 'fbUserTopic';
                    } else {
                        indexType = 'fbPageTopic';
                    }

                    data = {
                        _id: postId,
                        _type: indexType,

                        authorId: author.id,
                        author: author.name,
                        authorUrl: `https://www.facebook.com/${author.id}`,

                        siteId: toObjects ? toObjects[0].id : '',
                        siteName: toObjects ? toObjects[0].name : '',

                        content: message,
                        name: feedback.shareName,
                        description: feedback.shareDescription,
                        caption: feedback.shareCaption,

                        publishedDate: createdTime,

                        likes: feedback.likes,
                        comments: feedback.comments,
                        shares: feedback.shares,

                        attachFileUrl: attachFileUrl,

                        interactions: feedback.likes + feedback.comments + feedback.shares,

                        url: url,
                        ds: {
                            source: 'chrome-extension',
                            username: getSourceUser($data),
                            keyword: keyword
                        }
                    };

                    var commentsData = parseComments($userContainer, data);
                    data.commentsData = commentsData;

                    result.push(data);
                }
            }
        });
    });

    return result;
}

export {
  parsePosts
};
