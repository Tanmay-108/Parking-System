const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');

// Firebase service account credentials
const serviceAccount = require('./serviceAccountKey.json');

// UPI ID (will always be empty, as you said)
const UPI_ID = '9321694048@fam';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://parking-system-3723e-default-rtdb.firebaseio.com/'
});

const db = admin.database();
const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// POST endpoint for form submission
app.post('/submit-slot', (req, res) => {
  const { slot, session_id, entry_time } = req.body;

  if (!slot || !session_id || !entry_time) {
    return res.status(400).send('Missing data');
  }

  const timestamp = Math.floor(Date.now() / 1000); // Exit time
  const duration = timestamp - parseInt(entry_time);
  const minutes = Math.ceil(duration / 60);
  const ratePerMinute = 2; // ₹2 per minute
  const cost = minutes * ratePerMinute;
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=SmartParking&am=${cost}&cu=INR`;

  const data = {
    slot,
    session_id,
    entry_time,
    exit_time: timestamp,
    minutes,
    cost
  };

  db.ref(`parking_sessions/${session_id}`).set(data)
    .then(() => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Parking Bill</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f9f9f9;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
            }
            .bill-box {
              background: #fff;
              padding: 30px 40px;
              border-radius: 12px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 450px;
            }
            h2 {
              color: #2c3e50;
              margin-bottom: 25px;
            }
            p {
              font-size: 18px;
              color: #333;
              margin: 12px 0;
            }
            .pay-button {
              margin-top: 30px;
              display: inline-block;
              padding: 12px 24px;
              background-color: #2ecc71;
              color: white;
              font-size: 18px;
              text-decoration: none;
              border-radius: 8px;
              transition: background-color 0.3s ease;
            }
            .pay-button:hover {
              background-color: #27ae60;
            }
          </style>
        </head>
        <body>
          <div class="bill-box">
            <h2>🚗 Parking Bill</h2>
            <p><strong>Slot:</strong> ${slot}</p>
            <p><strong>Duration:</strong> ${minutes} minute(s)</p>
            <p><strong>Total Cost:</strong> ₹${cost}</p>
            <a href="${upiLink}" class="pay-button">Pay Now</a>
          </div>
        </body>
        </html>
      `);
    })
    .catch((error) => {
      console.error('Firebase error:', error);
      res.status(500).send('Failed to store data.');
    });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
