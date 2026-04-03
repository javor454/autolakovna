# Final Solution: Custom Form with Folder Organization

## Why Not Google Forms?

**Google Forms requires users to sign in with a Google account when uploading files.** This is a dealbreaker for customers who don't have or don't want to use Google accounts.

## What We Built Instead

Enhanced your existing custom form to create **organized folders per inquiry** with **immutable records**.

## How It Works

### User Flow
1. Customer visits your site
2. Fills out form (no login required)
3. Uploads 1-5 photos (max 3MB total)
4. Submits → instant confirmation

### Backend Flow
```
Submit form
    ↓
Create folder: "2026-04-03T14-30-00-000Z_Jan_Novak/"
    ↓
Upload photos to that folder
    ↓
Create _ZAZNAM.txt with form data (immutable record)
    ↓
Send email notification (optional)
```

### Result in Google Drive
```
Your Parent Folder/
├── 2026-04-03T14-30-00-000Z_Jan_Novak/
│   ├── _ZAZNAM.txt (name, email, phone, message, timestamp)
│   ├── IMG_0123.jpg
│   ├── IMG_0124.jpg
│   └── IMG_0125.jpg
├── 2026-04-03T15-45-00-000Z_Petr_Svoboda/
│   ├── _ZAZNAM.txt
│   └── photo1.jpg
└── ...
```

## What Changed (vs Original)

**Before:**
- All photos uploaded to single parent folder with timestamp prefixes
- No form data saved
- No organization

**After:**
- ✅ Unique folder per inquiry
- ✅ Immutable `_ZAZNAM.txt` record in each folder
- ✅ Photos organized by inquiry
- ✅ Clean filenames (no timestamp prefixes)

**Code diff:** +45 lines in `api/contact.js`

## Key Features

### 1. Folder Per Inquiry
Each submission creates folder: `TIMESTAMP_SANITIZED_NAME/`
- Timestamp: ISO format for perfect sorting
- Name: Customer name (sanitized, max 30 chars)

### 2. Immutable Record
`_ZAZNAM.txt` contains:
```
Poptávka Lak&Go
Datum: 3. 4. 2026 14:30:00
Jméno: Jan Novák
E-mail: jan@seznam.cz
Telefon: +420 123 456 789

Popis:
Škrábnutí na levých dveřích...

Nahrané fotky: IMG_0123.jpg, IMG_0124.jpg
```

Cannot be edited from form system (created server-side).

### 3. No Login Required
- Customer needs NO Google account
- Works for anyone with internet
- No friction in conversion funnel

### 4. Access Control (Optional)

Add shop worker as viewer (cannot edit/delete):

```javascript
// In api/contact.js after folder creation
const drive = google.drive({ version: 'v3', auth: authClient });
await drive.permissions.create({
  fileId: inquiryFolderId,
  requestBody: {
    role: 'reader',
    type: 'user',
    emailAddress: 'shopworker@gmail.com',
  },
});
```

## Advantages vs Google Forms

| Feature | Custom Solution | Google Forms |
|---------|----------------|--------------|
| Login required | ❌ No | ✅ Yes (with files) |
| Max file size | 3 MB (Vercel limit) | 10 GB |
| Folder per inquiry | ✅ Yes | Via Apps Script |
| Immutable record | ✅ Yes (`_ZAZNAM.txt`) | Via Apps Script |
| Custom design | ✅ Full control | Limited styling |
| Code to maintain | 427 lines | 40 lines Apps Script |
| Embedded in site | ✅ Yes | ❌ No (with files) |
| Spam protection | Manual | Built-in |

## Cost

- **Google Drive:** Free (15 GB)
- **Vercel:** Free tier (serverless functions)
- **Resend Email:** Optional, free tier 100/month (or skip entirely)

## Constraints

- **3 MB total** for all photos (Vercel body size limit)
- **60 seconds** max execution time (Vercel serverless)
- Customer must have stable internet for upload

## Testing

1. `make dev`
2. Fill form with 2-3 photos
3. Check Drive folder created
4. Check `_ZAZNAM.txt` exists
5. Check photos uploaded
6. Check email received (if configured)

## Maintenance

- OAuth tokens expire → refresh (handled automatically)
- Monitor Vercel function logs for errors
- Check Drive quota periodically

## Future Enhancements (Optional)

1. **Thumbnail generation** — create preview images
2. **Email with Drive link** — include folder URL in notification
3. **Admin dashboard** — view all inquiries in one place
4. **Auto-response email** — confirm receipt to customer
5. **Larger files** — use S3/Cloudflare R2 for photos > 3MB
