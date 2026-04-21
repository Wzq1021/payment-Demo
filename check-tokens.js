const axios = require('axios');

async function checkTokens() {
  try {
    // 检查 test1 的 token
    const response1 = await axios.get('https://rickdemo.vercel.app/subscription/tokens/test1');
    console.log('test1 token:', response1.data);
    
    // 检查 test2 的 token
    const response2 = await axios.get('https://rickdemo.vercel.app/subscription/tokens/test2');
    console.log('test2 token:', response2.data);
    
    // 检查 test3 的 token
    const response3 = await axios.get('https://rickdemo.vercel.app/subscription/tokens/test3');
    console.log('test3 token:', response3.data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTokens();