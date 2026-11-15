CREATE DATABASE IF NOT EXISTS nestora;

USE nestora;

-- =========================================
-- USERS
-- Tenant / Owner / Admin
-- =========================================

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,

    user_id VARCHAR(20) UNIQUE NOT NULL,

    name VARCHAR(100) NOT NULL,

    email VARCHAR(100) UNIQUE NOT NULL,

    phone VARCHAR(15) NOT NULL,

    password VARCHAR(255) NOT NULL,

    age INT NULL,

    gender VARCHAR(20) NULL,

    address TEXT NULL,

    role ENUM('tenant', 'owner', 'admin') NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- PGs
-- =========================================

CREATE TABLE pgs (
    id INT AUTO_INCREMENT PRIMARY KEY,

    pg_id VARCHAR(20) UNIQUE NOT NULL,

    owner_id INT NOT NULL,

    pg_name VARCHAR(150) NOT NULL,

    address TEXT NOT NULL,

    city VARCHAR(100),

    pincode VARCHAR(10),

    pg_type VARCHAR(50),

    gender_allowed VARCHAR(20),

    description TEXT,

    monthly_rent DECIMAL(10,2),

    security_deposit DECIMAL(10,2),

    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (owner_id) REFERENCES users(id)
);


-- =========================================
-- ROOMS
-- =========================================

CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,

    room_id VARCHAR(20) UNIQUE NOT NULL,

    pg_id INT NOT NULL,

    room_number VARCHAR(20) NOT NULL,

    room_type VARCHAR(50),

    rent DECIMAL(10,2),

    FOREIGN KEY (pg_id) REFERENCES pgs(id)
);


-- =========================================
-- BEDS
-- =========================================

CREATE TABLE beds (
    id INT AUTO_INCREMENT PRIMARY KEY,

    bed_id VARCHAR(20) UNIQUE NOT NULL,

    room_id INT NOT NULL,

    bed_number VARCHAR(20) NOT NULL,

    status ENUM('available', 'occupied') DEFAULT 'available',

    FOREIGN KEY (room_id) REFERENCES rooms(id)
);


-- =========================================
-- TENANT - PG CONNECTION
-- =========================================

CREATE TABLE tenant_pg (
    id INT AUTO_INCREMENT PRIMARY KEY,

    tenant_id INT NOT NULL,

    pg_id INT NOT NULL,

    room_id INT NULL,

    bed_id INT NULL,

    move_in_date DATE NULL,

    status ENUM('pending', 'approved', 'rejected', 'active', 'left')
        DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES users(id),

    FOREIGN KEY (pg_id) REFERENCES pgs(id),

    FOREIGN KEY (room_id) REFERENCES rooms(id),

    FOREIGN KEY (bed_id) REFERENCES beds(id)
);


-- =========================================
-- BOOKINGS
-- =========================================

CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,

    booking_id VARCHAR(30) UNIQUE NOT NULL,

    tenant_id INT NOT NULL,

    pg_id INT NOT NULL,

    room_id INT NULL,

    bed_id INT NULL,

    status ENUM('pending', 'approved', 'rejected', 'cancelled')
        DEFAULT 'pending',

    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES users(id),

    FOREIGN KEY (pg_id) REFERENCES pgs(id),

    FOREIGN KEY (room_id) REFERENCES rooms(id),

    FOREIGN KEY (bed_id) REFERENCES beds(id)
);


-- =========================================
-- PAYMENTS
-- =========================================

CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,

    transaction_id VARCHAR(100) UNIQUE NOT NULL,

    tenant_id INT NOT NULL,

    pg_id INT NOT NULL,

    amount DECIMAL(10,2) NOT NULL,

    payment_for VARCHAR(50),

    payment_month VARCHAR(20),

    payment_method VARCHAR(50),

    status ENUM('pending', 'success', 'failed')
        DEFAULT 'pending',

    paid_at TIMESTAMP NULL,

    FOREIGN KEY (tenant_id) REFERENCES users(id),

    FOREIGN KEY (pg_id) REFERENCES pgs(id)
);


-- =========================================
-- RECEIPTS
-- =========================================

CREATE TABLE receipts (
    id INT AUTO_INCREMENT PRIMARY KEY,

    receipt_id VARCHAR(30) UNIQUE NOT NULL,

    transaction_id VARCHAR(100) NOT NULL,

    tenant_id INT NOT NULL,

    amount DECIMAL(10,2) NOT NULL,

    receipt_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (transaction_id) REFERENCES payments(transaction_id),

    FOREIGN KEY (tenant_id) REFERENCES users(id)
);


-- =========================================
-- COMPLAINTS
-- =========================================

CREATE TABLE complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,

    complaint_id VARCHAR(30) UNIQUE NOT NULL,

    tenant_id INT NOT NULL,

    pg_id INT NOT NULL,

    subject VARCHAR(150),

    description TEXT,

    status ENUM('submitted', 'in_progress', 'resolved')
        DEFAULT 'submitted',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES users(id),

    FOREIGN KEY (pg_id) REFERENCES pgs(id)
);


-- =========================================
-- NOTICES
-- =========================================

CREATE TABLE notices (
    id INT AUTO_INCREMENT PRIMARY KEY,

    pg_id INT NOT NULL,

    owner_id INT NOT NULL,

    title VARCHAR(150),

    message TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (pg_id) REFERENCES pgs(id),

    FOREIGN KEY (owner_id) REFERENCES users(id)
);


-- =========================================
-- REVIEWS
-- =========================================

CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,

    tenant_id INT NOT NULL,

    pg_id INT NOT NULL,

    rating INT,

    review TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES users(id),

    FOREIGN KEY (pg_id) REFERENCES pgs(id)
);
