import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Send, ThumbsUp, Reply, MoreVertical, 
  Trash2, Edit2, Flag, Heart
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const API_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000') + '/api';

const Comment = ({ 
  comment, 
  onReply, 
  onLike, 
  onDelete, 
  onEdit,
  depth = 0,
  currentUserId,
  currentUserName,
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(true);

  const handleReply = () => {
    if (replyText.trim()) {
      onReply(comment.id, replyText.trim());
      setReplyText('');
      setIsReplying(false);
    }
  };

  const handleEdit = () => {
    if (editText.trim() && editText !== comment.content) {
      onEdit(comment.id, editText.trim());
      setIsEditing(false);
    }
  };

  const isOwnComment = (currentUserId && comment.userId && comment.userId === currentUserId)
    || (currentUserName && comment.author && comment.author === currentUserName);
  const timeAgo = getTimeAgo(comment.timestamp);

  return (
    <div className={cn(
      "space-y-3",
      depth > 0 && "ml-8 pl-4 border-l-2 border-muted"
    )}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.author_photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author}`} />
          <AvatarFallback>{comment.author?.[0] || '?'}</AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          {/* Comment Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{comment.author}</span>
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
              {comment.edited && (
                <Badge variant="outline" className="text-[10px] h-4">
                  Edited
                </Badge>
              )}
            </div>

            {/* Comment Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwnComment ? (
                  <>
                    <DropdownMenuItem onClick={() => setIsEditing(!isEditing)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(comment.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem>
                    <Flag className="w-4 h-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Comment Content */}
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEdit}>
                  Save
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(comment.content);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
          )}

          {/* Comment Actions */}
          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => onLike(comment.id)}
              className={cn(
                "flex items-center gap-1 transition-colors",
                comment.likedByUser 
                  ? "text-red-500 font-semibold" 
                  : "text-muted-foreground hover:text-red-500"
              )}
            >
              <Heart 
                className={cn(
                  "w-4 h-4",
                  comment.likedByUser && "fill-current"
                )} 
              />
              {comment.likes > 0 && comment.likes}
            </button>

            {/* Hide Reply button on own comments */}
            {!isOwnComment && (
              <button
                onClick={() => setIsReplying(!isReplying)}
                className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
              >
                <Reply className="w-4 h-4" />
                Reply
              </button>
            )}

            {comment.replies?.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {showReplies ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>

          {/* Reply Input */}
          {isReplying && (
            <div className="space-y-2 pt-2">
              <Textarea
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleReply} className="gap-2">
                  <Send className="w-3 h-3" />
                  Reply
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setIsReplying(false);
                    setReplyText('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Nested Replies */}
          {showReplies && comment.replies?.length > 0 && depth < 3 && (
            <div className="space-y-3 pt-2">
              {comment.replies.map((reply) => (
                <Comment
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  onLike={onLike}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  depth={depth + 1}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CommentSection = ({ postId, comments: initialComments = [], onCommentsChange, currentUserId, currentUserName, currentUserPhoto }) => {
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, popular

  const addComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await axios.post(`${API_URL}/community/posts/${postId}/comments`, {
        content: newComment.trim(),
        parent_id: null,
        author: currentUserName || 'Community Member',
        author_id: currentUserId || null,
        author_photo: currentUserPhoto || null,
      });

      if (response.data.success && response.data.comment) {
        const newEntry = { ...response.data.comment, author_photo: currentUserPhoto || null };
        const updatedComments = [newEntry, ...comments];
        setComments(updatedComments);
        onCommentsChange?.(updatedComments);
        setNewComment('');
        toast.success('Comment added!');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment. Please try again.');
    }
  };

  const addReply = async (parentCommentId, replyText) => {
    try {
      const response = await axios.post(`${API_URL}/community/posts/${postId}/comments`, {
        content: replyText,
        parent_id: parentCommentId,
        author: currentUserName || 'Community Member',
        author_photo: currentUserPhoto || null,
      });

      if (response.data.success && response.data.comment) {
        const reply = { ...response.data.comment, author_photo: currentUserPhoto || null };

        const addReplyToComment = (commentsList) => {
          return commentsList.map(comment => {
            if (comment.id === parentCommentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), reply]
              };
            }
            if (comment.replies?.length > 0) {
              return {
                ...comment,
                replies: addReplyToComment(comment.replies)
              };
            }
            return comment;
          });
        };

        const updatedComments = addReplyToComment(comments);
        setComments(updatedComments);
        onCommentsChange?.(updatedComments);
        toast.success('Reply added!');
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply. Please try again.');
    }
  };

  const likeComment = (commentId) => {
    const toggleLikeInComment = (commentsList) => {
      return commentsList.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            likes: comment.likedByUser ? comment.likes - 1 : comment.likes + 1,
            likedByUser: !comment.likedByUser
          };
        }
        if (comment.replies?.length > 0) {
          return {
            ...comment,
            replies: toggleLikeInComment(comment.replies)
          };
        }
        return comment;
      });
    };

    const updatedComments = toggleLikeInComment(comments);
    setComments(updatedComments);
    onCommentsChange?.(updatedComments);
  };

  const deleteComment = (commentId) => {
    const removeComment = (commentsList) => {
      return commentsList.filter(comment => {
        if (comment.id === commentId) return false;
        if (comment.replies?.length > 0) {
          comment.replies = removeComment(comment.replies);
        }
        return true;
      });
    };

    if (confirm('Are you sure you want to delete this comment?')) {
      const updatedComments = removeComment(comments);
      setComments(updatedComments);
      onCommentsChange?.(updatedComments);
    }
  };

  const editComment = (commentId, newContent) => {
    const updateComment = (commentsList) => {
      return commentsList.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            content: newContent,
            edited: true
          };
        }
        if (comment.replies?.length > 0) {
          return {
            ...comment,
            replies: updateComment(comment.replies)
          };
        }
        return comment;
      });
    };

    const updatedComments = updateComment(comments);
    setComments(updatedComments);
    onCommentsChange?.(updatedComments);
  };

  const getSortedComments = () => {
    const sorted = [...comments];
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      case 'popular':
        return sorted.sort((a, b) => b.likes - a.likes);
      default:
        return sorted;
    }
  };

  const totalComments = countTotalComments(comments);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {totalComments} {totalComments === 1 ? 'Comment' : 'Comments'}
        </h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="text-xs border rounded px-2 py-1 bg-background"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>

      {/* New Comment Input */}
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={currentUserPhoto || undefined} />
          <AvatarFallback>{currentUserName?.[0]?.toUpperCase() || 'ME'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[60px]"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                addComment();
              }
            }}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Press Ctrl+Enter to post
            </span>
            <Button size="sm" onClick={addComment} className="gap-2">
              <Send className="w-3 h-3" />
              Comment
            </Button>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {getSortedComments().map((comment) => (
          <Comment
            key={comment.id}
            comment={comment}
            onReply={addReply}
            onLike={likeComment}
            onDelete={deleteComment}
            onEdit={editComment}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
          />
        ))}
      </div>

      {comments.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No comments yet. Be the first to comment!</p>
        </div>
      )}
    </div>
  );
};

// Helper functions
function getTimeAgo(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return past.toLocaleDateString();
}

function countTotalComments(comments) {
  let count = comments.length;
  comments.forEach(comment => {
    if (comment.replies?.length > 0) {
      count += countTotalComments(comment.replies);
    }
  });
  return count;
}

export default CommentSection;
