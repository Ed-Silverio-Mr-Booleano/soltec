// middleware/users.js
const jwt = require('jsonwebtoken');
module.exports = {
    validateRegister: (req, res, next) => {
      // username min length 3
      if (!req.body.username || req.body.username.length < 3) {
        return res.status(400).send({
          msg: 'Please enter a username with min. 3 chars'
        });
      }
  
      // password min 6 chars
      if (!req.body.password || req.body.password.length < 6) {
        return res.status(400).send({
          msg: 'Please enter a password with min. 6 chars'
        });
      }
  
      // password (repeat) does not match
      if (
        !req.body.password_repeat ||
        req.body.password != req.body.password_repeat
      ) {
        return res.status(400).send({
          msg: 'Both passwords must match'
        });
      }
  
      next();
    },
    validatePassword:(req, res, next)=>{
      if (!req.body.password || req.body.password.length < 6) {
        return res.status(400).send({
          msg: 'Please enter a password with min. 6 chars'
        });
      }
  
      // password (repeat) does not match
      if (
        !req.body.password_repeat ||
        req.body.password != req.body.password_repeat
      ) {
        return res.status(400).send({
          msg: 'Both passwords must match'
        });
      }
  
      next();
    },
    isLoggedIn: (req, res, next) => {
      
      const authHeader = req.headers.authorization;

      if(!authHeader){
        return res.status(401).json({error:'Token not provide'})
      }
      //console.log("header:::",authHeader);
      
      const token = authHeader.split(' ')[1]; //req.headers.authorization.split(' ')[1];
      //console.log(token);
      
      try {
        
        const decoded = jwt.verify(
          token,
          'SECRETKEY'
        );
        req.userData = decoded;
        next();
      } catch (err) {
        //console.log(err);
        return res.status(401).send({
          error: 'Token invalid'
        });
      }
      
    },
    checkUserIdExist:(req, res, next)=>{
        const id = req.params.id;
    }
    
  };