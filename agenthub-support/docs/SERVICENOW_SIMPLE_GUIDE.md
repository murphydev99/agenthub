# Simple Steps to Create AgentHub Service Account in ServiceNow

## What We Need
A special account that our portal can use to create and view support tickets in ServiceNow.

---

## Steps to Create the Account (10 minutes)

### Step 1: Create a New User
1. **Go to:** Users section in ServiceNow
2. **Click:** New button
3. **Fill in these fields:**
   - User ID: `svc_agenthub_portal`
   - First name: `AgentHub`
   - Last name: `Integration`
   - Password: `[create a strong password and save it]`
   - Active: ✅ Yes
   - **Web service access only:** ✅ Yes (IMPORTANT - check this box!)

4. **Click:** Submit

### Step 2: Give the User Permissions
1. **Open** the user you just created (svc_agenthub_portal)
2. **Find** the "Roles" section (usually at the bottom)
3. **Click:** Edit or Add Roles
4. **Add these 2 roles:**
   - `rest_service`
   - `itil`
5. **Save** the roles

### Step 3: Test It Works
1. Share with us:
   - ServiceNow URL: `https://dbisupportqa.service-now.com`
   - Username: `svc_agenthub_portal`
   - Password: `[the password you created]`
2. We'll test the connection

---

## That's It! 

**What We'll Use This For:**
- Create support tickets from our portal
- View existing tickets
- Update ticket status

**Security Note:** This account can only be used by computers (not for human login), so it's secure.

---

## Information We Need From You:

Please send us:
```
ServiceNow URL: https://dbisupportqa.service-now.com
Username: svc_agenthub_portal  
Password: [send securely]
```

---

## If You Get Stuck:

**Can't find something?** Take a screenshot and send it to us.

**Need help?** We can do a quick screen share to walk through it together.

**Questions?** Email us at [your email]

---

*Thank you for your help setting this up!*