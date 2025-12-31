// ==============================================
// 1. CONFIGURATION
// ==============================================
const SPREADSHEET_ID = '1o3e54oD9soDyaNiSm9Z-BOTmkF2amkQ_M85ZLxtSaBw'; // <--- *** อย่าลืมใส่ ID Google Sheet ของคุณ ***

// ==============================================
// 2. CORE FUNCTIONS
// ==============================================
function doGet(e) {
  // สร้าง Template แบบไม่ต้องรับตัวแปร (ป้องกันหน้าขาว)
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('ระบบบริหารจัดการทดสอบ O-NET ม.6')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getSheetData(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getDisplayValues();
  const headers = data.shift(); 
  
  return data.map((row, index) => {
    let obj = { '_rowIndex': index + 2 }; 
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

// ==============================================
// 3. API SERVICES
// ==============================================

function apiLogin(username, password) {
  const users = getSheetData('Users');
  const user = users.find(u => String(u.username) === String(username) && String(u.password) === String(password));
  
  if (!user) return { status: false, msg: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
  if (user.status !== 'Active') return { status: false, msg: 'บัญชีของคุณถูกระงับ (Inactive)' };

  const settings = getSheetData('Setting');
  const logo = settings.find(s => s.setting_key === 'logo_url');

  return { status: true, user: user, config: { logo: logo ? logo.setting_value : '' } };
}

function apiGetData(table, role, userRefId) {
  let data = getSheetData(table);
  if (role === 'school' && ['SchoolInfo', 'FieldDetails', 'RoomDetails', 'BudgetDetails'].includes(table)) {
    return data.filter(r => String(r.school_id) === String(userRefId));
  }
  return data;
}

// *** ฟังก์ชันดึงข้อมูลแบบ Bundle (สำหรับหน้างบประมาณ) ***
function apiGetSchoolBudgetBundle(schoolId) {
  const budgetSheet = getSheetData('BudgetDetails');
  const fieldSheet = getSheetData('FieldDetails');
  
  const budget = budgetSheet.find(r => String(r.school_id) === String(schoolId)) || {};
  const field = fieldSheet.find(r => String(r.school_id) === String(schoolId)) || {};
  
  return { budget: budget, field: field };
}

function apiUpdateDataByRow(table, rowIndex, formData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(table);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const range = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn());
  let rowData = range.getValues()[0];

  headers.forEach((header, index) => {
    if (formData.hasOwnProperty(header)) rowData[index] = formData[header];
  });

  range.setValues([rowData]);
  return { status: true, msg: 'บันทึกข้อมูลเรียบร้อยแล้ว' };
}

function apiAddData(table, formData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(table);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let newRow = headers.map(header => formData[header] || '');
  sheet.appendRow(newRow);
  return { status: true, msg: 'เพิ่มข้อมูลเรียบร้อยแล้ว' };
}

function apiDeleteDataByRow(table, rowIndex) {
   const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
   const sheet = ss.getSheetByName(table);
   if (rowIndex < 2) return { status: false, msg: 'ไม่สามารถลบแถวหัวตารางได้' };
   sheet.deleteRow(rowIndex);
   return { status: true, msg: 'ลบข้อมูลเรียบร้อยแล้ว' };
}
