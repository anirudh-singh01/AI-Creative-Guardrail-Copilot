import axios from 'axios'

const API_BASE_URL = '/api'

const api = {
  autoFix: async (canvasData, issues) => {
    const response = await axios.post(`${API_BASE_URL}/auto-fix`, {
      canvasData,
      issues,
    })
    return response.data
  },

  generateImage: async (prompt, size = '1024x1024', quality = 'standard', style = 'vivid') => {
    const response = await axios.post(`${API_BASE_URL}/generate-image`, {
      prompt,
      size,
      quality,
      style,
    })
    return response.data
  },
}

export default api

