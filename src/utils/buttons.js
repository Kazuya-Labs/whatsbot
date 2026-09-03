import { sendInteractiveMessage } from "@ryuu-reinzz/button-helper";

/**
 * Mapper satu button -> native flow button (cta_url/cta_copy/cta_call/quick_reply).
 *
 * @param {object} btn
 * @param {'url'|'copy'|'cta_call'|'cta_catalog'|'default'|'call'} btn.type
 * @param {string} btn.label
 * @param {string} [btn.id]
 * @param {string} [btn.value]
 * @param {string} [btn.url]
 * @param {string} [btn.phone_number]
 * @returns {object}
 */
export const nativeFlowButtonFor = (btn) => {
  switch (btn.type) {
    case "url":
      return {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: btn.label,
          url: btn.url || btn.value,
          ...(btn.merchant_url ? { merchant_url: btn.merchant_url } : {}),
        }),
      };

    case "copy":
      return {
        name: "cta_copy",
        buttonParamsJson: JSON.stringify({
          display_text: btn.label,
          copy_code: btn.value,
        }),
      };

    case "cta_call":
    case "call":
      return {
        name: "cta_call",
        buttonParamsJson: JSON.stringify({
          display_text: btn.label,
          phone_number: btn.phone_number,
        }),
      };

    case "cta_catalog":
      return {
        name: "cta_copy",
        buttonParamsJson: JSON.stringify({
          display_text: btn.label,
        }),
      };

    case "default":
    default:
      return {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: btn.label,
          id: btn.id || btn.value,
        }),
      };
  }
};

/**
 * Kirim pesan interaktif dengan kombinasi button: url, copy, default (quick reply).
 * Menggunakan binary node injection tambahan (biz/interactive/native_flow/bot)
 * supaya WhatsApp app mau render button-nya di akun non-Business API.
 *
 * @param {ReturnType<typeof makeWASocket>} sock
 * @param {string} jid
 * @param {object} opts
 * @param {string} opts.text
 * @param {string} [opts.footer]
 * @param {string} [opts.title]
 * @param {Array<{type: 'url'|'copy'|'default', label: string, value: string, id?: string}>} opts.buttons
 */
async function sendButtonMessage(sock, jid, { text, footer, title, buttons }) {
  const interactiveButtons = buttons.map(nativeFlowButtonFor);

  return sendInteractiveMessage(sock, jid, {
    text,
    footer,
    title,
    interactiveButtons,
  });
}

export { sendButtonMessage };
