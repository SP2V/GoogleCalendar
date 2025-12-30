
const API_URL = 'https://script.google.com/macros/s/......./exec';

/**
 * Create a new event in Google Calendar
 * @param {Object} eventData - { title, startTime, endTime, description, location, userEmail }
 * @returns {Promise<Object>} - Response from GAS
 */
export const createCalendarEvent = async (eventData) => {
  try {
    // Google Apps Script Web App requires 'text/plain' to avoid CORS preflight issues in some cases,
    // or simply because it parses postData.contents.
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(eventData),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error creating calendar event:", error);
    throw error;
  }
};

/**
 * Delete an event from Google Calendar
 * @param {string} eventId - Google Calendar Event ID
 * @returns {Promise<Object>} - Response from GAS
 */
export const deleteCalendarEvent = async (eventId) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ action: 'delete', eventId: eventId }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error deleting calendar event:", error);
    // Return null instead of throwing to allow local deletion to proceed
    return null;
  }
};

/**
 * Get events from Google Calendar
 * @returns {Promise<Array>} - List of events
 */
export const getCalendarEvents = async () => {
  try {
    const response = await fetch(API_URL);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return [];
  }
};
