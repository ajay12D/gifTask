import mongoose from "mongoose";


const ImgSchema = new mongoose.Schema({
    gifData: {
      type: String,
      required: true,
    }
},
{
    timestamps: true
});

const gifCollection = mongoose.model("gifCollection", ImgSchema);

export default gifCollection;