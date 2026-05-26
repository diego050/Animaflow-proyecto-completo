export function JobCardSkeleton() {
  return (
    <div className="bg-surface-high border border-border-tech rounded-xl overflow-hidden animate-pulse">
      {/* Thumbnail area */}
      <div className="aspect-video bg-surface-container" />
      {/* Info area */}
      <div className="p-3 space-y-2">
        <div className="h-4 bg-surface-container rounded w-3/4" />
        <div className="h-3 bg-surface-container rounded w-1/2" />
        <div className="flex gap-2 pt-1">
          <div className="h-6 bg-surface-container rounded flex-1" />
          <div className="h-6 bg-surface-container rounded flex-1" />
          <div className="h-6 bg-surface-container rounded w-6" />
        </div>
      </div>
    </div>
  );
}
