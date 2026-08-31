import type { Env, AppIdentity } from '../lib/Identity';
import devUser from '../fixtures/devUser.json';

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  colorId?: string;
  location?: string;
  description?: string;
}

const JsonHeader = {
  headers: {
    'content-type': 'application/json;charset=UTF-8',
  },
};

const errorResponse = (error: string) =>
  new Response(JSON.stringify({ error }), JsonHeader);

const formatCalendarEvent = (googleEvent: any): CalendarEvent => {
  const start = googleEvent.start.dateTime || googleEvent.start.date;
  const end = googleEvent.end.dateTime || googleEvent.end.date;

  return {
    id: googleEvent.id,
    summary: googleEvent.summary || 'No Title',
    start,
    end,
    allDay: !!googleEvent.start.date,
    status: googleEvent.status as 'confirmed' | 'tentative' | 'cancelled',
    colorId: googleEvent.colorId,
    location: googleEvent.location,
    description: googleEvent.description,
  };
};

export const onRequest: PagesFunction<Env, never> = async ({ env, request }) => {
  console.log('[calendar] Starting request');
  console.log('[calendar] URL:', request.url);

  // Handle dev mode - use devUser directly
  if (env.ENVIRONMENT === 'development') {
    console.log('[calendar] Dev mode - using devUser');
    // devUser has 'id' but AppIdentity expects 'userId'
    const identity = {
      id: devUser.id,
      userId: devUser.id,
      displayName: devUser.displayName,
      email: devUser.email,
      providerName: devUser.providerName,
      cfProviderId: devUser.idp.id,
      providerId: 1, // Default provider ID for google
      providerIdentityId: devUser.idp.id,
    } as AppIdentity;
    return handleCalendarRequest({ env, request, identity });
  }

  // Step 1: Get identity
  console.log('[calendar] Calling GetIdentity...');
  const { identity, error } = await GetIdentity(request, env);

  if (error) {
    console.log('[calendar] GetIdentity error:', error);
    return errorResponse(error);
  }
  if (!identity) {
    console.log('[calendar] No identity returned');
    return errorResponse('Unexpected Null Identity');
  }
  console.log('[calendar] Identity found:', identity.email, 'userId:', identity.userId);

  return handleCalendarRequest({ env, request, identity });
};

// Shared handler for calendar request processing
const handleCalendarRequest = async ({
  env,
  request,
  identity,
}: {
  env: Env;
  request: Request;
  identity: AppIdentity;
}) => {
  console.log('[calendar] Processing calendar request for userId:', identity.userId);

  // Step 2: Parse query params
  const url = new URL(request.url);
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  console.log('[calendar] startDate:', startDate, 'endDate:', endDate);

  if (!startDate || !endDate) {
    console.log('[calendar] Missing query params');
    return errorResponse('startDate and endDate parameters required');
  }

  // Step 3: Get OAuth token
  console.log('[calendar] Querying OAuthTokens for userId:', identity.userId);
  const tokenResult = await env.DB.prepare(
    `SELECT accessToken, refreshToken, expiresAt FROM OAuthTokens
     WHERE userId = ? AND provider = 'google'`
  ).bind(identity.userId).first<{ accessToken: string; refreshToken: string; expiresAt: number }>();

  console.log('[calendar] Token result:', tokenResult);

  if (!tokenResult) {
    console.log('[calendar] No OAuth tokens found - calendar not connected');
    return errorResponse('Calendar not connected');
  }

  let accessToken = tokenResult.accessToken;
  let shouldRefresh = false;

  if (Date.now() >= tokenResult.expiresAt) {
    shouldRefresh = true;
    console.log('[calendar] Token expired, should refresh');
  }

  if (shouldRefresh && tokenResult.refreshToken) {
    console.log('[calendar] Refreshing access token...');
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    const refreshResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GOOGLE_OAUTH_CLIENT,
        client_secret: env.GOOGLE_OAUTH_SECRET,
        refresh_token: tokenResult.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    console.log('[calendar] Refresh response status:', refreshResponse.status);

    if (!refreshResponse.ok) {
      const errorData = await refreshResponse.json();
      console.log('[calendar] Refresh failed:', errorData);
      return errorResponse('Failed to refresh calendar token');
    }

    const refreshData = await refreshResponse.json<{
      access_token: string;
      expires_in: number;
    }>();

    accessToken = refreshData.access_token;
    console.log('[calendar] Got new access token');

    const newExpiresAt = Date.now() + (refreshData.expires_in - 5 * 60) * 1000;
    await env.DB.prepare(
      `UPDATE OAuthTokens SET accessToken = ?, expiresAt = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE userId = ? AND provider = 'google'`
    ).bind(accessToken, newExpiresAt, identity.userId);
    console.log('[calendar] Updated token in DB');
  }

  // Step 4: Fetch calendar events
  try {
    const timeMin = new Date(parseInt(startDate)).toISOString();
    const timeMax = new Date(parseInt(endDate)).toISOString();

    const calendarUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;

    console.log('[calendar] Fetching from Google API...');
    const calendarResponse = await fetch(calendarUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('[calendar] Google API response status:', calendarResponse.status);
    console.log('[calendar] Google API response headers:', Object.fromEntries(calendarResponse.headers.entries()));

    if (!calendarResponse.ok) {
      const errorData = await calendarResponse.json();
      console.log('[calendar] Google API error:', errorData);
      return errorResponse(errorData.error?.message || 'Failed to fetch calendar events');
    }

    const calendarData = await calendarResponse.json<{ items: any[] }>();
    console.log('[calendar] Calendar data received, items count:', calendarData.items?.length || 0);

    const events = calendarData.items
      ? calendarData.items.filter((e) => e.status !== 'cancelled').map(formatCalendarEvent)
      : [];
    console.log('[calendar] Final events count:', events.length);

    return new Response(
      JSON.stringify(
        {
          events,
          meta: {
            fetchedAt: new Date().toISOString(),
            count: events.length,
          },
        },
        null,
        2
      ),
      JsonHeader
    );
  } catch (err) {
    console.error('[calendar] Exception:', err);
    return errorResponse(`Error fetching calendar: ${(err as Error).message}`);
  }
};
