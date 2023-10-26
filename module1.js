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
  CREATE TABLE IF NOT EXISTS Direction (
    Id INT NOT NULL,
    dir_latitude DECIMAL(9,9),
    dir_longitude DECIMAL(9,9),
    PRIMARY KEY(Id)
  )
`;

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

app.get('/direction', (req, res) => {
  axios.get(apiUrl)
    .then((response) => {
      const apiData = response.data;
      let queriesToExecute = apiData.length;

      db.getConnection((connectionError, connection) => {
        if (connectionError) {
          console.error('Database connection failed: ' + connectionError.stack);
          return res.status(500).json({ error: 'Database connection failed' });
        }

        for (const item of apiData) {
          const checkQuery = 'SELECT Id FROM Direction WHERE Id = ?';

          connection.query(checkQuery, [item.rowId], (err, results) => {
            if (err) {
              console.error('Error checking data: ' + err);
            } else if (results.length === 0) {
              const insertQuery = 'INSERT INTO api_data (Id, dir_latitude, dir_longitude) VALUES (?, ?, ?)';
              const values = [item.rowId, item.latitude, item.longitude];

              connection.query(insertQuery, values, (err) => {
                if (err) {
                  console.error('Error inserting data: ' + err);
                } else {
                  console.log('Data inserted successfully');
                }

                queriesToExecute--;
                if (queriesToExecute === 0) {
                  connection.release(); 
                  fetchAndSendData(res);
                }
              });
            } else {
              const updateQuery = 'UPDATE Direction SET  dir_latitude = ?, dir_longitude = ? WHERE Id = ?';
              const updateValues = [item.latitude, item.longitude, item.rowId];

              connection.query(updateQuery, updateValues, (err) => {
                if (err) {
                  console.error('Error updating data: ' + err);
                } else {
                  console.log('Data updated successfully');
                }

                queriesToExecute--;
                if (queriesToExecute === 0) {
                  connection.release(); 
                  fetchAndSendData(res);
                }
                updateValues.length = 0;
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

    const selectQuery = 'SELECT * FROM Direction';

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
