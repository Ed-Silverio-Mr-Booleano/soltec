// routes/router.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
//const uuid = require('uuid');
const jwt = require('jsonwebtoken');

const db = require('../libs/db.js');
const userMiddleware = require('../middleware/users.js');
const emailMiddleware = require('../middleware/email.js');
const smsMiddleware = require('../middleware/sms.js');
const { random } = require('../middleware/email.js');
const axios = require('axios');
const multer = require('multer');
const path = require('path');

/*upload imagem */

/* upload imagem */




//forget pass

router.put('/forget-my-pass-send-code', (req,res)=>{
  const {email, phonenumber} = req.body;
  const  prop = email? email : phonenumber;
  db.query(`SELECT * FROM users WHERE  email =  lower(${db.escape(prop)}) OR phonenumber = ${db.escape(prop)}`,(qe,qr)=>{
      if(qe) res.status(401).send({msg:'error'});
      if(qr.length){
          let cod = emailMiddleware.random();
          emailMiddleware.sendEmail(qr[0]['email'], cod, 'CÓDIGO DE ALTERAÇÃO DE PASSWORD');
          smsMiddleware.sendSMS(qr[0]['phonenumber'], cod);
          if(cod){
            db.query(`UPDATE users SET confirmcode = ${db.escape(cod)} WHERE email = lower(${db.escape(prop)}) OR phonenumber = ${db.escape(prop)} `, function(e, r){
              if(r) return res.status(200).send({msg: 'updated....', data : (email ? email :phonenumber)});
            });
          }
          //return res.status(200).send({msg: cod});
      }else res.status(200).send({msg:'users does not found'}); 
  });
});

router.put('/forget-my-pass-change', userMiddleware.validatePassword, (req,res)=>{
      const {confirmcode,password, password_repeat,data} = req.body;
      console.log(req.body);
      db.query(`SELECT * FROM users WHERE confirmcode = ${db.escape(confirmcode)} AND (phonenumber = ${db.escape(data)} OR email = ${db.escape(data)})`, function(err, result){

        if(err){
          return res.status(401).send({err});
        }else if(result.length){
            bcrypt.hash(password, 10, (err, hash)=>{
                  if(hash){
                    db.query(`UPDATE users SET confirmcode = ${db.escape('0')}, password = ${db.escape(hash)}
                     WHERE iduser = ${db.escape(result[0].iduser)}`, function(e, r){
                      return res.status(200).send({msg: 'password-changed'});
                    });
                  }
            });
            
        }else return res.status(204).send({msg:'confirm code does not exist'});
    });
});


router.put('/driver-forget-my-pass-send-code', (req,res)=>{
  const {employeeid, phonenumber} = req.body;
  db.query(`SELECT * FROM drivers WHERE  employeeid =  ${db.escape(employeeid)} OR phonenumber = ${db.escape(phonenumber)}`,(qe,qr)=>{
      if(qe) res.status(401).send({msg:'error'});
      if(qr.length){
          let cod = emailMiddleware.random();
          emailMiddleware.sendEmail(qr[0]['email'], cod, 'CÓDIGO DE ALTERAÇÃO DE PASSWORD');
          smsMiddleware.sendSMS(qr[0]['phonenumber'], cod);
          if(cod){
            db.query(`UPDATE drivers SET confirmcode = ${db.escape(cod)} WHERE phonenumber = ${db.escape(phonenumber)} OR employeeid = ${db.escape(employeeid)} `, function(e, r){
              if(r) return res.status(200).send({msg: 'updated....',  data : (phonenumber ? phonenumber :employeeid)});
            });
          }
          //return res.status(200).send({msg: cod});
      }else res.status(204).send({msg:'users does not found', data : (phonenumber ? phonenumber :employeeid)}); 
  });
});

router.put('/driver-forget-my-pass-change', userMiddleware.validatePassword, (req,res)=>{
      const {confirmcode,password, password_repeat, data} = req.body;
      db.query(`SELECT * FROM drivers WHERE confirmcode = ${db.escape(confirmcode)} AND (employeeid = ${db.escape(data)} OR phonenumber = ${db.escape(data)})`, function(err, result){

        if(err){
          return res.status(401).send({err});
        }else if(result.length){
            bcrypt.hash(password, 10, (err, hash)=>{
                  if(hash){
                    db.query(`UPDATE drivers SET confirmcode = ${db.escape('0')}, password = ${db.escape(hash)}
                     WHERE iddriver = ${db.escape(result[0].iddriver)}`, function(e, r){
                       console.log(result[0]);
                       if(r) return res.status(200).send({msg: 'password-changed'});
                    });
                  }
            });
            
        }else return res.status(204).send({msg:'confirm code does not exist'});
    });
});





// routes/router.js

router.post('/sign-up',userMiddleware.validateRegister, (req, res) => {

    db.query(
      `SELECT email FROM users WHERE LOWER(email) = LOWER(${db.escape(req.body.email)});`,
      (err, result) => {
        db.query(`SELECT phonenumber FROM users WHERE phonenumber = ${req.body.phonenumber}`,(er, rr)=>{
        
          if(result.length && req.body.email.length>1)
            return res.status(409).send({msg:'This email is already in use'});
          else if(rr.length) return res.status(409).send({msg:'This phonenumber is already in use'});
          else {
            // username is available
            bcrypt.hash(req.body.password, 10, (err, hash) => {
              if (err) {
                return res.status(500).send({
                  msg: err
                });
              } else {
                let cod = emailMiddleware.random();
                emailMiddleware.sendEmail(req.body.email, cod);
                smsMiddleware.sendSMS(req.body.phonenumber, cod);
                db.query(
                  `INSERT INTO users (username, password, registred, email, confirmcode, codeforinvitation, phonenumber) VALUES (${db.escape(
                    req.body.username
                  )}, ${db.escape(hash)}, current_timestamp(), ${db.escape(req.body.email)}, ${db.escape(cod)}, ${db.escape(cod)},${db.escape(req.body.phonenumber)})`,
                  (err, result) => {
                    if (err) {
                      return res.status(400).send({
                        msg: err
                      });
                    }
                    return res.status(201).send({
                      msg: 'Registered!',
                      username : req.body.username,
                      phonenumber: req.body.phonenumber,
                      confirmcode: cod
                    });
                  }
                );
              }
            });
          }


        });
        
      }
    );
  });

  router.post('/sign-up-admin',userMiddleware.validateRegister, (req, res) => {
    db.query(
      `SELECT * FROM admins WHERE LOWER(email) = LOWER(${db.escape(req.body.email)});`,
      (err, result) => {
        db.query(`SELECT phonenumber FROM admins WHERE phonenumber = ${db.escape(req.body.phonenumber)}`,
          (er, rr)=>{
            if(result.length)
               return res.status(409).send({msg:'This email is already in use'});
            else if(rr.length) return res.status(409).send({msg:'This phonenumber is already in use'});
            else {
              // username is available
              bcrypt.hash(req.body.password, 10, (err, hash) => {
                if (err) {
                  return res.status(500).send({
                    msg: err
                  });
                } else {
                  db.query(
                    `INSERT INTO admins (username, password, registred, email, phonenumber) VALUES (${db.escape(
                      req.body.username
                    )}, ${db.escape(hash)}, current_timestamp(), ${db.escape(req.body.email)}, ${db.escape(req.body.phonenumber)})`,
                    (err, result) => {
                      if (err) {
                        throw err;
                        return res.status(400).send({
                          msg: err
                        });
                      }
                      return res.status(201).send({
                        msg: 'Registered!',
                        username : req.body.username,
                        phonenumber: req.body.phonenumber
                      });
                    }
                  );
                }
              });
            }
          });
         
      }
    );
  });

  router.post('/sign-up-driver', userMiddleware.validateRegister, (req, res) => {
    db.query(
      `SELECT * FROM drivers WHERE LOWER(email) = LOWER(${db.escape(req.body.email)}) 
      ;`,
      (err, result) => {
         
        db.query(`SELECT phonenumber FROM drivers WHERE phonenumber = ${db.escape(req.body.phonenumber)}`,
          (er, rr)=>{
            if(result.length)
              return res.status(409).send({msg:'This email is already in use'});
            else if(rr.length) return res.status(409).send({msg:'This phonenumber is already in use'});
            else {
              // username is available
              bcrypt.hash(req.body.password, 10, (err, hash) => {
                if (err) {
                  return res.status(500).send({
                    msg: err
                  });
                } else {
                  let cod = emailMiddleware.random();
                  let cod1 = emailMiddleware.random();
                  
                  // has hashed pw => add to database
                  db.query(
                    `INSERT INTO drivers (username, password, phonenumber,email, employeeid, confirmcode) VALUES (${db.escape(
                      req.body.username
                    )}, ${db.escape(hash)}, ${db.escape(req.body.phonenumber)} ,${db.escape(req.body.email)}, ${db.escape(cod)}, ${db.escape(cod1)})`,
                    (err, result) => {
                      if (err) {
                        return res.status(400).send({
                          msg: err
                        });
                      }
                      
                      smsMiddleware.sendSMS(req.body.phonenumber, cod1);
                      return res.status(201).send({
                        username : req.body.username,
                        phonenumber: req.body.phonenumber
                      });
                    }
                  );
                }
              });
            }
          });
       
      }
    );
  });

  router.post('/own-sing-up', userMiddleware.validateRegister, (req, res) => {
    db.query(
      `SELECT * FROM drivers WHERE LOWER(email) = LOWER(${db.escape(req.body.email)}) 
      ;`,
      (err, result) => {
        db.query(`SELECT phonenumber FROM drivers WHERE phonenumber = ${db.escape(req.body.phonenumber)}`,
          (er,rr)=>{
            if(result.length)
              return res.status(409).send({msg:'This email is already in use'});
            else if(rr.length) return res.status(409).send({msg:'This phonenumber is already in use'});
            else {
              // username is available
              bcrypt.hash(req.body.password, 10, (err, hash) => {
                if (err) {
                  return res.status(500).send({
                    msg: err
                  });
                } else {
                  let cod = emailMiddleware.random();
                  
                  // has hashed pw => add to database
                  db.query(
                    `INSERT INTO drivers (username, password, phonenumber,email, employeeid, hascar_ ,validate, home) VALUES (${db.escape(
                      req.body.username
                    )}, ${db.escape(hash)}, ${db.escape(req.body.phonenumber)} ,${db.escape(req.body.email)}, ${db.escape(cod)}, ${db.escape('1')}, ${db.escape('1')}, ${db.escape(req.body.home)})`,
                    (err, result) => {
                      if (err) {
                        return res.status(400).send({
                          msg: err
                        });
                      }
                      
                      smsMiddleware.sendSMS2(req.body.phonenumber, cod, req.body.password);
                      return res.status(201).send({
                        username : req.body.username,
                        phonenumber: req.body.phonenumber
                      });
                      
                    }
                  );
                }
              });
            }
          });
        
      }
    );
  });


router.post('/confirm-sign-up', (req,res) =>{
  const confirmCode = req.body.confirmcode;
  db.query(`SELECT * FROM users WHERE confirmcode = ${db.escape(confirmCode)}`, function(err, result){

      if(err){
        return res.status(401).send({err});
      }else{
        if(result.length){
          if(result[0].validate === '0'){
             //console.log(result[0].validate);
             db.query(`UPDATE users SET validate = ${'1'}, confirmcode = ${'0'} WHERE iduser = ${db.escape(result[0].iduser)}`, function(e, r){
              return res.status(200).send({msg: 'updated....'});
             });
             
          }else{
            console.log(err);
            return res.status(204).send({msg:'confirm code does not exist'});
          }
        }
      }
  });
});

