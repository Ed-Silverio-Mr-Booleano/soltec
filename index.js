// index.js
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./libs/db.js');


const http = require('http').createServer(app);
const io = require('socket.io')(http,{
    cors: {
        origin : '*',
    }
}); 


// set up port
const PORT = 8082; //process.env.PORT || 3000;

app.use('/api',(req, res, next) => {
	//Qual site tem permissão de realizar a conexão, no exemplo abaixo está o "*" indicando que qualquer site pode fazer a conexão
    res.header("Access-Control-Allow-Origin", "*");
	//Quais são os métodos que a conexão pode realizar na API
    res.header("Access-Control-Allow-Methods", 'GET,PUT,POST,DELETE');
    res.header("Access-Control-Allow-Origin", "*");
    //res.header("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
    app.use(cors());
    next();
});

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// add routes
const router = require('./routes/router.js');

app.use('/api', router);
// run server app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));

/*let messages =[];
let users = [];
    io.on('connection', (socket) =>{
        console.log(`Socket conectado ${socket.id}`);
        
        router.get('/get-message', (req, res, next)=>{
            res.status(200).send(messages);
        });

        socket.on('sendMessage', data =>{
    
            //socket.emit('previousMessage', messages);
            messages.push(data);
            socket.broadcast.emit('receiveMessage', data);

            console.log(data);
    
        });
        socket.on('typing', (data)=>{
            socket.broadcast.emit('typing', data);
        });
    });
*/   

//novo teste;


var users = [];
 
io.on('connection', function (socket) {
    console.log('User connected', socket.id);
 
    // attach incoming listener for new user
    socket.on('user_connected', function (user) {
        // save in array
        users[user] = socket.id;
        // socket ID will be used to send message to individual person
 
        // notify all connected clients
        io.emit('user_connected', user);
        console.log(users);
    });
    socket.on('send_message', function (data) {
        // send event to receiver
        let socketId = users[data.to];
        console.log(users);
    
        io.to(socketId).emit('new_message', data);

        db.query(`INSERT INTO messages (message, idfrom, idto) VALUES (${db.escape(data.message)}, 
            ${db.escape(data.from)}, ${db.escape(data.to)})`, function(err, res){
                if(err) console.log(err);
        });
    });
    socket.on('typing', function(user){
        let socketId = users[user];
        //io.to(to).emit('typing', user);
        socket.broadcast.emit('typing', user);
        console.log(user);
    });
    socket.on('notification', function(data){
        let socketId = users[data.user];
        socket.broadcast.emit('notification', data.notify);
    });
});

/*router.post('/get-message', (req, res, next)=>{
    const {from, to} = req.body;
    console.log(req.body);
    db.query(`SELECT * FROM messages WHERE idfrom = ${from} AND idto = ${to} OR idfrom = ${to} AND idto = ${from}`,(err, messages)=>{
        if(err){
            res.status(401).send({msg:err})
        }else{
            if(messages.length){
                console.log(messages);
                res.status(200).json(messages);
            }
        }
        
    });
   
});*/
//terminei aqui!!