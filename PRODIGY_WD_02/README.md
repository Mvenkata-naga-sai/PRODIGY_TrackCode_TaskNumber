# 🧑‍💼 Employee Management System
--
## 📌 Project Overview

This project implements a secure Employee Management System that allows administrators to manage employee records efficiently. It supports full CRUD operations with authentication and authorization to ensure secure access.

---

## 🚀 Features

✅ Admin Login System
✅ Add Employee
✅ View Employees
✅ Update Employee Details
✅ Delete Employee
✅ JWT Authentication
✅ Protected Routes
✅ Role-Based Access Control (Admin Only)

---

## 🧰 Tech Stack

Backend: Node.js, Express.js
Database: MongoDB (Mongoose)
Authentication: JWT
Security: bcryptjs
Environment Config: dotenv
---
## 📁 Project Structure

employee-management-system/
│── config/
│   └── db.js
│── models/
│   ├── User.js
│   └── Employee.js
│── controllers/
│   ├── authController.js
│   └── employeeController.js
│── middleware/
│   ├── authMiddleware.js
│   └── roleMiddleware.js
│── routes/
│   ├── authRoutes.js
│   └── employeeRoutes.js
│── server.js
│── .env
│── package.json

---

## ⚙️ Installation & Setup

### 1️⃣ Clone or Create Project

git clone https://github.com/your-username/employee-management-system.git
cd employee-management-system

### 2️⃣ Install Dependencies

npm install

### 3️⃣ Setup Environment Variables

Create a .env file in root directory:

PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/ems
JWT_SECRET=your_secret_key

### ▶️ Running the Application

npm start

Expected Output:

DB Connected
Server running

---

## 🧪 API Endpoints
### 🔹 Admin Login

***POST*** `/api/auth/login`

Request Body:

{
  "email": "admin@gmail.com",
  "password": "123456"
}
🔹 Add Employee

POST /api/employees

Headers:

Authorization: Bearer <token>
🔹 Get All Employees

GET /api/employees

🔹 Update Employee

PUT /api/employees/:id

🔹 Delete Employee

DELETE /api/employees/:id

---

## 🔒 Security Features

Password hashing using bcrypt
JWT-based authentication
Protected routes
Role-based authorization

---

## ❗ Common Issues

Ensure MongoDB connection string is correct
Make sure Node.js is installed
Run npm install if dependencies missing
Check JWT token in headers

---

## 🎯 Outcome

This project demonstrates:

Backend API development
Secure authentication system
CRUD operations with database
Industry-standard security practices

---

## 👨‍💻 Author

Mahamkali Venkata Naga Sai
Computer Science Engineering Student

---

## 📌 Future Enhancements

* React Frontend
* Search & Pagination
* File Upload
* Multi-role system
* Cloud Deployment
