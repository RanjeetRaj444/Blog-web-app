import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PenSquare, Home, User, Menu, X, LogOut } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container-custom">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <div className="h-8 w-8 rounded-md bg-primary-600 flex items-center justify-center">
              <PenSquare size={20} className="text-white" />
            </div>
            <span className="ml-2 text-xl font-bold text-primary-800">Panini8 Blog</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="flex items-center text-gray-700 hover:text-primary-600 transition-colors">
              <Home size={18} className="mr-1" />
              <span>Home</span>
            </Link>

            {isAuthenticated ? (
              <>
                <Link to="/create" className="flex items-center text-gray-700 hover:text-primary-600 transition-colors">
                  <PenSquare size={18} className="mr-1" />
                  <span>Create Post</span>
                </Link>
                <Link to="/profile" className="flex items-center text-gray-700 hover:text-primary-600 transition-colors">
                  <User size={18} className="mr-1" />
                  <span>Profile</span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="btn-primary flex items-center" 
                >
                  <LogOut size={18} className="mr-1" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <div className="flex space-x-3">
                <Link to="/login" className="btn-secondary">Login</Link>
                <Link to="/register" className="btn-primary">Register</Link>
              </div>
            )}
          </div>

          <div className="md:hidden">
            <button onClick={toggleMenu} className="p-2 text-gray-700 hover:text-primary-600 focus:outline-none">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-white shadow-lg animate-fade-in">
          <div className="container-custom py-4 space-y-3">
            <Link 
              to="/" 
              className="block py-2 px-4 text-gray-700 hover:bg-gray-100 rounded-md"
              onClick={closeMenu}
            >
              <div className="flex items-center">
                <Home size={18} className="mr-2" />
                Home
              </div>
            </Link>
            
            {isAuthenticated ? (
              <>
                <Link 
                  to="/create" 
                  className="block py-2 px-4 text-gray-700 hover:bg-gray-100 rounded-md"
                  onClick={closeMenu}
                >
                  <div className="flex items-center">
                    <PenSquare size={18} className="mr-2" />
                    Create Post
                  </div>
                </Link>
                <Link 
                  to="/profile" 
                  className="block py-2 px-4 text-gray-700 hover:bg-gray-100 rounded-md"
                  onClick={closeMenu}
                >
                  <div className="flex items-center">
                    <User size={18} className="mr-2" />
                    Profile
                  </div>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left block py-2 px-4 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <div className="flex items-center">
                    <LogOut size={18} className="mr-2" />
                    Logout
                  </div>
                </button>
              </>
            ) : (
              <div className="flex flex-col space-y-2 pt-2">
                <Link 
                  to="/login" 
                  className="btn-secondary text-center"
                  onClick={closeMenu}
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="btn-primary text-center"
                  onClick={closeMenu}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;