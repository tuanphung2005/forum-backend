import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { mapPostToResponse, mapCommentToResponse } from '../utils/mappers';
import type { PostsAPIRequest, CreatePostRequest, CreateCommentRequest, VoteRequest } from '../types/api';

const router = Router();

// New post
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, tags } = req.body;
    const userId = req.user!.id;

    // check
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    // Get user info + denormalized fields
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create post
    const post = await prisma.post.create({
      data: {
        title,
        content,
        tags: JSON.stringify(tags || []),
        authorId: userId,
        authorName: user.fullName,
        authorRole: user.role,
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            role: true,
          }
        },
        _count: {
          select: {
            comments: true,
            postVotes: true,
          }
        }
      }
    });    return res.status(201).json({
      success: true,
      data: mapPostToResponse(post, post.voteCount),
      message: 'Post created successfully'
    });
  } catch (error) {
    console.error('Error creating post:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all posts
router.get('/', async (req: PostsAPIRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // pagination
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              fullName: true,
              role: true,
            }
          },
          _count: {
            select: {
              comments: true,
              postVotes: true,
            }
          }
        }
      }),
      prisma.post.count()
    ]);    // Get posts + pagination + map format
    const postsWithVotes = posts.map(post => mapPostToResponse(post, post.voteCount));

    return res.json({
      success: true,
      data: postsWithVotes,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Error getting posts:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Search posts
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { keyword = '', tags = '', sortBy = 'newest' } = req.query;
    const tagsArray = tags ? (tags as string).split(',').map(tag => tag.trim()) : [];


    const where: any = {};
    
    // keyword search
    if (keyword) {
      where.OR = [
        { title: { contains: keyword as string } },
        { content: { contains: keyword as string } }
      ];
    }

    // Add tag filtering
    if (tagsArray.length > 0) {
      // JSON_CONTAINS
      const tagConditions = tagsArray.map(tag => ({
        tags: {
          string_contains: `"${tag}"`
        }
      }));
      
      // existing
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: tagConditions }
        ];
        delete where.OR;
      } else {
        where.OR = tagConditions;
      }
    }

    // Order by clause
    let orderBy: any = { createdAt: 'desc' }; // default newest
    if (sortBy === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else if (sortBy === 'most_votes') {
      orderBy = { voteCount: 'desc' };
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy,
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            role: true,
          }
        },
        _count: {
          select: {
            comments: true,
            postVotes: true,
          }
        }
      }
    });

    // Map posts => response format using the denormalized voteCount
    const postsWithVotes = posts.map(post => mapPostToResponse(post, post.voteCount));

    return res.json({
      success: true,
      data: postsWithVotes,
      total: postsWithVotes.length
    });
  } catch (error) {
    console.error('Error searching posts:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// get post by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            role: true,
          }
        },
        _count: {
          select: {
            comments: true,
            postVotes: true,
          }
        }
      }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }    return res.json({
      success: true,
      data: mapPostToResponse(post, post.voteCount)
    });
  } catch (error) {
    console.error('Error getting post:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete a post (admin)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;

    // Check
    const existingPost = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Delete votes and truoc
    await prisma.postVote.deleteMany({
      where: { postId }
    });

    await prisma.commentVote.deleteMany({
      where: {
        comment: {
          postId
        }
      }
    });

    await prisma.comment.deleteMany({
      where: { postId }
    });

    // Delete post
    await prisma.post.delete({
      where: { id: postId }
    });

    return res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create comment on post
router.post('/:id/comments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const { content, parentCommentId } = req.body;
    const userId = req.user!.id;

    // check du fields
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Content is required'
      });
    }

    // Check post
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Get user info => denormalized fields
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // parentCommentId check ton tai
    if (parentCommentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentCommentId }
      });

      if (!parentComment || parentComment.postId !== postId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parent comment'
        });
      }
    }

    // tao comment
    const comment = await prisma.comment.create({
      data: {
        content,
        postId,
        authorId: userId,
        authorName: user.fullName,
        authorRole: user.role,
        parentCommentId: parentCommentId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            role: true,
          }
        }
      }
    });    return res.status(201).json({
      success: true,
      data: mapCommentToResponse(comment, comment.voteCount),
      message: 'Comment created successfully'
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// get comment 1 post
router.get('/:id/comments', async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;

    // post ton tai k?
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            role: true,
          }
        }
      }
    });    // mapp comment thanh votecount dung denormalized
    const commentsWithVotes = comments.map(comment => mapCommentToResponse(comment, comment.voteCount));

    return res.json({
      success: true,
      data: commentsWithVotes,
      total: commentsWithVotes.length
    });
  } catch (error) {
    console.error('Error getting comments:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Vote post
router.post('/:id/vote', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const { type } = req.body; // 'upvote', 'downvote', or 'remove'
    const userId = req.user!.id;

    // Check
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user has already chua?
    const existingVote = await prisma.postVote.findUnique({
      where: {
        postId_userId: {
          userId,
          postId
        }
      }
    });    if (type === 'remove') {
      // xoa vote
      if (existingVote) {
        const voteValue = existingVote.type === 'UPVOTE' ? -1 : 1;
        
        await prisma.$transaction([
          prisma.postVote.delete({
            where: {
              postId_userId: {
                userId,
                postId
              }
            }
          }),
          prisma.post.update({
            where: { id: postId },
            data: {
              voteCount: {
                increment: voteValue
              }
            }
          })
        ]);
      }
    } else {
      const voteType = type === 'upvote' ? 'UPVOTE' : 'DOWNVOTE';
      const voteValue = voteType === 'UPVOTE' ? 1 : -1;
      
      if (existingVote) {
        // update vote / diff
        const oldVoteValue = existingVote.type === 'UPVOTE' ? -1 : 1;
        const voteChange = voteValue - oldVoteValue;
        
        await prisma.$transaction([
          prisma.postVote.update({
            where: {
              postId_userId: {
                userId,
                postId
              }
            },
            data: { type: voteType }
          }),
          prisma.post.update({
            where: { id: postId },
            data: {
              voteCount: {
                increment: voteChange
              }
            }
          })
        ]);
      } else {
        // new vote
        await prisma.$transaction([
          prisma.postVote.create({
            data: {
              userId,
              postId,
              type: voteType
            }
          }),
          prisma.post.update({
            where: { id: postId },
            data: {
              voteCount: {
                increment: voteValue
              }
            }
          })
        ]);
      }
    }

    // update vote
    const updatedPost = await prisma.post.findUnique({
      where: { id: postId },
      select: { voteCount: true }
    });

    return res.json({
      success: true,
      votes: updatedPost?.voteCount || 0
    });
  } catch (error) {
    console.error('Error voting on post:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
