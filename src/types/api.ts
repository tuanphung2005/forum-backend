// API Response Types that match frontend expectations

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// User types (matching frontend)
export interface UserResponse {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'student' | 'teacher' | 'admin'; // lowercase to match frontend
  isActive: boolean;
  avatar?: string;
  createdAt: string;
}

// Post types (matching frontend)
export interface PostResponse {
  id: string;
  title: string;
  content: string;
  tags: string[];
  authorId: string;
  authorName: string;
  authorRole: 'student' | 'teacher' | 'admin'; // lowercase to match frontend
  votes: number; // renamed from voteCount to match frontend
  upvotedBy: string[]; // computed from PostVote records
  downvotedBy: string[]; // computed from PostVote records
  commentCount?: number; // number of comments on this post
  createdAt: string;
  updatedAt: string;
}

// Comment types (matching frontend)
export interface CommentResponse {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: 'student' | 'teacher' | 'admin'; // lowercase to match frontend
  parentCommentId?: string;
  votes: number; // renamed from voteCount to match frontend
  upvotedBy: string[]; // computed from CommentVote records
  downvotedBy: string[]; // computed from CommentVote records
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role?: 'student' | 'teacher' | 'admin';
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}

// Post  types
export interface CreatePostRequest {
  title: string;
  content: string;
  tags: string[];
}

// Comment types
export interface CreateCommentRequest {
  postId: string;
  content: string;
  parentCommentId?: string;
}

// Vote types
export interface VoteRequest {
  targetId: string;
  type: 'upvote' | 'downvote';
}

// Search types
export interface SearchFilters {
  keyword?: string;
  tags?: string[];
  authorRole?: 'student' | 'teacher' | 'admin';
  dateRange?: string[];
  sortBy?: 'newest' | 'oldest' | 'most_votes' | 'most_comments';
}

// user context
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: UserResponse;
}

export interface PostsAPIRequest extends Request {
  user?: UserResponse;
  query: {
    page?: string;
    limit?: string;
    keyword?: string;
    tags?: string;
    sortBy?: string;
  };
}

export interface CreatePostRequest extends Request {
  user?: UserResponse;
  body: {
    title: string;
    content: string;
    tags: string[];
  };
}

export interface CreateCommentRequest extends Request {
  user?: UserResponse;
  body: {
    content: string;
    parentCommentId?: string;
  };
}

export interface VoteRequest extends Request {
  user?: UserResponse;
  body: {
    type: 'upvote' | 'downvote' | 'remove';
  };
}
