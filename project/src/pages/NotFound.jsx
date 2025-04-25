import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="container-custom py-20">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-6">404</h1>
        <p className="text-2xl text-gray-700 mb-8">Page not found</p>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link 
          to="/" 
          className="btn-primary inline-flex items-center"
        >
          <Home size={18} className="mr-2" />
          Go to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;