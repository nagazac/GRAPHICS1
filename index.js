import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';


const __filename = fileURLToPath(import.meta.url);

// 👇️ "/home/john/Desktop/javascript"
const __dirname = path.dirname(__filename);

const app = express()
const port = 8000

app.use("/src", express.static(__dirname + "/src"));

// serve your textures folder so that GET /textures/wood.jpg resolves
app.use('/textures', express.static(path.join(__dirname, 'textures')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/index.html'));
  })

app.listen(port, () => {
console.log(`Example app listening on port ${port}`)
})  