import httpStatus from "http-status";
import { OpenAI } from "openai";
import { Mood } from "../model/mood.model.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// AI=Generated motivation
const generateMotivation = async (mood) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: `Generate a unique motivational message for someone feeling ${mood}. Make it positive and encouraging. Keep it under 20 words.`,
        },
      ],
    });
    return response.choices[0].message.content;
  } catch (error) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to generate motivational message"
    );
  }
};

// AI-generated title
const generateTitle = async (mood, satisfaction) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: `Generate a short engaging title (3-5 words) for a daily mood log. Mood: ${mood}, Satisfaction: ${satisfaction}. Example: "Balanced", "Gentle", "Restore".`,
        },
      ],
    });

    let title = response.choices[0].message.content.trim();

    title = title.replace(/^["']|["']$/g, "");

    return title;
  } catch (error) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to generate daily title"
    );
  }
};

export const satisfactionDetailsMap = {
  "Very good": {
    type: "Gentle",
    svg: "https://res.cloudinary.com/dbc8cfqkw/image/upload/v1756543061/Gentle_voindq.png",
  },
  "Not so good": {
    type: "Sad",
    svg: "https://res.cloudinary.com/dbc8cfqkw/image/upload/v1756543057/Sad_znewue.png",
  },
  "Not good at all": {
    type: "Restore",
    svg: "https://res.cloudinary.com/dbc8cfqkw/image/upload/v1756543062/Restore_nmakev.png",
  },
  Good: {
    type: "Balanced",
    svg: "https://res.cloudinary.com/dbc8cfqkw/image/upload/v1756543062/Balanced_scieug.png",
  },
};

export const submitMood = catchAsync(async (req, res) => {
  const { mood, thoughts } = req.body;
  const userId = req.user._id;

  const validMoods = [
    "😊 Happy",
    "❤️ Romantic",
    "🤩 Excited",
    "🤪 Weird",
    "🌈 Hopeful",
    "😴 Sleepy",
    "😫 Stressed",
    "😡 Angry",
    "😐 Neutral",
    "😢 Sad",
    "😌 Relaxed",
    "💪 Motivated",
    "✨ Inspired",
    "🎨 Creative",
    "🤔 Thoughtful",
    "🪞 Reflective",
    "😔 Pensive",
    "🌙 Dreamy",
    "🕰️ Nostalgic",
    "😭 Emotional",
    "😰 Anxious",
    "😕 Confused",
    "😤 Frustrated",
    "🤡 Silly",
    "🧐 Curious",
    "🏞️ Adventurous",
  ];

  if (!mood || !validMoods.includes(mood)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid or missing mood");
  }

  // Get local date but store as UTC midnight
  const now = new Date();
  const localDateString = now.toLocaleDateString("en-CA");
  const date = new Date(localDateString);

  // Check today's entry (UTC-based)
  const existingLog = await Mood.findOne({ userId, date });
  if (existingLog) {
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Mood for today already submitted, now submit satisfaction",
      data: existingLog,
    });
    return;
  }

  const log = await Mood.create({ userId, date, mood, thoughts });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Mood submitted successfully, now submit satisfaction",
    data: log,
  });
});

// Submit satisfaction
export const submitSatisfaction = catchAsync(async (req, res) => {
  const { satisfaction } = req.body;
  const userId = req.user._id;
  const logId = req.params.id;

  if (
    !["Very good", "Good", "Not so good", "Not good at all"].includes(
      satisfaction
    )
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid satisfaction level");
  }

  const mood = await Mood.findOne({ _id: logId, userId });
  if (!mood) {
    throw new AppError(httpStatus.NOT_FOUND, "Mood not found");
  }

  if (mood.satisfaction) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Satisfaction already submitted"
    );
  }

  mood.satisfaction = satisfaction;
  await mood.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Satisfaction submitted successfully",
    data: mood,
  });
});

// Get weekly logs (structured for 7 days: Today, Yesterday, etc.)
export const getWeeklyLogs = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const logs = await Mood.find({
    userId,
    date: { $gte: sevenDaysAgo },
  }).sort({ date: -1 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const structuredLogs = logs.map((log, index) => {
    const logDate = new Date(log.date);
    let dayLabel;
    if (logDate.toDateString() === today.toDateString()) {
      dayLabel = "Today";
    } else if (logDate.getDate() === today.getDate() - 1) {
      dayLabel = "Yesterday";
    } else {
      dayLabel = logDate.toLocaleDateString("en-US", { weekday: "long" });
    }
    return {
      day: dayLabel,
      date: log.date.toISOString().split("T")[0],
      mood: log.mood,
    };
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Weekly logs fetched successfully",
    data: structuredLogs,
  });
});

