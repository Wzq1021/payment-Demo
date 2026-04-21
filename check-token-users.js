const axios = require('axios');

async function checkTokenUsers() {
  try {
    // 直接访问 Edge Config API 来检查 token_users 列表
    const response = await axios.get('https://rickdemo.vercel.app/debug/token-users');
    console.log('Token users:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.status, error.response.data);
    }
  }
}

checkTokenUsers();