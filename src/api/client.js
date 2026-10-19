
import axios from 'axios'

const api = axios.create({
  baseURL: 'https://perez-michael-dave-lab6.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api
