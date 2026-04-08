const axios = require('axios');

exports.handler = async (event, context) => {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  const auth = Buffer.from(`${key}:${secret}`).toString('base64');

  try {
    // 1. Get Access Token
    const tokenResponse = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${auth}` }
    });
    const accessToken = tokenResponse.data.access_token;

    // 2. Parse request data
    const body = JSON.parse(event.body);
    const phone = body.phone; 
    const amount = body.amount; 
    
    // Sandbox Credentials
    const shortCode = "174379";
    const passkey = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');

    // 3. Initiate STK Push (Notice the /processrequest endpoint)
    const stkResponse = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: shortCode,
      PhoneNumber: phone,
      CallBackURL: "https://eclat-africa.netlify.app/.netlify/functions/mpesa-callback",
      AccountReference: "EclatAfrica",
      TransactionDesc: "Payment for E'clat Gloss"
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return { 
      statusCode: 200, 
      body: JSON.stringify(stkResponse.data) 
    };
  } catch (error) {
    console.error(error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: error.message }) 
    };
  }
};