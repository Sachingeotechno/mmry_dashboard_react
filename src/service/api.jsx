import axios from "axios";
import toast from 'react-hot-toast';
//import AsyncStorage from "@react-native-async-storage/async-storage";
//import { Alert } from "react-native";

// ✅ Base URL - Use environment variable with fallback
// const BASE_URL = import.meta.env.VITE_API_URL;
const BASE_URL = 'https://ruralstack.brlps.in/api';

// ✅ Axios instance
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Interceptor: Attach token from `password` key
axiosInstance.interceptors.request.use(
  (config) => {
    try {
      const userData = localStorage.getItem('userData');

      if (userData) {
        const parsed = JSON.parse(userData);
        const token = parsed?.password; // token stored under password key

        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.log('Error attaching token:', error);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Error handler
const handleError = (error) => {
  const err = {
    title: "Error",
    details: "Something went wrong",
    status: error?.response?.status,
    data: error?.response?.data,
  };

  if (error?.response) {
    const { status, data } = error.response;
    switch (status) {
      case 400:
        err.details = data?.message || data?.detail || "Bad request - Invalid data.";
        break;
      case 401:
        err.details = "Unauthorized access - Please login.";
        break;
      case 403:
        err.details = "Forbidden access - Insufficient permissions.";
        break;
      case 404:
        err.details = "Resource not found.";
        break;
      case 500:
        err.details = data?.detail || data?.message || "Server error.";
        break;
      // default:
      //   err.details = data?.message || data?.detail || "Unexpected server error.";
      //   break;
    }
  } else if (error?.request) {
    err.details = "No response from server - Check connection.";
  } else {
    err.details = error.message || "Request error.";
  }

  console.error("Detailed error:", { error, handled: err });
  toast.error(err.details || "An error occurred");
  return err;
};

// ✅ GET Request
export const fetchData = async (endpoint, config = {}) => {
  try {
    const response = await axiosInstance.get(endpoint, config);

    // Handle EF Core $values wrapper (for GET requests that return arrays)
    if (response.data && typeof response.data === 'object' && '$values' in response.data) {
      return response.data['$values'];
    }

    return response.data;
  } catch (error) {
    throw handleError(error);
  }
};

// ✅ POST Request
export const postData = async (endpoint, payload, config = {}) => {
  try {
    const response = await axiosInstance.post(endpoint, payload, config);
    return response.data;
  } catch (error) {
    throw handleError(error);
  }
};

// ✅ PUT Request
export const putData = async (endpoint, payload, config = {}) => {
  try {
    const response = await axiosInstance.put(endpoint, payload, config);
    return response.data;
  } catch (error) {
    throw handleError(error);
  }
};

// ✅ DELETE Request
export const deleteData = async (endpoint, data = null, config = {}) => {
  try {
    const response = await axiosInstance.delete(endpoint, {
      data: data,
      ...config
    });
    return response.data;
  } catch (error) {
    throw handleError(error);
  }
};

// ✅ Get User Data from localStorage
export const Userdata = () => {
  try {
    const userData = localStorage.getItem('userData');
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    toast.error('Error getting user data');
    return null;
  }
};

// Helper function to set user data with token
export const setUserData = (userData) => {
  try {
    localStorage.setItem('userData', JSON.stringify(userData));
  } catch (error) {
    console.error('Error setting user data:', error);
    toast.error('Error setting user data');
  }
};

// ✅ Get Admin Dashboard Data
export const getAdminDashboard = async () => {
  try {
    const response = await axiosInstance.get('Sakhi/admindashboard');
    return response.data;
  } catch (error) {
    throw handleError(error);
  }
}; const service = {
  fetchData,
  postData,
  putData,
  deleteData,
  Userdata,
  setUserData,
  getAdminDashboard,
};

export default service;

