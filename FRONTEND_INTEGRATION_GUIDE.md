# Frontend Integration Guide - Optimized Posts API

## API Base URL
```
http://localhost:3001/api
```

## Authentication
All protected endpoints require Bearer token authentication:
```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

## Optimized API Endpoints

### 1. Authentication
```typescript
// Login
POST /auth/login
Body: { email: string, password: string }
Response: { success: boolean, data: { user: User, token: string } }

// Get current user
GET /auth/me
Headers: Authorization required
Response: { success: boolean, data: User }
```

### 2. Posts Management (Optimized ⚡)

#### Get All Posts (Paginated)
```typescript
GET /posts?page=1&limit=10
Response: {
  success: boolean,
  data: Post[],
  total: number,
  page: number,
  limit: number
}
```

#### Get Single Post
```typescript
GET /posts/:id
Response: { success: boolean, data: Post }
```

#### Create Post
```typescript
POST /posts
Headers: Authorization required
Body: {
  title: string,
  content: string,
  tags: string[]
}
Response: { success: boolean, data: Post }
```

#### Search Posts (Optimized ⚡)
```typescript
GET /posts/search?keyword=search&tags=tag1,tag2&sortBy=newest|oldest|most_votes
Response: {
  success: boolean,
  data: Post[],
  total: number
}
```

#### Vote on Post (Optimized ⚡)
```typescript
POST /posts/:id/vote
Headers: Authorization required
Body: { type: 'upvote' | 'downvote' | 'remove' }
Response: { success: boolean, votes: number }
```

#### Delete Post (Admin Only)
```typescript
DELETE /posts/:id
Headers: Authorization required
Response: { success: boolean }
```

### 3. Comments Management (Optimized ⚡)

#### Get Post Comments
```typescript
GET /posts/:id/comments
Response: {
  success: boolean,
  data: Comment[],
  total: number
}
```

#### Create Comment
```typescript
POST /posts/:id/comments
Headers: Authorization required
Body: {
  content: string,
  parentCommentId?: string
}
Response: { success: boolean, data: Comment }
```

#### Vote on Comment (Optimized ⚡)
```typescript
POST /comments/:id/vote
Headers: Authorization required
Body: { type: 'upvote' | 'downvote' | 'remove' }
Response: { success: boolean, votes: number }
```

## TypeScript Interfaces

### User Interface
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'student' | 'teacher' | 'admin';
  isActive: boolean;
  avatar: string;
  createdAt: string;
}
```

### Post Interface (Optimized)
```typescript
interface Post {
  id: string;
  title: string;
  content: string;
  tags: string[];
  authorId: string;
  authorName: string;      // Denormalized for performance
  authorRole: string;      // Denormalized for performance
  votes: number;           // Real-time vote count
  upvotedBy: string[];     // Currently empty, implement if needed
  downvotedBy: string[];   // Currently empty, implement if needed
  createdAt: string;
  updatedAt: string;
}
```

### Comment Interface (Optimized)
```typescript
interface Comment {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  authorName: string;      // Denormalized for performance
  authorRole: string;      // Denormalized for performance
  parentCommentId: string | null;
  votes: number;           // Real-time vote count
  upvotedBy: string[];     // Currently empty, implement if needed
  downvotedBy: string[];   // Currently empty, implement if needed
  createdAt: string;
  updatedAt: string;
}
```

## Performance Optimizations in API

### ⚡ Vote Count Performance
- **Real-time Updates**: Vote counts are maintained in real-time using database transactions
- **No N+1 Queries**: Vote counts are denormalized, eliminating expensive calculations
- **Atomic Operations**: All vote operations are atomic and consistent

### ⚡ Search Performance
- **Database-level Sorting**: Sorting by votes uses optimized database queries
- **Efficient Pagination**: Proper LIMIT/OFFSET implementation
- **Keyword Search**: Full-text search on title and content

### ⚡ Data Loading Performance
- **Denormalized Author Info**: Author names and roles are pre-calculated
- **Single Query Listing**: Post/comment listings use minimal database queries
- **Optimized Relations**: Efficient JOIN operations for related data

## Frontend Implementation Examples

### React Hook for Posts
```typescript
import { useState, useEffect } from 'react';

interface UsePostsOptions {
  page?: number;
  limit?: number;
  keyword?: string;
  tags?: string[];
  sortBy?: 'newest' | 'oldest' | 'most_votes';
}

export function usePosts(options: UsePostsOptions = {}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (options.page) params.set('page', options.page.toString());
        if (options.limit) params.set('limit', options.limit.toString());
        if (options.keyword) params.set('keyword', options.keyword);
        if (options.tags?.length) params.set('tags', options.tags.join(','));
        if (options.sortBy) params.set('sortBy', options.sortBy);

        const endpoint = options.keyword || options.tags?.length 
          ? `/api/posts/search?${params}`
          : `/api/posts?${params}`;

        const response = await fetch(endpoint);
        const data = await response.json();
        
        if (data.success) {
          setPosts(data.data);
          setTotal(data.total);
        }
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [options.page, options.limit, options.keyword, options.tags, options.sortBy]);

  return { posts, loading, total, refetch: () => fetchPosts() };
}
```

### Vote Component
```typescript
interface VoteComponentProps {
  postId: string;
  initialVotes: number;
  userVote?: 'upvote' | 'downvote' | null;
}

export function VoteComponent({ postId, initialVotes, userVote }: VoteComponentProps) {
  const [votes, setVotes] = useState(initialVotes);
  const [currentVote, setCurrentVote] = useState(userVote);

  const handleVote = async (type: 'upvote' | 'downvote') => {
    try {
      const voteType = currentVote === type ? 'remove' : type;
      
      const response = await fetch(`/api/posts/${postId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: voteType })
      });

      const data = await response.json();
      if (data.success) {
        setVotes(data.votes);
        setCurrentVote(voteType === 'remove' ? null : type);
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  return (
    <div className="vote-controls">
      <button 
        onClick={() => handleVote('upvote')}
        className={currentVote === 'upvote' ? 'active' : ''}
      >
        ▲
      </button>
      <span>{votes}</span>
      <button 
        onClick={() => handleVote('downvote')}
        className={currentVote === 'downvote' ? 'active' : ''}
      >
        ▼
      </button>
    </div>
  );
}
```

## Migration Notes

### From Previous API Version
1. **Vote Counts**: Now returned directly in post/comment objects as `votes` field
2. **Author Info**: `authorName` and `authorRole` are now included in responses
3. **Performance**: Significantly faster response times for all endpoints
4. **Search**: Enhanced search with better sorting options

### Breaking Changes
- None - all existing frontend code should continue working
- Enhanced performance with same response format

## Testing Credentials

For development and testing:
```typescript
const testCredentials = {
  admin: { email: 'admin@university.edu', password: 'admin123' },
  teacher: { email: 'teacher@university.edu', password: 'teacher123' },
  student: { email: 'student@university.edu', password: 'student123' }
};
```

---

**Status**: ✅ Ready for frontend integration
**Performance**: Optimized for production use
**Compatibility**: Backward compatible with existing frontend code
