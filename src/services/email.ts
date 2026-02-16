import sgMail from '@sendgrid/mail';
import type { Locale } from '../types/index.js';

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@globalbeauty.com';
const FROM_NAME = process.env.FROM_NAME || 'Global Beauty';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// Email templates by locale
const templates = {
  bookingReceived: {
    en: {
      subject: 'Booking Request Received - Global Beauty',
      getBody: (data: BookingEmailData) => `
Dear Customer,

Thank you for your booking request with Global Beauty!

Your booking details:
- Booking Reference: ${data.accessCode}
- Clinic: ${data.clinicName}
- Procedure: ${data.procedure}
- Preferred Date: ${data.preferredDate}

Our concierge team will contact the clinic and respond within 8 business hours.

You can check your booking status anytime using your reference code: ${data.accessCode}

Best regards,
Global Beauty Team
      `.trim(),
    },
    ja: {
      subject: '予約リクエストを受け付けました - Global Beauty',
      getBody: (data: BookingEmailData) => `
お客様へ

Global Beautyをご利用いただきありがとうございます。

予約詳細：
- 予約番号: ${data.accessCode}
- クリニック: ${data.clinicName}
- 施術: ${data.procedure}
- 希望日: ${data.preferredDate}

弊社のコンシェルジュチームがクリニックに連絡し、8営業時間以内にご返答いたします。

予約番号（${data.accessCode}）でいつでも予約状況をご確認いただけます。

よろしくお願いいたします。
Global Beauty チーム
      `.trim(),
    },
    zh: {
      subject: '预约请求已收到 - Global Beauty',
      getBody: (data: BookingEmailData) => `
尊敬的客户，

感谢您选择Global Beauty！

您的预约详情：
- 预约编号: ${data.accessCode}
- 诊所: ${data.clinicName}
- 项目: ${data.procedure}
- 期望日期: ${data.preferredDate}

我们的礼宾团队将联系诊所，并在8个工作小时内回复您。

您可以随时使用预约编号（${data.accessCode}）查询预约状态。

此致
Global Beauty 团队
      `.trim(),
    },
  },

  bookingConfirmed: {
    en: {
      subject: 'Booking Confirmed! - Global Beauty',
      getBody: (data: BookingEmailData) => `
Dear Customer,

Great news! Your booking has been confirmed!

Confirmed booking details:
- Booking Reference: ${data.accessCode}
- Clinic: ${data.clinicName}
- Procedure: ${data.procedure}
- Date: ${data.confirmedDate || data.preferredDate}
- Time: ${data.confirmedTime || 'To be confirmed'}
${data.confirmedPrice ? `- Price: ${data.confirmedPrice}` : ''}

Please arrive at the clinic 15 minutes before your appointment time.

If you need to reschedule or cancel, please contact us as soon as possible.

Best regards,
Global Beauty Team
      `.trim(),
    },
    ja: {
      subject: '予約が確定しました！ - Global Beauty',
      getBody: (data: BookingEmailData) => `
お客様へ

予約が確定しましたのでお知らせいたします！

確定した予約詳細：
- 予約番号: ${data.accessCode}
- クリニック: ${data.clinicName}
- 施術: ${data.procedure}
- 日付: ${data.confirmedDate || data.preferredDate}
- 時間: ${data.confirmedTime || '確認中'}
${data.confirmedPrice ? `- 料金: ${data.confirmedPrice}` : ''}

予約時間の15分前にクリニックにお越しください。

日程の変更やキャンセルが必要な場合は、お早めにご連絡ください。

よろしくお願いいたします。
Global Beauty チーム
      `.trim(),
    },
    zh: {
      subject: '预约已确认！ - Global Beauty',
      getBody: (data: BookingEmailData) => `
尊敬的客户，

好消息！您的预约已确认！

确认的预约详情：
- 预约编号: ${data.accessCode}
- 诊所: ${data.clinicName}
- 项目: ${data.procedure}
- 日期: ${data.confirmedDate || data.preferredDate}
- 时间: ${data.confirmedTime || '待确认'}
${data.confirmedPrice ? `- 价格: ${data.confirmedPrice}` : ''}

请在预约时间前15分钟到达诊所。

如需改期或取消，请尽快与我们联系。

此致
Global Beauty 团队
      `.trim(),
    },
  },

  bookingCancelled: {
    en: {
      subject: 'Booking Cancelled - Global Beauty',
      getBody: (data: BookingEmailData) => `
Dear Customer,

We're sorry to inform you that your booking has been cancelled.

Cancelled booking details:
- Booking Reference: ${data.accessCode}
- Clinic: ${data.clinicName}
- Procedure: ${data.procedure}

${data.cancelReason ? `Reason: ${data.cancelReason}` : ''}

If you have any questions or would like to make a new booking, please don't hesitate to contact us.

Best regards,
Global Beauty Team
      `.trim(),
    },
    ja: {
      subject: '予約がキャンセルされました - Global Beauty',
      getBody: (data: BookingEmailData) => `
お客様へ

誠に申し訳ございませんが、ご予約がキャンセルとなりましたことをお知らせいたします。

キャンセルされた予約詳細：
- 予約番号: ${data.accessCode}
- クリニック: ${data.clinicName}
- 施術: ${data.procedure}

${data.cancelReason ? `理由: ${data.cancelReason}` : ''}

ご不明な点がございましたら、または新たにご予約をご希望の場合は、お気軽にお問い合わせください。

よろしくお願いいたします。
Global Beauty チーム
      `.trim(),
    },
    zh: {
      subject: '预约已取消 - Global Beauty',
      getBody: (data: BookingEmailData) => `
尊敬的客户，

很抱歉通知您，您的预约已被取消。

已取消的预约详情：
- 预约编号: ${data.accessCode}
- 诊所: ${data.clinicName}
- 项目: ${data.procedure}

${data.cancelReason ? `原因: ${data.cancelReason}` : ''}

如有任何疑问或想重新预约，请随时与我们联系。

此致
Global Beauty 团队
      `.trim(),
    },
  },
};

export interface BookingEmailData {
  to: string;
  locale: Locale;
  accessCode: string;
  clinicName: string;
  procedure: string;
  preferredDate: string;
  confirmedDate?: string;
  confirmedTime?: string;
  confirmedPrice?: string;
  cancelReason?: string;
}

export type EmailType = 'bookingReceived' | 'bookingConfirmed' | 'bookingCancelled';

export async function sendBookingEmail(
  type: EmailType,
  data: BookingEmailData
): Promise<{ success: boolean; error?: string }> {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Email not sent.');
    return { success: false, error: 'Email service not configured' };
  }

  if (!data.to) {
    return { success: false, error: 'No recipient email address' };
  }

  const template = templates[type][data.locale] || templates[type].en;

  const msg = {
    to: data.to,
    from: {
      email: FROM_EMAIL,
      name: FROM_NAME,
    },
    subject: template.subject,
    text: template.getBody(data),
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent: ${type} to ${data.to}`);
    return { success: true };
  } catch (error) {
    console.error('SendGrid error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

// Helper to format date for emails
export function formatDateForEmail(date: Date, locale: Locale): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  const localeMap: Record<Locale, string> = {
    en: 'en-US',
    ja: 'ja-JP',
    zh: 'zh-CN',
  };

  return date.toLocaleDateString(localeMap[locale], options);
}

// Helper to format price for emails
export function formatPriceForEmail(price: number, currency: string = 'KRW'): string {
  const formatter = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
  });
  return formatter.format(price);
}
