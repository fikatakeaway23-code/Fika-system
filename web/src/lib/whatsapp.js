function waLink(phone, text) {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 7) return '#';
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function renewalReminderLink({ phone, companyName, monthlyFee, renewalDate }) {
  const dateStr = renewalDate
    ? new Date(renewalDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'soon';

  const text = `Hello ${companyName} team! 👋

This is a friendly reminder that your Fika coffee membership is due for renewal on *${dateStr}*.

💰 Monthly fee: ${monthlyFee != null ? `NPR ${Number(monthlyFee).toLocaleString()}` : 'not set'}

To renew, please transfer to our account and send us the screenshot, or visit us in person. Let us know if you have any questions!

☕ Fika Takeaway`;

  return waLink(phone, text);
}

export function topUpAckLink({ phone, companyName }) {
  const text = `Hello ${companyName} team! ☕

We've received your top-up request and will process it shortly. Your drink balance will be updated within 24 hours.

Thank you for being a valued Fika member! 🙏

☕ Fika Takeaway`;

  return waLink(phone, text);
}
