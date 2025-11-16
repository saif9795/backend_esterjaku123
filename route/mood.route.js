import express from "express";
import {
  submitMood,
  submitSatisfaction,
  getWeeklyLogs,
  updateTracker,
  getAllMoods,
  getMoodDetails,
  getAverageWeeklyMood,
  getGlassAndWater,
  getSpecificMoodsByMoodId,
} from "../controller/mood.controller.js";
import {
  getSevenDaysInsights,
  getMonthlyInsights,
} from "../controller/insights.controller.js";
import { updateActiveMiddleware } from "../middleware/updateActive.middleware.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Apply auth and auto-update lastActive to all routes
router.use(protect, updateActiveMiddleware);

// Mood submission
router.post("/", submitMood);
router.patch("/:id", submitSatisfaction);

// Weekly logs
router.get("/weekly", getWeeklyLogs);

// Update trackers
router.patch("/:id/tracker", updateTracker);

router.get("/all", getAllMoods);
// Mood details
router.get("/details/:moodId", getMoodDetails);

// Insights
router.get("/insights/7days", getSevenDaysInsights);
router.get("/insights/monthly", getMonthlyInsights);
router.get("/average-weekly", getAverageWeeklyMood);
router.get("/glass-sleep", getGlassAndWater);

router.get("/specific-moods/:moodId", protect, getSpecificMoodsByMoodId);

export default router;
