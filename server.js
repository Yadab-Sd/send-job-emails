// server.js (Node.js server-side code)
const express = require('express')
const nodemailer = require('nodemailer')
const path = require('path')
const fs = require('fs')
const XLSX = require('xlsx')
const cors = require('cors')
const app = express()

const vars = JSON.parse(fs.readFileSync('./public/config.json'))

app.use(cors())
app.use(
  cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  }),
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(express.static(path.join(__dirname, 'public')))

// Some local variables
let i = 1
const failedFileName =
  getCurrentDate() +
  ' Emails (Failed) - ' +
  (Math.random() * 100 + '').split('.')[0] +
  '.xlsx'
let failedFilePath = '/fails'
const transportConfig = {
  host: vars.EMAIL_HOST,
  service: vars.EMAIL_SERVICE,
  secure: true,
  port: vars.EMAIL_SERVICE_PORT,
  auth: {
    user: vars.SENDER_EMAIL, // Your Yahoo email
    pass: vars.SENDER_EMAIL_3RD_PARTY_PASSWORD, // Your Yahoo email password or app password
  },
}

// Endpoint to handle form submission and send emails
app.get('/template', (req, res) => {
  const emailTemplate = fs.readFileSync(
    path.join(__dirname, 'public', 'template.html'),
    'utf8',
  )
  res.status(200).send(emailTemplate)
})

app.post('/send', async (req, res) => {
  try {
    let { contacts = [], message, resumeExtension, subject } = req.body

    if (contacts.length == 0) {
      return res.status(400).send("Contacts can't be empty")
    }
    if (!message) {
      return res.status(400).send("Message can't be empty")
    }
    if (!subject) {
      return res.status(400).send("Subject can't be empty")
    }
    // If you want to send a copy of your email
    contacts.push({
      email: vars.PERSONAL_EMAIL,
      name: vars.FIRST_NAME,
    })
    // Create a transporter object using Yahoo's SMTP server
    let transporter = nodemailer.createTransport(transportConfig)

    // Form data preparation
    const resume = {
      docx: vars.RESUME_FILE_NAME + '.docx',
      pdf: vars.RESUME_FILE_NAME + '.pdf',
    }
    const resumeName = resume[resumeExtension] || resume.docx

    const results = await Promise.all(
      contacts.map(async (contact) => {
        const htmlContent = message.replace('${name}', ` ${contact.name || ''}`)
        const mailOptions = {
          from: `${vars.SENDER_FULL_NAME} <${vars.SENDER_EMAIL}>`, // Sender address
          to: contact.email, // List of recipients
          subject, // Subject line
          attachments: [
            {
              filename: resumeName, // Name that the attachment will have
              path: path.join(__dirname, 'resumes', resumeName), // Adjust to the correct path where your resume is located
            },
          ],
          html: htmlContent, // HTML body
        }

        let retries = 0

        const sendEmail = async () => {
          return new Promise((resolve) => {
            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log('Error:', contact.email, error)
                if (retries < 1) {
                  retries++
                  console.log(`Retrying... Attempt ${retries}`)
                  resolve(sendEmail())
                } else {
                  console.error('Retried 2 times already! Try after 24 hours.')
                  resolve({ success: false, contact })
                }
              } else {
                console.log('Message sent: %s', info.messageId)
                resolve({ success: true, contact })
              }
            })
          })
        }

        return await sendEmail()
      }),
    )

    // Handle the results
    let fails = []
    fails = results.filter((res) => !res.success)
    const successCount = contacts.length - fails.length
    if (fails.length > 0) {
      createFailedEmailsExcel(contacts, res)
      return res
        .status(500)
        .send(
          'Failed: ' +
            fails.length +
            '. Emails: ' +
            fails.map((c) => c.contact.email).join(' '),
        )
    }

    res
      .status(200)
      .send(
        (fails.length == 0 ? 'All' : successCount) +
          ' emails sent successfully',
      )

    sendCopy(results)
  } catch (e) {
    console.error(e)
    return res.status(500).send('Failed: ' + e.message)
  }
})

app.get('/download-failed-emails', (req, res) => {
  // Send the file as a download
  res.download(failedFilePath, failedFileName, (err) => {
    if (err) {
      console.error('Error sending file:', err)
    } else {
      console.log('File sent successfully')
    }
  })
})

app.listen(vars.PORT, () => console.log(`Server running on port`, vars.PORT))

// This is because to track to whom you sent emails already
function sendCopy(results = []) {
  let transporter = nodemailer.createTransport(transportConfig)
  let html = `<ul>`
  for (let res of results) {
    if (res.success) {
      html += `<li>${res.contact.email}</li>`
    }
  }
  html += `</ul>`
  const override = {
    from: vars.SENDER_EMAIL,
    to: vars.PERSONAL_EMAIL,
    subject: 'Copy of Job Email',
    html,
  }
  transporter.sendMail(override, (error, info) => {})
}

function createFailedEmailsExcel(failedEmails, res) {
  i++
  // Convert failedEmails array to worksheet data format (array of arrays)
  const data = [['EmailAddress', 'FirstName']] // Headers
  failedEmails.forEach((contact) => {
    data.push([contact.email, contact.name]) // Add failed email rows
  })

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(data) // Convert array of arrays to worksheet
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Failed Emails') // Append worksheet to workbook

  // Write to file
  const filePath = path.join(__dirname, '/fails/' + failedFileName)
  XLSX.writeFile(workbook, filePath)
  console.log('Failed emails saved to:', filePath)
  failedFilePath = filePath
}

function getCurrentDate() {
  const today = new Date()

  let day = today.getDate()
  let month = today.getMonth() + 1 // Months are zero-based in JavaScript
  const year = today.getFullYear()

  return `${day}_${month}_${year}`
}

console.log(getCurrentDate()) // Example: 05/10/2024
