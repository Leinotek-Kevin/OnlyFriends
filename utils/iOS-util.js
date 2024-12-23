const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();
const port = process.env.PORT || 8080;

const APPLE_PRODUCTION_URL = "https://buy.itunes.apple.com/verifyReceipt";
const APPLE_SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";
const SHARED_SECRET = process.env.iOS_SHARED_KEY;

async function validSubscriptionOrder() {
  try {
    let verifyUrl = port == 8080 ? APPLE_SANDBOX_URL : APPLE_PRODUCTION_URL;

    const response = await axios.post(verifyUrl, {
      "receipt-data": receiptData,
      password: SHARED_SECRET,
    });

    return res.json(response);
  } catch (error) {
    console.error("Receipt verification failed", error);
    return null;
  }
}

module.exports = {
  validSubscriptionOrder,
};

// {
//     "status": 0,
//     "environment": "Sandbox",  // or "Production" depending on the environment
//     "receipt": {
//       "receipt_type": "ProductionSandbox",
//       "adam_id": 0,
//       "app_item_id": 0,
//       "bundle_id": "com.example.app",
//       "application_version": "1.0",
//       "download_id": 0,
//       "version_external_identifier": 0,
//       "receipt_creation_date": "2024-01-01 12:00:00 Etc/GMT",
//       "receipt_creation_date_ms": "1672531200000",
//       "receipt_creation_date_pst": "2024-01-01 04:00:00 America/Los_Angeles",
//       "request_date": "2024-01-01 12:01:00 Etc/GMT",
//       "request_date_ms": "1672531260000",
//       "request_date_pst": "2024-01-01 04:01:00 America/Los_Angeles",
//       "original_purchase_date": "2024-01-01 12:00:00 Etc/GMT",
//       "original_purchase_date_ms": "1672531200000",
//       "original_purchase_date_pst": "2024-01-01 04:00:00 America/Los_Angeles",
//       "original_application_version": "1.0",
//       "in_app": [
//         {
//           "quantity": "1",
//           "product_id": "com.example.app.subscription",
//           "transaction_id": "1000000123456789",
//           "original_transaction_id": "1000000123456789",
//           "purchase_date": "2024-01-01 12:00:00 Etc/GMT",
//           "purchase_date_ms": "1672531200000",
//           "purchase_date_pst": "2024-01-01 04:00:00 America/Los_Angeles",
//           "original_purchase_date": "2024-01-01 12:00:00 Etc/GMT",
//           "original_purchase_date_ms": "1672531200000",
//           "original_purchase_date_pst": "2024-01-01 04:00:00 America/Los_Angeles",
//           "expires_date": "2024-02-01 12:00:00 Etc/GMT",
//           "expires_date_ms": "1675119600000",
//           "expires_date_pst": "2024-02-01 04:00:00 America/Los_Angeles",
//           "web_order_line_item_id": "1000000123456789",
//           "is_trial_period": "false",
//           "is_in_intro_offer_period": "false"
//         }
//       ]
//     },
//     "latest_receipt_info": [
//       {
//         "quantity": "1",
//         "product_id": "com.example.app.subscription",
//         "transaction_id": "1000000123456789",
//         "original_transaction_id": "1000000123456789",
//         "purchase_date": "2024-01-01 12:00:00 Etc/GMT",
//         "purchase_date_ms": "1672531200000",
//         "purchase_date_pst": "2024-01-01 04:00:00 America/Los_Angeles",
//         "original_purchase_date": "2024-01-01 12:00:00 Etc/GMT",
//         "original_purchase_date_ms": "1672531200000",
//         "original_purchase_date_pst": "2024-01-01 04:00:00 America/Los_Angeles",
//         "expires_date": "2024-02-01 12:00:00 Etc/GMT",
//         "expires_date_ms": "1675119600000",
//         "expires_date_pst": "2024-02-01 04:00:00 America/Los_Angeles",
//         "web_order_line_item_id": "1000000123456789",
//         "is_trial_period": "false",
//         "is_in_intro_offer_period": "false"
//       }
//     ],
//     "latest_receipt": "base64_receipt_data",
//     "pending_renewal_info": [
//       {
//         "auto_renew_product_id": "com.example.app.subscription",
//         "original_transaction_id": "1000000123456789",
//         "product_id": "com.example.app.subscription",
//         "auto_renew_status": "1"
//       }
//     ]
//   }
