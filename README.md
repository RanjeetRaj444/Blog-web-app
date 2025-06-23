# Panini8 Blog Platform

A full-featured blog platform built with the MERN stack (MongoDB, Express.js, React, Node.js) that allows users to create, share, and interact with blog posts.

## URL

- ## **Frontend URL**
  - https://panini8blogplateform.netlify.app/
- **Backend URL**
  - https://blog-web-app-qbiy.onrender.com

## Features

- **User Authentication**

  - Secure login and registration
  - JWT-based authentication
  - Password hashing for security
  - Protected routes for authenticated users

- **Blog Posts**

  - Create, read, update, and delete posts
  - Rich text content support
  - Tag-based categorization
  - Chronological post listing
  - Filter posts by tags

- **Interactive Features**

  - Like/unlike posts
  - Comment on posts
  - Delete your own comments
  - User profiles with bio
  - Chat with AI.

- **Modern UI/UX**
  - Responsive design for all devices
  - Clean and intuitive interface
  - Loading states and animations
  - Toast notifications for feedback
  - Error handling and validation

## Tech Stack

- **Frontend**

  - React 18
  - React Router for navigation
  - React Hook Form for form handling
  - Tailwind CSS for styling
  - Lucide React for icons
  - Axios for API requests

- **Backend**
  - Node.js
  - Express.js
  - MongoDB with Mongoose
  - JWT for authentication
  - bcrypt for password hashing

## Getting Started

1. **Prerequisites**

   - Node.js (v14 or higher)
   - MongoDB installed and running
   - Git

2. **Environment Setup**

   ```bash
   # Clone the repository
   git clone <repository-url>
   cd panini8-blog-platform

   # Install dependencies
   npm install

   # Create .env file from example
   cp  .env
   ```

3. **Configure Environment Variables**
   Update the `.env` file with your settings:

   ```
   MONGODB_URI= -- your mongodb Url
   JWT_SECRET=  -- your_jwt_secret
   PORT=5000
   ```

4. **Start Development Servers**

   ```bash
   # Start backend server
   npm run dev:server

   # In a new terminal, start frontend
   npm run dev
   ```

5. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

## Project Structure

```
├── src/                   # Frontend source code
│   ├── components/        # React components
│   ├── context/          # React context
│   ├── pages/            # Page components
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
├── public/               # Static assets
└── package.json         # Project dependencies
```

## Project Structure

```
├── server/                 # Backend server code
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   └── index.js          # Server entry point

    └── package.json         # Project dependencies

```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/user` - Get authenticated user

### Posts

- `GET /api/posts` - Get all posts
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like/unlike post
- `POST /api/posts/:id/comments` - Add comment
- `DELETE /api/posts/:id/comments/:comment_id` - Delete comment

### Users

- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `GET /api/users/:id/posts` - Get user's posts

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [React](https://reactjs.org/)
- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
