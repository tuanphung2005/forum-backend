import { PrismaClient } from '@prisma/client';

// Create a global variable to store the Prisma client instance
declare global {
  var __prisma: PrismaClient | undefined;
}

// Create Prisma client instance with connection pooling for production
const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// In development, store the instance globally to prevent multiple connections
if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

export { prisma };

// Helper function to check database connection
export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Helper function to disconnect database
export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('🔌 Database disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting database:', error);
  }
}

// Helper function to create computed vote counts
export async function updateVoteCounts() {
  try {
    // Update post vote counts
    await prisma.$executeRaw`
      UPDATE posts p 
      SET voteCount = (
        SELECT COALESCE(
          SUM(CASE WHEN pv.type = 'UPVOTE' THEN 1 WHEN pv.type = 'DOWNVOTE' THEN -1 ELSE 0 END), 
          0
        )
        FROM post_votes pv 
        WHERE pv.postId = p.id
      )
    `;

    // Update comment vote counts
    await prisma.$executeRaw`
      UPDATE comments c 
      SET voteCount = (
        SELECT COALESCE(
          SUM(CASE WHEN cv.type = 'UPVOTE' THEN 1 WHEN cv.type = 'DOWNVOTE' THEN -1 ELSE 0 END), 
          0
        )
        FROM comment_votes cv 
        WHERE cv.commentId = c.id
      )
    `;

    console.log('✅ Vote counts updated successfully');
  } catch (error) {
    console.error('❌ Error updating vote counts:', error);
  }
}
