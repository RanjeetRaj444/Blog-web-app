import { useState, useEffect, useContext, useMemo } from "react";
import { User, Settings } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL } from "../utils/constants";
import { AuthContext } from "../context/AuthContext";
import PostCard from "../components/posts/PostCard";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Button from "../components/ui/Button";

const cardClass = "bg-white rounded-lg shadow-card p-6 animate-fade-in";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const inputClass = "input";
const statLabelClass = "text-gray-600";
const statValueClass = "font-medium";

const Profile = () => {
  const { user } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!user?._id) return;

    setIsLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const [postsRes, profileRes] = await Promise.all([
          axios.get(`${API_URL}/api/users/${user._id}/posts`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          axios.get(`${API_URL}/api/users/${user._id}`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);
        setPosts(postsRes.data);
        setName(profileRes.data.name);
        setBio(profileRes.data.bio || "");
      } catch (err) {
        setError("Failed to load profile data. Please try again later.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, token]);

  const handleDeletePost = async (postId) => {
    try {
      await axios.delete(`${API_URL}/api/posts/${postId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      setPosts((prev) => prev.filter((post) => post._id !== postId));
      toast.success("Post deleted successfully!");
    } catch (err) {
      toast.error("Failed to delete post. Please try again.");
      console.error(err);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await axios.put(
        `${API_URL}/api/users/${user?._id}`,
        { name, bio },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success("Profile updated successfully!");
      setIsEditMode(false);
    } catch (err) {
      toast.error("Failed to update profile. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Memoized stats
  const stats = useMemo(() => {
    let likes = 0,
      comments = 0;
    posts.forEach((post) => {
      likes += post.likes?.length || 0;
      comments += post.comments?.length || 0;
    });
    return { likes, comments, postsCount: posts.length };
  }, [posts]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-custom py-12 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1">
          <div className={cardClass}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
              <button
                onClick={() => setIsEditMode((v) => !v)}
                className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Edit Profile"
              >
                <Settings size={18} />
              </button>
            </div>
            {isEditMode ? (
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label htmlFor="name" className={labelClass}>
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    className={inputClass}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="bio" className={labelClass}>
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    rows={4}
                    className={inputClass}
                    placeholder="Tell us about yourself"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsEditMode(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmitting}
                  >
                    Save
                  </Button>
                </div>
              </form>
            ) : (
              <div>
                <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-800 font-bold text-3xl mb-4 mx-auto">
                  {name.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-lg font-semibold text-center mb-2">
                  {name}
                </h3>
                <p className="text-gray-600 text-center mb-4">
                  {bio || "No bio provided yet"}
                </p>
                <div className="flex items-center justify-center">
                  <div className="flex items-center space-x-1 text-gray-500">
                    <User size={16} />
                    <span className="text-sm">{user?.email}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className={`${cardClass} mt-6`}>
            <h3 className="text-lg font-semibold mb-3">Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className={statLabelClass}>Posts</span>
                <span className={statValueClass}>{stats.postsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className={statLabelClass}>Likes received</span>
                <span className={statValueClass}>{stats.likes}</span>
              </div>
              <div className="flex justify-between">
                <span className={statLabelClass}>Comments received</span>
                <span className={statValueClass}>{stats.comments}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="md:col-span-3">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Posts</h2>
          </div>
          {posts.length > 0 ? (
            <div className="space-y-6 animate-fade-in">
              {posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  isOwner={true}
                  onDelete={handleDeletePost}
                  UserId={user?._id}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg p-8 text-center shadow-card animate-fade-in">
              <p className="text-gray-600 mb-4">
                You haven't created any posts yet.
              </p>
              <Button as="a" href="/create" variant="primary">
                Create Your First Post
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
