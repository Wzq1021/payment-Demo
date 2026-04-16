const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Vercel Edge Config 配置
let edgeConfigClient = null;
try {
  const { createClient } = require('@vercel/edge-config');
  edgeConfigClient = createClient();
  console.log('Edge Config client initialized');
} catch (error) {
  console.log('Edge Config not available, using file system storage');
  // 本地开发环境使用文件系统存储
}

const app = express();

// Apple Pay IP地址白名单
const applePayIpWhitelist = [
  // 生产环境 IP 地址
  '17.171.78.7', '17.171.78.71', '17.171.78.135', '17.171.78.199', '17.171.79.12',
  '17.141.128.7', '17.141.128.71', '17.141.128.135', '17.141.128.199', '17.141.129.12',
  '17.32.214.7', '17.157.96.181',
  '17.33.194.239', '17.33.192.38', '17.33.193.110',
  '17.33.202.35', '17.33.201.101', '17.33.200.169',
  '101.230.204.232', '101.230.204.242', '101.230.204.240',
  '60.29.205.104', '60.29.205.106', '60.29.205.108',
  
  // 测试环境 IP 地址
  '17.171.85.7',
  '17.179.124.181', '17.32.214.56',
  '17.33.194.218', '17.33.192.145', '17.33.193.45',
  '17.33.200.47', '17.33.202.99', '17.33.201.105',
  '101.230.204.235'
];

// 检查IP地址是否在白名单中
function isIpAllowed(ip) {
  return applePayIpWhitelist.includes(ip);
}

