const axios = require('axios');

async function checkToken() {
  try {
    const response = await axios.get('https://rickdemo.vercel.app/subscription/tokens/test20');
    console.log('test20 token:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkToken();