require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const XLSX = require('xlsx');
const nodemailer = require('nodemailer');

// Import routes
const authRoutes = require('./routes/authRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Disable browser caching for HTML and CSS during development/testing
app.use((req, res, next) => {
  const url = req.url.toLowerCase().split('?')[0];
  if (
    url === '/' ||
    url === '/about' ||
    url === '/inside' ||
    url === '/lab-reports' ||
    url === '/shop' ||
    url === '/contact' ||
    url.endsWith('.html') ||
    url.endsWith('.css') ||
    url.endsWith('.js')
  ) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else {
    res.setHeader('Cache-Control', 'no-cache');
  }
  next();
});

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Serve static files from the website directory
app.use(express.static(path.join(__dirname)));

// File path for Excel leads tracking
const EXCEL_FILE_PATH = path.join(__dirname, 'TRI_Leads.xlsx');
const LOGS_FILE_PATH = path.join(__dirname, 'leads_backup.json');

/**
 * Saves a lead to an Excel spreadsheet using SheetJS (xlsx)
 */
function saveLeadToExcel(lead) {
  try {
    let workbook;
    let worksheet;
    let data = [];

    const newRow = {
      'Date & Time': new Date().toLocaleString('en-IN'),
      'Name': lead.name,
      'Email': lead.email,
      'Body Weight (kg)': lead.weight,
      'Training Intensity': lead.intensity,
      'Protein (g/day)': lead.protein,
      'Hydration (L/day)': lead.hydration,
      'BCAA (g/day)': lead.bcaa,
      'Recovery (hours)': lead.recovery,
      'Status': 'Active Lead'
    };

    if (fs.existsSync(EXCEL_FILE_PATH)) {
      // Read existing workbook
      workbook = XLSX.readFile(EXCEL_FILE_PATH);
      const sheetName = workbook.SheetNames[0];
      worksheet = workbook.Sheets[sheetName];
      // Convert to JSON array
      data = XLSX.utils.sheet_to_json(worksheet);
      data.push(newRow);
    } else {
      // Create new workbook
      workbook = XLSX.utils.book_new();
      data.push(newRow);
    }

    // Convert updated data back to worksheet
    worksheet = XLSX.utils.json_to_sheet(data);

    // Set custom column widths for readability in Excel
    worksheet['!cols'] = [
      { wch: 22 }, // Date & Time
      { wch: 20 }, // Name
      { wch: 30 }, // Email
      { wch: 18 }, // Body Weight (kg)
      { wch: 20 }, // Training Intensity
      { wch: 16 }, // Protein (g/day)
      { wch: 18 }, // Hydration (L/day)
      { wch: 15 }, // BCAA (g/day)
      { wch: 18 }, // Recovery (hours)
      { wch: 15 }  // Status
    ];

    // Append sheet to workbook or overwrite if already present
    if (workbook.SheetNames.includes('Leads')) {
      workbook.Sheets['Leads'] = worksheet;
    } else {
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
    }

    // Write file back to disk
    XLSX.writeFile(workbook, EXCEL_FILE_PATH);
    console.log(`[Excel] Lead successfully written to Excel: ${lead.email}`);
  } catch (error) {
    console.error('[Excel Error] Failed to write lead to Excel:', error.message);
  }
}

/**
 * Saves a backup of lead data to a JSON array file
 */
function backupLeadToJSON(lead) {
  try {
    let data = [];
    if (fs.existsSync(LOGS_FILE_PATH)) {
      const fileData = fs.readFileSync(LOGS_FILE_PATH, 'utf8');
      data = JSON.parse(fileData);
    }
    data.push({
      timestamp: new Date().toISOString(),
      ...lead
    });
    fs.writeFileSync(LOGS_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('[Backup Error] Failed to save lead backup:', error.message);
  }
}

/**
 * Generates custom structured Diet Plan meals based on weight and intensity
 */
function generateDietPlanText(weight, intensity) {
  const isElite = intensity === 'Elite' || intensity === '3';
  const isMed = intensity === 'Medium' || intensity === '2';
  
  const dailyProtein = isElite ? Math.round(weight * 2.2) : (isMed ? Math.round(weight * 1.8) : Math.round(weight * 1.5));
  const carbsMultiplier = isElite ? 4 : (isMed ? 3 : 2);
  const dailyCarbs = Math.round(weight * carbsMultiplier);
  const dailyFats = Math.round(weight * 0.8);
  const calories = Math.round((dailyProtein * 4) + (dailyCarbs * 4) + (dailyFats * 9));

  return {
    summary: `${calories} kcal · ${dailyProtein}g Protein · ${dailyCarbs}g Carbs · ${dailyFats}g Fats`,
    meals: [
      {
        name: "Morning Ritual (Upon Waking)",
        desc: "350ml Lukewarm water + a pinch of pink Himalayan salt + juice of half a lemon. (Gut activation and premium hydration boost)."
      },
      {
        name: "Meal 1: High-Performance Breakfast",
        desc: `${Math.round(weight * 0.5)}g Oats or Quinoa cooked in water/almond milk + 4 Egg Whites (or 150g Organic Tofu/Paneer) + 15g Almonds + Handful of Blueberries. (Slow-release carbs and pristine protein).`
      },
      {
        name: "Meal 2: Metabolic Balance Lunch",
        desc: `150g Clean Grilled Chicken Breast (or 180g Paneer/Tofu/Tempeh) + 120g Boiled Jasmine Rice or Sweet Potato + 150g steamed green vegetables (Broccoli/Asparagus/Spinach) drizzled with 1 tsp Extra Virgin Olive Oil.`
      },
      {
        name: "Meal 3: Pre-Workout Fuel (30m Before)",
        desc: "1 ripe medium banana + TRI Pump Drake Pre-Workout mixed in 300ml cold water. (Peak vasodilation and muscle-pump activation)."
      },
      {
        name: "Meal 4: Anabolic Window Recovery (Post-Workout)",
        desc: "1 scoop of TRI True Whey Protein mixed with water/skimmed milk + 1 medium apple + 10g BCAA (Power BCAA) mixed in 300ml cold water during your session. (Immediate protein synthesis and zero-bloat recovery)."
      },
      {
        name: "Meal 5: Muscle-Repair Dinner",
        desc: `160g Grilled Fish or Chicken (or 200g Low-Fat Paneer) + Large mixed green salad (Cucumber, Lettuce, Bell Peppers) + 100g steamed sweet potato + 1/2 sliced Avocado.`
      }
    ]
  };
}

/**
 * Dispatches the premium HTML personalized plan email using Nodemailer
 */
async function sendPersonalizedEmail(lead) {
  const diet = generateDietPlanText(parseInt(lead.weight), lead.intensity);

  // Read environment variables or fall back to mock
  const SMTP_HOST = process.env.SMTP_HOST || 'smtp.ethereal.email';
  const SMTP_PORT = process.env.SMTP_PORT || 587;
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;

  let transporter;
  let isMock = false;

  if (SMTP_USER && SMTP_PASS) {
    // Production SMTP
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT == 465,
      auth: {
        user: SMTP_USER,
        password: SMTP_PASS
      }
    });
  } else {
    // Fallback: create Ethereal mock account or write locally
    isMock = true;
    try {
      // Create a test account on Ethereal automatically
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log(`[Email Setup] Mock SMTP configured successfully. User: ${testAccount.user}`);
    } catch (e) {
      console.warn('[Email Warning] Could not initialize Ethereal mail; writing logs locally.', e.message);
    }
  }

  const mealRowsHTML = diet.meals.map(m => `
    <div style="background-color: #1c1c1e; border: 1px solid #2c2c2e; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <h3 style="color: #e6a2a4; margin-top: 0; margin-bottom: 8px; font-size: 16px; font-weight: 600;">${m.name}</h3>
      <p style="color: #e5e5ea; margin: 0; font-size: 14px; line-height: 1.5;">${m.desc}</p>
    </div>
  `).join('');

  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Personalised TRI Performance Protocol</title>
    </head>
    <body style="background-color: #0b0b0c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5f5f7; margin: 0; padding: 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0b0c; padding: 30px 15px;">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #121214; border: 1px solid #1c1c1e; border-radius: 16px; padding: 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.6);">
              <!-- Logo -->
              <tr>
                <td align="center" style="padding-bottom: 24px;">
                  <span style="font-size: 28px; font-weight: 800; letter-spacing: 2px; color: #ffffff;">△ TRI</span>
                  <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.45); margin-top: 4px;">The Real Inside</div>
                </td>
              </tr>
              
              <!-- Greeting -->
              <tr>
                <td style="border-top: 1px solid #2c2c2e; padding-top: 24px; padding-bottom: 16px;">
                  <h1 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0;">Hello ${lead.name},</h1>
                  <p style="font-size: 15px; color: #a1a1a6; line-height: 1.6; margin-top: 12px; margin-bottom: 20px;">
                    Thank you for generating your high-performance blueprint. Your customized athletic doses and nutrition plans have been calculated by our performance intelligence engine.
                  </p>
                </td>
              </tr>

              <!-- Calculated Stats -->
              <tr>
                <td style="background: linear-gradient(135deg, #1c1c1e 0%, #121214 100%); border: 1px solid #2c2c2e; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                  <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.5); margin: 0 0 16px 0; text-align: center;">YOUR CALCULATION DOSES</h2>
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="center" width="25%">
                        <div style="font-size: 24px; font-weight: 800; color: #ffffff;">${lead.protein}g</div>
                        <div style="font-size: 11px; color: #a1a1a6; margin-top: 4px;">Protein / Day</div>
                      </td>
                      <td align="center" width="25%">
                        <div style="font-size: 24px; font-weight: 800; color: #ffffff;">${lead.hydration}L</div>
                        <div style="font-size: 11px; color: #a1a1a6; margin-top: 4px;">Hydration</div>
                      </td>
                      <td align="center" width="25%">
                        <div style="font-size: 24px; font-weight: 800; color: #ffffff;">${lead.bcaa}g</div>
                        <div style="font-size: 11px; color: #a1a1a6; margin-top: 4px;">BCAA</div>
                      </td>
                      <td align="center" width="25%">
                        <div style="font-size: 24px; font-weight: 800; color: #ffffff;">${lead.recovery}h</div>
                        <div style="font-size: 11px; color: #a1a1a6; margin-top: 4px;">Recovery</div>
                      </td>
                    </tr>
                  </table>
                  <div style="text-align: center; font-size: 13px; color: rgba(255,255,255,0.6); margin-top: 16px; border-top: 1px solid #2c2c2e; padding-top: 12px;">
                    Profile: <strong>${lead.weight} kg</strong> · <strong>${lead.intensity} Intensity</strong>
                  </div>
                </td>
              </tr>

              <!-- Diet Plan Section -->
              <tr>
                <td style="padding-top: 24px;">
                  <h2 style="font-size: 18px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 4px; border-left: 3px solid #e6a2a4; padding-left: 10px;">
                    Custom Structured Diet Plan
                  </h2>
                  <div style="font-size: 13px; color: rgba(255,255,255,0.55); margin-bottom: 16px;">
                    Target macros: ${diet.summary}
                  </div>
                  ${mealRowsHTML}
                </td>
              </tr>

              <!-- Informational Guidelines -->
              <tr>
                <td style="padding-top: 24px; padding-bottom: 24px;">
                  <h2 style="font-size: 18px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 16px; border-left: 3px solid #e6a2a4; padding-left: 10px;">
                    Core Habits for a Healthy, High-Performance Life
                  </h2>
                  
                  <div style="margin-bottom: 16px;">
                    <strong style="color: #ffffff; font-size: 14px; display: block; margin-bottom: 4px;">⚡ 1. Sleep Hygiene Standard</strong>
                    <span style="font-size: 13px; color: #a1a1a6; line-height: 1.5;">Aim for 7.5 to 9 hours of restorative sleep in a pitch-black, cool room (65-68°F/18-20°C). Deep sleep is when growth hormone peaks to repair broken muscle tissue. Eliminate screens 45 minutes before sleep.</span>
                  </div>

                  <div style="margin-bottom: 16px;">
                    <strong style="color: #ffffff; font-size: 14px; display: block; margin-bottom: 4px;">💧 2. Rate of Hydration & Electrolytes</strong>
                    <span style="font-size: 13px; color: #a1a1a6; line-height: 1.5;">Hydrate consistently throughout the day. Dehydration of just 2% reduces muscular power by up to 15%. Supplement your training with high-quality sodium, potassium, and magnesium matrix (found in TRI Power BCAA) to prevent intracellular cramping.</span>
                  </div>

                  <div style="margin-bottom: 16px;">
                    <strong style="color: #ffffff; font-size: 14px; display: block; margin-bottom: 4px;">🚶 3. High NEAT Daily Movement</strong>
                    <span style="font-size: 13px; color: #a1a1a6; line-height: 1.5;">Non-Exercise Activity Thermogenesis (NEAT) accounts for up to 20-30% of your daily calorie expenditure. Aim for 8,000 to 10,000 steps daily. Walking stabilizes blood sugar, enhances metabolic flexibility, and flushes lactic acid post-workout.</span>
                  </div>

                  <div style="margin-bottom: 16px;">
                    <strong style="color: #ffffff; font-size: 14px; display: block; margin-bottom: 4px;">🔬 4. Gut Integrity & Nutrient Bioavailability</strong>
                    <span style="font-size: 13px; color: #a1a1a6; line-height: 1.5;">Maximize nutrient absorption by keeping your digestive tract pristine. Proteolytic plant enzymes like Bromelain and Papain (pre-embedded in TRI True Whey) pre-digest proteins, eliminating gastric bloat and increasing amino acid absorption speed.</span>
                  </div>
                </td>
              </tr>

              <!-- Footer CTA -->
              <tr>
                <td align="center" style="border-top: 1px solid #2c2c2e; padding-top: 28px;">
                  <p style="font-size: 14px; color: #a1a1a6; line-height: 1.6; margin-bottom: 20px;">
                    Ready to fuel this custom protocol with absolute scientific precision? Get the clean-labeled, lab-verified formulas in our introductory kit.
                  </p>
                  <a href="https://wa.me/919999999999?text=Hello!+I'd+like+to+order+a+TRI+Fusion+Pack" target="_blank" style="background-color: #e6a2a4; color: #0b0b0c; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 8px; display: inline-block;">
                    Order TRI Performance Pack
                  </a>
                  <p style="font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 30px; margin-bottom: 0;">
                    You received this email because you generated a protocol plan on the TRI flagship portal.<br>
                    © 2026 THE REAL INSIDE. ISO/IEC 17025 Eurofins Certified.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const mailOptions = {
    from: SMTP_USER ? `"TRI Performance" <${SMTP_USER}>` : '"TRI Performance" <leads@therealinside.com>',
    to: lead.email,
    subject: `Your Personalized TRI Performance Protocol & Diet Plan — ${lead.name}`,
    html: emailHTML
  };

  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      if (isMock) {
        console.log(`[Email Mock Success] Message sent. Link: ${nodemailer.getTestMessageUrl(info)}`);
      } else {
        console.log(`[Email Production Success] Message sent successfully: ${info.messageId}`);
      }
      return true;
    } catch (mailError) {
      console.error('[Email Dispatch Error] Failed to send email via SMTP:', mailError.message);
      saveEmailLocally(lead, emailHTML);
      return false;
    }
  } else {
    console.warn('[Email System] Transporter not initialized. Saving copy locally.');
    saveEmailLocally(lead, emailHTML);
    return false;
  }
}

