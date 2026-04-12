import { createClient } from "npm:@supabase/supabase-js@2"

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const callbackData = payload?.Body?.stkCallback;
    
    if (!callbackData) return new Response("Invalid payload", { status: 400 });

    const resultCode = callbackData.ResultCode;
    const checkoutRequestID = callbackData.CheckoutRequestID;

    // Initialize Supabase with the Admin Key to bypass database security rules
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (resultCode === 0) {
        // PAYMENT SUCCESSFUL
        const callbackMetadata = callbackData?.CallbackMetadata?.Item || [];
        const amountPaid = callbackMetadata.find((item: any) => item.Name === 'Amount')?.Value;
        const receiptNumber = callbackMetadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;

        console.log(`✅ Success! Received ${amountPaid} KES. Receipt: ${receiptNumber}`);

        // 1. Fetch the pending order details we saved 30 seconds ago
        const { data: pending, error: fetchErr } = await supabase
            .from('pending_orders')
            .select('*')
            .eq('checkout_request_id', checkoutRequestID)
            .single();

        if (pending && !fetchErr) {
            if (pending.is_reward) {
                // This was a reward redemption. Update the purchases table.
                if (pending.reward_ids && pending.reward_ids.length > 0) {
                    await supabase.from('purchases').update({ is_redeemed: true }).in('id', pending.reward_ids);
                }
            } else {
                // This was a new order. Unpack the cart and insert into purchases!
                const purchasesToInsert: any[] = [];
                const cartItems = Array.isArray(pending.cart) ? pending.cart : [];
                cartItems.forEach((item: any) => {
                    const pName = item.productName || '';
                    if (pName.includes('The Complete') && pName.includes('Collection')) {
                        // Extract category, e.g. "The Complete Lip Oil Collection" -> "Lip Oil"
                        const categoryMatch = pName.match(/The Complete (.*?) Collection/);
                        const category = categoryMatch ? categoryMatch[1] : 'Lip Gloss';
                        
                        purchasesToInsert.push({ user_id: pending.user_id, product_name: `Nairobi Night ${category}`, amount: 2500 });
                        purchasesToInsert.push({ user_id: pending.user_id, product_name: `Savannah Sunset ${category}`, amount: 2500 });
                        purchasesToInsert.push({ user_id: pending.user_id, product_name: `Coastal Hibiscus ${category}`, amount: 2500 });
                        purchasesToInsert.push({ user_id: pending.user_id, product_name: `Swahili Spice ${category}`, amount: 2500 });
                    } else {
                        purchasesToInsert.push({ user_id: pending.user_id, product_name: item.productName, amount: item.price });
                    }
                });
                await supabase.from('purchases').insert(purchasesToInsert);

                // Handle Ambassador Commission
                if (pending.referral_code) {
                    const commission = pending.amount * 0.10;
                    await supabase.from('referrals').insert({
                        ambassador_code: pending.referral_code,
                        buyer_id: pending.user_id,
                        order_amount: pending.amount,
                        commission: commission
                    });
                }
            }

            // 2. SEND EMAIL RECEIPT via RESEND
            const resendApiKey = Deno.env.get('RESEND_API_KEY');
            if (resendApiKey && pending.email) {
                const emailHtml = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #F9F6EE; padding: 40px; color: #1C1C1C;">
                        <h1 style="font-family: Georgia, serif; font-weight: 400; text-align: center; color: #1C1C1C;">E'clat Africa</h1>
                        <p style="text-align: center; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: #666666;">Payment Confirmed</p>
                        <hr style="border: none; border-top: 1px solid rgba(28,28,28,0.1); margin: 30px 0;">
                        <p>Thank you for your order! We have successfully received your M-PESA payment of <strong>${amountPaid} KES</strong>.</p>
                        <p style="margin-top: 10px;"><strong>M-PESA Receipt:</strong> ${receiptNumber}</p>
                        <p style="margin-top: 30px; line-height: 1.6;">Your luxurious lip care is currently being prepared for dispatch. Our concierge will contact you shortly regarding delivery.</p>
                        <hr style="border: none; border-top: 1px solid rgba(28,28,28,0.1); margin: 30px 0;">
                        <p style="text-align: center; font-size: 12px; color: #666666;">&copy; 2026 E'clat Africa. All Rights Reserved.</p>
                    </div>
                `;
                try {
                    await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${resendApiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            from: "onboarding@resend.dev", 
                            to: pending.email,
                            subject: "E'clat Africa | Payment Confirmed",
                            html: emailHtml
                        })
                    });
                } catch (e) {
                    console.error("Failed to send email", e);
                }
            }
        }
    } else {
        console.log(`❌ Failed: ${checkoutRequestID}. Reason: ${callbackData.ResultDesc}`);
    }

    // Always return a success response to Safaricom so they stop sending the webhook
    return new Response(JSON.stringify({ "ResultCode": 0, "ResultDesc": "Accepted" }), {
      headers: { 'Content-Type': 'application/json' }, status: 200
    });

  } catch (error) {
    return new Response("Internal Server Error", { status: 500 });
  }
})
