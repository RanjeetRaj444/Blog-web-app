import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import axios from "axios";
import { API_URL } from "../utils/constants";
import usePageTitle from "../hooks/usePageTitle";
import PostCard from "../components/posts/PostCard";
import LoadingSpinner from "../components/ui/LoadingSpinner";

const AuthorPage = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  usePageTitle(data?.user?.name);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await axios.get(`${API_URL}/api/users/${id}/public`);
      setData(res.data);
    } catch (err) {
      setData(null);
      setError(
        err.response?.status === 404
          ? "Author not found"
          : "Failed to load author. Please try again later."
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container-custom py-12 text-center">
        <p className="text-red-600 mb-4">{error || "Author not found"}</p>
        <Link to="/" className="text-primary-600 hover:text-primary-700">
          &larr; Back to Home
        </Link>
      </div>
    );
  }

  const { user, posts } = data;
  return (
    <div className="container-custom py-8">
      <div className="bg-white rounded-lg shadow-card p-6 mb-8 text-center">
        <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-800 font-bold text-3xl mb-4 mx-auto">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
        <p className="text-gray-600 mt-2">{user.bio || "No bio provided yet"}</p>
        <p className="text-sm text-gray-500 mt-2">
          Joined {format(new Date(user.createdAt), "MMMM yyyy")} · {posts.length}{" "}
          {posts.length === 1 ? "post" : "posts"}
        </p>
      </div>

      {posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-600">No posts yet.</p>
      )}
    </div>
  );
};

export default AuthorPage;
