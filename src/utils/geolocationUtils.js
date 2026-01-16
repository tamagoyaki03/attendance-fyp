export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('User denied the request for Geolocation.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location information is unavailable.'));
            break;
          case error.TIMEOUT:
            reject(new Error('The request to get user location timed out.'));
            break;
          default:
            reject(new Error('An unknown error occurred.'));
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
};

export const geocodeAddress = async (address) => {
  try {
    // Using OpenStreetMap Nominatim API (free alternative to Google Maps)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        display_name: data[0].display_name
      };
    }
    throw new Error('Location not found');
  } catch (error) {
    throw error;
  }
};

// Search for location suggestions
export const searchLocations = async (query) => {
  try {
    if (!query || query.trim().length < 3) {
      return [];
    }
    
    // Using OpenStreetMap Nominatim API for location search
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      return data.map(item => ({
        label: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon)
      }));
    }
    return [];
  } catch (error) {
    return [];
  }
};