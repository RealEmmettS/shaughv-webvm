import { writable } from 'svelte/store';

// List of uploaded files: {id, name, path, size, status}
export const uploadedFiles = writable([]);

// Activity indicator for the sidebar icon
export const filesActivity = writable(false);

// Upload directory path
export const UPLOAD_DIR = '/home/user/uploads';
