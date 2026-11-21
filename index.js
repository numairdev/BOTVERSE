
require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  WebhookClient
} = require("discord.js");

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

const MIN_DELAY = Math.max(10, Number(process.env.MIN_DELAY_SECONDS || 10));
const MAX_DELAY = Math.max(MIN_DELAY, Number(process.env.MAX_DELAY_SECONDS || 60));
const HOURLY_LIMIT = Math.min(
  120,
  Math.max(1, Number(process.env.MAX_MESSAGES_PER_HOUR || 120))
);

const ENABLED =
  String(process.env.BOTVERSE_ENABLED || "true").toLowerCase() === "true";

const DATA_FILE = path.join(__dirname, "..", "data", "webhooks.json");

if (!TOKEN || !CHANNEL_ID) {
  console.error("Missing Discord credentials in .env");
  process.exit(1);
}

// 20 unique BOTVERSE personalities

const personas = [
  { name: "Alex ✨", style: "playful" },
  { name: "Luna 🌙", style: "thoughtful" },
  { name: "Max 🤡", style: "sarcastic" },
  { name: "Nova ⭐", style: "chill" },
  { name: "Zara 🌸", style: "friendly" },
  { name: "Ghost 👻", style: "mysterious" },
  { name: "Leo 🔥", style: "energetic" },
  { name: "Echo 🌊", style: "philosophical" },
  { name: "Milo 🐻", style: "playful" },
  { name: "Ivy 🌿", style: "clever" },
  { name: "Kai 🌴", style: "adventurous" },
  { name: "Pixel 💻", style: "techy" },
  { name: "Rumi 🦋", style: "poetic" },
  { name: "Dex 🎮", style: "competitive" },
  { name: "Skye ☁️", style: "dreamy" },
  { name: "Theo 🧠", style: "analytical" },
  { name: "Mira 💗", style: "warm" },
  { name: "Onyx 🖤", style: "dry humor" },
  { name: "Sunny ☀️", style: "optimistic" },
  { name: "Atlas 🌍", style: "big picture" }
];

// Each personality gets a distinct generated avatar.

for (const persona of personas) {
  persona.avatarURL =
    `https://api.dicebear.com/9.x/bottts/png?seed=${encodeURIComponent(persona.name)}`;
}

const topics = [
  "the weirdest food combinations",
  "whether time travel is possible",
  "the perfect rainy day",
  "the future of artificial intelligence",
  "dream cities to visit",
  "whether aliens understand memes",
  "the best fictional superpower",
  "late night thoughts",
  "music that changes your mood",
  "the future of technology",
  "strange facts about the ocean",
  "what makes a great friendship",
  "the ideal weekend",
  "whether cats secretly control humans",
  "the most useful everyday skill",
  "unpopular but harmless opinions",
  "what we would do with a free day",
  "the best comfort food",
  "the mysteries of the universe",
  "life in the year 2050"
];

const openers = [
  "Random question: {topic}. What do you guys think?",
  "Okay everyone, let's talk about {topic}.",
  "New debate unlocked: {topic}.",
  "I've been thinking about {topic} lately.",
  "Can someone explain their opinion about {topic}?",
  "Today's random conversation is about {topic}.",
  "I have a theory about {topic}.",
  "Who wants to discuss {topic}?",
  "Wait, why don't we ever talk about {topic}?",
  "I need everyone's opinion on {topic}."
];

const reactions = [
  "Wait, that's actually interesting 😂",
  "I completely understand your point.",
  "Okay, I disagree with that one.",
  "This conversation is getting interesting.",
  "I was not expecting that answer.",
  "You might actually be right.",
  "I have a completely different opinion.",
  "Now I'm thinking about it too.",
  "Why does this make so much sense?",
  "That's a surprisingly good point.",
  "I need a moment to process this.",
  "Not gonna lie, I agree.",
  "This is getting out of hand 😂",
  "Someone explain this to me.",
  "I have questions now.",
  "Interesting perspective.",
  "That's exactly what I was thinking.",
  "I respectfully disagree.",
  "Okay, now hear me out."
];

const followUps = [
  "What would you choose?",
  "Has anyone experienced that?",
  "What is your biggest reason?",
  "Would you agree with that?",
  "What happens if we reverse the situation?",
  "I want to hear another opinion.",
  "Does anyone have a better example?",
  "Why do you think that happens?",
  "Let's take this debate further.",
  "What would you do in that situation?"
];

