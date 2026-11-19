// Skeleton loaders: pulsing placeholders shown while data loads.

export const Skeleton = ({ className = "" }) => (
  <div
    aria-hidden="true"
    className={`animate-pulse rounded bg-gray-200 ${className}`}
  />
);

const Wrapper = ({ label = "Loading", className = "", children }) => (
  <div role="status" aria-busy="true" aria-label={label} className={className}>
    {children}
  </div>
);

export const PostCardSkeleton = () => (
  <div className="card p-6" data-testid="post-card-skeleton">
    <Skeleton className="h-6 w-3/4 mb-2" />
    <Skeleton className="h-4 w-1/2 mb-6" />
    <Skeleton className="h-4 w-full mb-2" />
    <Skeleton className="h-4 w-full mb-2" />
    <Skeleton className="h-4 w-2/3 mb-6" />
    <div className="flex gap-2 mb-4">
      <Skeleton className="h-5 w-14 rounded-full" />
      <Skeleton className="h-5 w-14 rounded-full" />
    </div>
    <Skeleton className="h-5 w-full" />
  </div>
);

export const PostListSkeleton = ({ count = 6 }) => (
  <Wrapper
    label="Loading posts"
    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
  >
    {Array.from({ length: count }, (_, i) => (
      <PostCardSkeleton key={i} />
    ))}
  </Wrapper>
);

export const PostPageSkeleton = () => (
  <Wrapper label="Loading post" className="container-custom py-8">
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-card p-6 md:p-8">
      <Skeleton className="h-9 w-3/4 mb-6" />
      <div className="flex items-center mb-8">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="ml-3 flex-1">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-4 w-full mb-3" />
      ))}
      <Skeleton className="h-4 w-1/2 mt-2" />
    </div>
  </Wrapper>
);

export const ProfileSkeleton = () => (
  <Wrapper label="Loading profile" className="container-custom py-8">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
      <div className="md:col-span-1 space-y-6">
        <div className="bg-white rounded-lg shadow-card p-6">
          <Skeleton className="h-20 w-20 rounded-full mx-auto mb-4" />
          <Skeleton className="h-5 w-1/2 mx-auto mb-3" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
        </div>
        <div className="bg-white rounded-lg shadow-card p-6">
          <Skeleton className="h-4 w-full mb-3" />
          <Skeleton className="h-4 w-full mb-3" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
      <div className="md:col-span-3 space-y-6">
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    </div>
  </Wrapper>
);

export const AuthorSkeleton = () => (
  <Wrapper label="Loading author" className="container-custom py-8">
    <div className="bg-white rounded-lg shadow-card p-6 mb-8">
      <Skeleton className="h-20 w-20 rounded-full mx-auto mb-4" />
      <Skeleton className="h-6 w-40 mx-auto mb-3" />
      <Skeleton className="h-4 w-64 mx-auto" />
    </div>
    <PostListSkeleton count={3} />
  </Wrapper>
);

export default Skeleton;