router.post('/confirm-sign-up-driver', (req,res) =>{
  const confirmCode = req.body.confirmcode;
  db.query(`SELECT * FROM drivers WHERE confirmcode = ${db.escape(confirmCode)}`, function(err, result){

      if(err){
        return res.status(401).send({err});
      }else{
        if(confirmCode){
          if(result[0].validate === '0'){
             //console.log(result[0].validate);
             db.query(`UPDATE drivers SET confirmcode = ${'0'} WHERE iduser = ${db.escape(result[0].iduser)}`, function(e, r){
              return res.status(200).send({msg: 'updated.... number checked'});
             });
             
          }else{
            console.log(err);
            return res.status(204).send({msg:'confirm code does not exist'});
          }
        }
      }
  });
});


// routes/router.js

router.post('/login', (req, res) => {
    const {email, phonenumber} = req.body;
    const  prop = email? email : phonenumber;
    db.query(
      `SELECT * FROM users WHERE phonenumber = ${db.escape(prop)} OR email = ${db.escape(prop)} ;`,
      (err, result) => {
        // user does not exists
        if (err) {
          throw err;
          return res.status(400).send({
            msg: err
          });
        }
        
  
        if (!result.length) {
          return res.status(401).send({
            msg: 'E-mail or password is incorrect!'
          });
        }

        if (result[0].validate === '0') {
          let cod = emailMiddleware.random();
          
          db.query(`UPDATE users SET confirmcode = ${db.escape(cod)} WHERE phonenumber = ${db.escape(prop)} OR email = ${db.escape(prop)}`, (exx, rxx)=>{
            if(rxx){
              smsMiddleware.sendSMS(prop, cod);
              console.log("prop:",prop)      
            }
          });

          return res.status(401).send({
            msg: 'Invalid login, require validate login'
          });
          
        }
  
        // check password
        bcrypt.compare(
          req.body.password,
          result[0]['password'],
          (bErr, bResult) => {
            // wrong password
            if (bErr) {
              return res.status(401).send({
                msg: 'E-mail or password is incorrect!'
              });
            }
  
            if (bResult) {
              const {iduser, username} = result[0]
              const token = jwt.sign({
                  username: username,
                  iduser: iduser
                },
                'SECRETKEY', {
                  expiresIn: '365d'
                }
              );
  
              db.query(
                `UPDATE users SET lastlogin = current_timestamp() WHERE iduser = '${result[0].iduser}'`
              );
              return res.status(200).send({
                msg: 'Logged in!',
                token,
                user: result[0]
              });
            }
            return res.status(401).send({
              msg: 'E-mail or password is incorrect!'
            });
          }
        );
       }
    );
  });


  router.post('/login-admin', (req, res) => {
    const {email, phonenumber} = req.body;
    db.query(
      `SELECT * FROM admins WHERE phonenumber = ${db.escape(phonenumber)} OR username = ${db.escape(email)} ;`,
      (err, result) => {
        // user does not exists
        if (err) {
          throw err;
          return res.status(400).send({
            msg: err
          });
        }
  
        if (!result.length) {
          return res.status(401).send({
            msg: 'E-mail or password is incorrect!'
          });
        }
  
        // check password
        bcrypt.compare(
          req.body.password,
          result[0]['password'],
          (bErr, bResult) => {
            // wrong password
            if (bErr) {
              return res.status(401).send({
                msg: 'E-mail or password is incorrect!'
              });
            }
  
            if (bResult) {
              const {iduser, username} = result[0]
              const token = jwt.sign({
                  username: username,
                  iduser: iduser
                },
                'SECRETKEY', {
                  expiresIn: '14d'
                }
              );
  
              db.query(
                `UPDATE admins SET lastlogin = current_timestamp() WHERE idadmin = '${result[0].idadmin}'`
              );
              return res.status(200).send({
                msg: 'Logged in!',
                token,
                user: result[0]
              });
            }
            return res.status(401).send({
              msg: 'E-mail or password is incorrect!'
            });
          }
        );
       }
    );
  });
  router.post('/login-driver', (req, res) => {
    const {password, employeeid} = req.body;
    console.log(employeeid);
    db.query(
      `SELECT * FROM drivers WHERE employeeid = ${db.escape(employeeid)};`,
      (err, result) => {
        // user does not exists
        if (err) {
          return res.status(400).send({
            msg: err
          });
        }
        if (!result.length) {
          return res.status(401).send({
            msg: 'Employee ID or password is incorrect!'
          });
        }

        if (result[0].validate === '0') {
          let cod = emailMiddleware.random();
          db.query(`SELECT * from drivers where employeeid = ${db.escape(employeeid)}`, (eyy, ryy)=>{
              if(ryy){
                
                db.query(`UPDATE drivers set confirmcode = ${db.escape(cod)} WHERE phonenumber = ${db.escape(phonenumber)} `, (exx, rxx)=>{
                    if(rxx){
                      smsMiddleware.sendSMS(phonenumber, cod);      
                    }
                });

              }
          });
          
          return res.status(401).send({
            msg: 'Invalid login, require validate login'
          });
          
        }
        if(result[0].blocked == '1') res.status(401).send({msg:'user blocked, contact source'});
  
        // check password
        bcrypt.compare(
          password,
          result[0]['password'],
          (bErr, bResult) => {
            // wrong password
            if (bErr) {
              return res.status(401).send({
                msg: 'Employee ID or password is incorrect!'
              });
            }
  
            if (bResult) {
              const {iddriver, email} = result[0];
              const token = jwt.sign({
                  email,
                  iddriver
                },
                'SECRETKEY', {
                  expiresIn: '30d'
                }
              );
  
              db.query(
                `UPDATE users SET lastlogin = current_timestamp() WHERE iduser = '${result[0].iddrive}'`
              );
              return res.status(200).send({
                msg: 'Logged in!',
                token,
                user: result[0]
              });
            }
            return res.status(401).send({
              msg: 'Employee ID or password is incorrect!'
            });
          }
        );
       }
    );
});


// Admin
router.put('/admin-validate-driver', (req,res)=>{
  
    //const {iddriver} = req.body;
    const {iddriver, validate} = req.body;    
    db.query(`UPDATE drivers SET validate = ${db.escape(validate)} 
    WHERE iddriver = ${db.escape(iddriver)}`
    , 
    function(e, r){
          if(e) return res.status(401).send({msg: 'error....'});
          else return res.status(200).send({msg: 'updated....'});
    });    
        
});

router.put('/admin-finishing-drive', (req,res)=>{
  
  const reservecode = req.body.idreserve;
  let {timestamp, reserveto, distance, iddriver} = req.body;
  reserveto = JSON.stringify(reserveto);
  let price;

  
    db.query(`SELECT c.idcategory, r. idreserve,c.initial_price, c.fees_by_3k, fees_by_k
    FROM reserves r JOIN categories c ON c.idcategory = r.idcategory
    WHERE r.idreserve = ${db.escape(reservecode)};`, (ex, info)=>{
    
        if(info.length){
            distance = Math.round(distance)
            price = distance > 3 ? (distance-3) * info[0].fees_by_3k + timestamp * info[0].fees_by_k + info[0].initial_price : info[0].initial_price;
            
            db.query(`UPDATE drives SET status = ${db.escape('3')} 
            WHERE idreserve = ${db.escape(reservecode)}`
            , 
            function(e, r){
                  if(e) return res.status(500).send({msg: 'error....'});
                  else{
                    db.query(`UPDATE drivers set status = ${db.escape('0')} where iddriver = ${db.escape(iddriver)} `,
                    (err, rr)=>{
                      console.log(err, rr);
                      if(rr){
                        db.query(`UPDATE reserves SET expectedduration = ${db.escape(timestamp)}, price = ${db.escape(price)}, reserveto = ${db.escape(reserveto)} WHERE idreserve = ${db.escape(reservecode)} `, (ex, rx)=>{
                          if(rx) return res.status(200).send({msg: 'updated....', price, distance, reservecode});
                        });
                      }
                    });
                  }
            });
        }
    });   
         
});

router.get('/admin-info-reserve/:id', (req, res)=>{
  const {id} = req.params;
  db.query(`SELECT r.reservefrom, r.idreserve, dr.latitude, dr.longitude, dr.iddriver, dr.username
  FROM drives d JOIN reserves r ON d.idreserve = r.idreserve
  JOIN drivers dr ON dr.iddriver = d.iddriver
  WHERE r.idreserve = ${db.escape(id)};
  `, (e, r)=>{
      if(r.length){
        let info =[];
        for(let i = 0; i< r.length; i++){
          r[i].reservefrom = JSON.parse(r[i].reservefrom);
          info.push(r[i]);
        }
        return res.status(200).json(info);
      }
      else return res.status(200).send({msg:'empty...'})
  });
});



router.put('/admin-block-driver', (req,res)=>{
  
  //const {iddriver} = req.body;
  const {iddriver, status} = req.body;    
  db.query(`UPDATE drivers SET blocked = ${db.escape(status)} 
  WHERE iddriver = ${db.escape(iddriver)}`
  , 
  function(e, r){
        if(e) return res.status(401).send({msg: 'error....'});
        else return res.status(200).send({msg: 'Blocked....'});
  });    
      
});
router.delete('/admin-delete-driver',(req, res)=>{
  const {iddriver} = req.body;
    db.query(`SET FOREIGN_KEY_CHECKS=OFF`,(e,r)=>{
        if(r){
          db.query(`DELETE FROM drivers WHERE iddriver = ${db.escape(iddriver)};`,(de,dr)=>{
              if(dr){
                
                db.query(`SET FOREIGN_KEY_CHECKS=ON;`,(fe, fr)=>{

                  if(fr) res.status(202).send({msg:'elimando...'});
                  
                });
              } 
          });
        }
    });
});
router.get('/admin-realized-drives', (req,res)=>{
    //const{admin} = req.userData;
    db.query(`SELECT COUNT(*) As viagens_realizadas FROM drives join reserves ON reserves.idreserve = drives.idreserve WHERE  date(reserves.reservedate) = date(current_date) AND drives.status = ${db.escape('3')};`, 
    (err, result)=>{
        if(err) res.status(401).send({err});
        else{
          if(result.length){
            res.status(200).send({info:result[0]});
          }else res.status(204).send({msg:'empty'});
        }
    });
});

router.get('/admin-realized-drives-today', (req, res)=>{
  //const {iduser} = req.userData;

  db.query(
    `
    SELECT r.idreserve, DATE_FORMAT(r.reservedate, '%d-%m-%Y Ás %H:%i') AS reservedate, r.reservefrom, r.reserveto, dr.username AS driver, u.username AS client 
    FROM drives d JOIN reserves r ON r.idreserve = d.idreserve JOIN drivers dr ON dr.iddriver = d.iddriver JOIN users u ON u.iduser = r.iduser 
    WHERE  date(r.reservedate) = date(current_date()) AND d.status = '3';
    `,
    (error, result)=>{
      if(error){
        return res.status(400).send({
          msg: "error",
          error
       });
      }else{
          if(result.length){
            let info =[];
            for(let i = 0; i< result.length; i++){
              result[i]['status'] === '0' ? result[i]['status'] = 'Desocupado' : result[i]['status'] = 'Ocupado';
              result[i]['reserveto'] = JSON.parse(result[i]['reserveto']);
              result[i]['reservefrom'] = JSON.parse(result[i]['reservefrom']);
              info.push(result[i]);
            }
            return res.status(200).json(info);
          }else{
            return res.status(204).send({msg:'does not have drive'});
          }         
      }
    }
  );


});
router.get('/admin-retracting-drives', (req,res)=>{
  //const{admin} = req.userData;
  db.query(`SELECT COUNT(*) AS viagens_curso FROM drives JOIN reserves ON reserves.idreserve = drives.idreserve WHERE  date(reserves.reservedate) = date(current_timestamp()) AND drives.status = ${db.escape('2')};`, 
  (err, result)=>{
      if(err) res.status(401).send({err});
      else{
        if(result.length){
          res.status(200).send({info:result[0]});
        }else res.status(204).send({msg:'empty'});
      }
  });
});
router.get('/admin-asking-drives', (req,res)=>{
  //const{admin} = req.userData;
  db.query(`SELECT count(*) AS pedidos_pendentes 
        FROM drives d JOIN reserves r ON d.idreserve = r.idreserve 
        WHERE d.iddriver IS NULL AND d.status = '0' AND DATE(r.reservedate) = DATE(current_timestamp());
  `, 
  (err, result)=>{
      if(err) res.status(401).send({err});
      else{
        if(result.length){
          res.status(200).send({info:result[0]});
        }else res.status(204).send({msg:'empty'});
      }
  });
});

