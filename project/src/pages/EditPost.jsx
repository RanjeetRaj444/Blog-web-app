import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { getErrorMessage } from "../utils/constants";
import { AuthContext } from "../context/AuthContext";
import usePageTitle from "../hooks/usePageTitle";
import PostForm from "../components/posts/PostForm";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Button from "../components/ui/Button";

const EditPost = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  usePageTitle(post ? `Edit: ${post.title}` : "Edit post");
  const { token, user } = useContext(AuthContext);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`/api/posts/${id}`);
        setPost(response.data);
      } catch (err) {
        setError(
          err.response?.status === 404
            ? "Post not found"
            : "Failed to load post. Please try again later."
        );
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchPost();
    }
  }, [id, token]);

  const handleSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      await axios.put(`/api/posts/${id}`, data);
      toast.success(
        data.status === "draft" ? "Draft saved!" : "Post updated successfully!"
      );
      navigate(`/post/${id}`);
    } catch (error) {
      console.error("Error updating post:", error);
      toast.error(getErrorMessage(error, "Failed to update post. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this post? This action cannot be undone."
      )
    ) {
      try {
        setIsDeleting(true);
        await axios.delete(`/api/posts/${id}`);
        toast.success("Post deleted successfully!");
        navigate("/");
      } catch (error) {
        console.error("Error deleting post:", error);
        toast.error(getErrorMessage(error, "Failed to delete post. Please try again."));
      } finally {
        setIsDeleting(false);
      }
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

  if (user && post.author?._id !== user._id) {
    return (
      <div className="container-custom py-12 text-center">
        <p className="text-red-600 mb-4">You can only edit your own posts.</p>
        <Link to={`/post/${id}`} className="text-primary-600 hover:text-primary-700">
          &larr; Back to post
        </Link>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link
            to={`/post/${id}`}
            className="inline-flex items-center text-primary-600 hover:text-primary-700 transition-colors"
          >
            <ArrowLeft size={18} className="mr-1" />
            Back to post
          </Link>

          <Button
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleDelete}
            isLoading={isDeleting}
          >
            <Trash2 size={18} className="mr-1" />
            Delete Post
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-card">
          <div className="p-6 md:p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Post</h1>
            <PostForm
              initialData={{
                title: post.title,
                content: post.content,
                tags: post.tags,
                status: post.status,
              }}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPost;
