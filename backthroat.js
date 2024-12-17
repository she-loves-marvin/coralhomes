const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const { Client } = require('pg'); 
const datetime = require('datetime');

const app = express();
const port = 3000;
app.use(bodyParser.json());
app.use(express.json());
dotenv.config();
const client = new Client({
    user: 'your-username',
    host: 'localhost',           
    database: 'your-database',   
    password: 'your-password',   
    port: 5432,                   
  });



async function apicall(number, amount) {
    try {
      const url = "https://tinypesa.com/api/v1/express/initialize";
      
      const details = {
        amount: amount,
        msisdn: number
      };
  
      const payload = JSON.stringify(details);
      const apikey = process.env.APIKEY;  
  
      const headers = {
        "Content-Type": "application/json",
        "Apikey": apikey
      };
  
      const response = await axios.post(url, payload, { headers });
  
      if (response.status === 200) {
        console.log("STK push success");
      } else {
        console.log(response.data);
      }
    } catch (e) {
      console.error(`An error occurred: ${e.message}`);
    }
  }
  app.post('/callback', (req, res) => {
    try {
      const data = req.body;
      console.log(data);
  
      const Resultcode = parseInt(data.Body.stkCallback.ResultCode);
      
      if (Resultcode === 0) {
        const merchantrequestID = data.Body.stkCallback.MerchantRequestID;
        const checkoutrequestID = data.Body.stkCallback.CheckoutRequestID;
        const receiptnumber = data.Body.stkCallback.CallbackMetadata.Item[1].Value;
        const amountpaid = parseInt(data.Body.stkCallback.CallbackMetadata.Item[0].Value);
        const transactiondate = parseInt(data.Body.stkCallback.CallbackMetadata.Item[3].Value);
        
        
        const converttransdate = new Date(
          transactiondate.toString().substring(0, 4),
          transactiondate.toString().substring(4, 6) - 1,
          transactiondate.toString().substring(6, 8),
          transactiondate.toString().substring(8, 10),
          transactiondate.toString().substring(10, 12),
          transactiondate.toString().substring(12, 14)
        );
  
        const phonenumber = data.Body.stkCallback.CallbackMetadata.Item[4].Value;
        const TinypesaID = data.Body.stkCallback.TinyPesaID;
        const Externalrefference = data.Body.stkCallback.ExternalReference;
  
        
        const query = `
          INSERT INTO Paybill (receiptno, merchreqid, checkreqid, resultcode, amount, transactiondate, phonenumber, tinypesaid, externalref)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;
  
        const values = [
          receiptnumber,
          merchantrequestID,
          checkoutrequestID,
          Resultcode,
          amountpaid,
          converttransdate,
          phonenumber,
          TinypesaID,
          Externalrefference,
        ];
  
        // Execute the query
        client.query(query, values)
          .then(() => {
            console.log('Payment data inserted successfully');
            res.json({ data: 'received' });
          })
          .catch((err) => {
            console.error('Error inserting data into database:', err);
            res.status(500).json({ data: 'error inserting data' });
          });
      } else {
        res.json({ data: 'received' });
      }
    } catch (error) {
      console.error('Error processing callback:', error);
      res.status(500).json({ data: 'error processing callback' });
    }
  });
app.post('/payment', (req, res) => {
  const formData = req.body;
  console.log('Received form data:', formData); 
  const amount=formData.amount
  const number=formData.phone
  const response=apicall(number,amount)
  if (response==="STK push success"){
    const { fname, lname, email, phone, gender, numadults, numteenagers, numkids, numinfants,
        maritalstatus, idnumber, checkin, checkout, paymentmethod } = formData;
    
      // Insert data into PostgreSQL
      const query = `
        INSERT INTO form_data (fname, lname, email, phone, gender, numadults, numteenagers, numkids, numinfants,
          maritalstatus, idnumber, checkin, checkout, paymentmethod)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`;
    
      const values = [fname, lname, email, phone, gender, numadults, numteenagers, numkids, numinfants,
        maritalstatus, idnumber, checkin, checkout, paymentmethod];
    
      client.query(query, values)
        .then(() => {
          console.log('Data inserted successfully');
          res.send('Form data has been saved!');
        })
        .catch((err) => {
          console.error('Error inserting data:', err);
          res.status(500).send('Error saving data');
        });
    };
  res.json({ message: 'Payment data received successfully', data: formData });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