router.get('/admin-remove-asking-drives/:id', (req,res)=>{
  //const{admin} = req.userData;
  const {id} = req.params;
  db.query(`DELETE FROM drives WHERE idreserve = ${db.escape(id)};
  `, 
  (err, result)=>{
      if(err) res.status(401).send({err});
      else{
        console.log(result);
        res.status(204).send();
      }
  });
});



router.post('/admin-add-car-driver', function(req, res){
  db.query(`SELECT * FROM drivers WHERE email = ${db.escape(req.body.email)};`, (e, row)=>{
    if(row.length){
      db.query(`INSERT INTO cars (iddriver, typeofcar, tradecar, colorcar, registrationcar, modelcar)
      VALUES (${db.escape(row[0].iddriver)}, ${db.escape(req.body.typeofcar)},
      ${db.escape(req.body.tradecar)},${db.escape(req.body.colorcar)}, 
      ${db.escape(req.body.registrationcar)},${db.escape(req.body.modelcar)}
      )
      `, (dErr, dRes)=>{
          if(dErr) return res.status(500).send({msg:dErr});
          db.query(`UPDATE drivers SET hascar_ = '1', validate = '1' where iddriver = ${row[0].iddriver} `,(e,r)=>{});
          return res.status(201).send({msg:'created'
          });
      });
    }
});
});

router.post('/admin-update-car-driver', function(req, res){
  
  db.query(`UPDATE cars SET typeofcar = ${db.escape(req.body.typeofcar)},
      tradecar = ${db.escape(req.body.tradecar)},colorcar = ${db.escape(req.body.colorcar)}, 
      registrationcar = ${db.escape(req.body.registrationcar)}, modelcar= ${db.escape(req.body.modelcar)}
      WHERE iddriver = ${db.escape(req.body.iddriver)}
      `, (dErr, dRes)=>{
          if(dErr) return res.status(500).send({msg:dErr});
          return res.status(200).send({msg:'updated'
          });
      });
});
router.get('/drivers-status', (req, res)=>{
  //const {iduser} = req.userData;

  db.query(
    `
    SELECT drivers.iddriver,drivers.photo, drivers.player_id,drivers.username,drivers.retrating,drivers.phonenumber,drivers.latitude, drivers.status_active, drivers.longitude, drivers.status,cars.registrationcar, cars.tradecar, 
    cars.modelcar,cars.colorcar, drivers.home, drivers.status
    FROM drivers JOIN cars on drivers.iddriver = cars.iddriver WHERE drivers.status_active = '1' ;
    `,
    (error, result)=>{
      if(error){
        return res.status(400).send({
          msg: "error",
          error
       });
      }else{
          if(result.length){
            let info =[];
            for(let i = 0; i< result.length; i++){
              result[i]['status'] === '0' ? result[i]['status'] = 'Desocupado' : result[i]['status'] = 'Ocupado';
              info.push(result[i]);
            }
            return res.status(200).json(info);
          }          
      }
    }
  );


});
router.get('/admin-today-earning-drives', (req,res)=>{
  //const{admin} = req.userData;
  db.query(`SELECT sum(price) AS ganhos FROM drives JOIN reserves ON reserves.idreserve = drives.idreserve WHERE date(reserves.reservedate) = date(current_timestamp()) AND drives.status = ${db.escape('3')};`, 
  (err, result)=>{
      if(err) res.status(401).send({err});
      else{
        if(result.length){
          res.status(200).send({info:result[0]});
        }else res.status(204).send({msg:'empty'});
      }
  });
});

router.get('/admin-earning-drives', (req,res)=>{
  //const{admin} = req.userData;
  const {reservedate} = req.body;
  db.query(`SELECT sum(price) AS ganhos FROM drives JOIN reserves ON reserves.idreserve = drives.idreserve WHERE reserves.reservedate = ${db.escape(reservedate)} AND drives.status = ${db.escape('3')};`, 
  (err, result)=>{
      if(err) res.status(401).send({err});
      else{
        if(result.length){
          res.status(200).send({info:result[0]});
        }else res.status(204).send({msg:'empty'});
      }
  });
});


router.get('/admin-drivers-in-service', (req, res)=>{
  //const {iduser} = req.userData;

  db.query(
    `SELECT drivers.iddriver,drivers.username,drivers.latitude, drivers.status_active, drivers.longitude, drivers.status,cars.registrationcar, cars.tradecar, 
    cars.modelcar, drivers.home, drivers.status
    FROM drivers JOIN cars on drivers.iddriver = cars.iddriver WHERE drivers.status_active = '1' ;
    `,
    (error, result)=>{
      if(error){
        return res.status(400).send({
          msg: "error",
          error
       });
      }else{
          if(result.length){
            let info =[];
            for(let i = 0; i< result.length; i++){
              result[i]['status'] === '0' ? result[i]['status'] = 'Desocupado' : result[i]['status'] = 'Ocupado';
              result[i]['home'] === '0' ? result[i]['home'] = 'Outra' : result[i]['home'] = 'Soronel';
              info.push(result[i]);
            }
            return res.status(200).json(info);
          }else{
            return res.status(204).send({msg:'empty'});
          }          
      }
    }
  );


});
router.get('/admin-drivers-invalidate',(req, res)=>{
    db.query(`SELECT d.username AS driver, d.iddriver, DATE_FORMAT(d.registered, '%d-%m-%Y Ás %H:%i') as registered, d.email, d.employeeid, d.phonenumber, d.home 
    FROM cars AS c RIGHT JOIN drivers AS d on c.iddriver = d.iddriver where d.validate = '0';
    `, (err, r)=>{
      if(err){
        return res.status(400).send({
          msg: "error"
       });
      }else{
        if(r.length){
          let info =[];
          for(let i = 0; i< r.length; i++){
            r[i]['typeofcar'] === '0' ? r[i]['typeofcar'] = 'Empresarial' : r[i]['typeofcar'] = 'Pessoal';
            info.push(r[i]);
          }
          return res.status(200).json(info);
        }else{
          return res.status(204).send({msg:'empty'});
        }         
      }
    });
});

router.get('/admin-get-fees', (req, res)=>{
  db.query(`SELECT s.idservice, s.service,c.category,c.idcategory, c.initial_price, c.fees_by_3k, c.fees_by_k 
            FROM categories c JOIN services s ON c.idservice = s.idservice;
  `, (e, r)=>{
      if(r.length){
        let info =[];
        for(let i = 0; i< r.length; i++){
          info.push(r[i]);
        }
        return res.status(200).json(info);
      }
      else return res.status(200).send({msg:'empty...'});
  });
});



router.get('/admin-get-fees-cat/:id', (req, res)=>{
  const {id} = req.params;
  db.query(`SELECT s.idservice, s.service,c.category,c.idcategory, c.initial_price, c.fees_by_3k, c.fees_by_k 
            FROM categories c JOIN services s ON c.idservice = s.idservice WHERE c.idcategory = ${db.escape(id)};
  `, (e, r)=>{
      if(r.length){
        let info =[];
        for(let i = 0; i< r.length; i++){
          info.push(r[i]);
        }
        return res.status(200).json(info);
      }
      else return res.status(200).send({msg:'empty...'});
  });
});

router.put('/admin-update-fees', function(req, res){
  const {category, initial_price, fees_by_3k, id, fees_by_k } = req.body;
  
  db.query(`UPDATE categories SET category = ${db.escape(category)}, initial_price = ${db.escape(initial_price)}, fees_by_3k = ${db.escape(fees_by_3k)}, fees_by_k = ${db.escape(fees_by_k)} WHERE idcategory = ${db.escape(id)};
      `, (dErr, dRes)=>{
          if(dErr) return res.status(500).send({msg:dErr});
          return res.status(200).send({msg:'updated'
          });
      });
});


router.get('/admin-drivers-validate',(req, res)=>{
  db.query(`SELECT d.username as driver, d.iddriver,d.blocked, d.registered, d.email, d.employeeid, d.phonenumber, d.home,c.tradecar, c.modelcar, c.registrationcar, c.colorcar, c.typeofcar 
            from cars as c join drivers as d on c.iddriver = d.iddriver where d.validate = '1';
  `, (err, r)=>{
    if(err){
      return res.status(400).send({
        msg: "error"
     });
    }else{
      if(r.length){
        let info =[];
        for(let i = 0; i< r.length; i++){
          r[i]['typeofcar'] === '0' ? r[i]['typeofcar'] = 'Empresarial' : r[i]['typeofcar'] = 'Pessoal';
          info.push(r[i]);
        }
        return res.status(200).json(info);
      }else{
        return res.status(204).send({msg:'empty'});
      }         
    }
  });
});

router.get('/admin-driver-validate/:id',(req, res)=>{
  const {id} = req.params;
  db.query(`SELECT d.username as driver, d.iddriver, d.registered, d.email, d.employeeid, d.phonenumber, d.home,c.tradecar, c.modelcar, c.registrationcar, c.colorcar, c.typeofcar 
            from cars as c join drivers as d on c.iddriver = d.iddriver where d.validate = '1' AND d.iddriver = ${id};
  `, (err, r)=>{
    if(err){
      return res.status(400).send({
        msg: "error"
     });
    }else{
      if(r.length){
        let info =[];
        for(let i = 0; i< r.length; i++){
          r[i]['typeofcar'] === '0' ? r[i]['typeofcar'] = 'Empresarial' : r[i]['typeofcar'] = 'Pessoal';
          info.push(r[i]);
        }
        return res.status(200).json(info);
      }else{
        return res.status(204).send({msg:'empty'});
      }         
    }
  });
});


router.get('/admin-clientes',(req, res)=>{
  db.query(`SELECT iduser,username,sex, phonenumber, photo, email FROM users WHERE validate = '1';
  `, (err, r)=>{
    if(err){
      return res.status(500).send({
        msg: "error"
     });
    }else{
      if(r.length){
        let info =[];
        for(let i = 0; i< r.length; i++){
          info.push(r[i]);
        }
        return res.status(200).json(info);
      }else{
        return res.status(204).send({msg:'empty'});
      }         
    }
  });
});


router.get('/admin-historic-all-reserves/:iduser', (req, res)=>{
  const {iduser} = req.params;
  db.query(`select DATE_FORMAT(r.reservedate, '%d-%m-%Y Ás %H:%i') as reservedate,h.idreservein,r.reservefrom, r.reserveto,r.iduser,r.passenger, r.expectedduration, r.price, u.username as client, dr.username as driver, h.status, d.description
  FROM historics h left join drives d on h.idreservein = d.idreserve
  left join reserves r on  h.idreservein = r.idreserve
  left join users u on r.iduser = u.iduser
  left join drivers dr on d.iddriver = dr.iddriver
  WHERE r.iduser = ${db.escape(iduser)} and d.status_cancel = '2' OR d.status_cancel = '0'
  ORDER BY h.idreservein desc;
  `,
      (error, result)=>{
        if(error){
          return res.status(400).send({
            msg: "error",
            error : err
         });

        }else{
          if(result.length){
            let info =[];
            for(let i = 0; i< result.length; i++){
              result[i]['status'] === '0' ? result[i]['status'] = 'Cancelada' : result[i]['status'] = 'Realizada';
              result[i]['reservefrom'] = JSON.parse(result[i]['reservefrom']);
              result[i]['reserveto'] = JSON.parse(result[i]['reserveto']);
              info.push(result[i]);
            }
          
            return res.status(200).json(info);
            
          }else{
            return res.status(204).send({
              msg: 'this user does not have reserve!',
              iduser
            })
          }  
        }
      }
  );
});

