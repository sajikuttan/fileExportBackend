
const express = require('express');
const xlsx = require('xlsx');
const multer = require('multer');
const db = require('./connection.js');
const fs = require('fs');
const app = express();

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    },
});

const upload = multer({ storage });
const BATCH_SIZE = 1000; // Number of records per batch

const changeDateFormat = (date) => {
    const excelEpoch = new Date(1899, 11, 30); // Excel's epoch date is 30th Dec 1899
    const newDate = new Date(excelEpoch.getTime() + date * 86400000);
    return newDate;
}

app.post("/api/upload", upload.single('file'), async (req, res) => {

    if (!req.file) {
        return res.status(400).send("No file uploaded.");
    }

    const file = req.file;

    const workbook = xlsx.readFile(file.path);

    const sheetName = workbook.SheetNames[0];
    const worksheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
    const excelHeaders = Object.keys(worksheet[0]);
    const validColumns = ['issue_name', 'service_port', 'reported_date', 'observation', 'severity', 'ip_address', 'impact', 'recommendation', 'remidation_team'];
    if(excelHeaders.length !== validColumns.length) {
        res.status(200).send("Excel columns are less compare to database columns");
        return;
    }
    const isValidColumns = excelHeaders.every(header => validColumns.includes(header));
    
    if (!isValidColumns) {
        res.status(200).send("Excel column names do not match database columns");
        return;
    }
    const insertQuery = "INSERT INTO securitydb_observations( issue_name, service_port, reported_date, observation, severity, ip_address, impact, recommendation, remidation_team) VALUES ?";

    const values = worksheet.map(row => [
        row.issue_name,
        row.service_port,
        changeDateFormat(row.reported_date),
        row.observation,
        row.severity,
        row.ip_address,
        row.impact,
        row.recommendation,
        row.remidation_team
    ]);
    try {
        for (let i = 0; i < values.length; i += BATCH_SIZE) {
            const batch = values.slice(i, i + BATCH_SIZE);
            await new Promise((resolve, reject) => {
                db.query(insertQuery, [batch], (err, result) => {
                    if (err) {
                        console.error('Error inserting data:', err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        }
        res.status(200).send('File uploaded and data inserted successfully');
    } catch (error) {
        console.log(error);
        res.status(500).send('Error inserting data.');
    } finally {
        fs.unlink(file.path, (err) => {
            if (err) {
                res.status(500).send('Error deleting file.');
            }
        })
    }
});

app.get("/api/getObservations", async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    try {
        const selectQuery = "SELECT `_id`, `issue_name`, `service_port`, `reported_date`, `observation`, `severity`, `ip_address`, `impact`, `recommendation`, `remidation_team`, `status` FROM `securitydb_observations` LIMIT ? OFFSET ?";
        const data = await db.promise().query(selectQuery, [pageSize, offset]);
        const [[{ total }]] = await db.promise().query('SELECT FOUND_ROWS() AS total');
        res.status(200).json({
            observations: data[0],
            total,
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        });
    } catch (err) {
        res.status(500).json({
            message: "Something went wrong please contact to admin.",
            error: err
        });
    } finally {
        // await connection.promise().end();
    }
});

app.get("/api/getChartData", async (req, res) => {
    try {
        const selectQuery = "SELECT COUNT(_id) as total_count,`issue_name` as name  FROM `securitydb_observations` GROUP BY `issue_name`";
        await db.promise().connect();
        const data = await db.promise().query(selectQuery);
        res.status(200).json({
            chartInfo: data[0],
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Something went wrong please contact to admin.",
            error: err
        });
    } finally {
        // await connection.promise().end();
    }
});

app.get('/api/export', async (req, res) => {
    const filePath = './uploads/testing.xlsx';
    const workbook = xlsx.utils.book_new();

    try {
        let offset = 0;
        let data = [];

        do {
            data = await new Promise((resolve, reject) => {
                db.query("SELECT issue_name, service_port, reported_date, observation, severity, ip_address, impact, recommendation, remidation_team FROM securitydb_observations LIMIT ? OFFSET ?", [BATCH_SIZE, offset], (err, results) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(results);
                });
            });

            if (data.length > 0) {
                const worksheet = xlsx.utils.json_to_sheet(data);
                xlsx.utils.book_append_sheet(workbook, worksheet, `Batch_${offset / BATCH_SIZE + 1}`);
                offset += BATCH_SIZE;
            }
        } while (data.length === BATCH_SIZE);

        xlsx.writeFile(workbook, filePath);

        res.download(filePath, 'Report.xlsx', (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).send('Error sending file.');
            } else {
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error('Error deleting file:', err);
                    }
                });
            }
        });
    } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).send('Error exporting data.');
    }
});




app.listen(5000, () => {
    console.log("Server listening in http://localhost:5000")
});