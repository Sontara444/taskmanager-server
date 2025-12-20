# Collaborative Task Manager - Server

The backend API for the Collaborative Task Manager, built with Node.js, Express, and MongoDB.

## 🚀 Features

- **RESTful API**: Endpoints for tasks, auth, and notifications.
- **Real-time Engine**: Socket.io server for broadcasting events.
- **Authentication**: JWT-based auth with secure HTTP-only cookies.
- **Database**: MongoDB with Mongoose schemas.
- **Security**: Helmet, CORS, and input validation with Zod.

## 🛠️ Tech Stack

- **Node.js & Express**: Web server framework.
- **TypeScript**: Typed backend logic.
- **MongoDB & Mongoose**: Database and ODM.
- **Socket.io**: Real-time event handling.
- **Zod**: Runtime request validation.

## 📦 Setup Instructions

1.  **Install Dependencies**
    ```bash
    cd server
    npm install
    ```

2.  **Configuration**
    - Create a `.env` file in the `server` directory:
      ```env
      PORT=5000
      MONGO_URI=mongodb://localhost:27017/taskmanager
      JWT_SECRET=your_super_secret_key
      NODE_ENV=development
      CLIENT_URL=http://localhost:5173
      ```

3.  **Run Locally**
    ```bash
    npm run dev
    ```
    - Server runs on `http://localhost:5000`.

## 📡 API Contract

### Authentication
- `POST /api/auth/register`: Create account.
- `POST /api/auth/login`: Login (returns JWT in cookie).
- `POST /api/auth/logout`: Logout (clears cookie).
- `GET /api/auth/me`: Get current user profile.

### Tasks
- `GET /api/tasks`: List tasks. Supports filters: `status`, `priority`, `assignedToMe`.
- `POST /api/tasks`: Create task.
- `PUT /api/tasks/:id`: Update task.
- `DELETE /api/tasks/:id`: Delete task.

### Notifications
- `GET /api/notifications`: Get user notifications.
- `PUT /api/notifications/read-all`: Mark all read.

## 🏗️ Architecture Overview

- **Controller-Service Pattern**: We stick to a clean separation where Routes (`routes/`) delegate to Controllers (`controllers/`). For an application of this scope, services are embedded in controllers for simplicity, but could be extracted for larger scale.
- **Database Choice**: **MongoDB** was chosen for its flexible schema (document-oriented), which maps perfectly to the JSON data structure of tasks and allows for easy future extensibility (e.g., adding arbitrary tags or metadata without migration headaches).
- **Hybrid Authentication**: The auth system is robust. It primarily uses **HTTP-only Cookies** for security (mitigating XSS attacks). However, the middleware also checks the `Authorization: Bearer` header, offering flexibility for non-browser clients or different deployment environments.

## 🔌 Socket.io Integration

The server acts as the real-time hub:
1.  **Event Emission**: After a successful DB operation (e.g., in `task.controller.ts`), the server emits an event to all connected clients:
    ```typescript
    io.emit('task_created', populatedTask);
    ```
2.  **Private Channels**: When a task is assigned to a specific user, the server emits a targeted notification to that user's specific socket room:
    ```typescript
    io.to(assignedToId).emit('notification', { ... });
    ```

## ⚖️ Trade-offs & Assumptions

- **In-Memory Sockets**: Currently, Socket.io manages connections in-memory.
    - *Assumption*: The application runs on a single server instance.
    - *Trade-off*: For horizontal scaling (multiple instances behind a load balancer), a **Redis Adapter** would be needed to synchronize events across nodes.
- **REST + Sockets**: We use REST for the initial data fetch and actions (POST/PUT), and Sockets *strictly* for notifying clients to refresh. This avoids duplicating business logic in socket handlers and keeps the API standard.