router.get('/admin-asking-drive', (req, res)=>{
  
  db.query(`SELECT r.reservefrom, r.reserveto, u.username , u.phonenumber, r.idreserve, DATE_FORMAT(r.reservedate, '%d-%m-%Y Ás %H:%i') as reservedate 
  FROM drives d JOIN reserves r ON d.idreserve = r.idreserve
  JOIN users u ON u.iduser = r.iduser 
  WHERE d.iddriver IS NULL AND d.status = '0' AND date(r.reservedate) = current_date()
  ORDER BY r.idreserve desc;
  `,
      (error, result)=>{
        if(error){
          return res.status(400).send({
            msg: "error",
            error : error
         });

        }else{
          if(result.length){
            let info =[];
            for(let i = 0; i< result.length; i++){
              result[i]['reservefrom'] = JSON.parse(result[i]['reservefrom']);
              result[i]['reserveto'] = JSON.parse(result[i]['reserveto']);
              info.push(result[i]);
            }
          
            return res.status(200).json(info);
            
          }else{
            return res.status(204).send({
              msg: 'does not have asking drive'
            })
          }  
        }
      }
  );
});


router.get('/admin-drives-in-course', (req, res)=>{
  
  db.query(`SELECT d.idreserve reserva, u.username client, r.reservefrom, r.reserveto, m.username driver, d.status, r.reservedate
  FROM drives d  JOIN reserves r ON r.idreserve = d.idreserve JOIN users u ON u.iduser = r.iduser JOIN drivers m ON m.iddriver = d.iddriver
  WHERE d.status = '2' AND date(r.reservedate) = current_date()
  ORDER BY d.idreserve desc
  ;
  `,
      (error, result)=>{
        if(error){
          return res.status(500).send({
            msg: "error",
            error : err
         });

        }else{
          if(result.length){
            let info =[];
            for(let i = 0; i< result.length; i++){
              result[i]['reservefrom'] = JSON.parse(result[i]['reservefrom']);
              result[i]['reserveto'] = JSON.parse(result[i]['reserveto']);
              info.push(result[i]);
            }
          
            return res.status(200).json(info);
            
          }else{
            return res.status(204).send({
              msg: 'does not have drive in course!'
            })
          }  
        }
      }
  );
});


router.get('/admin-drivers-validate-hascar',(req, res)=>{
  db.query(`SELECT d.username as driver, d.hascar_, d.iddriver, d.registered, d.email, d.employeeid, d.phonenumber, d.home,c.tradecar, c.modelcar, c.registrationcar, c.colorcar 
  from cars as c right join drivers as d on c.iddriver = d.iddriver where d.validate = '1' and hascar_ = '0';
  `, (err, r)=>{
    if(err){
      return res.status(400).send({
        msg: "error"
     });
    }else{
      if(r.length){
        let info =[];
        for(let i = 0; i< r.length; i++){
          r[i]['typeofcar'] === '0' ? r[i]['typeofcar'] = 'Empresarial' : r[i]['typeofcar'] = 'Pessoal';
          info.push(r[i]);
        }
        return res.status(200).json(info);
      }else{
        return res.status(204).send({msg:'empty'});
      }         
    }
  });
});


router.get('/admin-drivers-in-service-count', (req,res)=>{
  //const{admin} = req.userData;
  db.query(`SELECT COUNT(*) AS drivers FROM drivers JOIN cars on drivers.iddriver = cars.iddriver WHERE drivers.status_active = '1' ;`, 
  (err, result)=>{
      if(err) res.status(401).send({err});
      else{
        if(result.length){
          res.status(200).send({info:result[0]});
        }else res.status(204).send({msg:'empty'});
      }
  });
});

router.get('/admin-drivers-unbusy-count', (req,res)=>{
  //const{admin} = req.userData;
  db.query(`SELECT COUNT(*) AS drivers FROM drivers WHERE status = ${db.escape('0')} AND  status_active = ${db.escape('1')};`, 
  (err, result)=>{
      if(err) res.status(401).send({err});
      else{
        if(result.length){
          res.status(200).send({info:result[0]});
        }else res.status(204).send({msg:'empty'});
      }
  });
});

router.get('/admin-drivers-busy-count', (req,res)=>{
  //const{admin} = req.userData;
  db.query(`SELECT COUNT(*) AS drivers FROM drivers WHERE status = ${db.escape('1')} AND status_active = ${db.escape('1')};`, 
  (err, result)=>{
      if(err) res.status(401).send({err});
      else{
        if(result.length){
          res.status(200).send({info:result[0]});
        }else res.status(204).send({msg:'empty'});
      }
  });
});

router.post('/driver-earning-month', (req,res)=>{
  info = [];
  let {date} = req.body;
  date = date.split('-');
  for(let i = 1; i<=31; i++){
    db.query(`SELECT sum(reserves.price) as data FROM historics
    JOIN drives ON drives.idreserve = historics.idreservein
    JOIN reserves ON reserves.idreserve = historics.idreservein
    WHERE DATE(reserves.reservedate) = DATE('${date[0]}-${date[1]}-${i}') AND historics.status = '1';`,
    (err, info1)=>{
        if(info1.length){
          let a = (info1[0].data != null ? info1[0].data : 0);
          info.push(a);
          if(i == 31) res.status(200).send({info});
        }else res.status(204).send({msg:'empty'});

    });
  }
    
});

router.post('/driver-earning-month-id', (req,res)=>{
  const {id} = req.body;
  info = [];
  let {date} = req.body;
  date = date.split('-');
  for(let i = 1; i<=31; i++){
    db.query(`SELECT sum(reserves.price) as data FROM historics
    JOIN drives ON drives.idreserve = historics.idreservein
    JOIN reserves ON reserves.idreserve = historics.idreservein
    WHERE DATE(reserves.reservedate) = DATE('${date[0]}-${date[1]}-${i}') AND historics.status = '1'
    AND drives.iddriver = ${db.escape(id)}
    ;`,
    (err, info1)=>{
        if(info1.length){
          let a = (info1[0].data != null ? info1[0].data : 0);
          info.push(a);
          if(i == 31) res.status(200).send({info});
        }else res.status(204).send({msg:'empty'});

    });
  }
    
});

router.get('/teste', (req, res, next)=>{
  console.log(req.userData);
  res.send({msg: 'Css'});
});

//bring all users
router.get('/users',(req,res)=>{
  db.query(`SELECT username FROM users`, (err, result)=>{
      if(err){
        return res.status(400).send({
          msg: "error", 
          error : err
        });
      }else{
        return res.status(200).send({
            msg: "sucess",
            users: result
        });
      }
  })
});

//get encapsulado.
router.use('/profile', express.static('upload'));


/* get only one user*/
router.use(userMiddleware.isLoggedIn);




//upload

const storage = multer.diskStorage({
  destination: './upload',
  filename: (req, file, cb) => {
      return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
  }
})

const upload = multer({
  storage: storage
});

function errHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
      res.status(400).json({
          message: err.message
      })
  }
}





const base = 'https://api.dahora.ao/api/';

router.post('/upload-driver', upload.single('profile'),errHandler, (req, res)=>{
  const {iddriver} = req.userData;  
  
  if(req.file){
    const foto =  `${base}profile/${req.file.filename}`;
      db.query(`UPDATE drivers set photo = ${db.escape(foto)} WHERE iddriver = ${db.escape(iddriver)}`,
      (e, r)=>{
        console.log(e);
        if(r){
          res.status(200).json({profile_url: foto, iddriver});
          console.log(req.file);
        }
      }
      )
      
    }else{
     console.log(req.file, req.body);
    }
});

router.post('/upload-user', upload.single('profile'),errHandler, (req, res)=>{
  const {iduser} = req.userData;  
  
  if(req.file){
    const foto =  `${base}profile/${req.file.filename}`;
      db.query(`UPDATE users set photo = ${db.escape(foto)} WHERE iduser = ${db.escape(iduser)}`,
      (e, r)=>{
        console.log(e);
        if(r){
          res.status(200).json({profile_url: foto, iduser});
          console.log(req.file);
        }
      }
      )
      
    }else{
     console.log(req.file, req.body);
    }
});

router.get('/get-price-service/:id', (req, res)=>{
  const {id} = req.params;
  db.query(`SELECT s.idservice, s.service,c.category, c.initial_price, c.fees_by_3k, c.fees_by_k FROM categories c JOIN services s ON c.idservice = s.idservice 
          WHERE c.idservice = ${db.escape(id)} || s.service =  ${db.escape(id)};
  `, (e, r)=>{
      if(r.length) return res.status(200).send({info:r})
      else return res.status(200).send({msg:'empty...'});
  });
});

router.get('/bring-user', (req, res)=>{
  const {iduser} = req.userData;
  db.query(`SELECT photo, username, iduser, email, phonenumber, player_id FROM users where iduser = ${db.escape(iduser)}
  `, (e, r)=>{
      if(r.length) return res.status(200).send({user:r[0]})
      else return res.status(200).send({msg:'empty...'});
  });
});

router.get('/bring-user/:id', (req, res)=>{
  const {id} = req.params;
  db.query(`SELECT photo, username, iduser, email, phonenumber, player_id FROM users where iduser = ${db.escape(id)}
  `, (e, r)=>{
      if(r.length) return res.status(200).send({user:r[0]})
      else return res.status(204).send({msg:'empty...'});
  });
});



router.get('/bring-driver/:id', (req, res)=>{
  const {id} = req.params;
  db.query(`SELECT photo, username, iddriver, employeeid, email, phonenumber, player_id FROM drivers WHERE iddriver = ${db.escape(id)}
  `, (e, r)=>{
      if(r.length) return res.status(200).send({user:r[0]})
      else return res.status(200).send({msg:'empty...'});
  });
});

router.get('/bring-driver', (req, res)=>{
  const {iddriver} = req.userData;
  db.query(`SELECT photo, username, iddriver, employeeid, email, phonenumber, player_id FROM drivers WHERE iddriver = ${db.escape(iddriver)}
  `, (e, r)=>{
      if(r.length) return res.status(200).send({user:r[0]})
      else return res.status(200).send({msg:'empty...'});
  });
});

router.post('/get-message', (req, res, next)=>{
    const {from, to} = req.body;
    db.query(`SELECT * FROM messages WHERE idfrom = ${from} AND idto = ${to} OR idfrom = ${to} AND idto = ${from}`,(err, messages)=>{
        if(err){
            res.status(401).send({msg:err})
        }else{
            if(messages.length){
                console.log(messages);
                res.status(200).json(messages);
            }else{
              res.status(204).json({msg:'have no message'});
            }
        }
        
    });
   
});


router.post('/get-notification', (req, res, next)=>{
  db.query(`SELECT * FROM notifications`,(err, messages)=>{
      if(err){
          res.status(401).send({msg:err})
      }else{
          if(messages.length){
              res.status(200).json(messages);
          }else{
            res.status(204).json({msg:'have notification'});
          }
      }
      
  });
 
});






router.get('/secret-route', (req, res) => {
  const {username, iduser} = req.userData;
  res.status(200).json({msg: "only logged in users",username: username, iduser: iduser});
});
router.get('/user-logged', (req,res)=>{
   const {iduser} = req.userData;
   db.query(`SELECT * FROM users where iduser = ${db.escape(iduser)} `,
      (err, result)=>{
          if(err){
            return res.status(400).send({
              msg: err
            });
         }else{
           
           return res.status(200).send({
             msg :"sucess",
             user: result[0]
           });
         }
      }
   );
});

//mystaff

router.get('/my-staff', (req, res)=>{
    const {iduser} = req.userData;
    db.query(`SELECT iduser, username, email, fotoname, phonenumber from users 
              WHERE invitationcode = (SELECT codeforinvitation FROM users 
              WHERE iduser = ${db.escape(iduser)});`,
      (err, result)=>{
          if(err) res.status(500).send({err})
          if(result.length){
            let info = [];
            for(let i = 0; i<result.length; i++){
                info.push(result[i]);
            }
            res.status(200).json(info);
          } 
          else res.status(204).send({msg: 'this users does not have staff yet'});
      }
    );
});

