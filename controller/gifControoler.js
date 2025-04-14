import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import GIFEncoder from 'gifencoder';
import { createCanvas, loadImage } from 'canvas';
import gifCollection from '../DbSchema/ImgSchema.js';
import connectDb from '../dataBase/connectDb.js';

const width = 400;
const height = 400;

export const gifController = async (req, res) => {
  const imagesBaseDir = path.resolve('./images');
  const outputDir = path.resolve('./output');

  // Create output dir if not exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  async function convertImageToBase64(gifPath) {
    const data = await fsp.readFile(gifPath);
    let base64Image = Buffer.from(data, 'binary').toString('base64');
    //console.log(base64Image);
    const ImgData = await gifCollection.create({
      gifData: base64Image
    })
    if (!ImgData) {
      console.error("crypt giff data");
    }
  };


  const folders = fs.readdirSync(imagesBaseDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const folder of folders) {
    const folderPath = path.join(imagesBaseDir, folder);
    var outputGifPath = path.join(outputDir, `${folder}.gif`);

    console.log(`gif is ::`, outputGifPath)

    if (fs.existsSync(outputGifPath)) {
      console.log(`GIF for folder ${folder} already exists. Skipping.`);
      continue;
    }

    const files = fs.readdirSync(folderPath).filter(f => /\.(jpe?g|png)$/i.test(f));
    if (files.length === 0) {
      console.log(`No image files found in folder ${folder}. Skipping.`);
      continue;
    }
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const encoder = new GIFEncoder(width, height);

    const gifWriteStream = fs.createWriteStream(outputGifPath)
    encoder.createReadStream().pipe(gifWriteStream);
    const streamPromise = new Promise((resolve, reject) => {
      gifWriteStream.on('finish', resolve);
      gifWriteStream.on('error', reject);
    });
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(100);
    encoder.setQuality(10);

    for (const file of files) {
      const imgPath = path.join(folderPath, file);
      const image = await loadImage(imgPath);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, width, height);
      encoder.addFrame(ctx);
      //console.log(image)
    }
    encoder.finish();
    await streamPromise;

    console.log(`GIF created for folder ${folder}`);



    console.log('gif stored in dB')
    await convertImageToBase64(outputGifPath);
  }

  console.log(' All GIFs generated!');



  

}
/*export const getGifData = (req,res) => {
    const data = await gifCollection.find
} */
export default gifController