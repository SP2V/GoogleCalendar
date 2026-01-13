/**
 * Create a new event using Direct Google Calendar API
 * @param {Object} eventData - { title, startTime, endTime, description, location, targetAdminEmail }
 * @param {string} token - Google Access Token
 */
export const createCalendarEvent = async (eventData, token) => {
  if (!token) {
    console.error("No Access Token provided for Calendar API");
    return { status: 'error', message: 'No Access Token' };
  }

  const event = {
    summary: eventData.title,
    location: eventData.location,
    description: eventData.description,
    start: {
      dateTime: eventData.startTime,
      timeZone: 'Asia/Bangkok', // Explicit Timezone
    },
    end: {
      dateTime: eventData.endTime,
      timeZone: 'Asia/Bangkok',
    },
    attendees: [],
    reminders: {
      useDefault: true,
    },
    colorId: eventData.colorId, // Add Color ID
  };

  // Invite Admin
  if (eventData.targetAdminEmail) {
    event.attendees.push({ email: eventData.targetAdminEmail });
  }

  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    const data = await response.json();

    if (response.ok) {
      return { status: 'success', eventId: data.id, link: data.htmlLink };
    } else {
      console.error("Google API Error:", data);
      return { status: 'error', message: data.error?.message || 'Unknown Error' };
    }
  } catch (error) {
    console.error("Network Error creating event:", error);
    return { status: 'error', message: error.toString() };
  }
};

/**
 * Delete an event from Google Calendar via Direct API
 */
export const deleteCalendarEvent = async (eventId, token) => {
  if (!token) return null; // Cannot delete without token

  try {
    await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return { status: 'success' };
  } catch (error) {
    console.error("Error deleting event:", error);
    return { status: 'error' };
  }
};
