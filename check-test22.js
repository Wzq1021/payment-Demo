const axios = require('axios');

async function checkTest22() {
  try {
    // 先检查 token_users 列表
    const tokenUsersResponse = await axios.get('https://rickdemo.vercel.app/debug/token-users');
    console.log('Token users:', tokenUsersResponse.data);
    
    // 检查 test22 的 token
    const test22TokenResponse = await axios.get('https://rickdemo.vercel.app/subscription/tokens/test22');
    console.log('test22 token:', test22TokenResponse.data);
    
    // 检查 test20 的 token
    const test20TokenResponse = await axios.get('https://rickdemo.vercel.app/subscription/tokens/test20');
    console.log('test20 token:', test20TokenResponse.data);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTest22();