module.exports = {
    
    random:()=>{
        function getRandomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        let random = getRandomInt(10000,99999);
        return random;
    },
    sendSMS:(phonenumber, random)=>{
        let empire = 'Call Táxi'
        let message = `Seu código de verificação é: ${random}
        `;

        const axios = require('axios');
        const config = {
            headers: {'Content-Type': 'application/json'}
        };
        axios.post(`http://52.30.114.86:8080/mimosms/v1/message/send?token=0b87022483b178a41242f2e6b6521542945989920`
        ,{ sender: 'CallTaxi', recipients:phonenumber, text:message}
         ,config)
        .then(function(response){
            console.log("surviving....");
             console.log(response.data)
        })
        .catch((err) => {
            console.error("ops! ocorreu um erro" + err);
        });

    },
    sendSMS2:(phonenumber, id, pass)=>{
        let empire = 'Call Táxi'
        let message = `Senha: ${pass}, ID-DRIVER: ${id}
        `;

        const axios = require('axios');
        const config = {
            headers: {'Content-Type': 'application/json'}
        };
        axios.post(`http://52.30.114.86:8080/mimosms/v1/message/send?token=0b87022483b178a41242f2e6b6521542945989920`
        ,{ sender: 'CallTaxi', recipients:phonenumber, text:message}
         ,config)
        .then(function(response){
            console.log("surviving....");
             console.log(response.data)
        })
        .catch((err) => {
            console.error("ops! ocorreu um erro" + err);
        });

    },

    sendSMS3:(phonenumber, id, price)=>{
        let empire = 'Call Táxi'
        let message = `Viagem Concluída, Nº Viagem:${id}, Preço: ${price}
        `;

        const axios = require('axios');
        const config = {
            headers: {'Content-Type': 'application/json'}
        };
        axios.post(`http://52.30.114.86:8080/mimosms/v1/message/send?token=0b87022483b178a41242f2e6b6521542945989920`
        ,{ sender: 'CallTaxi', recipients:phonenumber, text:message}
         ,config)
        .then(function(response){
            console.log("surviving....");
             console.log(response.data)
        })
        .catch((err) => {
            console.error("ops! ocorreu um erro" + err);
        });

    }
    


}