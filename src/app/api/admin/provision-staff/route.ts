import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/server/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized: Token verification failed' }, { status: 401 });
    }

    const callerUid = decodedToken.uid;

    // 2. Fetch the caller's Firestore profile to verify role and organization
    const callerUserDoc = await adminDb.collection('users').doc(callerUid).get();
    if (!callerUserDoc.exists) {
      return NextResponse.json({ error: 'Forbidden: Caller profile not found' }, { status: 403 });
    }

    const callerData = callerUserDoc.data();
    const callerRole = callerData?.role || '';
    const callerOrgId = callerData?.org_id || '';

    // Verify the caller has administrative rights
    const isSystemAdmin = ['APP_OWNER', 'APP_TECH', 'SUPER_ADMIN'].includes(callerRole);
    const isClientAdmin = ['CLIENT_ADMIN', 'FACILITY_ADMIN'].includes(callerRole);

    if (!isSystemAdmin && !isClientAdmin) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    // 3. Parse and validate parameters
    const body = await req.json();
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      role, 
      credential, 
      duration, 
      assignedFacilityIds 
    } = body;

    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json({ error: 'Bad Request: Missing required fields' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Bad Request: Password must be at least 6 characters' }, { status: 400 });
    }

    // Multi-tenant check: non-system administrators can only provision within their own organization
    let targetOrgId = callerOrgId;
    if (isSystemAdmin) {
      targetOrgId = body.orgId || callerOrgId || 'SYSTEM';
    }

    if (!targetOrgId) {
      return NextResponse.json({ error: 'Bad Request: Target organization ID is required' }, { status: 400 });
    }

    // Format sign-on name: if email has no '@', append our default domain
    let formattedEmail = email.trim();
    if (!formattedEmail.includes('@')) {
      formattedEmail = `${formattedEmail.toLowerCase()}@quro-member.com`;
    }

    // Calculate expiration date
    const expiresAt = duration === 'permanent' || !duration
      ? null
      : new Date(Date.now() + parseInt(duration) * 60 * 60 * 1000).toISOString();

    // 4. Create user in Firebase Auth
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email: formattedEmail,
        password: password,
        displayName: `${firstName.trim()} ${lastName.trim()}`,
      });
    } catch (createErr: any) {
      console.error('Firebase Auth user creation error:', createErr);
      if (createErr.code === 'auth/email-already-exists') {
        return NextResponse.json({ error: 'An account with this sign-on name or email already exists.' }, { status: 409 });
      }
      if (createErr.code === 'auth/invalid-email') {
        return NextResponse.json({ error: 'The sign-on name contains invalid characters.' }, { status: 400 });
      }
      return NextResponse.json({ error: createErr.message || 'Failed to create authentication user.' }, { status: 500 });
    }

    const newUid = userRecord.uid;

    try {
      // 5. Create global user record in Firestore
      await adminDb.collection('users').doc(newUid).set({
        auth_id: newUid,
        org_id: targetOrgId,
        facility_id: (assignedFacilityIds && assignedFacilityIds[0]) || null,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        initials: (firstName.trim().charAt(0) + lastName.trim().charAt(0)).toUpperCase(),
        role: role,
        credential: credential?.trim() || null,
        email: formattedEmail,
        phone: null,
        is_active: true,
        is_onboarded: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // 6. Create staff profile in Firestore inside target organization
      await adminDb.collection('organizations').doc(targetOrgId).collection('staff').doc(newUid).set({
        auth_id: newUid,
        org_id: targetOrgId,
        facility_id: (assignedFacilityIds && assignedFacilityIds[0]) || null,
        assigned_facility_ids: assignedFacilityIds || [],
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        initials: (firstName.trim().charAt(0) + lastName.trim().charAt(0)).toUpperCase(),
        email: formattedEmail,
        role: role,
        credential: credential?.trim() || null,
        is_active: true,
        is_onboarded: false,
        must_change_password: true, // Force password change
        access_expires_at: expiresAt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      return NextResponse.json({ success: true, uid: newUid });
    } catch (dbErr: any) {
      console.error('Firestore record creation error, rolling back auth:', dbErr);
      // Rollback Auth creation if database write fails to keep state consistent
      try {
        await adminAuth.deleteUser(newUid);
      } catch (delErr) {
        console.error('Auth user rollback deletion failed:', delErr);
      }
      return NextResponse.json({ error: 'Failed to create database profiles. Auth creation rolled back.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Provision staff API failure:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  }
}
