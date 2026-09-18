import type { Dataset, AnalysisHistoryItem, AnalysisMessage, AppSettings } from '../types/models';

export const MOCK_DATASETS: Dataset[] = [
  {
    id: 'ds-saas-revenue',
    name: 'SaaS Monthly Subscriptions & Churn',
    filename: 'saas_mrr_churn_2024.csv',
    format: 'csv',
    row_count: 24850,
    column_count: 8,
    file_size: '3.4 MB',
    uploaded_at: '2024-10-14 11:20 AM',
    description: 'Customer subscription tiers, recurring revenue, plan upgrades, and monthly churn rates.',
    columns: [
      { name: 'customer_id', dtype: 'string', null_count: 0, unique_count: 24850, sample_values: ['CUST-1049', 'CUST-2039', 'CUST-3940'] },
      { name: 'plan_tier', dtype: 'string', null_count: 0, unique_count: 4, sample_values: ['Starter', 'Pro', 'Enterprise', 'Custom'] },
      { name: 'monthly_spend', dtype: 'float', null_count: 12, unique_count: 1540, sample_values: [49.00, 199.00, 1200.00], stats: { min: 29.00, max: 8500.00, mean: 420.50, median: 199.00, std: 680.20 } },
      { name: 'region', dtype: 'string', null_count: 0, unique_count: 5, sample_values: ['North America', 'EMEA', 'APAC', 'LATAM'] },
      { name: 'signup_date', dtype: 'datetime', null_count: 0, unique_count: 890, sample_values: ['2023-01-15', '2023-06-20', '2024-02-10'] },
      { name: 'churned', dtype: 'boolean', null_count: 0, unique_count: 2, sample_values: [false, true] },
      { name: 'nps_score', dtype: 'integer', null_count: 150, unique_count: 11, sample_values: [9, 10, 7, 8], stats: { min: 1, max: 10, mean: 8.2, median: 9, std: 1.6 } },
      { name: 'support_tickets_count', dtype: 'integer', null_count: 0, unique_count: 25, sample_values: [0, 2, 5, 1], stats: { min: 0, max: 34, mean: 2.1, median: 1, std: 3.2 } },
    ],
    preview_rows: [
      { customer_id: 'CUST-1049', plan_tier: 'Enterprise', monthly_spend: 1200.00, region: 'North America', signup_date: '2023-01-15', churned: false, nps_score: 10, support_tickets_count: 1 },
      { customer_id: 'CUST-2039', plan_tier: 'Pro', monthly_spend: 199.00, region: 'EMEA', signup_date: '2023-04-12', churned: false, nps_score: 8, support_tickets_count: 3 },
      { customer_id: 'CUST-3940', plan_tier: 'Starter', monthly_spend: 49.00, region: 'APAC', signup_date: '2023-08-01', churned: true, nps_score: 4, support_tickets_count: 7 },
      { customer_id: 'CUST-4122', plan_tier: 'Enterprise', monthly_spend: 2450.00, region: 'North America', signup_date: '2023-11-20', churned: false, nps_score: 9, support_tickets_count: 0 },
      { customer_id: 'CUST-5891', plan_tier: 'Pro', monthly_spend: 199.00, region: 'LATAM', signup_date: '2024-01-05', churned: false, nps_score: 7, support_tickets_count: 2 },
      { customer_id: 'CUST-6102', plan_tier: 'Starter', monthly_spend: 49.00, region: 'EMEA', signup_date: '2024-03-18', churned: false, nps_score: 8, support_tickets_count: 1 },
    ]
  },
  {
    id: 'ds-ecom-orders',
    name: 'Global E-Commerce Sales & Logistics',
    filename: 'global_orders_2024.xlsx',
    format: 'xlsx',
    row_count: 51200,
    column_count: 7,
    file_size: '6.8 MB',
    uploaded_at: '2024-10-16 02:45 PM',
    description: 'Multi-country transactions with order value, discount margins, shipping times, and category distributions.',
    columns: [
      { name: 'order_id', dtype: 'string', null_count: 0, unique_count: 51200, sample_values: ['ORD-9481', 'ORD-9482'] },
      { name: 'category', dtype: 'string', null_count: 0, unique_count: 6, sample_values: ['Electronics', 'Furniture', 'Apparel'] },
      { name: 'sales_amount', dtype: 'float', null_count: 0, unique_count: 4210, sample_values: [149.99, 899.00], stats: { min: 9.99, max: 4999.00, mean: 185.40, median: 89.50, std: 240.10 } },
      { name: 'discount_rate', dtype: 'float', null_count: 0, unique_count: 10, sample_values: [0.05, 0.15, 0.00], stats: { min: 0.00, max: 0.40, mean: 0.08, median: 0.05, std: 0.06 } },
      { name: 'shipping_days', dtype: 'integer', null_count: 35, unique_count: 14, sample_values: [2, 4, 1], stats: { min: 1, max: 18, mean: 3.4, median: 3, std: 1.8 } },
      { name: 'country', dtype: 'string', null_count: 0, unique_count: 22, sample_values: ['United States', 'Germany', 'Japan'] },
      { name: 'payment_method', dtype: 'string', null_count: 0, unique_count: 4, sample_values: ['Credit Card', 'Apple Pay', 'PayPal'] },
    ],
    preview_rows: [
      { order_id: 'ORD-9481', category: 'Electronics', sales_amount: 899.00, discount_rate: 0.05, shipping_days: 2, country: 'United States', payment_method: 'Apple Pay' },
      { order_id: 'ORD-9482', category: 'Apparel', sales_amount: 120.50, discount_rate: 0.10, shipping_days: 3, country: 'Germany', payment_method: 'Credit Card' },
      { order_id: 'ORD-9483', category: 'Furniture', sales_amount: 450.00, discount_rate: 0.00, shipping_days: 6, country: 'Japan', payment_method: 'PayPal' },
      { order_id: 'ORD-9484', category: 'Electronics', sales_amount: 1499.00, discount_rate: 0.15, shipping_days: 2, country: 'United States', payment_method: 'Credit Card' },
    ]
  }
];

