const translations = {
  zh: {
    brand: 'Dropin',
    welcome: '欢迎使用 Dropin',
    brand_intro: '安全、快速、便捷的在线支付解决方案，随时为您服务。',
    go_to_payment_options: '返回支付选择',
    go_to_refund: '前往退款',
    item: '商品',
    quantity: '数量',
    amount: '金额',
    total: '总计',
    create_payment: '创建支付',
    payment_instruction: '请选择支付方式并点击立即支付，跳转到安全支付页面。',
    select_payment_method: '选择支付方式',
    copy_card_info: '复制卡信息',
    pay_now: '立即支付',
    processing: '处理中...',
    payment_success: '支付成功',
    success_instruction: '感谢您的支付，请保存订单号以便查询。',
    order_id: '订单号',
    payment_method: '支付方式',
    payment_time: '支付时间',
    copy: '复制订单号',
    new_payment: '重新支付',
    card_info: '卡信息',
    copy_card_number: '复制卡号',
    copied: '已复制到剪贴板',
    payment_failed: '支付失败',
    payment_incomplete: '支付未完成，请重试',
    select_payment: '请选择支付方式',
    network_error: '网络错误，请稍后重试',
    footer: '© 2025 Dropin. 安全，快速的支付解决方案。',
    about_us: '关于我们',
    contact: '联系客服',
    one_time_payment: '一次性支付',
    subscription_payment: '订阅支付',
    sub_amount: '请输入订阅金额',
    user_reference: '用户标识',
    start_subscription: '发起订阅支付',
    subscription_success: '订阅成功',
    subscription_success_info: '感谢您的订阅！请保存用户标识以便管理。',
    subscription_time: '订阅时间',
    copy_user_reference: '复制用户标识',
    copied_user_reference: '用户标识已复制到剪贴板',
    new_subscription: '新的订阅',
    invalid_amount: '请输入有效的金额',
    invalid_user_reference: '请输入有效的用户标识',
    subscription_failed: '订阅支付失败：{error}',
    subscription_incomplete: '订阅支付未完成，请重试',
    token_required: '请先完成一次支付以绑定用户标识',
    token_missing: '未找到支付令牌',
    invalid_query_result: '支付查询结果无效',
    order_id_missing: '未找到订单号',
    query_failed: '支付查询失败',
    card_payment_required: '需要卡支付信息',
    payment_method_mismatch: '支付方式不匹配：token 关联的支付方式为 {method}'
  },
  en: {
    brand: 'Dropin',
    welcome: 'Welcome to Dropin',
    brand_intro: 'Secure, fast, and convenient online payment solutions at your service.',
    go_to_payment_options: 'Back to Payment Options',
    go_to_refund: 'Go to Refund',
    item: 'Item',
    quantity: 'Quantity',
    amount: 'Amount',
    total: 'Total',
    create_payment: 'Create Payment',
    payment_instruction: 'Please select a payment method and click Pay Now to proceed to the secure payment page.',
    select_payment_method: 'Select Payment Method',
    copy_card_info: 'Copy Card Info',
    pay_now: 'Pay Now',
    processing: 'Processing...',
    payment_success: 'Payment Successful',
    success_instruction: 'Thank you for your payment. Please save the order ID for reference.',
    order_id: 'Order ID',
    payment_method: 'Payment Method',
    payment_time: 'Payment Time',
    copy: 'Copy Order ID',
    new_payment: 'New Payment',
    card_info: 'Card Information',
    copy_card_number: 'Copy Card Number',
    copied: 'Copied to clipboard',
    payment_failed: 'Payment Failed',
    payment_incomplete: 'Payment not completed, please try again',
    select_payment: 'Please select a payment method',
    network_error: 'Network error, please try again later',
    footer: '© 2025 Dropin. Secure and fast payment solutions.',
    about_us: 'About Us',
    contact: 'Contact Support',
    one_time_payment: 'One-Time Payment',
    subscription_payment: 'Subscription Payment',
    sub_amount: 'Please enter subscription amount',
    user_reference: 'User Reference',
    start_subscription: 'Start Subscription',
    subscription_success: 'Subscription Successful',
    subscription_success_info: 'Thank you for your subscription! Please save your user reference for management.',
    subscription_time: 'Subscription Time',
    copy_user_reference: 'Copy User Reference',
    copied_user_reference: 'User reference copied to clipboard',
    new_subscription: 'New Subscription',
    invalid_amount: 'Please enter a valid amount',
    invalid_user_reference: 'Please enter a valid user reference',
    subscription_failed: 'Subscription failed: {error}',
    subscription_incomplete: 'Subscription not completed, please try again',
    token_required: 'Please complete a one-time payment to bind the user reference',
    token_missing: 'Payment token not found',
    invalid_query_result: 'Invalid payment query result',
    order_id_missing: 'Order ID not found',
    query_failed: 'Payment query failed',
    card_payment_required: 'Card payment information required',
    payment_method_mismatch: 'Payment method mismatch: token is associated with {method}'
  }
};

function updateContent(lang) {
  console.log(`[Dropin] Updating content to language: ${lang}`);
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    console.log(`[Dropin] Processing element with data-i18n="${key}"`);
    if (key.startsWith('[title]')) {
      const titleKey = key.replace('[title]', '');
      element.title = translations[lang][titleKey] || element.title;
      console.log(`[Dropin] Set title for "${key}" to: ${element.title}`);
    } else {
      element.textContent = translations[lang][key] || element.textContent;
      console.log(`[Dropin] Set textContent for "${key}" to: ${element.textContent}`);
    }
  });
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
  localStorage.setItem('preferredLanguage', lang);
}

document.getElementById('language-switch').addEventListener('change', (e) => {
  const lang = e.target.value;
  console.log(`[Dropin] Language switch triggered, setting to: ${lang}`);
  updateContent(lang);
});

document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('preferredLanguage') || (navigator.language.startsWith('zh') ? 'zh' : 'en');
  console.log(`[Dropin] DOMContentLoaded, initial language: ${savedLang}`);
  const langSwitch = document.getElementById('language-switch');
  if (langSwitch) {
    langSwitch.value = savedLang;
    updateContent(savedLang);
  }
});