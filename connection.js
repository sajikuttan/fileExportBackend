const mysql = require('mysql2');

var pool = mysql.createConnection({
    host: "localhost",
    user: "security",
    password: "ZAJEw/_)wX_dFER1",
    database: "securitydb",
});

pool.connect((err, connection) => {
    if (err)
        throw err;
    console.log('Database connected successfully');
    
});

module.exports = pool;