// IP地址白名单中间件
app.use((req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress;
  console.log('Client IP:', clientIp);
  
  // 检查是否是Apple Pay相关的请求
  if (req.path.includes('/.well-known/apple-developer-merchantid-domain-association.txt') || 
      req.headers['user-agent']?.includes('Apple')) {
    // 检查IP地址是否在白名单中
    if (isIpAllowed(clientIp)) {
      console.log('IP allowed for Apple Pay request:', clientIp);
      next();
    } else {
      console.log('IP denied for Apple Pay request:', clientIp);
      res.status(403).send('Access denied');
    }
  } else {
    // 非Apple Pay请求，直接通过
    next();
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/linkpay', express.static(path.join(__dirname, 'public/linkpay')));
app.use('/dropin', express.static(path.join(__dirname, 'public/dropin')));
app.use('/checkout', express.static(path.join(__dirname, 'public/checkout')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// LinkPay Configuration
const keyLinkPay = 'd5e2c210d2114b1993ee68244ed88fce';
const WEBHOOK_LINKPAY_URL = 'https://6ee8218a-52e4-4b16-8d67-594cdb34bb23.mock.pstmn.io';

// Dropin Configuration
const signKeyDropin = 'd5e2c210d2114b1993ee68244ed88fce';
const keyID = '630805e2d532478aba9cedb9cea14397';

// Token Storage - 支持 Vercel KV 和本地文件系统
const TOKEN_FILE = path.join(__dirname, 'tokens.json');

// 初始化 tokenStore
let tokenStore = new Map();

// 从存储加载 tokens
async function loadTokens() {
  try {
    if (edgeConfigClient) {
      // 使用 Edge Config
      const tokens = await edgeConfigClient.get('tokens');
      if (tokens) {
        tokenStore = new Map(Object.entries(tokens));
        console.log('Loaded tokens from Edge Config:', Array.from(tokenStore.entries()));
      }
    } else {
      // 使用本地文件系统
      if (fs.existsSync(TOKEN_FILE)) {
        const data = fs.readFileSync(TOKEN_FILE, 'utf8');
        const tokens = JSON.parse(data);
        tokenStore = new Map(Object.entries(tokens));
        console.log('Loaded tokens from file:', Array.from(tokenStore.entries()));
      }
    }
  } catch (error) {
    console.error('Error loading tokens:', error);
  }
}

// 保存 tokens 到存储
async function saveTokens() {
  try {
    const tokens = Object.fromEntries(tokenStore);
    if (edgeConfigClient) {
      // 使用 Edge Config
      await edgeConfigClient.set('tokens', tokens);
      console.log('Saved tokens to Edge Config');
    } else {
      // 使用本地文件系统
      fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
      console.log('Saved tokens to file');
    }
  } catch (error) {
    console.error('Error saving tokens:', error);
  }
}

// 启动时加载 tokens
loadTokens();

// Shared State Management for LinkPay
const orderState = {
  orders: {},
  save(orderId, totalAmount, refundedAmount = 0, status = 'pending') {
    this.orders[orderId] = { totalAmount, refundedAmount, status };
  },
  get(orderId) {
    return this.orders[orderId];
  },
  updateRefundedAmount(orderId, amount) {
    if (this.orders[orderId]) {
      this.orders[orderId].refundedAmount += Number(amount);
    }
  },
  updateStatus(orderId, status) {
    if (this.orders[orderId]) {
      this.orders[orderId].status = status;
    }
  }
};

const notificationState = {
  processed: new Set(),
  add(notifyId) {
    this.processed.add(notifyId);
  },
  has(notifyId) {
    return this.processed.has(notifyId);
  }
};

// Shared Utility Function: Get DateTime String
function getDateTimeString() {
  const date = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}+08:00`;
}

// LinkPay: Create Payment Link
app.post('/linkpay/create-payment', async (req, res) => {
  try {
    const { amount, userReference, isSubscription } = req.body;
    const paymentAmount = amount || 100.00;

    const method = 'POST';
    const urlPath = '/g2/v0/payment/mer/S005188/evo.e-commerce.linkpay';
    const dateTime = getDateTimeString();
    const msgID = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
    const traceId = crypto.randomUUID().replace(/-/g, '');

    console.log('=== LinkPay X-Trace-Id ===\n' + traceId);

    const body = {
      merchantOrderInfo: {
        merchantOrderID: 'DEMO_' + Date.now(),
        merchantOrderTime: dateTime
      },
      transAmount: {
        currency: 'HKD',
        value: String(paymentAmount)
      },
      tradeInfo: {
        tradeType: 'Sale of goods',
        goodsName: 'Test Item',
        goodsDescription: 'Just a test item',
        totalQuantity: 1
      },
      payerInfo: {
        customerName: 'Test User',
        mail: 'test@example.com'
      },
      validTime: 5,
      returnUrl: `${req.protocol}://${req.get('host')}/checkout/index.html?payment=success&orderId=${encodeURIComponent('DEMO_' + Date.now())}&amount=${encodeURIComponent(String(paymentAmount))}&method=LinkPay`,
      webhook: `${req.protocol}://${req.get('host')}/linkpay/webhook`
    };

    // 添加订阅相关参数
    if (isSubscription) {
      body.userInfo = {
        reference: userReference || 'user_' + Date.now()
      };
      body.paymentMethod = {
        recurringProcessingModel: 'Subscription'
      };
    }

    const bodyString = JSON.stringify(body);
    const stringToSign = [method, urlPath, dateTime, keyLinkPay, msgID, bodyString].join('\n');
    const signature = crypto.createHash('sha256').update(stringToSign).digest('hex');

    console.log('String to Sign:', stringToSign);
    console.log('Generated Signature:', signature);

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': signature,
      'DateTime': dateTime,
      'MsgID': msgID,
      'SignType': 'SHA256',
      'X-Trace-Id': traceId
    };

    console.log('Request Headers:', headers);

    const response = await axios.post(
      'https://hkg-counter-uat.everonet.com' + urlPath,
      bodyString,
      { headers }
    );

    console.log('Result:', response.data);

    if (response.data?.result?.code === 'S0000' && response.data?.linkUrl) {
      const orderId = response.data.merchantOrderInfo?.merchantOrderID;
      orderState.save(orderId, Number(paymentAmount));
      return res.json({
        message: '创建支付链接成功',
        paymentLink: response.data.linkUrl,
        orderId,
        expires: response.data.expiryTime
      });
    } else {
      return res.status(500).json({
        error: '创建支付链接失败',
        details: response.data
      });
    }
  } catch (err) {
    console.error('调用失败:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      headers: err.response?.headers
    });
    return res.status(500).json({
      error: '创建支付链接失败',
      details: err.response?.data || err.message
    });
  }
});

// LinkPay: Check Payment Status
app.get('/linkpay/check-payment/:orderId', async (req, res) => {
  console.log(`[LinkPay GET] /check-payment/${req.params.orderId}`);

  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ error: '缺少 orderId 参数' });
    }

    const order = orderState.get(orderId);
    if (order?.status === 'success') {
      return res.json({
        orderId,
        status: 'Paid',
        message: '支付状态已从本地获取'
      });
    }

    const dateTime = getDateTimeString();
    const msgID = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
    const traceId = crypto.randomUUID().replace(/-/g, '');
    const urlPath = `/g2/v0/payment/mer/S005188/evo.e-commerce.linkpay/${orderId}`;

    const stringToSign = ['GET', urlPath, dateTime, keyLinkPay, msgID].join('\n');
    const signature = crypto.createHash('sha256').update(stringToSign).digest('hex');

    console.log('String to Sign:', stringToSign);
    console.log('Generated Signature:', signature);

    const url = 'https://hkg-counter-uat.everonet.com' + urlPath;

    const headers = {
      'Accept': 'application/json',
      'Authorization': signature,
      'Content-Type': 'application/json',
      'DateTime': dateTime,
      'MsgID': msgID,
      'SignType': 'SHA256',
      'X-Trace-Id': traceId
    };

    console.log('Request Headers:', headers);

    const response = await axios.get(url, { headers });

    console.log('Result:', response.data);

    if (response.data?.result?.code === 'S0000') {
      const paymentStatus = response.data.merchantOrderInfo?.status || 'Unknown';
      if (paymentStatus === 'Paid') {
        orderState.updateStatus(orderId, 'success');
      }
      return res.json({
        orderId,
        status: paymentStatus,
        message: '支付状态查询成功',
        result: response.data.result
      });
    } else {
      return res.status(500).json({
        error: '查询支付状态失败',
        details: response.data
      });
    }
  } catch (err) {
    console.error('查询失败:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      headers: err.response?.headers
    });
    return res.status(500).json({
      error: '查询支付状态失败',
      details: err.response?.data || err.message
    });
  }
});

