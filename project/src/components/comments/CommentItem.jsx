import { useContext, useState } from 'react';
import { format } from 'date-fns';
import { Trash2, Pencil } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

const CommentItem = ({ comment, onDelete, onEdit }) => {
  const { user } = useContext(AuthContext);
  const isAuthor = user && user._id === comment.author._id;
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);

  const startEdit = () => {
    setDraft(comment.content);
    setIsEditing(true);
  };

  const save = async () => {
    const content = draft.trim();
    if (!content) return;
    try {
      setIsSaving(true);
      await onEdit(comment._id, content);
      setIsEditing(false);
    } catch {
      // parent shows the error; keep the editor open so nothing is lost
    } finally {
      setIsSaving(false);
    }
  };

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

        {isAuthor && !isEditing && (
          <div className="flex space-x-1">
            {onEdit && (
              <button
                onClick={startEdit}
                className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                title="Edit comment"
                aria-label="Edit comment"
              >
                <Pencil size={16} />
              </button>
            )}
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              title="Delete comment"
              aria-label="Delete comment"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="mt-2">
          <textarea
            className="input"
            rows={3}
            maxLength={1000}
            aria-label="Edit your comment"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex justify-end space-x-2 mt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={isSaving || draft.trim() === ''}
              onClick={save}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-gray-700 whitespace-pre-line">
          {comment.content}
          {comment.edited && (
            <span className="text-xs text-gray-400 ml-2">(edited)</span>
          )}
        </p>
      )}
    </div>
  );
};

export default CommentItem;
