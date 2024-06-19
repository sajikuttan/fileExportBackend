const mysql = require('mysql2');
const express = require('express');
const xlsx = require('xlsx');
const config = require('./config');
const multer = require('multer');
const app = express();

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

const connection = mysql.createPool({
    host: "localhost",
    user: "security",
    password: "ZAJEw/_)wX_dFER1",
    database: "securitydb",
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

app.post("/api/upload", upload.single('file'), async (req, res) => {
    
    if (!req.file) {
        return res.status(400).send("No file uploaded.");
    }

    const file = req.file;
    
    const workbook = xlsx.read(file.filename, { type: 'buffer' });
    console.log(workbook.SheetNames)
    const sheetName = workbook.SheetNames[0];
    const worksheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
    const isValid = worksheet.every((row) => row.hasOwnProperty('required_feild'));
    if (!isValid) {
        return res.status(400).send('Invalid data format');
    }

    const insertQuery = "INSERT INTO `securitydb_observations`( `issue_name`, `service_port`, `reported_date`, `observation`, `severity`, `ip_address`, `impact`, `recommendation`, `remidation_team`) VALUES ?";
    const values = worksheet.map(row => [row.issue_name, row.service_port, row.reported_date, row.observation, row.severity, row.ip_address, row.impact, row.recommendation, row.remidation_team]);
    try {
        await connection.promise().beginTransaction();
        await connection.promise().query(insertQuery, [values]);
        await connection.promise().commit();
        res.status(200).send('File uploaded and data inserted successfully');
    } catch (error) {
        await connection.promise().rollback();
        res.status(500).send('Error inserting data.');
    } finally {
        await connection.promise().end();
    }
    res.status(202).json({
        message: "User Created",
    });
});

app.get("/api/getObservations", async (req, res) => {
    try {
        const selectQuery = "SELECT `_id`, `issue_name`, `service_port`, `reported_date`, `observation`, `severity`, `ip_address`, `impact`, `recommendation`, `remidation_team`, `status` FROM `securitydb_observations`";
        const data = await connection.promise().query(selectQuery);
        res.status(200).json({
            observations: data[0],
        });
    } catch (err) {
        res.status(500).json({
            message: "Something went wrong please contact to admin.",
            error: err
        });
    }
});

app.get("/api/getChartData", async (req, res) => {
    try {
        const selectQuery = "SELECT COUNT(_id) as total_count,`issue_name` as name  FROM `securitydb_observations` GROUP BY `issue_name`";
        const data = await connection.promise().query(selectQuery);
        res.status(200).json({
            chartInfo: data[0],
        });
    } catch (err) {
        res.status(500).json({
            message: "Something went wrong please contact to admin.",
            error: err
        });
    }
});


app.listen(5000, () => {
    console.log("Server listening in http://localhost:5000")
})



/*
-- INSERT INTO `securitydb_observations`( `issue_name`, `service_port`, `reported_date`, `observation`, `severity`, `ip_address`, `impact`, `recommendation`, `remidation_team`) VALUES (?,?,?,?,?,?,?,?,?);

-- SELECT `_id`, `issue_name`, `service_port`, `reported_date`, `observation`, `severity`, `ip_address`, `impact`, `recommendation`, `remidation_team` `status` FROM `securitydb_observations`

INSERT INTO `securitydb_observations`( `issue_name`, `service_port`, `reported_date`, `observation`, `severity`, `ip_address`, `impact`, `recommendation`, `remidation_team`) VALUES 
('Test one issue',	'1',	9/20/2023,	'Test one observation',	'Low',	'127.0.0.1',	'Test one impact',	'Test one recomm',	'Application team'),
('Test two issue',	'2',	9/20/2023,	'Test two observation',	'Medium',	'127.0.0.2',	'Test two impact',	'Test two recomm',	'Application team'),
('Test three issue',	'3',	9/20/2023,	'Test three observation',	'High',	'127.0.0.3',	'Test three impact',	'Test three recomm',	'Patch team'),
('Test four issue',	'4',	9/20/2023,	'Test four observation',	'Critical',	'127.0.0.4',	'Test four impact',	'Test four recomm',	'Patch team'),
('Test five issue',	'5',	9/20/2023,	'Test four observation',	'Critical',	'127.0.0.5',	'Test four impact',	'Test four recomm',	'Patch team'),
('Test six issue',	'6',	9/20/2023,	'Test four observation',	'Critical',	'127.0.0.6',	'Test four impact',	'Test four recomm',	'Patch team'),
('Test seven issue',	'7',	9/20/2023,	'Test four observation',	'Critical',	'127.0.0.7',	'Test four impact',	'Test four recomm',	'Patch team'),
('Test eight issue',	'8',	9/20/2023,	'Test four observation',	'Critical',	'127.0.0.8',	'Test four impact',	'Test four recomm',	'Patch team'),
('Test nine issue',	'9',	9/20/2023,	'Test four observation',	'Critical',	'127.0.0.9',	'Test four impact',	'Test four recomm',	'Patch team'),
('Test ten issue',	'10',	9/20/2023,	'Test four observation',	'Critical',	'127.0.0.9',	'Test four impact',	'Test four recomm',	'Patch team'),
('Test one issue',	'11',	9/20/2023,	'Test one observation',	'Low',	'127.0.0.9',	'Test one impact',	'Test one recomm',	'Application team'),
('Test two issue',	'12',	9/20/2023,	'Test two observation',	'Medium',	'127.0.0.9',	'Test two impact',	'Test two recomm',	'Application team'),
('Test three issue',	'13',	9/20/2023,	'Test three observation',	'High',	'127.0.0.9',	'Test three impact',	'Test three recomm',	'Patch team'),

*/


