// routes/router.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
//const uuid = require('uuid');
const jwt = require('jsonwebtoken');

const db = require('../libs/db.js');
const userMiddleware = require('../middleware/users.js');
const emailMiddleware = require('../middleware/email.js');
const email = require('../middleware/email.js');
const { random } = require('../middleware/email.js');
// routes/router.js

//socket.io


router.post('/sign-up',userMiddleware.validateRegister, (req, res) => {
    db.query(
      `SELECT * FROM users WHERE LOWER(email) = LOWER(${db.escape(
        req.body.email
      )});`,
      (err, result) => {
        if (result.length) {
          return res.status(409).send({
            msg: 'This email is already in use!'
          });
        } else {
          // username is available
          bcrypt.hash(req.body.password, 10, (err, hash) => {
            if (err) {
              return res.status(500).send({
                msg: err
              });
            } else {
              let cod = emailMiddleware.random();
              emailMiddleware.sendEmail(req.body.email, cod);
              db.query(
                `INSERT INTO users (username, password, registred, email, confirmcode, codeforinvitation) VALUES (${db.escape(
                  req.body.username
                )}, ${db.escape(hash)}, now(), ${db.escape(req.body.email)}, ${db.escape(cod)}, ${db.escape(cod)}  )`,
                (err, result) => {
                  if (err) {
                    throw err;
                    return res.status(400).send({
                      msg: err
                    });
                  }
                  return res.status(201).send({
                    msg: 'Registered!',
                    username : req.body.username
                  });
                }
              );
            }
          });
        }
      }
    );
  });

  router.post('/sign-up-driver', userMiddleware.validateRegister, (req, res) => {
    db.query(
      `SELECT * FROM drivers WHERE LOWER(email) = LOWER(${db.escape(
        req.body.email
      )});`,
      (err, result) => {
        if (result.length) {
          return res.status(409).send({
            msg: 'This email is already in use!'
          });
        } else {
          // username is available
          bcrypt.hash(req.body.password, 10, (err, hash) => {
            if (err) {
              return res.status(500).send({
                msg: err
              });
            } else {
              let cod = emailMiddleware.random();
              //emailMiddleware.sendEmail('info@soltec.ao', cod);
              // has hashed pw => add to database
              db.query(
                `INSERT INTO drivers (username, password, email, employeeid) VALUES (${db.escape(
                  req.body.username
                )}, ${db.escape(hash)}, ${db.escape(req.body.email)}, ${db.escape(cod)})`,
                (err, result) => {
                  if (err) {
                    return res.status(400).send({
                      msg: err
                    });
                  }
                  db.query(`SELECT * FROM drivers WHERE email = ${db.escape(req.body.email)};`, (e, row)=>{
                        if(row.length){
                          db.query(`INSERT INTO cars (iddriver, typeofcar, tradecar, colorcar, registrationcar, modelcar)
                          VALUES (${db.escape(row[0].iddriver)}, ${db.escape(req.body.typeofcar)},
                          ${db.escape(req.body.tradecar)},${db.escape(req.body.colorcar)}, 
                          ${db.escape(req.body.registrationcar)},${db.escape(req.body.modelcar)}
                          )
                          `, (dErr, dRes)=>{
                              if(dErr) return res.status(500).send({msg:dErr});
                              return res.status(201).send({
                                msg: 'Registered!',
                                username : req.body.username
                              });
                          });
                        }
                  });
                  //return OK
                }
              );
            }
          });
        }
      }
    );
  });


router.post('/confirm-sign-up', (req,res) =>{
  const confirmCode = req.body.confirmcode;
  db.query(`SELECT * FROM users WHERE confirmcode = ${db.escape(confirmCode)}`, function(err, result){

      if(err){
        return res.status(401).send({err});
      }else{
        if(confirmCode){
          if(result[0].validate === '0'){
             //console.log(result[0].validate);
             db.query(`UPDATE users SET validate = ${'1'}, confirmcode = ${'0'} WHERE iduser = ${db.escape(result[0].iduser)}`, function(e, r){
              return res.status(200).send({msg: 'updated....'});
             });
             
          }else{
            console.log(err);
            return res.status(401).send({msg:'confirm code does not exist'});
          }
        }
      }
  });
});


