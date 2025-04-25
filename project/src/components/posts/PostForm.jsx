import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import Button from '../ui/Button';




const PostForm = ({ initialData, onSubmit, isSubmitting }) => {
  const [tags, setTags] = useState(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
      tags: '',
    }
  });

  const handleAddTag = () => {
    if (tagInput.trim() !== '' && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const onFormSubmit = (data) => {
    onSubmit({
      title: data.title,
      content: data.content,
      tags,
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <input
          id="title"
          type="text"
          className={`input ${errors.title ? 'border-red-500 focus:ring-red-500' : ''}`}
          placeholder="Enter post title"
          {...register('title', { required: 'Title is required' })}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
          Content
        </label>
        <textarea
          id="content"
          rows={8}
          className={`input ${errors.content ? 'border-red-500 focus:ring-red-500' : ''}`}
          placeholder="Write your post content here..."
          {...register('content', { required: 'Content is required' })}
        />
        {errors.content && (
          <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
          Tags
        </label>
        <div className="flex items-center">
          <input
            id="tags"
            type="text"
            className="input"
            placeholder="Add a tag and press Enter"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button 
            type="button" 
            variant="secondary" 
            className="ml-2 whitespace-nowrap"
            onClick={handleAddTag}
          >
            Add Tag
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-3">
          {tags.map((tag, index) => (
            <div key={index} className="tag pl-2 pr-1 py-1 flex items-center">
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 p-0.5 text-primary-700 hover:text-primary-900 rounded-full"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button 
          type="submit" 
          variant="primary"
          isLoading={isSubmitting}
        >
          {initialData ? 'Update Post' : 'Create Post'}
        </Button>
      </div>
    </form>
  );
};

export default PostForm;