##

|--css (it contains frontend styles)
|--public
|-template.html (the email template the recruiter will see)
|-index.html (your frontend ui)
|--resumes (your resume files i.e pdf & docx)
|--scripts (frontend scripts i.e click, submit events)
|-server.js (backend logic which actually sends the email when you submit from frontend)
|-config.json (your values)

### Before you start

1. Go to public/config.json and input your values.
2. Go to public/template.html and give your own values where you see [].
3. Paste your resumes in pdf and docx format inside /resumes and updates resume names in config.json file
4. Update port on public/scripts/script.js similar to what you give in config.json

## Run Server : steps

```
npm install
npm run serve
```

It will start your application server at http://localhost:3000 or http://127.0.0.1:3000. // according to your port on config
Open the url to see the UI.

## Run Frontend UI

Go to your codebase and double-click on index.html to open on your browser

### Config
    ...

  SENDER_EMAIL: 'email@domain.com', // your from email
  SENDER_EMAIL_3RD_PARTY_PASSWORD: 'xyz', // need to create 3rd party pass from your email portal (check how to do on on yahoo or gmail portal)
  PERSONAL_EMAIL:'email-copy@domain.com' // This will be used to send a copy/record of your activity. Use one of your personal email