// routes/router.js

router.post('/login', (req, res) => {
    db.query(
      `SELECT * FROM users WHERE email = ${db.escape(req.body.email)};`,
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
                  expiresIn: '7d'
                }
              );
  
              db.query(
                `UPDATE users SET lastlogin = now() WHERE iduser = '${result[0].iduser}'`
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
          return res.status(401).send({
            msg: 'Invalid login, require validate login'
          });
        }
  
        // check password
        bcrypt.compare(
          password,
          result[0]['password'],
          (bErr, bResult) => {
            // wrong password
            console.log(result);
            if (bErr) {
              return res.status(401).send({
                msg: 'Employee ID or password is incorrect!'
              });
            }
  
            if (bResult) {
              const {iddrive, email} = result[0];
              const token = jwt.sign({
                  email,
                  iddrive
                },
                'SECRETKEY', {
                  expiresIn: '1d'
                }
              );
  
              db.query(
                `UPDATE users SET lastlogin = now() WHERE iduser = '${result[0].iddrive}'`
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
router.put('/admin-validate-drive', (req,res)=>{
  
    const {iddriver} = req.body;
    db.query(`UPDATE drivers SET validate = ${db.escape('1')} 
    WHERE iddrive = ${db.escape(iddriver)}`
    , 
    function(e, r){
          if(e) return res.status(401).send({msg: 'error....'});
          else return res.status(200).send({msg: 'updated....'});
    });    
        
});
router.get('get-fees', (req, res)=>{
    db.query(`SELECT * FROM categorys
              JOIN fees ON fees.idcategory = categorys.idcategory;
    `, (e, r)=>{
        if(r.length) return res.status(200).send({info:r})
    });
});

router.get('/teste', (req, res, next)=>{
  console.log(req.UserData);
  res.send({msg: 'Css'});
});


router.get('/generate-drive-id', (req, res, next)=>{
    let id = emailMiddleware.random();
    res.send({msg:'id driver generated with sucess', id:id});
});

//bring all users
router.get('/users',(req,res)=>{
  db.query(`SELECT username FROM users`, (err, result)=>{
      if(err){
        throw err;
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
/* get only one user*/
router.use(userMiddleware.isLoggedIn);



router.post('/get-message', (req, res, next)=>{
    const {from, to} = req.body;
    console.log(req.body);
    db.query(`SELECT * FROM messages WHERE idfrom = ${from} AND idto = ${to} OR idfrom = ${to} AND idto = ${from}`,(err, messages)=>{
        if(err){
            res.status(401).send({msg:err})
        }else{
            if(messages.length){
                console.log(messages);
                res.status(200).json(messages);
            }else{
              res.status(200).json({msg:'have no message'});
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
            throw err;
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
//update pass word
router.put('/update-user', userMiddleware.validatePassword, (req, res)=>{
    const {iduser, username} = req.userData;
    const {password, oldpass, phonenumber, email} = req.body;

    db.query(`SELECT * FROM users WHERE iduser = ${db.escape(iduser)};`,
          (err, result)=>{
              if(err) return res.status(401).send({msg:'user does not exist'});
              else{
                if(result.length){
                  bcrypt.compare(oldpass, result[0]['password'], (e, r)=>{
                    if(e) return res.status(401).send({msg:'password does not match', e:e});
                    if(r){
                        bcrypt.hash(password, 10, (err, hash)=>{
                            if(err) res.status(400).send({msg:err});
                            else{
                          
                                db.query(`UPDATE users SET password = ${db.escape(hash)}
                                WHERE iduser = ${db.escape(iduser)}`,
                                  (qErr,qResult)=>{
                                    if(qResult) res.status(200).send({
                                        msg :'updated...'
                                    });
                                  }
                                );
                            }
                        });
                    }else return res.status(404).send({msg:'password does not match'});
                  
                  });

                }
                else return res.status(404).send({msg:'user not found'});
              }
          }
    );

});

router.post('/reserve', (req,res)=>{
  const {iduser} = req.userData;
  const {reservefrom, reserveto, reservedate, paymethod, passenger, price, 
        expectedduration, distance} = req.body;
  
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
        throw error;
        return res.status(400).send({
          msg: "error",
          error : err
       });
      }else{
        db.query(`SELECT username,email WHERE iduser = ${db.escape(iduser)}`,
              (qErr,qResult)=>{
                emailMiddleware.sendMessage(qResult[0]['email'],reservecode, 
                  qResult[0]['username'],
                  result[0]['reservefrom'],
                  result[0]['reserveto'],result[0]['reservedate'], "RESERVA FEITA"
                  ,"feita, obrigado(a) por usar os nossos serviços"
                );
              }
        );
          return res.status(200).send({
            msg: 'Reserve done!',
            date: reservedate,
            from: reservefrom,
            to: reserveto,
            latitude: latitude,
            longitude: longitude,
            passenger: passenger,
            distance: distance,
            price: price,
            iduser
          });
      }
    }
  );

  
 
});

router.post('/forget-my-pass-send-code', (req,res)=>{
  const {iduser} = req.userData;
  db.query(`SELECT * from users WHERE  iduser =  ${iduser}`,(qe,qr)=>{
      if(qe) res.status(401).send({msg:'error'});
      if(qr.length){
          let cod = emailMiddleware.random();
          emailMiddleware.sendEmail(qr[0]['email'], cod, 'CÓDIGO DE ALTERAÇÃO DE PASSWORD');
          if(cod){
            db.query(`UPDATE users SET confirmcode = ${db.escape(cod)} WHERE iduser = ${db.escape(iduser)}`, function(e, r){
              if(r) return res.status(200).send({msg: 'updated....'});
            });
          }
          //return res.status(200).send({msg: cod});
      }else res.status(404).send({msg:'users does not found'}); 
  });
});

router.post('/forget-my-pass-change', (req,res)=>{
      const {iduser} = req.userData;
      const {confirmecode,password, password_repeat} = req.body;
      db.query(`SELECT * FROM users WHERE confirmcode = ${db.escape(confirmecode)}`, function(err, result){

        if(err){
          return res.status(401).send({err});
        }else if(result.length){
            bcrypt.hash(password, 10, (err, hash)=>{
                  if(hash){
                    db.query(`UPDATE users SET confirmcode = ${db.escape('0')}, password = ${db.escape(hash)}
                     WHERE iduser = ${db.escape(result[0].iduser)}`, function(e, r){
                      return res.status(200).send({msg: 'updated....'});
                    });
                  }
            });
            
        }else return res.status(404).send({msg:'confirm code does not exist'});
    });
});


router.get('/historic-all-reserves', (req, res)=>{
    const {iduser} = req.userData;
    db.query(`SELECT (select JSON_EXTRACT(reserves.reservefrom, '$[0]')) as reservefrom, (select JSON_EXTRACT(reserves.reserveto, '$[0]')) as reserveto, reserves.reservedate, reserves.iduser,
    reserves.passenger, reserves.expectedduration, reserves.price,
    historics.idreservein, historics.status, historics.way
    FROM  historics
    JOIN reserves on reserves.idreserve = historics.idreservein
    WHERE reserves.iduser = ${db.escape(iduser)};
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
                result[i]['status'] === '0' ? result[i]['status'] = 'Cancelado' : result[i]['status'] = 'Realizado';
                result[i]['reservefrom'] = JSON.parse(result[i]['reservefrom']);
                result[i]['reserveto'] = JSON.parse(result[i]['reserveto']);
                info.push(result[i]);
              }
            
              return res.status(200).json(info);
              
            }else{
              return res.status(404).send({
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
        throw error;
        return res.status(400).send({
          msg: "error",
          error : err
       });
      }else{
          if(result.length){
            let info =[];
            for(let i = 0; i< result.length; i++){
              result[i]['status'] === '0' ? result[i]['status'] = 'cancelado' : result[i]['status'] = 'concluído';
              result[i]['reservefrom'] = JSON.parse(result[i]['reservefrom']);
              result[i]['reserveto'] = JSON.parse(result[i]['reserveto']);
              info.push(result[i]);
            }
            return res.status(200).json(info);
          }else{
            return res.status(404).send({
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
    `SELECT * FROM reserves WHERE iduser = ${iduser} AND status = '1' AND reservedate >  date(now());
    `,
    (error, result)=>{
      if(error){
        throw error;
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
            return res.status(404).send({
              msg: 'this user does not have reserve!',
              iduser
            })
          }          
      }
    }
  );


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
        throw error;
        return res.status(400).send({
          msg: "error",
          error : err
       });
      }else{
          if(result.length){
            let info =[];
            for(let i = 0; i< result.length; i++){
              result[i]['status'] === '0' ? result[i]['status'] = 'cancelado' : result[i]['status'] = 'Realizado';
              result[i]['reservefrom'] = JSON.parse(result[i]['reservefrom']);
              result[i]['reserveto'] = JSON.parse(result[i]['reserveto']);
              info.push(result[i]);
            }
            return res.status(200).send({
              info
            });
          }else{
            return res.status(404).send({
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
  db.query(`SELECT * FROM reserves WHERE iduser = ${db.escape(iduser)} AND status = ${db.escape('1')} `, function(err, result){

      if(err){
        console.log(err);
        return res.status(401).send({result});
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
              db.query(`UPDATE reserves SET status = ${'0'} WHERE idreserve = ${db.escape(reservecode)}`, function(e, r){
                return res.status(200).send({msg: 'updated....'});
              })    
            
          }else{
            console.log(err);
            return res.status(404).send({msg:'empty...'});
          }

        });
        
      }
  });
});

router.post('/cancel-reserve-retracting', (req,res)=>{
  const reservecode = req.body.idreserve;
  const {iduser} = req.userData;
  let email = "";
  db.query(`SELECT * FROM reserves WHERE iduser = ${db.escape(iduser)} AND status = ${db.escape('1')} `, function(err, result){

      if(err){
        console.log(err);
        return res.status(401).send({result});
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
              db.query(`UPDATE drives SET situation = ${'0'} WHERE idreserve = ${db.escape(reservecode)}`, function(e, r){
                return res.status(200).send({msg: 'updated....'});
              })    
            
          }else{
            console.log(err);
            return res.status(404).send({msg:'empty...'});
          }

        });
        
      }
  });
});

router.put('/finishing-drive', (req,res)=>{
  
  const {reservecode} = req.body;
  const {iddriver} = req.userData;
    db.query(`UPDATE drives SET status = ${db.escape('2')} 
    WHERE idreserve = ${db.escape(reservecode)}`
    , 
    function(e, r){
          if(e) return res.status(401).send({msg: 'error....'});
          else return res.status(200).send({msg: 'updated....'});
    });    
        
});

router.post('/confirm-drive', (req, res)=>{
   
  const {iduser} = req.userData;
  const {reservefrom, reserveto, reservedate, paymethod, passenger, price, 
    expectedduration, distance} = req.body;
  
  db.query(
    `INSERT INTO reserves 
      (iduser, reservefrom, reserveto, reservedate, paymethod, passenger, price, 
        expectedduration, distance, status)
      VALUES
      (${db.escape(iduser)},${db.escape(reservefrom)},${db.escape(reserveto)},
      now(),${db.escape(paymethod)},${db.escape(passenger)}
      ,${db.escape(price)}, ${db.escape(expectedduration)},
      ${db.escape(distance)}, ${db.escape('2')})      
    `,
    (error, result)=>{
      if(error){
        throw error;
        return res.status(400).send({
          msg: "error",
          error : err
       });
      }else{
          return res.status(401).send({
            msg: 'Reserve done!',
            date: reservedate,
            form: reservefrom,
            to: reserveto,
            iduser
          });
      }
    }
  );

});

router.post('/drive-in-course', (req,res)=>{

  const reservecode = req.body.idreserve;
  const {iddriver} = req.userData;
    db.query(`UPDATE drives SET status = ${db.escape('1')} 
    WHERE idreserve = ${db.escape(reservecode)}`
    , 
    function(e, r){
          if(e) return res.status(401).send({msg: 'error....'});
          else return res.status(200).send({msg: 'updated....'});
    });


});

router.post('/drive-retracting', (req, res)=>{
    
});

router.get('/driver-statics',(req, res)=>{
  /*1-dia; 2-mes; 3-ano */
    const {date, option} = req.body;
    const {iddriver} = req.userData;
    if(option == '1'){
      db.query(`SELECT drivers.username AS drivename,SUM(reserves.price) AS total FROM drives 
      JOIN reserves on reserves.idreserve = drives.idreserve
      JOIN drivers on  drivers.iddriver = drives.iddriver
      WHERE drives.iddriver = ${db.escape(iduser)} AND drives.status = ${db.escape('2')} AND 
      DATE(reserves.reservedate) = DATE(${db.escape(date)})
      GROUP BY drives.iddriver;`, (e, r)=>{
        if(e) return res.status(401).send({msg:'check the date format and try to insert again'});
        else if(r.length) return res.status(200).send({info:r}); 
        else res.status(404).send({msg:'this user does not have statistic'});
      });
    }else if(option == '2'){
      db.query(`SELECT drivers.username AS drivename,SUM(reserves.price) AS total FROM drives 
      JOIN reserves on reserves.idreserve = drives.idreserve
      JOIN drivers on  drivers.iddriver = drives.iddriver
      WHERE drives.iddriver = ${db.escape(iduser)} AND drives.status = ${db.escape('2')} AND 
      MONTH(reserves.reservedate) = MONTH(${db.escape(date)})
      GROUP BY drives.iddriver;`, (e, r)=>{
        if(e) return res.status(401).send({msg:'check the date format and try to insert again'});
        else if(r.length) return res.status(200).send({info:r}); 
        else res.status(404).send({msg:'this user does not have statistic'});
      });
    }else{
      db.query(`SELECT drivers.username AS drivename,SUM(reserves.price) AS total FROM drives 
      JOIN reserves on reserves.idreserve = drives.idreserve
      JOIN drivers on  drivers.iddriver = drives.iddriver
      WHERE drives.iddriver = ${db.escape(iduser)} AND drives.status = ${db.escape('2')} AND 
      YEAR(reserves.reservedate) = YEAR(${db.escape(date)})
      GROUP BY drives.iddriver;`, (e, r)=>{
        if(e) return res.status(401).send({msg:'check the date format and try to insert again'});
        else if(r.length) return res.status(200).send({info:r}); 
        else res.status(404).send({msg:'this user does not have statistic'});
      });
    }
    
});

router.get('/driver-historic-done-reserve', (req, res)=>{
    const {iddriver} = req.userData;
    db.query(`SELECT drivers.username AS driver,reserves.reservefrom, reserves.reserveto, historics.status, historics.way, users.username AS passanger 
    FROM historics 
    JOIN drives ON drives.idreserve = historics.idreservein
    JOIN drivers ON drivers.iddriver = drives.iddriver
    JOIN reserves ON reserves.idreserve = historics.idreservein
    JOIN users ON users.iduser = reserves.iduser
    WHERE historics.status = ${db.escape('1')} AND drivers.iddriver = ${db.escape(iduser)} ;`, 
    (e, r)=>{
        if(e) return res.status(401).send({msg:`erro${e}`});
        else if(r.length){
          let info =[];
          for(let i =0; i<r.length; i++){
              r[i]['status'] === '0' ? r[i]['status'] = 'cancelado' : r[i]['status'] = 'Realizado';
              info.push(r[i]); 
          }
           return res.status(200).send({info});
        }else return res.status(404).send({msg:'this user does not have done drives'});
    });
});

//exporting module rout
module.exports = router;
//terminei aqui...