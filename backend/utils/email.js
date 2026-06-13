const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  }
})

// Order confirmation email
const sendOrderConfirmation = async (email, order, items) => {
  const itemsList = items.map(item =>
    `<tr>
      <td style="padding:8px">${item.name}</td>
      <td style="padding:8px">${item.quantity}</td>
      <td style="padding:8px">₹${item.price}</td>
    </tr>`
  ).join('')

  await transporter.sendMail({
    from: '"TRI — The Real Inside" <noreply@therealinside.com>',
    to: email,
    subject: `Order Confirmed! #${order.order_number} 🎉`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#000;padding:20px;text-align:center">
          <h1 style="color:#fff;margin:0">TRI — The Real Inside</h1>
        </div>
        <div style="padding:30px">
          <h2>Order Confirmed! 🎉</h2>
          <p>Order Number: <strong>#${order.order_number}</strong></p>
          <table style="width:100%;border-collapse:collapse">
            <tr style="background:#f5f5f5">
              <th style="padding:8px;text-align:left">Product</th>
              <th style="padding:8px;text-align:left">Qty</th>
              <th style="padding:8px;text-align:left">Price</th>
            </tr>
            ${itemsList}
          </table>
          <h3>Total: ₹${order.total}</h3>
          <p>We will ship your order within 2-3 business days.</p>
          <p>Thank you for choosing TRI!</p>
        </div>
      </div>
    `
  })
}

// Welcome email
const sendWelcomeEmail = async (email, name) => {
  await transporter.sendMail({
    from: '"TRI — The Real Inside" <noreply@therealinside.com>',
    to: email,
    subject: 'Welcome to TRI! 💪',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#000;padding:20px;text-align:center">
          <h1 style="color:#fff;margin:0">TRI — The Real Inside</h1>
        </div>
        <div style="padding:30px">
          <h2>Welcome, ${name}! 💪</h2>
          <p>Thank you for joining TRI — India's most transparent performance nutrition brand.</p>
          <p>What's inside matters. And we promise to always show you exactly what's inside.</p>
          <a href="https://therealinside.com/shop.html" 
             style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px">
            Shop Now
          </a>
        </div>
      </div>
    `
  })
}

// Newsletter email
const sendNewsletterConfirmation = async (email) => {
  await transporter.sendMail({
    from: '"TRI — The Real Inside" <noreply@therealinside.com>',
    to: email,
    subject: 'Subscribed to TRI Updates! ✅',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#000;padding:20px;text-align:center">
          <h1 style="color:#fff;margin:0">TRI — The Real Inside</h1>
        </div>
        <div style="padding:30px">
          <h2>You're subscribed! ✅</h2>
          <p>You'll now receive early access to new products, lab reports, and exclusive offers.</p>
          <p>No spam. Ever. Just transparency.</p>
        </div>
      </div>
    `
  })
}

module.exports = {
  sendOrderConfirmation,
  sendWelcomeEmail,
  sendNewsletterConfirmation
}
