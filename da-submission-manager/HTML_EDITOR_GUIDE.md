# HTML Email Editor Guide

## 📝 New HTML Editor Features

The bulk email composer now includes a powerful HTML editor with three viewing modes to make editing and previewing your emails easy.

## 🎨 Editor Modes

### 1. Edit HTML (Default)
- Full-screen HTML source editor
- Syntax highlighting via monospace font
- Direct paste from any HTML source
- Perfect for pasting from email templates

**Use when:** Writing or pasting HTML code

### 2. Preview
- Full-screen live preview of your email
- Shows exactly how recipients will see it
- `{{name}}` appears as "Sample Recipient" with highlight
- Scrollable for long emails

**Use when:** Checking how the email will look

### 3. Split View ⭐ **Recommended**
- Side-by-side HTML source and preview
- **Live updates** - see changes as you type
- HTML source on left, preview on right
- Labeled panels for clarity

**Use when:** Actively editing and want real-time feedback

## 🚀 How to Use

### Quick Start

1. **Navigate to Compose Step**
   - Upload your CSV
   - Click "Parse Recipients"
   - Fill in campaign details

2. **Choose Your Editor Mode**
   - Click **Edit HTML** (for code editing)
   - Click **Preview** (to see result)
   - Click **Split View** (for both simultaneously)

3. **Paste Your HTML**
   - Copy HTML from your email editor or template
   - Click in the editor
   - Paste (Cmd+V / Ctrl+V)
   - Watch the preview update automatically (in Split View)

4. **Add Personalization**
   - Use `{{name}}` anywhere in your HTML
   - It will be replaced with each recipient's name
   - Example: `<p>Dear {{name}},</p>`

### Example: Pasting Your Currumbin Valley Email

1. Open `sample-bulk-email-currumbin.html`
2. Copy all the HTML content
3. In the bulk email composer, click **Split View**
4. Paste into the left panel
5. See the preview on the right instantly update
6. Make any edits and watch them appear live

## 📋 Sample Email Template

A ready-to-use template for the Currumbin Valley campaign is provided:

**File:** `sample-bulk-email-currumbin.html`

```html
<p>Dear {{name}},<br><br></p>

<p style="text-align: center;">
  <a href="https://cv.uconstruct.app/high-trees-currumbin-valley">
    Lodge an objection here!
  </a>
</p>

<p>The clock is ticking. Another application has been lodged for 
<strong>940 Currumbin Creek Road – High Trees Primary 
(Application number COM/2025/271)</strong>, and we need to act quickly.</p>

<!-- ... rest of content ... -->
```

**To use:**
1. Open the file
2. Copy all content
3. Paste into the HTML editor
4. Preview to verify
5. Send!

## ✨ Key Features

### Live Preview
- Updates as you type (in Split View)
- Shows personalization with sample data
- Renders all HTML styling
- Scrollable for long content

### Character Counter
- Displays total HTML character count
- Appears below the editor
- Helps monitor email size

### Full Email Preview Modal
- Click "Preview Full Email" button
- Shows complete email with headers
- Includes From, Subject, and Body
- Modal popup for detailed review

### Smart Personalization Display
- `{{name}}` shown with yellow highlight in preview
- Easy to spot where personalization will occur
- Replaced with "Sample Recipient" in preview
- Actual names used when sending

## 💡 Tips & Best Practices

### 1. Use Split View for Editing
The split view is the most efficient way to work:
- Edit HTML on the left
- See changes instantly on the right
- No need to toggle between modes
- Catch formatting issues immediately

### 2. Test Your HTML First
Before pasting long HTML:
- Test with a simple `<p>Test</p>` first
- Verify the preview works
- Then paste your full content
- Adjust styling as needed

### 3. Keep HTML Simple
Email clients have limitations:
- ✅ Use inline styles: `<p style="color: red;">`
- ✅ Use basic tags: `<p>`, `<strong>`, `<a>`, `<br>`
- ⚠️ Avoid CSS classes (may not work in all clients)
- ⚠️ Avoid complex layouts (may break in Gmail/Outlook)
- ⚠️ Test in multiple email clients if possible

### 4. Add Personalization Strategically
Place `{{name}}` where it makes sense:
- ✅ `<p>Dear {{name}},</p>` (greeting)
- ✅ `<p>Thank you, {{name}}, for your support</p>` (mid-email)
- ⚠️ Avoid overusing - 1-2 times is usually enough

### 5. Check Links Before Sending
All links should:
- Use full URLs: `https://cv.uconstruct.app/...`
- Open in new tab (optional): `target="_blank"`
- Have descriptive text: "Lodge an objection here" not "click here"

### 6. Use the Preview Modal
Before creating the campaign:
- Click "Preview Full Email"
- Review the complete email
- Check From/Subject/Body all together
- Verify formatting looks professional

