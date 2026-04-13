import {
  dummyPaymentHandler,
  DefaultJobQueuePlugin,
  DefaultSearchPlugin,
  VendureConfig,
} from '@vendure/core'
import { defaultEmailHandlers, EmailPlugin } from '@vendure/email-plugin'
import { AssetServerPlugin } from '@vendure/asset-server-plugin'
import { BullMQJobQueuePlugin } from '@vendure/job-queue-plugin/package/bullmq'
import path from 'path'

const IS_DEV = process.env.APP_ENV === 'local'

export const config: VendureConfig = {
  // ─── API Options ───────────────────────────────────────────────────────────
  apiOptions: {
    port: +(process.env.PORT || 3000),
    adminApiPath: 'admin-api',
    shopApiPath: 'shop-api',
    cors: {
      origin: [
        `https://${process.env.VENDURE_HOST}`,
        `http://${process.env.VENDURE_HOST}`,
        'https://pandastore.bramjlive.com',
        'http://pandastore.bramjlive.com',
        'http://localhost:3000',
        'http://localhost:3001',
      ],
      credentials: true,
      exposedHeaders: ['vendure-auth-token'],
    },
  },

  // ─── Auth Options ──────────────────────────────────────────────────────────
  authOptions: {
    tokenMethod: ['bearer', 'cookie'],
    cookieOptions: {
      secret: process.env.COOKIE_SECRET || 'change-me-in-production',
      sameSite: 'none' as const,
      secure: true,
      httpOnly: true,
    },
    superadminCredentials: {
      identifier: process.env.SUPERADMIN_USERNAME || 'superadmin',
      password: process.env.SUPERADMIN_PASSWORD || 'superadmin',
    },
    requireVerification: false,
  },

  // ─── Database ──────────────────────────────────────────────────────────────
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

  // ─── Payment ───────────────────────────────────────────────────────────────
  paymentOptions: {
    paymentMethodHandlers: [dummyPaymentHandler],
  },

  // ─── Plugins ───────────────────────────────────────────────────────────────
  plugins: [
    AssetServerPlugin.init({
      route: 'assets',
      assetUploadDir: process.env.ASSET_UPLOAD_DIR || path.join(__dirname, '../assets'),
    }),

    BullMQJobQueuePlugin.init({
      connection: {
        host: process.env.REDIS_HOST,
        port: 6379,
        password: process.env.REDIS_PASSWORD,
      },
    }),

    DefaultSearchPlugin.init({
      indexStockStatus: true,
      bufferUpdates: false,
    }),

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
  ],
}
