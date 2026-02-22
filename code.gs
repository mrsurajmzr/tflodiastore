// ==========================================
// 1. CONFIGURATION
// ==========================================
const ADMIN_EMAIL = "tflodia@gmail.com"; 
const STORE_NAME = "TFLODIA STORE";
const THEME_COLOR = "#2563eb"; // Blue color match with website

// ==========================================
// 2. DATABASE CONNECTION & SETUP
// ==========================================

function getDatabase() {
  const props = PropertiesService.getScriptProperties();
  // Changed to V6 for a fresh, error-free start
  let sheetId = props.getProperty("SHEET_ID_FINAL_V6"); 
  let ss;

  if (sheetId) { 
    try { ss = SpreadsheetApp.openById(sheetId); } 
    catch (e) { ss = null; } 
  }

  if (!ss) {
    // Nayi sheet banayega bina loop ke
    ss = SpreadsheetApp.create("TFLODIA_DATABASE_V6");
    props.setProperty("SHEET_ID_FINAL_V6", ss.getId());
    console.log("New Database Created: " + ss.getUrl());
  }
  return ss;
}

// ⚠️ RUN THIS FUNCTION ONCE
function setupDatabase() {
  const ss = getDatabase();
  
  // 1. PRODUCTS
  let prodSheet = ss.getSheetByName("Products");
  if (!prodSheet) {
    prodSheet = ss.insertSheet("Products");
    prodSheet.appendRow(["ProductID", "Title", "Price", "Description", "ImageURL", "DemoLink", "FullPdfLink", "Type", "Category", "Tags", "IsNew"]);
    prodSheet.appendRow(["P001", "Full Stack Combo", "299", "Complete Web Dev Notes", "https://via.placeholder.com/300", "", "", "Combo", "Programming", "web,coding", "TRUE"]);
  }

  // 2. USERS
  let userSheet = ss.getSheetByName("Users");
  if (!userSheet) {
    userSheet = ss.insertSheet("Users");
    userSheet.appendRow(["UserID", "Name", "Email", "Password", "Phone", "JoinDate"]);
  }

  // 3. ORDERS
  let orderSheet = ss.getSheetByName("Orders");
  if (!orderSheet) {
    orderSheet = ss.insertSheet("Orders");
    orderSheet.appendRow(["OrderID", "UserID", "ProductID", "TransactionID", "Status", "Date", "UserEmail"]);
  }

  // 4. OTPs
  let otpSheet = ss.getSheetByName("OTPs");
  if (!otpSheet) {
    otpSheet = ss.insertSheet("OTPs");
    otpSheet.appendRow(["Email", "OTP", "Timestamp"]);
  }
  
  // Delete default 'Sheet1' SAFELY (To avoid Exception: Sheet 0 error)
  try {
    let defaultSheet = ss.getSheetByName("Sheet1");
    if (defaultSheet) {
      ss.deleteSheet(defaultSheet);
    }
  } catch (e) {
    console.log("Safe ignore: Could not delete default Sheet1.");
  }
  
  console.log("Setup Complete! Check your Google Drive.");
  return "Setup Complete!";
}

// ==========================================
// 3. PROFESSIONAL EMAIL TEMPLATES
// ==========================================

