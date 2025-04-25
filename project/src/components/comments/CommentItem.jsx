import { useContext } from 'react';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';




const CommentItem = ({ comment, onDelete }) => {
  const { user } = useContext(AuthContext);
  const isAuthor = user && user._id === comment.author._id;
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 animate-fade-in">
      <div className="flex justify-between items-start">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-800 font-semibold">
            {comment.author.name.charAt(0).toUpperCase()}
          </div>
          <div className="ml-3">
            <span className="font-medium text-gray-900">{comment.author.name}</span>
            <span className="text-sm text-gray-500 ml-2">
              {format(new Date(comment.createdAt), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
        
        {isAuthor && (
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete comment"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      
      <p className="mt-2 text-gray-700 whitespace-pre-line">{comment.content}</p>
    </div>
  );
};

export default CommentItem;