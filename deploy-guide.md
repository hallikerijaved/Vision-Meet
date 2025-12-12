# Free Deployment Guide

## 1. MongoDB Atlas (Database)
- Sign up: https://cloud.mongodb.com
- Create free cluster
- Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/gd-platform`

## 2. Vercel (Frontend + Backend)

### Frontend:
```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod
```

### Backend:
```bash
cd backend
vercel --prod
```

### Environment Variables (Vercel Dashboard):
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
GMAIL_USER=js21022102@gmail.com
GMAIL_APP_PASSWORD=jinn uahq gwsy bare
NODE_ENV=production
```

## 3. Update CORS URLs
Replace in backend/server.js:
```javascript
origin: ['https://your-frontend-url.vercel.app']
```

## 4. Update API URL
In frontend/.env:
```
REACT_APP_API_URL=https://your-backend-url.vercel.app
```

## 5. Create Admin
After deployment, run locally:
```bash
MONGODB_URI=your-atlas-uri node create-admin.js
```

## Free Limits:
- Vercel: 100GB bandwidth/month
- MongoDB Atlas: 512MB storage
- Gmail: 2000 emails/day

Your GD Platform will be live at:
- Frontend: https://your-app.vercel.app
- Backend: https://your-api.vercel.app