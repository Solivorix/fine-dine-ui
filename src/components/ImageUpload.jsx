import React, { useState, useRef } from 'react';
import './ImageUpload.css';

const ImageUpload = ({ 
  currentImage, 
  onImageChange, 
  uploadType = 'restaurant', // 'restaurant' or 'item'
  label = 'Upload Image'
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage || null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = uploadType === 'restaurant' 
        ? '/api/upload/restaurant-image' 
        : '/api/upload/item-image';

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      const data = await response.json();

      if (response.ok && data.fileUrl) {
        const fullImageUrl = `${API_BASE_URL}${data.fileUrl}`;
        setPreview(fullImageUrl);
        onImageChange(fullImageUrl);
      } else {
        setError(data.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreview(null);
    onImageChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="image-upload-container">
      <label className="image-upload-label">{label}</label>
      
      <div className="image-upload-area">
        {preview ? (
          <div className="image-preview-container">
            <img src={preview} alt="Preview" className="image-preview" />
            <div className="image-overlay">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleClick}
                disabled={uploading}
              >
                Change Image
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={handleRemoveImage}
                disabled={uploading}
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="image-upload-placeholder" onClick={handleClick}>
            <div className="upload-icon">📷</div>
            <p className="upload-text">Click to upload image</p>
            <p className="upload-hint">PNG, JPG, GIF up to 10MB</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {uploading && (
        <div className="upload-progress">
          <div className="spinner-small"></div>
          <span>Uploading...</span>
        </div>
      )}

      {error && (
        <div className="upload-error">{error}</div>
      )}
    </div>
  );
};

export default ImageUpload;
