# 🔐 User Authentication System

## 📌 Project Overview

This project implements a secure **User Authentication System** with features like user registration, login, password hashing, JWT-based authentication, and protected routes. It ensures that only authenticated users can access specific resources.

---

## 🚀 Features

* ✅ User Registration
* ✅ Secure Login System
* ✅ Password Hashing using bcrypt
* ✅ JWT (JSON Web Token) Authentication
* ✅ Protected Routes
* ✅ Role-Based Access Control (Admin/User)

---

## 🧰 Tech Stack

* **Backend:** Node.js, Express.js
* **Database:** MongoDB (Mongoose)
* **Authentication:** JWT
* **Security:** bcryptjs
* **Environment Config:** dotenv

---

## 📁 Project Structure

```
auth-system/
│── models/
│   └── User.js
│── middleware/
│   └── authMiddleware.js
│── routes/
│   └── authRoutes.js
│── server.js
│── .env
│── package.json
```

---

## ⚙️ Installation & Setup

### 1️⃣ Create Project

```
mkdir auth-system
cd auth-system
```

### 2️⃣ Install Dependencies

```
npm install
```

### 3️⃣ Setup Environment Variables

Create a `.env` file in root directory:

```
PORT=5000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret_key
```

---

## ▶️ Running the Application

```
npm start
```

Expected output:

```
DB Connected
Server running
```

---

## 🧪 API Endpoints

### 🔹 Register User

**POST** `/api/auth/register`

```
{
  "name": "Sai",
  "email": "sai@gmail.com",
  "password": "123456"
}
```

Response:

```
{
  "msg": "Registered"
}
```

---

### 🔹 Login User

**POST** `/api/auth/login`

Response:

```
{
  "token": "your_jwt_token"
}
```

---

### 🔹 Protected Route

**GET** `/dashboard`

Headers:

```
Authorization: Bearer <token>
```

Response:

```
{
  "msg": "Welcome User"
}
```

---

### 🔹 Admin Route

**GET** `/admin`

* Accessible only for users with role = admin

---

## 🔒 Security Features

* Password hashing using bcrypt
* Token-based authentication using JWT
* Route protection middleware
* Role-based authorization

---

## ❗ Common Issues

* Ensure MongoDB connection string is correct
* Make sure Node.js is installed properly
* Restart server after updating `.env`

---

## 🏁 Conclusion

This project successfully implements a secure user authentication system with registration, login, and protected routes. It uses password hashing and JWT to ensure data security and controlled access. Overall, it provides a strong foundation for building real-world web applications.

---

## 👨‍💻 Author

**Mahamkali Venkata Naga Sai**
Computer Science Engineering Student

---

## 📌 Future Enhancements

* Frontend (React Login/Register UI)
* Email verification
* Password reset system
* OAuth (Google Login)
* Deployment (Cloud hosting)

---

