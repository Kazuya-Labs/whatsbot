import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
} from "baileys";
import { compressImageBuffer, fetchBuffer } from "./media.js";
import { nativeFlowButtonFor } from "./buttons.js";

/**
 * Fetch gambar dari URL, compress, return sebagai Buffer
 */
async function fetchAndCompressImage(imageUrl) {
  const inputBuffer = await fetchBuffer(imageUrl);
  return compressImageBuffer(inputBuffer, { width: 1080, quality: 75 });
}

async function buildCarouselCard(
  { title, body, footer, imageUrl, buttons },
  messageGenOptions,
) {
  const nativeFlowButtons = buttons.map((btn) =>
    nativeFlowButtonFor({ ...btn, url: btn.url || btn.value, merchant_url: btn.value }),
  );

  let imageMessageContent;
  if (imageUrl) {
    const compressedBuffer = await fetchAndCompressImage(imageUrl);
    const media = await prepareWAMessageMedia(
      { image: compressedBuffer }, // beri Buffer langsung, bukan { url }
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
  const messageGenOptions = {
    upload: sock.waUploadToServer,
  };

  // upload semua gambar kartu secara paralel
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
