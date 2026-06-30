🧑‍💼 Employee Management System (EMS)
📌 Overview
The Employee Management System is a secure backend application that allows administrators to manage employee records using full CRUD operations (Create, Read, Update, Delete). The system uses JWT-based authentication to protect sensitive data and ensures only authorized users can perform operations.
---
🚀 Features
🔐 Admin Authentication (JWT)
➕ Create Employee
📄 View All Employees
✏️ Update Employee Details
❌ Delete Employee
🔒 Protected Routes
👮 Role-Based Access Control (Admin Only)
---
🧰 Tech Stack
Node.js
Express.js
MongoDB (Mongoose)
JWT (jsonwebtoken)
bcryptjs
dotenv
cors
---
📁 Project Structure
employee-management-system/
│
├── config/
│   └── db.js
├── controllers/
│   ├── authController.js
│   └── employeeController.js
├── middleware/
│   ├── authMiddleware.js
│   └── roleMiddleware.js
├── models/
│   ├── User.js
│   └── Employee.js
├── routes/
│   ├── authRoutes.js
│   └── employeeRoutes.js
├── utils/
│   └── validators.js
├── .env
├── server.js
├── package.json
└── README.md
---
⚙️ Setup Instructions
1. Extract Project
Download and extract the ZIP file.
2. Install Dependencies
npm install
3. Configure Environment Variables
Create a `.env` file:
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/ems
JWT_SECRET=your_secret_key
---
▶️ Run the Application
npm start
---
🧪 API Endpoints
🔐 Login (Admin)
POST /api/auth/login
{
"email": "admin@gmail.com",
"password": "123456"
}
---
➕ Create Employee
POST /api/employees
Header:
Authorization: Bearer <token>
---
📄 Get All Employees
GET /api/employees
---
✏️ Update Employee
PUT /api/employees/:id
---
❌ Delete Employee
DELETE /api/employees/:id
---
🔒 Security Features
Password hashing using bcrypt
JWT authentication
Protected routes
Role-based access control
---
❗ Common Issues
MongoDB not connected → check `.env`
Invalid token → check Authorization header
Server not starting → run `npm install`
---
🏁 Conclusion
This project demonstrates a secure and scalable Employee Management System with full CRUD functionality.
---
👨‍💻 Author
Mahamkali Venkata Naga Sai
