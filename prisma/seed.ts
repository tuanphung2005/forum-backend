import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Hash passwords
  const hashedAdminPassword = await bcrypt.hash('admin123', 10);
  const hashedTeacherPassword = await bcrypt.hash('teacher123', 10);
  const hashedStudentPassword = await bcrypt.hash('student123', 10);

  // Create users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@university.edu' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@university.edu',
      password: hashedAdminPassword,
      fullName: 'Quản trị viên',
      role: UserRole.ADMIN,
      avatar: 'https://ui-avatars.com/api/?name=Admin&background=ff4d4f&color=fff'
    }
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@university.edu' },
    update: {},
    create: {
      username: 'teacher1',
      email: 'teacher@university.edu',
      password: hashedTeacherPassword,
      fullName: 'Nguyễn Văn A',
      role: UserRole.TEACHER,
      avatar: 'https://ui-avatars.com/api/?name=Nguyen+Van+A&background=1890ff&color=fff'
    }
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@university.edu' },
    update: {},
    create: {
      username: 'student1',
      email: 'student@university.edu',
      password: hashedStudentPassword,
      fullName: 'Trần Thị B',
      role: UserRole.STUDENT,
      avatar: 'https://ui-avatars.com/api/?name=Tran+Thi+B&background=52c41a&color=fff'
    }
  });

  // Create sample posts
  const post1 = await prisma.post.create({
    data: {
      title: 'Chào mừng đến với diễn đàn trường đại học',
      content: '<p>Đây là bài đăng đầu tiên trên diễn đàn. Hãy tham gia thảo luận và chia sẻ kiến thức!</p>',
      tags: ['Thông báo', 'Chào mừng'],
      authorId: admin.id,
      authorName: admin.fullName,
      authorRole: admin.role,
    }
  });

  const post2 = await prisma.post.create({
    data: {
      title: 'Hướng dẫn sử dụng diễn đàn hiệu quả',
      content: '<p>Bài viết này sẽ hướng dẫn các bạn cách sử dụng diễn đàn một cách hiệu quả nhất.</p>',
      tags: ['Hướng dẫn', 'Giáo dục'],
      authorId: teacher.id,
      authorName: teacher.fullName,
      authorRole: teacher.role,
    }
  });

  // Create sample comments
  await prisma.comment.create({
    data: {
      content: 'Cảm ơn admin đã tạo ra diễn đàn tuyệt vời này!',
      postId: post1.id,
      authorId: student.id,
      authorName: student.fullName,
      authorRole: student.role,
    }
  });

  await prisma.comment.create({
    data: {
      content: 'Rất hữu ích! Cảm ơn thầy đã chia sẻ.',
      postId: post2.id,
      authorId: student.id,
      authorName: student.fullName,
      authorRole: student.role,
    }
  });

  console.log('✅ Database seeding completed!');
  console.log('Users created:');
  console.log('- Admin: admin@university.edu / admin123');
  console.log('- Teacher: teacher@university.edu / teacher123');
  console.log('- Student: student@university.edu / student123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
