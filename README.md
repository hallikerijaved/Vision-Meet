# GD Platform - Group Discussion Video Conferencing

A complete web platform for conducting group discussions with video conferencing, real-time chat, and moderator controls.

## Features

- **🔐 User Authentication** - Secure register/login system
- **📊 Enhanced Dashboard** - Statistics, quick actions, and trending discussions
- **🎥 Video Conferencing** - Browser-based video/audio with WebRTC
- **💬 Real-time Chat** - Text messaging during discussions
- **👨‍💼 Moderator Controls** - Session management and participant control
- **🔗 Shareable Links** - Easy sharing of GD sessions
- **⚡ Auto-close Sessions** - Automatic cleanup when no participants
- **🛡️ Admin Panel** - Monitor all sessions and users
- **📱 Responsive Design** - Works on desktop and mobile
- **🚀 Scalable** - Multiple concurrent GD sessions

## Technology Stack

- **Frontend**: React.js
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Real-time**: Socket.IO
- **Video**: WebRTC (getUserMedia API)

## Quick Start

### Prerequisites
- Node.js (v14+)
- MongoDB (local or MongoDB Atlas)
- Make sure MongoDB service is running

### Installation

1. **Install all dependencies**:
   ```bash
   npm run install-all
   ```

2. **Start MongoDB**:
   ```bash
   # Windows (run as administrator)
   net start MongoDB
   ```

3. **Configure environment**:
   - Update `backend/.env` with your MongoDB URI
   - Change JWT_SECRET to a secure random string

4. **Start development servers**:
   ```bash
   npm run dev
   ```

This will start:
- Backend server on http://localhost:5001
- Frontend app on http://localhost:3000

### Manual Setup

If you prefer to run servers separately:

**Start MongoDB first**:
```bash
# Windows (run as administrator)
net start MongoDB
# OR start MongoDB manually if not installed as service
mongod
```

**Backend**:
```bash
cd backend
npm install
npm run dev
```

**Frontend**:
```bash
cd frontend
npm install
npm start
```

## Usage

### Regular Users
1. **Register/Login** - Create account or login
2. **Main Dashboard** - View statistics and trending discussions
3. **Create GD** - Start new discussions with custom settings
4. **Browse GDs** - Search and filter all available discussions
5. **My GDs** - View your created and participated discussions
6. **Join Sessions** - One-click join or use shareable links
7. **Video Controls** - Toggle video/audio during session
8. **Real-time Chat** - Text messaging alongside video

### Admin Access
1. **Login with admin@gd.com** (register this email first)
2. **Admin Panel** - Monitor all ongoing GDs and users
3. **Force End GDs** - Terminate any active discussion
4. **Real-time Updates** - Auto-refresh every 5 seconds

## Project Structure

```
gd-platform/
├── backend/
│   ├── models/          # MongoDB schemas (User, GD)
│   ├── routes/          # API endpoints (auth, gd, admin)
│   ├── middleware/      # Authentication middleware
│   └── server.js        # Main server with Socket.IO
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components (Navigation)
│   │   ├── pages/       # Main pages (Dashboard, CreateGD, etc.)
│   │   └── utils/       # API utilities
│   └── public/          # Static files
├── install.bat          # Windows installation script
└── package.json         # Root package file
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Group Discussions
- `GET /api/gd` - Get all active GDs
- `POST /api/gd` - Create new GD
- `POST /api/gd/:id/join` - Join existing GD
- `PATCH /api/gd/:id/end` - End GD (moderator only)

## Deployment

### Frontend (Vercel/Netlify)
1. Build: `cd frontend && npm run build`
2. Deploy `build` folder

### Backend (Render/Heroku)
1. Set environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `PORT=5001`
2. Deploy `backend` folder

### Database
- Use MongoDB Atlas for cloud database
- Update connection string in `.env`

## Troubleshooting

### MongoDB Issues
- Ensure MongoDB service is running: `net start MongoDB`
- Check if port 27017 is available
- For MongoDB Atlas, update connection string in `.env`

### Port Conflicts
- Backend runs on port 5001 (changed from 5000)
- Frontend runs on port 3000
- If ports are busy, update `.env` file

### Browser Permissions
The app requires camera and microphone permissions for video conferencing. Users will be prompted to allow access when joining a GD room.

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## License

MIT License - feel free to use for educational or commercial purposes.