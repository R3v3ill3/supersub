# Google Places API Setup Guide

## Overview

The web application now uses Google Places Autocomplete for the **Residential Address** field in the submission form. This provides users with address suggestions as they type, and automatically populates suburb, state, and postcode fields.

## Features

✅ **Address autocomplete** - Suggestions appear as user types  
✅ **Australia-only** - Restricted to Australian addresses  
✅ **Auto-fill** - Automatically fills suburb, state, and postcode  
✅ **Graceful fallback** - Works as regular input if API key not configured  
✅ **User-friendly** - Manual editing still possible after selection

## Setup Instructions

### Step 1: Get a Google Places API Key

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create a new project (or select existing)**
   - Click the project dropdown at the top
   - Click "New Project"
   - Name it (e.g., "DA Submission Manager")
   - Click "Create"

3. **Enable the Places API**
   - Go to: https://console.cloud.google.com/apis/library
   - Search for "Places API"
   - Click on "Places API"
   - Click "Enable"

4. **Create API Key**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Click "+ CREATE CREDENTIALS"
   - Select "API key"
   - Copy the API key (you'll need this!)

5. **Restrict the API Key (IMPORTANT for security)**
   - Click on the newly created API key to edit it
   - Under "API restrictions":
     - Select "Restrict key"
     - Check only "Places API"
   - Under "Website restrictions":
     - Select "HTTP referrers (websites)"
     - Add your domains:
       - `localhost:*` (for local development)
       - `*.vercel.app/*` (if using Vercel)
       - `yourdomain.com/*` (your production domain)
   - Click "Save"

### Step 2: Add API Key to Environment Variables

#### For Local Development

Add to `/apps/web/.env.local` (create if doesn't exist):

```bash
VITE_GOOGLE_PLACES_API_KEY=your_api_key_here
```

#### For Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to: Settings → Environment Variables
3. Add a new variable:
   - **Name**: `VITE_GOOGLE_PLACES_API_KEY`
   - **Value**: Your API key
   - **Environments**: Production, Preview, Development (select all)
4. Click "Save"
5. Redeploy your application

#### For Railway Deployment (API)

Note: The API doesn't need this key - it's only for the web frontend.

### Step 3: Test the Integration

1. **Start the development server**
   ```bash
   cd apps/web
   pnpm dev
   ```

2. **Navigate to the form**
   - Go to: http://localhost:5173/high-trees-currumbin-valley (or your project slug)

3. **Test the Residential Address field**
   - Click on the "Residential Address" field
   - Start typing an address (e.g., "123 Main")
   - You should see address suggestions appear
   - Select an address
   - Verify that Suburb, State, and Postcode auto-fill

### Step 4: Verify Everything Works

**Expected Behavior:**
- ✅ Address suggestions appear as you type
- ✅ Selecting an address fills the street address field
- ✅ Suburb, State, and Postcode are automatically populated
- ✅ You can still manually edit any field after selection

**Fallback Behavior (if API key not set):**
- Field works as regular text input
- Small info message appears: "Address autocomplete unavailable - API key not configured"
- All fields remain manually editable

## How It Works

### Component: `GoogleAddressAutocomplete.tsx`

Located at: `/apps/web/src/components/GoogleAddressAutocomplete.tsx`

**Key Features:**
- Uses `@react-google-maps/api` library
- Restricts to Australian addresses only
- Parses address components (street, suburb, state, postcode)
- Provides callback with parsed components
- Falls back gracefully if API unavailable

### Integration: `SubmissionForm.tsx`

**What was changed:**
- Replaced standard input field with `GoogleAddressAutocomplete` component
- Added `onAddressSelect` callback to auto-fill related fields
- Kept manual editing capability for all fields

**Location:**
- Section: "Submitter Details"
- Field: "Residential Address *"
- Lines: ~666-721 in `SubmissionForm.tsx`

## Cost Estimation

### Google Places API Pricing

- **Autocomplete - Per Session**: $2.83 per 1,000 sessions
- **Session**: Starts when user types, ends when they select an address
- **Monthly Free Credit**: $200 (covers ~70,000 autocomplete sessions)

**For most use cases, the free tier will be sufficient!**

Example costs:
- 100 submissions/month: ~$0.28 (FREE)
- 1,000 submissions/month: ~$2.83 (FREE)
- 10,000 submissions/month: ~$28.30

### Setting a Budget Alert

1. Go to: https://console.cloud.google.com/billing
2. Click "Budgets & alerts"
3. Click "+ CREATE BUDGET"
4. Set a monthly budget (e.g., $10)
5. Set alert threshold (e.g., 50%, 90%, 100%)

## Troubleshooting

### Issue: "Address autocomplete unavailable - API key not configured"

**Solution:**
- Verify `VITE_GOOGLE_PLACES_API_KEY` is set in environment variables
- Restart the dev server after adding the key
- Check the browser console for errors

### Issue: "This page can't load Google Maps correctly"

**Solution:**
- Verify the API key is correct
- Check that Places API is enabled in Google Cloud Console
- Verify API key restrictions allow your domain

### Issue: Addresses not appearing

**Solution:**
- Check browser console for errors
- Verify API key restrictions (HTTP referrers)
- Ensure Places API is enabled (not just Maps API)
- Check your Google Cloud billing account is active

### Issue: Only partial address fills

**Solution:**
- This is expected for some addresses
- Google may not have all components (especially for rural areas)
- Users can manually fill missing fields
- Component works correctly - this is a data limitation

## Security Best Practices

1. ✅ **Restrict API Key** - Only enable Places API, not all Google APIs
2. ✅ **Website Restrictions** - Limit to your specific domains
3. ✅ **Environment Variables** - Never commit API keys to git
4. ✅ **Budget Alerts** - Set up billing alerts to avoid surprises
5. ✅ **Monitor Usage** - Regularly check API usage in Google Cloud Console

## Testing Checklist

- [ ] API key created and restricted
- [ ] Environment variable set (`VITE_GOOGLE_PLACES_API_KEY`)
- [ ] Dev server restarted
- [ ] Address suggestions appear when typing
- [ ] Selecting address fills all fields correctly
- [ ] Manual editing still works
- [ ] Works on production/staging environment
- [ ] Fallback works when API key removed

## Support

**Google Cloud Console:** https://console.cloud.google.com/  
**Places API Documentation:** https://developers.google.com/maps/documentation/places/web-service  
**Pricing Information:** https://developers.google.com/maps/documentation/places/web-service/usage-and-billing

---

## Files Modified

1. **NEW:** `/apps/web/src/components/GoogleAddressAutocomplete.tsx`
   - Custom autocomplete component with Australian address support

2. **MODIFIED:** `/apps/web/src/pages/SubmissionForm.tsx`
   - Integrated GoogleAddressAutocomplete for Residential Address field
   - Auto-fills suburb, state, postcode when address selected

3. **MODIFIED:** `/apps/web/package.json`
   - Added dependency: `@react-google-maps/api`

## Environment Variables

### Required
- `VITE_GOOGLE_PLACES_API_KEY` - Google Places API key (web app only)

### Optional
- None

---

*Last updated: October 1, 2025*