const styles = {
  playful: [
    "I'm just here for the chaos 😂",
    "This is hilarious.",
    "Why is this actually so funny?"
  ],
  thoughtful: [
    "There is actually a lot to think about here.",
    "Interesting thought."
  ],
  sarcastic: [
    "Obviously, because that's totally normal 🙃",
    "Sure, why not."
  ],
  curious: [
    "But what happens next?",
    "I need more details."
  ],
  friendly: [
    "I love this conversation!",
    "That's a nice way to look at it."
  ],
  mysterious: [
    "Some questions are better left unanswered.",
    "Interesting... very interesting."
  ],
  energetic: [
    "LET'S GOOO 🔥",
    "This is getting exciting!"
  ],
  philosophical: [
    "Maybe the question matters more than the answer.",
    "Everything is connected somehow."
  ],
  chill: [
    "Fair enough.",
    "Honestly, same."
  ],
  clever: [
    "There might be another way to see this.",
    "Let's look at it differently."
  ],
  adventurous: [
    "That sounds like an adventure.",
    "I'd definitely try that."
  ],
  techy: [
    "Technology could make that possible.",
    "That's an interesting concept."
  ],
  poetic: [
    "Some thoughts stay longer than words.",
    "There is beauty in strange ideas."
  ],
  competitive: [
    "I bet I can come up with a better answer.",
    "Challenge accepted."
  ],
  dreamy: [
    "Imagine if that actually happened.",
    "That would be amazing."
  ],
  analytical: [
    "Let's break that down.",
    "The logic is interesting."
  ],
  warm: [
    "I like how everyone sees things differently.",
    "This is such a nice discussion."
  ],
  "dry humor": [
    "Well, that went exactly as expected.",
    "What could possibly go wrong."
  ],
  optimistic: [
    "I think something good could come from that!",
    "Let's look on the bright side."
  ],
  "big picture": [
    "Think about how this changes everything.",
    "There's a bigger picture here."
  ]
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let channel;
let webhooks = [];
let recentMessages = [];
let previousPersona = -1;
let lastTopic = "";
let messageTimes = [];
let running = true;

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanMessage(message) {
  return String(message)
    .replace(/@everyone/g, "@\u200beveryone")
    .replace(/@here/g, "@\u200bhere")
    .slice(0, 1900);
}

function choosePersona() {
  let index = randomNumber(0, personas.length - 1);

  while (index === previousPersona) {
    index = randomNumber(0, personas.length - 1);
  }

  return index;
}

function generateMessage(persona) {
  const startNewTopic =
    recentMessages.length === 0 || Math.random() < 0.12;

  if (startNewTopic) {
    lastTopic = randomItem(topics);

    return cleanMessage(
      randomItem(openers).replace("{topic}", lastTopic)
    );
  }

  const roll = Math.random();

  if (roll < 0.35) {
    return cleanMessage(randomItem(reactions));
  }

  if (roll < 0.65) {
    return cleanMessage(`About ${lastTopic}: ${randomItem(followUps)}`);
  }

  if (roll < 0.85) {
    return cleanMessage(randomItem(styles[persona.style]));
  }

  return cleanMessage(randomItem(reactions));
}

function trimMessageHistory() {
  const cutoff = Date.now() - 60 * 60 * 1000;
  messageTimes = messageTimes.filter(time => time > cutoff);
}

// One shared webhook for all 20 personalities.

async function createWebhooks() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });

  // Reuse saved webhook if it is valid.
  if (fs.existsSync(DATA_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

      if (saved.id && saved.token) {
        const hook = new WebhookClient({
          id: saved.id,
          token: saved.token
        });

        console.log("Reusing saved BOTVERSE webhook.");

        return personas.map(persona => ({
          persona,
          hook
        }));
      }
    } catch (error) {
      console.log("Saved webhook unavailable. Checking Discord...");
    }
  }

  const me = await channel.guild.members.fetchMe();
  const permissions = channel.permissionsFor(me);

  if (
    !permissions ||
    !permissions.has(PermissionFlagsBits.ViewChannel) ||
    !permissions.has(PermissionFlagsBits.ManageWebhooks)
  ) {
    throw new Error(
      "Give BOTVERSE View Channel and Manage Webhooks permissions."
    );
  }

  console.log("Checking existing Discord webhooks...");

  const existing = await channel.fetchWebhooks();

  // Reuse an existing BOTVERSE shared webhook if possible.
  const shared = existing.find(hook =>
    hook.name === "BOTVERSE Shared" &&
    hook.owner?.id === client.user.id &&
    hook.token
  );

  let webhook;

  if (shared) {
    webhook = shared;
    console.log("Found existing shared webhook.");
  } else {
    // Only delete one webhook owned by this bot if the channel is full.
    if (existing.size >= 15) {
      const owned = existing.find(hook =>
        hook.owner?.id === client.user.id
      );

      if (!owned) {
        throw new Error(
          "Channel has 15 webhooks, and none are owned by BOTVERSE. " +
          "Free one webhook slot manually."
        );
      }

      console.log("Removing one old BOTVERSE-owned webhook...");
      await owned.delete("Replacing old BOTVERSE webhook with shared webhook.");
    }

    console.log("Creating one shared BOTVERSE webhook...");

    webhook = await channel.createWebhook({
      name: "BOTVERSE Shared",
      reason: "One shared webhook for 20 BOTVERSE personalities"
    });
  }

  if (!webhook.token) {
    throw new Error("Shared webhook token was not returned.");
  }

  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify({
      id: webhook.id,
      token: webhook.token
    }, null, 2),
    { mode: 0o600 }
  );

  const hook = new WebhookClient({
    id: webhook.id,
    token: webhook.token
  });

  console.log("Shared webhook saved securely.");
  console.log("20 personalities configured.");

  return personas.map(persona => ({
    persona,
    hook
  }));
}

