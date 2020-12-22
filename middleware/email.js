module.exports = {
    
    sendEmail:(eReceptor, random, subj = 'CÓDIGO DE CONFIRMAÇÃO')=>{

        const nodemailer = require('nodemailer');

        let retorno;
        
        //let random = Math.floor((Math.random()*50000) + 1000);
        let message = `Olá caro passageiro(a)<br>Essa mensagem é para verificação da sua conta, 
        o seu código de verificação é: ${random}
        `;

        console.log(eReceptor, random);
  
        const account = {
            user: 'testesoltec20@gmail.com',
            pass: 'soltec2020'
        };
        
        const transporter = nodemailer.createTransport({
             service: 'gmail',
             auth:{
                 user: account.user,
                 pass: account.pass
             }
        });
        
      const mailOptions = {
          from : account.user,
          to: eReceptor,
          subject: subj,
          html : `<p>${message}</p>` ,
      
      };
  
      transporter.sendMail(mailOptions, function(error, info){
          if(error) console.log(error); //res.status(400).send({msg:"error",error: error});
          else {
            return random;
            //return next();
            //res.status(200).send(email[{msg:'sent', respose: info.response}]);
          }
      });

    },
    random:()=>{
        function getRandomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        let random = getRandomInt(10000,99999);
        return random;
    },
    sendMessage:(eReceptor, reservecode, username, reservefrom, reserveto, date, subject, html)=>{

        const nodemailer = require('nodemailer');

        let retorno;
        
        //let random = Math.floor((Math.random()*50000) + 1000);
        //let message = message;

        console.log(eReceptor);
  
        const account = {
            user: 'testesoltec20@gmail.com',
            pass: 'soltec2020'
        };
        
        const transporter = nodemailer.createTransport({
             service: 'gmail',
             auth:{
                 user: account.user,
                 pass: account.pass
             }
        });
        
      const mailOptions = {
          from : account.user,
          to: eReceptor,
          subject: `[Notificação Dahora], ${subject}`,
          html : `<p>A sua reserva foi ${html}</p>
                <p>ID da Reserva: ${reservecode}</p>
                <p>Nome do passageiro: ${username}</p>
                <p>Data: ${date}</p>
                <p>Origem: ${reservefrom}</p>
                <p>Destino: ${reserveto}</p>
          ` ,
      
      };
  
      transporter.sendMail(mailOptions, function(error, info){
          if(error) console.log(error); //res.status(400).send({msg:"error",error: error});
          else {
            return res.status(200).send(email[{msg:'sent', response: info.response}]);
          }
      });

    }



}