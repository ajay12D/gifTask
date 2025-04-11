import express from 'express';
import connectDb from './dataBase/connectDb.js';

const app = express();

app.use(express.json());

const PORT = 3000;


//app.use('/');



app.listen(PORT, connectDb(), (err) => {
    if(err){
        console.error("server is not started",err)
    }
    else{
        console.log(`serving isn listening on ${PORT}`)
    }
})