// LinkPay: Webhook Handling
app.post('/linkpay/webhook', async (req, res) => {
  console.log('=== LinkPay 收到 Webhook ===');
  console.log('Headers:', req.headers);
  console.log('Body:', JSON.stringify(req.body, null, 2));

  const { eventCode, merchantOrderInfo, transactionInfo, refund, result, paymentMethod, userInfo } = req.body || {};
  const { merchantOrderID, status } = merchantOrderInfo || {};
  const transInfo = transactionInfo || refund || {};
  const { transAmount, merchantTransInfo } = transInfo;
  const { value: amount } = transAmount || {};
  const { merchantTransID, merchantTransTime } = merchantTransInfo || {};

  if (!eventCode || !merchantOrderID || !status || !amount || !merchantTransID || !merchantTransTime || !result) {
    console.error('[Webhook Invalid] Missing required fields:', JSON.stringify(req.body, null, 2));
    return res.status(400).send('FAIL');
  }

  if (result.code !== 'S0000') {
    console.error('[Webhook Invalid] Invalid result code:', result);
    return res.status(400).send('FAIL');
  }

  const receivedSign = req.headers['authorization'];
  const dateTime = req.headers['datetime'];
  const msgID = req.headers['msgid'];
  const signType = req.headers['signtype'];

  if (!receivedSign || !dateTime || !msgID || signType !== 'SHA256') {
    console.error('[Webhook Invalid] Missing or invalid headers:', { receivedSign, status });
    return res.status(400).send('FAIL');
  }

  const notifyId = `${merchantOrderID}_${merchantTransID}_${eventCode}`;

  if (notificationState.has(notifyId)) {
    console.log('[Webhook Duplicate]', { notifyId });
    return res.status(200).send('SUCCESS');
  }

  const method = 'POST';
  const urlPath = '/linkpay/webhook';
  const bodyString = JSON.stringify(req.body);
  const stringToSign = [method, urlPath, dateTime, keyLinkPay, msgID, bodyString].join('\n');
  const computedSign = crypto.createHash('sha256').update(stringToSign).digest('hex');

  console.log('[Sign Debug]', { stringToSign, computedSign, receivedSign });

  if (computedSign !== receivedSign) {
    console.error('[Webhook Error] Signature mismatch', { computedSign, receivedSign });
    return res.status(400).send('FAIL');
  }

  const order = orderState.get(merchantOrderID);
  if (!order) {
    console.warn('[Webhook Warning] Order not found', { merchantOrderID });
    // 不返回失败，继续处理
  }

  try {
    // 保存 token（如果是订阅支付，只要有token就保存）
    if (paymentMethod?.token?.value && userInfo?.reference) {
      const tokenData = {
        token: paymentMethod.token.value,
        card: paymentMethod.card || {},
        paymentMethod: paymentMethod.card?.paymentBrand || paymentMethod.type || paymentMethod.paymentMethodVariant || 'unknown',
        createdAt: new Date().toISOString()
      };
      tokenStore.set(userInfo.reference, tokenData);
      await saveTokens(); // 保存到存储
      console.log('[Webhook Processed] Token saved', { userReference: userInfo.reference, token: paymentMethod.token.value });
    }
    
    // 处理支付成功事件
    if (eventCode === 'LinkPay' && status === 'Paid') {
      if (order) {
        if (Number(order.totalAmount) !== Number(amount)) {
          console.error('[Webhook Invalid] Amount mismatch', { expected: order.totalAmount, received: amount });
          // 不返回失败，继续处理
        }
        orderState.updateStatus(merchantOrderID, 'success');
      }
      console.log('[Webhook Processed] Payment successful', { merchantOrderID, status: 'Paid', merchantTransID });
    } else if (eventCode === 'LinkPay Refund' && refund?.status === 'Success') {
      if (order) {
        if (Number(amount) > order.totalAmount - order.refundedAmount) {
          console.error('[Webhook Invalid] Refund amount exceeds remaining balance', { expected: order.totalAmount - order.refundedAmount, received: amount });
          // 不返回失败，继续处理
        }
        orderState.updateRefundedAmount(merchantOrderID, Number(amount));
        orderState.updateStatus(merchantOrderID, status.toLowerCase());
      }
      console.log('[Webhook Processed] Refund successful', { merchantOrderID, status, merchantTransID, refundedAmount: amount });
    }

    notificationState.add(notifyId);
    res.status(200).send('SUCCESS');
  } catch (err) {
    console.error('[Webhook Error]', err);
    res.status(500).send('FAIL');
  }
});

