const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sql = require('mssql');

const app = express();
const port = 5000;

app.use(express.json());

const dbConfig = {
    server: 'ubicuaserver.database.windows.net',
    user: 'Kadim',
    password: 'Passw0rd',
    database: 'DbUbicua',
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

const pool = new sql.ConnectionPool(dbConfig);
pool.connect(err => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err);
        process.exit(1); // Salir del proceso en caso de error de conexión
    } else {
        console.log('Conexión exitosa con la base de datos');
    }
});

const users = [];

app.post('/register', (req, res) => {
    const { email, password } = req.body;

    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
        return res.status(409).json({ error: 'El usuario ya está registrado' });
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            return res.status(500).json({ error: 'Ocurrió un error al registrar el usuario' });
        }

        const newUser = {
            email,
            password: hashedPassword
        };

        const request = pool.request();
        request.query(`INSERT INTO Users (Email, Password) VALUES ('${newUser.email}', '${newUser.password}')`, (err, result) => {
            if (err) {
                console.error('Error al insertar el usuario en la base de datos:', err);
                return res.status(500).json({ error: 'Ocurrió un error al registrar el usuario en la base de datos' });
            }

            users.push(newUser);
            res.status(201).json({ message: 'Usuario registrado exitosamente' });
        });
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const user = users.find(user => user.email === email);
    if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    bcrypt.compare(password, user.password, (err, result) => {
        if (err || !result) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const accessToken = jwt.sign({ email: user.email }, 'secret_key', {
            expiresIn: '1h',
        });

        res.json({ accessToken });
    });
});

app.get('/users', (req, res) => {
    res.json(users);
});

app.get('/', (req, res) => {
    res.send('¡Bienvenido a la API de autenticación!');
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error en el servidor' });
});

app.listen(port, () => {
    console.log(`Servidor en ejecución en http://localhost:${port}`);
});