async function sendMessage() {
  trimMessageHistory();

  if (messageTimes.length >= HOURLY_LIMIT) {
    console.log("Hourly message limit reached.");
    return;
  }

  const index = choosePersona();
  const entry = webhooks[index];

  const content = generateMessage(entry.persona);

  await entry.hook.send({
    content,
    username: entry.persona.name,
    avatarURL: entry.persona.avatarURL,
    allowedMentions: { parse: [] }
  });

  previousPersona = index;

  recentMessages.push({
    name: entry.persona.name,
    message: content,
    time: Date.now()
  });

  if (recentMessages.length > 15) {
    recentMessages.shift();
  }

  messageTimes.push(Date.now());

  console.log(
    `${new Date().toLocaleTimeString()} | ${entry.persona.name}: ${content}`
  );
}

async function startBotverse() {
  console.log("--------------------------------");
  console.log("       BOTVERSE ONLINE");
  console.log("--------------------------------");

  if (!ENABLED) {
    console.log("BOTVERSE is paused in .env");
    return;
  }

  webhooks = await createWebhooks();

  console.log("--------------------------------");
  console.log("20 personalities are ready.");
  console.log(`Channel: #${channel.name}`);
  console.log(`Delay: ${MIN_DELAY}-${MAX_DELAY} seconds`);
  console.log(`Hourly cap: ${HOURLY_LIMIT}`);
  console.log("--------------------------------");

  while (running) {
    try {
      await sendMessage();
    } catch (error) {
      console.error("Message error:", error.message);
    }

    await sleep(randomNumber(MIN_DELAY, MAX_DELAY) * 1000);
  }
}

client.once("clientReady", async () => {
  console.log(`Discord connected as ${client.user.tag}`);

  try {
    channel = await client.channels.fetch(CHANNEL_ID);

    if (
      !channel ||
      !channel.isTextBased() ||
      typeof channel.createWebhook !== "function" ||
      !channel.guild
    ) {
      throw new Error("Invalid server text channel ID.");
    }

    await startBotverse();
  } catch (error) {
    console.error("BOTVERSE startup error:", error);
    process.exitCode = 1;
    await client.destroy();
  }
});

process.on("SIGINT", async () => {
  console.log("\nStopping BOTVERSE...");

  running = false;

  const hooks = new Set(webhooks.map(entry => entry.hook));

  for (const hook of hooks) {
    hook.destroy();
  }

  await client.destroy();
  process.exit(0);
});

client.login(TOKEN).catch(error => {
  console.error("Discord login failed:", error.message);
  process.exit(1);
});
