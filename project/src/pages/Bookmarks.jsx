import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import usePageTitle from "../hooks/usePageTitle";
import PostCard from "../components/posts/PostCard";
import { PostListSkeleton } from "../components/ui/Skeleton";

const Bookmarks = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  usePageTitle("Bookmarks");

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await axios.get("/api/posts/bookmarks");
      setPosts(
        res.data.map((p) => ({ ...p, isBookmarkedByCurrentUser: true }))
      );
    } catch (err) {
      console.error(err);
      setError("Failed to load your bookmarks. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleLike = useCallback(async (postId) => {
    await axios.post(`/api/posts/${postId}/like`);
  }, []);

  // Un-bookmarking a post removes it from this list.
  const handleBookmarkChange = useCallback((postId, bookmarked) => {
    if (!bookmarked) setPosts((prev) => prev.filter((p) => p._id !== postId));
  }, []);

  return (
    <div className="container-custom py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Your bookmarks</h1>

      {isLoading ? (
        <PostListSkeleton />
      ) : error ? (
        <div className="text-center py-12" role="alert">
          <p className="text-red-600 mb-4">{error}</p>
          <button className="btn-primary" onClick={load}>
            Retry
          </button>
        </div>
      ) : posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onLike={handleLike}
              onBookmarkChange={handleBookmarkChange}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg p-8 text-center shadow-card">
          <p className="text-gray-600 mb-4">
            You haven&apos;t bookmarked any posts yet.
          </p>
          <Link to="/" className="btn-primary">
            Browse posts
          </Link>
        </div>
      )}
    </div>
  );
};

export default Bookmarks;
