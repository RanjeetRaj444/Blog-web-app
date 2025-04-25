import { useState, useEffect, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { Heart, Edit, ArrowLeft } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL } from "../utils/constants";
import { AuthContext } from "../context/AuthContext";
import CommentSection from "../components/comments/CommentSection";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Button from "../components/ui/Button";

const BlogPost = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const { user } = useContext(AuthContext);
  const token = localStorage.getItem("token");
  const UserId = localStorage.getItem("UserId");
  // console.log(UserId);
  useEffect(() => {
    const fetchPost = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${API_URL}/api/posts/${id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        setPost(response.data);
        setIsLiked(response.data.isLikedByCurrentUser || false);
        setLikesCount(response.data.likes?.length || 0);
      } catch (err) {
        setError("Failed to load post. Please try again later.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchPost();
    }
    if (post?.likes && UserId) {
      const isLikedByUser = post.likes.includes(UserId);
      setIsLiked(isLikedByUser);
    }
  }, [id]);
  useEffect(() => {
    if (post?.likes && UserId) {
      const isLikedByUser = post.likes.some(
        (id) => String(id) === String(UserId)
      );
      setIsLiked(isLikedByUser);
    }
  }, [post, UserId]);

  const handleLike = async () => {
    try {
      await axios.post(
        `${API_URL}/api/posts/${id}/like`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setIsLiked(!isLiked);
      setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
    } catch (err) {
      toast.error("Failed to like post. Please try again.");
      console.error(err);
    }
  };

  const handleAddComment = async (postId, content) => {
    try {
      await axios.post(
        `${API_URL}/api/posts/${postId}/comments`,
        { content },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (err) {
      toast.error("Failed to add comment. Please try again.");
      console.error(err);
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      await axios.delete(
        `${API_URL}/api/posts/${postId}/comments/${commentId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (err) {
      toast.error("Failed to delete comment. Please try again.");
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
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

  const isOwner = user && post.author._id === user._id;
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
                    {post.author.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-3">
                    <span className="font-medium text-gray-900">
                      {post.author.name}
                    </span>
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

            <div className="prose max-w-none mb-8">
              {post.content.split("\n").map((paragraph, index) => (
                <p key={index} className="text-gray-700 mb-4 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                </span>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-6">
              <Button
                onClick={handleLike}
                variant="ghost"
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
            </div>

            <CommentSection
              postId={post._id}
              comments={post.comments || []}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
            />
          </div>
        </article>
      </div>
    </div>
  );
};

export default BlogPost;
