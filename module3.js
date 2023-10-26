const express = require('express');
const mysql = require('mysql');
const app = express();
const port = 3500;
const axios = require('axios');

const apiUrl = 'https://api.vamosys.com/mobile/getGrpDataForTrustedClients?providerName=CALYX&fcode=SPVAMO';

const db = mysql.createPool({
  host: 'fivewhyrds.ctxjvxl0k0dq.us-east-1.rds.amazonaws.com',
  user: 'fivewhyadmin',
  password: 'Yayaya#143',
  database: '5ydatabase',
});

const createTableQuery = `
CREATE TABLE IF NOT EXISTS Fueldata (
  id INT PRIMARY KEY,
  organization_name VARCHAR(255),
  vehicle_name VARCHAR(255),
  vehicle_mode VARCHAR(255),
  vehicle_model VARCHAR(255),
  sensor VARCHAR(255),
  start_fuel FLOAT,
  end_fuel FLOAT,
  fuel_filling FLOAT,
  fuel_theft FLOAT,
  fuel_consumption FLOAT,
  start_kms FLOAT,
  end_kms FLOAT,
  distance_travelled FLOAT,
  kmpl FLOAT,
  running_hours FLOAT,
  engine_on_hours FLOAT,
  secondary_engine_hours FLOAT,
  engine_idle_hours FLOAT,
  liters_per_hour FLOAT,
  start_location VARCHAR(255),
  end_location VARCHAR(255),
  driver_name VARCHAR(255),
  driver_mobile_number VARCHAR(255),
  remarks TEXT
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

app.get('/fuelData', (req, res) => {
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
          const checkQuery = 'SELECT id FROM Fueldata WHERE id = ?';

          connection.query(checkQuery, [item.rowId], (err, results) => {
            if (err) {
              console.error('Error checking data: ' + err);
            } else if (results.length === 0) {
              const end_fuel = '200';
              const fuel_filling = '600';
              const fuel_theft  = '0';
              const fuel_consumption = item.fuelLitre + parseFloat(fuel_filling) - parseFloat(end_fuel);
              const end_kms = '6000';
              const distance_travelled = parseFloat(item.odoDistance) - parseFloat(end_kms);
              const kmpl = distance_travelled / fuel_consumption;
              const liters_per_hour = '25';

              const values = [
                item.rowId, 
                item.orgId, 
                item.shortName, 
                item.vehicleMode, 
                item.vehicleModel, 
                item.sensorBasedVehicleMode[0].sensor, 
                item.fuelLitre, 
                parseFloat(end_fuel), 
                parseFloat(fuel_filling), 
                parseFloat(fuel_theft), 
                parseFloat(fuel_consumption), 
                item.odoDistance, 
                parseFloat(end_kms), 
                parseFloat(distance_travelled), 
                parseFloat(kmpl), 
                item.totalWorkingHours, 
                item.totalWorkingHours, 
                item.secondaryEngineHours, 
                item.idleTime, 
                parseFloat(liters_per_hour), 
                item.address, 
                item.alert, 
                item.driverName, 
                item.driverMobile, 
                item.alert
              ];

              const insertQuery = 'INSERT INTO Fueldata (id, organization_name, vehicle_name, vehicle_mode, vehicle_model, sensor, start_fuel, end_fuel, fuel_filling, fuel_theft, fuel_consumption, start_kms, end_kms, distance_travelled, kmpl, running_hours, engine_on_hours, secondary_engine_hours, engine_idle_hours, liters_per_hour, start_location, end_location, driver_name, driver_mobile_number, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

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
              const updateQuery = 'UPDATE Fueldata SET organization_name = ?, vehicle_name = ?, vehicle_mode = ?, vehicle_model = ?, sensor = ?, start_fuel = ?, end_fuel = ?, fuel_filling = ?, fuel_theft = ?, fuel_consumption = ?, start_kms = ?, end_kms = ?, distance_travelled = ?, kmpl = ?, running_hours = ?, engine_on_hours = ?, secondary_engine_hours = ?, engine_idle_hours = ?, liters_per_hour = ?, start_location = ?, end_location = ?, driver_name = ?, driver_mobile_number = ?, remarks = ? WHERE id = ?';

              const updateValues = [
                item.orgId, 
                item.shortName, 
                item.vehicleMode, 
                item.vehicleModel, 
                item.sensorBasedVehicleMode[0].sensor, 
                item.fuelLitre, 
                parseFloat(end_fuel), 
                parseFloat(fuel_filling), 
                parseFloat(fuel_theft), 
                parseFloat(fuel_consumption), 
                item.odoDistance, 
                parseFloat(end_kms), 
                parseFloat(distance_travelled), 
                parseFloat(kmpl), 
                item.totalWorkingHours, 
                item.totalWorkingHours, 
                item.secondaryEngineHours, 
                item.idleTime, 
                parseFloat(liters_per_hour), 
                item.address, 
                item.alert, 
                item.driverName, 
                item.driverMobile, 
                item.alert,
                item.rowId
              ];

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

    const selectQuery = 'SELECT * FROM Fueldata';

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
