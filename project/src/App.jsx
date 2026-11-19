import { lazy, Suspense, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/layout/Navbar";
import LoadingSpinner from "./components/ui/LoadingSpinner";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import ChatBot from "./components/ChatBot";
import ErrorBoundary from "./components/ErrorBoundary";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const CreatePost = lazy(() => import("./pages/CreatePost"));
const EditPost = lazy(() => import("./pages/EditPost"));
const Profile = lazy(() => import("./pages/Profile"));
const AuthorPage = lazy(() => import("./pages/AuthorPage"));
const Bookmarks = lazy(() => import("./pages/Bookmarks"));
const NotFound = lazy(() => import("./pages/NotFound"));

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3 focus:text-primary-700"
          >
            Skip to content
          </a>
          <Navbar />
          <main id="main-content" className="flex-grow">
            <ErrorBoundary>
            <Suspense
              fallback={
                <div className="flex justify-center items-center h-screen">
                  <LoadingSpinner size="large" />
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/post/:id" element={<BlogPost />} />
                <Route path="/u/:id" element={<AuthorPage />} />
                <Route
                  path="/bookmarks"
                  element={
                    <ProtectedRoute>
                      <Bookmarks />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/create"
                  element={
                    <ProtectedRoute>
                      <CreatePost />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/edit/:id"
                  element={
                    <ProtectedRoute>
                      <EditPost />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </ErrorBoundary>
          </main>
          <footer className="bg-gray-100 py-6 mt-12">
            <div className="container-custom text-center text-gray-600">
              <p className="text-sm">
                © {new Date().getFullYear()} Panini8 Blog Platform. All rights
                reserved.
              </p>
            </div>
          </footer>

          {/* Chat Modal */}
          <ChatBot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

          {/* Chat with Bot Button */}
          {!isChatOpen && (
            <button
              onClick={() => setIsChatOpen(true)}
              className="btn-primary flex items-center fixed bottom-5 right-5 z-40"
            >
              Chat with Bot
            </button>
          )}
        </div>
        <Toaster position="top-right" />
      </Router>
    </AuthProvider>
  );
}

export default App;
