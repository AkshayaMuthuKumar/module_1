const express = require('express');
const axios = require('axios');
const mysql = require('mysql');
const app = express();
const port = 3000;

const apiUrl = 'https://api.vamosys.com/mobile/getGrpDataForTrustedClients?providerName=CALYX&fcode=SPVAMO';


const db = mysql.createPool({
  host: 'fivewhyrds.ctxjvxl0k0dq.us-east-1.rds.amazonaws.com',
  user: 'fivewhyadmin',
  password: 'Yayaya#143',
  database: '5ydatabase',
});

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS VehicleInfo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    VehicleNo VARCHAR(255) NOT NULL,
    Lastseen TIMESTAMP,
    odoDistance DECIMAL(10,2),
    ignitionStatus VARCHAR(255),
    powerStatus VARCHAR(255),
    deviceStatus DECIMAL(10,2),
    distanceCovered DECIMAL(10,2),
    topSpeed DECIMAL(10,2),
    speed INT,
    direction VARCHAR(255)
  )`;

db.getConnection((connectionError, connection) => {
  if (connectionError) {
    console.error('Database connection failed: ' + connectionError.stack);
    return;
  }

  connection.query(createTableQuery, (err) => {
    connection.release();

    if (err) {
      console.error('Error creating the table: ' + err);
    } else {
      console.log('Table created successfully');
    }
  });
});

app.get('/VehicleInfo', (req, res) => {
  axios.get(apiUrl)
    .then((response) => {
      const VehicleInfo = response.data;

      let queriesToExecute = VehicleInfo.length;

      db.getConnection((connectionError, connection) => {
        if (connectionError) {
          console.error('Database connection failed: ' + connectionError.stack);
          return res.status(500).json({ error: 'Database connection failed' });
        }

        for (const item of VehicleInfo) {
          const checkQuery = 'SELECT id FROM VehicleInfo WHERE id = ?';

          connection.query(checkQuery, [item.rowId], (err, results) => {
            if (err) {
              console.error('Error checking data: ' + err);
            } else if (results.length === 0) {
              const insertQuery = `INSERT INTO VehicleInfo (id, VehicleNo, Lastseen, odoDistance, ignitionStatus, powerStatus, deviceStatus, distanceCovered, topSpeed, speed, direction) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

              const values = [
                item.rowId,
                item.shortName,
                item.lastSeen,
                item.odoDistance,
                item.ignitionStatus,
                item.powerStatus,
                item.deviceStatus,
                item.distanceCovered,
                item.topSpeed,
                item.speed,
                item.direction,
              ];

              connection.query(insertQuery, values, (err) => {
                if (err) {
                  console.error('Error inserting data: ' + err);
                } else {
                  queriesToExecute--;
                  if (queriesToExecute === 0) {
                    connection.release();
                    fetchAndSendData(res);
                  }
                }
              });
            } else {
              const updateQuery = `UPDATE VehicleInfo SET VehicleNo=?, Lastseen=?, odoDistance=?, ignitionStatus=?, powerStatus=?, deviceStatus=?, distanceCovered=?, topSpeed=?, speed=?, direction=? WHERE id=?`;

              const updateValues = [
                item.shortName,
                item.lastSeen,
                item.odoDistance,
                item.ignitionStatus,
                item.powerStatus,
                item.deviceStatus,
                item.distanceCovered,
                item.topSpeed,
                item.speed,
                item.direction,
                item.rowId,
              ];

              connection.query(updateQuery, updateValues, (err) => {
                if (err) {
                  console.error('Error updating data: ' + err);
                } else {
                  queriesToExecute--;
                  if (queriesToExecute === 0) {
                    connection.release();
                    fetchAndSendData(res);
                  }
                }
              });
            }
          });
        }
      });
    })
    .catch((error) => {
      console.error('Error fetching data from the API: ' + error);
      res.status(500).json({ error: 'Error fetching data from the API' });
    });
});

function fetchAndSendData(res) {
  db.getConnection((connectionError, connection) => {
    if (connectionError) {
      console.error('Database connection failed: ' + connectionError.stack);
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const selectQuery = 'SELECT * FROM VehicleInfo';

    connection.query(selectQuery, (err, results) => {
      if (err) {
        console.error('Error fetching data from the database: ' + err);
        res.status(500).json({ error: 'Error fetching data from the database' });
      } else {
        connection.release();
        res.json(results);
      }
    });
  });
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
