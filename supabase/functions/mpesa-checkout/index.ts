import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const reqData = await req.json()
    const { phone, amount, cart, email, is_reward, reward_ids, referral_code } = reqData

    let formattedPhone = phone.replace(/\D/g, ''); 
    if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
    else if (formattedPhone.startsWith('+')) formattedPhone = formattedPhone.slice(1);
    else if (formattedPhone.length === 9) formattedPhone = '254' + formattedPhone;
    
    const consumerKey = Deno.env.get('DARAJA_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('DARAJA_CONSUMER_SECRET');
    const passkey = Deno.env.get('DARAJA_PASSKEY');
    const shortcode = Deno.env.get('DARAJA_SHORTCODE'); 
    
    if (!consumerKey || !consumerSecret) throw new Error("Daraja Secrets are missing in Supabase Settings!");

    const envUrl = 'https://sandbox.safaricom.co.ke'; 

    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    const tokenResponse = await fetch(`${envUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { 'Authorization': `Basic ${auth}` }
    });
    
    const tokenText = await tokenResponse.text();
    let tokenData;
    try {
        tokenData = JSON.parse(tokenText);
    } catch (err) {
        throw new Error("Safaricom rejected the keys. Please check your Daraja Consumer Key and Secret for accidental spaces!");
    }

    if (!tokenResponse.ok) throw new Error(`Safaricom Auth Failed: ${tokenData.errorMessage || 'Invalid Credentials'}`);
    const accessToken = tokenData.access_token;

    const date = new Date();
    const timestamp = date.getFullYear().toString() + 
                      (date.getMonth() + 1).toString().padStart(2, '0') + 
                      date.getDate().toString().padStart(2, '0') + 
                      date.getHours().toString().padStart(2, '0') + 
                      date.getMinutes().toString().padStart(2, '0') + 
                      date.getSeconds().toString().padStart(2, '0');
    
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    const callbackUrl = 'https://sqkqlwugkgrnyfcaaxgu.supabase.co/functions/v1/mpesa-webhook'; 
    
    const stkPayload = {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline", 
        Amount: Math.ceil(amount),
        PartyA: formattedPhone,
        PartyB: shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: "Eclat Africa",
        TransactionDesc: is_reward ? "Rewards Dispatch" : "Order Payment"
    };

    const stkResponse = await fetch(`${envUrl}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(stkPayload)
    });

    const stkText = await stkResponse.text();
    let stkData;
    try {
        stkData = JSON.parse(stkText);
    } catch (err) {
        throw new Error("Safaricom STK API failed to respond properly.");
    }

    if (stkData.ResponseCode !== "0") {
        throw new Error(`Safaricom Error: ${stkData.errorMessage || stkData.ResponseDescription || "Rejected"}`);
    }

    // Save order details to Supabase pending_orders table
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    let userId = null;
    if (authHeader) {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        userId = user?.id;
    }

    const { error: dbError } = await supabase.from('pending_orders').insert({
        checkout_request_id: stkData.CheckoutRequestID,
        user_id: userId,
        email: email,
        phone: formattedPhone,
        amount: amount,
        cart: cart,
        referral_code: referral_code,
        is_reward: is_reward || false,
        reward_count: reward_ids ? reward_ids.length : 0,
        reward_ids: reward_ids
    });

    if (dbError) throw new Error("Failed to save pending order: " + dbError.message);

    return new Response(
      JSON.stringify({ success: true, message: "Prompt sent successfully", CheckoutRequestID: stkData.CheckoutRequestID }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || error.toString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})