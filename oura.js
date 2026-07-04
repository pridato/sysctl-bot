import axios from 'axios';

const createOuraClient = (token) => axios.create({
  baseURL: 'https://api.ouraring.com/v2/usercollection',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

export async function fetchOuraMetrics(token, date) {
  const client = createOuraClient(token);
  try {
    const [readinessRes, sleepRes] = await Promise.all([
      client.get('/daily_readiness', { params: { start_date: date, end_date: date } }),
      client.get('/daily_sleep', { params: { start_date: date, end_date: date } })
    ]);
    const readinessData = readinessRes.data.data[0];
    const sleepData = sleepRes.data.data[0];
    if (!readinessData || !sleepData) throw new Error('No data available in Oura for ${date}');

    return {
      date: date,
      readiness: readinessData.score,
      hrv: readinessData.contributors.hrv_balance ?? 60,
      efficiency: sleepData.contributors.efficiency ?? 85,
      rhr: sleepData.contributors.rest_heart_rate ?? 55,
      sleepScore: sleepData.score,
      tempDev: readinessData.contributors.temperature_deviation ?? 0.0,
      activityScore: readinessData.contributors.activity_balance ?? 70
    };
  } catch (error) {
    console.error(error);
  }
}
