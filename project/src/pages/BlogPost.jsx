import { useState, useEffect, useContext } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Heart, Edit, ArrowLeft, Bookmark } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { getErrorMessage } from "../utils/constants";
import { AuthContext } from "../context/AuthContext";
import CommentSection from "../components/comments/CommentSection";
import { PostPageSkeleton } from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import Markdown from "../components/ui/Markdown";
import usePageTitle from "../hooks/usePageTitle";

const BlogPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const { user, token } = useContext(AuthContext);
  usePageTitle(post?.title, post?.content);

  useEffect(() => {
    let ignore = false;
    const fetchPost = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await axios.get(`/api/posts/${id}`);
        if (ignore) return;
        const data = response.data;
        setPost(data);
        setIsLiked(
          Boolean(data.isLikedByCurrentUser) ||
            Boolean(
              user && (data.likes || []).some((l) => String(l) === user._id)
            )
        );
        setLikesCount(data.likes?.length || 0);
        setIsBookmarked(Boolean(data.isBookmarkedByCurrentUser));
      } catch (err) {
        if (ignore) return;
        setPost(null);
        setError(
          err.response?.status === 404
            ? "Post not found"
            : "Failed to load post. Please try again later."
        );
        console.error(err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    fetchPost();
    return () => {
      ignore = true;
    };
  }, [id, token, user]);

  const handleLike = async () => {
    if (!user) {
      toast.error("Please log in to like posts.");
      navigate("/login");
      return;
    }
    if (isLiking) return;
    setIsLiking(true);
    try {
      const response = await axios.post(`/api/posts/${id}/like`);
      setLikesCount(response.data.length);
      setIsLiked(response.data.some((l) => String(l) === user._id));
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to like post."));
      console.error(err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      toast.error("Please log in to bookmark posts.");
      navigate("/login");
      return;
    }
    if (isBookmarking) return;
    const was = isBookmarked;
    setIsBookmarking(true);
    setIsBookmarked(!was);
    try {
      const response = await axios.post(`/api/posts/${id}/bookmark`);
      if (typeof response?.data?.bookmarked === "boolean") {
        setIsBookmarked(response.data.bookmarked);
      }
    } catch (err) {
      setIsBookmarked(was);
      toast.error(getErrorMessage(err, "Failed to update bookmark."));
    } finally {
      setIsBookmarking(false);
    }
  };

  // Both handlers return the updated comment list from the server and throw on failure.
  const handleAddComment = async (postId, content) => {
    try {
      const response = await axios.post(`/api/posts/${postId}/comments`, {
        content,
      });
      return response.data;
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to add comment."));
      throw err;
    }
  };

  const handleEditComment = async (postId, commentId, content) => {
    try {
      const response = await axios.put(
        `/api/posts/${postId}/comments/${commentId}`,
        { content }
      );
      return response.data;
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to edit comment."));
      throw err;
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      const response = await axios.delete(
        `/api/posts/${postId}/comments/${commentId}`
      );
      return response.data;
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete comment."));
      throw err;
    }
  };

  if (isLoading) {
    return <PostPageSkeleton />;
  }

  if (error || !post) {
    return (
      <div className="container-custom py-12 text-center">
        <p className="text-red-600 mb-4">{error || "Post not found"}</p>
        <Link to="/" className="text-primary-600 hover:text-primary-700">
          &larr; Back to Home
        </Link>
      </div>
    );
  }

  const authorName = post.author?.name || "Unknown";
  const isOwner = user && post.author?._id === user._id;

  return (
    <div className="container-custom py-8 animate-fade-in">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 transition-colors"
          >
            <ArrowLeft size={18} className="mr-1" />
            Back to posts
          </Link>
        </div>

        <article className="bg-white rounded-lg shadow-card overflow-hidden">
          <div className="p-6 md:p-8">
            <header className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {post.title}
              </h1>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-800 font-semibold">
                    {authorName.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-3">
                    {post.author?._id ? (
                      <Link
                        to={`/u/${post.author._id}`}
                        className="font-medium text-gray-900 hover:text-primary-600"
                      >
                        {authorName}
                      </Link>
                    ) : (
                      <span className="font-medium text-gray-900">
                        {authorName}
                      </span>
                    )}
                    <p className="text-sm text-gray-500">
                      {format(new Date(post.createdAt), "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>

                {isOwner && (
                  <Link
                    to={`/edit/${post._id}`}
                    className="btn-secondary flex items-center"
                  >
                    <Edit size={18} className="mr-1" />
                    Edit Post
                  </Link>
                )}
              </div>
            </header>

            <div className="mb-8">
              <Markdown>{post.content}</Markdown>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {(post.tags || []).map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-6 flex items-center gap-2">
              <Button
                onClick={handleLike}
                variant="ghost"
                disabled={isLiking}
                className={`flex items-center ${
                  isLiked ? "text-red-500" : "text-gray-700"
                }`}
              >
                <Heart
                  size={20}
                  fill={isLiked ? "currentColor" : "none"}
                  className="mr-2"
                />
                <span>{isLiked ? "Liked" : "Like"}</span>
                <span className="ml-2">({likesCount})</span>
              </Button>
              <Button
                onClick={handleBookmark}
                variant="ghost"
                disabled={isBookmarking}
                aria-pressed={isBookmarked}
                className={`flex items-center ${
                  isBookmarked ? "text-primary-600" : "text-gray-700"
                }`}
              >
                <Bookmark
                  size={20}
                  fill={isBookmarked ? "currentColor" : "none"}
                  className="mr-2"
                />
                <span>{isBookmarked ? "Bookmarked" : "Bookmark"}</span>
              </Button>
            </div>

            <CommentSection
              postId={post._id}
              comments={post.comments || []}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              onEditComment={handleEditComment}
            />
          </div>
        </article>
      </div>
    </div>
  );
};

export default BlogPost;
