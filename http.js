const http = require('http');
const fs = require('fs');
const path = require('path');

// Helper function to parse multipart form data
const parseMultipartFormData = (req, callback) => {
    const boundary = req.headers['content-type'].split('; ')[1].replace('boundary=', '');
    let data = '';
    let fileData = null;
    let fileName = null;
    let isFile = false;

    req.on('data', chunk => {
        data += chunk.toString();
    });

    req.on('end', () => {
        const parts = data.split(`--${boundary}`);
        parts.pop(); // Remove the last part which is trailing boundary
        
        parts.forEach(part => {
            if (part.includes('Content-Disposition: form-data;')) {
                const [headers, content] = part.split('\r\n\r\n');
                const headerLines = headers.split('\r\n');
                const disposition = headerLines.find(line => line.startsWith('Content-Disposition:'));

                if (disposition && disposition.includes('filename=')) {
                    fileName = disposition.split('filename=')[1].replace(/"/g, '');
                    fileData = Buffer.from(content.split('--')[0], 'binary');
                    isFile = true;
                }
            }
        });

        if (fileData && fileName) {
            callback(fileData, fileName);
        } else {
            callback(null, null);
        }
    });
};

const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.setHeader('Content-Type', 'text/html');
        res.write('<html>');
        res.write('<head><title>File Upload</title></head>');
        res.write('<body>');
        res.write('<form action="/upload" method="post" enctype="multipart/form-data">');
        res.write('<input type="file" name="fileUpload"/>');
        res.write('<input type="submit" value="Upload"/>');
        res.write('</form>');
        res.write('</body>');
        res.write('</html>');
        res.end();
    } else if (req.method === 'POST' && req.url === '/upload') {
        parseMultipartFormData(req, (fileData, fileName) => {
            if (fileData && fileName) {
                const uploadDir = path.join(__dirname, 'uploads');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir);
                }
                const filePath = path.join(uploadDir, fileName);

                fs.writeFile(filePath, fileData, (err) => {
                    if (err) {
                        res.statusCode = 500;
                        res.setHeader('Content-Type', 'text/html');
                        res.end('<html><body><h1>Error saving the file</h1></body></html>');
                        return;
                    }
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/html');
                    res.end(`<html><body><h1>File uploaded successfully!</h1><p>File saved as ${fileName}</p></body></html>`);
                });
            } else {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'text/html');
                res.end('<html><body><h1>No file uploaded</h1></body></html>');
            }
        });
    } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html');
        res.write('<html>');
        res.write('<head><title>404 Not Found</title></head>');
        res.write('<body><h1>Page not found</h1></body>');
        res.write('</html>');
        res.end();
    }
});

server.listen(2000, () => {
    console.log('Server is running on port 2000');
});

