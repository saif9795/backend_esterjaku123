import mongoose from "mongoose";

const moodSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: { type: Date, required: true, default: Date.now },
    mood: {
      type: String,
      required: true,
      enum: [
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
        "❤️ Romantic",
        "🤩 Excited",
        "🤪 Weird",
        "🌈 Hopeful",
        "😴 Sleepy",
        "😫 Stressed",
        "😡 Angry",
        "😐 Neutral",
        "😢 Sad",
        "😔 Pensive",
        "🫩 Tired",
      ],
    },
    emojiCode: { type: String },
    thoughts: { type: String },
    satisfaction: {
      type: String,
      enum: ["Very good", "Good", "Not so good", "Not good at all"],
    },
    waterGlasses: { type: Number, default: 0, min: 0, max: 10 },
    sleepHours: { type: Number, default: 0, min: 0, max: 10 },
    status: { type: Boolean, default: false },
  },
  { timestamps: true },
);

moodSchema.index({ userId: 1, date: 1 }, { unique: true });

export const Mood = mongoose.model("Mood", moodSchema);
