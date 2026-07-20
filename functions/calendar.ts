import type { Env } from '../lib/Identity';
import { GetIdentity } from '../lib/Identity';

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
  const { identity, error } = await GetIdentity(request, env);

  if (error) return errorResponse(error);
  if (!identity) return errorResponse('Unexpected Null Identity');

  const url = new URL(request.url);
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  if (!startDate || !endDate) {
    return errorResponse('startDate and endDate parameters required');
  }

  // Get OAuth token for user
  const tokenResult = await env.DB.prepare(
    `SELECT accessToken, refreshToken, expiresAt FROM OAuthTokens
     WHERE userId = ? AND provider = 'google'`
  ).bind(identity.userId).first<{ accessToken: string; refreshToken: string; expiresAt: number }>();

  if (!tokenResult) {
    return errorResponse('Calendar not connected');
  }

  let accessToken = tokenResult.accessToken;
  let shouldRefresh = false;

  if (Date.now() >= tokenResult.expiresAt) {
    shouldRefresh = true;
  }

  if (shouldRefresh && tokenResult.refreshToken) {
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

    if (!refreshResponse.ok) {
      return errorResponse('Failed to refresh calendar token');
    }

    const refreshData = await refreshResponse.json<{
      access_token: string;
      expires_in: number;
    }>();

    accessToken = refreshData.access_token;

    const newExpiresAt = Date.now() + (refreshData.expires_in - 5 * 60) * 1000;
    await env.DB.prepare(
      `UPDATE OAuthTokens SET accessToken = ?, expiresAt = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE userId = ? AND provider = 'google'`
    ).bind(accessToken, newExpiresAt, identity.userId);
  }

  try {
    const timeMin = new Date(parseInt(startDate)).toISOString();
    const timeMax = new Date(parseInt(endDate)).toISOString();

    const calendarUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;

    const calendarResponse = await fetch(calendarUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!calendarResponse.ok) {
      const errorData = await calendarResponse.json();
      return errorResponse(errorData.error?.message || 'Failed to fetch calendar events');
    }

    const calendarData = await calendarResponse.json<{ items: any[] }>();

    const events = calendarData.items
      .filter((e) => e.status !== 'cancelled')
      .map(formatCalendarEvent);

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
    return errorResponse(`Error fetching calendar: ${(err as Error).message}`);
  }
};
