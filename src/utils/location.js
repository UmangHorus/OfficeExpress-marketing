// export const getLocationInfo = async (latitude, longitude) => {
//   const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
//   if (!GOOGLE_API_KEY) throw new Error("Google Maps API key is missing");

//   const response = await fetch(
//     `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`
//   );

//   if (!response.ok) throw new Error(`Geocoding API error: ${response.status}`);

//   const data = await response.json();
//   if (data.status === "OK" && data.results.length > 0) {
//     return {
//       address: data.results[0].formatted_address,
//       latitude,
//       longitude,
//     };
//   }
//   throw new Error(data.error_message || "No address found for location");
// };

// export const getCurrentLocation = async () => {
//   return new Promise((resolve, reject) => {
//     if (!navigator.geolocation) {
//       reject(new Error("Geolocation not supported"));
//       return;
//     }

//     const options = {
//       enableHighAccuracy: true,
//       timeout: 20000,
//       maximumAge: 0,
//     };

//     navigator.geolocation.getCurrentPosition(
//       async (position) => {
//         const { latitude, longitude, accuracy } = position.coords;
//         const gmapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

//         try {
//           const locationInfo = await getLocationInfo(latitude, longitude);
//           resolve({
//             ...locationInfo,
//             accuracy,
//             gmapLink,
//             timestamp: Date.now(),
//           });
//         } catch (error) {
//           // Fallback if address lookup fails
//           resolve({
//             latitude,
//             longitude,
//             accuracy,
//             gmapLink,
//             address: null,
//             error: error.message,
//             timestamp: Date.now(),
//           });
//         }
//       },
//       (error) => {
//         const errorMessages = {
//           1: "Location permission denied. Please enable location access in your browser settings.",
//           2: "Location unavailable. Please check your device location services.",
//           3: "Location request timed out. Please try again.",
//         };
//         reject(new Error(errorMessages[error.code] || "Unable to get location"));
//       },
//       options
//     );
//   });
// };

// export const checkLocationPermission = async () => {
//   if (!navigator.geolocation) return "denied";

//   if (navigator.permissions?.query) {
//     try {
//       const status = await navigator.permissions.query({ name: "geolocation" });
//       return status.state; // "granted" | "denied" | "prompt"
//     } catch {
//       return "prompt";
//     }
//   }
//   return "prompt";
// };

// export const requestLocationPermission = async () => {
//   const permission = await checkLocationPermission();

//   // If explicitly denied, stop immediately
//   if (permission === "denied") return "denied";

//   // Allow "prompt" or "granted" to continue
//   return "granted";
// };

// export const isLocationEnabled = async () => {
//   const permission = await checkLocationPermission();
//   return permission === "granted" || permission === "prompt";
// };


export const getLocationInfo = async (latitude, longitude) => {
  const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!GOOGLE_API_KEY) throw new Error("Google Maps API key is missing");

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`
  );

  if (!response.ok) throw new Error(`Geocoding API error: ${response.status}`);

  const data = await response.json();
  if (data.status === "OK" && data.results.length > 0) {
    return {
      address: data.results[0].formatted_address,
      latitude,
      longitude,
    };
  }
  throw new Error(data.error_message || "No address found for location");
};

/**
 * Get current GPS coordinates
 */
export const getCurrentLocation = async () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported by your browser"));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const gmapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

        try {
          const locationInfo = await getLocationInfo(latitude, longitude);
          resolve({
            ...locationInfo,
            accuracy,
            gmapLink,
            timestamp: Date.now(),
          });
        } catch (error) {
          // fallback if address lookup fails
          resolve({
            latitude,
            longitude,
            accuracy,
            gmapLink,
            address: null,
            error: error.message,
            timestamp: Date.now(),
          });
        }
      },
      (error) => {
        const errorMessages = {
          1: "Permission denied. Please enable location access.",
          2: "Location unavailable. Turn on GPS.",
          3: "Location request timed out.",
        };
        reject(new Error(errorMessages[error.code] || "Unable to get location"));
      },
      options
    );
  });
};

/**
 * Check current permission state
 */
export const checkLocationPermission = async () => {
  if (!navigator.permissions || !navigator.permissions.query) {
    return "prompt"; // fallback for Safari/iOS
  }

  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state; // "granted" | "prompt" | "denied"
  } catch {
    return "prompt";
  }
};

/**
 * Ask for permission (granted or prompt means okay)
 */
export const requestLocationPermission = async () => {
  const permission = await checkLocationPermission();
  if (permission === "denied") return "denied";
  return "granted";
};
