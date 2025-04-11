import mongoose from "mongoose";
import dotenv from 'dotenv'
 dotenv.config();

const connectDb = async () => {

    const connection = await mongoose.connect(process.env.MONGO_URI);
            if(connection){
                console.log('connection is establish with dataBase');
            }
            else {
                console.error('connection is not establish with dataBase')
            }

};

export default connectDb;

