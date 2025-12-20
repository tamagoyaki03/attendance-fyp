import React from 'react';
import { Button } from '@mui/material';

const ViewDetailsButton = ({ onClick, ...props }) => {
  return (
    <Button
      variant="contained"
      size="small"
      sx={{
        backgroundColor: '#f8f9fa',
        color: '#374151',
        border: '1px solid #e5e7eb',
        '&:hover': {
          backgroundColor: '#e5e7eb',
          color: '#1f2937',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        },
        boxShadow: 'none'
      }}
      onClick={onClick}
      {...props}
    >
      View Details
    </Button>
  );
};

export default ViewDetailsButton;