import { useState } from 'react';
import Button from '../ui/Button';

const CommentForm = ({ onSubmit, isSubmitting, onCancel }) => {
  const [content, setContent] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (content.trim() === '') return;
    try {
      await onSubmit(content.trim());
      setContent('');
    } catch {
      // Keep the typed text so the user can retry; the parent shows the error.
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="mb-3">
        <textarea
          className="input"
          rows={4}
          maxLength={1000}
          placeholder="Share your thoughts..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
      </div>
      <div className="flex justify-end space-x-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={content.trim() === ''}
          isLoading={isSubmitting}
        >
          Submit
        </Button>
      </div>
    </form>
  );
};

export default CommentForm;
