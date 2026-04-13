import {
  dummyPaymentHandler,
  DefaultJobQueuePlugin,
  DefaultSearchPlugin,
  VendureConfig,
} from '@vendure/core'
import { defaultEmailHandlers, EmailPlugin } from '@vendure/email-plugin'
import { AssetServerPlugin } from '@vendure/asset-server-plugin'
import { AdminUiPlugin } from '@vendure/admin-ui-plugin'
import { BullMQJobQueuePlugin } from '@vendure/job-queue-plugin/package/bullmq'
import path from 'path'

const IS_DEV = process.env.APP_ENV === 'local'

// ─── Payment Handler: Cash on Delivery ────────────────────────────────────────
// بيتعامل مع الدفع عند الاستلام بدون أي integration خارجي
const cashOnDeliveryHandler = {
  ...dummyPaymentHandler,
  code: 'cash-on-delivery',
  description: [{ languageCode: 'ar' as any, value: 'الدفع عند الاستلام' }],
}

export const config: VendureConfig = {
  // ─── API Options ─────────────────────────────────────────────────────────────
  apiOptions: {
    port: +(process.env.PORT || 3000),
    adminApiPath: 'admin-api',
    shopApiPath: 'shop-api',

    // CORS — مهم جداً للواجهة الأمامية على subdomain مختلف
    cors: {
      origin: [
        // لوحة التحكم والـ API
        `https://${process.env.VENDURE_HOST}`,
        `http://${process.env.VENDURE_HOST}`,
        // الواجهة الأمامية
        'https://pandastore.bramjlive.com',
        'http://pandastore.bramjlive.com',
        // للتطوير المحلي
        'http://localhost:3000',
        'http://localhost:3001',
      ],
      credentials: true,
      // مهم جداً — يسمح للواجهة تقرأ الـ auth token
      exposedHeaders: ['vendure-auth-token'],
    },
  },

  // ─── Auth Options ─────────────────────────────────────────────────────────────
  authOptions: {
    // bearer + cookie معاً — يحل مشكلة cross-domain session
    tokenMethod: ['bearer', 'cookie'],

    cookieOptions: {
      secret: process.env.COOKIE_SECRET || 'change-me-in-production',
      // none + secure مطلوبين للـ cross-domain cookies
      sameSite: 'none',
      secure: true,
      httpOnly: true,
    },

    superadminCredentials: {
      identifier: process.env.SUPERADMIN_USERNAME || 'superadmin',
      password: process.env.SUPERADMIN_PASSWORD || 'superadmin',
    },

    // السماح بـ guest checkout بدون تسجيل
    requireVerification: false,
  },

  // ─── Database ─────────────────────────────────────────────────────────────────
  dbConnectionOptions: {
    type: 'postgres',
    synchronize: false,
    logging: IS_DEV,
    database: process.env.DB_NAME || 'vendure',
    schema: process.env.DB_SCHEMA || 'public',
    host: process.env.DB_HOST,
    port: +(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    migrations: [path.join(__dirname, '../migrations/*.js')],
  },

  // ─── Payment Methods ──────────────────────────────────────────────────────────
  paymentOptions: {
    paymentMethodHandlers: [
      dummyPaymentHandler,  // للاختبار
    ],
  },

  // ─── Plugins ──────────────────────────────────────────────────────────────────
  plugins: [
    // Assets — الصور والملفات
    AssetServerPlugin.init({
      route: 'assets',
      assetUploadDir: process.env.ASSET_UPLOAD_DIR || path.join(__dirname, '../assets'),
    }),

    // Job Queue بـ BullMQ + Redis
    BullMQJobQueuePlugin.init({
      connection: {
        host: process.env.REDIS_HOST,
        port: 6379,
        password: process.env.REDIS_PASSWORD,
      },
    }),

    // البحث في المنتجات
    DefaultSearchPlugin.init({
      indexStockStatus: true,
      bufferUpdates: false,
    }),

    // الإيميلات
    EmailPlugin.init({
      devMode: IS_DEV,
      outputPath: path.join(__dirname, '../static/email/test-emails'),
      route: 'mailbox',
      handlers: defaultEmailHandlers,
      templatePath: path.join(__dirname, '../static/email/templates'),
      globalTemplateVars: {
        fromAddress: '"سوق إدكو" <noreply@souqedku.com>',
        verifyEmailAddressUrl: `https://${process.env.VENDURE_HOST}/verify`,
        passwordResetUrl: `https://${process.env.VENDURE_HOST}/password-reset`,
        changeEmailAddressUrl: `https://${process.env.VENDURE_HOST}/verify-email-address-change`,
      },
    }),

    // لوحة التحكم
    AdminUiPlugin.init({
      route: 'dashboard',
      port: 3002,
      adminUiConfig: {
        // مهم — يتوافق مع tokenMethod فوق
        tokenMethod: 'bearer',
        authTokenHeaderKey: 'vendure-auth-token',
      },
    }),
  ],
}
