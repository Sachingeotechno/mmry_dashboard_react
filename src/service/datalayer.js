// import axios from 'axios';
import service from '../service/api';
import toast from 'react-hot-toast';
const API_BASE_URL = 'https://ruralstack.brlps.in/api';

export const fetchOverallKpi = async () => {
    try {
        const response = await service.fetchData(`/Report/overall`);
        return response.overall[0];
    } catch (error) {
        toast.error(`Error fetching overall KPI: ${error.details || error.message || "Unknown error"}`);
        return { Total_Targeted: 0, Total_Achieved: 0 };
    }
};

export const fetchDistrictKpi = async () => {
    try {
        const response = await service.fetchData(`/Report/district`);
        return response.district;
    } catch (error) {
        toast.error(`Error fetching district KPI: ${error.details || error.message || "Unknown error"}`);
        return [];
    }
};

export const fetchBlockKpi = async (districtId) => {
    try {
        const url = districtId ? `/Report/block?district_id=${districtId}` : `/Report/block`;
        const response = await service.fetchData(url);
        return response.block;
    } catch (error) {
        toast.error(`Error fetching block KPI: ${error.details || error.message || "Unknown error"}`);
        return [];
    }
};

export const fetchPanchayatKpi = async (districtId, blockId) => {
    try {
        let url = `/Report/panchayat`;
        const params = [];
        if (districtId) params.push(`district_id=${districtId}`);
        if (blockId) params.push(`block_id=${blockId}`);
        if (params.length > 0) url += `?${params.join('&')}`;

        const response = await service.fetchData(url);
        return response.panchayat;
    } catch (error) {
        toast.error(`Error fetching panchayat KPI: ${error.details || error.message || "Unknown error"}`);
        return [];
    }
};

export const fetchSurveyStatistics = async (districtId = 0) => {
    try {
        const url = `/Report/surveystatisticsreport?district_id=${districtId}`;
        const response = await service.fetchData(url);
        return response.statistics || [];
    } catch (error) {
        toast.error(`Error fetching survey statistics: ${error.details || error.message || "Unknown error"}`);
        return [];
    }
};

export const fetchBusinessStatistics = async (districtId = 0) => {
    try {
        const url = `/Report/businessapplystatisticsreport?district_id=${districtId}`;
        const response = await service.fetchData(url);
        return response.statistics || [];
    } catch (error) {
        toast.error(`Error fetching business statistics: ${error.details || error.message || "Unknown error"}`);
        return [];
    }
};

export const fetchDatewiseKpi = async (date) => {
    try {
        const url = date ? `/Report/datewise?date=${date}` : `/Report/datewise`;
        const response = await service.fetchData(url);
        console.log("Date-wise API Response:", response.datewise);
        return response.datewise || [];
    } catch (error) {
        toast.error(`Error fetching date-wise KPI: ${error.details || error.message || "Unknown error"}`);
        return [];
    }
};

export const fetchAchievementByDateRange = async (fdate, tdate) => {
    try {
        const url = `/Report/acheivmentbydaterange?fdate=${fdate}&tdate=${tdate}`;
        const response = await service.fetchData(url);
        return response.statistics || [];
    } catch (error) {
        toast.error(`Error fetching date-wise achievement: ${error.details || error.message || "Unknown error"}`);
        return [];
    }
};

// BUSINESS KPI ENDPOINTS

export const fetchBusinessFind10k = async () => {
    try {
        const response = await service.fetchData(`/Report/find_10k`);
        console.log("Business Find 10k Response:", response.find_10k);
        return response.find_10k;
    } catch (error) {
        toast.error(`Error fetching business find 10k KPI: ${error.details || error.message || "Unknown error"}`);
        return [];
    }
};

export const fetchBusinessKnowledgeMmry = async () => {
    try {
        const response = await service.fetchData(`/Report/knowledge_mmry`);
        console.log("Business Knowledge MMRY Response:", response.kmmry);
        return response.kmmry;
    } catch (error) {
        toast.error(`Error fetching business knowledge MMRY KPI: ${error.details || error.message || "Unknown error"}`);
        return [];
    }
};

export const fetchBusinessBefore10k = async () => {
    try {
        const response = await service.fetchData(`/Report/before_10k`);
        console.log("Business Before 10k Response:", response.before10k);
        return response.before10k;
    } catch (error) {
        toast.error(`Error fetching business before 10k KPI: ${error.details || error.message || "Unknown error"}`);
        return [];
    }
};

export const fetchBusinessUse10k = async () => {
    try {
        const response = await service.fetchData(`/Report/use_10k`);
        // console.log("Business Use 10k Response:", response.use_10k);
        return response.use_10k;
    } catch (error) {
        toast.error(`Error fetching business use 10k KPI: ${error.details || error.message || "Unknown error"}`);
        return [];
    }
};

export const fetchBusinessUsed10kType = async () => {
    try {
        const response = await service.fetchData(`/Report/used_10k_type`);
        // console.log("Business Used 10k Type Response:", response.data.used_10k_type);
        return response.used_10k_type;
    } catch (error) {
        toast.error(`Error fetching business used 10k type KPI: ${error.details || error.message || "Unknown error"}`);
        return [];
    }
};
