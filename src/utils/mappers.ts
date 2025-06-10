import { User, Post, Comment, UserRole } from '@prisma/client';
import { UserResponse, PostResponse, CommentResponse } from '../types/api';

// Map database UserRole enum => frontend string
export function mapUserRole(role: UserRole): 'student' | 'teacher' | 'admin' {
  switch (role) {
    case 'STUDENT':
      return 'student';
    case 'TEACHER':
      return 'teacher';
    case 'ADMIN':
      return 'admin';
    default:
      return 'student';
  }
}

// Map frontend role string => database UserRole enum
export function mapToUserRole(role: string): UserRole {
  switch (role.toLowerCase()) {
    case 'teacher':
      return 'TEACHER';
    case 'admin':
      return 'ADMIN';
    case 'student':
    default:
      return 'STUDENT';
  }
}

// Map User model => UserResponse
export function mapUserToResponse(user: User): UserResponse {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    role: mapUserRole(user.role),
    isActive: user.isActive,
    avatar: user.avatar || undefined,
    createdAt: user.createdAt.toISOString(),
  };
}

// Map Post model => PostResponse
export function mapPostToResponse(
  post: Post & { 
    author?: {
      id: string;
      fullName: string;
      role: UserRole;
    };
    _count?: {
      comments: number;
      postVotes: number;
    };
  },
  votes: number = 0
): PostResponse {
  let tags: string[] = [];
  try {
    if (typeof post.tags === 'string') {
      tags = JSON.parse(post.tags);
    } else if (Array.isArray(post.tags)) {
      tags = post.tags as string[];
    }
  } catch (error) {
    tags = [];
  }
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    tags,
    authorId: post.authorId,
    authorName: post.author?.fullName || post.authorName,
    authorRole: post.author ? mapUserRole(post.author.role) : mapUserRole(post.authorRole),
    votes,
    upvotedBy: [], // Will be populated by the API route
    downvotedBy: [], // Will be populated by the API route
    commentCount: post._count?.comments || 0, // Include comment count
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

// Map Comment model => CommentResponse
export function mapCommentToResponse(
  comment: Comment & {
    author?: {
      id: string;
      fullName: string;
      role: UserRole;
    };
  },
  votes: number = 0
): CommentResponse {
  return {
    id: comment.id,
    content: comment.content,
    postId: comment.postId,
    authorId: comment.authorId,
    authorName: comment.author?.fullName || comment.authorName,
    authorRole: comment.author ? mapUserRole(comment.author.role) : mapUserRole(comment.authorRole),
    parentCommentId: comment.parentCommentId || undefined,
    votes,
    upvotedBy: [],
    downvotedBy: [],
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}