//update pass word
router.put('/update-user', (req, res)=>{
    const {iduser, username} = req.userData;
    let {password_repeat, password, oldpass, phonenumber, email} = req.body;
    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1];
    db.query(`SELECT * FROM users WHERE iduser = ${db.escape(iduser)};`,
          (err, result)=>{
              if(err) return res.status(401).send({msg:'user does not exist'});
              else{
                if(result.length){
                  phonenumber = (phonenumber? phonenumber : result[0]['phonenumber']); 
                  email = (email? email : result[0]['email']);
                  bcrypt.compare(oldpass, result[0]['password'], (e, r)=>{
                    if(e) return res.status(401).send({msg:'password does not match', e:e});
                    if(r){
                      if (password_repeat && password){
                        bcrypt.hash(password, 10, (err, hash)=>{
                          if(err) res.status(400).send({msg:err});
                          else{
                              
                              db.query(`SELECT * FROM users where email = lower(${db.escape(req.body.email)})`, (ex, ry)=>{
                                  db.query(`SELECT * FROM users WHERE phonenumber = ${db.escape(req.body.phonenumber)}`, (ex, rx)=>{
                                        if(ry.length && req.body.email.length>1 ) 
                                        res.status(409).send({msg:'email in use'});
                                        else if(rx.length) res.status(409).send({msg:'phonenumber in use'});
                                        else{

                                          db.query(`UPDATE users SET password = ${db.escape(hash)},
                                          phonenumber = ${db.escape(phonenumber)},
                                          email = ${db.escape(email)}
                                          WHERE iduser = ${db.escape(iduser)}`,
                                            (qErr,qResult)=>{
                                              if(qResult) res.status(200).send({
                                                  msg:'user updated',
                                                  token: token,
                                                  user:{
                                                    iduser,
                                                    username,
                                                    email,
                                                    phonenumber,
                                                    photo: result[0]['photo']
                                                  }
                                              });
                                            });


                                        }
                                  });
                                  
                              });
                          }
                        });
                      }else{

                            db.query(`SELECT * FROM users where email = lower(${db.escape(req.body.email)})`, (ex, ry)=>{
                              db.query(`SELECT * FROM users WHERE phonenumber = ${db.escape(req.body.phonenumber)}`, (ex, rx)=>{
                                    if(ry.length && req.body.email.length>1 ) 
                                    res.status(409).send({msg:'email in use'});
                                    else if(rx.length) res.status(409).send({msg:'phonenumber in use'});
                                    else{
                                          db.query(`UPDATE users SET
                                          phonenumber = ${db.escape(phonenumber)},
                                          email = ${db.escape(email)}
                                          WHERE iduser = ${db.escape(iduser)}`,
                                          (qErr,qResult)=>{
                                            if(qResult) res.status(200).send({
                                              msg:'user updated',
                                              token: token,
                                              user:{
                                                iduser,
                                                username,
                                                email,
                                                phonenumber,
                                                photo: result[0]['photo']
                                              }
                                            });
                                          });
                                      
                                    }
                              });
                              
                          });
                  

                        
                      }
                        
                    }else return res.status(401).send({msg:'password does not match'});
                  
                  });

                }
                else return res.status(204).send({msg:'user not found'});
              }
          }
    );

});


router.put('/update-driver', (req, res)=>{
  const {iddriver} = req.userData;
  let {password_repeat, password, oldpass, phonenumber, email} = req.body;
  const authHeader = req.headers.authorization;
  const token = authHeader.split(' ')[1];
  db.query(`SELECT * FROM drivers WHERE iddriver = ${db.escape(iddriver)};`,
        (err, result)=>{
            if(err) return res.status(401).send({msg:'user does not exist'});
            else{
              if(result.length){
                phonenumber = (phonenumber? phonenumber : result[0]['phonenumber']); 
                email = (email? email : result[0]['email']);
                bcrypt.compare(oldpass, result[0]['password'], (e, r)=>{
                  if(e) return res.status(401).send({msg:'password does not match', e:e});
                  if(r){
                    if (password_repeat && password){
                      bcrypt.hash(password, 10, (err, hash)=>{
                        if(err) res.status(400).send({msg:err});
                        else{
                            
                            db.query(`SELECT * FROM drivers where email = lower(${db.escape(req.body.email)})`, (ex, ry)=>{
                                db.query(`SELECT * FROM drivers WHERE phonenumber = ${db.escape(req.body.phonenumber)}`, (ex, rx)=>{
                                      if(ry.length && req.body.email.length>1 ) 
                                      res.status(409).send({msg:'email in use'});
                                      else if(rx.length) res.status(409).send({msg:'phonenumber in use'});
                                      else{

                                        db.query(`UPDATE drivers SET password = ${db.escape(hash)},
                                        phonenumber = ${db.escape(phonenumber)},
                                        email = ${db.escape(email)}
                                        WHERE iddriver = ${db.escape(iddriver)}`,
                                          (qErr,qResult)=>{
                                            if(qResult) res.status(200).send({
                                                msg:'user updated',
                                                token: token,
                                                user:{
                                                  iddriver,
                                                  username: result[0].username,
                                                  email,
                                                  phonenumber,
                                                  photo: result[0]['photo']
                                                }
                                            });
                                          });


                                      }
                                });
                                
                            });
                        }
                      });
                    }else{

                          db.query(`SELECT * FROM drivers where email = lower(${db.escape(req.body.email)})`, (ex, ry)=>{
                            db.query(`SELECT * FROM drivers WHERE phonenumber = ${db.escape(req.body.phonenumber)}`, (ex, rx)=>{
                                  if(ry.length && req.body.email.length>1 ) 
                                  res.status(409).send({msg:'email in use'});
                                  else if(rx.length) res.status(409).send({msg:'phonenumber in use'});
                                  else{
                                        db.query(`UPDATE drivers SET
                                        phonenumber = ${db.escape(phonenumber)},
                                        email = ${db.escape(email)}
                                        WHERE iddriver = ${db.escape(iddriver)}`,
                                        (qErr,qResult)=>{
                                          if(qResult) res.status(200).send({
                                            msg:'user updated',
                                            token: token,
                                            user:{
                                              iddriver,
                                              username:result[0].username,
                                              email,
                                              phonenumber,
                                              photo: result[0]['photo']
                                            }
                                          });
                                        });
                                    
                                  }
                            });
                            
                        });
                

                      
                    }
                      
                  }else return res.status(401).send({msg:'password does not match'});
                
                });

              }
              else return res.status(204).send({msg:'driver not found'});
            }
        }
  );

});



router.post('/reserve', (req,res)=>{
  const {iduser} = req.userData;
  let {reservefrom, reserveto, reservedate, paymethod, passenger, price, 
        expectedduration, distance} = req.body;
        reservefrom = JSON.stringify(reservefrom);
        reserveto = JSON.stringify(reserveto);
  phonenumber = "";
  player_id = req.body.player_id;
  reservecode = "";
  
  db.query(
    `INSERT INTO reserves 
      (iduser, reservefrom, reserveto, reservedate, paymethod, passenger, 
        price, expectedduration, distance)
      VALUES
      (${db.escape(iduser)},${db.escape(reservefrom)},${db.escape(reserveto)},
      ${db.escape(reservedate)},${db.escape(paymethod)},${db.escape(passenger)}
      ,${db.escape(price)}, ${db.escape(expectedduration)},${db.escape(distance)})      
    `,
    (error, result)=>{
      if(error){
        return res.status(400).send({
          msg: "error",
          error
       });
      }else{
        db.query(`SELECT username,email, phonenumber from users WHERE iduser = ${db.escape(iduser)}`,
          (qErr, qResult) => {
            if (qErr)
              console.log(qErr, iduser);
            else {
              phonenumber = qResult[0]['phonenumber'];
            }
            /*emailMiddleware.sendMessage(qResult[0]['email'],reservecode,
              qResult[0]['username'],
              result[0]['reservefrom'],
              result[0]['reserveto'],result[0]['reservedate'], "RESERVA FEITA"
              ,"feita, obrigado(a) por usar os knossos serviços"
            );*/
          });
        db.query(`select * from reserves where iduser = ${db.escape(iduser)} and idreserve = (select max(idreserve) from reserves where iduser = ${db.escape(iduser)})`,
          (e, r) => {
            if (e)
              res.status(401).send({ msg: e });
            else { 
               res.status(200).send({
                msg: 'Reserve done!',
                date: reservedate,
                from: reservefrom,
                to: reserveto,
                passenger: passenger,
                distance: distance,
                price: price,
                iduser,
                reservecode: r[0]['idreserve'],
                phonenumber,
                player_id
              });  
            }
          });
         
      }
    
    });
 
});



/*historics*/
router.get('/historic-all-reserves', (req, res)=>{
    const {iduser} = req.userData;
    db.query(`select DATE_FORMAT(r.reservedate, '%d-%m-%Y Ás %H:%i') as reservedate,h.idreservein,r.reservefrom, r.reserveto,r.iduser,r.passenger, r.expectedduration, r.price, u.username as client, dr.username as driver, h.status, d.description
    from historics h left join drives d on h.idreservein = d.idreserve
    left join reserves r on  h.idreservein = r.idreserve
    left join users u on r.iduser = u.iduser
    left join drivers dr on d.iddriver = dr.iddriver
    where r.iduser = ${db.escape(iduser)} and d.status_cancel = '2' OR d.status_cancel = '0'
    ORDER BY h.idreservein desc;
    `,
        (error, result)=>{
          if(error){
            return res.status(400).send({
              msg: "error",
              error : err
           });

          }else{
            if(result.length){
              let info =[];
              for(let i = 0; i< result.length; i++){
                result[i]['status'] === '0' ? result[i]['status'] = 'Cancelada' : result[i]['status'] = 'Realizada';
                result[i]['reservefrom'] = JSON.parse(result[i]['reservefrom']);
                result[i]['reserveto'] = JSON.parse(result[i]['reserveto']);
                info.push(result[i]);
              }
            
              return res.status(200).json(info);
              
            }else{
              return res.status(204).send({
                msg: 'this user does not have reserve!',
                iduser
              })
            }  
          }
        }
    );
});

router.get('/historic-canceled-reserves', (req, res)=>{
  const {iduser} = req.userData;

  db.query(
    `SELECT (select JSON_EXTRACT(reserves.reservefrom, '$[0]')) as reservefrom, (select JSON_EXTRACT(reserves.reserveto, '$[0]')) as reserveto, reserves.iduser,
    reserves.passenger, reserves.expectedduration, reserves.price,
    historics.idreservein, historics.status, historics.way
    FROM  historics
    JOIN reserves on reserves.idreserve = historics.idreservein
    WHERE historics.status = ${db.escape('0')} AND reserves.iduser = ${db.escape(iduser)};
    `,
    (error, result)=>{
      if(error){
        return res.status(400).send({
          msg: "error",
          error : err
       });
      }else{
          if(result.length){
            let info =[];
            for(let i = 0; i< result.length; i++){
              result[i]['status'] === '0' ? result[i]['status'] = 'Cancelada' : result[i]['status'] = 'concluído';
              result[i]['reservefrom'] = JSON.parse(result[i]['reservefrom']);
              result[i]['reserveto'] = JSON.parse(result[i]['reserveto']);
              info.push(result[i]);
            }
            return res.status(200).json(info);
          }else{
            return res.status(204).send({
              msg: 'this user does not have canceled reserve!',
              iduser
            })
          }          
      }
    }
  );


});
router.get('/my-reserves', (req, res)=>{
  const {iduser} = req.userData;

  db.query(
    `SELECT * FROM reserves WHERE iduser = ${iduser} AND status = '1' AND reservedate >  date(current_timestamp());
    `,
    (error, result)=>{
      if(error){
        return res.status(400).send({
          msg: "error",
          error : err
       });
      }else{
          if(result.length){
            let info =[];
            for(let i = 0; i< result.length; i++){
              info.push(result[i]);
              result[i]['reservefrom'] = JSON.parse(result[i]['reservefrom']);
              result[i]['reserveto'] = JSON.parse(result[i]['reserveto']);
            }
            return res.status(200).json(info);
          }else{
            return res.status(204).send({
              msg: 'this user does not have reserve!',
              iduser
            })
          }          
      }
    }
  );


});


