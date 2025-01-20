const PORT = 3000

$(function () {
  getConfig()
    .then((vars) => {
      const {
        PERSONAL_EMAIL,
        FIRST_NAME,
        SENDER_EMAIL,
        RESUME_FILE_NAME,
        SENDER_FULL_NAME,
        POSITION,
      } = vars
      $(document).on('input', function () {
        $('#success').empty()
        $('#error').empty()
      })
      $('#formId').submit(submitForm)
      $('#file').on('input', fileUpload)
      $('#message').load(`http://localhost:${PORT}/template.html`, function (
        response,
        status,
        xhr,
      ) {
        if (status === 'success') {
          showRenderedHtml(FIRST_NAME)
          const textarea = $('#message')
          textarea.on('input', function () {
            $(this).css('height', 'auto')
            $(this).css('height', this.scrollHeight + 'px')
          })
          textarea.trigger('input')
        } else {
          console.error(
            'Error loading default template: ' +
              xhr.status +
              ' ' +
              xhr.statusText,
          )
        }
      })
      $('#subject').val(
        `Excited about ${POSITION} Opportunity - ${SENDER_FULL_NAME}`,
      )
      $('#subject').on('input', () => showRenderedHtml(FIRST_NAME))
      $('#message').on('input', () => showRenderedHtml(FIRST_NAME))

      //Contacts
      const addRecEl = `<div class="recruiter">
        <input type="text" placeholder="Email" name="recruiterEmail" />
        <input type="text" placeholder="First Name" name="recruiterName" />
      </div>`

      $('#recruitersId').append(addRecEl)
      $('#add').click(function () {
        $('#recruitersId').append(addRecEl)
        calcCount()
      })

      $('input[name="resumeExtension"]').on('change', function () {
        const selectedValue = $('input[name="resumeExtension"]:checked').val()
        const fullName = RESUME_FILE_NAME + '.' + selectedValue
        $('#resumeOutput').attr('href', '/resumes/' + fullName)
        $('#resumeOutput').text(fullName)
      })
      $('input[name="resumeExtension"]:checked').trigger('change')
    })
    .catch((e) => {
      console.error('Failed to load config. Error: ', e)
    })
})

function submitForm(e) {
  e.preventDefault()
  let formDataArray = $(this).serializeArray()
  let contacts = []
  let resumeExtension = 'docx'
  let subject = ''

  $.each(formDataArray, function (i, field) {
    if (field.name == 'recruiterEmail') {
      contacts.push({
        email: field.value,
      })
    }
    if (field.name == 'recruiterName') {
      const contact = contacts[contacts.length - 1]
      contact.name = field.value
    }
    if (field.name == 'resumeExtension') {
      resumeExtension = field.value || 'docx'
    }
    if (field.name == 'subject') {
      subject = field.value
    }
  })
  contacts = contacts.filter((c) => c.email)
  const message = getMessage()
  sendMessage(contacts, subject, message, resumeExtension, PORT)
}
function decodeHTMLEntities(text) {
  const txt = document.createElement('textarea')
  txt.innerHTML = text
  return txt.value
}
function showRenderedHtml(name) {
  let subject = $('#subject').val()
  $('#subjectOutput').html('Subject: ' + subject)
  let htmlContent = $('#message').html()
  htmlContent = htmlContent.replace('${name}', ` ${name || ''}`)
  let decodedContent = decodeHTMLEntities(htmlContent) // Decode the HTML entities
  document.getElementById('htmlOutput').innerHTML = decodedContent
}

function getMessage() {
  let htmlContent = $('#message').val()
  let decodedContent = decodeHTMLEntities(htmlContent) // Decode the HTML entities
  return decodedContent
}

function sendMessage(contacts, subject, message, resumeExtension, port) {
  $('#submit-btn').prop('disabled', true)
  $.ajax({
    url: `http://localhost:${port}/send`,
    type: 'post',
    data: {
      subject,
      message,
      contacts,
      resumeExtension,
    },
  })
    .done(function (data) {
      $('#success').html(data)
    })
    .fail(function (e, errorMessage, rest) {
      console.error(e, errorMessage, rest)
      $('#error').html(e.responseText || errorMessage)
      fetch(`http://localhost:${PORT}/download-failed-emails`) // Update to your actual endpoint
        .then((response) => {
          if (!response.ok) {
            throw new Error('Network response was not ok')
          }
          return response.blob() // Parse the response as a Blob
        })
        .then((blob) => {
          // Create a URL for the Blob
          const url = window.URL.createObjectURL(blob)
          // Create a temporary link element
          const a = document.createElement('a')
          a.href = url
          a.download = getCurrentDate() + ' Emails Failed.xlsx' // Set the desired file name for download
          document.body.appendChild(a) // Append the link to the body
          a.click() // Programmatically click the link to trigger the download
          a.remove() // Remove the link from the document
          window.URL.revokeObjectURL(url) // Clean up the URL object
        })
        .catch((error) => {
          console.error('Download failed:', error)
        })
    })
    .always(function () {
      $('#submit-btn').prop('disabled', false)
    })
}

function fileUpload(e) {
  var reader = new FileReader()
  reader.onload = function (e) {
    var data = new Uint8Array(e.target.result)
    var workbook = XLSX.read(data, { type: 'array' })
    var firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    var excelData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
    excelData.forEach((d, i) => {
      if (i == 0 || !d[0]) return
      const addRecEl = `<div class="recruiter">
        <input type="text" name="recruiterEmail" value="${d[0]}" />
        <input type="text" name="recruiterName" value="${d[1]}" />
      </div>`
      $('#recruitersId').append(addRecEl)
    })
    calcCount()
  }
  reader.readAsArrayBuffer(e.target.files[0])
}

function calcCount() {
  const c = $('#recruitersId').children()
  const len = c.filter((n, i) => {
    return i.children[0].value
  }).length

  $('#submit-btn').text('Submit (' + len + ')')
}

function getCurrentDate() {
  const today = new Date()

  let day = today.getDate()
  let month = today.getMonth() + 1 // Months are zero-based in JavaScript
  const year = today.getFullYear()

  return `${day}/${month}/${year}`
}

async function getConfig() {
  return new Promise((resolve, reject) => {
    fetch(`http://localhost:${PORT}/config.json`)
      .then((respond) => {
        resolve(respond.json())
      })
      .catch((err) => {
        reject(err)
      })
  })
}