export const MOCK_ANALYSIS_MESSAGES: AnalysisMessage[] = [
  {
    id: 'msg-1',
    sender: 'user',
    timestamp: '10:42 AM',
    content: 'Which subscription plan tier has the highest average monthly spend and lowest churn rate?'
  },
  {
    id: 'msg-2',
    sender: 'assistant',
    timestamp: '10:43 AM',
    content: 'Here is the comparative breakdown of average monthly spend vs. churn rate across all subscription tiers in the dataset:',
    sql: `SELECT 
  plan_tier,
  COUNT(customer_id) AS total_customers,
  ROUND(AVG(monthly_spend), 2) AS avg_monthly_spend,
  ROUND(SUM(CASE WHEN churned = true THEN 1 ELSE 0 END) * 100.0 / COUNT(customer_id), 2) AS churn_rate_pct,
  ROUND(AVG(nps_score), 1) AS avg_nps
FROM saas_mrr_churn_2024
GROUP BY plan_tier
ORDER BY avg_monthly_spend DESC;`,
    explanation: 'Enterprise tier customers generate the highest average spend ($1,840/mo) with the lowest churn (3.2%), whereas Starter plans exhibit an 18.6% churn rate despite having a larger volume of users.',
    chart: {
      type: 'bar',
      xAxisKey: 'plan_tier',
      yAxisKey: 'avg_monthly_spend',
      title: 'Average Monthly Spend ($) by Plan Tier',
      data: [
        { plan_tier: 'Enterprise', avg_monthly_spend: 1840, churn_rate: 3.2, nps: 9.4 },
        { plan_tier: 'Custom', avg_monthly_spend: 960, churn_rate: 5.8, nps: 8.9 },
        { plan_tier: 'Pro', avg_monthly_spend: 199, churn_rate: 11.4, nps: 8.1 },
        { plan_tier: 'Starter', avg_monthly_spend: 49, churn_rate: 18.6, nps: 7.2 },
      ]
    },
    tableData: {
      columns: ['plan_tier', 'total_customers', 'avg_monthly_spend', 'churn_rate_pct', 'avg_nps'],
      rows: [
        { plan_tier: 'Enterprise', total_customers: '2,140', avg_monthly_spend: '$1,840.00', churn_rate_pct: '3.2%', avg_nps: '9.4' },
        { plan_tier: 'Custom', total_customers: '1,420', avg_monthly_spend: '$960.00', churn_rate_pct: '5.8%', avg_nps: '8.9' },
        { plan_tier: 'Pro', total_customers: '9,850', avg_monthly_spend: '$199.00', churn_rate_pct: '11.4%', avg_nps: '8.1' },
        { plan_tier: 'Starter', total_customers: '11,440', avg_monthly_spend: '$49.00', churn_rate_pct: '18.6%', avg_nps: '7.2' },
      ]
    }
  }
];

export const MOCK_HISTORY_ITEMS: AnalysisHistoryItem[] = [
  {
    id: 'hist-1',
    question: 'Which subscription plan tier has the highest average monthly spend and lowest churn rate?',
    datasetId: 'ds-saas-revenue',
    datasetName: 'SaaS Monthly Subscriptions & Churn',
    timestamp: 'Today, 10:42 AM',
    analysisType: 'Aggregation',
    durationMs: 420,
    status: 'completed',
    previewResult: 'Enterprise tier generates $1,840/mo with 3.2% churn.'
  },
  {
    id: 'hist-2',
    question: 'Identify top 5 regions by total gross merchandise value and shipping lead time',
    datasetId: 'ds-ecom-orders',
    datasetName: 'Global E-Commerce Sales & Logistics',
    timestamp: 'Yesterday, 04:15 PM',
    analysisType: 'Trend Analysis',
    durationMs: 650,
    status: 'completed',
    previewResult: 'North America and EMEA account for 68% of sales volume.'
  },
  {
    id: 'hist-3',
    question: 'Is there a correlation between support ticket count and customer churn in Starter plans?',
    datasetId: 'ds-saas-revenue',
    datasetName: 'SaaS Monthly Subscriptions & Churn',
    timestamp: 'Oct 15, 2024',
    analysisType: 'Correlation',
    durationMs: 310,
    status: 'completed',
    previewResult: 'Customers with >4 tickets churn at a 3.4x higher rate.'
  },
  {
    id: 'hist-4',
    question: 'Detect pricing anomalies where discount rate exceeds 35%',
    datasetId: 'ds-ecom-orders',
    datasetName: 'Global E-Commerce Sales & Logistics',
    timestamp: 'Oct 12, 2024',
    analysisType: 'Anomaly Detection',
    durationMs: 580,
    status: 'completed',
    previewResult: 'Found 42 orders with outlier discounts flagged in Electronics.'
  }
];

export const MOCK_APP_SETTINGS: AppSettings = {
  theme: 'dark',
  apiKeys: {
    nvidiaNim: 'nvapi-********************************',
    nvidiaBaseUrl: 'https://integrate.api.nvidia.com/v1',
    nvidiaModel: 'meta/llama-3.1-70b-instruct'
  },
  postgres: {
    host: 'localhost',
    port: 5432,
    database: 'analytics_warehouse',
    username: 'readonly_analyst',
    ssl: true,
    status: 'connected'
  },
  preferences: {
    autoExecuteQuery: true,
    defaultChartType: 'bar',
    maxPreviewRows: 100,
    streamResponses: true
  }
};
