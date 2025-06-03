import React, { useState, useEffect } from "react";
import { TextField, Button, Box, InputLabel, CircularProgress } from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import PropTypes from "prop-types";
import Autocomplete from "@mui/material/Autocomplete";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

const LocationInput = ({ formData, setFormData }) => {
  const [query, setQuery] = useState("");
  const [locationOptions, setLocationOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationCoords, setLocationCoords] = useState(null);

  // Fetch location suggestions from OpenStreetMap Nominatim API
  useEffect(() => {
    const fetchLocations = async () => {
      if (!query) return;
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=5`
        );
        const data = await res.json();
        setLocationOptions(
          data.map((loc) => ({
            label: loc.display_name,
            lat: parseFloat(loc.lat),
            long: parseFloat(loc.lon),
          }))
        );
      } catch (err) {
        console.error("Failed to fetch locations", err);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchLocations();
    }, 500); // debounce

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const handleGetLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocationCoords({ lat: latitude, long: longitude });

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const locationName = data.display_name;
          setFormData((prev) => ({
            ...prev,
            location: locationName,
            lat: latitude,
            long: longitude,
          }));
        } catch (error) {
          setFormData((prev) => ({
            ...prev,
            location: `Lat: ${latitude.toFixed(6)}, Long: ${longitude.toFixed(6)}`,
            lat: latitude,
            long: longitude,
          }));
        }
      },
      (error) => {
        setFormData((prev) => ({
          ...prev,
          location: "Location access denied",
          lat: null,
          long: null,
        }));
      }
    );
  } else {
    setFormData((prev) => ({
      ...prev,
      location: "Geolocation not supported",
      lat: null,
      long: null,
    }));
  }
};

  const handleSelectLocation = (event, value) => {
    if (value) {
      setFormData((prev) => ({
        ...prev,
        lat: value.lat,
        long: value.long,
      }));
      setLocationCoords({ lat: value.lat, long: value.long });
    }
  };

  return (
    <div className="space-y-2">
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <InputLabel htmlFor="location" sx={{ color: "#fafafa", margin: "10px", marginLeft: "0" }}>
          Location
        </InputLabel>
        <Button
          variant="outlined"
          size="small"
          startIcon={<MyLocationIcon />}
          onClick={handleGetLocation}
          sx={{
            color: "#fafafa",
            borderColor: "#27272a",
            "&:hover": {
              borderColor: "#fafafa",
            },
          }}
        >
          Get Current Location
        </Button>
      </Box>

      <Autocomplete
  freeSolo
  options={locationOptions}
  loading={loading}
  inputValue={formData.location || ""}
  onInputChange={(e, value, reason) => {
    // Only update if user types or clears
    if (reason === "input" || reason === "clear") {
      setQuery(value);
      setFormData((prev) => ({
        ...prev,
        location: value,
      }));
    }
  }}
  onChange={handleSelectLocation}
  renderInput={(params) => (
    <TextField
      {...params}
      id="location"
      name="location"
      placeholder="Type to search location..."
      fullWidth
      required
      sx={{
        color: "#fafafa",
        backgroundColor: "#18181b",
        borderRadius: "8px",
        margin: "5px 0",
        "& .MuiOutlinedInput-root": {
          "& fieldset": { borderColor: "#27272a" },
          "&:hover fieldset": { borderColor: "#fafafa" },
          "&.Mui-focused fieldset": { borderColor: "#fafafa" },
        },
        "& .MuiInputBase-input": {
          color: "#fafafa",
          height: "20px",
          padding: "0 14px",
        },
      }}
      InputProps={{
        ...params.InputProps,
        endAdornment: (
          <>
            {loading ? <CircularProgress color="inherit" size={20} /> : null}
            {params.InputProps.endAdornment}
          </>
        ),
      }}
    />
  )}
/>

      {locationCoords && (
        <Box sx={{ mt: 2, height: 250, borderRadius: "8px", overflow: "hidden" }}>
          <MapContainer
            center={[locationCoords.lat, locationCoords.long]}
            zoom={16}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[locationCoords.lat, locationCoords.long]}>
              <Popup>{formData.location}</Popup>
            </Marker>
          </MapContainer>
        </Box>
      )}
    </div>
  );
};

LocationInput.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  setFormData: PropTypes.func.isRequired,
};

export default LocationInput;
