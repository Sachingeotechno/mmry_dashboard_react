import axios from 'axios';

const API_BASE_URL = 'https://mmryrural.brlps.in/ruralstack/api/Report';

export const fetchOverallKpi = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/overall`);
        console.log(response.data);
        console.log(response.data.overall);
        return response.data.overall[0];
    } catch (error) {
        console.error("Error fetching overall KPI:", error);
        return { Total_Targeted: 0, Total_Achieved: 0 };
    }
};

export const fetchDistrictKpi = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/district`);
        return response.data.district;
    } catch (error) {
        console.error("Error fetching district KPI:", error);
        return [];
    }
};

export const fetchBlockKpi = async (districtId) => {
    try {
        const url = districtId ? `${API_BASE_URL}/block?district_id=${districtId}` : `${API_BASE_URL}/block`;
        const response = await axios.get(url);
        return response.data.block;
    } catch (error) {
        console.error("Error fetching block KPI:", error);
        return [];
    }
};

export const fetchPanchayatKpi = async (districtId, blockId) => {
    try {
        let url = `${API_BASE_URL}/panchayat`;
        const params = [];
        if (districtId) params.push(`district_id=${districtId}`);
        if (blockId) params.push(`block_id=${blockId}`);
        if (params.length > 0) url += `?${params.join('&')}`;

        const response = await axios.get(url);
        return response.data.panchayat;
    } catch (error) {
        console.error("Error fetching panchayat KPI:", error);
        return [];
    }
};

export const fetchDatewiseKpi = async (date) => {
    try {
        const url = date ? `${API_BASE_URL}/datewise?date=${date}` : `${API_BASE_URL}/datewise`;
        const response = await axios.get(url);
        console.log("Date-wise API Response:", response.data.datewise);
        return response.data.datewise || [];
    } catch (error) {
        console.error("Error fetching date-wise KPI:", error);
        return [];
    }
};

// BUSINESS KPI ENDPOINTS

export const fetchBusinessFind10k = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/find_10k`);
        console.log("Business Find 10k Response:", response.data.find_10k);
        return response.data.find_10k;
    } catch (error) {
        console.error("Error fetching business find 10k KPI:", error);
        return [];
    }
};

export const fetchBusinessKnowledgeMmry = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/knowledge_mmry`);
        console.log("Business Knowledge MMRY Response:", response.data.kmmry);
        return response.data.kmmry;
    } catch (error) {
        console.error("Error fetching business knowledge MMRY KPI:", error);
        return [];
    }
};

export const fetchBusinessBefore10k = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/before_10k`);
        console.log("Business Before 10k Response:", response.data.before10k);
        return response.data.before10k;
    } catch (error) {
        console.error("Error fetching business before 10k KPI:", error);
        return [];
    }
};

export const fetchBusinessUse10k = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/use_10k`);
        console.log("Business Use 10k Response:", response.data.use_10k);
        return response.data.use_10k;
    } catch (error) {
        console.error("Error fetching business use 10k KPI:", error);
        return [];
    }
};

export const fetchBusinessUsed10kType = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/used_10k_type`);
        // console.log("Business Used 10k Type Response:", response.data.used_10k_type);
        return response.data.used_10k_type;
    } catch (error) {
        console.error("Error fetching business used 10k type KPI:", error);
        return [];
    }
};
