# 🚀 Quick Setup Guide

## Prerequisites

Before you begin, ensure you have installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Java 17+** and **Maven** (for backend)
- A modern web browser (Chrome, Firefox, Safari, or Edge)

## Step-by-Step Setup

### 1. Backend Setup

First, ensure your Spring Boot backend is running:

```bash
cd your-spring-boot-project
mvn spring-boot:run
```

The backend should start on `http://localhost:8080`

### 2. Frontend Setup

```bash
# Navigate to the project directory
cd dining-app

# Install all dependencies
npm install

# Create environment file
cp .env.example .env

# Start the development server
npm start
```

The application will automatically open at `http://localhost:3000`

## First Time Login

### Default Admin Access

If your backend has seeded data, you can login with:
- **Username**: admin or your configured admin username
- **Password**: Your configured admin password

If you need to create an admin user, use your backend's user creation endpoint or database seeding.

## Testing the Application

### 1. Test Admin Dashboard

1. Login with admin credentials
2. You should see the dashboard with statistics
3. Try navigating to "Manage Restaurants"

### 2. Test Table Booking

1. Create a restaurant in the admin panel (or use existing one)
2. Add some menu items
3. Generate a QR code URL: `http://localhost:3000/booking/{restaurantId}/1`
4. Open this URL in a new browser tab
5. You should see the customer-facing menu
6. Try adding items to cart and placing an order

### 3. Generate QR Codes for Tables

For each table in your restaurant, generate a QR code with the pattern:

```
http://localhost:3000/booking/{restaurantId}/{tableNumber}
```

Use any free QR code generator:
- https://www.qr-code-generator.com/
- https://www.the-qrcode-generator.com/

Example URLs:
- Table 1: `http://localhost:3000/booking/rest123/1`
- Table 2: `http://localhost:3000/booking/rest123/2`
- Table 3: `http://localhost:3000/booking/rest123/3`

## Common Issues & Solutions

### Issue: Cannot connect to backend

**Solution**: 
- Check if backend is running on `http://localhost:8080`
- Verify CORS is configured in your Spring Boot application
- Check `.env` file has correct `REACT_APP_API_URL`

### Issue: npm install fails

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Issue: Login returns 401 Unauthorized

**Solution**:
- Verify your backend authentication endpoint is working
- Check that username/password are correct
- Ensure JWT token generation is working in backend

### Issue: Port 3000 already in use

**Solution**:
```bash
# On macOS/Linux
lsof -ti:3000 | xargs kill -9

# On Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use a different port
PORT=3001 npm start
```

## Project Structure

```
dining-app/
├── public/              # Static files
│   └── index.html      # HTML template
├── src/
│   ├── components/     # Reusable components
│   ├── contexts/       # State management
│   ├── pages/          # Application pages
│   ├── services/       # API services
│   ├── App.jsx         # Main component
│   ├── App.css         # Global styles
│   └── index.js        # Entry point
├── .env.example        # Environment template
├── package.json        # Dependencies
└── README.md          # Documentation
```

## Environment Configuration

### Development (.env)

```env
REACT_APP_API_URL=http://localhost:8080
REACT_APP_NAME=Dining Reservations
```

### Production

Update for your production domain:

```env
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_NAME=Your Restaurant Name
```

## Building for Production

```bash
# Create optimized production build
npm run build

# The build folder contains the production-ready files
# Deploy the contents of the build/ folder to your hosting service
```

### Deployment Options

#### Option 1: Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

#### Option 2: Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

#### Option 3: Traditional Hosting
Upload the contents of the `build/` folder to your web server

## Next Steps

1. **Customize Branding**: Update colors and fonts in `src/App.css`
2. **Add Restaurants**: Use the admin panel to add your restaurants
3. **Configure Menu**: Add menu items with pricing
4. **Generate QR Codes**: Create QR codes for each table
5. **Test Orders**: Place test orders from different tables
6. **Train Staff**: Show your team how to use the order management system

## Need Help?

- Check the main README.md for detailed documentation
- Review the API integration in `src/services/api.js`
- Examine page components in `src/pages/`
- Look at context files for state management patterns

## Development Tips

### Hot Reload

Changes to files automatically reload the browser during development.

### Debugging

1. Open browser DevTools (F12)
2. Check Console for errors
3. Network tab shows API requests
4. React DevTools extension helpful for debugging

### Code Organization

- Keep components small and focused
- Use contexts for shared state
- Put API calls in the services folder
- Style pages with their own CSS files

---

🎉 **You're all set!** Start building your restaurant management system.

For detailed documentation, see the main [README.md](README.md)