//player_id_client
router.post('/set-player-id-user', (req, res)=>{
  const {iduser} = req.userData;
  const {player_id} = req.body;
  db.query(`UPDATE users set player_id = ${db.escape(player_id)} WHERE iduser = ${db.escape(iduser)}`, 
  function(err, info){
        if(err) res.status(401).send({msg:err});
        else res.status(200).send({msg:'updated...'})
  });
});
router.get('/historic-done-reserves', (req, res)=>{
  const {iduser} = req.userData;

  db.query(
    `SELECT reserves.reservefrom, reserves.reserveto, reserves.reservedate, reserves.iduser,
    reserves.passenger, reserves.expectedduration, reserves.price,
    historics.idreservein, historics.status, historics.way
    FROM  historics
    JOIN reserves on reserves.idreserve = historics.idreservein
    WHERE historics.status = ${db.escape('2')} AND reserves.iduser = ${db.escape(iduser)};       
    `,
    (error, result)=>{
      if(error){
        return res.status(400).send({
          msg: "error",
          error : err
       });
      }else{
          if(result.length){
            let info =[];
            for(let i = 0; i< result.length; i++){
              result[i]['status'] === '0' ? result[i]['status'] = 'Cancelada' : result[i]['status'] = 'Realizada';
              result[i]['reservefrom'] = JSON.parse(result[i]['reservefrom']);
              result[i]['reserveto'] = JSON.parse(result[i]['reserveto']);
              info.push(result[i]);
            }
            return res.status(200).send({
              info
            });
          }else{
            return res.status(204).send({
              msg: 'this user does not have done reserve!',
              iduser
            })
          }          
      }
    }
  );


});

router.post('/cancel-reserve', (req,res)=>{
  const reservecode = req.body.idreserve;
  const {iduser} = req.userData;
  let email = "";
  db.query(`SELECT * FROM reserves WHERE iduser = ${db.escape(iduser)} AND status = ${db.escape('1')} `, 
  function(err, result){

      if(err){
        console.log(err);
        return res.status(401).send({result});
      }else{
        db.query(`SELECT * FROM users WHERE iduser = ${db.escape(iduser)} `, (e,r)=>{
            
          email = r[0]['email'];
          
          if(result.length){
            /*emailMiddleware.sendMessage(email,reservecode, 
            r[0]['username'],
            result[0]['reservefrom'],
            result[0]['reserveto'],result[0]['reservedate'], "RESERVA CANCELADA"
            ,"cancelada, obrigado(a) por usar os nossos serviços"
            );*/
              db.query(`UPDATE reserves SET status = ${'0'} WHERE idreserve = ${db.escape(reservecode)}`, 
              function(e, r){
                
                return res.status(200).send({
                  msg: 'Reserve canceled!',
                  date: reservedate,
                  from: result[0]['reservefrom'],
                  to: result[0]['reserveto'],
                  passenger: result[0]['passenger'],
                  distance: result[0]['distance'],
                  price: result[0]['price'],
                  iduser,
                  reservecode,
                  phonenumber: r[0]['phonenumber'],
                  email: r[0]['email']
                });

              });    
            
          }else{
            console.log(err);
            return res.status(204).send({msg:'empty...'});
          }

        });
        
      }
  });
});

router.post('/cancel-reserve-retracting', (req,res)=>{
  const reservecode = req.body.idreserve;
  const description = req.body.description;
  const {iduser} = req.userData;
  let email = "";
  //select * from reserves where idreserve = 150 and status = '2';
  db.query(`SELECT * FROM reserves WHERE idreserve = ${db.escape(reservecode)} AND status = ${db.escape('2')} `, 
  function(err, result){

      if(err){
        console.log(err);
        return res.status(401).send({err});
      }else{
       
        db.query(`SELECT * FROM users WHERE iduser = ${db.escape(iduser)} `, (e,r)=>{
            
          email = r[0]['email'];
          
          
          if(result.length){
            emailMiddleware.sendMessage(email,reservecode, 
              r[0]['username'],
              result[0]['reservefrom'],
              result[0]['reserveto'],result[0]['reservedate'], "RESERVA CANCELADA"
              ,"cancelada, obrigado(a) por usar os nossos serviços"
            );
              db.query(`UPDATE drives SET situation = '0', description = ${db.escape(description)}, status_cancel = '2' WHERE idreserve = ${db.escape(reservecode)}`, function(ex, rx){
                if(rx){

                  //----

                  db.query(`SELECT * FROM drives WHERE idreserve = ${db.escape(reservecode)}`,
                (rej, resol)=>{
                  if(resol.length){
                    db.query(`UPDATE drivers set status = ${db.escape('0')} where iddriver = ${db.escape(resol[0]['iddriver'])} `,
                    (errr, rr)=>{
                        if(rr){
                          db.query(`SELECT dr.username,dr.phonenumber, dr.player_id FROM drives d JOIN drivers dr ON dr.iddriver = d.iddriver WHERE d.idreserve = ${db.escape(reservecode)};`,
                          (derr, dr)=>{
                            if(dr){
                              return res.status(200).send({
                                msg: 'Reserve cancelada!',
                                date: result[0]['reservedate'],
                                from: JSON.parse(result[0]['reservefrom']),
                                to: JSON.parse(result[0]['reserveto']),
                                passenger: result[0]['passenger'],
                                distance: result[0]['distance'],
                                price: result[0]['price'],
                                iduser,
                                player_id_client:r[0]['player_id'],
                                player_id_driver:dr[0]['player_id'],
                                driver:dr[0]['username'],
                                reservecode
                              });
                            }
                          });
                          
          

                        }
                    });
                  }
                    //parei aqui 29/12...
                });


                }//end if(rx)
                
                
              });    
            
          }else{
            console.log(err);
            return res.status(204).send({msg:'empty...'});
          }

        });
        
      }
  });
});

router.post('/driver-cancel-reserve-retracting', (req,res)=>{
  const reservecode = req.body.idreserve;
  const description = req.body.description;
  const {iddriver} = req.userData;
  let email = "";
  console.log(iddriver, reservecode);
  //select * from reserves where idreserve = 150 and status = '2';
  db.query(`SELECT * FROM reserves WHERE idreserve = ${db.escape(reservecode)} AND status = ${db.escape('2')} `, 
  function(err, result){

      if(err){
        console.log(err);
        return res.status(401).send({err});
      }else{
        db.query(`SELECT u.player_id, u.username, u.iduser, u.phonenumber FROM reserves as r JOIN users as u ON r.iduser = u.iduser WHERE r.idreserve = ${db.escape(reservecode)}; `, (e,r1)=>{
          if(r1.length){
              db.query(`UPDATE drives SET situation = '0', status = '0', description = ${db.escape(description)}, status_cancel = '1'  WHERE idreserve = ${db.escape(reservecode)}`, function(e, r){
                //console.log(r,e);
                db.query(`SELECT * FROM drives WHERE idreserve = ${db.escape(reservecode)}`,
                (rej, resol)=>{
                  if(resol.length){
                    /*insert values select */
                    db.query(`INSERT INTO reserves (reservedate, passenger, distance, expectedduration, price, iduser, paymethod, reservefrom, reserveto, status) 
                    (select reservedate, passenger, distance, expectedduration, price, iduser, paymethod, reservefrom, reserveto, (select '2') from reserves where idreserve = ${db.escape(reservecode)});`, 
                    (ei, ri)=>{
                      //console.log("ei:"+ei,"ri:"+ri[0]);
                        if(ri){
                          db.query(`select * from reserves where iduser = ${db.escape(result[0].iduser)} and idreserve = (select max(idreserve) from reserves where iduser = ${db.escape(result[0].iduser)})`,
                          (ea, ra)=>{
                            //console.log("ea:"+ea, "ra:"+ra[0]);
                            if(ra){
                              db.query(`UPDATE drivers set status = ${db.escape('0')} where iddriver = ${db.escape(iddriver)} `,
                              (errr, rr)=>{
                                console.log(errr, rr);
                                  if(rr){
                                    
                                    db.query(`SELECT player_id FROM drivers WHERE status_active = '1' AND status = '0' AND iddriver <> ${db.escape(iddriver)};`, 
                                          function(err, info){
                                            let array = [];
                                             if(info.length){
                                                for(let i = 0; i< info.length; i++){
                                                array.push(info[i].player_id);
                                                }
                                                res.status(200).send(
                                                  {msg:'reserva cancelada',reservecode,  
                                                  players_id:array, player_id_client:r1[0].player_id, 
                                                  new_reservecode: ra[0].idreserve,
                                                  date: ra[0].reservedate,
                                                  from: JSON.parse(ra[0].reservefrom),
                                                  to: JSON.parse(ra[0].reserveto),
                                                  passenger:ra[0].passenger,
                                                  distance: ra[0].distance,
                                                  price:ra[0].price,
                                                  iduser:ra[0].iduser,
                                                  phonenumber: r1[0].phonenumber,
                                                  expectedduration:ra[0].expectedduration});
                                              }else{
                                                res.status(203).send(
                                                  {msg:'reserva cancelada, não há motoristas desponíveis',reservecode,  
                                                  players_id:array, player_id_client:r1[0].player_id, 
                                                  new_reservecode: ra[0].idreserve,
                                                  date: ra[0].reservedate,
                                                  from: JSON.parse(ra[0].reservefrom),
                                                  to: JSON.parse(ra[0].reserveto),
                                                  passenger:ra[0].passenger,
                                                  distance: ra[0].distance,
                                                  price:ra[0].price,
                                                  iduser:ra[0].iduser,
                                                  phonenumber: r1[0].phonenumber,
                                                  expectedduration:ra[0].expectedduration});
                                              }
                    
                                      });
                    
          
                                  }
                              });
                            }

                          });
                        }
                    });
                    
                  }
                    //parei aqui 29/12...
                });
                
              });    
            
          }else{
            console.log(err);
            return res.status(204).send({msg:'empty...'});
          }

        });
        
      }
  });
});

//select iddriver,latitude, longitude from drivers where status = '1';

router.get('/drivers-status-busy', (req, res)=>{
  const {iduser} = req.userData;

  db.query(
    `
    SELECT drivers.iddriver,drivers.latitude, drivers.longitude, drivers.status,cars.registrationcar, cars.tradecar, cars.modelcar
    FROM drivers JOIN cars on drivers.iddriver = cars.iddriver WHERE drivers.status ${db.escape('1')};
    `,
    (error, result)=>{
      if(error){
        return res.status(400).send({
          msg: "error",
          error : err
       });
      }else{
          if(result.length){
            let info =[];
            for(let i = 0; i< result.length; i++){
              result[i]['status'] === '0' ? result[i]['status'] = 'Desocupado' : result[i]['status'] = 'Ocupado';
              info.push(result[i]);
            }
            return res.status(200).json(info);
          }else{
            return res.status(204).send({
              msg: 'there is no driver busy!',
              iduser
            })
          }          
      }
    }
  );


});

router.get('/drivers-status-unbusy', (req, res)=>{
  const {iduser} = req.userData;

  db.query(
    `
    SELECT drivers.iddriver,drivers.latitude, drivers.longitude, drivers.status,cars.registrationcar, cars.tradecar, cars.modelcar
    FROM drivers JOIN cars on drivers.iddriver = cars.iddriver WHERE drivers.status ${db.escape('1')} ;
    `,
    (error, result)=>{
      if(error){
        return res.status(400).send({
          msg: "error",
          error : err
       });
      }else{
          if(result.length){
            let info =[];
            for(let i = 0; i< result.length; i++){
              result[i]['status'] === '0' ? result[i]['status'] = 'Desocupado' : result[i]['status'] = 'Ocupado';
              info.push(result[i]);
            }
            return res.status(200).json(info);
          }else{
            return res.status(204).send({
              msg: 'there is no driver unbusy!',
              iduser
            })
          }          
      }
    }
  );


});

