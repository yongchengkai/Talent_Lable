import axios from 'axios';

const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

request.interceptors.response.use(
  (res) => {
    const { data } = res;
    if (data.code !== 200) {
      return Promise.reject(new Error(data.message || '请求失败'));
    }
    return data;
  },
  (err) => {
    return Promise.reject(err);
  }
);

export default request;