// LinkPay: Initiate Refund
app.post('/linkpay/refund-payment/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const { amount } = req.body;

  console.log('[LinkPay Refund Request]', { orderId, refundAmount: amount });

  if (!orderId || !amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: '缺少 orderId 或 amount 参数，或无效金额' });
  }

  const order = orderState.get(orderId);
  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }
  if (order.status !== 'success') {
    return res.status(400).json({ result: { code: 'B0014', message: '无效订单状态' } });
  }
  const remaining = order.totalAmount - order.refundedAmount;
  if (Number(amount) > remaining) {
    return res.status(400).json({ error: '退款金额超过剩余余额' });
  }

  const dateTime = getDateTimeString();
  const msgID = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
  const traceId = crypto.randomUUID().replace(/-/g, '');
  const urlPath = `/g2/v0/payment/mer/S005188/evo.e-commerce.linkpayRefund/${orderId}`;

  const refundBody = {
    merchantTransInfo: {
      merchantTransID: 'REFUND_' + Date.now(),
      merchantTransTime: dateTime
    },
    transAmount: {
      currency: 'HKD',
      value: String(amount)
    },
    webhook: WEBHOOK_LINKPAY_URL
  };

  const stringToSign = ['POST', urlPath, dateTime, keyLinkPay, msgID, JSON.stringify(refundBody)].join('\n');
  const signature = crypto.createHash('sha256').update(stringToSign).digest('hex');

  const headers = {
    'Accept': 'application/json',
    'Authorization': signature,
    'Content-Type': 'application/json',
    'DateTime': dateTime,
    'MsgID': msgID,
    'SignType': 'SHA256',
    'X-Trace-Id': traceId
  };

  try {
    const response = await axios.post(
      'https://hkg-counter-uat.everonet.com' + urlPath,
      refundBody,
      { headers }
    );

    console.log('[LinkPay Refund Response]', response.data);

    if (response.data?.result?.code === 'S0000') {
      orderState.updateRefundedAmount(orderId, Number(amount));
    }

    return res.json(response.data);
  } catch (err) {
    console.error('退款失败:', {
      message: err.message,
      response: err.response?.data
    });
    return res.status(500).json({ error: '退款失败', details: err.response?.data || err.message });
  }
});

// LinkPay: Query Refund Status
app.get('/linkpay/refund-result/:transId', async (req, res) => {
  const { transId } = req.params;

  console.log('[LinkPay Refund Status Query]', { transId });

  if (!transId) {
    return res.status(400).json({ error: '缺少 transId 参数' });
  }

  const dateTime = getDateTimeString();
  const msgID = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
  const traceId = crypto.randomUUID().replace(/-/g, '');
  const urlPath = `/goba/v2/payment/merchants/S005780672/evo.e-commerce/refunded/${transId}`;

  const stringToSign = ['GET', urlPath, dateTime, keyLinkPay, msgID].join('\n');
  const signature = crypto.createHash('sha256').update(stringToSign).digest('hex');

  const headers = {
    'Accept': 'application/json',
    'Authorization': signature,
    'Content-Type': 'application/json',
    'DateTime': dateTime,
    'MsgID': msgID,
    'SignType': 'SHA256',
    'X-Trace-Id': traceId
  };

  try {
    const response = await axios.get(
      'https://hkg-counter-uat.everonet.com' + urlPath,
      { headers }
    );

    console.log('[LinkPay Refund Status Response]', response.data);

    return res.json(response.data);
  } catch (err) {
    console.error('查询退款失败:', {
      message: err.message,
      response: err.response?.data
    });
    return res.status(500).json({ error: '查询退款失败', details: err.response?.data || err.message });
  }
});

