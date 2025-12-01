const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
// Usar RowDataPacket solo como tipo
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a la base de datos
async function conectarDB() {
  return await mysql.createConnection({
    host: '127.0.0.1',
    user: 'superuser',
    password: '02260516',
    database: 'plataforma_mopc'
  });
}

// Endpoint de login
import { Request, Response } from 'express';
app.post('/api/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    const connection = await conectarDB();
    const [rows] = await connection.execute(
      'SELECT * FROM usuarios WHERE username = ?',
      [username]
    );
    const typedRows = rows as import('mysql2').RowDataPacket[];

    if (typedRows.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    const user = typedRows[0];

    // Usar bcrypt para comparar el hash
    const match = await bcrypt.compare(password, user.password_hash);
    if (match) return res.json({ success: true, message: 'Login exitoso ✅', user });

    return res.status(401).json({ success: false, message: 'Contraseña incorrecta ❌' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

// Iniciar servidor
app.listen(4000, () => {
  console.log('Servidor corriendo en http://localhost:4000');
});
