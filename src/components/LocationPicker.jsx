import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
} from "@mui/material";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png"
});

const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <Marker position={position}>
      <Popup>
        Selected Location<br />
        Lat: {position[0].toFixed(6)}<br />
        Lon: {position[1].toFixed(6)}
      </Popup>
    </Marker>
  );
};

export default function LocationPicker({ open, onClose, onLocationSelect, initialLocation = null, initialPosition = null }) {
  const [position, setPosition] = useState(initialPosition ? [initialPosition.latitude, initialPosition.longitude] : null);
  const [searchLocation, setSearchLocation] = useState(initialLocation || "");
  const [mapCenter, setMapCenter] = useState([3.0588, 101.6964]); // Default to Kuala Lumpur, Malaysia
  const [zoom, setZoom] = useState(13);

  const handleSearch = async () => {
    if (!searchLocation.trim()) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchLocation)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setMapCenter([lat, lon]);
        setZoom(15);
        setPosition([lat, lon]);
      } else {
        alert("Location not found. Please try another search term.");
      }
    } catch {
      alert("Error searching location. Please try again.");
    }
  };

  const handleConfirm = () => {
    if (!position) {
      alert("Please click on the map to select a location or search for one.");
      return;
    }

    // Use the existing location name if provided, otherwise use search location or coordinates
    const locationName = initialLocation || searchLocation || `${position[0].toFixed(6)}, ${position[1].toFixed(6)}`;

    onLocationSelect({
      latitude: position[0],
      longitude: position[1],
      location: locationName
    });

    handleClose();
  };

  const handleClose = () => {
    setPosition(null);
    setSearchLocation("");
    setMapCenter([3.0588, 101.6964]);
    setZoom(13);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 2
        }
      }}
    >
      <DialogTitle>
        <Typography variant="h6" fontWeight="bold">
          Select Location on Map
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
        <Box display="flex" gap={1}>
          <TextField
            placeholder="Search location..."
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
            fullWidth
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            size="small"
          />
          <Button variant="contained" onClick={handleSearch}>
            Search
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary">
          Click on the map to pinpoint a location
        </Typography>

        <Box sx={{ height: "400px", borderRadius: 1, overflow: "hidden", border: "1px solid #e2e8f0" }}>
          <MapContainer
            center={mapCenter}
            zoom={zoom}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <LocationMarker position={position} setPosition={setPosition} />
          </MapContainer>
        </Box>

        {position && (
          <Box sx={{ p: 1.5, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Selected Coordinates:</strong>
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace", mt: 0.5 }}>
              Latitude: {position[0].toFixed(6)}
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
              Longitude: {position[1].toFixed(6)}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!position}
        >
          Confirm Location
        </Button>
      </DialogActions>
    </Dialog>
  );
}