function getEmailTemplate(title, bodyContent, buttonText = null, buttonLink = null, footerNote = "") {
  let btnHtml = buttonText ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${buttonLink}" style="background-color: ${THEME_COLOR}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);">${buttonText}</a>
    </div>` : "";

  return `
    <div style="background-color: #f3f4f6; padding: 40px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
        <div style="background-color: ${THEME_COLOR}; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">${STORE_NAME}</h1>
        </div>
        <div style="padding: 40px 30px; color: #374151; line-height: 1.6;">
          <h2 style="color: #111827; font-size: 20px; margin-top: 0;">${title}</h2>
          ${bodyContent}
          ${btnHtml}
          <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">${footerNote}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
          <p>&copy; ${new Date().getFullYear()} ${STORE_NAME}. All rights reserved.</p>
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </div>
  `;
}

// ==========================================
// 4. API LOGIC
// ==========================================

function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  const ss = getDatabase();
  let action = e.parameter.action;
  let data = {};
  
  if (e.postData && e.postData.contents) {
    try { data = JSON.parse(e.postData.contents); } catch(err) {}
    if(data.action) action = data.action;
  }

  let result = { success: false, message: "Invalid Action" };

  // --- 1. GET PRODUCTS ---
  if (action === "getProducts") {
    const sheet = ss.getSheetByName("Products");
    const rows = sheet.getDataRange().getValues();
    rows.shift(); 
    result = { success: true, data: rows };
  }
  
  // --- 2. LOGIN ---
  else if (action === "login") {
    const sheet = ss.getSheetByName("Users");
    const users = sheet.getDataRange().getValues();
    for (let i = 1; i < users.length; i++) {
      if (users[i][2] == data.email && users[i][3] == data.password) {
        result = { success: true, userId: users[i][0], name: users[i][1], email: users[i][2] };
        break;
      }
    }
    if(!result.success) result.message = "Incorrect Email or Password";
  }

  // --- 3. SEND OTP ---
  else if (action === "sendOtp") {
    const users = ss.getSheetByName("Users").getDataRange().getValues();
    let isRegistered = false;
    for (let i = 1; i < users.length; i++) {
      if (users[i][2] == data.email) { isRegistered = true; break; }
    }

    if (data.type === "register" && isRegistered) {
      result = { success: false, message: "Email already registered. Please Login." };
    } else if (data.type === "forgot" && !isRegistered) {
      result = { success: false, message: "Email not found." };
    } else {
      let otp = Math.floor(100000 + Math.random() * 900000).toString();
      ss.getSheetByName("OTPs").appendRow([data.email, otp, new Date().getTime()]);
      
      try {
        const emailBody = `
          <p>Hello,</p>
          <p>You requested a verification code for <b>${STORE_NAME}</b>.</p>
          <div style="background:#eff6ff; border: 1px dashed ${THEME_COLOR}; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; color: ${THEME_COLOR}; letter-spacing: 5px; margin: 20px 0;">${otp}</div>
          <p>This code is valid for 10 minutes. Do not share this code with anyone.</p>
        `;
        MailApp.sendEmail({
          to: data.email,
          subject: `${otp} is your verification code - ${STORE_NAME}`,
          htmlBody: getEmailTemplate("Verification Code", emailBody)
        });
        result = { success: true, message: "OTP sent to email." };
      } catch(err) {
        result = { success: false, message: "Could not send email." };
      }
    }
  }

  // --- 4. VERIFY & REGISTER ---
  else if (action === "verifyAndRegister") {
    if (verifyOtp(ss, data.email, data.otp)) {
      const sheet = ss.getSheetByName("Users");
      const id = "U" + new Date().getTime();
      sheet.appendRow([id, data.name, data.email, data.password, data.phone, new Date()]);
      result = { success: true, userId: id, name: data.name, email: data.email };
    } else {
      result = { success: false, message: "Invalid OTP" };
    }
  }

  // --- 5. RESET PASSWORD ---
  else if (action === "resetPassword") {
    if (verifyOtp(ss, data.email, data.otp)) {
      const sheet = ss.getSheetByName("Users");
      const users = sheet.getDataRange().getValues();
      for (let i = 1; i < users.length; i++) {
        if (users[i][2] == data.email) {
          sheet.getRange(i + 1, 4).setValue(data.newPassword);
          result = { success: true, message: "Password Updated" };
          break;
        }
      }
    } else {
      result = { success: false, message: "Invalid OTP" };
    }
  }

  // --- 6. PLACE ORDER ---
  else if (action === "placeOrder") {
    const sheet = ss.getSheetByName("Orders");
    const orderId = "ORD" + Math.floor(Math.random() * 1000000);
    sheet.appendRow([orderId, data.userId, data.productId, data.trxId, "Pending", new Date(), data.userEmail]);
    
    // Notify Admin
    try {
      const adminBody = `
        <p>A new order has been placed.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Order ID:</td><td style="padding: 10px;">${orderId}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">User Email:</td><td style="padding: 10px;">${data.userEmail}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Product ID:</td><td style="padding: 10px;">${data.productId}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; font-weight: bold;">Trx ID:</td><td style="padding: 10px; background: #fffbeb; font-family: monospace;">${data.trxId}</td></tr>
        </table>
        <p style="margin-top:20px;">Please check Admin Panel to approve.</p>
      `;
      MailApp.sendEmail({
        to: ADMIN_EMAIL,
        subject: `🔔 New Order: ${orderId}`,
        htmlBody: getEmailTemplate("New Order Received", adminBody, "Open Admin Panel", "https://tflodiastore.netlify.app/admin.html")
      });
    } catch(e) {}

    result = { success: true, message: "Order Placed. Waiting for approval." };
  }

  // --- 7. GET USER ORDERS ---
  else if (action === "getUserOrders") {
    const sheet = ss.getSheetByName("Orders");
    const rows = sheet.getDataRange().getValues();
    const myOrders = rows.filter(r => r[1] === data.userId);
    result = { success: true, data: myOrders };
  }

  // --- 8. ADMIN: GET ALL ORDERS ---
  else if (action === "getAllOrders") {
    const sheet = ss.getSheetByName("Orders");
    const rows = sheet.getDataRange().getValues();
    rows.shift();
    result = { success: true, data: rows };
  }

  // --- 9. ADMIN: APPROVE ORDER ---
  else if (action === "approveOrder") {
    const orderSheet = ss.getSheetByName("Orders");
    const prodSheet = ss.getSheetByName("Products");
    const orders = orderSheet.getDataRange().getValues();
    const products = prodSheet.getDataRange().getValues();
    
    let rowIndex = -1;
    let orderData = null;

    for (let i = 0; i < orders.length; i++) {
      if (orders[i][0] == data.orderId) {
        rowIndex = i + 1;
        orderData = orders[i];
        break;
      }
    }

    if (rowIndex > -1) {
      orderSheet.getRange(rowIndex, 5).setValue("Approved");
      
      let pdfLink = "";
      let prodTitle = "Premium Content";
      for(let p=0; p<products.length; p++) {
         if(products[p][0] == orderData[2]) { 
           pdfLink = products[p][6]; 
           prodTitle = products[p][1];
           break; 
         }
      }
      
      try {
        const userBody = `
          <p>Your payment for Order <b>#${data.orderId}</b> is verified.</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin:0; font-weight:bold; color: #166534;">${prodTitle}</p>
          </div>
          <p>Download your file below.</p>
        `;
        const footerWarning = "⚠️ <b>Copyright Warning:</b> Sharing or reselling this file is strictly prohibited.";
        
        MailApp.sendEmail({
          to: orderData[6],
          subject: `🎉 Order Approved! Download ${prodTitle}`,
          htmlBody: getEmailTemplate("Payment Successful!", userBody, "Download PDF Now", pdfLink, footerWarning)
        });
      } catch(e) {}
      
      result = { success: true, message: "Approved & Email Sent" };
    } else {
      result = { success: false, message: "Order not found" };
    }
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// HELPER: Verify OTP
function verifyOtp(ss, email, inputOtp) {
  const sheet = ss.getSheetByName("OTPs");
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][0] == email) {
      if (rows[i][1] == inputOtp && (new Date().getTime() - rows[i][2] < 600000)) {
        return true;
      }
      return false;
    }
  }
  return false;
}