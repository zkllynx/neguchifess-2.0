const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const channelUsn = '@testinglpmferdi';

const usersPath = './config/users.json';


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
      const copyrightNotice = `\n\n© @OxDonquixote, powered by KNJT DAO`;
  
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
        const welcomeMessage = `Welcome to the Forwarding Bot, ${name}!`;
        const guideMessage = `To forward a message, use one of the specified prefixes:\n   - #bzboy\n   - #bzgirl\n   - #bzask\n\nSend a message with the prefix to this bot, and it will be forwarded to the channel.\n\nYou have ${userInfo.limit} forwarding(s) left.`;
        const copyrightNotice = `\n\n© @OxDonquixote, powered by KNJT DAO`;
  
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
            const guideMessage = `To forward a message, use one of the specified prefixes:\n   - #bzboy\n   - #bzgirl\n   - #bzask\n\nSend a message with the prefix to this bot, and it will be forwarded to the channel.\n\nYou have ${userInfo.limit} forwarding(s) left.`;
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

// Function to handle text messages and check for prefixes anywhere in the message
bot.on('text', async (ctx) => {

    const userId = ctx.from.id;
    const isAdmin = process.env.ADMIN_ID == userId;
    const isCreator = process.env.CREATOR_USER_ID == userId;
    const users = readUserData(); // Load user data
    const hasJoinedChannelResult = isAdmin || await hasJoinedChannel(ctx, userId, process.env.CHANNEL_ID);
    const hasJoinedGroupResult = isAdmin || (await hasJoinedGroup(ctx, userId, process.env.GROUP_ID));

    if (hasJoinedChannelResult && hasJoinedGroupResult){
        const channelId = process.env.CHANNEL_ID;

        try {
            // Get the message text sent by the user
            const messageText = ctx.message.text;
          
            // Define photo URLs or paths to send with the prefixes
            const photoUrlBzboy = 'https://t.me/statuslpmtest/2'; // Replace with your image URL or path
            const photoUrlBzgirl = 'https://t.me/statuslpmtest/3'; // Replace with your image URL or path
          
            // Check if the message contains one of the specific prefixes
            if (messageText.includes('#bzboy')) {
                // Send the photo and the message
                await ctx.telegram.sendPhoto(channelUsn, photoUrlBzboy, { caption: messageText });
                console.log(`Photo and message sent to channel: ${channelUsn}`);
                await ctx.reply('Your message has been forwarded to the channel!'); // Reply to the user
            } else if (messageText.includes('#bzgirl')) {
                await ctx.telegram.sendPhoto(channelId, photoUrlBzgirl, { caption: messageText });
                console.log(`Photo and message sent to channel: ${channelUsn}`);
                await ctx.reply('Your message has been forwarded to the channel!'); // Reply to the user
            } else if (messageText.includes('#bzask')) {
                await ctx.telegram.sendMessage(channelUsn, messageText);
                console.log(`Message sent to channel: ${channelUsn}`);
                await ctx.reply('Your message has been forwarded to the channel!'); // Reply to the user
            } else {
                // If the message doesn't contain a valid prefix, send a reply to the user
                await ctx.reply('Please include one of the following prefixes: #bzboy, #bzgirl, or #bzask anywhere in your message.');
                console.log('Message ignored, no valid prefix found. User notified.');
                }
            } catch (error) {
                console.error('Error processing message:', error);
                }
    }
});

// Start the bot
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
