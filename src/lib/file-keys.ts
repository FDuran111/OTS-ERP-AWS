/**
 * Centralized file key generation for consistent storage paths
 */

export type FileCategory = 'jobs' | 'customers' | 'materials' | 'documents' | 'thumbnails';

/**
 * Get the bucket name for a file category
 * Maintains backwards compatibility with existing bucket structure
 */
export function bucketFor(category: FileCategory): string {
  // Keep backwards-compat bucket naming from inventory:
  // main bucket 'uploads' and 'thumbnails' for thumbs
  return category === 'thumbnails' ? 'thumbnails' : 'uploads';
}

/**
 * Generate a consistent storage key for a file
 * @param category - The file category
 * @param segments - Path segments to build the key
 * @returns The storage key path
 */
export function keyFor(category: FileCategory, segments: (string | number)[]): string {
  const base = category === 'thumbnails' ? '' : `${category}/`;
  const path = segments.map(String).join('/');
  return `${base}${path}`.replace(/\/+/g, '/');
}