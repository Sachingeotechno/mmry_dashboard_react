import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/kpi';

export const fetchOverallKpi = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/overall`);
        return response.data;
    } catch (error) {
        console.error("Error fetching overall KPI:", error);
        return { Total_Targeted: 0, Total_Achieved: 0 };
    }
};

export const fetchDistrictKpi = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/district`);
        return response.data;
    } catch (error) {
        console.error("Error fetching district KPI:", error);
        return [];
    }
};

export const fetchBlockKpi = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/block`);
        return response.data;
    } catch (error) {
        console.error("Error fetching block KPI:", error);
        return [];
    }
};
