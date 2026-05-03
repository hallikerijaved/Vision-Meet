# MongoDB Import Files

## How to Import in MongoDB Compass

1. **Connect to your MongoDB Atlas cluster** in Compass
2. **Create database**: `gd-platform`
3. **Import collections**:

### Users Collection
- Collection name: `users`
- Import file: `users.json`
- Password for all users: `password123`

### GDs Collection  
- Collection name: `gds`
- Import file: `gds.json`

## Import Steps in Compass
1. Click "CREATE DATABASE" → Database: `gd-platform`
2. Click "+" next to database → Collection: `users`
3. Click "ADD DATA" → "Import JSON or CSV file"
4. Select `users.json` → Import
5. Repeat for `gds` collection with `gds.json`

## Default Admin Login
- Email: admin@gd.com
- Password: password123