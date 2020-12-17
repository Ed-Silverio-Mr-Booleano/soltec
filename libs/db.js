// lib/db.js

const mysql = require('mysql');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  database: 'dbdahora',
  password: ''
});

connection.connect();
module.exports = connection;