// Average weekly mood with all mood counts
export const getAverageWeeklyMood = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const logs = await Mood.find({
    userId,
    date: { $gte: sevenDaysAgo },
  });

  if (logs.length === 0) {
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "No mood logs found for the past week",
      data: null,
    });
  }

  // Count moods
  const moodCounts = logs.reduce((acc, log) => {
    acc[log.mood] = (acc[log.mood] || 0) + 1;
    return acc;
  }, {});

  const totalDays = logs.length;

  // Find the most frequent mood
  let topMood = null;
  let topCount = 0;
  for (const [mood, count] of Object.entries(moodCounts)) {
    if (count > topCount) {
      topMood = mood;
      topCount = count;
    }
  }

  const responseData = {
    totalDays,
    moodCounts, // { Happy: 4, Sad: 1, Good: 1, Anxious: 1, ... }
    topMood: {
      mood: topMood,
      count: topCount,
    },
  };

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Weekly mood overview fetched successfully",
    data: responseData,
  });
});

// Update water and sleep trackers
export const updateTracker = catchAsync(async (req, res) => {
  const { waterGlasses, sleepHours } = req.body;
  const userId = req.user._id;
  const logId = req.params.id;

  const log = await Mood.findOne({ _id: logId, userId });
  if (!log) {
    throw new AppError(httpStatus.NOT_FOUND, "Log not found");
  }

  // Update and clamp values between 0–10
  if (waterGlasses !== undefined) {
    log.waterGlasses = Math.min(10, Math.max(0, Number(waterGlasses)));
  }

  if (sleepHours !== undefined) {
    log.sleepHours = Math.min(10, Math.max(0, Number(sleepHours)));
  }

  await log.save();

  // Notes
  const waterNote = log.waterGlasses >= 8 ? "Good" : "Bad";
  const sleepNote = log.sleepHours >= 8 ? "Good" : "Bad";

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Trackers updated successfully",
    data: {
      waterGlasses: log.waterGlasses,
      waterNote,
      sleepHours: log.sleepHours,
      sleepNote,
    },
  });
});

// Get today's glass and water
export const getGlassAndWater = catchAsync(async (req, res) => {
  const userId = req.user._id;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const logs = await Mood.findOne({
    userId,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  }).select("waterGlasses sleepHours");

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Today's water and sleep data fetched successfully",
    data: logs,
  });
});

// Get all moods for the current user
export const getAllMoods = catchAsync(async (req, res) => {
  const userId = req.user._id;

  const moods = await Mood.find({ userId });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All moods for current user fetched successfully",
    data: moods,
  });
});

export const getMoodDetails = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { moodId } = req.params;

  if (!moodId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Mood ID is required");
  }

  const log = await Mood.findOne({ _id: moodId, userId });

  if (!log) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "No mood log found with the specified ID"
    );
  }

  // AI helpers
  const motivation = await generateMotivation(log.mood);
  const title = await generateTitle(log.mood, log.satisfaction);

  // Satisfaction mapping
  const detailsType = satisfactionDetailsMap[log.satisfaction] || null;

  // Water & Sleep notes
  const waterNote = log.waterGlasses >= 8 ? "Good" : "Bad";
  const sleepNote = log.sleepHours >= 8 ? "Good" : "Bad";

  const enhancedLog = {
    ...log.toObject(),
    title,
    motivation,
    detailsType,
    water: {
      glasses: log.waterGlasses,
      note: waterNote,
    },
    sleep: {
      hours: log.sleepHours,
      note: sleepNote,
    },
  };

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Mood details fetched successfully by ID",
    data: enhancedLog,
  });
});

export const getSpecificMoodsByMoodId = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { moodId } = req.params;

  if (!moodId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Mood ID is required");
  }

  const logs = await Mood.find({ userId, _id: moodId }).select("date");
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Mood details fetched successfully by ID",
    data: logs,
  });
});
