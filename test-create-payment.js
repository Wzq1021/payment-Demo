const axios = require('axios');

async function testCreatePayment() {
  try {
    const response = await axios.post('https://rickdemo.vercel.app/linkpay/create-payment', {
      amount: 100,
      userReference: 'test_user_' + Date.now(),
      isSubscription: true
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

testCreatePayment();