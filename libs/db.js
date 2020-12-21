// lib/db.js

const mysql = require('mysql');

const connection = mysql.createConnection({
  host: 'localhost', /*soltec.ao */
  user: 'root', /* soltecao_soltec*/
  database: 'dbdahora',/* soltecao_dahora */
  password: ''/* T4$M5y%.x */
});

connection.connect((err)=>{
    if(err){
      console.log('connection lost');
      return;
    }
    console.log('connection established');
});
module.exports = connection;