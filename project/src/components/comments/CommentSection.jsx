import { useState, useContext, useEffect } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import CommentForm from "./CommentForm";
import CommentItem from "./CommentItem";
import Button from "../ui/Button";

const CommentSection = ({
  postId,
  comments,
  onAddComment,
  onDeleteComment,
  onEditComment,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localComments, setLocalComments] = useState(comments);
  const [showForm, setShowForm] = useState(false);
  const { isAuthenticated } = useContext(AuthContext);

  useEffect(() => {
    setLocalComments(comments);
  }, [comments]);

  // The handlers return the server's updated comment list and throw on failure,
  // so the UI only changes when the server accepted the change.
  const handleSubmit = async (content) => {
    try {
      setIsSubmitting(true);
      const updated = await onAddComment(postId, content);
      setLocalComments(updated);
      setShowForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      const updated = await onDeleteComment(postId, commentId);
      setLocalComments(updated);
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const handleEdit = async (commentId, content) => {
    const updated = await onEditComment(postId, commentId, content);
    setLocalComments(updated);
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">
        Comments ({localComments.length})
      </h3>

      {isAuthenticated ? (
        showForm ? (
          <CommentForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <Button
            onClick={() => setShowForm(true)}
            variant="secondary"
            className="mb-6"
          >
            Write a comment
          </Button>
        )
      ) : (
        <p className="text-gray-600 mb-6">
          Please{" "}
          <Link to="/login" className="text-primary-600 hover:text-primary-700">
            log in
          </Link>{" "}
          to leave a comment.
        </p>
      )}

      <div className="space-y-4">
        {localComments.length > 0 ? (
          localComments.map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              onDelete={() => handleDelete(comment._id)}
              onEdit={onEditComment ? handleEdit : undefined}
            />
          ))
        ) : (
          <p className="text-gray-500 italic">
            No comments yet. Be the first to comment!
          </p>
        )}
      </div>
    </div>
  );
};

export default CommentSection;
