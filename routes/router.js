// routes/router.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
//const uuid = require('uuid');
const jwt = require('jsonwebtoken');

const db = require('../libs/db.js');
const userMiddleware = require('../middleware/users.js');
const emailMiddleware = require('../middleware/email.js');
// routes/router.js

//socket.io



router.get('/socket', (req, res, next)=>{
  res.send({msg: '...'});
});




router.post('/sign-up',userMiddleware.validateRegister, (req, res) => {
    db.query(
      `SELECT * FROM users WHERE LOWER(username) = LOWER(${db.escape(
        req.body.username
      )});`,
      (err, result) => {
        if (result.length) {
          return res.status(409).send({
            msg: 'This username is already in use!'
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
              emailMiddleware.sendEmail(req.body.email, cod)
              /*if(!isNaN(email)){
                return res.status(401).send({msg: 'network error, email not send'});
              }*/
              // has hashed pw => add to database
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

router.post('/confirm-sign-up', (req,res)=>{
  const confirmCode = req.body.confirmcode;
  db.query(`SELECT * FROM users WHERE confirmcode = ${db.escape(confirmCode)}`, function(err, result){

      if(err){
        console.log(err);
        return res.status(401).send({result});
      }else{
        if(confirmCode){
          if(result[0].validate === '0'){
             //console.log(result[0].validate);
             db.query(`UPDATE users SET validate = ${'1'}, confirmcode = ${'0'} WHERE iduser = ${db.escape(result[0].iduser)}`, function(e, r){
              return res.status(200).send({msg: 'updated....'});
             })
             
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
      `SELECT * FROM users WHERE username = ${db.escape(req.body.username)};`,
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
            msg: 'Username or password is incorrect!'
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
            console.log(result);
            if (bErr) {
              throw bErr;
              return res.status(401).send({
                msg: 'Username or password is incorrect!'
              });
            }
  
            if (bResult) {
              const {iduser, username} = result[0]
              //console.log(iduser, username);
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
              msg: 'Username or password is incorrect!'
            });
          }
        );
       }
    );
  });


// routes/router.js --testing router

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
  db.query(`SELECT * FROM users`, (err, result)=>{
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

/*router.put('/update-user', (req,res, next)=>{
    const {iduser} = req.userData;
    const {oldpass, password, email, phonenumber, username} = req.body;
    
    db.query(
      `SELECT * FROM users WHERE iduser = ${db.escape(iduser)};`,
      (err, result) => {
        // user does not exists
        if (err) {
          //throw err;
          return res.status(400).send({
            msg: err
          });
        }
        
        bcrypt.compare(
          oldpass,
          result[0]['password'],
          (bErr, bResult) => {
            // wrong password
              if (bErr) {
              //throw bErr;
              console.log(bErr);
              return res.status(401).send({
                msg: 'Password does not match!'
              });
              
            }else if (bResult) {
              bcrypt.hash(password, 10, (err, hash)=>{
                if(err){
                  return res.status(500).send({
                    msg: err
                  });
                }else{
                  db.query(`UPDATE users SET password = ${db.escape(hash)}
                  WHERE iduser = ${db.escape(iduser)}`,
                (err, result)=>{
                   if(err){
                     //throw err;
                     console.log(err);
                     return res.status(400).send({
                        msg: "error",
                        error : err
                     });
                   }else{
                      return res.status(200).send({
                        msg: "updated",
                        data : result[0]
                      });
                   }
                }
                );
              }
              });
                   
            }
            
          }

        );

       }

    );

});*/

router.put('/update-user', (req, res)=>{
    const {iduser, username} = req.userData;
    const {password, oldpass, phonenumber, email} = req.body;

    db.query(`SELECT * FROM users WHERE iduser = ${db.escape(iduser)};`,
          (err, result)=>{
              if(err) return res.status(401).send({msg:'user does not exist'});
              else{
                if(result.length){
                  bcrypt.compare(req.body.oldpass, result[0]['password'], (e, r)=>{
                    if(e) return res.status(401).send({msg:'password does not match', e:e});
                    else{
                        bcrypt.hash(password, 10, (err, hash)=>{
                            if(err) res.status(400).send({msg:err});
                            else{
                                db.query(`UPDATE users SET password = ${db.escape(hash)}
                                WHERE iduser = ${db.escape(iduser)}`,
                                  (qErr,qResult)=>{
                                    if(qResult) res.status(200).send({
                                        msg :'updated'
                                    });
                                  }
                                );
                            }
                        });
                    }
                });
                }
                else return res.status(401).send({msg:'user not found'})
              }
          }
    );

});

router.post('/reserve', (req,res)=>{
  const {iduser} = req.userData;
  const {reservefrom, reserveto, reservedate, paymethod, passenger, price, 
    expectedduration, latitude, longitude, distance} = req.body;
  
  db.query(
    `INSERT INTO reserves 
      (iduser, reservefrom, reserveto, reservedate, paymethod, passenger, price, expectedduration,
        latitude, longitude, distance)
      VALUES
      (${db.escape(iduser)},${db.escape(reservefrom)},${db.escape(reserveto)},
      ${db.escape(reservedate)},${db.escape(paymethod)},${db.escape(passenger)}
      ,${db.escape(price)}, ${db.escape(expectedduration)},${db.escape(latitude)},
      ${db.escape(longitude)}, ${db.escape(distance)})      
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

router.post('/forget-my-pass', (req,res)=>{
  const {iduser} = req.body;

});

router.get('/historic-all-reserve', (req, res)=>{
    const {iduser} = req.userData;
    db.query(`SELECT reserves.reservefrom, reserves.reserveto, reserves.reservedate, reserves.iduser,
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
              console.log(result);
              let info =[];
              for(let i = 0; i< result.length; i++){
                result[i]['status'] === '0' ? result[i]['status'] = 'Cancelado' : result[i]['status'] = 'Realizado';

                info.push(result[i]);
              }
              return res.status(200).send({
                info
              });
            }else{
              return res.status(200).send({
                msg: 'this user doesn´t have reserve!',
                iduser
              })
            }  
          }
        }
    );
});

router.get('/historic-canceled-reserve', (req, res)=>{
  const {iduser} = req.userData;

  db.query(
    `SELECT reserves.reservefrom, reserves.reserveto, reserves.reservedate, reserves.iduser,
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
              info.push(result[i]);
            }
            return res.status(200).send({
              info
            });
          }else{
            return res.status(200).send({
              msg: 'this user doesn´t have canceled reserve!',
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
    `SELECT * FROM reserves WHERE iduser = 6 AND status = '1' AND reservedate >  date(now());
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
              //result[i]['status'] === '0' ? result[i]['status'] = 'cancelado' : result[i]['status'] = 'concluído';
              info.push(result[i]);
            }
            return res.status(200).send({
              info
            });
          }else{
            return res.status(200).send({
              msg: 'this user doesn´t have reserve!',
              iduser
            })
          }          
      }
    }
  );


});
router.get('/historic-done-reserve', (req, res)=>{
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
              result[i]['status'] === '0' ? result[i]['status'] = 'cancelado' : result[i]['status'] = 'concluído';
              info.push(result[i]);
            }
            return res.status(200).send({
              info
            });
          }else{
            return res.status(200).send({
              msg: 'this user doesn´t have done reserve!',
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
            return res.status(401).send({msg:'empty...'});
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
            return res.status(401).send({msg:'empty...'});
          }

        });
        
      }
  });
});

router.put('/finishing-drive', (req,res)=>{
  
  const {reservecode} = req.body;
  const {iduser} = req.userData;
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
    expectedduration, latitude, longitude, distance} = req.body;
  
  db.query(
    `INSERT INTO reserves 
      (iduser, reservefrom, reserveto, reservedate, paymethod, passenger, price, expectedduration,
        latitude, longitude, distance, status)
      VALUES
      (${db.escape(iduser)},${db.escape(reservefrom)},${db.escape(reserveto)},
      now(),${db.escape(paymethod)},${db.escape(passenger)}
      ,${db.escape(price)}, ${db.escape(expectedduration)},${db.escape(latitude)},
      ${db.escape(longitude)}, ${db.escape(distance)}, ${db.escape('2')})      
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
  const {iduser} = req.userData;
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



//exporting module rout
module.exports = router;
//terminei aqui...