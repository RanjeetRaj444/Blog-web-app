import { useState, useEffect, useCallback, useContext } from "react";
import { Filter, Search } from "lucide-react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import usePageTitle from "../hooks/usePageTitle";
import PostCard from "../components/posts/PostCard";
import { PostListSkeleton } from "../components/ui/Skeleton";

const tagButtonBase = "px-3 py-1.5 rounded-full text-sm font-medium transition";
const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 400;

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [retryCount, setRetryCount] = useState(0);
  const { token } = useContext(AuthContext);

  usePageTitle();

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchInput]);

  const fetchPage = useCallback(
    async (pageNumber) => {
      const response = await axios.get("/api/posts", {
        params: {
          page: pageNumber,
          limit: PAGE_SIZE,
          sort,
          ...(selectedTag ? { tag: selectedTag } : {}),
          ...(search ? { q: search } : {}),
        },
      });
      return response.data;
    },
    [selectedTag, search, sort]
  );

  // First page (re)loads when the filters, search, sort or user change.
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchPage(1);
        if (ignore) return;
        setPosts(data.posts);
        setPage(data.page);
        setPages(data.pages);
      } catch (err) {
        if (!ignore) {
          setError("Failed to fetch posts.");
          console.error(err);
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [fetchPage, retryCount, token]);

  useEffect(() => {
    axios
      .get("/api/posts/tags")
      .then((res) => setAllTags(res.data))
      .catch((err) => console.error("Error loading tags:", err));
  }, []);

  const handleLoadMore = async () => {
    try {
      setIsLoadingMore(true);
      const data = await fetchPage(page + 1);
      setPosts((prev) => [
        ...prev,
        ...data.posts.filter((p) => !prev.some((x) => x._id === p._id)),
      ]);
      setPage(data.page);
      setPages(data.pages);
    } catch (err) {
      console.error("Error loading more posts:", err);
      setError("Failed to load more posts.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleLike = useCallback(async (postId) => {
    // PostCard reverts its optimistic update if this throws.
    await axios.post(`/api/posts/${postId}/like`);
  }, []);

  const handleDelete = useCallback(async (postId) => {
    try {
      await axios.delete(`/api/posts/${postId}`);
      setPosts((prev) => prev.filter((post) => post._id !== postId));
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  }, []);

  const toggleFilter = () => setIsFilterOpen((v) => !v);

  return (
    <div className="container-custom py-8">
      <div className="flex flex-col md:flex-row justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Panini8 Blog
          </h1>
          <p className="text-gray-600 max-w-2xl">
            Explore the latest thoughts, ideas, and stories from our community.
            Search, sort, or filter by tags to find content that interests you.
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

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Search posts"
            placeholder="Search posts..."
            className="input pl-10"
            value={searchInput}
            maxLength={100}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <select
          aria-label="Sort posts"
          className="input sm:w-48"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="popular">Most liked</option>
        </select>
      </div>

      {isFilterOpen && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-fade-in">
          <h3 className="text-lg font-medium mb-3">Filter by tag</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag(null)}
              className={`${tagButtonBase} ${
                selectedTag === null
                  ? "bg-primary-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`${tagButtonBase} ${
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
        <PostListSkeleton />
      ) : error && posts.length === 0 ? (
        <div className="text-center py-20" role="alert">
          <p className="text-red-600 mb-2">{error}</p>
          <p className="text-gray-600 mb-4">
            The server may be waking up (free hosting sleeps when idle). This
            can take up to a minute.
          </p>
          <button
            className="btn-primary"
            onClick={() => setRetryCount((c) => c + 1)}
          >
            Retry
          </button>
        </div>
      ) : posts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onLike={handleLike}
                onDelete={handleDelete}
              />
            ))}
          </div>
          {error && <p className="text-center text-red-600 mt-6">{error}</p>}
          {page < pages && (
            <div className="flex justify-center mt-8">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="btn-secondary"
              >
                {isLoadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20">
          <p className="text-gray-600">
            {search
              ? `No posts match "${search}".`
              : selectedTag
              ? `No posts found with the tag "${selectedTag}".`
              : "No posts found. Check back later!"}
          </p>
        </div>
      )}
    </div>
  );
};

export default Home;
