README - Hosted Face Recognition Attendance

Files in this ZIP:
- index.html      : Employee-facing page (camera + register + mark)
- client.js       : Frontend logic (face-api + calls to Apps Script)
- admin.html      : Simple admin dashboard (list employees, advances, run payroll)
- style.css       : Styles
- config.js       : Put your Apps Script /exec URL here (already set)
- server_patch.gs : Code snippet to add to your Apps Script project (see below)

IMPORTANT:
1) Your Apps Script (the /exec endpoint) MUST implement a web API (doPost) that accepts JSON payloads with 'action' field.
   The hosted frontend sends POST JSON with {action: 'addEmployee'|'identify'|'listEmployees'|'listAdvances'|'runPayroll', payload: ...}

2) For convenience, a server_patch.gs is included that shows a doPost handler and simple routing to in-sheet functions.
   Paste server_patch.gs into your Apps Script project (Code.gs or a new .gs file) and deploy.

3) This hosted frontend CANNOT use google.script.run. It communicates via fetch() POST to your /exec URL.

Server patch snippet (server_patch.gs) included — paste it into your Apps Script and deploy as Web App (Anyone).
