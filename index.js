require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { json, urlencoded } = require('body-parser');
const { extname } = require('path');

const package = require('./package.json');
const { registerSocket, main } = require('./app');

const ROUTES = {
    OUTPUT_FILES: '/output',
    APP: '/app',
    ROOT: '/',
    UPLOAD: '/articles'
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads')
    },
    filename: (req, file, cb) => {
        const extension = extname(file.originalname);
        cb(null, file.fieldname + '-' + Date.now() + extension)
    }
});

const upload = multer({ storage });
const app = express();

app.use(json());
app.use(urlencoded({ extended: true }));
app.use(ROUTES.OUTPUT_FILES, express.static('./output'));
app.use(ROUTES.APP, express.static('./html'));

const server = app.listen(Number(process.env.PORT) || 3000, () => {
    console.log(`Listening on port: ${Number(process.env.PORT)}`);
});

const io = require('socket.io')(server);
registerSocket(io.sockets);

app.get(ROUTES.ROOT, (req, res) => {
    res.send({
        name: package.name,
        version: package.version,
        description: package.description
    });
});

app.post(ROUTES.UPLOAD, upload.array('articleFile', 5), async (req, res) => {
    try {
        const filesCount = req.files.length;

        if (filesCount > 1) {
            res.status = 400;
            res.send({
                error: 'Not more than one file please.',
                filesCount
            });
        }

        const file = req.files[0];

        const outputFile = await main(file.path);
        res.send({ outputFile });
    } catch (err) {
        res.status = 500;
        res.send({
            error: err.message,
            stack: err.stack
        });
    }
});