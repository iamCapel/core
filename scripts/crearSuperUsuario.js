const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function crearSuperUsuario() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'superuser',
    password: '02260516',
    database: 'plataforma_mopc',
  });

  const username = 'superuser';
  const plainPassword = '02260516';
  const password_hash = await bcrypt.hash(plainPassword, 10);
  const rol = 'superuser';

  await connection.execute(
    'INSERT INTO usuarios (username, password_hash, rol) VALUES (?, ?, ?)',
    [username, password_hash, rol]
  );

  console.log('Usuario superuser creado correctamente.');
  await connection.end();
}

crearSuperUsuario().catch(console.error);
