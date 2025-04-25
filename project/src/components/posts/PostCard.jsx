import { use, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Heart, MessageCircle, Edit, Trash2 } from "lucide-react";

const PostCard = ({ post, isOwner = false, onDelete, onLike, UserId }) => {
  const [isLiked, setIsLiked] = useState(post.isLikedByCurrentUser || false);
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);

  const handleLike = () => {
    if (onLike) {
      onLike(post._id);
      setIsLiked(!isLiked);
      setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
    }
  };

  const handleDelete = () => {
    if (
      onDelete &&
      window.confirm("Are you sure you want to delete this post?")
    ) {
      onDelete(post._id);
    }
  };
  useEffect(() => {
    for (let i = 0; i < post.likes.length; i++) {
      if (post.likes[i] === UserId) {
        setIsLiked(true);
        break;
      } else {
        setIsLiked(false);
      }
    }
  }, []);

  return (
    <article className="card hover:translate-y-[-2px] transition-transform duration-300 animate-fade-in">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <Link to={`/post/${post._id}`}>
              <h3 className="text-xl font-semibold text-gray-900 hover:text-primary-600 transition-colors">
                {post.title}
              </h3>
            </Link>
            <p className="text-sm text-gray-500 mt-1">
              By {post.author.name} •{" "}
              {format(new Date(post.createdAt), "MMM d, yyyy")}
            </p>
          </div>

          {isOwner && (
            <div className="flex space-x-2">
              <Link
                to={`/edit/${post._id}`}
                className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Edit size={18} />
              </Link>
              <button
                onClick={handleDelete}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </div>

        <div className="mb-4">
          <p className="text-gray-700 line-clamp-3">
            {post.content.length > 200
              ? `${post.content.substring(0, 200)}...`
              : post.content}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {post.tags.map((tag, index) => (
            <span key={index} className="tag">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-6">
            <button
              onClick={handleLike}
              className={`flex items-center space-x-1 ${
                isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"
              } transition-colors`}
            >
              <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
              <span>{likesCount}</span>
            </button>

            <Link
              to={`/post/${post._id}`}
              className="flex items-center space-x-1 text-gray-500 hover:text-primary-600 transition-colors"
            >
              <MessageCircle size={18} />
              <span>{post.comments?.length || 0}</span>
            </Link>
          </div>

          <Link
            to={`/post/${post._id}`}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Read more
          </Link>
        </div>
      </div>
    </article>
  );
};

export default PostCard;
