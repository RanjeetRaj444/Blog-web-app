import { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import CommentForm from "./CommentForm";
import CommentItem from "./CommentItem";
import Button from "../ui/Button";

const CommentSection = ({
  postId,
  comments,
  onAddComment,
  onDeleteComment,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localComments, setLocalComments] = useState(comments);
  const [showForm, setShowForm] = useState(false);
  const { isAuthenticated } = useContext(AuthContext);

  const handleSubmit = async (content) => {
    try {
      setIsSubmitting(true);
      await onAddComment(postId, content);
      // In a real app we would get the new comment from the server response
      // For now we'll simulate it with a local object
      const newComment = {
        _id: `temp-${Date.now()}`,
        content,
        author: { _id: "current-user", name: "You" },
        createdAt: new Date().toISOString(),
      };
      setLocalComments([newComment, ...localComments]);
      setShowForm(false);
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await onDeleteComment(postId, commentId);
      setLocalComments(
        localComments.filter((comment) => comment._id !== commentId)
      );
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
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
          <a href="/login" className="text-primary-600 hover:text-primary-700">
            log in
          </a>{" "}
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
