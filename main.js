const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);

const channelId = process.env.CHANNEL_ID;
const groupId = process.env.GROUP_ID;

const usersPath = './config/users.json';
const activeUsers = './config/activeUsers.json';
const messageStore = './config/messageStore.json';

// Load existing user data from JSON
const readUserData = () => {
  try {
    const usersData = fs.readFileSync(usersPath, 'utf8');
    return JSON.parse(usersData);
  } catch (error) {
    console.error('Error loading users data:', error);
    return {};
  }
};

// Function to write user data to users.json
const writeUserData = (userData) => {
  try {
    fs.writeFileSync(usersPath, JSON.stringify(userData), 'utf8');
  } catch (error) {
    console.error('Error writing to users.json:', error);
  }
};

// Load existing user data from JSON
const readUserData2 = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading user data from', filePath, ':', error);
    return {};
  }
};

// Function to write user data to specified file
const writeUserData2 = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing to', filePath, ':', error);
  }
};

// Handle /start command
bot.command('start', (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || 'N/A';
  const name = ctx.from.first_name || 'N/A';
  const isAdmin = process.env.ADMIN_ID == userId;
  const isCreator = process.env.CREATOR_USER_ID == userId;
  const isGroupForward = ctx.message.forward_from_chat && ctx.message.forward_from_chat.type === 'channel';

  // Check if the user is an admin or creator and the command is not from a group forward
  if ((isAdmin || isCreator) && !isGroupForward) {
    // Provide a welcome message and guide for admins and creators
    const welcomeMessage = `Welcome, ${name}!`;
    const adminGuideMessage = `As an admin or creator, you have unlimited menfess. Feel free to use the bot.`;
    const copyrightNotice = `\n\n© @OxDonquixote, powered by KNJT DAO.`;

    // Send the welcome message and guide
    ctx.reply(welcomeMessage + '\n\n' + adminGuideMessage + copyrightNotice);
  } else if (!isGroupForward) {
    // Read user data from users.json
    const users = readUserData();

    // Check if the user is already recorded in users.json
    if (!users[userId]) {
      // Add user info to users.json for new users
      const userInfo = {
        name: name,
        username: username,
        user_id: userId,
        limit: 3,
      };
      users[userId] = userInfo;

      // Write updated user data back to users.json
      writeUserData(users);

      // Provide a welcome message and guide for regular users
      const welcomeMessage = `Welcome to the BZ Menfess Bot, ${name}!`;
      const guideMessage = `To send a menfess, use one of the specified prefixes:\n   - #bzboy\n   - #bzgirl\n   - #bzask\n\nSend a message with the prefix to this bot, and it will be sent to the channel.\n\nYou have ${userInfo.limit} forwarding(s) left.`;
      const copyrightNotice = `\n\n© @OxDonquixote, powered by KNJT DAO.`;

      // Send the welcome message, guide, and copyright notice
      ctx.reply(welcomeMessage + '\n\n' + guideMessage + copyrightNotice);
    } else {
      // Reset forwarding limit at 1 am GMT+7 only if the user has not used /start before
      if (users[userId].limit !== undefined) {
        const resetTime = new Date();
        resetTime.setUTCHours(18, 0, 0, 0); // Set to 1 am GMT+7
        const currentTime = new Date();

        if (currentTime >= resetTime) {
          // The current time is after the reset time, reset the limit
          users[userId].limit = 3;
        }

        // Check if user has forwarding limit
        if (users[userId].limit > 0) {
          // Provide a guide for regular users
          const guideMessage = `To send a message, use one of the specified prefixes:\n   - #bzboy\n   - #bzgirl\n   - #bzask\n\nSend a menfess with the prefix to this bot, and it will be sent to the channel.\n\nYou have ${users[userId].limit} forwarding(s) left.`;
          ctx.reply(guideMessage);
        } else {
          ctx.reply('Forwarding limit reached. Please wait until the limit is reset.');
        }
      } else {
        // User has used /start before, do not reset the limit
        ctx.reply('Welcome back! You have already used /start before. Continue forwarding messages.');
      }
    }
  }
});

// Function to check if the user has joined the required channel
async function hasJoinedChannel(ctx, userId, channelId) {
  try {
    const chatMember = await ctx.telegram.getChatMember(channelId, userId);
    return chatMember.status === 'member' || chatMember.status === 'administrator';
  } catch (error) {
    console.error('Error checking channel membership:', error);
    return false;
  }
}

// Function to check if the user has joined the required group
async function hasJoinedGroup(ctx, userId, groupId) {
  try {
    const chatMember = await ctx.telegram.getChatMember(groupId, userId);
    return chatMember.status === 'member' || chatMember.status === 'administrator';
  } catch (error) {
    console.error('Error checking group membership:', error);
    return false;
  }
}


