# Cadmax Interior Backend - AI Coding Agent Instructions

## Project Overview
Cadmax Interior is an e-commerce backend for interior design services and products. Built with **Express.js + MongoDB**, it implements an MVC architecture with distinct roles (Admin, Vendor, User) and integrates third-party services (Razorpay payments, AWS S3 storage, Firebase notifications, email services).

## Architecture & Key Components

### Core Patterns
- **MVC Structure**: Controllers → Models → Routes. All business logic lives in `src/Controller/`, data models in `src/Model/`, routes in `src/Routes/`
- **Error Handling**: Use `catchAsync()` wrapper in controllers to auto-catch promise rejections. Throw `AppError` for business logic errors
- **Response Format**: All endpoints return `{ status: true/false, message: string, data?: object, errors?: object }`
- **Authentication**: JWT tokens passed as `Authorization: Bearer <token>` header. Verify with `verifyToken` middleware

### Key Integrations
| Service | Files | Purpose |
|---------|-------|---------|
| **AWS S3** | `src/Utill/S3.js` | Image uploads with `multer`. Use `upload.single()` or `.array()` in routes |
| **Razorpay** | `src/Controller/PaymentController.js` | Payment processing |
| **Firebase** | `src/Utill/firebase.js` | Push notifications |
| **Nodemailer** | `src/Utill/EmailMailler.js` | Email with templates from `src/EmailTemplate/` |
| **Blue Dart/DHL** | `src/Utill/blueDartService.js`, `dhlService.js` | Shipment tracking |

### Entity Relationships
- **User**: Base entity with roles (user/vendor/admin). Password stored as bcrypt hash
- **Product**: Belongs to `ProductCategory` → `SuperCategory`. Multiple `ProductSubSubCategory`
- **Services**: Separate from products. Has `ServicesType`, `ServicesSubCategory`
- **Orders**: Link to Products, Payments, Shipments. Track via `Status` field
- **Bookings**: Service reservations with user/vendor/admin email notifications

## Development Workflows

### Setup & Running
```bash
npm install
npm run dev  # Starts with nodemon on src/app.js
```

### Database
- MongoDB connection configured in `src/dbconfigration.js` via `DB_URL` env var
- Schemas in `src/Model/` use mongoose with validation
- Run `src/seedStates.js` for initial data

### Adding a New Feature
1. **Create Model** in `src/Model/Feature.js` (mongoose schema)
2. **Create Controller** in `src/Controller/FeatureController.js` using `catchAsync` wrapper
3. **Create Routes** in `src/Routes/FeatureRoute.js`, import controller
4. **Mount Route** in `src/app.js` with `app.use(FeatureRoute)`
5. **Add Email Template** (if needed) in `src/EmailTemplate/Feature.js`

### File Upload Pattern
```javascript
// Route
const { upload } = require("../Utill/S3");
router.post("/upload", upload.single("fieldname"), controllerMethod);

// Controller - file already in S3, access via req.file.location
```

## Critical Conventions

### Error Handling
- Wrap async controller methods with `catchAsync()`
- Throw `AppError` for validation/business errors: `throw new AppError("Message", 400)`
- Return early with `validationErrorResponse(res, errors)` for input validation
- Pass errors to `next()` in middleware

### Response Helpers (from `src/Utill/ErrorHandling.js`)
```javascript
successResponse(res, "Message", 200, data)
errorResponse(res, "Error message", 500)
validationErrorResponse(res, { field: "error" })
```

### Email Sending
```javascript
const emailTemplate = require("../EmailTemplate/Welcome");
sendEmail(email, "Subject", emailTemplate(userName));
```

### Authentication Flow
1. Controllers check `req.user.id` (set by `verifyToken` middleware)
2. Routes use `verifyToken` middleware where needed
3. Admin check: fetch user and validate `role === "admin"`

### Naming Conventions
- **Controllers**: PascalCase + "Controller" suffix (e.g., `ProductController.js`)
- **Models**: PascalCase matching entity (e.g., `Product.js`, `ProductCategory.js`)
- **Routes**: PascalCase + "Route" suffix
- **DB Fields**: camelCase (e.g., `profileImage`, `createdAt`)

## Common Pitfalls to Avoid
1. **Forget `catchAsync`** - unhandled promise rejections will crash requests
2. **Direct DB calls in routes** - always use controllers
3. **Inconsistent response format** - always use helper functions
4. **Hardcoded magic numbers** - use env vars (e.g., `process.env.JWT_SECRET`)
5. **Not validating file types** - S3 config has `fileFilter` for mime types
6. **Cross-origin issues** - CORS configured in `src/app.js` with `CORS_ALLOWED_ORIGINS` env var

## File Organization Rules
- `src/Utill/` - Shared utilities (NOT "Utils" - note the typo in codebase)
- `src/config/` - Configuration files
- `logs/` - Application logs from Winston logger
- `public/uploads/` - Local file storage fallback

## Key Environment Variables
```
DB_URL               # MongoDB connection
JWT_SECRET           # Token signing (stored as JWT_SECRET, not JWT_SECRET_KEY in code)
AWS_*                # S3 credentials
CORS_ALLOWED_ORIGINS # Frontend origins
FRONTEND_URL         # Fallback for CORS
```

## Testing & Debugging
- Check `logs/` folder for Winston logs
- Use `src/Utill/Logger.js` for custom logging
- Nodemon watches `src/` directory automatically
- All controllers should handle async operations properly with `catchAsync`
