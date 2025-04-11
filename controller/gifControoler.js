//import { createCanvas } from 'canvas';
import fs from 'fs';
import fsp from 'fs/promises';
import GIFEncoder from 'gifencoder';
import { createCanvas, loadImage} from 'canvas';

 const width = 400;
 const height = 400;
   export const gifController = async (req,res) => {



    let messageId;
    try{
      const content = await fsp.readFile('../last_downloaded.json', 'utf-8');
      messageId = JSON.parse(content).messageId
    }
    catch(err){
        console.log('no message Id found::atachenent is no processed');
        return;
    }

      if(fs.existsSync(`../output/${messageId}.gif`)){
        console.log(' gif is alredy exeist.');
        return;
      }
       const canvas = createCanvas(width, height);

        
       const ctx = canvas.getContext('2d');

       const encoder = new GIFEncoder(width, height);
         

       encoder.createReadStream().pipe(fs.createWriteStream(`../output/${messageId}.gif`));
        
        encoder.start();

        encoder.setRepeat(0);
        encoder.setDelay(100);
        encoder.setQuality(10);

        const imgList = fs.readdirSync('../images');

        imgList.forEach( async (f,i) => {
                const image = await loadImage(`../images/${f}`);

                ctx.drawImage(image, 0,0, image.width, image.height, 0,0, canvas.width, canvas.height);
                  encoder.addFrame(ctx);

                  if(i === imgList.length - 1){
                    encoder.finish();
                   console.log('gif gentated::')
                  }
        })


};


gifController();