//

router.post('/see-driver-position-drive', (req, res)=>{
    const {iddriver} = req.userData; 
    const reservecode = req.body.idreserve;
    db.query(`SELECT drivers.iddriver, drives.idreserve,drivers.latitude, drivers.longitude FROM drives 
    JOIN drivers ON drivers.iddriver = drives.iddriver WHERE drives.idreserve = ${db.escape(reservecode)};`, 
    (err, result)=>{
        if(err){
          res.status(401).send({msg:err});
          return;
        }
        if(result.length) res.status(200).send({msg:result[0]});
        else res.status(204).send({msg:'this users does not have position'})
    });

});
router.post('/driver-set-lat-lon', (req, res)=>{
    const {iddriver} = req.userData;
    const {latitude, longitude} = req.body;
    db.query(`UPDATE drivers set latitude = ${db.escape(latitude)}, longitude = ${db.escape(longitude)} WHERE iddriver = ${db.escape(iddriver)}`, 
    function(err, info){
          if(err) res.status(401).send({msg:err});
          else res.status(200).send({msg:'updated...'})
    });
});

router.post('/driver-set-player-id-driver', (req, res)=>{
  const {iddriver} = req.userData;
  const {player_id} = req.body;
  db.query(`UPDATE drivers set player_id = ${db.escape(player_id)} WHERE iddriver = ${db.escape(iddriver)}`, 
  function(err, info){
        if(err) res.status(401).send({msg:err});
        else res.status(200).send({msg:'updated...'})
  });
});

router.put('/driver-onoff', (req, res)=>{
  const {iddriver} = req.userData;
  const {player_id, value} = req.body;
   
  db.query(`UPDATE drivers set status_active = ${db.escape(value)} WHERE iddriver = ${db.escape(iddriver)}`, 
  function(err, info){
        if(err) res.status(401).send({msg:err});
        else res.status(200).send({msg:'updated...'})
  });
});

router.get('/driver-player-id', (req, res)=>{

  let array = [];

  db.query(`SELECT player_id FROM drivers WHERE status_active = '1' AND status = '0';`, 
  function(err, info){
        if(err) res.status(401).send({msg:err});
          if(info.length){
            for(let i = 0; i< info.length; i++){
              array.push(info[i].player_id);
            }
            res.status(200).send({info:array});
          }else res.status(204).send({msg:'empty'});
          
  });
});

router.put('/finishing-drive', (req,res)=>{
  
  const reservecode = req.body.idreserve;
  let {timestamp, reserveto, distance} = req.body;
  reserveto = JSON.stringify(reserveto);
  let price;
  const {iddriver} = req.userData;
  
    db.query(`SELECT c.idcategory, r. idreserve,c.initial_price, c.fees_by_3k, fees_by_k
    FROM reserves r JOIN categories c ON c.idcategory = r.idcategory
    WHERE r.idreserve = ${db.escape(reservecode)};`, (ex, info)=>{
    
        if(info.length){
            distance = Math.round(distance)
            price = distance > 3 ? (distance-3) * info[0].fees_by_3k + timestamp * info[0].fees_by_k + info[0].initial_price : info[0].initial_price;
            
            db.query(`UPDATE drives SET status = ${db.escape('3')} 
            WHERE idreserve = ${db.escape(reservecode)}`
            , 
            function(e, r){
                  if(e) return res.status(500).send({msg: 'error....'});
                  else{
                    db.query(`UPDATE drivers set status = ${db.escape('0')} where iddriver = ${db.escape(iddriver)} `,
                    (err, rr)=>{
                      console.log(err, rr);
                      if(rr){
                        db.query(`UPDATE reserves SET expectedduration = ${db.escape(timestamp)}, price = ${db.escape(price)}, reserveto = ${db.escape(reserveto)} WHERE idreserve = ${db.escape(reservecode)} `, (ex, rx)=>{
                          if(rx) return res.status(200).send({msg: 'updated....', price, distance, reservecode});
                        });
                      }
                    });
                  }
            });
        }
    });   
         
});



router.get('/get-fees', (req, res)=>{
  db.query(`SELECT s.idservice, s.service,c.category,c.idcategory, c.initial_price, c.fees_by_3k, c.fees_by_k 
            FROM categories c JOIN services s ON c.idservice = s.idservice;
  `, (e, r)=>{
      if(r.length){
        let info =[];
        for(let i = 0; i< r.length; i++){
          info.push(r[i]);
        }
        return res.status(200).json(info);
      }
      else return res.status(200).send({msg:'empty...'});
  });
});

router.get('/drivers-car',(req, res)=>{
  const {iddriver} = req.userData;
  db.query(`SELECT d.username as driver, d.iddriver,d.blocked, d.registered, d.email, d.employeeid, d.phonenumber, d.home,c.tradecar, c.modelcar, c.registrationcar, c.colorcar, c.typeofcar 
            from cars as c join drivers as d on c.iddriver = d.iddriver where d.validate = '1' AND d.iddriver = ${db.escape(iddriver)};
  `, (err, r)=>{
    if(err){
      console.log(err);
      return res.status(400).send({
        msg: "error"
     });
    }else{
      if(r.length){
        let info =[];
        for(let i = 0; i< r.length; i++){
          r[i]['typeofcar'] === '0' ? r[i]['typeofcar'] = 'Empresarial' : r[i]['typeofcar'] = 'Pessoal';
          info.push(r[i]);
        }
        return res.status(200).json(info);
      }else{
        return res.status(204).send({msg:'empty'});
      }         
    }
  });
});


//manual drive
router.put('/finishing-manual-drive', (req,res)=>{
  
  const reservecode = req.body.idreserve;
  let {distance,phonenumber, reserveto,timestamp} = req.body;
  reserveto = JSON.stringify(reserveto);
  let price;
  const {iddriver} = req.userData;

  db.query(`SELECT c.idcategory, r. idreserve,c.initial_price, c.fees_by_3k, fees_by_k
  FROM reserves r JOIN categories c ON c.idcategory = r.idcategory
  WHERE r.idreserve = ${db.escape(reservecode)};`, (ex, info)=>{
          if(info.length){
            distance = Math.round(distance)
            price = distance > 3 ? (distance-3) * info[0].fees_by_3k + timestamp * info[0].fees_by_k + info[0].initial_price : info[0].initial_price;
            
            db.query(`UPDATE drives SET status = ${db.escape('3')} 
            WHERE idreserve = ${db.escape(reservecode)}`
            , 
            function(e, r){
                  if(e) return res.status(500).send({msg: 'error....'});
                  else{
                    db.query(`UPDATE drivers set status = ${db.escape('0')} where iddriver = ${db.escape(iddriver)} `,
                    (err, rr)=>{
                      if(rr){
                        db.query(`UPDATE reserves SET price = ${db.escape(price)}, reserveto = ${db.escape(reserveto)}, expectedduration = ${db.escape(timestamp)}  WHERE idreserve = ${db.escape(reservecode)}`, (ez, rz)=>{
                          if(ez) res.status(401).send({msg:ez});  
                          if(rz){
                              smsMiddleware.sendSMS3(phonenumber, reservecode, price);
                              return res.status(200).send({msg:'finished', price, reservecode, phonenumber, to: JSON.parse(reserveto), distance});
                            }
                        });
                        
                      }
                    });
                  }
            });
        }
  }); 
        
});

router.post('/start-manual-drive', (req, res)=>{
  const{iddriver} = req.userData;
  let iduser = 100;
  let {reservefrom, phonenumber, timeinit, timeout} = req.body;
    
  console.log(req.body);
    reservefrom = JSON.stringify(reservefrom);
    
     db.query(`UPDATE users SET phonenumber = ${db.escape(phonenumber)} WHERE iduser = ${db.escape(iduser)} `,(ex, rx)=>{
      if(ex) res.status(409).send({msg:'error', e: ex});  
      if(rx){

          db.query(
            `INSERT INTO reserves 
              (iduser, status, reservedate, reservefrom, timeinit, timeout)
              VALUES
              (${db.escape(iduser)},${db.escape('2')}, current_timestamp(), ${db.escape(reservefrom)},
              ${db.escape(timeinit)},${db.escape(timeout)}
              )      
            `,
            (error, result)=>{
              if(error){
                return res.status(400).send({
                  msg: "error",
                  error : error
               });
              }else{
                db.query(`SELECT username,email, phonenumber from users WHERE iduser = ${db.escape(iduser)}`,
                  (qErr, qResult) => {
                    if (qErr)
                      console.log(qErr, iduser);
                    else {
                      phonenumber = qResult[0]['phonenumber'];
                    }
                  });
                db.query(`SELECT * FROM reserves WHERE iduser = ${db.escape(iduser)} AND idreserve = (select max(idreserve) from reserves where iduser = ${db.escape(iduser)})`,
                  (e, r) => {
                    if (e)
                      res.status(401).send({ msg: e });
                    else {

                      db.query(`UPDATE drives SET iddriver = ${db.escape(iddriver)}, status = ${db.escape('2')} 
                      WHERE idreserve = ${db.escape(r[0]['idreserve'])}`, (ey, ry)=>{

                      if(ry){
                        res.status(200).send({
                          msg: 'Manual drive done!',
                          iduser,
                          reservecode: r[0]['idreserve'],
                          phonenumber,
                          from: JSON.parse(reservefrom),
                          timeinit,
                          timeout
                        }); 
                      }
                      
                      });
        
                        
                    }
                  });
                 
              }
            
            });


        }//primeiro if

     }); //primeira consulta
  

});

router.post('/confirm-drive', (req, res)=>{
   
  const {iduser} = req.userData;
  let {reservefrom, reserveto, reservedate, paymethod, passenger, price, 
    expectedduration, distance, timeinit, timeout, idcategory} = req.body;
  let phonenumber = "";
  player_id = req.body.player_id;
    

    reservefrom = JSON.stringify(reservefrom);
    reserveto = JSON.stringify(reserveto);
  
  db.query(
    `INSERT INTO reserves 
      (iduser, reservefrom, reserveto, reservedate, paymethod, passenger, price, 
        expectedduration, distance, status, timeinit, timeout, idcategory)
      VALUES
      (${db.escape(iduser)},${db.escape(reservefrom)},${db.escape(reserveto)},
      current_timestamp(),${db.escape(paymethod)},${db.escape(passenger)}
      ,${db.escape(price)}, ${db.escape(expectedduration)},
      ${db.escape(distance)}, ${db.escape('2')},  ${db.escape(timeinit)},  ${db.escape(timeout)},
      ${db.escape(idcategory)} )      
    `,
    (error, result)=>{
      if(error){
        return res.status(400).send({
          msg: "error",
          error : error
       });
      }else{
        db.query(`SELECT username,email, phonenumber from users WHERE iduser = ${db.escape(iduser)}`,
          (qErr, qResult) => {
            if (qErr)
              console.log(qErr, iduser);
            else {
              phonenumber = qResult[0]['phonenumber'];
            }
            /*emailMiddleware.sendMessage(qResult[0]['email'],reservecode,
              qResult[0]['username'],
              result[0]['reservefrom'],
              result[0]['reserveto'],result[0]['reservedate'], "RESERVA FEITA"
              ,"feita, obrigado(a) por usar os knossos serviços"
            );*/
          });
        db.query(`select * from reserves where iduser = ${db.escape(iduser)} and idreserve = (select max(idreserve) from reserves where iduser = ${db.escape(iduser)})`,
          (e, r) => {
            if (e)
              res.status(401).send({ msg: e });
            else {

               res.status(200).send({
                msg: 'Reserve done!',
                date: reservedate,
                from: JSON.parse(reservefrom),
                to: JSON.parse(reserveto),
                passenger,
                distance,
                price,
                iduser,
                reservecode: r[0]['idreserve'],
                phonenumber,
                expectedduration,
                player_id,
                timeinit,
                timeout
              });  
            }
          });
         
      }
    
    });

});

