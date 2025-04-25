import { useState, useEffect } from "react";
import { Filter } from "lucide-react";
import axios from "axios";
import { API_URL } from "../utils/constants";
import PostCard from "../components/posts/PostCard";
import LoadingSpinner from "../components/ui/LoadingSpinner";

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const token = localStorage.getItem("token");
  const UserId = localStorage.getItem("UserId");
  // console.log(UserId);
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${API_URL}/api/posts`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        setPosts(response.data);
        const tags = response.data.reduce((acc, post) => {
          post.tags.forEach((tag) => {
            if (!acc.includes(tag)) {
              acc.push(tag);
            }
          });
          return acc;
        }, []);

        setAllTags(tags);
      } catch (err) {
        setError("Failed to fetch posts. Please try again later.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [UserId]);

  const handleLike = async (postId) => {
    try {
      await axios.post(
        `${API_URL}/api/posts/${postId}/like`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  const handleDelete = async (postId) => {
    try {
      await axios.delete(`${API_URL}/api/posts/${postId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      setPosts(posts.filter((post) => post._id !== postId));
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  };

  const filteredPosts = selectedTag
    ? posts.filter((post) => post.tags.includes(selectedTag))
    : posts;

  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  return (
    <div className="container-custom py-8">
      <div className="flex flex-col md:flex-row justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Panini8 Blog
          </h1>
          <p className="text-gray-600 max-w-2xl">
            Explore the latest thoughts, ideas, and stories from our community.
            Filter by tags to find content that interests you.
          </p>
        </div>

        <button
          onClick={toggleFilter}
          className="mt-4 md:mt-0 flex items-center btn-secondary"
        >
          <Filter size={18} className="mr-2" />
          Filter by tag
        </button>
      </div>

      {isFilterOpen && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-fade-in">
          <h3 className="text-lg font-medium mb-3">Filter by tag</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                selectedTag === null
                  ? "bg-primary-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              All
            </button>
            {allTags.map((tag, index) => (
              <button
                key={index}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  selectedTag === tag
                    ? "bg-primary-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <LoadingSpinner size="large" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-600">{error}</p>
        </div>
      ) : filteredPosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {filteredPosts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onLike={handleLike}
              onDelete={handleDelete}
              UserId={UserId}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-gray-600">
            {selectedTag
              ? `No posts found with the tag "${selectedTag}".`
              : "No posts found. Check back later!"}
          </p>
        </div>
      )}
    </div>
  );
};

export default Home;
