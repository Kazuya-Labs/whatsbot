import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
} from "baileys";
import sharp from "sharp";

/**
 * Fetch gambar dari URL, compress, return sebagai Buffer
 */
async function fetchAndCompressImage(imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(
      `Gagal fetch gambar: ${response.status} ${response.statusText}`,
    );
  }
  const arrayBuffer = await response.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);

  const compressedBuffer = await sharp(inputBuffer)
    .resize({ width: 1080, withoutEnlargement: true }) // ga perlu upscale kalau udah kecil
    .jpeg({ quality: 75 })
    .toBuffer();

  return compressedBuffer;
}

async function buildCarouselCard(
  { title, body, footer, imageUrl, buttons },
  messageGenOptions,
) {
  const nativeFlowButtons = buttons.map((btn) => {
    switch (btn.type) {
      case "url":
        return {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: btn.label,
            url: btn.value,
            merchant_url: btn.value,
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
      case "call": {
        return {
          name: "cta_call",
          buttonParamsJson: JSON.stringify({
            display_text: btn.label,
            phone_number: btn.phone_number,
          }),
        };
      }
      default:
        return {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: btn.label,
            id: btn.id || btn.value,
          }),
        };
    }
  });

  // --- Fetch + compress gambar dulu, baru upload ---
  let imageMessageContent;
  if (imageUrl) {
    const compressedBuffer = await fetchAndCompressImage(imageUrl);
    const media = await prepareWAMessageMedia(
      { image: compressedBuffer }, // langsung kasih Buffer, bukan { url: imageUrl }
      messageGenOptions,
    );
    imageMessageContent = media.imageMessage;
  }

  return proto.Message.InteractiveMessage.create({
    header: proto.Message.InteractiveMessage.Header.create({
      title,
      hasMediaAttachment: !!imageMessageContent,
      ...(imageMessageContent ? { imageMessage: imageMessageContent } : {}),
    }),
    body: proto.Message.InteractiveMessage.Body.create({ text: body }),
    footer: footer
      ? proto.Message.InteractiveMessage.Footer.create({ text: footer })
      : undefined,
    nativeFlowMessage:
      proto.Message.InteractiveMessage.NativeFlowMessage.create({
        buttons: nativeFlowButtons,
      }),
  });
}

// buildCarouselMessage tetap sama, ga perlu diubah
/**
 * Bikin pesan carousel (kartu geser horizontal), tiap kartu punya button + gambar sendiri.
 *
 * @param {ReturnType<typeof makeWASocket>} sock
 * @param {string} jid
 * @param {object} opts
 * @param {string} opts.text
 * @param {string} [opts.footer]
 * @param {Array<object>} opts.cards
 */
async function buildCarouselMessage(sock, jid, { text, footer, cards }) {
  // options resmi yang dibutuhkan prepareWAMessageMedia buat upload media
  const messageGenOptions = {
    upload: sock.waUploadToServer,
  };

  // Upload semua gambar kartu secara paralel biar lebih cepat
  const cardMessages = await Promise.all(
    cards.map((card) => buildCarouselCard(card, messageGenOptions)),
  );

  const msg = generateWAMessageFromContent(
    jid,
    {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
          },
          interactiveMessage: proto.Message.InteractiveMessage.create({
            body: proto.Message.InteractiveMessage.Body.create({ text }),
            footer: footer
              ? proto.Message.InteractiveMessage.Footer.create({ text: footer })
              : undefined,
            carouselMessage:
              proto.Message.InteractiveMessage.CarouselMessage.create({
                cards: cardMessages,
                messageVersion: 1,
              }),
          }),
        },
      },
    },
    { userJid: sock.user.id },
  );

  return msg;
}

export { buildCarouselMessage };
