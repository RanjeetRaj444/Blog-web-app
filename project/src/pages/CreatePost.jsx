import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL } from "../utils/constants";
import PostForm from "../components/posts/PostForm";

const CreatePost = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const handleSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      await axios.post(`${API_URL}/api/posts`, data, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success("Post created successfully!");
      navigate("/");
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Failed to create post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container-custom py-8">
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

        <div className="bg-white rounded-lg shadow-card">
          <div className="p-6 md:p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Create New Post
            </h1>
            <PostForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