// Dropin: Create Payment Link
app.post('/dropin/create-payment', async (req, res) => {
  try {
    const { amount, userReference, isSubscription } = req.body;
    if (!amount || !userReference) {
      return res.status(400).json({ error: '缺少 amount 或 userReference 参数' });
    }

    const method = 'POST';
    const urlPath = '/interaction';
    const dateTime = new Date().toISOString();
    const traceId = crypto.randomUUID().replace(/-/g, '');

    console.log('=== Dropin X-Trace-Id ===\n' + traceId);

    const orderId = 'DEMO_' + Date.now();
    
    const body = {
      merchantOrderInfo: {
        merchantOrderID: orderId,
        merchantOrderTime: dateTime
      },
      transAmount: {
        currency: 'HKD',
        value: String(amount)
      },
      userInfo: {
        reference: userReference
      },
      returnUrl: `${req.protocol}://${req.get('host')}/checkout/index.html?payment=success&orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(String(amount))}&method=Dropin`,
      webhook: `${req.protocol}://${req.get('host')}/dropin/webhook`
    };

    // 添加订阅相关参数
    if (isSubscription) {
      body.paymentMethod = {
        recurringProcessingModel: 'Subscription'
      };
    }

    const bodyString = JSON.stringify(body, null, 0);

    console.log('\n===============');
    console.log(method);
    console.log(urlPath);
    console.log(dateTime);
    console.log(signKeyDropin);
    console.log(bodyString);
    console.log('===============\n');

    const response = await axios.post(
      'https://sandbox.evonetonline.com' + urlPath,
      bodyString,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': signKeyDropin,
          'DateTime': dateTime,
          'SignType': 'Key-based',
          'KeyID': keyID,
          'X-Trace-Id': traceId
        }
      }
    );

    console.log('Result:', response.data);

    if (response.data?.result?.code === 'S0000' && response.data?.linkUrl) {
      return res.json({
        message: '创建支付链接成功',
        paymentLink: response.data.linkUrl,
        orderId: response.data.merchantOrderInfo?.merchantOrderID,
        expires: response.data.expiryTime
      });
    } else {
      return res.status(500).json({
        error: '创建支付链接失败',
        details: response.data
      });
    }
  } catch (err) {
    console.error('调用失败:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      headers: err.response?.headers
    });
    return res.status(500).json({
      error: '创建支付链接失败',
      details: err.response?.data || err.message
    });
  }
});

// Dropin: Query Payment Result
app.get('/dropin/query-payment/:merchantOrderID', async (req, res) => {
  try {
    const { merchantOrderID } = req.params;
    if (!merchantOrderID) {
      return res.status(400).json({ error: '缺少 merchantOrderID 参数' });
    }

    const method = 'GET';
    const urlPath = `/interaction/${merchantOrderID}`;
    const dateTime = new Date().toISOString();
    const traceId = crypto.randomUUID().replace(/-/g, '');

    console.log('=== Dropin Query X-Trace-Id ===\n' + traceId);
    console.log('\n===============');
    console.log(method);
    console.log(urlPath);
    console.log(dateTime);
    console.log(signKeyDropin);
    console.log('===============\n');

    const response = await axios.get(
      'https://sandbox.evonetonline.com' + urlPath,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': signKeyDropin,
          'DateTime': dateTime,
          'SignType': 'Key-based',
          'KeyID': keyID,
          'X-Trace-Id': traceId
        }
      }
    );

    console.log('Query Result:', JSON.stringify(response.data, null, 2));

    return res.json({
      message: '查询支付结果成功',
      result: response.data
    });
  } catch (err) {
    console.error('查询失败:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      headers: err.response?.headers
    });
    return res.status(500).json({
      error: '查询支付结果失败',
      details: err.response?.data || err.message
    });
  }
});

// Dropin: Save Token
app.post('/dropin/save-token', async (req, res) => {
  const { userReference, token, card, paymentMethod } = req.body;
  if (!userReference || !token || !paymentMethod) {
    return res.status(400).json({ error: '缺少 userReference, token 或 paymentMethod 参数' });
  }

  const tokenData = {
    token,
    card: card || {},
    paymentMethod: paymentMethod || 'unknown',
    createdAt: new Date().toISOString()
  };
  if (tokenStore.has(userReference)) {
    console.log(`Token 已经存在 for user: ${userReference}, 更新为: ${JSON.stringify(tokenData)}`);
  } else {
    console.log(`保存新 token: ${JSON.stringify(tokenData)} for user: ${userReference}`);
  }
  tokenStore.set(userReference, tokenData);
  await saveTokens(); // 保存到存储
  console.log('Current tokenStore:', Array.from(tokenStore.entries()));
  res.json({ message: 'Token 保存成功' });
});

// Dropin: Check Token
app.get('/dropin/check-token/:userReference', (req, res) => {
  const { userReference } = req.params;
  if (!userReference) {
    return res.status(400).json({ error: '缺少 userReference 参数' });
  }

  const hasToken = tokenStore.has(userReference);
  console.log(`检查 token for user: ${userReference}, 存在: ${hasToken}`);
  res.json({ hasToken });
});

