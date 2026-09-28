import { apiRequest } from './client';
export const getCategories = () => apiRequest('/reference/categories');
export const getBuildings = () => apiRequest('/reference/buildings');
export const getFloors = (buildingId) => apiRequest('/reference/floors?buildingId=' + encodeURIComponent(buildingId));
export const getLocations = (floorId) => apiRequest('/reference/locations?floorId=' + encodeURIComponent(floorId));
