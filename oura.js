import axios from 'axios';

const createOuraClient = (token) => axios.create({
  baseURL: 'https://api.ouraring.com/v2/usercollection',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

export async function fetchOuraMetrics(token, date) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - 1);
  const yesterday = d.toISOString().split('T')[0];
  const client = createOuraClient(token);
  try {
    const [
      readinessRes,
      sleepRes,
      sleepPeriodRes,
      activityRes,
      stressRes,
      workoutRes
    ] = await Promise.all([
      client.get('/daily_readiness', { params: { start_date: date, end_date: date } }),
      client.get('/daily_sleep', { params: { start_date: date, end_date: date } }),
      client.get('/sleep',  { params: { start_date: yesterday, end_date: date } }),
      client.get('/daily_activity',  { params: { start_date: yesterday, end_date: date } }),
      client.get('/daily_stress',  { params: { start_date: yesterday, end_date: date } }),
      client.get('/workout',  { params: { start_date: yesterday, end_date: date } })
    ]);
    const readinessData = readinessRes.data.data[0];
    const sleepData = sleepRes.data.data[0];
    const sleepPeriodData = sleepPeriodRes.data.data.find(period => period.type === 'long_sleep');
    const activityData = activityRes.data.data ?? [];
    const stressData = stressRes.data.data ?? [];
    const workoutData = workoutRes.data.data ?? [];
    if (!readinessData || !sleepData) throw new Error(`No data available in Oura for ${date}`);

    return {
      date: date,
      readiness: readinessData.score,
      hrv: readinessData.contributors.hrv_balance ?? 60,
      efficiency: sleepData.contributors.efficiency ?? 85,
      rhr: sleepData.contributors.rest_heart_rate ?? 55,
      sleepScore: sleepData.score,
      sleepPeriodData: sleepPeriodData?.total_sleep_duration ?? 25200,
      tempDev: readinessData.contributors.temperature_deviation ?? 0.0,
      activityScore: readinessData.contributors.activity_balance ?? 70,
      activityData,
      stressData,
      workoutData
    };
  } catch (error) {
    console.error(error);
  }
}