// Dropin: Create Subscription Payment
app.post('/dropin/create-subscription', async (req, res) => {
  try {
    const { amount, userReference, paymentMethod } = req.body;
    if (!amount || !userReference || !paymentMethod) {
      return res.status(400).json({ error: '缺少 amount, userReference 或 paymentMethod 参数' });
    }

    const tokenData = tokenStore.get(userReference);
    if (!tokenData || !tokenData.token) {
      return res.status(400).json({ error: '未找到与 userReference 关联的 token' });
    }

    // 验证支付方式
    if (tokenData.paymentMethod !== paymentMethod && tokenData.paymentMethod !== 'unknown') {
      console.log(`支付方式不匹配: 前端发送 ${paymentMethod}, token 关联 ${tokenData.paymentMethod}`);
      return res.status(400).json({
        error: `支付方式不匹配：token 关联的支付方式为 ${tokenData.paymentMethod}`
      });
    }

    const method = 'POST';
    const urlPath = '/payment';
    const dateTime = new Date().toISOString();
    const traceId = crypto.randomUUID().replace(/-/g, '');

    console.log('=== Dropin Subscription X-Trace-Id ===\n' + traceId);

    const orderId = 'SUB_' + Date.now();
    
    const body = {
      merchantTransInfo: {
        merchantOrderReference: orderId,
        merchantTransTime: dateTime
      },
      transAmount: {
        currency: 'HKD',
        value: String(amount)
      },
      paymentMethod: {
        type: 'token',
        token: { value: tokenData.token },
        recurringProcessingModel: 'Subscription'
      },
      captureAfterHours: '0',
      // allowAuthentication: true,
      returnURL: `${req.protocol}://${req.get('host')}/checkout/index.html?payment=success&orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(String(amount))}&method=Dropin`,
      webhook: 'https://6ee8218a-52e4-4b16-8d67-594cdb34bb23.mock.pstmn.io'
    };

    const bodyString = JSON.stringify(body, null, 0);

    console.log('\n===============');
    console.log(method);
    console.log(urlPath);
    console.log(dateTime);
    console.log(signKeyDropin);
    console.log(bodyString);
    console.log('===============\n');

    const response = await axios.post(
      'https://sandbox.evonetonline.com' + urlPath,
      bodyString,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': signKeyDropin,
          'DateTime': dateTime,
          'SignType': 'Key-based',
          'KeyID': keyID,
          'X-Trace-Id': traceId
        }
      }
    );

    console.log('Subscription Result:', JSON.stringify(response.data, null, 2));

    if (response.data?.result?.code === 'S0000') {
      const paymentMethodUsed = response.data.paymentMethod?.card?.paymentBrand ||
                               response.data.paymentMethod?.type ||
                               response.data.paymentMethod?.paymentMethodVariant ||
                               paymentMethod;
      if (response.data.action?.type === 'completed') {
        return res.json({
          message: '创建订阅支付成功',
          orderId: response.data.payment?.merchantTransInfo?.merchantOrderReference,
          status: response.data.payment?.status || 'captured',
          paymentMethod: paymentMethodUsed
        });
      } else if (response.data.linkUrl) {
        return res.json({
          message: '创建订阅支付成功',
          paymentLink: response.data.linkUrl,
          orderId: response.data.payment?.merchantTransInfo?.merchantOrderReference,
          expires: response.data.expiryTime,
          paymentMethod: paymentMethodUsed
        });
      } else {
        return res.status(500).json({
          error: '创建订阅支付失败：缺少 paymentLink 或 completed 状态',
          details: response.data
        });
      }
    } else {
      return res.status(500).json({
        error: '创建订阅支付失败',
        details: response.data
      });
    }
  } catch (err) {
    console.error('订阅支付失败:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      headers: err.response?.headers
    });
    return res.status(500).json({
      error: '创建订阅支付失败',
      details: err.response?.data || err.message
    });
  }
});

// Dropin: Webhook Handling
app.post('/dropin/webhook', async (req, res) => {
  console.log('Dropin Webhook received at:', new Date().toISOString());
  console.log('Webhook headers:', JSON.stringify(req.headers, null, 2));
  console.log('Webhook body:', JSON.stringify(req.body, null, 2));

  const { paymentMethod, userInfo, result } = req.body;
  if (!result || result.code !== 'S0000') {
    console.warn('Webhook invalid: Invalid result code', { result });
    return res.status(400).send('FAIL');
  }

  if (paymentMethod?.token?.value && userInfo?.reference) {
    const tokenData = {
      token: paymentMethod.token.value,
      card: paymentMethod.card || {},
      paymentMethod: paymentMethod.card?.paymentBrand || paymentMethod.type || paymentMethod.paymentMethodVariant || 'unknown',
      createdAt: new Date().toISOString()
    };
    if (tokenStore.has(userInfo.reference)) {
      console.log(`Token 已经存在 for user: ${userInfo.reference}, 更新为: ${JSON.stringify(tokenData)}`);
    } else {
      console.log(`保存新 token: ${JSON.stringify(tokenData)} for user: ${userInfo.reference}`);
    }
    tokenStore.set(userInfo.reference, tokenData);
    await saveTokens(); // 保存到存储
    console.log('Current tokenStore:', Array.from(tokenStore.entries()));
  } else {
    console.warn('Webhook data invalid:', {
      hasToken: !!paymentMethod?.token?.value,
      hasUserReference: !!userInfo?.reference,
      paymentMethodDetails: paymentMethod
    });
    return res.status(400).send('FAIL');
  }
  res.status(200).send('SUCCESS');
});

