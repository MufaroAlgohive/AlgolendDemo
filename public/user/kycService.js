const axios = require('axios');
const crypto = require('crypto');
const BASE_URL = 'https://verification.didit.me';

const { supabaseService, supabaseStorage } = require('../../config/supabaseServer');

// In-memory session storage (still used as short-term cache)
const sessions = new Map();

function verifyWebhookSignature(payload, signature) {
  try {
    const WEBHOOK_SECRET_KEY = process.env.DIDIT_WEBHOOK_SECRET_KEY;
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET_KEY);
    hmac.update(JSON.stringify(payload));
    const computedSignature = hmac.digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );
  } catch (error) {
    return false;
  }
}

async function createSession({ userId, email, phone, metadata }) {
  const API_KEY = process.env.DIDIT_API_KEY;
  const WORKFLOW_ID = process.env.DIDIT_WORKFLOW_ID;

  if (!userId || !email) {
    throw new Error('userId and email are required');
  }

  const response = await axios.post(
    `${BASE_URL}/v2/session/`,
    {
      workflow_id: WORKFLOW_ID,
      vendor_data: userId,
      metadata: metadata || {},
      contact_details: {
        email,
        email_lang: 'en',
        phone: phone || undefined
      }
    },
    {
      headers: {
        'X-Api-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    }
  );

  const sessionData = response.data;
  sessions.set(sessionData.session_id, {
    userId,
    sessionId: sessionData.session_id,
    sessionToken: sessionData.session_token,
    status: sessionData.status,
    email,
    createdAt: new Date().toISOString()
  });

  // Persist session snapshot for cross-server restarts
  try {
    const dbClient = supabaseService;

    const { data: existingSessions } = await dbClient
      .from('kyc_sessions')
      .select('session_id, status')
      .eq('user_id', userId);

    if (existingSessions?.length) {
      const pruneIds = existingSessions
        .filter(({ status }) => {
          const normalized = (status || '').toString().trim().toLowerCase();
          return normalized === 'not started' || normalized === '' || normalized === 'created';
        })
        .map(({ session_id }) => session_id);

      if (pruneIds.length) {
        await dbClient
          .from('kyc_sessions')
          .delete()
          .in('session_id', pruneIds);
      }
    }

    await dbClient.from('kyc_sessions').insert({
      session_id: sessionData.session_id,
      user_id: userId,
      status: sessionData.status,
      session_token: sessionData.session_token,
      verification_url: sessionData.url,
      created_at: new Date().toISOString()
    });
  } catch (dbError) {
    console.error('Error saving KYC session to database:', dbError);
  }

  return {
    success: true,
    session_id: sessionData.session_id,
    verification_url: sessionData.url,
    status: sessionData.status
  };
}

async function downloadAndUploadImage(imageUrl, userId, imageType, bucketName = 'documents') {
  try {
    if (!imageUrl) {
      return null;
    }

    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const extension = contentType.includes('png') ? 'png' : 'jpg';
    const timestamp = Date.now();
    const fileName = `kyc/${userId}_${imageType}_${timestamp}.${extension}`;

    const storageClient = supabaseStorage;
    const { error } = await storageClient.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType,
        upsert: false
      });

    if (error) {
      console.error(`Storage upload failed for ${imageType}:`, error);
      return null;
    }

    const { data: urlData } = storageClient.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return urlData?.publicUrl || null;
  } catch (err) {
    console.error(`Error processing ${imageType}:`, err);
    return null;
  }
}

