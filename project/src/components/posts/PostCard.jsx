import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Heart, MessageCircle, Edit, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { AuthContext } from "../../context/AuthContext";

const likedByUser = (post, userId) =>
  Boolean(post.isLikedByCurrentUser) ||
  (userId && (post.likes || []).some((id) => String(id) === String(userId)));

const PostCard = ({ post, isOwner = false, onDelete, onLike }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(() => likedByUser(post, user?._id));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [isLiking, setIsLiking] = useState(false);

  // Re-sync when the post data or the logged-in user changes (e.g. after login).
  useEffect(() => {
    setIsLiked(likedByUser(post, user?._id));
    setLikesCount(post.likes?.length || 0);
  }, [post, user?._id]);

  const canManage = isOwner || (user && post.author?._id === user._id);

  const handleLike = async () => {
    if (!user) {
      toast.error("Please log in to like posts.");
      navigate("/login");
      return;
    }
    if (!onLike || isLiking) return;

    const wasLiked = isLiked;
    setIsLiking(true);
    setIsLiked(!wasLiked);
    setLikesCount((prev) => prev + (wasLiked ? -1 : 1));
    try {
      await onLike(post._id);
    } catch {
      setIsLiked(wasLiked);
      setLikesCount((prev) => prev + (wasLiked ? 1 : -1));
      toast.error("Failed to update like. Please try again.");
    } finally {
      setIsLiking(false);
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
              By{" "}
              {post.author?._id ? (
                <Link
                  to={`/u/${post.author._id}`}
                  className="hover:text-primary-600 underline-offset-2 hover:underline"
                >
                  {post.author.name}
                </Link>
              ) : (
                "Unknown"
              )}{" "}
              •{" "}
              {format(new Date(post.createdAt), "MMM d, yyyy")}
            </p>
          </div>

          {canManage && (
            <div className="flex space-x-2">
              <Link
                to={`/edit/${post._id}`}
                aria-label="Edit post"
                className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Edit size={18} />
              </Link>
              <button
                onClick={handleDelete}
                aria-label="Delete post"
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
          {(post.tags || []).map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-6">
            <button
              onClick={handleLike}
              aria-label={isLiked ? "Unlike post" : "Like post"}
              aria-pressed={isLiked}
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
