# Forum Backend API

## Prerequisites

- Node.js 18+ 
- MySQL database
- npm or yarn

## Setup Instructions

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Configure your .env file:**
   ```env
   DATABASE_URL="mysql://username:password@localhost:3306/forum_db"
   JWT_SECRET="your-super-secret-jwt-key-here"
   JWT_EXPIRES_IN="7d"
   PORT=3001
   NODE_ENV="development"
   FRONTEND_URL="http://localhost:8000"
   ```

5. **Create database (if not exists):**
   ```sql
   CREATE DATABASE forum_db;
   ```

6. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

7. **Push database schema:**
   ```bash
   npx prisma db push
   ```

8. **Seed database:**
   ```bash
   npm run db:seed
   ```

9. **Start development server:**
   ```bash
   npm run dev
   ```

## Default Users

After seeding, you can login with:

- **Admin:** admin@university.edu / admin123
- **Teacher:** teacher@university.edu / teacher123  
- **Student:** student@university.edu / student123

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with sample data

## API Endpoints

- `GET /health` - Health check
- API routes will be added here as we build them

## Development

The server runs on `http://localhost:3001` by default.
The frontend should run on `http://localhost:8000`.
# forum-backend