## 🎯 Workflow for Your Currumbin Valley Campaign

### Step-by-Step:

1. **Upload CSV**
   - Use your 500-recipient CSV file
   - Format: `first_name,last_name,email,zip_code,can2_phone`

2. **Fill Campaign Details**
   - From Email: `cvcommunitycare@reveille.net.au`
   - From Name: `Currumbin Valley Community Care`
   - Reply-To: `cvcommunitycare@reveille.net.au`
   - Subject: `Act Now – Objections Close 10 October (COM/2025/271 - 940 Currumbin Creek Road`

3. **Compose Email Body**
   - Click **Split View** mode
   - Open `sample-bulk-email-currumbin.html`
   - Copy all content
   - Paste into left panel
   - Watch preview update on right
   - Verify links work
   - Check formatting

4. **Preview**
   - Click "Preview Full Email"
   - Review complete email
   - Check it looks professional
   - Close modal

5. **Create Campaign & Test**
   - Click "Continue to Test"
   - Send test to 1-4 email addresses
   - Check your inbox
   - Verify everything looks good

6. **Send to All**
   - Review campaign details
   - Click "Send to All 500 Recipients"
   - Monitor progress

## 🔧 Advanced Features

### HTML Formatting

You can use most standard HTML:

**Text Formatting:**
```html
<strong>Bold text</strong>
<em>Italic text</em>
<u>Underlined text</u>
```

**Links:**
```html
<a href="https://example.com">Link text</a>
<a href="mailto:email@example.com">Email link</a>
```

**Line Breaks:**
```html
<br>          <!-- Single break -->
<br><br>      <!-- Double break (paragraph spacing) -->
```

**Paragraphs:**
```html
<p>Paragraph text</p>
<p style="text-align: center;">Centered text</p>
<p style="color: red;">Red text</p>
```

**Lists:**
```html
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>
```

### Styling

Use inline styles for best compatibility:

```html
<!-- Text color -->
<p style="color: #1976d2;">Blue text</p>

<!-- Background color -->
<p style="background-color: #fff3e0;">Highlighted text</p>

<!-- Font size -->
<p style="font-size: 18px;">Larger text</p>

<!-- Text alignment -->
<p style="text-align: center;">Centered</p>
<p style="text-align: right;">Right-aligned</p>

<!-- Multiple styles -->
<p style="color: red; font-size: 20px; font-weight: bold;">
  Important message
</p>
```

### Emojis

Emojis work great in emails:
```html
<p>Thank you for standing up for our valley. 🌳</p>
<p>⚠️ <strong>Why it matters</strong></p>
<p>🚨 Urgent: Act now!</p>
```

## 📱 Email Client Compatibility

Your HTML will work in most email clients, but be aware:

✅ **Full Support:**
- Gmail (web, iOS, Android)
- Apple Mail (Mac, iOS)
- Outlook.com (web)
- Yahoo Mail

⚠️ **Limited Support:**
- Outlook Desktop (avoid complex CSS)
- Older email clients

💡 **Best Practice:** Keep it simple - basic HTML works everywhere!

## 🐛 Troubleshooting

### Preview Not Updating
- Check you're in **Preview** or **Split View** mode
- Try clicking another mode, then back to Split View
- Refresh the page if needed

### HTML Not Rendering Correctly
- Check for unclosed tags: `<p>` needs `</p>`
- Verify quotes around attributes: `href="url"`
- Remove any `<script>` tags (not allowed in emails)

### Personalization Not Working
- Use double curly braces: `{{name}}` not `{name}`
- Case-sensitive: `{{name}}` not `{{Name}}`
- In preview, appears as "Sample Recipient"
- Real names used when actually sending

### Links Not Clickable
- Ensure proper format: `<a href="https://...">text</a>`
- Use full URLs including `https://`
- Test by clicking in preview mode
- Some email clients block links by default (user must allow)

## ✅ Pre-Send Checklist

Before sending to 500 recipients:

- [ ] HTML pasted and formatted correctly
- [ ] Preview looks good in Split View
- [ ] Personalization (`{{name}}`) in place
- [ ] All links tested and working
- [ ] Subject line reviewed
- [ ] From/Reply-To addresses correct
- [ ] Full email preview checked
- [ ] Test email sent to yourself
- [ ] Test email looks good in your inbox
- [ ] Colleague reviewed test email

## 🎉 You're Ready!

The new HTML editor makes it easy to:
- ✅ Paste HTML from any source
- ✅ Edit with live preview
- ✅ See changes instantly
- ✅ Verify formatting before sending
- ✅ Add personalization easily
- ✅ Create professional emails quickly

**Start with Split View mode - it's the best way to work!**

---

Need the sample template? **Use:** `sample-bulk-email-currumbin.html`

Ready to send? Follow the steps above and you'll have your campaign sent in minutes!

