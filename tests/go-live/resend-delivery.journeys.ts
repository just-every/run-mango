import {test} from '@playwright/test';
import {walk0} from './resend-delivery.flow';
test('[SEND-001][SEND-005][SEND-006][SEND-008] reconcile uncertain Resend handoffs without duplicate sends or fabricated delivery',async({page},info)=>{test.setTimeout(600000);await walk0({page},info);});