// Direct API: Process Payment
app.post('/payment', async (req, res) => {
  try {
    let paymentData = req.body;
    
    console.log('=== Direct API Payment Request ===');
    console.log('Request Body:', JSON.stringify(paymentData, null, 2));
    
    // 处理 Apple Pay 支付
    if (paymentData.applePayData && paymentData.applePayData.paymentToken) {
      console.log('Processing Apple Pay payment...');
      const applePayToken = paymentData.applePayData.paymentToken;
      
      try {
        // 读取 Apple Pay 证书
        const fs = require('fs');
        const path = require('path');
        const certPath = path.join(__dirname, 'apple_pay.cer');
        
        if (!fs.existsSync(certPath)) {
          throw new Error('Apple Pay certificate not found');
        }
        
        console.log('Apple Pay certificate found:', certPath);
        
        // 由于需要私钥进行解密，这里暂时使用模拟数据
        // 实际实现时，需要：
        // 1. 从 applePayToken.paymentData.header 中提取 ephemeralPublicKey
        // 2. 使用 Payment Processing Certificate 的私钥和 ephemeralPublicKey 生成共享密钥
        // 3. 使用共享密钥和解密算法解密 applePayToken.paymentData.data
        
        // 模拟解密后的数据
        const decryptedData = {
          applicationPrimaryAccountNumber: '483196******6467',
          applicationExpirationDate: '281231',
          currencyCode: '344', // HKD
          transactionAmount: parseFloat(paymentData.transAmount.value),
          paymentDataType: '3DSecure',
          paymentData: {
            onlinePaymentCryptogram: 'AwAAAAQAPQe4ZeoAAAAAgTNgAQA=',
            eciIndicator: '7'
          },
          paymentBrand: applePayToken.paymentMethod.network === 'visa' ? 'Visa' : 
                       applePayToken.paymentMethod.network === 'masterCard' ? 'Mastercard' : 
                       applePayToken.paymentMethod.network
        };
        
        console.log('Decrypted Apple Pay data:', decryptedData);
        
        // 更新 paymentData 的 paymentMethod 字段
        paymentData.paymentMethod = {
          type: 'token',
          token: {
            value: decryptedData.applicationPrimaryAccountNumber,
            type: 'networkToken',
            paymentBrand: decryptedData.paymentBrand,
            walletIdentifiers: 'ApplePay',
            expiryDate: decryptedData.applicationExpirationDate.substring(2), // 取后4位：1231
            tokenCryptogram: decryptedData.paymentData.onlinePaymentCryptogram,
            eci: decryptedData.paymentData.eciIndicator
          }
        };
        
        // 移除 applePayData 字段，因为 EGMS API 不需要这个字段
        delete paymentData.applePayData;
        
        console.log('Updated paymentData for Apple Pay:', JSON.stringify(paymentData, null, 2));
      } catch (error) {
        console.error('Apple Pay processing error:', error);
        // 如果处理失败，仍然使用模拟数据继续
        console.log('Using fallback mock data for Apple Pay');
        
        // 模拟解密后的数据
        const decryptedData = {
          applicationPrimaryAccountNumber: '483196******6467',
          applicationExpirationDate: '281231',
          currencyCode: '344', // HKD
          transactionAmount: parseFloat(paymentData.transAmount.value),
          paymentDataType: '3DSecure',
          paymentData: {
            onlinePaymentCryptogram: 'AwAAAAQAPQe4ZeoAAAAAgTNgAQA=',
            eciIndicator: '7'
          },
          paymentBrand: applePayToken.paymentMethod.network === 'visa' ? 'Visa' : 
                       applePayToken.paymentMethod.network === 'masterCard' ? 'Mastercard' : 
                       applePayToken.paymentMethod.network
        };
        
        // 更新 paymentData 的 paymentMethod 字段
        paymentData.paymentMethod = {
          type: 'token',
          token: {
            value: decryptedData.applicationPrimaryAccountNumber,
            type: 'networkToken',
            paymentBrand: decryptedData.paymentBrand,
            walletIdentifiers: 'ApplePay',
            expiryDate: decryptedData.applicationExpirationDate.substring(2),
            tokenCryptogram: decryptedData.paymentData.onlinePaymentCryptogram,
            eci: decryptedData.paymentData.eciIndicator
          }
        };
        
        // 移除 applePayData 字段
        delete paymentData.applePayData;
      }
    }
    
    const dateTime = new Date().toISOString();
    const traceId = crypto.randomUUID().replace(/-/g, '');
    const idempotencyKey = paymentData.merchantTransInfo?.merchantTransID || 'order_' + Date.now();
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': signKeyDropin,
      'DateTime': dateTime,
      'KeyID': keyID,
      'SignType': 'Key-based',
      'Idempotency-Key': idempotencyKey,
      'X-Trace-Id': traceId
    };
    
    console.log('Request Headers:', JSON.stringify(headers, null, 2));
    
    const response = await axios.post(
      'https://sandbox.evonetonline.com/payment',
      paymentData,
      { headers }
    );
    
    console.log('=== Direct API Payment Response ===');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    res.json(response.data);
  } catch (err) {
    console.error('Direct API Payment Error:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      headers: err.response?.headers
    });
    res.status(500).json({
      error: '支付失败',
      details: err.response?.data || err.message
    });
  }
});

