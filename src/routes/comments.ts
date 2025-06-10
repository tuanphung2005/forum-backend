import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import type { VoteRequest } from '../types/api';

const router = Router();

// Vote
router.post('/:id/vote', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const commentId = req.params.id;
    const { type } = req.body; // 'upvote', 'downvote', or 'remove'
    const userId = req.user!.id;

    // Check comment existence
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check user vote
    const existingVote = await prisma.commentVote.findUnique({
      where: {
        commentId_userId: {
          userId,
          commentId
        }
      }
    });    if (type === 'remove') {
      // Remove vote
      if (existingVote) {
        const voteValue = existingVote.type === 'UPVOTE' ? -1 : 1;
        
        await prisma.$transaction([
          prisma.commentVote.delete({
            where: {
              commentId_userId: {
                userId,
                commentId
              }
            }
          }),
          prisma.comment.update({
            where: { id: commentId },
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
        // Update vote
        const oldVoteValue = existingVote.type === 'UPVOTE' ? -1 : 1;
        const voteChange = voteValue - oldVoteValue;
        
        await prisma.$transaction([
          prisma.commentVote.update({
            where: {
              commentId_userId: {
                userId,
                commentId
              }
            },
            data: { type: voteType }
          }),
          prisma.comment.update({
            where: { id: commentId },
            data: {
              voteCount: {
                increment: voteChange
              }
            }
          })
        ]);
      } else {
        // New vote
        await prisma.$transaction([
          prisma.commentVote.create({
            data: {
              userId,
              commentId,
              type: voteType
            }
          }),
          prisma.comment.update({
            where: { id: commentId },
            data: {
              voteCount: {
                increment: voteValue
              }
            }
          })
        ]);
      }
    }

    // update vote count
    const updatedComment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { voteCount: true }
    });

    return res.json({
      success: true,
      votes: updatedComment?.voteCount || 0
    });
  } catch (error) {
    console.error('Error voting on comment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
