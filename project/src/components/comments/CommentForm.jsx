import { useState } from 'react';
import Button from '../ui/Button';



const CommentForm = ({ onSubmit, isSubmitting, onCancel }) => {
  const [content, setContent] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (content.trim() !== '') {
      await onSubmit(content);
      setContent('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="mb-3">
        <textarea
          className="input"
          rows={4}
          placeholder="Share your thoughts..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
      </div>
      <div className="flex justify-end space-x-3">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          variant="primary"
          disabled={content.trim() === '' || isSubmitting}
          isLoading={isSubmitting}
        >
          Submit
        </Button>
      </div>
    </form>
  );
};

export default CommentForm;