bot.on('text', async (ctx) => {

  const userId = ctx.from.id;
  const isAdmin = process.env.ADMIN_ID == userId;
  const isCreator = process.env.CREATOR_USER_ID == userId;
  const users = readUserData();

  // Define image URLs for #bzboy and #bzgirl
  const bzBoyImage = 'https://t.me/statuslpmtest/2';
  const bzGirlImage = 'https://t.me/statuslpmtest/3';

  const messageText = ctx.message.text || '';
  const prefixes = ['#bzask', '#bzboy', '#bzgirl'];
  const validPrefix = prefixes.find(prefix => messageText.includes(prefix));

  // Handle messages that are not forwarded from a channel
  if (!ctx.message.forward_from_chat || ctx.message.forward_from_chat.type !== 'channel') {
    if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
      if (isAdmin || isCreator || (users[userId] && users[userId].limit > 0)) {
        if (validPrefix) {
          const hasJoinedChannelResult = isAdmin || await hasJoinedChannel(ctx, userId, channelId);
          const hasJoinedGroupResult = isAdmin || await hasJoinedGroup(ctx, userId, groupId);

          if (hasJoinedChannelResult && hasJoinedGroupResult) {

            try {
              let sentMessage;

              // Send a photo if the prefix is #bzboy or #bzgirl
              if (validPrefix === '#bzboy') {
                sentMessage = await ctx.telegram.sendPhoto(channelId, bzBoyImage, {
                  caption: messageText,
                });
              } else if (validPrefix === '#bzgirl') {
                sentMessage = await ctx.telegram.sendPhoto(channelId, bzGirlImage, {
                  caption: messageText,
                });
              } else {
                // Send a regular message for other prefixes
                sentMessage = await ctx.telegram.sendMessage(channelId, messageText);
              }

              // Handle user limits
              if (!users[userId]) {
                users[userId] = {}; 
              }
              if (!isAdmin && !isCreator && users[userId].limit !== undefined) {
                users[userId].limit -= 1;

                writeUserData(users); // Save updated user data
              }

              // Send confirmation with options to view or delete the message
              ctx.reply(`Message sent with prefix ${validPrefix}. You have ${users[userId].limit} forwarding(s) left.`, {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: 'Preview Message',
                        url: `${process.env.CHANNEL_LINK}/${sentMessage.message_id}`,
                      },
                      {
                        text: 'Delete Message',
                        callback_data: JSON.stringify({ action: 'delete_forwarded', messageId: sentMessage.message_id }),
                      },
                    ],
                  ],
                },
                parse_mode: 'Markdown',
              });
            } catch (error) {
              console.error('Error sending message:', error);
              ctx.reply('Error sending message. Please try again.');
            }
          } else {
            ctx.reply('To use forwarding, please join the required channel and group:', {
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: 'Join Channel', url: process.env.CHANNEL_LINK },
                  ],
                  [
                    { text: 'Join Group', url: process.env.GROUP_LINK },
                  ],
                ],
              },
            });
          }
        } else {
          ctx.reply('Invalid prefix. Please use #bzask, #bzboy or #bzgirl.');
        }
      } else {
        ctx.reply('Forwarding limit reached. Please wait until the limit is reset.');
      }
    } 
  }
});


// Function to handle all non-text messages
const handleNonTextMessages = async (ctx) => {
  // Check if the chat type is private
  if (ctx.chat.type === 'private') {
    // Reply to the user that sending non-text messages is not allowed
    await ctx.reply('Sending non-text messages is not allowed in this chat. Please send only text.');
    console.log(`User ${ctx.from.id} attempted to send a non-text message.`);
  }
};

// Listen for various types of non-text messages only in private chats
bot.on(['photo', 'video', 'voice', 'document', 'audio', 'location', 'sticker', 'contact'], handleNonTextMessages);


// Handle callback queries
bot.on('callback_query', async (ctx) => {
  const data = JSON.parse(ctx.callbackQuery.data);

  switch (data.action) {
    case 'delete_forwarded':
      try {
        // Delete the forwarded message
        await ctx.telegram.deleteMessage(channelId, data.messageId);
        ctx.answerCbQuery('Forwarded message deleted successfully.');
      } catch (error) {
        console.error('Error deleting forwarded message:', error);
        ctx.answerCbQuery('Error deleting forwarded message. Please try again.');
      }
      break;

    // ... (add other cases if needed)
  }
});

// Function to log the entire message object
async function logMessageObject(ctx) {
  try {
    const messageObject = ctx.callbackQuery.message;
    console.log('Message Object:', messageObject);

    // For debugging purposes, you can log other properties as needed
    console.log('Forwarded Message ID:', messageObject.forward_from_message_id);
    console.log('Forwarded Chat ID:', messageObject.forward_from_chat?.id);

    // Continue with creating the link as needed

  } catch (error) {
    console.error('Error logging message object:', error);
  }
}

// Function to get the link of the forwarded message
async function getForwardedMessageLink(ctx) {
  try {
    const replyMessage = ctx.callbackQuery.message?.reply_to_message;

    if (replyMessage && replyMessage.forward_from) {
      // Extract forwarded message link from the reply text
      const match = replyMessage.text.match(/https:\/\/t\.me\/\S+\/(\d+)/);
      
      if (match && match[1]) {
        const forwardedMessageId = match[1];
        const link = `${process.env.CHANNEL_LINK}/${forwardedMessageId}`;
        
        return link;
      }
    }

    console.error('Error getting forwarded message link: Forwarded message or chat not found.');
    return null;  
  } catch (error) {
    console.error('Error getting forwarded message link:', error);
    return null;
  }
}

// Start the bot
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