router.post('/drive-in-course', (req,res)=>{

  const reservecode = req.body.idreserve;
  const {timeinit} = req.body;
  const {iddriver} = req.userData;
    db.query(`SELECT * FROM drives WHERE idreserve = ${reservecode}`,
      (err, info)=>{
          if(info.length){             
              db.query(`UPDATE drives SET status = ${db.escape('2')} 
              WHERE idreserve = ${db.escape(reservecode)}`
              , 
              function(e, r){
                    if(e) return res.status(401).send({msg: 'error....'});
                    else{
                      db.query(`UPDATE reserves SET timeinit = ${db.escape(timeinit)} WHERE idreserve = ${db.escape(reservecode)} `, (ex, rx)=>{
                        if(rx) return res.status(200).send({msg: 'updated....', timeinit});
                      });
                      
                    }
              });
          
          }

      });
});

router.post('/driver-drive-count', (req,res)=>{

  const {date} = req.body;
  const {iddriver} = req.userData;
  let data1, data2;
    db.query(`SELECT COUNT(*) AS cancelada FROM historics
              JOIN drives ON drives.idreserve = historics.idreservein
              JOIN reserves ON reserves.idreserve = historics.idreservein
              WHERE reserves.reservedate = ${db.escape(date)} AND drives.iddriver = ${db.escape(iddriver)} AND historics.status = '0';`,
      (err, info1)=>{
          if(info1.length){             
            data1 = (info1[0].cancelada != null ? info1[0].cancelada: info1[0].cancelada = 0);
          }else res.status(204).send({msg:'empty'});

      });
    db.query(`SELECT COUNT(*) AS realizadas FROM historics
              JOIN drives ON drives.idreserve = historics.idreservein
              JOIN reserves ON reserves.idreserve = historics.idreservein
              WHERE reserves.reservedate = ${db.escape(date)} AND drives.iddriver = ${db.escape(iddriver)} AND historics.status = '1';`,
      (err, info2)=>{
          if(info2.length){             
            data2 = (info2[0].realizadas != null ? info2[0].realizadas: info2[0].realizadas = 0);  ;
          }else res.status(204).send({msg:'empty'});
          res.status(200).send({info:{realizadas:data2,canceladas:data1}});
      });

      

      
      //console.log(data1,data2);
});

router.post('/driver-earning-year', (req,res)=>{
  info = [];
  let {date} = req.body;
  date = date.split('-');
  const {iddriver} = req.userData;
  for(let i = 1; i<=12; i++){
    db.query(`SELECT sum(reserves.price) as data FROM historics
    JOIN drives ON drives.idreserve = historics.idreservein
    JOIN reserves ON reserves.idreserve = historics.idreservein
    WHERE MONTH(reserves.reservedate) = MONTH('${date[0]}-${i}-01') 
    AND YEAR(reserves.reservedate) = YEAR('${date[0]}-${i}-01') 
    AND drives.iddriver = ${db.escape(iddriver)} AND historics.status = '1';`,
    (err, info1)=>{
        if(info1.length){ 
          let a = (info1[0].data != null ? info1[0].data : 0);
          info.push(a);
          if(i == 12) res.status(200).send({info});
        }else res.status(204).send({msg:'empty'});

    });
  }
    
});


/*aceitar viagem*/

router.post('/checked-drive-accepted', (req, res, next)=>{
  const {idreserve} = req.body;
  db.query(`select drivers.username, drivers.phonenumber, cars.tradecar, cars.modelcar, 
  cars.colorcar from drives join drivers on drivers.iddriver = drives.iddriver 
  join cars on cars.iddriver = drivers.iddriver WHERE drives.idreserve = ${db.escape(idreserve)};`,(err, info)=>{
      if(err){
          res.status(401).send({msg:err})
      }else{
          if(info.length){
              res.status(200).json(info);
          }else{
            res.status(204).json({msg:'have no message'});
          }
      }
      
  });
 
});
router.post('/drive-retracting', (req, res)=>{
    const reservecode = req.body.idreserve;
    const {iddriver} = req.userData;
    console.log(iddriver, reservecode);

    db.query(`SELECT * FROM drives WHERE idreserve = ${db.escape(reservecode)}`, function(ei, info){
      
      if(info.length){
          if(info[0]['status'] === '0'){
            db.query(`UPDATE drives SET iddriver = ${db.escape(iddriver)}, status = ${db.escape('1')} 
            WHERE idreserve = ${db.escape(reservecode)}`,
            function(e, r){
                if(e) return res.status(401).send({msg: 'error....'});
                else{
                  db.query(`SELECT * FROM drives 
                  JOIN reserves ON reserves.idreserve = drives.idreserve
                  WHERE reserves.idreserve = ${db.escape(reservecode)};`,
                  (er, info)=>{
                      if(er) return res.status(401).send({msg: 'erro....'});
                      if(info.length){
                        db.query(`UPDATE drivers set status = ${db.escape('1')} where iddriver = ${db.escape(iddriver)} `,
                          (errr, rr)=>{
                              if(rr){
                                console.log("actualizou");
                                db.query(`select drivers.username, drivers.phonenumber, cars.tradecar, cars.modelcar, 
                                cars.colorcar from drives join drivers on drivers.iddriver = drives.iddriver 
                                join cars on cars.iddriver = drivers.iddriver WHERE drives.idreserve = ${db.escape(reservecode)};`,(err, info)=>{
                                    if(err){
                                        res.status(401).send({msg:err})
                                    }else{
                                        if(info.length){
                                            console.log(info);
                                            return res.status(200).json(info);
                                        }else{
                                          res.status(202).json({msg:'have no message'});
                                        }
                                    }
                                    
                                });

                              }
                        });
                        //
                      } 
                  });
                  
                }
            });
          }else{
            res.status(202).send({msg:'viagem já aceitada'})
          }
      }else{
        res.status(202).send({msg:'ok'})
      }
    });

    
});


router.post('/driver-statistics',(req, res)=>{
  /*1-dia; 2-mes; 3-ano */
    const {date, option} = req.body;
    const {iddriver} = req.userData;
    console.log(req.body);
    if(option == '1'){
      db.query(`SELECT drivers.username AS drivename,SUM(reserves.price) AS total FROM drives 
      JOIN reserves on reserves.idreserve = drives.idreserve
      JOIN drivers on  drivers.iddriver = drives.iddriver
      WHERE drives.iddriver = ${db.escape(iddriver)} AND drives.status = ${db.escape('3')} AND 
      DATE(reserves.reservedate) = DATE(${db.escape(date)})
      GROUP BY drives.iddriver;`, (e, r)=>{
        if(e) return res.status(401).send({msg:'check the date format and try to insert again'});
        else if(r.length) return res.status(200).send({info:r[0]}); 
        else res.status(202).send({msg:'this user does not have statistic'});
      });
    }else if(option == '2'){
      db.query(`SELECT drivers.username AS drivename,SUM(reserves.price) AS total FROM drives 
      JOIN reserves on reserves.idreserve = drives.idreserve
      JOIN drivers on  drivers.iddriver = drives.iddriver
      WHERE drives.iddriver = ${db.escape(iddriver)} AND drives.status = ${db.escape('3')} AND 
      MONTH(reserves.reservedate) = MONTH(${db.escape(date)})
      AND YEAR(reserves.reservedate) = YEAR(${db.escape(date)})
      GROUP BY drives.iddriver;`, (e, r)=>{
        if(e) return res.status(401).send({msg:'check the date format and try to insert again'});
        else if(r.length) return res.status(200).send({info:r[0]}); 
        else res.status(202).send({msg:'this user does not have statistic'});
      });
    }else{
      db.query(`SELECT drivers.username AS drivename,SUM(reserves.price) AS total FROM drives 
      JOIN reserves on reserves.idreserve = drives.idreserve
      JOIN drivers on  drivers.iddriver = drives.iddriver
      WHERE drives.iddriver = ${db.escape(iddriver)} AND drives.status = ${db.escape('3')} AND 
      YEAR(reserves.reservedate) = YEAR(${db.escape(date)})
      GROUP BY drives.iddriver;`, (e, r)=>{
        if(e) return res.status(401).send({msg:'check the date format and try to insert again'});
        else if(r.length) return res.status(200).send({info:r[0]}); 
        else res.status(202).send({msg:'this user does not have statistic'});
      });
    }
    
});
router.get('/driver-statistics-all',(req, res)=>{
    const {iddriver} = req.userData;
    db.query(`SELECT drivers.username AS drivename,SUM(reserves.price) AS total FROM drives 
      JOIN reserves on reserves.idreserve = drives.idreserve
      JOIN drivers on  drivers.iddriver = drives.iddriver
      WHERE drives.iddriver = ${db.escape(iddriver)} AND drives.status = ${db.escape('3')}
      GROUP BY drives.iddriver;`, (e, info)=>{
        if(e) return res.status(401).send({msg:'check the date format and try to insert again'});
        else if(info.length){

          return res.status(200).json(info[0]);
        }  
        else res.status(204).send({msg:'this user does not have statistic'});
    });
    
});

router.get('/driver-historic-done-reserve', (req, res)=>{
    const {iddriver} = req.userData;
    db.query(`select DATE_FORMAT(r.reservedate, '%d-%m-%Y Ás %H:%i') as reservedate,h.idreservein,r.reservefrom,  r.reserveto,r.iduser,r.passenger as passengers, r.expectedduration, r.price, u.username as passenger, dr.username as driver, h.status, d.description
    from historics h left join drives d on h.idreservein = d.idreserve
    left join reserves r on  h.idreservein = r.idreserve
    left join users u on r.iduser = u.iduser
    left join drivers dr on d.iddriver = dr.iddriver
    where dr.iddriver = ${iddriver} and d.status_cancel = '1' OR d.status_cancel = '0'
    ORDER BY h.idreservein desc;
    ;`, 
    (e, r)=>{
        if(e) return res.status(401).send({msg:`erro${e}`});
        else if(r.length){
          let info =[];
          for(let i =0; i<r.length; i++){
              r[i]['status'] === '0' ? r[i]['status'] = 'Cancelada' : r[i]['status'] = 'Realizada';
              info.push(r[i]); 
          }
            return res.status(200).send({info});
        }else return res.status(204).send({msg:'this user does not have done drives'});
    });
});

router.post('/driver-historic-done-date', (req, res)=>{
  const {iddriver} = req.userData;
  const {date} = req.body;
  db.query(`SELECT historics.idreservein, historics.status, historics.way, reserves.reservedate,reserves.price, reserves.expectedduration, reserves.reservefrom, reserves.reserveto, users.username AS passenger FROM historics
  JOIN drives ON drives.idreserve = historics.idreservein
  JOIN reserves ON reserves.idreserve = historics.idreservein
  JOIN users on users.iduser = reserves.iduser
  WHERE DATE(reserves.reservedate) = DATE(${db.escape(date)}) AND drives.iddriver = ${db.escape(iddriver)}
  ORDER BY historics.idreservein desc;`, 
  (e, r)=>{
      if(e) return res.status(401).send({msg:`erro${e}`});
      else if(r.length){
        let info =[];
        for(let i =0; i<r.length; i++){
            r[i]['reservefrom'] = JSON.parse(r[i]['reservefrom']);
            r[i]['reserveto'] = JSON.parse(r[i]['reserveto']);
            r[i]['status'] === '0' ? r[i]['status'] = 'Cancelada' : r[i]['status'] = 'Realizada';
            info.push(r[i]); 
        }
          return res.status(200).send({info});
      }else return res.status(204).send({msg:'this user does not have done drives'});
  });
});

//exporting module rout
module.exports = router;
//terminei aqui...