// Direct API: Webhook Handling
app.post('/webhook', (req, res) => {
  console.log('=== Direct API Webhook Received ===');
  console.log('Time:', new Date().toISOString());
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  const { eventCode, payment } = req.body;
  
  if (eventCode === 'Payment' && payment?.status === 'captured') {
    console.log('Payment successful:', {
      merchantTransID: payment.merchantTransInfo?.merchantTransID,
      amount: payment.transAmount?.value,
      currency: payment.transAmount?.currency
    });
  }
  
  res.status(200).send('SUCCESS');
});

// Subscription: MIT Transaction (Using saved token)
app.post('/subscription/mit-payment', async (req, res) => {
  try {
    const { amount, userReference, captureAfterHours = '0' } = req.body;
    
    if (!amount || !userReference) {
      return res.status(400).json({ error: '缺少 amount 或 userReference 参数' });
    }
    
    // 获取保存的 token
    const tokenData = tokenStore.get(userReference);
    if (!tokenData || !tokenData.token) {
      return res.status(400).json({ error: '未找到与 userReference 关联的 token' });
    }
    
    const dateTime = new Date().toISOString();
    const traceId = crypto.randomUUID().replace(/-/g, '');
    const merchantTransID = 'SUB_' + Date.now();
    
    console.log('=== Subscription MIT X-Trace-Id ===\n' + traceId);
    
    const body = {
      merchantTransInfo: {
        merchantTransID: merchantTransID,
        merchantTransTime: dateTime
      },
      transAmount: {
        currency: 'HKD',
        value: String(amount)
      },
      paymentMethod: {
        token: {
          value: tokenData.token
        },
        recurringProcessingModel: 'Subscription'
      },
      captureAfterHours: captureAfterHours,
      returnURL: `${req.protocol}://${req.get('host')}/checkout/index.html?payment=success&orderId=${encodeURIComponent(merchantTransID)}&amount=${encodeURIComponent(String(amount))}&method=Subscription`,
      webhook: `${req.protocol}://${req.get('host')}/webhook`
    };
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': signKeyDropin,
      'DateTime': dateTime,
      'KeyID': keyID,
      'SignType': 'Key-based',
      'Idempotency-Key': merchantTransID,
      'X-Trace-Id': traceId
    };
    
    console.log('MIT Payment Request:', JSON.stringify(body, null, 2));
    console.log('Request Headers:', JSON.stringify(headers, null, 2));
    
    const response = await axios.post(
      'https://sandbox.evonetonline.com/payment',
      body,
      { headers }
    );
    
    console.log('=== MIT Payment Response ===');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    res.json({
      message: '订阅支付成功',
      orderId: merchantTransID,
      result: response.data
    });
  } catch (err) {
    console.error('MIT Payment Error:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      headers: err.response?.headers
    });
    res.status(500).json({
      error: '订阅支付失败',
      details: err.response?.data || err.message
    });
  }
});

// Get saved tokens for a user - 从查询接口获取 token
app.get('/subscription/tokens/:userReference', async (req, res) => {
  const { userReference } = req.params;
  
  // 首先检查内存中是否有 token
  let tokenData = tokenStore.get(userReference);
  
  if (tokenData) {
    console.log('Found token in memory for user:', userReference);
    return res.json({
      success: true,
      userReference,
      tokenData
    });
  }
  
  // 如果内存中没有，尝试从最近的订单中查询
  // 注意：在实际生产环境中，应该从数据库中查询
  console.log('No token found in memory for user:', userReference);
  res.json({
    success: false,
    message: '未找到保存的 token，请先完成首次订阅支付'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on:
    - http://localhost:${PORT}
    - http://10.30.1.104:${PORT}`);
});