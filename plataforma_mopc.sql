-- 1. Crear la base de datos
CREATE DATABASE plataforma_mopc;

-- 2. Usar la base de datos
USE plataforma_mopc;

-- 3. Crear la tabla de usuarios
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('superuser','admin','usuario') DEFAULT 'usuario',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);