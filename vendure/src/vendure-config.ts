import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import {
    DefaultSchedulerPlugin,
    DefaultSearchPlugin,
    dummyPaymentHandler,
    VendureConfig
} from '@vendure/core';
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import { BullMQJobQueuePlugin } from '@vendure/job-queue-plugin/package/bullmq';
import 'dotenv/config';
import path from 'path';

const IS_LOCAL = process.env.APP_ENV === 'local';
const serverPort = +process.env.PORT || 3000;

export const config: VendureConfig = {
    apiOptions: {
        port: serverPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        trustProxy: IS_LOCAL ? false : 1,
        cors: {
            origin: [
                'https://remix.bramjlive.com',
                'https://shop.bramjlive.com',
                'https://panda.bramjlive.com',
                'http://localhost:3000',
            ],
            credentials: true,
        },
        ...(IS_LOCAL
            ? {
                  adminApiDebug: true,
                  shopApiDebug: true,
              }
            : {}),
    },

    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: process.env.SUPERADMIN_PASSWORD,
        },
        cookieOptions: {
            secret: process.env.COOKIE_SECRET,
            domain: '.bramjlive.com',
            httpOnly: true,
            secure: true,
            sameSite: 'none',
        },
    },

    dbConnectionOptions: {
        type: 'postgres',
        synchronize: true,
        migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
        logging: false,
        database: process.env.DB_NAME,
        schema: process.env.DB_SCHEMA,
        host: process.env.DB_HOST,
        port: +process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
    },

    paymentOptions: {
        paymentMethodHandlers: [dummyPaymentHandler],
    },

    customFields: {},

    plugins: [
        BullMQJobQueuePlugin.init({
            connection: {
                port: 6379,
                host: process.env.REDIS_HOST,
                password: process.env.REDIS_PASSWORD,
                maxRetriesPerRequest: null,
            },
        }),

        GraphiqlPlugin.init(),

        AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: IS_LOCAL
                ? path.join(__dirname, '../static/assets')
                : '/usr/src/app/assets',
            assetUrlPrefix: `https://${process.env.VENDURE_HOST}/assets/`,
        }),

        DefaultSchedulerPlugin.init(),

        DefaultSearchPlugin.init({
            bufferUpdates: false,
            indexStockStatus: true,
        }),

        EmailPlugin.init({
            handlers: defaultEmailHandlers,

            templateLoader: new FileBasedTemplateLoader(
                path.join(__dirname, '../static/email/templates')
            ),

            transport: {
                type: 'smtp',
                host: 'smtp-relay.brevo.com',
                port: 587,
                auth: {
                    user: process.env.BREVO_SMTP_LOGIN,
                    pass: process.env.BREVO_SMTP_KEY,
                },
            },

            globalTemplateVars: {
                fromAddress: '"BramjLive" <sales@panda.bramjlive.com>',
                verifyEmailAddressUrl: 'https://panda.bramjlive.com/verify',
                passwordResetUrl: 'https://panda.bramjlive.com/password-reset',
                changeEmailAddressUrl:
                    'https://panda.bramjlive.com/verify-email-address-change',
            },
        }),

        DashboardPlugin.init({
            route: 'dashboard',
            appDir: path.join(__dirname, '../dist/dashboard'),
        }),
    ],
};