async function updateSessionFromWebhook(payload) {
  const { session_id, status, event_type } = payload;
  const normalizedStatus = (status || '').toString().trim().toLowerCase();

  if (sessions.has(session_id)) {
    const session = sessions.get(session_id);
    session.status = status;
    session.lastUpdated = new Date().toISOString();
    session.eventType = event_type;
    sessions.set(session_id, session);
  }

  const dbClient = supabaseService;
  let userId = sessions.get(session_id)?.userId || null;

  if (!userId) {
    try {
      const { data } = await dbClient
        .from('kyc_sessions')
        .select('user_id')
        .eq('session_id', session_id)
        .single();
      userId = data?.user_id || null;
    } catch (err) {
      console.error('Unable to fetch user_id for KYC webhook:', err);
    }
  }

  let extractedData = null;
  if (normalizedStatus === 'approved') {
    try {
      const sessionDetails = await getSessionStatus(session_id);
      extractedData = sessionDetails?.details || null;
    } catch (err) {
      console.error('Failed to fetch session details for approved KYC:', err);
    }
  }

  try {
    const updateData = {
      status,
      event_type,
      last_updated: new Date().toISOString()
    };

    if (extractedData) {
      const idVerification = extractedData.id_verification || extractedData.ID_Verification;
      const phoneData = extractedData.phone;

      if (idVerification) {
        if (idVerification.first_name) updateData.first_name = idVerification.first_name;
        if (idVerification.last_name) updateData.last_name = idVerification.last_name;
        if (!updateData.first_name && idVerification.full_name) {
          const parts = idVerification.full_name.split(' ');
          updateData.first_name = parts[0];
          if (parts.length > 1) {
            updateData.last_name = parts.slice(1).join(' ');
          }
        }

        const docNumber = idVerification.document_number
          || idVerification.id_number
          || idVerification.personal_number;
        if (docNumber) {
          updateData.id_number = docNumber;
        }

        const gender = idVerification.gender || idVerification.sex;
        if (gender) {
          updateData.gender = gender;
        }

        const dob = idVerification.date_of_birth || idVerification.birth_date;
        if (dob) {
          updateData.date_of_birth = dob;
        }

        if (idVerification.address || idVerification.formatted_address) {
          updateData.address = idVerification.address || idVerification.formatted_address;
        }

        if (idVerification.parsed_address) {
          const parsed = idVerification.parsed_address;
          if (parsed.street) updateData.address = parsed.street;
          if (parsed.city) updateData.city = parsed.city;
          if (parsed.postal_code) updateData.postal_code = parsed.postal_code;
          if (parsed.state) updateData.province = parsed.state;
          if (parsed.country) updateData.country = parsed.country;
        }

        if (userId && normalizedStatus === 'approved') {
          const [frontUrl, backUrl, selfieUrl] = await Promise.all([
            downloadAndUploadImage(idVerification.front_image || idVerification.full_front_image, userId, 'id_front'),
            downloadAndUploadImage(idVerification.back_image || idVerification.full_back_image, userId, 'id_back'),
            downloadAndUploadImage(idVerification.portrait_image, userId, 'selfie')
          ]);

          updateData.id_front_image_url = frontUrl || idVerification.front_image || idVerification.full_front_image || null;
          updateData.id_back_image_url = backUrl || idVerification.back_image || idVerification.full_back_image || null;
          updateData.selfie_image_url = selfieUrl || idVerification.portrait_image || null;
        } else {
          if (idVerification.front_image || idVerification.full_front_image) {
            updateData.id_front_image_url = idVerification.front_image || idVerification.full_front_image;
          }
          if (idVerification.back_image || idVerification.full_back_image) {
            updateData.id_back_image_url = idVerification.back_image || idVerification.full_back_image;
          }
          if (idVerification.portrait_image) {
            updateData.selfie_image_url = idVerification.portrait_image;
          }
        }
      }

      if (phoneData?.full_number) {
        updateData.phone_number = phoneData.full_number;
      }

      updateData.extracted_data = extractedData;
    }

    const { error } = await dbClient
      .from('kyc_sessions')
      .update(updateData)
      .eq('session_id', session_id);

    if (error) {
      console.error('Error updating KYC session in database:', error);
    } else if (normalizedStatus === 'approved' && userId && updateData.phone_number) {
      const { error: profileError } = await dbClient
        .from('profiles')
        .update({ contact_number: updateData.phone_number })
        .eq('id', userId);

      if (profileError) {
        console.error('Failed to sync profile phone number:', profileError);
      }
    }
  } catch (dbError) {
    console.error('Error applying KYC webhook update:', dbError);
  }
}

async function getSessionStatus(sessionId) {
  const API_KEY = process.env.DIDIT_API_KEY;
  if (sessions.has(sessionId)) {
    const sessionData = sessions.get(sessionId);
    try {
      const response = await axios.get(
        `${BASE_URL}/v2/session/${sessionId}/decision/`,
        { headers: { 'X-Api-Key': API_KEY } }
      );
      return {
        success: true,
        session: sessionData,
        details: response.data
      };
    } catch (apiError) {
      return {
        success: true,
        session: sessionData
      };
    }
  }

  const response = await axios.get(
    `${BASE_URL}/v2/session/${sessionId}/decision/`,
    { headers: { 'X-Api-Key': API_KEY } }
  );

  return {
    success: true,
    details: response.data
  };
}

async function getUserKycStatus(userId) {
  try {
    const dbClient = supabaseService;
    const { data, error } = await dbClient
      .from('kyc_sessions')
      .select('session_id, status, event_type, last_updated, created_at')
      .eq('user_id', userId)
      .order('last_updated', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      const statusStr = (data.status || '').toString().trim();
      const normalizedStatus = statusStr.toLowerCase();
      const isApproved = normalizedStatus === 'approved';

      return {
        verified: isApproved,
        status: data.status,
        normalizedStatus,
        sessionId: data.session_id,
        updatedAt: data.last_updated || data.created_at,
        eventType: data.event_type
      };
    }
  } catch (dbError) {
    console.error('Error fetching KYC status from database:', dbError);
  }

  const userSessions = Array.from(sessions.values())
    .filter(session => session.userId === userId);

  if (!userSessions.length) {
    return {
      verified: false,
      message: 'No KYC sessions found'
    };
  }

  const latestSession = userSessions.sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  )[0];

  return {
    verified: latestSession.status === 'Approved',
    status: latestSession.status,
    sessionId: latestSession.sessionId,
    updatedAt: latestSession.lastUpdated || latestSession.createdAt
  };
}

module.exports = {
  verifyWebhookSignature,
  createSession,
  updateSessionFromWebhook,
  getSessionStatus,
  getUserKycStatus,
  sessions
};
