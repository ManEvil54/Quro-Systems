import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { db as clientDb } from '@/lib/firebase/client';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Initialize Firebase Admin safely
let adminDb: any = null;
try {
  // Only attempt to initialize if not already initialized
  const adminApp = getApps().length === 0 ? initializeApp() : getApp();
  adminDb = getFirestore(adminApp);
} catch (e) {
  console.warn('Firebase Admin SDK initialization skipped (using client SDK fallback for database writes):', e);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, organization, phone, message } = body;

    // Server-side validation
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and Email are required fields.' },
        { status: 400 }
      );
    }

    const leadData = {
      name,
      email,
      organization: organization || '',
      phone: phone || '',
      message: message || '',
      source: 'landing_page_demo_request',
    };

    // 1. Store in Firestore (under demo_leads collection)
    let leadSaved = false;
    let savedId = '';
    
    if (adminDb) {
      try {
        const docRef = await adminDb.collection('demo_leads').add({
          ...leadData,
          created_at: Timestamp.now(),
        });
        savedId = docRef.id;
        leadSaved = true;
      } catch (dbErr) {
        console.error('Firebase Admin write failed, trying client SDK:', dbErr);
      }
    }

    // Fallback to client Firestore write if Admin SDK failed/was unconfigured
    if (!leadSaved) {
      try {
        const docRef = await addDoc(collection(clientDb, 'demo_leads'), {
          ...leadData,
          created_at: serverTimestamp(),
        });
        savedId = docRef.id;
        leadSaved = true;
      } catch (clientDbErr) {
        console.error('Failed to write lead to Firestore:', clientDbErr);
      }
    }

    // 2. Dispatch email to info@qurosystems.com via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    let emailSent = false;
    let emailError = null;

    if (resendApiKey) {
      try {
        // Send from onboarding@resend.dev to avoid SPF/DKIM validation blocking on unconfigured custom domains
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'Quro Systems <contact@qurosystems.com>',
            to: 'info@qurosystems.com',
            subject: `New Quro Demo Request: ${name}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
                <h2 style="color: #0d9488; font-weight: 600; margin-top: 0; margin-bottom: 20px; font-size: 24px; border-bottom: 2px solid #f0fdfa; padding-bottom: 12px;">
                  New Demo Request Received
                </h2>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                  A user has requested a Quro Systems demo via the website landing page. Details are provided below:
                </p>
                <table style="width: 100%; border-collapse: collapse; margin: 25px 0;">
                  <tr>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #1e293b; width: 140px; font-size: 14px;">Name:</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 14px;">${name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #1e293b; font-size: 14px;">Email:</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #0d9488; font-size: 14px;"><a href="mailto:${email}" style="color: #0d9488; text-decoration: none;">${email}</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #1e293b; font-size: 14px;">Organization:</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 14px;">${organization || 'Not provided'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #1e293b; font-size: 14px;">Phone:</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 14px;">${phone || 'Not provided'}</td>
                  </tr>
                </table>
                <div style="margin-top: 20px; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                  <h4 style="margin-top: 0; margin-bottom: 8px; color: #1e293b; font-weight: 600; font-size: 13px; text-transform: uppercase; tracking: 0.05em;">Message / Notes:</h4>
                  <p style="margin: 0; color: #475569; font-size: 14px; white-space: pre-wrap; line-height: 1.6;">${message || 'No additional details provided.'}</p>
                </div>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
                  Record ID: ${savedId || 'Not Saved'} · Submitted on ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST
                </p>
              </div>
            `,
          }),
        });

        if (emailRes.ok) {
          emailSent = true;
        } else {
          const errBody = await emailRes.text();
          console.error('Resend API Error response:', errBody);
          emailError = `Resend status: ${emailRes.status} - ${errBody}`;
        }
      } catch (err: any) {
        console.error('Email dispatch failed:', err);
        emailError = err.message || err;
      }
    } else {
      console.warn('RESEND_API_KEY is not defined. Email dispatch skipped.');
      emailError = 'RESEND_API_KEY environment variable is missing';
    }

    return NextResponse.json({
      success: true,
      lead_saved: leadSaved,
      email_sent: emailSent,
      lead_id: savedId,
      error_details: emailError,
    });
  } catch (error: any) {
    console.error('Contact submit API failure:', error);
    return NextResponse.json(
      { error: 'Failed to process submission', details: error.message },
      { status: 500 }
    );
  }
}
