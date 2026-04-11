import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests from the browser
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse the payload sent from index.html / rewards.html
    const reqData = await req.json()
    const { phone, amount, cart, email, is_reward, reward_ids, referral_code } = reqData

    // 1. Format Phone Number (Daraja expects 254...)
    let formattedPhone = phone.replace(/\D/g, ''); // Remove any spaces or symbols
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '254' + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith('+')) {
        formattedPhone = formattedPhone.slice(1);
    } else if (formattedPhone.length === 9) {
        formattedPhone = '254' + formattedPhone;
    }
    
    // 2. Get Environment Variables (Secrets hidden from frontend)
    const consumerKey = Deno.env.get('DARAJA_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('DARAJA_CONSUMER_SECRET');
    const passkey = Deno.env.get('DARAJA_PASSKEY');
    const shortcode = Deno.env.get('DARAJA_SHORTCODE'); // e.g. 174379
    
    // NOTE: Change to 'https://api.safaricom.co.ke' when going Live
    const envUrl = 'https://sandbox.safaricom.co.ke'; 

    // 3. Generate Daraja Access Token
    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    const tokenResponse = await fetch(`${envUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { 'Authorization': `Basic ${auth}` }
    });
    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
        throw new Error("Failed to authenticate with Safaricom");
    }
    const accessToken = tokenData.access_token;

    // 4. Generate STK Password & Timestamp
    const date = new Date();
    const timestamp = date.getFullYear().toString() + 
                      (date.getMonth() + 1).toString().padStart(2, '0') + 
                      date.getDate().toString().padStart(2, '0') + 
                      date.getHours().toString().padStart(2, '0') + 
                      date.getMinutes().toString().padStart(2, '0') + 
                      date.getSeconds().toString().padStart(2, '0');
    
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    // 5. The Callback Webhook URL (We will build this next)
    // This is where Safaricom will send the success/fail result after the user enters their PIN
    const callbackUrl = 'https://sqkqlwugkgrnyfcaaxgu.supabase.co/functions/v1/mpesa-webhook'; 
    
    // 6. Construct the STK Push Payload
    const stkPayload = {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline", // Change to CustomerBuyGoodsOnline for Till numbers
        Amount: Math.ceil(amount), // Daraja strictly requires integers
        PartyA: formattedPhone,
        PartyB: shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: "Eclat Africa",
        TransactionDesc: is_reward ? "Rewards Dispatch" : "Order Payment"
    };

    // 7. Initiate STK Push
    const stkResponse = await fetch(`${envUrl}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(stkPayload)
    });

    const stkData = await stkResponse.json();

    // Check for Safaricom errors (e.g., invalid phone number)
    if (stkData.ResponseCode !== "0") {
        throw new Error(stkData.errorMessage || stkData.ResponseDescription || "Safaricom rejected the request");
    }

    // If successful, stkData will contain a CheckoutRequestID. 
    // Safaricom will attach this same ID to the webhook callback so we can match the payment to the cart/user.
    // (For the final production version, we will save this ID + Cart Data into a 'pending_orders' table here).

    return new Response(
      JSON.stringify({ success: true, message: "Prompt sent successfully", CheckoutRequestID: stkData.CheckoutRequestID }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})