/**
 * Saves generated HTML email copy locally if SMTP fails or isn't present
 */
function saveEmailLocally(lead, htmlContent) {
  try {
    const dir = path.join(__dirname, 'mock_emails');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    const safeEmail = lead.email.replace(/[^a-zA-Z0-9]/g, '_');
    const filePath = path.join(dir, `${safeEmail}_plan.html`);
    fs.writeFileSync(filePath, htmlContent, 'utf8');
    console.log(`[Local Email Copy] HTML email saved locally to: ${filePath}`);
  } catch (error) {
    console.error('[Local Email Save Error] Failed to write HTML log:', error.message);
  }
}

// ---------------------------------------------------------------------
// ROUTES
// ---------------------------------------------------------------------

/**
 * API Route to capture a lead, save to Excel spreadsheet, and send personal email
 */
app.post('/api/save-lead', async (req, res) => {
  const { name, email, weight, intensity, protein, hydration, bcaa, recovery } = req.body;

  // Basic validation
  if (!name || !email || !weight) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and body weight are required to formulate your plan.'
    });
  }

  const lead = {
    name,
    email,
    weight,
    intensity: intensity || 'Medium',
    protein: protein || '135',
    hydration: hydration || '3.4',
    bcaa: bcaa || '10',
    recovery: recovery || '36'
  };

  console.log(`[API Post] Received lead application from: ${lead.email}`);

  // Process data integrations asynchronously/concurrently
  saveLeadToExcel(lead);
  backupLeadToJSON(lead);
  
  // Send personalized protocol email
  const emailSent = await sendPersonalizedEmail(lead);

  return res.status(200).json({
    success: true,
    message: 'Lead registered, Excel database updated, and email generated.',
    emailSent: emailSent,
    diet: generateDietPlanText(parseInt(lead.weight), lead.intensity)
  });
});

// Clean multi-page routes for sub-pages (without needing .html in URL)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'about.html'));
});

app.get('/inside', (req, res) => {
  res.sendFile(path.join(__dirname, 'inside.html'));
});

app.get('/lab-reports', (req, res) => {
  res.sendFile(path.join(__dirname, 'lab-reports.html'));
});

app.get('/shop', (req, res) => {
  res.sendFile(path.join(__dirname, 'shop.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'contact.html'));
});

// Fallback for static html routing (serves index.html for undefined frontend routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Launch server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`================================================================`);
  console.log(` △ TRI PERFORMANCE PORTAL ACTIVE `);
  console.log(` -> Server Running locally on: http://localhost:${PORT}`);
  console.log(` -> Excel Lead tracker database: ${EXCEL_FILE_PATH}`);
  console.log(` -> Backup JSON file: ${LOGS_FILE_PATH}`);
  console.log(`================================================================`);
});
