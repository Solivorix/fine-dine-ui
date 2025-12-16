# 🍽️ Dining Reservation Application

A beautiful, modern dining reservation and table booking application built with React.js and Spring Boot. This application allows restaurant owners to manage multiple restaurants while providing customers with a seamless table-side ordering experience.

![React](https://img.shields.io/badge/React-18.2-blue)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-Backend-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

### 🎯 Main Features

- **Multi-Restaurant Management**: Configure and manage multiple restaurant locations from a single admin dashboard
- **Table-Side Ordering**: QR code-based table booking system for customers
- **Real-Time Order Management**: Track and manage orders instantly
- **Beautiful UI/UX**: Sophisticated design with smooth animations and transitions
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Role-Based Access Control**: Different access levels for Admin, Manager, and Staff

### 👨‍💼 Admin Features

- **Dashboard Overview**: View statistics, active orders, and revenue at a glance
- **Restaurant Management**: Add, edit, and remove restaurant locations
- **Menu Management**: Configure menu items with multiple portion sizes and pricing
- **Service Type Configuration**: Set up different service types (dine-in, takeaway, etc.)
- **User Management**: Manage staff and access permissions
- **Order Tracking**: Monitor all orders across restaurants

### 👥 Customer Features

- **Easy Table Access**: Scan QR code at table to start ordering
- **Browse Menu**: View beautifully displayed menu with descriptions and images
- **Filter by Category**: Quick navigation through menu categories
- **Portion Selection**: Choose from different portion sizes
- **Shopping Cart**: Add multiple items with quantity controls
- **Order Placement**: Simple checkout process
- **Order Confirmation**: Instant feedback when order is placed

## 🎨 Design Philosophy

This application features a **sophisticated restaurant aesthetic** with:

- **Typography**: Playfair Display for elegant headings, DM Sans for modern body text
- **Color Palette**: Warm gold (#d4af37) accents on neutral backgrounds
- **Animations**: Smooth transitions and micro-interactions throughout
- **Spacing**: Generous whitespace for a premium feel
- **Visual Hierarchy**: Clear information architecture

## 🏗️ Architecture

### Frontend (React.js)

```
src/
├── components/          # Reusable components
│   └── ProtectedRoute.jsx
├── contexts/           # React Context API for state management
│   ├── AuthContext.jsx
│   └── RestaurantContext.jsx
├── pages/              # Application pages
│   ├── Login.jsx
│   ├── TableBooking.jsx
│   ├── AdminDashboard.jsx
│   ├── RestaurantManagement.jsx
│   ├── MenuManagement.jsx
│   └── OrderManagement.jsx
├── services/           # API integration
│   └── api.js
├── App.jsx            # Main application component
├── App.css            # Global styles and design system
└── index.js           # Application entry point
```

### Backend (Spring Boot)

The application integrates with your existing Spring Boot REST API with endpoints for:

- Authentication (`/auth/*`)
- Restaurants (`/restaurants`)
- Users (`/users`)
- Items (`/items`)
- Prices (`/prices`)
- Service Types (`/service-types`)
- Additional Pricing (`/additional-pricings`)
- Orders (`/orders`)

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm
- Java 17+ and Maven (for backend)
- Modern web browser

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd dining-app
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:

```env
REACT_APP_API_URL=http://localhost:8080
REACT_APP_NAME=Dining Reservations
```

4. **Start the development server**

```bash
npm start
```

The application will open at `http://localhost:3000`

### Backend Setup

1. Ensure your Spring Boot backend is running on `http://localhost:8080`
2. The backend should have CORS configured to allow requests from `http://localhost:3000`

### Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

## 📱 Usage

### For Administrators

1. **Login**: Navigate to `/login` and enter your credentials
2. **Dashboard**: View overview of all restaurants and statistics
3. **Manage Restaurants**: Add new locations, update details, or remove restaurants
4. **Configure Menu**: Add menu items with descriptions, prices, and portion sizes
5. **Monitor Orders**: Track real-time orders across all tables and restaurants

### For Customers

1. **Scan QR Code**: At your table, scan the QR code (format: `/order/{restaurantId}/{tableNumber}`)
2. **Browse Menu**: View available items and filter by category
3. **Add to Cart**: Select items and portion sizes
4. **Place Order**: Review cart and submit order to kitchen
5. **Confirmation**: Receive instant confirmation

### QR Code Format

Generate QR codes for each table with the following URL pattern:

```
https://your-domain.com/order/{restaurantId}/{tableNumber}
```

Example: `https://your-domain.com/order/rest123/5` for Table 5

## 🎯 API Integration

The application uses Axios for API communication with automatic:

- JWT token injection for authenticated requests
- Error handling and redirect on 401 Unauthorized
- Response interceptors for consistent error handling

### Key API Services

```javascript
// Authentication
authAPI.login(loginId, password)
authAPI.forgotPassword(loginId)
authAPI.resetPassword(otp, newPassword)

// Restaurants
restaurantAPI.getAll()
restaurantAPI.create(data)
restaurantAPI.update(id, data)

// Menu Items
itemAPI.getAll()
itemAPI.create(items)
itemAPI.update(itemId, data)

// Orders
orderAPI.create(orderData)
orderAPI.getAll()
```

## 🎨 Customization

### Branding

Update colors in `src/App.css`:

```css
:root {
  --primary: #1a1a1a;        /* Main dark color */
  --accent: #d4af37;         /* Gold accent */
  --bg: #f8f6f0;            /* Background */
  /* ... other variables */
}
```

### Fonts

The application uses Google Fonts:
- **Playfair Display**: Elegant serif for headings
- **DM Sans**: Modern sans-serif for body text

Change fonts in `src/App.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=YourFont:wght@400;700&display=swap');

body {
  font-family: 'YourFont', sans-serif;
}
```

## 📊 State Management

The application uses React Context API for global state:

### AuthContext

Manages authentication state and user sessions:
- `user`: Current authenticated user
- `login()`: Authenticate user
- `logout()`: Clear session
- `isAuthenticated`: Boolean auth status

### RestaurantContext

Manages restaurant data and operations:
- `restaurants`: List of all restaurants
- `menuItems`: Current restaurant's menu
- `fetchRestaurants()`: Load restaurant data
- `createMenuItem()`: Add new menu item

## 🔒 Security

- JWT token-based authentication
- Protected routes with role-based access control
- Automatic token injection in API requests
- Session management with localStorage
- HTTPS recommended for production

## 🌐 Deployment

### Frontend Deployment

#### Vercel

```bash
npm install -g vercel
vercel
```

#### Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Environment Variables in Production

Set the following in your hosting platform:

```
REACT_APP_API_URL=https://your-api-domain.com
```

## 🧪 Testing

```bash
npm test
```

## 📝 API Documentation

Your Spring Boot backend provides OpenAPI documentation. Key endpoints:

### Authentication
- `POST /auth/login` - User login
- `POST /auth/forgot-password` - Request OTP
- `POST /auth/reset-password` - Reset password with OTP

### Restaurants
- `GET /restaurants` - List all restaurants
- `POST /restaurants` - Create restaurant
- `PUT /restaurants/{id}` - Update restaurant
- `DELETE /restaurants/{id}` - Delete restaurant

### Items (Menu)
- `GET /items` - List all items
- `POST /items` - Create items
- `PATCH /items/{id}` - Partial update

### Orders
- `GET /orders` - List all orders
- `POST /orders` - Create order
- `GET /orders/{id}` - Get order details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Design inspiration from modern restaurant websites
- Icons and emojis for visual elements
- React and Spring Boot communities

## 📞 Support

For support, email your-email@example.com or open an issue in the repository.

## 🗺️ Roadmap

- [ ] Advanced analytics dashboard
- [ ] Kitchen display system
- [ ] Payment integration
- [ ] Customer feedback system
- [ ] Loyalty program
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Mobile apps (iOS/Android)

---

Built with ❤️ using React.js and Spring Boot
